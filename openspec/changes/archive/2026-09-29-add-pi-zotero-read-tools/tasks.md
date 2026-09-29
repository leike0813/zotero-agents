# Tasks

## 1. Read catalog

- [x] 1.1 Add a failing table-driven shared test for all thirteen IDs, names, closed schemas, effects, and exact Broker dispatch; verify the targeted test fails.
- [x] 1.2 Hard-cut the factory and implement ordinary Broker reads with trusted cancellation and safe errors; verify the shared test passes.

## 2. File and managed note results

- [x] 2.1 Add shared tests for attachment path isolation, page-atomic copy, managed note limit, export, and traversal terminal truth; verify failing cases before corresponding fixes.
- [x] 2.2 Implement the owner-managed projections and preserve C07's final result limit; verify the shared tests pass.
- [x] 2.3 Extend the real Zotero lite canary for a representative page and file result, update the handoff, and verify the targeted host test passes.

## 3. Integrated verification

- [x] 3.1 Run the runtime Node shard, full real Zotero core, lint, build, and strict OpenSpec validation; record exact results in verification.md.
- [x] 3.2 Verify implementation against artifacts, sync the catalog delta, and archive; verify no tasks remain unchecked.
