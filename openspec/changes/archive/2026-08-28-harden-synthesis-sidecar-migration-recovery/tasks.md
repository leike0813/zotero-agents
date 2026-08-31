## 1. Migration Compatibility Contract

- [x] 1.1 Add table-driven tests for supported v0.5-v0.6, v0.7-v0.8.3, planning-only, planning-plus-screening, and unknown-column legacy profiles; verify the repository migration test target distinguishes every variant before implementation changes.
- [x] 1.2 Implement read-only legacy source profiling and stable `legacy_schema_variant_unsupported` rejection; verify unknown variants cause no database, backup, or canonical writes.
- [x] 1.3 Implement variant-aware normalization of tag audit, planning payload, discovery basis, and discovery outcome; verify present facts are preserved and historically absent facts receive documented empty defaults.
- [x] 1.4 Extend candidate validation and idempotent backup/publication checks; verify failed validation leaves the production source intact and a retry can rebuild the candidate.

## 2. Rust Repository Foundation v3

- [x] 2.1 Add failing foundation v1-to-v3 and v2-to-v3 tests; verify the repository requires a complete ordered migration path.
- [x] 2.2 Add foundation v3 and the topic planning column, then implement one-transaction migration-chain execution; verify v1 and v2 repositories converge to the same valid v3 schema with one backup.
- [x] 2.3 Extend repository records and operations for planning plus discovery screening facts; verify repository tests round-trip planning JSON, basis, outcome, and reopened status.

## 3. Native Planned Topic Surface

- [x] 3.1 Add application tests for planning context, compare-and-set plan reconciliation, no provisional memberships, planned filtering, and changed-basis reopening; verify stable observable results.
- [x] 3.2 Implement Planned Topic and discovery outcome semantics in the Rust topic applications and runtime surface; verify native process contract tests pass.
- [x] 3.3 Extend TypeScript contracts, canonical contract-set metadata/corpus, repository ports, grouped clients, and workflow host API; verify contract gates and workflow host tests expose only the native route.

## 4. Startup Supervision and Recovery

- [x] 4.1 Add lifecycle tests for early deterministic child exit, unknown crash retry, terminal fuse, stale delayed retry, and explicit recovery; verify they fail against the previous discovery-only behavior.
- [x] 4.2 Race child exit with discovery, parse stable codes outside debug mode, and make generation-scoped supervisor state own deadlines/retries/fuse; verify no attempt starts after terminal publication.
- [x] 4.3 Replace permanently cached failed owner promises with generation-scoped ownership and route production recovery to the production supervisor; verify one explicit retry creates one non-overlapping generation.

## 5. Observability and User Recovery

- [x] 5.1 Extend launch config and lifecycle observations with safe startup trace phases while keeping raw tails debug-only; verify production snapshots contain stable code and no launch secrets.
- [x] 5.2 Add Workbench and Task Manager failure-state tests for persistent banner, retry, diagnostics, generation dedupe, and debug-only tails; verify tests assert semantic fields/actions rather than full copy.
- [x] 5.3 Implement persistent Workbench recovery UI, Task Manager safe summary, localized labels, and per-generation notification dedupe; verify a successful generation clears the prior failure.

## 6. Acceptance and Documentation

- [x] 6.1 Run Rust formatting and targeted repository/application/runtime test targets; verify all migration, topic, and lifecycle cases pass.
- [x] 6.2 Run targeted Node contract, supervisor, owner, workflow-host, and UI tests plus type checking; verify no cross-language or plugin regression remains.
- [x] 6.3 Run the process migration test against an isolated copy of the `.env`-configured Linux x64 profile; verify the source sample is unchanged and preserved counts/fields match.
- [x] 6.4 Update relevant architecture/migration documentation and validate this OpenSpec change strictly; verify no release, prebuild, commit, or dependency mutation occurred.
