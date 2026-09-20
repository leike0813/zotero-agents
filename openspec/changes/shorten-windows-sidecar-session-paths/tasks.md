# Tasks

## 1. Shorten the run layout

- [ ] 1.1 Replace `randomUUID()` in `createRunLayout` with an 8-character hex token and verify the layout test still proves two layouts under one root are disjoint
- [ ] 1.2 Pass the run segment root as `ZOTERO_SKILLS_RUNTIME_ROOT` in the compatibility worker and read the same root in the runtime-evidence collector, so the session path no longer contains `\runtime\runtime`; verify the runtime-evidence round-trip test still captures the log and the sidecar observation
- [ ] 1.3 Stop repeating mode and suite in the cell directory label and verify the matrix tests still resolve the cells' run layouts

## 2. Pin the path budget

- [ ] 2.1 Add a run-layout test that builds the deepest Windows target under a 45-character run root and asserts the sidecar session root, its `config.json`, and its `discovery.json` stay at or below 250 characters; verify the assertion fails against the pre-change layout
- [ ] 2.2 Verify the budget covers every planned Windows cell by asserting the longest planned target id is the one the test uses

## 3. Verify on the runner

- [ ] 3.1 Run one Windows calibration round and verify the cells no longer report `step: runtime-directory` with `NS_ERROR_FILE_NAME_TOO_LONG`, recording the new classification or the absence of a launch failure
- [ ] 3.2 Verify `npm run test:node:zotero-host`, `npm run test:node:synthesis`, and `npm run test:node:runtime` hold their documented baselines, and that `openspec validate shorten-windows-sidecar-session-paths --strict` passes
