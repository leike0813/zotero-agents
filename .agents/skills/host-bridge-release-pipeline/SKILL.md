---
name: host-bridge-release-pipeline
description: Plan, prepare, verify, and publish the unified Host Bridge CLI bundle, Zotero Library Agent bundle, and Zotero Librarian profile release set.
---

# Host Bridge Release Pipeline

Run from the repository root. One prepared `host-bridge.release-set.v1` governs all three agent-facing surfaces.

## Prepare

1. Run `$host-bridge-semantic-surface-review` when the semantic collector requires review.
2. Inspect the read-only release plan:

```powershell
npm run release:host-bridge:plan
```

3. Prepare versions and generated surfaces exactly once:

```powershell
npm run prepare:host-bridge-release
```

The coordinator applies required patch bumps for changed public content, renders the machine agent surface and three generated surfaces, materializes `host-bridge/release-set.json`, and runs the unified surface check. Generated-only drift does not require a content-version bump.

Treat the release set as prepared, not published. Compatibility is the exact
CLI identity tuple of version, build fingerprint, and command catalog checksum;
the binary aggregate additionally proves the seven packaged artifacts.

## Local Verification

```powershell
npm run check:host-bridge-doc-sync
npm run check:host-bridge-surface
npm run check:host-bridge-cli-prebuild-freshness
npm run check:zotero-library-agent-bundle
npm run check:zotero-librarian-profile
npx tsx node_modules/mocha/bin/mocha "test/core/108-host-bridge-workflow-control.test.ts" "test/core/139-host-bridge-cli-packaging.test.ts" "test/core/165-zotero-librarian-profile.test.ts" "test/core/167-host-bridge-semantic-review-skill.test.ts" "test/core/168-host-bridge-release-coordinator.test.ts" "test/core/169-host-bridge-agent-surface.test.ts" --require test/setup/zotero-mock.ts
```

When the plan reports `prebuildRequired: true`,
`check:host-bridge-cli-prebuild-freshness` remains stale until the release
workflow creates the seven pinned-runner prebuilds and records their checksums.
Treat only this controlled freshness failure as the CI build handoff.

## Publish Or Resume

Normal publication is the automatic `release-host-bridge.yml` run for the prepared `main` commit. Manual dispatch is only for recovery and must name the existing release set when resuming:

```powershell
gh workflow run release-host-bridge.yml --ref main -f release_set_id=<releaseSetId>
```

The workflow validates the committed plan, builds or restores one immutable CLI prebuild set, materializes all three surfaces, publishes immutable tags, re-reads their remote manifests, advances mutable branches only after all tags verify, and emits `release-receipt.json`. Recovery reuses verified tags for the same `releaseSetId`; never use a no-bump rebuild to replace different bytes under an existing version.

Publication is complete only when the receipt uses
`host-bridge.release-receipt.v1`, names the prepared `releaseSetId`, reports
`status: complete`, and records verified immutable targets plus advanced mutable
pointers.

## Report

Report semantic-review status and edits; release plan classification; CLI, wrapper, Library Agent, and Profile version decisions; `releaseSetId`; exact CLI identity; local checks; expected or resolved prebuild freshness; workflow run; immutable tags and commits; mutable pointer result; and final release receipt status.
