## 1. Bundle I/O Contract

- [x] 1.1 Add failing contract tests for bytes → temp zip + dispose, directory, unavailable, idempotent dispose, and empty-bytes precedence.
- [x] 1.2 Implement `openRunResultBundleReader` and the handle until the contract passes.

## 2. Caller Migration

- [x] 2.1 Migrate sequence step apply to the open/dispose handle and delete its private copy.
- [x] 2.2 Migrate SkillRunner foreground continuation apply result path.
- [x] 2.3 Migrate SkillRunnerClient bundle terminal settlement.
- [x] 2.4 Migrate the apply seam, replace its five bundle primitive deps with one injected opener, and convert sequence/aggregate cleanup to handle arrays.

## 3. Documentation

- [x] 3.1 Document the run-result reader policy and dispose scope in the workflow execution seams architecture document.
- [x] 3.2 Add the run-result Bundle I/O requirement to the workflow-execution-seams OpenSpec.

## 4. Verification

- [x] 4.1 Run the new Bundle I/O contract tests, workflow execution seams, and single-result integration suites.
- [x] 4.2 Run TypeScript, ESLint, Prettier, and OpenSpec validation.
