# Verification: fix-library-evidence-search-scope

Baseline: `cc3a3b2c6cd64da05718d3e98bbbc61683a227a4` on `dev-refactor`.

## Implementation assessment

| Dimension | Assessment |
| --- | --- |
| Completeness | Both search-scope requirements and the scoped reverse-Host authorization behavior are implemented. |
| Correctness | Existing Broker tests and real Rust production routes cover collection-derived scope, mixed and duplicate refs, empty intersections, explicit empty refs, explicit scope failures, captured continuation, and changed-source conflicts. |
| Coherence | One existing Broker resolver owns scope semantics. Library search removes its duplicate resolution/intersection; source DTOs and Rust matching stay unchanged. |

The current search implementation meets the two scope contracts that blocked [Library, Topic and evidence search closeout](https://github.com/leike0813/zotero-agents/issues/88). Overall ticket closeout remains blocked by the independent System E2E failure below and by the user's pending integration into dev.

## Passing validation

- `npm run test:node:zotero-host -- --grep 'lexical item search|Library item search|captures one current Library|cursor revalidation|cached fulltext'`
- `npm run test:node -- --shard workflow-host --grep 'search|filter'`
- `npm run test:node -- --shard host-bridge-runtime --grep 'search|filter|evidence'`
- `node_modules/.bin/tsx scripts/run-node-test-shards.ts --suite synthesis-native-stage1 --grep 'Synthesis evidence production route|rejects evidence scope'`
- `node_modules/.bin/tsx scripts/run-node-test-shards.ts --suite synthesis-native-stage1 --grep 'preserves canonical Topic search and stale nonmatch cursors'`
- `cargo +nightly-2026-07-25 test --locked --manifest-path rust/synthesis-sidecar/Cargo.toml -p synthesis-application search`: 47 passed.
- `node_modules/.bin/tsc --noEmit`
- ESLint and Prettier checks on the six modified TypeScript production/test files; Prettier checks on changed specifications, documentation, and change artifacts.
- `npm run check:synthesis-cross-language-contracts`: 82 positive and 61 negative corpus cases.
- `npm run check:synthesis-production-capabilities`: 106 capabilities.
- `npm run check:synthesis-service-boundary`
- `npm run check:synthesis-topic-workbench-surface-parity`
- `npm run check:host-bridge-content`: no generated content changes; consumer guidance aligned.
- `openspec validate fix-library-evidence-search-scope --strict`
- `openspec validate --specs --json`: 369 passed, zero failures.
- `git diff --check`

These are focused test selections, not complete Node domains or complete native stage1 acceptance.

## Real Zotero verification

The host binary was taken from the local directory labelled `10.0.2`; its `application.ini` reports **10.0.5**, which is also the version recorded in the E2E manifest. All tests used the scaffold test profile/data. A temporary `ZOTERO_PLUGIN_KILL_COMMAND` override restricted process cleanup to Zotero using this worktree's `.scaffold/test/profile`, preserving other running Zotero instances.

With `ZOTERO_TEST_GREP='lexical Library item search'`, the existing `npm run test:zotero:core` passed the real Broker/Bridge/MCP test, including the added collection-derived and mixed-reference scope assertions.

`npm run test:zotero:e2e` built its sidecar from current Rust source and ran the existing unified runner. Its Run Manifest is:

`artifacts/test-diagnostics/system-e2e/03ce0ee7-c8b2-4e0d-8cf2-cea50bfecdf8/run-manifest.json`

The manifest records 18 family cases, with **PA-02 failed** and `terminalState: incomplete`; the other 17 family cases passed. PA-02 cleanup and health both passed. The outer runner exited zero after restart invocations, so its exit code is not evidence of a successful full suite.

To determine whether the failure was introduced here, both modified production files were temporarily restored to their exact HEAD contents (confirmed by an empty diff for those files). The same unified runner was executed with `ZOTERO_TEST_GREP='System E2E runner foundation|PA-02'`. **PA-02 failed again**, with one passed foundation case and exit code 1. Its manifest is:

`artifacts/test-diagnostics/system-e2e/b7bbddc9-5c70-4085-9f8a-93c18402dfa2/run-manifest.json`

The baseline diagnostic identifies `client.getSynthesisWorkbenchSurfaceInput`, surface `index`, classification `unavailable`, sidecar code `internal_error`. This is an oversized-artifact Index failure already present before the search fix. The exact underlying cause has not been established. Both production files were restored to the completed search implementation after the baseline run, and type checking passed again.

## TDD and preservation

- The collection/current-Library disagreement first failed in the Broker test, returning a completed empty result instead of executing the scoped search.
- The mixed-reference production-route test first failed for evidence search with `unavailable` rather than a completed search; after shared intersection it passed for both public operations. The harness maps thrown Host fixture errors to HTTP 500, so that red result is not evidence of the real Zotero error mapping. Invalid-scope semantics are asserted separately at the Broker boundary.
- The reverse-Host authorization test first failed because a collection-only unauthorized scope reached its port; the authorized-scope guard made it pass.
- The pre-existing `CONTEXT.md` diff and every untracked file under `artifacts/vector-retrieval-wayfinder/` and `docs/agents/` were checked against their initial diff/hashes and preserved unchanged.

## Remaining warning

The search change is verified, but the complete System E2E gate has not passed. Keep the ticket open and do not report overall close-ready status. Address or explicitly disposition PA-02, then integrate the search commit into dev before closing the ticket.
