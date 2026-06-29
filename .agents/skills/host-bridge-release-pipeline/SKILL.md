---
name: host-bridge-release-pipeline
description: Execute the zotero-agents project Host Bridge release steps after Host Bridge CLI, wrapper skill, broker capability, profile, workflow catalog, or documentation changes. Use when Codex needs the exact commands for rendering Host Bridge surfaces, triggering the GitHub-hosted CLI prebuild workflow, publishing the host-bridge/zotero-bridge-cli-bundle and host-bridge/zotero-librarian-profile branches, and syncing GitHub-built prebuilds back to the local checkout.
---

# Host Bridge Release Pipeline

Run this project-local workflow from the repository root:

```powershell
D:\Workspace\Code\JavaScript\zotero-agents
```

This is the operational sequence for updating the generated Host Bridge
surface and releasing GitHub-built Host Bridge CLI prebuilds. GitHub Actions is
the build and publish authority for the Host Bridge CLI bundle branch and the
zotero-librarian Hermes profile branch.

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
npm run check:zotero-librarian-profile
npx tsx node_modules/mocha/bin/mocha "test/core/139-host-bridge-cli-packaging.test.ts" --require test/setup/zotero-mock.ts
```

3. Publish the source changes to the repository branch that should feed the
   release workflow, then trigger the GitHub workflow when a manual release is
   needed:

```powershell
gh workflow run build-zotero-bridge-cli.yml --ref main
```

The workflow builds all supported platforms, publishes the mutable
`host-bridge-cli-prebuilds` GitHub release assets, and publishes the
`host-bridge/zotero-bridge-cli-bundle` and
`host-bridge/zotero-librarian-profile` branches.

4. After the GitHub workflow succeeds, sync the GitHub-built prebuilds back to
   the local checkout when local `addon/bin` artifacts are needed:

```powershell
npm run sync:host-bridge-cli-prebuilds
```

## Report

After running, report which local commands ran, the GitHub workflow run used for
publication, whether `host-bridge-cli-prebuilds` was updated, whether
`host-bridge/zotero-bridge-cli-bundle` was updated, whether
`host-bridge/zotero-librarian-profile` was updated, the profile manifest path,
whether profile binary checksums match `addon/bin`, and whether local `addon/bin`
artifacts were synced.
