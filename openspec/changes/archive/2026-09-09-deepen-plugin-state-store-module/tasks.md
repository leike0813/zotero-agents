## 1. Behavioral Baseline

- [x] 1.1 Run the existing Plugin State Store, separated-run, sequence, Runtime Persistence Governance, mutation-authority, literature-migration, and readonly-Harness tests and verify the public seams are green before restructuring.
- [x] 1.2 Add a public-interface regression for logically distinct composite task keys that collide under the Map adapter's delimiter encoding, and verify it fails before the adapter replacement.

## 2. SQLite Test Adapter

- [x] 2.1 Add the private adapter core and explicitly injected Node `node:sqlite` in-memory test adapter, remove the Map SQL interpreter, and verify the composite-key regression plus Plugin State Store bootstrap tests pass.
- [x] 2.2 Declare Node 24 in package metadata and pass `node-version: 24` to existing CI and release `setup-js` steps; verify lock metadata and workflow syntax remain consistent without duplicate install steps.

## 3. Private Table Locality

- [x] 3.1 Extract task request/context/row DDL, codecs, SQL, CAS, and aggregate operations into the private task-family module; verify task, ACP conversation, workflow-product, governance, and Host Bridge operation-store tests pass through existing interfaces.
- [x] 3.2 Extract ACP, SkillRunner, event, and workflow-sequence DDL, codecs, SQL, and atomic operations into the private run-family module; verify separated-run, run-reducer, sequence, and runtime-governance tests pass.
- [x] 3.3 Extract mutation-authority DDL, codec, SQL, fault hook, insert-winner, settlement, and evidence expiry into its private family module; verify the Zotero Host mutation-authority tests pass unchanged.
- [x] 3.4 Extract literature-migration run/set DDL, codecs, SQL, sorting, and cursor logic into its private family module; verify literature artifact migration tests pass unchanged.
- [x] 3.5 Consolidate the remaining adapter lifecycle, fixed schema order, metadata, legacy-pref clearing, separated-run reset, test reset/export, and cross-family transactions in the root/core; verify initialization order and public exports remain unchanged.

## 4. Documentation And Verification

- [x] 4.1 Update the active Plugin State Store documentation to match current tables, columns, adapters, ownership, and legacy-pref clearing behavior; verify no Map-adapter or stale migration claims remain.
- [x] 4.2 Run focused behavior tests, TypeScript, plugin build, ESLint, Prettier, bundle inspection, and strict OpenSpec validation; fix scoped failures and verify Node-only imports are absent from plugin output.
- [x] 4.3 Verify implementation completeness, correctness, and coherence against proposal/design/tasks, with every task checked and no critical or warning issue remaining before handoff.
