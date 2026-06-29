## Why

Hermes users need a focused profile that can act as a Zotero literature library
manager without manually assembling Host Bridge CLI binaries, profile templates,
workflow instructions, indexing scripts, and scheduled jobs. The current Host
Bridge CLI bundle publishes reusable bridge access, but it does not distribute a
complete Hermes profile with local library state, workflow payload knowledge, or
run monitoring.

## What Changes

- Add a `zotero-librarian` Hermes profile distribution as a dedicated Host
  Bridge release surface.
- Extend Host Bridge and the Rust CLI with a read-only library snapshot command
  designed for local metadata indexing.
- Add an agent-side SQLite metadata index service, workflow catalog cache, and
  workflow run monitor scripts inside the profile.
- Render profile Host Bridge guidance and workflow catalog from existing source
  registries so capability and workflow documentation stay single-sourced.
- Publish the profile to `host-bridge/zotero-librarian-profile` with CLI
  prebuilds and a generated Host Bridge profile example.

## Impact

- Affected areas: OpenSpec artifacts, Host Bridge capability registry, Zotero
  host broker DTOs, Rust CLI commands, generated Host Bridge surface renderer,
  profile distribution files, release scripts, GitHub workflow, and packaging
  tests.
- Compatibility: existing Host Bridge CLI commands, wrapper skill, and bundle
  branch remain available. The profile branch is additive and uses the existing
  prebuilt CLI binaries from `addon/bin`.
