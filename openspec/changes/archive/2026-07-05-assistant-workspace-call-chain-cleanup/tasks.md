## 1. OpenSpec

- [x] 1.1 Create proposal, design, tasks, and delta spec for call chain cleanup.

## 2. Host Lifecycle Cleanup

- [x] 2.1 Make shell bridge installation idempotent and remove direct bridge install from workspace pulses.
- [x] 2.2 Make duplicate child ready first-ready only and clear ready state on real scope resets.

## 3. SkillRunner Cleanup

- [x] 3.1 Make SkillRunner sidebar attachment idempotent per shell frame window.
- [x] 3.2 Split latest SkillRunner base snapshot from decorated snapshot and make drawer chrome actions publish without runtime refresh.

## 4. Tests and Verification

- [x] 4.1 Add source/behavior smoke coverage for bridge idempotency, child-ready duplicate handling, SkillRunner attach idempotency, and drawer-only publish.
- [x] 4.2 Run OpenSpec validation, workspace/UI smoke tests, TypeScript, and touched-file formatting checks.
