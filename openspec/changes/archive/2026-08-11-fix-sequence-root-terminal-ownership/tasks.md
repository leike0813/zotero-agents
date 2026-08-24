## 1. Regression Coverage

- [x] 1.1 Add workflow-seam tests proving non-final ACP and SkillRunner steps cannot terminalize a running sequence root.
- [x] 1.2 Extend the regression through completed-root short-circuit settlement and verify the existing direct/repaired ACP apply coverage.

## 2. Terminal Ownership

- [x] 2.1 Gate shared provider-terminal resolution on sequence root terminal state and resolve only the last materialized request after completion.
- [x] 2.2 Gate run-seam terminal observation before child or queue facts and remove duplicate sequence terminal inference.

## 3. Documentation and Verification

- [x] 3.1 Document sequence root terminal and apply ownership in the workflow execution seams architecture document.
- [x] 3.2 Run focused regression tests, TypeScript checks, strict OpenSpec validation, and diff integrity checks.
