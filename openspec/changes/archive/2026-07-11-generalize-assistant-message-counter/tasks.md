## 1. Contract and regression tests

- [x] 1.1 Extend ACP execution-progress tests for Assistant, Thought, and Tool current/cumulative semantic counting.
- [x] 1.2 Extend ACP Chat and ACP Skills snapshot tests for all display modes, terminal retention, restart persistence, and legacy completeness.
- [x] 1.3 Extend SkillRunner model tests for canonical identities, final promotion, user execution boundaries, and persistence.
- [x] 1.4 Extend shared UI smoke tests for counter placement, localization, and managed-region DOM identity.

## 2. Shared count state

- [x] 2.1 Add the shared message-count DTO, normalization, begin/finish lifecycle, semantic segment tracking, and persistence helpers.
- [x] 2.2 Update ACP semantic progress handling to count all three categories before display-mode projection without increasing chunk publication.

## 3. ACP owner integration

- [x] 3.1 Persist and restore conversation-scoped counts for ACP Chat while resetting current counts only for user prompts.
- [x] 3.2 Persist and restore run-scoped counts for ACP Skills while preserving the same current execution across automatic repair/retry.
- [x] 3.3 Project complete and legacy count DTOs into ACP Chat and ACP Skills panel snapshots independently of transcript pages.

## 4. SkillRunner integration

- [x] 4.1 Normalize Assistant replacement and Thought/Tool identities and count semantic entries once across history/SSE merges.
- [x] 4.2 Persist terminal SkillRunner counts and restore them for local and remote task owners.
- [x] 4.3 Reset SkillRunner current counts only for user-originated runs or explicit retries.

## 5. Shared UI and localization

- [x] 5.1 Add the independent message-counter panel model, renderer, region signature, and compact shared styling.
- [x] 5.2 Wire ACP Chat, ACP Skills, and SkillRunner panels to the counter region and remove transcript-owned progress rendering/signatures.
- [x] 5.3 Add Fluent-backed Assistant labels across supported locales and use the label for canonical Assistant message metadata.

## 6. Validation

- [x] 6.1 Run focused core/UI tests and fix regressions.
- [x] 6.2 Run TypeScript, localization governance, lint, and strict OpenSpec validation.

## 7. Counter layout and visibility regression

- [x] 7.1 Add regression tests for the four-row shell layout and count-only child snapshots.
- [x] 7.2 Assign toolbar, banner, counter, and mutually exclusive main/empty content to explicit shared grid areas.
- [x] 7.3 Route counter updates through the shared region guard before child-level chrome early returns.
- [x] 7.4 Re-run focused tests and static validation.
