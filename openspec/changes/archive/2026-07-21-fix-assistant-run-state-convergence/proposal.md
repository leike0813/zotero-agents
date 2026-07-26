## Why

SkillRunner can advance backend message counts while the selected run transcript remains frozen until the user switches tasks. Initial queued runs may never attach the foreground chat stream, and a waiting-user reply can be rolled back by stale run-store or management state before the stream is rearmed. ACP Skills also allows backend-scoped runtime selections from one ACP backend to survive a backend switch; the settings control can display the target backend default while submitting the stale value. ACP drawer task cards currently hide status axes when nullable wire facts are absent, and ACP Chat falls back to an English-only Backend label.

## What Changes

- Make the selected SkillRunner observer the lifecycle owner for management status, pending state, history catch-up, and the foreground chat stream.
- Converge queued startup, waiting replies, disconnect recovery, transcript publication, and counters without task reselection.
- Reset backend-scoped provider options when the selected backend changes and keep displayed, collected, and submitted select values identical.
- Validate ACP mode, model, raw-model, and reasoning selections against the target backend and live session catalogs before persistence or transport.
- Project ACP Chat, ACP Skills, and SkillRunner task status through the shared status model while preserving nullable wire facts.
- Preserve persisted SkillRunner Backend and Apply facts on unselected sidebar cards through the lightweight run projection.
- Inject the shared localized drawer labels into ACP Chat and ACP Skills task drawers.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `task-dashboard-skillrunner-observe`: Require selected-run observer convergence and cursor-safe foreground chat recovery.
- `skillrunner-chat-display-contract`: Require live transcript publication without owner reselection.
- `workflow-settings-single-source-submit-flow`: Scope provider option retention to the selected backend and keep select display/submission values identical.
- `acp-skills-runtime-options`: Reject stale cross-backend runtime selections at UI, provider, run, session, and setter boundaries.
- `assistant-sidebar-ui`: Keep ACP task-card status axes source-aware and localized.

## Impact

- Affects SkillRunner run observation/publication and sidebar card materialization, workflow settings option projection, the shared Dashboard select, ACP Skills runtime-option normalization/application, and ACP drawer task presentation.
- Adds production-style long-lived SSE and cross-backend regression coverage.
- Does not change Assistant wire protocols, transcript storage formats, locale keys, dependencies, Skill-Runner server code, or release behavior.
