## 1. Shared Contract

- [x] 1.1 Add failing table-driven tests for display source precedence, partial-update merge, serialization, bounds, and compact selection.
- [x] 1.2 Implement the pure shared ACP tool-call display projection and selector until the contract tests pass.

## 2. Transcript Integration

- [x] 2.1 Migrate ACP Chat display fields and live preview to the shared module while preserving Chat lifecycle behavior.
- [x] 2.2 Migrate ACP Skills display fields and live preview to the shared module while preserving Skills owner and persistence behavior.
- [x] 2.3 Migrate durable transcript index preview selection and retain compatibility-only summary data.

## 3. Renderer Integration

- [x] 3.1 Migrate compact tool-row and tooltip selection to the shared selector with legacy snapshot fallback.
- [x] 3.2 Extend renderer smoke coverage for visible selection and transcript-row DOM identity.

## 4. Verification

- [x] 4.1 Run targeted and core tests, type checks, lint, and plugin/sidebar build checks; resolve regressions within scope.
- [x] 4.2 Validate the OpenSpec change, review the final diff, and confirm all tasks and compatibility constraints are satisfied.
