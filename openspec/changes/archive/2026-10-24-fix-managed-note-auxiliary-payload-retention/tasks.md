# Tasks

## 1. Managed replacement and transfer

- [x] 1.1 Preserve omitted auxiliary values using the existing logical payload writer; verify repeated digest updates and explicit replacement through Host API tests.
- [x] 1.2 Recover unique valid missing-anchor auxiliary payloads only in private transfer; verify bundle round trip, unchanged source, and rejection of ambiguous or mismatched sources. Existing invalid-content checks remain in force.
- [x] 1.3 Update payload documentation to describe retention and the private transfer boundary; validate the OpenSpec change strictly.

## 2. Integration

- [x] 2.1 Run related Node regressions and TypeScript/lint checks; record results.
- [x] 2.2 Complete build preflight and produce a verified XPI; record its SHA256 and unchanged content package identity.

## Evidence

- Red: isolated synthetic two-write Host API reproduction failed with `managed note payload could not be transferred`; public metadata state was `stale` with `anchor_stale`.
- Green: related note import/export, research bundle, and Broker suites: 180 passing; literature bundle suite: 35 passing.
- Native Windows Zotero 10.0.2: 3 passed, zero skipped/incomplete. Manifest: `artifacts/test-diagnostics/system-e2e/9d67dbb2-9c8e-41ac-af0c-bfb50b6582b4/run-manifest.json`. Covers repeated digest write, retained metadata, missing-anchor export twice, complete auxiliary PNG payload, unchanged source, and immediate cleanup.
- `npm run build` passed, including shared-package and four plugin/page TypeScript checks. ESLint, Prettier, `git diff --check`, help-doc checks and packaged seven-platform sidecar check passed.
- Build preflight passed for Host Bridge CLI/content, Synthesis sidecar, ACP bridge, builtin Skills/workflow manifests and canonical validators.
- Content release check: dev `0.8.10-dev.14`, 425 files, 5,021,043 bytes, SHA256 `5396105cd3fd17ddfbb942835f0345b6d40b7533e7015e54059b9cbea5e6a633`, byte-identical to the published package.
- XPI: `.scaffold/build/zotero-agents.xpi`, SHA256 `1b39dc25be71f4fa374a2106f1fcc928ce0060bb6da03beecb25eb1dd2ed3003`.
- The real library was read only; diagnosis used an isolated database copy. No full real-collection export or Zotero 7/9 execution was performed. No content release or commit was required for this plugin-only change.
