## 1. Shared Projection Contract

- [x] 1.1 Add failing contract tests for basename extraction, key sanitization, upload.bin fallback, Windows paths, and dotted relative paths.
- [x] 1.2 Implement `buildSkillRunnerUploadRelativePath` with private normalizers until the contract passes.

## 2. Caller Migration

- [x] 2.1 Migrate the declarative request compiler and delete its private helpers.
- [x] 2.2 Migrate the sequence runtime upload mapping and delete its private helpers.

## 3. Documentation

- [x] 3.1 Document the shared provider mapping module in doc/components/workflows.md.
- [x] 3.2 Add the workflow-execution-runtime requirement for one shared SkillRunner upload path projection.

## 4. Verification

- [x] 4.1 Run the new contract tests, workflow execution seams, and single-result integration suites.
- [x] 4.2 Run TypeScript, ESLint, Prettier, and OpenSpec validation.
