## 1. Establish the regression boundary

- [x] 1.1 Add structured governance tests for the Stage 1 suite inventory and shared PR/release gate plan, then record the failing baseline.
- [x] 1.2 Record the cumulative Core 175–217 baseline and the isolated Core 202 result.

## 2. Add the cumulative milestone gate

- [x] 2.1 Extend the Node shard runner with a fail-closed `synthesis-sidecar-stage1` named suite and isolated Core 202 segment.
- [x] 2.2 Add the package entry and refactor the shared CI gate into a structured stage plan that runs the Node milestone for PR and release.
- [x] 2.3 Run the structured governance tests and the complete named milestone suite.

## 3. Replace brittle assertions

- [x] 3.1 Replace Core 125 repository source-string checks with Core 207 observable authors persistence across reopen.
- [x] 3.2 Remove the redundant Core 213 source-order test and verify its stable claims remain covered by behavioral lifecycle and capability tests.

## 4. Close focused quality gates

- [x] 4.1 Run focused tests, Synthesis and root TypeScript checks, service-boundary and invariant checks.
- [x] 4.2 Run focused ESLint and Prettier, `git diff --check`, strict OpenSpec validation, and final scope review; record unrelated gate blockers without changing them.
