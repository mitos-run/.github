# Discord server provisioning

Idempotent provisioner for the Mitos Discord server. Reconciles the server to
the desired state declared in [`discord.config.json`](discord.config.json):
roles, categories, channels, permissions, Community settings, Welcome Screen,
native Onboarding (role self-assign), AutoMod, webhooks, and seed messages.

Design rationale lives in
[`../../docs/superpowers/specs/2026-06-27-mitos-discord-community-design.md`](../../docs/superpowers/specs/2026-06-27-mitos-discord-community-design.md).

## One-time manual step (Discord Developer Portal)

The script needs a bot identity to authenticate as. Creating it is the only
part that cannot be scripted:

1. Open <https://discord.com/developers/applications>, **New Application**, name
   it `mitos-provisioner` (or anything).
2. Left sidebar **Bot** -> **Reset Token** -> copy the token. Treat it as a
   secret.
3. Same page, turn on the **Server Members Intent** (needed for onboarding).
4. Left sidebar **OAuth2** -> **URL Generator**: tick scope `bot`, then tick the
   `Administrator` permission. Open the generated URL and add the bot to the
   Mitos server.
5. Get the **server (guild) ID**: in Discord enable Developer Mode (User
   Settings -> Advanced), then right-click the server icon -> **Copy Server ID**.

## Run

Requires Node 18+ (uses built-in `fetch`). No dependencies to install.

```bash
DISCORD_TOKEN='paste-bot-token' DISCORD_GUILD_ID='paste-server-id' \
  node scripts/discord/provision.mjs
```

Re-running is safe: existing roles/channels/rules are detected by name and left
alone, so a partial run can simply be repeated.

## After running

- The script prints two webhook URLs. Add them as GitHub Actions secrets
  `DISCORD_WEBHOOK_ANNOUNCE` and `DISCORD_WEBHOOK_GFI` in the `mitos` repo.
- Create an invite link in Discord and share it; it gets wired into the repo
  READMEs, issue template config, and the website footer.
- Remove the provisioner bot from the server and **Reset Token** in the
  Developer Portal so the credential no longer works.
