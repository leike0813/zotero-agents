## 1. Regression Coverage

- [x] 1.1 Add ACP UI smoke coverage for no-backend and
  backend-without-conversation selector/action projection.
- [x] 1.2 Add session-manager coverage for backend-level Connect, conversation
  reuse, and retained retry state after initialization failure.

## 2. First-Use Projection

- [x] 2.1 Derive ACP Chat backend availability from owner navigation groups and
  keep backend selectors plus New/Connect available without a conversation.
- [x] 2.2 Route the existing Connect action through navigation-group scope with
  the selected `groupId`.

## 3. Connection Ownership

- [x] 3.1 Verify the existing backend-only Connect path establishes and reuses
  one active local conversation.
- [x] 3.2 Protect the existing retained-conversation retry state when
  connection initialization fails.

## 4. Validation

- [x] 4.1 Run the focused ACP session-manager and UI smoke tests.
- [x] 4.2 Run OpenSpec validation, TypeScript checking, and targeted
  formatting/lint checks.
