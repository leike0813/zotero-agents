## 1. Prerequisite Inventory Gate

- [x] 1.1 Verify all seven operation-surface changes are complete and their evidence covers every operation assigned by the parent ownership matrix
- [x] 1.2 Add an exact automated comparison proving the ownership matrix, 95-operation manifest, Rust dispatcher, TypeScript capabilities, and ready roster have no missing, duplicate, or unknown entry

## 2. Activation and Admission

- [x] 2.1 Add failing lifecycle-token activation tests for receipt/instance/fingerprint/roster/smoke mismatch and expired or replayed control requests
- [x] 2.2 Implement atomic `system.production.activate` persistence, production-owner marker fsync, in-memory mutation gate transition, and discovery/health/handshake refresh
- [x] 2.3 Implement plugin mutation-health confirmation and final `mutation_enabled` receipt persistence
- [x] 2.4 Add crash-window restart tests and Rust-only repair between durable native activation and the final plugin receipt

## 3. Owner Composition and Consumer Routing

- [x] 3.1 Complete the production owner composition, non-blocking background cutover, readiness-bound builtin Tag initialization/runtime reconcile, and bounded maintenance responses
- [x] 3.2 Verify default-client, Workflow, Workbench, Host Bridge, and MCP share one generation-scoped native composition with zero legacy construction
- [x] 3.3 Verify shutdown invalidates the native client, closes reverse Host, and stops the supervisor in the required order

## 4. Static and Runtime Gates

- [x] 4.1 Enforce production import, root opener, socket transport, backup/restore exception, legacy-oracle isolation, and complete-readiness boundaries with positive and negative fixtures
- [x] 4.2 Run the full 95-operation differential suite plus malformed, oversized, expired, unknown, Host-failure, pre/post-admission, and repair cases

## 5. Final Verification

- [x] 5.1 Pass OpenSpec strict validation, contract/capability/ownership and boundary checks, relevant Core and Stage-1 suites, TypeScript checks, Rust fmt/clippy/workspace tests, and the production build
- [x] 5.2 Update active R9a documentation and the parent change only after all gates pass; keep R9b, remote acceptance, release, Gitee, and commits out of scope
