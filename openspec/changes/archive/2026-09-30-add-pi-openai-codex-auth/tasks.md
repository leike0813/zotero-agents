# Tasks

## 1. Device authorization and credentials

- [x] 1.1 Add a failing device-flow behavior test, implement start/poll/exchange/cancel in `piOpenAICodexAuth.ts`, and pass the targeted Node test.
- [x] 1.2 Add a failing refresh/logout race test, implement revision-checked rotation in `piCredentialStore.ts`, and pass the targeted Node test.

## 2. Provider execution

- [x] 2.1 Add a failing Codex stream/redaction test, generalize the C04 model source and preserve its API-key cases, and pass the targeted Node tests.
- [x] 2.2 Add a real-Zotero fixture canary, admit it to the existing runner, and pass the targeted Zotero core test and browser build check.

## 3. Backend Manager

- [x] 3.1 Add a failing request-bound page behavior test, implement typed connect/cancel/reconnect/disconnect actions and transient code display, and pass the dashboard test.
- [x] 3.2 Extend the existing real-Zotero Backend Manager test for Codex controls, update locale and Backend Manager documentation, and pass the targeted Zotero UI test.

## 4. Integration and handoff

- [x] 4.1 Run relevant Node, Zotero, TypeScript, lint, build, and strict OpenSpec checks; record exact outcomes in `verification.md`.
- [x] 4.2 Complete the user-driven real-account login, stream, refresh, logout, and reconnect smoke with redacted evidence; record its outcome in `verification.md`.
- [x] 4.3 Update the living Pi handoff with verified C05 status and current workspace facts; sync and archive the verified OpenSpec change.
