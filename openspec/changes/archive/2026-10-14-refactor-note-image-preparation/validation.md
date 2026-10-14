# Validation

## Source and scope

- Baseline: `148ac3512ea1d4f6bc927e7e37faf2c8d4d83bb9`.
- No commit, branch switch, dependency change, data migration or live-task recovery.
- The existing task `acp-skill-mv7xjydw-bghho0` was left unchanged. Its old pending Promise is not resumed by this patch.

## Regression evidence

- Before the lifecycle refactor, disposing a scope during decode left the call pending (0 passing, 1 failing).
- Before the representative-image fix, a module-boundary cancellation probe returned skipped; after the fix it throws `canceled` while an ordinary resource-limit error remains skipped.
- `90-workflow-note-image-preparation.test.ts`: 18 passing, including pending reads, process timeout, dispose, cancellation, shutdown, late results, worker terminal cleanup, concurrent aggregate bytes, source preservation and default hook control.
- `52-runtime-bridge.test.ts`: 9 passing.
- `21-workflow-literature-analysis.test.ts`: 39 passing, 8 existing pending. Includes image success, ordinary failures/timeouts and no note submission after cancellation.
- `45-workflow-note-import-export.test.ts`, `47-workflow-literature-bundle.test.ts`, `102-zotero-host-broker-capability-api.test.ts`: 188 passing together.
- `tsc --noEmit`, targeted ESLint, Prettier and `openspec validate refactor-note-image-preparation --strict`: passed. The project TypeScript configuration excludes tests; real runtime tests provide execution evidence for those files.

## Build preflight and build

- Synthesis runtime / Host Bridge CLI freshness, Host Bridge content/doc-sync, canonical validators and built-in workflow manifest checks passed; the three external literature Skill gitlinks matched.
- topic-synthesis isolated output: all 4 packages matched (11/10/10/10 files).
- literature-deep-reading isolated output: 23 files matched; 13 renderer templates matched.
- Snapshot and backup root: `C:/Users/leike/AppData/Local/Temp/note-image-preflight-bblLqY`.
- `npm run prebuild:acp-ws-bridge` passed against the baseline with no ACP source/script diff before or after. SHA-256: `5efa9797146c430e09bef7af442ff7bc3168d0273e22e3c69c71a9b381bd6e06` (unchanged). Existing binary/checksum were backed up first.
- `npm run build`: passed, including all package and plugin TypeScript configurations. `npm run check:help-docs`: passed (504 documents, 53 assets).

## Real runtime acceptance

Use `ZOTERO_TEST_GREP='Note image worker real runtime'` and the explicit per-version Windows binary with `npm run test:zotero:core`. The runner creates isolated profile/data. No compatibility-matrix version is changed.

- Zotero 7.0.32: 2 passing. The initial large-image fixture was a cross-realm main-window Blob and was rejected by the existing host Blob check; the fixture now materializes bytes into the host realm. The preferences-close test passed on the initial run as well.
- Zotero 9.0.6: 2 passing; runtime suite title confirmed the actual version.
- Zotero 10.0.2: 2 passing; runtime suite title confirmed the actual version. This local patch-version evidence is distinct from the pinned 10.0.1 matrix.
- Atomic apply E2E (Zotero 10.0.2): passed with the existing `npm run test:zotero:e2e`, grep `Note image atomic apply E2E`. A real prepared image was committed with its note body, with attachment ownership/MIME and idempotent replay verified. Summary: complete, 1 selected, 1 passed, 0 failed/skipped/incomplete.
- E2E manifest: `artifacts/test-diagnostics/system-e2e/72ccd0d3-8c08-4cc8-944c-49cc2fb27857/run-manifest.json`.
- E2E used the locally built current-source sidecar (`375c285fb1397ac7940db2fbeeb78a4e6758424372babbebf7f83a7915fc7914`), not the packaged release binary.
- Final `npm run build`: passed after the real tests (the test runner replaces the build directory).
- `check:synthesis-sidecar-runtime-xpi`: passed for all 7 targets with no missing or forbidden entries. Production XPI: `.scaffold/build/zotero-agents.xpi`; SHA-256: `981a05f8cdda2f0654168884bc5ba1a3c645f6a9801f259b95b25973cdc72391`.
- The production ZIP contains `content/workers/note-image-worker.js` (2436 bytes); `check:help-docs` passed again.

## Acceptance limits

This is targeted Windows acceptance (254 related Node tests, 6 real worker tests and 1 atomic apply E2E), not the full cross-platform compatibility catalog. The 8 pending literature-analysis tests predate this change. No running user instance was upgraded and the hung task was not recovered.
