# Validation

Validated on 2026-10-11. The change remains active; no commit, archive, or publication was performed.

## Automated checks

- Bridge capabilities/uploads, runtime persistence governance, native attachments, shared preparation, and mutation authority: **161 passing** in one Node invocation.
- Zotero Host Broker capability API: **113 passing**.
- MinerU, translator, and deep-reading workflow suites with `ZOTERO_TEST_MODE=full`: **56 passing**, including staged-output failure recovery, ambiguity, existing linked outputs, stored replacement, and alignment discovery beside a stored translation.
- `tsc --noEmit --pretty false`: passed.
- ESLint on changed TypeScript files: passed. Builtin workflow MJS files are excluded by repository lint configuration; workflow loading and behavioral tests validate these files.
- Prettier checks on 26 changed code/config files and `git diff --check`: passed.
- `openspec validate unify-attachment-storage-and-lifecycle --strict`: passed.
- `npm run check:help-docs`: passed, 504 documents and 53 assets. The eight changed embedded Markdown documents were regenerated with the existing help-doc renderer; source and embedded content were updated together.

The Node invocations use `tsx node_modules/mocha/bin/mocha` with `--require tests/setup/zotero-mock.ts`. They cover the modified suites rather than the full repository test catalog.

## Isolated Zotero acceptance

The existing `npm run test:zotero:e2e` runner, filtered by `ZOTERO_TEST_GREP='Stored attachment sync full E2E'`, passed on all locally available Linux host lines. Each invocation built the plugin and Synthesis sidecar from current source and used an isolated test library/profile.

| Host | Result | Run manifest |
| --- | --- | --- |
| Linux Zotero 7.0.32 | 1 passed, 0 failed | `artifacts/test-diagnostics/system-e2e/373cc7a5-418e-4fab-8c11-66811c5bb773/run-manifest.json` |
| Linux Zotero 9.0.6 | 1 passed, 0 failed | `artifacts/test-diagnostics/system-e2e/a3d40962-28d3-40ef-9ae2-c42465d26e7d/run-manifest.json` |
| Linux Zotero 10.0.2 | 1 passed, 0 failed | `artifacts/test-diagnostics/system-e2e/e66c2fcb-7b40-4ceb-b740-ec499a0982e8/run-manifest.json` |

Host labels above identify the explicitly selected installation trees. Because the invocation selects only the attachment case, the runner manifests retain `zoteroVersion: pending-runtime`; they record successful case results but do not independently attest the host version.

The case verifies permanent stored bytes after source deletion, companion-only replacement, preserved synced hash/time, native WebDAV admission with mocked remote metadata, and actual native ZIP contents. WebDAV upload-file creation is intercepted before network effects; no live account is involved.

## Review and limits

Public Workflow Host v12 and Bridge v2 request shapes remain unchanged. Stored preparation and naming have one plugin owner, consumed upload cleanup removes only registry-owned directories, and operation replay resolves durable results before requesting expired uploads. Adjacent overwrite remains package-owned; uncertain results preserve recovery files. Old linked attachments are not migrated.

Windows runtime and real WebDAV/Zotero account round trips were not run. Portable-name and Windows-path comparison cases were exercised in Node; these are not substitutes for Windows runtime acceptance. The Zotero 10 host is intentionally 10.0.2; the repository compatibility matrix remains at its existing baseline.
