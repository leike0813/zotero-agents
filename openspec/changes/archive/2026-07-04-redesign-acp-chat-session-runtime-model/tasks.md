## 1. OpenSpec Contracts

- [x] Update ACP Chat session management deltas for session-owned runtime and independent session actions.
- [x] Update transcript and remote restore deltas for session-scoped mirrors and remote session ids.

## 2. Runtime Model

- [x] Convert ACP Chat runtime slots from backend-keyed to `backendId + conversationId` keyed.
- [x] Make foreground selection independent from runtime connection state.
- [x] Route connect, disconnect, prompt, cancel, auth, permission, mode/model/reasoning to explicit sessions.
- [x] Preserve connected/prompting and foreground mirrors; release only idle non-foreground mirrors.
- [x] Preserve hard live adapter cap with idle-session eviction and busy rejection.

## 3. Host and Front-End

- [x] Include `backendId + conversationId` in ACP Chat host actions and drawer/banner payloads.
- [x] Keep New, switch, and disconnect enabled while other sessions are prompting.
- [x] Project drawer row status from session runtimes and persisted summaries.
- [x] Prevent user-initiated disconnect from surfacing as an error alert.

## 4. Tests and Validation

- [x] Update ACP Chat session manager tests for independent sessions, mirror lifecycle, cap behavior, remote restore, and archive rules.
- [x] Update UI smoke tests for session-scoped action payloads and prompting-time controls.
- [x] Run OpenSpec validation, targeted tests, typecheck, and lint.
