## Why

The two R9b retirement changes can remove obsolete plugin and Node owners using
local, source-bound evidence, but the final seven-platform, universal-XPI, data
migration, failure-recovery, and Zotero 7/9 real-machine matrix requires
separate execution authorization and environments. Keeping those external
checks inside the deletion change would either block source retirement or tempt
an unexecuted acceptance claim.

## What Changes

- Establish one post-retirement acceptance change that binds all results to the
  same source, Rust toolchain, Cargo lock, native fingerprints, and XPI bytes.
- Build and verify the seven manifest-v3 native bundles and the universal XPI
  without publishing, tagging, advancing feeds, or synchronizing Gitee.
- Exercise clean and existing profiles, offline and upgrade installation,
  corrupt and wrong-platform bundles, crash/restart/parent-EOF, production lock
  conflict, registered migration success/failure, and operator recovery.
- Run representative Zotero 7 and Zotero 9 real-machine smoke across the agreed
  platform matrix.
- Keep R9 and Stage 1 explicitly incomplete until every required receipt exists
  for one identity; record missing evidence as pending or failed.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `synthesis-rust-sidecar-migration-governance`: Move final R9/Stage-1
  acceptance into a separately authorized, source-bound post-retirement gate.
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
- Produces acceptance receipts and documentation only; release publication,
  tags/assets, feeds, and Gitee remain separately authorized work.
