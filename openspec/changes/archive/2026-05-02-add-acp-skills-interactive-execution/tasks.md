# Tasks

- [x] Extend ACP skill run store with conversation/apply state and reply/end controller APIs.
- [x] Rework ACP SkillRunner orchestrator to reuse a single ACP session and keep successful sessions alive.
- [x] Wire ACP skill run reply/end actions through standalone and unified sidebar bridges.
- [x] Enable ACP Skills reply composer based on conversation state and show task/conversation status separately.
- [x] Mark apply success/failure back onto ACP skill run records.
- [x] Add/update core and UI smoke tests.
- [x] Run OpenSpec validation, targeted tests, and TypeScript check.
- [x] Fix ACP Skills output convergence to use assistant turn JSON (`__SKILL_DONE__`) and runner-generated `result/result.json`.
- [x] Align interactive execution spec with recovery-aware continuation guard semantics.
