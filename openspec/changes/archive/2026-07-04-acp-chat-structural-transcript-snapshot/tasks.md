## 1. OpenSpec

- [x] 1.1 Add proposal, design, and task artifacts.
- [x] 1.2 Add a delta spec for ACP Chat structural snapshots.

## 2. Tests

- [x] 2.1 Add tests proving default UI snapshot reads remain full.
- [x] 2.2 Add tests proving structural reads are plan-only and preserve
  transcript metadata.
- [x] 2.3 Add a test proving structural publish mode does not retain full
  message/thought/tool transcript items.

## 3. Implementation

- [x] 3.1 Add ACP Chat UI snapshot read options for `full` and `structural`.
- [x] 3.2 Implement plan-only structural item selection without full transcript
  hydrate/clone work.
- [x] 3.3 Apply structural item selection to explicit structural publish mode.

## 4. Validation

- [x] 4.1 Run focused ACP session manager tests.
- [x] 4.2 Run TypeScript type check.
- [x] 4.3 Run OpenSpec validation and touched-file formatting checks.
