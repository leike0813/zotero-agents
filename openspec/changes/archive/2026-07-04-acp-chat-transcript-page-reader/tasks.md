## 1. OpenSpec

- [x] 1.1 Add proposal, design, and task artifacts.
- [x] 1.2 Add a delta spec for ACP Chat transcript page reader scope metadata.

## 2. Tests

- [x] 2.1 Add a test proving current ACP Chat transcript page reads preserve
  `.items` compatibility and expose stable scope metadata.
- [x] 2.2 Add a test proving explicit background conversation page reads do not
  depend on or switch the active conversation.
- [x] 2.3 Add a test proving the page reader waits for target-session pending
  transcript writes.
- [x] 2.4 Add a test proving page boundary metadata is preserved for tail and
  cursor reads.

## 3. Implementation

- [x] 3.1 Resolve ACP Chat page reader scope with `normalizeConversationId()`.
- [x] 3.2 Flush only the target session runtime's pending transcript writes.
- [x] 3.3 Return the enriched page DTO while keeping existing `.items` callers
  compatible.

## 4. Validation

- [x] 4.1 Run focused ACP session manager tests.
- [x] 4.2 Run TypeScript type check.
- [x] 4.3 Run OpenSpec validation and touched-file formatting/lint checks.

Note: touched-file ESLint passed. Prettier check was run and still reports
existing whole-file formatting drift in `src/modules/acpSessionManager.ts` and
`test/core/96-acp-session-manager.test.ts`; no formatter rewrite was applied in
order to keep this change scoped.
