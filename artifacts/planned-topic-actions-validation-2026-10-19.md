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

## Build preflight blocker

The following checks passed: Host Bridge CLI seven-platform freshness, Synthesis sidecar seven-platform freshness, Windows ACP bridge fingerprint, Host Bridge generated content/package alignment, canonical validators and builtin workflow manifest. External skill submodules match the index. Topic synthesis isolated rendering matches packaged files after excluding Python caches.

Literature deep-reading isolated rendering identified shared graph app, stylesheet and i18n changes. The generated source templates and builtin skill were synchronized after backing up both paths outside the repository.

After synchronization, `npm run check:content-package-release -- --current-branch` fails:

```text
dev GitHub content feed does not match local generated package semantics
```

This mandatory preflight failure prevents plugin build and real Zotero E2E execution. No release identity, feed, or package version was changed, and no publication was attempted. The current dev content package must be prepared/published under its own authorized release workflow before build and the isolated submission-window acceptance can proceed.

The existing `307-workflow-settings-submit.zotero.test.ts` runner now includes `workflow-settings-submit-planned-topic` (title starts with `WS planned topic prefill`). It exercises the real submission form with synthetic option responses through native composition, checks the planned checkbox, selected label/options and cancel-without-saving behavior. It does not claim native planner persistence coverage. Its TypeScript and browser bundle compile, but its real Zotero execution remains unverified. Target it with `ZOTERO_TEST_GREP='WS planned topic prefill'` after the build preflight is unblocked.

An additional attempt to rerun all other `125-synthesis-tab-ui` cases with the known timeout excluded stopped making progress during the Index group and was canceled; it is not counted as passing. The 82 focused passing checks above and the unchanged-HEAD reproduction are the verified evidence for this change.

Recovery backup and browser diagnostics: `C:/Users/leike/AppData/Local/Temp/zs-planned-preflight-XfXp4l/`.
