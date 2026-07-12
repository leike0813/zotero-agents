## 1. Observer Regression Coverage

- [x] 1.1 Extend waiting-auth observer tests for canonical exit gating, single foreground handoff, and owner/timer cleanup.
- [x] 1.2 Preserve the foreground-continuation ownership guard and prohibit legacy global session-sync restart.

## 2. Waiting Auth Observation

- [x] 2.1 Implement a serialized 1500ms owner-scoped waiting-auth watchdog in the run dialog.
- [x] 2.2 Gate automatic handoff on canonical job status and route the exit through the existing foreground continuation exactly once.
- [x] 2.3 Keep pending/auth/history refresh active while waiting and clean up the watchdog at every owner or terminal boundary.

## 3. Auth Interaction Parity

- [x] 3.1 Add focused model/bridge tests for composer visibility, auth URL/code projection, and canonical method-selection payloads.
- [x] 3.2 Project core auth diagnostics and gate reply availability by challenge input capability.
- [x] 3.3 Normalize method options and allow selection without an auth session id while requiring it for challenge submission.

## 4. Rendering Stability And Validation

- [x] 4.1 Add a DOM identity regression proving auth-only refreshes do not rebuild unchanged shared managed regions.
- [x] 4.2 Run focused tests, SSOT invariants, TypeScript, lint checks, and strict OpenSpec validation.

## 5. Full Auth Control Parity

- [x] 5.1 Replace hidden waiting-auth composers with persistent disabled controls and cover live DOM identity.
- [x] 5.2 Project and render auth hints, external links, challenge-specific reply labels, and method-action state without exposing auth session, engine, or provider.
- [x] 5.3 Complete auth-file import rendering, validation, progress, and recoverable errors while excluding custom-provider forms.
- [x] 5.4 Add owner-validated external URL opening through the Zotero host.

## 6. Second-Round Validation

- [x] 6.1 Extend model, renderer, bridge, localization, and host-action regression coverage.
- [x] 6.2 Run focused tests, localization governance, SSOT invariants, TypeScript, lint checks, and strict OpenSpec validation.

## 7. Auth Prompt Regression Fixes

- [x] 7.1 Preserve pending-auth controls across sparse auth-session refreshes and add a real-chain URL regression test.
- [x] 7.2 Remove the duplicate fixed auth summary while preserving backend prompts, then run focused and strict validation.
