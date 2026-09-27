## 1. Reorganize deterministic tests

- [x] 1.1 Move regular Node tests from the shared core buckets into production-domain directories and verify the shard inventory has no unassigned or duplicate files
- [x] 1.2 Replace broad core/lite/full Node selection with independently runnable ownership shards and verify each domain command resolves its expected files
- [x] 1.3 Update moved imports, scripts, and active documentation references and verify TypeScript compilation succeeds

## 2. Establish the real-host layer

- [x] 2.1 Place direct Zotero tests under core, UI, and workflow lite/full directories and verify recursive configuration discovery
- [x] 2.2 Consolidate Zotero setup and diagnostics while removing aggregate suites and mode/title membership filters
- [x] 2.3 Verify `npm run test:lite` and `npm run test:full` pass in the real Zotero runtime

## 3. Prune toxic tests

- [x] 3.1 Remove test-governance meta-tests, static instruction/source assertions, redundant environment-neutral copies, and obsolete forwarding helpers
- [x] 3.2 Remove brittle private-host monkeypatch and dead mixed-runtime cases while retaining observable host and public artifact contracts
- [x] 3.3 Re-run affected Node domains and verify all focused shards pass

## 4. Update gates and specifications

- [x] 4.1 Make regular Node shards plus Zotero lite part of the pull-request gate and Zotero full part of the release gate, then inspect the generated gate plan
- [x] 4.2 Update the main testing specifications and documentation to describe ownership, runtime affinity, and valid assertion seams
- [x] 4.3 Run the complete Node suite, Synthesis native stage1, formatting/diff checks, and strict OpenSpec validation

## 5. Close review gaps

- [x] 5.1 Rebind the fatal Synthesis runtime invariant references to executable ownership guards and verify `test:synthesis:invariants` runs them
- [x] 5.2 Restore a focused real-Zotero nested Workspace close/reopen publication guard in UI lite
- [x] 5.3 Run the affected Synthesis, Zotero lite, type, lint, formatting, diff, and strict OpenSpec checks
