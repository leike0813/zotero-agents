## 1. Remove recovery gate

- [x] 1.1 Remove bundle identity recovery state and rejection logic from ACP Chat and ACP Skills while retaining package validation metadata.
- [x] 1.2 Update the affected ACP recovery specifications to remove the identity-gate requirements.

## 2. Verify recovery behavior

- [x] 2.1 Update focused ACP tests so a persisted ACP Chat remote session restores after bundle materialization, and remove the obsolete ACP Skills rejection case.
- [x] 2.2 Run focused tests, type checks, lint, and OpenSpec validation.
