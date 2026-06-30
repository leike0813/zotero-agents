# Host Bridge Change Detection

Use this reference when the release gate reports Host Bridge candidate files.

## Trigger Paths

Treat changes under these paths as requiring `$host-bridge-release-pipeline`
unless the user explicitly limits the release scope:

- `cli/zotero-bridge/**`
- `skills_builtin/zotero-bridge-cli/**`
- `profiles/hermes/zotero-librarian/**`
- `src/modules/hostBridgeCapabilityRegistry.ts`
- `src/modules/zoteroHostCapabilityBroker.ts`
- `scripts/host-bridge-surface-catalog.ts`
- `scripts/render-zotero-librarian-profile.ts`
- `scripts/check-zotero-librarian-profile.ts`
- `scripts/build-zotero-bridge-cli.mjs`
- `scripts/package-zotero-bridge-cli.mjs`
- `scripts/publish-host-bridge-cli-bundle.ps1`
- `scripts/publish-zotero-librarian-profile.ps1`
- `.github/workflows/build-zotero-bridge-cli.yml`

## Required Action

When triggered:

1. Use `$host-bridge-release-pipeline`.
2. Report whether publication used an automatic push workflow run or a manual
   dispatch run.
3. Confirm prebuilds, bundle branch, profile repository, profile manifest, and
   local `addon/bin` sync status.
4. Rerun the release gate with `--host-bridge-done` only after the pipeline is
   complete.

Do not inline or paraphrase the Host Bridge release commands here; the dedicated
skill is the source of truth for that pipeline.
