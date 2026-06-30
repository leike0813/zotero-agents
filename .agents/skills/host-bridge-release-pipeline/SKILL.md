---
name: host-bridge-release-pipeline
description: Execute the zotero-agents project Host Bridge release steps after Host Bridge CLI, wrapper skill, broker capability, profile, workflow catalog, or documentation changes. Use when Codex needs the exact commands for rendering Host Bridge surfaces, using the fingerprint-gated GitHub-hosted CLI prebuild workflow, publishing the host-bridge/zotero-bridge-cli-bundle branch and leike0813/zotero-librarian-profile repository, and syncing GitHub-built prebuilds back to the local checkout.
---

# Host Bridge Release Pipeline

Run this project-local workflow from the repository root:

```powershell
D:\Workspace\Code\JavaScript\zotero-agents
```

This is the operational sequence for updating the generated Host Bridge
surface, releasing GitHub-built Host Bridge CLI prebuilds, and publishing
surface-only artifacts. GitHub Actions is the build and publish authority for
the Host Bridge CLI bundle branch and the standalone zotero-librarian Hermes
profile repository.

## Commands

1. Render Host Bridge surfaces after capability, CLI, wrapper skill, profile,
   workflow catalog, or documentation changes:

```powershell
npm run render:host-bridge-surface
```

2. Run the relevant local checks for the changed files. For Host Bridge CLI
   packaging and profile surface changes, use:

```powershell
npm run check:host-bridge-doc-sync
npm run check:host-bridge-cli-prebuild-freshness
npm run check:zotero-librarian-profile
npx tsx node_modules/mocha/bin/mocha "test/core/139-host-bridge-cli-packaging.test.ts" --require test/setup/zotero-mock.ts
```

3. Publish the source changes to `main` through the normal repository flow.
   CLI build-input changes use `build-zotero-bridge-cli.yml`; wrapper, profile,
   broker, and surface-only changes use `publish-host-bridge-surfaces.yml`.
   Use the automatically created `push` workflow run as the release run.

   Do not manually dispatch the same workflow for `main` after an automatic
   `push` run has already been created for the release commit. Manual dispatch
   is for recovery or explicit republish cases, such as a missing automatic
   run, an automatic run that cannot be rerun, or a deliberate republish of the
   current `main` artifacts:

```powershell
gh workflow run build-zotero-bridge-cli.yml --ref main
gh workflow run publish-host-bridge-surfaces.yml --ref main
```

`build-zotero-bridge-cli.yml` computes the CLI build fingerprint, skips the
platform matrix when the fingerprint matches `cli/zotero-bridge/release.json`,
patch-bumps the Cargo CLI version on `main` when the fingerprint changes,
publishes the mutable `host-bridge-cli-prebuilds` GitHub release assets, and
publishes the Host Bridge bundle/profile surfaces from those prebuilds.

`publish-host-bridge-surfaces.yml` syncs the latest
`host-bridge-cli-prebuilds` assets, renders and checks Host Bridge surfaces,
then publishes `host-bridge/zotero-bridge-cli-bundle` and
`leike0813/zotero-librarian-profile` without rebuilding the Rust CLI.

The plugin `release.yml` workflow downloads `host-bridge-cli-prebuilds`, checks
the restored binaries with `npm run check:host-bridge-cli-prebuild-freshness`,
then runs `npm run test:gate:release` and builds the XPI. The CLI freshness
check is a release workflow gate, not part of `test:gate:release`.

4. After the GitHub workflow succeeds, sync the GitHub-built prebuilds back to
   the local checkout when local `addon/bin` artifacts are needed:

```powershell
npm run sync:host-bridge-cli-prebuilds
```

## Report

After running, report which local commands ran, whether publication used an
automatic `push` run or a manual dispatch run, the GitHub workflow run used for
publication, the reason for any manual dispatch, whether
`host-bridge-cli-prebuilds` was updated, whether
`host-bridge/zotero-bridge-cli-bundle` was updated, whether
`leike0813/zotero-librarian-profile` was updated, the profile manifest path,
whether profile binary checksums match `addon/bin`, whether local `addon/bin`
artifacts were synced, and whether `cli/zotero-bridge/release.json` records the
CLI version and checksum set used for the publish, and whether the release
workflow passed `check:host-bridge-cli-prebuild-freshness`.
