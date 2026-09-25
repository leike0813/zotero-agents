## Why

Both R9b retirement changes are archived, while final seven-platform,
universal-XPI, data-migration, failure-recovery, and real-machine acceptance
remains unclaimed. The governed prebuild and verification receipts and the
Zotero compatibility matrix now provide evidence sources that this change
must join without treating source retirement or routine CI success as final
acceptance.

## What Changes

- Bind the existing prebuild v4 and verification v2 evidence, seven native
  bundles, one universal XPI, and environment results to one source and
  candidate identity. Missing or mismatched evidence remains pending or failed.
- Build and verify the seven manifest-v3 native bundles and one universal XPI.
  The governed prebuild may publish its immutable content-addressed set; the
  candidate XPI is not released or used to advance a production pointer.
- Exercise clean and existing profiles, offline and upgrade installation,
  corrupt and wrong-platform bundles, crash/restart/parent-EOF, production lock
  conflict, registered migration success/failure, and operator recovery.
- Run the current blocking Linux/Windows Zotero 7/9/10 compatibility cells
  against the same candidate XPI and record nonblocking matrix cells separately.
- Keep R9 and Stage 1 explicitly incomplete until every required receipt exists
  for one identity; record missing evidence as pending or failed.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `synthesis-rust-sidecar-migration-governance`: Bind the already separate
  R9/Stage-1 completion gate to current source and candidate evidence.
- `synthesis-sidecar-runtime-packaging`: Require the post-retirement
  seven-target bundle and universal-XPI inventories, integrity evidence, and
  size budgets without implying publication.
- `synthesis-native-runtime-upgrade`: Require clean, upgrade, offline,
  corrupt-bundle, registered-migration, and recovery acceptance against the
  final native-only candidate.
- `synthesis-sidecar-runtime-supervision`: Require real-process crash,
  restart, parent-EOF, shutdown, fuse, and production-lock acceptance for the
  final candidate.

## Impact

- Adds no product runtime or compatibility path.
- Uses the surviving native prebuild/package verification workflows, Rust
  process tests, installation harnesses, and operator runbooks after
  `remove-synthesis-plugin-legacy-owner` and
  `remove-synthesis-node-sidecar-stack` are locally complete.
- Reuses existing evidence formats and may add only the acceptance evidence
  collection or test-harness support needed for uncovered cases. Release
  publication, release tags/assets, feeds, and Gitee remain separate work.
