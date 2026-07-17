# Host Bridge Surface Versioning

The release planner governs four independent component versions from their
owned inputs and public content digests.

## Rust CLI

The Rust CLI version identifies the executable release line. Changed binary
inputs require a prepared CLI patch unless an explicit release intent selects a
minor or major protocol/schema change. The build fingerprint and command catalog
checksum remain part of compatibility identity even when the version matches.

## CLI Wrapper

`skills_src/zotero-bridge-cli/runner.json.version` is the wrapper content
version. Bump it when wrapper public content changes; do not couple it to the
Rust CLI version.

## Zotero Library Agent

Use `npm run inspect:zotero-library-agent-bundle-version -- --json`. The bundle
version is `<CLI major>.<CLI minor>.<bundle patch>`. Bump the owned patch when
bundle guidance, shared control facts, helpers, schemas, generated references,
or packaging layout changes.

## Zotero Librarian Profile

Use `npm run inspect:zotero-librarian-profile-version -- --json`. The Profile
version is `<CLI major>.<CLI minor>.<Profile patch>`. Bump the owned patch when
Profile guidance, scripts, configuration, cron jobs, generated references,
capabilities, or workflow catalog content changes.

## Decision Rules

- Let `npm run release:host-bridge:plan` classify owned changes.
- Let `npm run prepare:host-bridge-release` apply each required bump once before
  rendering.
- Do not bump a component for generated-output drift alone or for another
  component's patch-only release.
- Use explicit release intent for breaking protocol or schema decisions.
- Keep preparation idempotent by public digest and `releaseSetId`.
