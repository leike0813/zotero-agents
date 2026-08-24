## 1. Module Boundary Contract

- [x] 1.1 Add failing boundary tests for status, controller registry, permission queue, runtime catalog, actions, and workspace selection hosts.
- [x] 1.2 Implement six focused modules until boundary tests pass.

## 2. Store Slimming

- [x] 2.1 Wire focused-module hosts from `acpSkillRunStore`.
- [x] 2.2 Delete moved implementations and exports from `acpSkillRunStore`.

## 3. Caller Migration

- [x] 3.1 Migrate source callers to direct focused-module imports.
- [x] 3.2 Migrate test imports and reset orchestration.

## 4. Documentation and Verification

- [x] 4.1 Update `acp-skill-run-file-backed-runtime-state` and `acp-skills-interactive-execution` specs.
- [x] 4.2 Run focused ACP Skills suites, type checks, and lint.
