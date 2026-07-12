## 1. Regression Contracts

- [x] 1.1 Add ACP wire coverage proving `session/cancel` is a notification with the active session id and no response id.
- [x] 1.2 Add held-prompt ACP Chat tests for requested, confirmed, unconfirmed, force-stop, permission cancellation, and stale settlement behavior.
- [x] 1.3 Add live and recovered ACP Skills tests for requested, confirmed, non-cancelled, recoverable forced, and terminal forced outcomes.
- [x] 1.4 Extend Assistant Workspace tests for disabled cancelling controls and transcript/non-transcript DOM identity isolation.

## 2. Shared Interrupt Contract

- [x] 2.1 Add the shared prompt interruption state DTO and expose it through Chat and Skills projections.
- [x] 2.2 Clarify adapter cancellation dispatch semantics, rename the low-level client notification API, and reject missing live connections.
- [x] 2.3 Remove local `cancelRequested` prompt-result inference and add the shared bounded settlement watchdog primitive.

## 3. ACP Chat Lifecycle

- [x] 3.1 Replace optimistic cancellation fields with a generation-guarded active prompt lifecycle owned by `AcpSessionManager`.
- [x] 3.2 Keep protocol-permitted trailing updates attached to the active turn and settle confirmed/unconfirmed outcomes from the real prompt response.
- [x] 3.3 Implement the 10-second conversation-scoped force-close path and preserve existing reconnect fallback behavior.

## 4. ACP Skills Lifecycle

- [x] 4.1 Make the orchestrator the single owner of live and recovered interrupt transitions and durable events.
- [x] 4.2 Implement confirmed and unconfirmed prompt settlement without masking the backend result.
- [x] 4.3 Implement recovery-aware force-close cleanup and protect forced state from stale outer completion paths.

## 5. UI and Validation

- [x] 5.1 Project localized requested/confirmed/forced/unconfirmed states and disable repeated prompt actions while requested.
- [x] 5.2 Run focused ACP Chat, ACP Skills, wire, and UI regression suites and fix failures.
- [x] 5.3 Run TypeScript, lint, formatting, OpenSpec validation, and final change verification.
