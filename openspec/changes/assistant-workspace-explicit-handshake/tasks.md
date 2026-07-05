## 1. OpenSpec

- [x] 1.1 Create proposal, design, tasks, and delta spec for explicit workspace handshake.

## 2. Host Handshake

- [x] 2.1 Add host shell handshake scheduling, tick, ack, duplicate, and clear behavior with DEBUG diagnostics.
- [x] 2.2 Make shell ready acceptance idempotent and stop the handshake after acknowledgement.

## 3. Shell Ready and Child Replay

- [x] 3.1 Add shell-side ready retry that requires direct bridge acknowledgement.
- [x] 3.2 Add cached child payload replay retry without fabricating child ready.

## 4. Tests and Verification

- [x] 4.1 Add smoke coverage for shell ready retry, child payload replay, and idempotent ready handling.
- [x] 4.2 Run OpenSpec validation, workspace/UI smoke tests, TypeScript, and touched-file formatting checks.
