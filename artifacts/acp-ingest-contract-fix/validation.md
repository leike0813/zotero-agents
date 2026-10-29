# Validation

The implementation uses optional `collectionRef` and `libraryId` for ingest, complete type-aware permanent removal, schema-valid metadata fallback snapshots, and effective `auto-approved` write policy. The fixed baseline and governed semantic review are recorded beside this report.

Passed checks:

- Five targeted Node suites: 241 passing before the additional HTTP root execution case; the Host Bridge runtime shard subsequently passed with that case.
- `npm run test:node:zotero-host`: all 16 test files passed.
- `npm run test:node:host-bridge`: runtime (9 files) and surface/release (13 files) shards passed.
- Metadata workflow suite: 28 passing, including actual preflight → request → adaptation → ACP schema validation for an empty URL and a DOI URL.
- Final Broker root/removal regression selection: 11 passing, including library drift, conflicting destinations, trashed descendants and child-reader failures.
- `cargo test --locked --manifest-path rust/zotero-bridge/Cargo.toml`: 141 unit tests and 19 executable schema tests passed.
- `cargo build --locked --manifest-path rust/zotero-bridge/Cargo.toml`: local binary built; offline `mutation literature-ingest --schema` includes optional library destination.
- `tsc --noEmit`, ESLint and Prettier for changed runtime/test files, `git diff --check`, strict OpenSpec validation, mutation-contract generation check and Host Bridge content/consumer checks passed.
- All materialized Skill packages passed fixed-baseline relative instruction-depth and duplicate gates. Existing advisory depth warnings were reviewed and retained.
- Independent read-only review checked the connected implementation and Zotero 7/9/10 source APIs; no findings.
- Chinese review mirror: all 156 owned files finalized and passed source, translated structure/hash, inventory and index checks. The refresh includes prior mirror drift; prose-only additions were reviewed separately from structural checks.

The full Rust formatting check reports pre-existing formatting drift in `src/client.rs` and `src/surface.rs`; those unrelated files were not changed. The added Rust test follows rustfmt.

The CLI command contract's full-file Prettier check reports two pre-existing array-layout differences outside the ingest command. The ingest change preserves the existing layout; changed runtime/test files and the other changed contracts pass their format checks.

Real Zotero acceptance, full plugin/XPI build, seven-platform prebuild publication and production-library remediation were not run. Existing shipped CLI binaries embed the previous contract: deployment needs newly built CLI assets and the updated plugin/content. Local validation does not update governed release identities or bundled binaries.
