# Tasks

## 1. OpenSpec

- [x] Create OpenSpec change `support-zotero9-while-retaining-zotero7`.
- [x] Add proposal, design, tasks, and delta specs.

## 2. Tests

- [x] Add packaged built-in workflow reader fallback tests.
- [x] Add built-in sync diagnostics tests.
- [x] Add manifest compatibility tests for Zotero 7 through 9.0.
- [x] Add static compatibility guard tests for high-risk runtime APIs.
- [x] Add Zotero 9 sandbox workflow loader and registry status diagnostics tests.

## 3. Implementation

- [x] Implement packaged workflow resource reader candidates and diagnostics.
- [x] Persist latest built-in sync diagnostics in workflow runtime state.
- [x] Update workflow debug probe to expose Zotero/version/source diagnostics.
- [x] Update manifest compatibility range.
- [x] Centralize delay and subprocess compatibility helpers and use them.
- [x] Prefer IOUtils/PathUtils before OS.File in touched runtime paths.
- [x] Remove the workflow loader's global `Cc`/`Ci` runtime detection dependency.
- [x] Persist workflow registry scan diagnostics to `workflow-registry-status.json`.
- [x] Treat startup-time `hiddenDOMWindow` resolution failures as optional during
  workflow hook import.

## 4. Verification

- [x] Run `npm run check:builtin-workflow-manifest`.
- [x] Run `npm run test:node:core`.
- [ ] Run `npm run test:zotero:core`.
  - 2026-05-17: ran; failed during Zotero test bundle because existing core
    tests import Node built-ins (`node:fs/promises`, `node:os`, `path`, etc.)
    that the Zotero/browser bundle target cannot resolve.
- [x] Run `npm run build`.
- [x] Run `openspec validate support-zotero9-while-retaining-zotero7 --strict`.
