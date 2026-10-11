## 1. Query contracts and native projection

- [x] 1.1 Extend shared/native Index query, projection and pagination contracts and parity fixtures; validate the closed schemas and protocol corpus.
- [x] 1.2 Implement and test native matching before parent pagination, matches-only scans and targeted summary/detail reads.

## 2. Host query and cache lifecycle

- [x] 2.1 Implement progressive global matching directories, exact totals and page navigation without replaying old cursors; verify global matches and arbitrary navigation.
- [x] 2.2 Implement bounded query/page reuse, stale-result isolation, invalidation and oversized-directory rescanning; verify untruncated totals and last-page access beyond the directory bound.

## 3. Page interaction

- [x] 3.1 Implement icon footer pagination, debounced global search and page/count loading feedback with virtual-row identity tests.
- [x] 3.2 Update localized strings and remove window-scoped guidance; supply distinct accessible labels for every page control.

## 4. Documentation and acceptance

- [x] 4.1 Update project Index constraints, documentation and specification.
- [x] 4.2 Run targeted tests, types, lint, native parity and isolated current-source Index E2E; record verification limits.

## Verification

- Targeted Node tests (`125-synthesis-tab-ui`, `257-synthesis-windowed-rows`, `218-synthesis-cross-language-sidecar-contract`): 124 passed. Native Index tests: 11 passed.
- TypeScript checks passed for the root, Synthesis, Dashboard, Sidebar and contracts. Cross-language contracts, canonical validators and Topic Workbench surface parity passed.
- Application Clippy with all targets and warnings denied, Rust formatting, changed-code ESLint/Prettier and `git diff --check` passed.
- `ZOTERO_TEST_GREP='PA-02' npm run test:zotero:e2e`: 1 selected, 1 passed, using the plugin and sidecar built from current source with isolated test data. Receipt: `artifacts/test-diagnostics/system-e2e/eac73def-6fa2-41ed-910c-38fcf87ffe00/run-manifest.json`.
- `openspec validate optimize-synthesis-index-pagination-search --strict` passed.
- Windows real-machine acceptance and the full E2E suite were not run. Deployment requires the matching updated plugin and sidecar; large-library cold queries finish counting progressively in the background.
