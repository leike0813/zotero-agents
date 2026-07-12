## 1. Regression coverage

- [x] 1.1 Add shared execution-progress coverage for opt-in legacy promotion while preserving the default unavailable behavior.
- [x] 1.2 Add ACP Chat lifecycle coverage for empty-owner initialization, legacy-prompt promotion, persistence, and restart restoration.
- [x] 1.3 Verify shared UI smoke coverage for ACP Chat `x/y` counter presentation and managed-region identity.

## 2. ACP Chat count initialization

- [x] 2.1 Add an opt-in observed-epoch promotion path to shared message-count and execution-progress state.
- [x] 2.2 Initialize empty ACP Chat owners as complete and promote a legacy owner at its next user-originated prompt.

## 3. Verification

- [x] 3.1 Run focused counter, ACP Chat, and UI regression tests.
- [x] 3.2 Run TypeScript, localization, lint, OpenSpec strict validation, and diff-whitespace checks.
