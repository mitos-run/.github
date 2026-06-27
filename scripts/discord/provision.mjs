#!/usr/bin/env node
// Idempotent provisioner for the Mitos Discord server.
//
// Reconciles a server to the desired state in discord.config.json: roles,
// categories, channels, permissions, Community settings, Welcome Screen,
// Onboarding, AutoMod, webhooks, and seed messages. Re-running is safe: it
// looks objects up by name and creates only what is missing.
//
// Usage:
//   DISCORD_TOKEN=<bot token> DISCORD_GUILD_ID=<server id> \
//     node scripts/discord/provision.mjs
//
// The bot must be in the server with the Administrator permission. The token is
// read from the environment and never written to disk. Reset it after running.

import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const API = "https://discord.com/api/v10";
const TOKEN = process.env.DISCORD_TOKEN;
const GUILD = process.env.DISCORD_GUILD_ID;

if (!TOKEN || !GUILD) {
  console.error("Set DISCORD_TOKEN and DISCORD_GUILD_ID in the environment.");
  process.exit(1);
}

// Discord permission flags (https://discord.com/developers/docs/topics/permissions).
const P = {
  VIEW_CHANNEL: 1n << 10n,
  SEND_MESSAGES: 1n << 11n,
  SEND_MESSAGES_IN_THREADS: 1n << 38n,
  CREATE_PUBLIC_THREADS: 1n << 35n,
  READ_MESSAGE_HISTORY: 1n << 16n,
  ADD_REACTIONS: 1n << 6n,
  MANAGE_CHANNELS: 1n << 4n,
  MANAGE_ROLES: 1n << 28n,
  MANAGE_MESSAGES: 1n << 13n,
  MANAGE_THREADS: 1n << 34n,
  KICK_MEMBERS: 1n << 1n,
  BAN_MEMBERS: 1n << 2n,
  MODERATE_MEMBERS: 1n << 40n,
  VIEW_AUDIT_LOG: 1n << 7n,
  CONNECT: 1n << 20n,
  SPEAK: 1n << 21n,
};
const CHANNEL_TYPE = { text: 0, voice: 2, category: 4, forum: 15 };

const bits = (names) => names.reduce((acc, n) => acc | P[n], 0n).toString();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function api(method, path, body) {
  for (let attempt = 0; attempt < 6; attempt++) {
    const res = await fetch(API + path, {
      method,
      headers: {
        Authorization: `Bot ${TOKEN}`,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (res.status === 429) {
      const data = await res.json().catch(() => ({}));
      const wait = (data.retry_after ?? 1) * 1000 + 250;
      console.log(`  rate limited, waiting ${Math.round(wait)}ms`);
      await sleep(wait);
      continue;
    }
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`${method} ${path} -> ${res.status} ${text}`);
    }
    await sleep(300); // be gentle with the API
    if (res.status === 204) return null;
    return res.json();
  }
  throw new Error(`${method} ${path} exhausted retries`);
}

const byName = (list, name) =>
  list.find((x) => x.name?.toLowerCase() === name.toLowerCase());

async function main() {
  const cfgPath = join(dirname(fileURLToPath(import.meta.url)), "discord.config.json");
  const cfg = JSON.parse(await readFile(cfgPath, "utf8"));

  const me = await api("GET", "/users/@me");
  console.log(`Authenticated as bot ${me.username} (${me.id})`);
  const guild = await api("GET", `/guilds/${GUILD}`);
  console.log(`Provisioning guild ${guild.name} (${GUILD})\n`);

  // 1. Roles ----------------------------------------------------------------
  console.log("Roles");
  let roles = await api("GET", `/guilds/${GUILD}/roles`);
  const roleId = {};
  roleId["@everyone"] = GUILD; // @everyone role id equals the guild id
  for (const r of cfg.roles) {
    let role = byName(roles, r.name);
    if (!role) {
      role = await api("POST", `/guilds/${GUILD}/roles`, {
        name: r.name,
        color: r.color,
        hoist: r.hoist,
        mentionable: r.mentionable,
        permissions: bits(r.permissions),
      });
      console.log(`  + ${r.name}`);
    } else {
      console.log(`  = ${r.name} (exists)`);
    }
    roleId[r.name] = role.id;
  }

  // Resolve permission overwrites for a channel from its config flags.
  const resolveOverwrites = (ch) => {
    const out = [];
    if (ch.readOnly) {
      out.push({ id: roleId["@everyone"], type: 0, deny: bits(["SEND_MESSAGES", "SEND_MESSAGES_IN_THREADS", "CREATE_PUBLIC_THREADS", "ADD_REACTIONS"]) });
    }
    if (ch.staffOnly) {
      out.push({ id: roleId["@everyone"], type: 0, deny: bits(["VIEW_CHANNEL"]) });
      for (const staff of ["maintainer", "moderator"]) {
        out.push({ id: roleId[staff], type: 0, allow: bits(["VIEW_CHANNEL", "SEND_MESSAGES", "READ_MESSAGE_HISTORY"]) });
      }
    }
    for (const ow of ch.overwrites ?? []) {
      out.push({
        id: roleId[ow.role],
        type: 0,
        allow: ow.allow ? bits(ow.allow) : "0",
        deny: ow.deny ? bits(ow.deny) : "0",
      });
    }
    return out;
  };

  // 2. Categories and channels ---------------------------------------------
  console.log("\nChannels");
  let channels = await api("GET", `/guilds/${GUILD}/channels`);
  const chanId = {};
  for (const cat of cfg.categories) {
    let parent = channels.find((c) => c.type === 4 && c.name === cat.name);
    if (!parent) {
      parent = await api("POST", `/guilds/${GUILD}/channels`, { name: cat.name, type: 4 });
      channels.push(parent);
      console.log(`  + [${cat.name}]`);
    } else {
      console.log(`  = [${cat.name}]`);
    }
    for (const ch of cat.channels) {
      let existing = channels.find(
        (c) => c.name?.toLowerCase() === ch.name.toLowerCase() && c.parent_id === parent.id,
      );
      if (!existing) {
        existing = await api("POST", `/guilds/${GUILD}/channels`, {
          name: ch.name,
          type: CHANNEL_TYPE[ch.type],
          parent_id: parent.id,
          topic: ch.type === "voice" ? undefined : ch.topic,
          permission_overwrites: resolveOverwrites(ch),
        });
        channels.push(existing);
        console.log(`    + #${ch.name} (${ch.type})`);
      } else {
        console.log(`    = #${ch.name}`);
      }
      chanId[ch.name] = existing.id;
    }
  }

  // 2b. Forum setup: tags, default reaction, pinned starter post ------------
  const forums = cfg.categories.flatMap((c) => c.channels).filter((ch) => ch.type === "forum");
  if (forums.length) console.log("\nForum setup");
  for (const ch of forums) {
    const id = chanId[ch.name];
    if (ch.tags || ch.defaultReaction) {
      await api("PATCH", `/channels/${id}`, {
        available_tags: (ch.tags ?? []).map((name) => ({ name, moderated: false, emoji_id: null, emoji_name: null })),
        default_reaction_emoji: ch.defaultReaction ? { emoji_id: null, emoji_name: ch.defaultReaction } : null,
      });
      console.log(`  #${ch.name}: tags + default reaction set`);
    }
    if (ch.starterPost) {
      const active = await api("GET", `/channels/${id}/threads/active`).catch(() => ({ threads: [] }));
      const guildThreads = (active.threads ?? []).filter((t) => t.parent_id === id);
      if (guildThreads.length) {
        console.log(`  #${ch.name}: starter post exists`);
      } else {
        const thread = await api("POST", `/channels/${id}/threads`, {
          name: ch.starterPost.title,
          message: { content: ch.starterPost.body },
        });
        await api("PATCH", `/channels/${thread.id}`, { flags: 2 }); // pin
        console.log(`  #${ch.name}: starter post created and pinned`);
      }
    }
  }

  // 3. Community settings ---------------------------------------------------
  console.log("\nCommunity settings");
  const features = new Set(guild.features || []);
  features.add("COMMUNITY");
  await api("PATCH", `/guilds/${GUILD}`, {
    features: [...features],
    rules_channel_id: chanId[cfg.community.rules_channel],
    public_updates_channel_id: chanId[cfg.community.public_updates_channel],
    verification_level: cfg.community.verification_level,
    explicit_content_filter: cfg.community.explicit_content_filter,
    default_message_notifications: cfg.community.default_message_notifications,
  });
  console.log("  Community enabled, rules + updates channels set, mentions-only default");

  // 4. Welcome screen -------------------------------------------------------
  console.log("\nWelcome screen");
  await api("PATCH", `/guilds/${GUILD}/welcome-screen`, {
    enabled: true,
    description: cfg.welcomeScreen.description,
    welcome_channels: cfg.welcomeScreen.channels.map((w) => ({
      channel_id: chanId[w.channel],
      description: w.description,
      emoji_name: w.emoji,
    })),
  });
  console.log("  set");

  // 5. Onboarding (native role self-assign) ---------------------------------
  console.log("\nOnboarding");
  const defaultChannels = cfg.categories
    .filter((c) => !["CONTRIBUTORS", "STAFF", "VOICE"].includes(c.name))
    .flatMap((c) => c.channels.map((ch) => chanId[ch.name]));
  try {
    await api("PUT", `/guilds/${GUILD}/onboarding`, {
      enabled: true,
      mode: 0,
      default_channel_ids: defaultChannels,
      prompts: [
        {
          id: "0",
          type: 0,
          title: cfg.onboarding.prompt,
          single_select: false,
          required: false,
          in_onboarding: true,
          options: cfg.onboarding.options.map((o, i) => ({
            id: String(i),
            title: o.label,
            description: o.description,
            role_ids: [roleId[o.role]],
            channel_ids: [],
            emoji: { name: o.emoji },
          })),
        },
      ],
    });
    console.log("  enabled with self-hoster / contributor prompt");
  } catch (e) {
    console.log(`  skipped (Discord rejected onboarding config): ${e.message}`);
    console.log("  roles still exist; enable Onboarding manually if needed.");
  }

  // 6. AutoMod --------------------------------------------------------------
  console.log("\nAutoMod");
  const modlog = chanId[cfg.automod.alertChannel];
  const existingRules = await api("GET", `/guilds/${GUILD}/auto-moderation/rules`);
  const ensureRule = async (rule) => {
    if (byName(existingRules, rule.name)) {
      console.log(`  = ${rule.name}`);
      return;
    }
    await api("POST", `/guilds/${GUILD}/auto-moderation/rules`, rule);
    console.log(`  + ${rule.name}`);
  };
  const alertAction = { type: 2, metadata: { channel_id: modlog } };
  await ensureRule({
    name: "Block harmful words",
    event_type: 1,
    trigger_type: 4,
    trigger_metadata: { presets: [1, 2, 3] },
    actions: [{ type: 1, metadata: { custom_message: "Message blocked by AutoMod." } }, alertAction],
    enabled: true,
  });
  await ensureRule({
    name: "Mention spam protection",
    event_type: 1,
    trigger_type: 5,
    trigger_metadata: { mention_total_limit: 6, mention_raid_protection_enabled: true },
    actions: [{ type: 1 }, alertAction],
    enabled: true,
  });
  await ensureRule({
    name: "Spam content",
    event_type: 1,
    trigger_type: 3,
    actions: [{ type: 1 }],
    enabled: true,
  });

  // 7. Webhooks -------------------------------------------------------------
  console.log("\nWebhooks");
  const webhookUrls = {};
  for (const w of cfg.webhooks) {
    const cid = chanId[w.channel];
    const hooks = await api("GET", `/channels/${cid}/webhooks`);
    let hook = byName(hooks, w.name);
    if (!hook) {
      hook = await api("POST", `/channels/${cid}/webhooks`, { name: w.name });
      console.log(`  + ${w.name} -> #${w.channel}`);
    } else {
      console.log(`  = ${w.name} -> #${w.channel}`);
    }
    webhookUrls[w.channel] = `https://discord.com/api/webhooks/${hook.id}/${hook.token}`;
  }

  // 8. Seed messages (skip if the bot already posted) -----------------------
  console.log("\nSeed messages");
  for (const [channel, content] of Object.entries(cfg.seedMessages)) {
    const cid = chanId[channel];
    const recent = await api("GET", `/channels/${cid}/messages?limit=20`);
    if (recent.some((m) => m.author?.id === me.id)) {
      console.log(`  = #${channel} (already seeded)`);
      continue;
    }
    await api("POST", `/channels/${cid}/messages`, { content });
    console.log(`  + #${channel}`);
  }

  // Summary -----------------------------------------------------------------
  console.log("\nDone. Webhook URLs for GitHub Actions secrets:");
  console.log(`  DISCORD_WEBHOOK_ANNOUNCE = ${webhookUrls["announcements"]}`);
  console.log(`  DISCORD_WEBHOOK_GFI      = ${webhookUrls["good-first-issues"]}`);
  console.log("\nNext: create an invite link in Discord and share it so it can be wired into the repos.");
}

main().catch((e) => {
  console.error("\nFAILED:", e.message);
  process.exit(1);
});
