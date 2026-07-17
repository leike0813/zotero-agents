---
name: host-bridge-release-pipeline
description: Execute the zotero-agents Host Bridge release steps after CLI, wrapper, Zotero Library Agent bundle, broker, Zotero Librarian profile, workflow catalog, or documentation changes. Use when Codex needs the exact render, version, check, fingerprint-gated prebuild, three-surface publication, and prebuild synchronization workflow.
---

# Host Bridge Release Pipeline

Run this project-local workflow from the repository root:

```powershell
D:\Workspace\Code\JavaScript\zotero-agents
```

This is the operational sequence for updating the generated Host Bridge
surface, releasing GitHub-built Host Bridge CLI prebuilds, and publishing
surface-only artifacts. GitHub Actions is the build and publish authority for
the Host Bridge CLI bundle branch, standalone Zotero Library Agent bundle, and
standalone Zotero Librarian profile repository.

## Commands

1. Before rendering, run semantic surface review when Host Bridge capability,
   endpoint, CLI, workflow control, workflow catalog, OpenSpec Host Bridge
   specs, shared control facts, wrapper, Zotero Library Agent, or Zotero
   Librarian profile semantic sources changed. Use
   `$host-bridge-semantic-surface-review`, starting with:

```powershell
npx tsx scripts/host-bridge-semantic-review-context.ts
```

Continue only after the semantic review reports either aligned semantic sources
or semantic-source edits applied.

2. Determine both independently patched surface versions before rendering:

```powershell
npm run inspect:zotero-librarian-profile-version -- --json
npm run inspect:zotero-library-agent-bundle-version -- --json
```

Read `references/profile-versioning.md`. When this release changes public
Profile or Zotero Library Agent bundle content, run the corresponding bump
command exactly once. Do not bump for generated output drift only or for a CLI
patch-only release.

```powershell
npm run bump:zotero-librarian-profile
npm run bump:zotero-library-agent-bundle
```

3. Render Host Bridge surfaces after semantic review and the Profile version
decision complete. For Host Bridge CLI build-input changes, this local render is
a preflight check; the `build-zotero-bridge-cli.yml` release job re-renders
surfaces after the CLI version bump and binary checksum manifest are recorded.

```powershell
npm run render:host-bridge-surface
npm run check:host-bridge-surface
```

4. Run the relevant local checks for the changed files. For Host Bridge CLI
packaging and profile surface changes, use:

```powershell
npm run check:host-bridge-doc-sync
npm run check:host-bridge-cli-prebuild-freshness
npm run check:zotero-library-agent-bundle
npm run check:zotero-librarian-profile
npx tsx node_modules/mocha/bin/mocha "test/core/139-host-bridge-cli-packaging.test.ts" --require test/setup/zotero-mock.ts
```

When CLI build inputs changed, `check:host-bridge-cli-prebuild-freshness`
reports a stale fingerprint until `build-zotero-bridge-cli.yml` records the
new release manifest and GitHub-built prebuild checksums. Treat that as the
handoff condition for the build workflow, not as a reason to locally rewrite
the release manifest without GitHub-built binaries.

5. Publish the source changes to `main` through the normal repository flow.
CLI build-input changes use `build-zotero-bridge-cli.yml`; wrapper, profile,
broker, and surface-only changes use `publish-host-bridge-surfaces.yml`.
Use the automatically created `push` workflow run as the release run.

Use manual dispatch only for recovery or an explicit republish of the current
`main` artifacts:

```powershell
gh workflow run build-zotero-bridge-cli.yml --ref main
gh workflow run publish-host-bridge-surfaces.yml --ref main
```

The CLI workflow records the CLI release, renders and checks surfaces, and
publishes prebuilds and all three agent-facing surfaces. The surface-only workflow
restores published prebuilds, verifies committed generated surfaces, then
publishes all three surfaces without rebuilding the CLI.

6. After the GitHub workflow succeeds, sync the GitHub-built prebuilds back to
the local checkout when local `addon/bin` artifacts are needed:

```powershell
npm run sync:host-bridge-cli-prebuilds
```

## Report

After running, report which local commands ran, whether semantic surface review
ran, the inspected and resolved Profile and Zotero Library Agent bundle
versions, whether either surface patch bump ran, whether semantic source files changed,
whether the review found a
specification-to-semantic mismatch, whether publication used an automatic
`push` run or a manual dispatch run, the GitHub workflow run used for
publication, the reason for any manual dispatch, whether
`host-bridge-cli-prebuilds` was updated, whether
`host-bridge/zotero-bridge-cli-bundle` was updated, whether
`leike0813/zotero-library-agent-bundle` was updated, the bundle manifest path,
whether its binary checksums match `addon/bin`, whether
`leike0813/zotero-librarian-profile` was updated, the profile manifest path,
whether profile binary checksums match `addon/bin`, whether local `addon/bin`
artifacts were synced, and whether `cli/zotero-bridge/release.json` records the
CLI version and checksum set used for the publish, and whether the release
workflow passed `check:host-bridge-cli-prebuild-freshness` and
`check:host-bridge-surface`.
