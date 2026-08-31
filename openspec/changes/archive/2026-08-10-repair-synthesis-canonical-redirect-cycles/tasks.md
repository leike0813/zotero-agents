## 1. Redirect Graph Contract

- [x] 1.1 Add failing graph tests for direct reverse, long-chain reroot, cycle repair, and deterministic idempotence.
- [x] 1.2 Implement the repository-owned canonical redirect graph resolver, component planner, reroot operation, and final acyclicity validator.
- [x] 1.3 Replace Reference Index and Citation Graph duplicate redirect resolvers with the shared graph module.

## 2. Review and Mutation Semantics

- [x] 2.1 Add a regression for reverse-accepting an open duplicate after a sibling proposal materialized the forward redirect.
- [x] 2.2 Extend review transition planning and repository application to reroot components, supersede displaced/redundant proposals, and preserve receipt atomicity.
- [x] 2.3 Route automatic promotion and manual/revision merge mutations through final-graph validation with explicit-over-automatic precedence.

## 3. Existing and Imported Data

- [x] 3.1 Add a production repository migration regression for a legacy redirect cycle with an explicit reverse audit.
- [x] 3.2 Register the internal redirect-graph migration identity and implement transactional startup repair, proposal supersession, repair receipt, stale readiness, and idempotence.
- [x] 3.3 Add durable import cycle coverage and normalize the prospective redirect graph before import commit.

## 4. Production Verification

- [x] 4.1 Add a production route regression proving a repaired legacy database can load the Workbench Index without user interaction.
- [x] 4.2 Run OpenSpec validation, Rust formatting, focused tests, workspace tests, clippy, and production surface parity checks.
