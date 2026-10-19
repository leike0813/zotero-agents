# Planned Topic actions validation

Change: `fix-planned-topic-view-actions`.
Baseline: `b0b5bc7ab9bd6f525cc0f1af02339da613e3a051`, branch `dev`.

## Implemented behavior

Topics combines materialized artifacts and planned/stale graph nodes only in its presentation. Artifact inventories remain separate. List, grid and graph inspector share lifecycle-aware workflow actions; planned creation preserves the exact topic ID and enables planned mode. Stale creation is disabled. Materialized grid cards keep report navigation separate from their update icon.

## Verification

- Focused Node suites for Topics, bounded windows, lifecycle consumers, workflow options and UI region stability: 79 passing. Targeted host launch/asset-token checks: 3 passing.
- Host, Synthesis, Sidebar and Dashboard TypeScript checks passed.
- ESLint on changed source/test files, localization governance and strict OpenSpec validation passed.
- Hosted workbench, standalone graph and standalone topic entrypoints compiled with esbuild to temporary output.
- Headless installed Chrome exercised list/grid Create, grid Update, graph-inspector Create/Update and stale disabled state. Action payloads preserved exact target IDs without report-navigation duplication. List/grid screenshots were inspected in the temporary preflight directory.
- Broader Node run: 179 passing, one Index directory-settling timeout. The same isolated case fails identically in a separate unchanged HEAD export, so it is an existing failure: `locates a page beyond the bounded matching directory with a fresh scan` (56,000 sources).

## Build preflight and real Zotero acceptance

The earlier `dev GitHub content feed does not match local generated package semantics` failure was resolved by an authorized dev Content Package publication. The current `dev` content package must be prepared/published under its own authorized release workflow before build and the isolated submission-window acceptance can proceed.

- dev Content Package `0.8.10-dev.5` → `0.8.10-dev.6`, committed and pushed to `dev`, dispatched through `publish-content-feed.yml` run `39248264021` (success).
- Published asset `zotero-agents-official-workflows-0.8.10-dev.6-dev.zip`, sha256 `7ffdf8224e8b6f649bee8091633e07a01df4a14a372f24a46c8eea337d7a873f`, verified by `npm run check:content-package-release -- --channels dev` and `-- --current-branch`.
- Build preflight is fresh: Synthesis sidecar and Host Bridge CLI seven-platform freshness, Windows ACP bridge fingerprint, Host Bridge content and doc sync, canonical validators, builtin workflow manifest, topic-synthesis renderer output, literature-deep-reading isolated snapshot render, and external skill submodules.
- `npm run build` succeeded and `npm run check:help-docs` passed.
- `ZOTERO_TEST_GREP='WS planned topic prefill' npm run test:zotero:e2e` passed: `WS planned topic prefill selects the exact target and cancels without saving`, 1 passed, `system-e2e-summary` complete (manifest `artifacts/test-diagnostics/system-e2e/dc71d545-e28b-4f11-b398-647a582697f6/run-manifest.json`).

The first three E2E invocations aborted before building with `UNKNOWN: unknown error, open 'typings/i10n.d.ts'` while the fluent `dts` step rewrote that file immediately after `npm run build`. Node read/write and PowerShell exclusive open of the same path succeeded at the same time, and the identical invocation passed once the short-lived lock cleared. This is an environment lock, not a change defect; it is recorded so a later occurrence is not re-diagnosed from scratch.

The existing `307-workflow-settings-submit.zotero.test.ts` runner now includes `workflow-settings-submit-planned-topic` (title starts with `WS planned topic prefill`). It exercises the real submission form with synthetic option responses through native composition, checks the planned checkbox, selected label/options and cancel-without-saving behavior. It does not claim native planner persistence coverage. Target it with `ZOTERO_TEST_GREP='WS planned topic prefill'`.

An additional attempt to rerun all other `125-synthesis-tab-ui` cases with the known timeout excluded stopped making progress during the Index group and was canceled; it is not counted as passing. The 82 focused passing checks above and the unchanged-HEAD reproduction are the verified evidence for this change.

Recovery backup and browser diagnostics: `C:/Users/leike/AppData/Local/Temp/zs-planned-preflight-XfXp4l/`.
