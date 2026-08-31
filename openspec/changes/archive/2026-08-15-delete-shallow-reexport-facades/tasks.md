## 1. Source Contract

- [x] 1.1 Add a failing source-contract test requiring the two facade files to be absent and all import sites to target owning modules directly.

## 2. Migration

- [x] 2.1 Migrate host bridge dynamic imports to acpSkillRunStore and rename local module variables.
- [x] 2.2 Migrate hooks dynamic import to acpSkillRunStore and rename local module variables.
- [x] 2.3 Migrate six workflow selection importers to workflows/triggerPolicy.
- [x] 2.4 Delete the two facade files.

## 3. Documentation

- [x] 3.1 Add the preventive workflow-execution-seams requirement against single-function re-export facades.

## 4. Verification

- [x] 4.1 Run the source-contract test, workflow execution seams, host bridge capability, and single-result integration suites.
- [x] 4.2 Run TypeScript, ESLint, Prettier, and OpenSpec validation.
