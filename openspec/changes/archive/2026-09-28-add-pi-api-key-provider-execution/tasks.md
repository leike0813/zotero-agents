# Tasks

## 1. Provider execution

- [x] 1.1 Add public-seam tests for selection, credentials, streaming, and keyless endpoints; confirm the targeted test is red.
- [x] 1.2 Implement the model source without ambient credential fallback and with Local Network preflight; confirm the targeted test is green.
- [x] 1.3 Add red failure/cancellation tests, preserve classified Provider codes through C01, and confirm both tests pass without native details.

## 2. Browser and UI

- [x] 2.1 Add a red exact-import build-guard test, install the production guard, and verify that test and browser build pass.
- [x] 2.2 Add red Backend Manager credential and connection-test behavior tests; implement typed wire, host actions, Preact controls, and labels; confirm targeted UI tests pass.

## 3. Integration

- [x] 3.1 Add a deterministic real-Zotero core Provider test and extend the existing Backend Manager UI test; confirm targeted Zotero core/UI cases pass.
- [x] 3.2 Update Backend Manager guidance and the living Pi handoff, including C09's archived status and C04 evidence; verify links and status.
- [x] 3.3 Run TypeScript, lint, build, relevant Node and Zotero gates, and official OpenSpec verification; record exact results.
