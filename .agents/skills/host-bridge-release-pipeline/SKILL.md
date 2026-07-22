---
name: host-bridge-release-pipeline
description: Prepare, validate, manually dispatch, resume, and verify the unified Host Bridge CLI bundle, Zotero Library Agent bundle, and Zotero Librarian profile release set. Use after CLI, wrapper, bundle, profile, workflow catalog, protocol, schema, or governed documentation changes require Host Bridge publication.
---

# Host Bridge Release Pipeline

Run from the repository root on `main`. One prepared
`host-bridge.release-set.v2` governs all three surfaces, and release preparation emits v2 documents only.

## Review Feature Content

For feature work, review semantics and render deterministic content without
preparing a release:

```powershell
npm run render:host-bridge-content
npm run check:host-bridge-content
```

Run `$host-bridge-semantic-surface-review` when its collector reports that
semantic review is required. Commit reviewed source and generated content
before release preparation.

## Prepare Exactly Once

Read the accumulated plan from the latest committed complete receipt:

```powershell
npm run release:host-bridge:plan
```

Prepare once, using an exact CLI target when the release request specifies one:

```powershell
npm run prepare:host-bridge-release
npm run prepare:host-bridge-release -- --cli-version X.Y.Z
```

Use `--intent minor` only for an explicit protocol or schema line change when
no exact CLI target was supplied. Read `references/profile-versioning.md` when
component bump ownership is unclear. Do not rerun preparation to repair a
workflow, checker, network, or publication failure.

Treat the resulting `releaseSetId` as prepared, not published. Commit and push
the complete prepared change to GitHub `main` before dispatch.

## Verify Locally

Run:

```powershell
npm run lint:check
npm run check:host-bridge-doc-sync
npm run check:host-bridge-surface
npm run check:zotero-library-agent-bundle
npm run check:zotero-librarian-profile
npx tsx node_modules/mocha/bin/mocha "test/core/108-host-bridge-workflow-control.test.ts" "test/core/139-host-bridge-cli-packaging.test.ts" "test/core/165-zotero-librarian-profile.test.ts" "test/core/167-host-bridge-semantic-review-skill.test.ts" "test/core/168-host-bridge-release-coordinator.test.ts" "test/core/169-host-bridge-agent-surface.test.ts" --require test/setup/zotero-mock.ts
```

The formal release set is prebuild-first. Before preparation, the exact CLI
fingerprint must already have a complete build-only set on
`host-bridge-cli-prebuilds`. If the plan reports `prebuildRequired: true`,
dispatch `build-host-bridge-cli-prebuilds.yml`, then synchronize and record that
exact aggregate locally before preparing the release set. The build-only
workflow does not publish any semantic surface.

When the plan reports `prebuildRequired: false`, run:

```powershell
npm run check:host-bridge-cli-prebuild-freshness
```

Do not dispatch `release-host-bridge.yml` while prebuild freshness is false,
and do not build selected platforms locally.

## Dispatch Or Resume Manually

After explicit publication authorization, dispatch the exact prepared set:

```powershell
npm run release:host-bridge:dispatch -- --release-set-id hbrs-... --watch
```

The command verifies clean synchronized `main`, reruns the local gates, supplies
the exact source SHA and correlation ID, and watches only the resulting Actions
run of `release-host-bridge.yml`. After success it fast-forwards local `main` to
the workflow's finalize commit. Host publication has no push or ordinary CI
trigger.

The formal workflow never builds CLI binaries; it restores the exact verified
aggregate from the `host-bridge-cli-prebuilds` branch. The branch stores
immutable sets under `sets/<binaryAggregateSha256>`; GitHub Releases are not a
Host CLI prebuild store.

A retry must use the same command and existing `releaseSetId`. Reuse verified
prebuild sets and immutable surface tags. Never associate different bytes with
an existing immutable tag or component version.

## Verify Completion

Publication is complete only after the workflow:

1. verifies all three immutable surface manifests;
2. advances all three mutable branches;
3. continuously records `host-bridge.release-receipt.v2` progress and writes `status: complete` only after immutable surfaces, mutable pointers, and source-main finalization succeed;
4. commits the seven prebuilds, four release-set copies, CLI manifest, and
   `host-bridge/latest-complete-release-receipt.json` back to `main`.

If source finalization detects concurrent Host changes, use the uploaded
finalize artifact to resume the same release set; do not prepare another set.

Gitee is outside this pipeline. Do not call, poll, or report
`npm run sync:gitee-release` unless the user separately requests Gitee
synchronization.

## Report

Report semantic-review status, version decisions, `releaseSetId`, exact CLI
identity, local gates, prebuild branch aggregate and commit, workflow run,
immutable and mutable surface commits, final source commit, and complete receipt
status.
