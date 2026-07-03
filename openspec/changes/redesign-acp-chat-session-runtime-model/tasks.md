## 1. OpenSpec Contracts

- [ ] Update ACP Chat session management deltas for session-owned runtime and independent session actions.
- [ ] Update transcript and remote restore deltas for session-scoped mirrors and remote session ids.

## 2. Runtime Model

- [ ] Convert ACP Chat runtime slots from backend-keyed to `backendId + conversationId` keyed.
- [ ] Make foreground selection independent from runtime connection state.
- [ ] Route connect, disconnect, prompt, cancel, auth, permission, mode/model/reasoning to explicit sessions.
- [ ] Preserve connected/prompting and foreground mirrors; release only idle non-foreground mirrors.
- [ ] Preserve hard live adapter cap with idle-session eviction and busy rejection.

## 3. Host and Front-End

- [ ] Include `backendId + conversationId` in ACP Chat host actions and drawer/banner payloads.
- [ ] Keep New, switch, and disconnect enabled while other sessions are prompting.
- [ ] Project drawer row status from session runtimes and persisted summaries.
- [ ] Prevent user-initiated disconnect from surfacing as an error alert.

## 4. Tests and Validation

- [ ] Update ACP Chat session manager tests for independent sessions, mirror lifecycle, cap behavior, remote restore, and archive rules.
- [ ] Update UI smoke tests for session-scoped action payloads and prompting-time controls.
- [ ] Run OpenSpec validation, targeted tests, typecheck, and lint.
