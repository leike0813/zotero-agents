## 1. TDD Coverage

- [x] 1.1 Add Node query-service tests for shared predicates, bounded hydration, keyset order, cursor validation, wildcard literals, and concurrent insert/delete behavior.
- [x] 1.2 Add real-Zotero query-service tests and register them in the core-lite suite/domain allowlist.
- [x] 1.3 Update broker, Host Bridge, MCP, and collection-collector tests for page-only hydration, string cursor schemas, structured cursor errors, and first-page omission.

## 2. Shared Query Implementation

- [x] 2.1 Add the production Zotero library page-query service with canonical criteria, shared parameterized predicates, count/page queries, ordered page hydration, and opaque cursor helpers.
- [x] 2.2 Migrate list, snapshot, readiness, and search broker paths to the shared service and remove full-library scan, sort, and offset logic.

## 3. Public Boundaries And Consumer

- [x] 3.1 Tighten Host Bridge and MCP library cursor schemas to strings and map `invalid_library_cursor` as a structured non-retryable error.
- [x] 3.2 Update collection-collector to omit the first cursor and pass through only returned cursors.

## 4. Specifications And Documentation

- [x] 4.1 Update the broker SSOT and R7 audit status with the current keyset architecture and verification state.
- [x] 4.2 Run Host Bridge semantic review, update the wrapper semantic source, and render/check generated Host Bridge surfaces.

## 5. Verification

- [x] 5.1 Run focused Node tests and TypeScript type checking.
- [x] 5.2 Run strict OpenSpec validation and Host Bridge/profile sync checks.
- [x] 5.3 Run Zotero 9 core-lite host verification and record Zotero 7 host verification as pending when unavailable.
