## 1. Regression Coverage First

- [x] 1.1 Update shared contract, panel model, and wire-drift tests so current interaction DTO/actions contain no token and reject the removed field as an unknown key.
- [x] 1.2 Replace the synthetic sequential-reply test with a real interrupted-live continuation that reaches a second waiting turn and proves the next reply reaches the ACP adapter.
- [x] 1.3 Update ACP/SkillRunner option and file tests to cover canonical-state revalidation, request-scoped in-flight selection, and native SkillRunner interaction ids.

## 2. Remove the Token Entity

- [x] 2.1 Remove token fields and token-only live payload handling from shared contracts, publications, panel model, renderer, and child action routing.
- [x] 2.2 Remove ACP token derivation/validation and restore the pre-token reply state machine without a reply-state guard or new orchestrator transition.
- [x] 2.3 Remove token parameters from ACP file staging/submission and revalidate request waiting/upload state around the native picker.
- [x] 2.4 Remove SkillRunner token aliases while preserving current native interaction-id validation and backend requests.

## 3. Governance and Documentation

- [x] 3.1 Add “如无必要，勿增实体！” to the project-level `AGENTS.md`.
- [x] 3.2 Update the Assistant sidebar SSOT and current OpenSpec requirements to describe the preserved controller lifecycle without tokens or reply-state locks.

## 4. Validation

- [x] 4.1 Run focused tests 61/65/71/97/107/184/190.
- [x] 4.2 Run TypeScript, target ESLint/Prettier, SSOT/localization/help-doc governance, and `git diff --check`.
- [x] 4.3 Strict-validate the archived OpenSpec change and confirm no current implementation, documentation, or main spec still defines or requires `interactionToken`; tests and historical context may name the removed field only to reject or explain it.
