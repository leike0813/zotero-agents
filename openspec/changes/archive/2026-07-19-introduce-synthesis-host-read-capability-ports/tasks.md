## 1. Red Tests

- [x] 1.1 Add Host read contract tests for JSON safety, bounded pages and ref lookup, opaque artifact descriptors, locator reads, stale hashes, and invalid-before-Host behavior.
- [x] 1.2 Update reference refresh and performance tests for page traversal, hash-first diffing, unchanged-payload suppression, changed reference/citation payload reads, and conservative stale handling.
- [x] 1.3 Update workflow and boundary tests to forbid function-valued Zotero item inputs, the legacy adapter, concrete Host reads in service query paths, and inventory drift.

## 2. Host Read Contracts and Adapters

- [x] 2.1 Add environment-neutral library and artifact Host read DTOs plus the grouped `SynthesisHostReadPort` contract.
- [x] 2.2 Implement deterministic bounded Zotero library pages, finite stable-ref lookup, descriptor-only artifact scan, and expected-hash locator reads.
- [x] 2.3 Migrate the readonly harness adapter and split pure library/artifact projection helpers from Zotero-specific access.

## 3. Service Read Boundary

- [x] 3.1 Replace `SynthesisLibraryAdapter` production injection with `hostReadPort`, page collectors, finite lookup helpers, and service-owned projections.
- [x] 3.2 Convert reference-sidecar refresh to scan/diff/read-changed flow while preserving progress, cache, diagnostics, and failure semantics.
- [x] 3.3 Remove Zotero object fallback from workflow sidecar inputs and route migrated metadata/title reads through the Host port.
- [x] 3.4 Move default legacy service instance creation, Host adapter injection, caching, and invalidation into the single client composition root.

## 4. Documentation and Validation

- [x] 4.1 Update active Synthesis runtime, ownership, and boundary documentation for completed Host reads and deferred Host effects.
- [x] 4.2 Run focused Core 123, 125, 129, 131, 140, 143, 144, 150, 152, 168, 175, 176, 177, and Host-read tests; readonly UI harness; and Synthesis invariants.
- [x] 4.3 Run contracts/root TypeScript, service-boundary, targeted Prettier/ESLint, `git diff --check`, production build, and strict OpenSpec validation without archiving, committing, publishing, or rewriting the known stale Host Bridge release manifest.
