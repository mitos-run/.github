# Mitos Discord community: design

Date: 2026-06-27
Status: approved, pending implementation plan

## Purpose

Stand up a Discord community for Mitos and wire it into the repos using
open-source dev-tool best practices. Mitos is an open-source, self-hostable,
Kubernetes-native microVM sandbox for AI agents (a computer per agent, live
fork). The server serves four audiences at once:

1. Users of the hosted and SDK product (support, showcase, hangout)
2. Contributors to the open-source core
3. Announcement and growth (releases, launches, blog)
4. Self-hosting and cluster operators (a distinct ops audience)

The server already exists but is basically empty/default (logo uploaded, no
other config). The blueprint below is a full build-out, applied by an
idempotent provisioning script run against the Discord REST API to minimize
click-through error surface. The script is the source of truth; the blueprint
doc documents intent.

## Chosen approach

Hybrid: lean structure plus Discord Forum channels (Approach C). A small number
of categories keeps a brand-new server feeling active instead of like a ghost
town. Support and self-hosting are Forum channels so Q&A is threaded,
searchable, and compounds into a discoverable reference. Audience separation is
achieved with self-assignable roles plus forums rather than many empty
channels, leaving a clean growth path to split into fully segmented categories
later without a migration.

Rejected alternatives:

- Audience-segmented from day one: 20+ channels on an empty server reads as
  dead and suppresses engagement.
- Maximally lean single-tier: support, contributor, and ops talk collide in one
  channel exactly when growth starts.

## Server structure

Forum channels are marked `[forum]`. Everything else is a standard text
channel. Voice is minimal until there is demand.

### START HERE (read-only except where noted)

- `#welcome`: one-screen intro, what Mitos is, links to website, docs, repo
- `#rules`: short conduct summary, links to repo CODE_OF_CONDUCT.md
- `#announcements`: releases, blog posts, launches (mirrors GitHub releases)
- `#roles`: react to self-assign `self-hoster` and `contributor`

### COMMUNITY

- `#general`: open chat, the heartbeat channel
- `#showcase`: what people built with Mitos (agents, forks, demos)
- `#off-topic`: keeps `#general` on task

### SUPPORT

- `#support` `[forum]`: hosted and SDK usage questions, one post per problem
- `#self-hosting` `[forum]`: KVM/k8s cluster operators, the ops audience
- `#feedback-ideas`: quick feature wishes; heavy asks go to GitHub
  issues/Discussions

### CONTRIBUTORS (visible to all, posting gated lightly)

- `#dev`: contributor coordination, architecture, PR/issue chatter
- `#good-first-issues`: bot-fed from the GitHub `good first issue` label
- `#ci-and-releases`: build/release/CI signal for maintainers

### VOICE

- `Office Hours`: single voice channel for scheduled community calls

Roughly 14 channels. Active-feeling, not a ghost town, with forums carrying the
support load. Support and self-hosting are forums because they are searchable
knowledge that compounds; everything else is conversational.

## Roles and permissions

### Staff

- `maintainer`: core team, admin-lite (manage messages/channels), destructive
  permissions not spread around
- `moderator`: manage messages, timeout, kick; no channel/role management

### Self-assignable (via `#roles`, opt-in only)

- `self-hoster`: runs Mitos on own infra; pingable for self-host announcements
- `contributor`: wants to help build; grants posting in `#dev`

### Automatic / system

- `@everyone`: read across START HERE, COMMUNITY, SUPPORT; post in COMMUNITY,
  SUPPORT, and `#feedback-ideas`
- `bots`: GitHub/release bot and moderation bot

Permission posture: read-open, post-where-it-makes-sense. `#dev` posting is
`contributor`+ to keep maintainer signal clean, but readable by everyone for
transparency. No private staff-only channels in the public server; sensitive
maintainer talk lives in a separate small server or on GitHub. Enable Discord's
Community setting for the rules gate, member screening, and AutoMod.

## Onboarding and moderation

### Community features (Server Settings, Enable Community)

- Rules screening gate: members accept `#rules` before posting. Removes most
  spam and drive-by activity.
- Welcome Screen: three cards pointing to `#welcome`, `#support`, `#roles`.
- Default notifications set to mentions only, so the server is quiet by default.

### AutoMod (native, no bot)

- Block common spam/scam link patterns and crypto/airdrop bait.
- Mention-spam raid protection (timeout on mass-ping).
- Keyword filter for slurs, routed to a mod-visible `#mod-log`.

### Bots: zero persistent bots

Automated provisioning lets us drop the persistent reaction-role bot entirely:

- Role self-assign uses Discord native Onboarding (Server Settings, Onboarding),
  configured via the guild onboarding API. No Carl-bot/Dyno listening process.
- Moderation uses native AutoMod (configured via the AutoMod API). No bot.
- The GitHub feed uses webhooks (see pipeline), not a hosted bot.

A bot application is still needed transiently as the provisioning identity: it
holds the token the script authenticates with and must be in the server with
Administrator while the script runs. After provisioning it can be removed from
the server, and the token should be reset. `#roles` becomes optional since
native Onboarding presents role choices in the membership flow; keep it only if
a persistent in-channel self-assign surface is wanted later.

### Code of Conduct

Link the repo CODE_OF_CONDUCT.md from `#rules` rather than writing a second
one. If the repo has none, add one (Contributor Covenant) during integration so
there is a single source of truth.

## GitHub to Discord pipeline

Announcements happen once, in GitHub, and flow to Discord automatically. No
manual copy-paste.

- Releases to `#announcements`: a GitHub Actions step on release publish posts a
  formatted message to a Discord webhook. Stays in existing CI
  (`release.yaml`/`release-please`), no third-party bot for the important
  channel.
- `good first issue` to `#good-first-issues`: an Actions webhook on the
  issue-labeled event (version-controlled, tokenless beyond a webhook secret).
- CI/release internals to `#ci-and-releases`: optional maintainer webhook, off
  by default to avoid noise.

Webhook URLs are stored as GitHub Actions secrets
(`DISCORD_WEBHOOK_ANNOUNCE`, `DISCORD_WEBHOOK_GFI`), never committed. The
workflow snippets are provided; the maintainer pastes the webhook secrets.

## Repo integration

A single source-of-truth doc, then links pointing at it.

### dotgithub (org-wide, highest leverage)

- Add Discord to `profile/README.md` nav row (next to Website, Core repo,
  Quickstart, Discussions). Org-level, so it surfaces on the org landing page.

### mitos (core repo)

- `README.md`: add a Discord badge to the badge row
  (`img.shields.io/discord/<server-id>`) and a Community link in the nav row.
- `.github/ISSUE_TEMPLATE/config.yml`: add a `Discord community` contact link
  alongside Security and Roadmap, steering chatter off the issue tracker.
- `CONTRIBUTING.md`: add a short "Talk to us" line pointing to `#dev`.
- Add `SUPPORT.md` (GitHub renders a "Get help" banner on the issue composer):
  routes how-do-I to Discord `#support`, bugs to issues, design talk to
  Discussions.
- Add `CODE_OF_CONDUCT.md` if absent, so `#rules` can link it.

### website

- `SiteFooter.astro`: add the Discord link to the Community/social column, and
  update the code comment that currently says social channels are intentionally
  absent until they exist.

### Source of truth

- Commit `docs/community/discord.md` (in `mitos` or `dotgithub`) holding this
  blueprint, so the server is documented and reproducible by hand and future
  maintainers know the intended structure.

## Provisioning

An idempotent script (Node, using the Discord REST API v10) builds the server
from a declarative config. Idempotent means re-running reconciles to the
desired state: it looks up existing roles/categories/channels by name and
creates only what is missing, so a partial or repeated run is safe.

Order of operations (respecting Discord API dependencies):

1. Roles: `maintainer`, `moderator`, `self-hoster`, `contributor` (created
   before channels so permission overwrites can reference them).
2. Categories, then channels under them (text, forum, voice), with topics,
   forum tags, and per-channel permission overwrites.
3. Guild settings to enable Community: set verification level, explicit content
   filter, `rules_channel_id` (`#rules`), `public_updates_channel_id`,
   default notifications to mentions-only.
4. Welcome Screen: three cards (`#welcome`, `#support`, `#roles`).
5. Onboarding: prompt offering `self-hoster` and `contributor`.
6. AutoMod rules: spam/scam links, mention-spam, keyword filter to a mod log.
7. Webhooks for `#announcements` and `#good-first-issues`; the script prints the
   webhook URLs for the maintainer to paste into GitHub Actions secrets.
8. Seed messages: post `#welcome` and `#rules` content.

The script is committed to `dotgithub` (for example
`scripts/discord/provision.mjs` plus a `discord.config.json`). The bot token is
never committed; it is read from an environment variable at run time and reset
afterward.

## Placeholders and inputs needed

- Invite link: use `https://discord.gg/REPLACE_ME` in one findable spot until
  the real vanity/invite is provided.
- Server ID: needed for the shields.io Discord badge (Discord, Server Settings,
  Widget; or right-click the server with Developer Mode on).
- Webhook secrets: `DISCORD_WEBHOOK_ANNOUNCE` and `DISCORD_WEBHOOK_GFI` pasted
  into GitHub Actions secrets by the maintainer (the provision script prints the
  URLs).
- Bot token and guild ID: a Discord application with a bot, invited to the
  server with Administrator, supplies the token the provisioning script
  authenticates with. The one unavoidable manual step (Discord Developer Portal
  UI). Token read from env at run time, never committed, reset after the run.

## Out of scope

- Persistent hosted bots (replaced by native Onboarding, AutoMod, webhooks).
- Terraform discord provider (a one-shot Node script is simpler here).
- Private maintainer server.
- Paid Discord features and custom-built bots.
