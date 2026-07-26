## Why

Zotero library reads currently materialize, filter, sort, and slice the entire library for every page, so multi-page consumers multiply main-thread object loading and sorting cost on large libraries. The shared library surface needs database-backed keyset pagination with one opaque cursor contract so page cost stays bounded and all callers observe the same filtering semantics.

## What Changes

- Add one shared Zotero library page-query service that applies library, collection, tag, item type, and text predicates in parameterized SQLite queries, counts with the same predicate, and hydrates only the selected page.
- Define text matching across title, creator, date, publication, abstract, tag, and item key using Zotero SQLite `NOCASE` semantics while treating `%` and `_` as literal characters.
- **BREAKING**: replace non-zero numeric/offset library cursors with opaque, criteria-bound keyset cursors; only an omitted cursor or string `"0"` may select the first page.
- Return a stable, non-retryable `invalid_library_cursor` error for malformed, unsupported, or criteria-mismatched cursors across Host Bridge and MCP.
- Make `library.list_items`, `library.sync_snapshot`, `library.readiness_audit`, and `library.search_items` use the shared query service and preserve current-page hydration, result, and total-count semantics.
- Make `collection-collector` omit the cursor on its first request and pass through only returned cursors on later requests.
- Update the Host Bridge semantic source, generated surfaces, architecture documentation, and the R7 audit status.

## Capabilities

### New Capabilities

- `zotero-library-keyset-pagination`: Defines shared database predicates, bounded page hydration, text matching, opaque cursors, and cursor validation for Zotero library reads.

### Modified Capabilities

- `host-bridge-service`: Requires library capabilities and transport errors to expose the shared opaque cursor contract and structured cursor failures.
- `host-bridge-cli-interface`: Requires agent-facing library pagination guidance to omit the first cursor and pass through returned cursors.
- `zotero-mcp-tool-suite`: Requires MCP library schemas and errors to use string cursors and expose structured non-retryable cursor failures.
- `collection-collector-workflow`: Requires inventory paging to begin without a cursor and continue only with the previous page's opaque cursor.

## Impact

Affected areas include the Zotero host capability broker, a new library query module, Host Bridge capability schemas and error mapping, MCP protocol schemas and error mapping, the built-in collection collector hook, Node and real-Zotero tests, core-lite suite registration, OpenSpec, Host Bridge semantic sources and generated documentation, and the R7 performance audit. No dependency, branch, release, or persisted transcript/library-store format changes are required.
