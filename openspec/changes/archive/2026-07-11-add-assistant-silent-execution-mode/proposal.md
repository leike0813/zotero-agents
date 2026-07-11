## Why

The current global live-render preference only chooses between chunk-level and boundary-level UI publication; both modes still build and persist the full ACP transcript, and ACP Skills continues polling workspace activity. Long-running agent work therefore retains avoidable DOM, snapshot, transcript, index, and filesystem load even when the user only needs meaningful outcomes.

## What Changes

- Replace the global two-state live-render preference with `live`, `boundary`, and `silent` execution display modes shared by ACP Chat, ACP Skills, and SkillRunner.
- In `silent` mode, show an owner-scoped semantic assistant-message count while work is active, then show only user content, final assistant results, interaction-required states, and terminal outcomes.
- Prevent suppressed ACP Chat and ACP Skills assistant chunks, thoughts, tool calls, plans, ordinary process statuses, and workspace activity from entering transcript mirrors, JSONL, indexes, or chunk-level snapshot persistence.
- Stop ACP Skills workspace activity observation while `silent` mode is active.
- Preserve immediate permission, authentication, waiting-user, error, cancellation, and completion behavior, including the existing transcript-region and managed-region DOM identity invariants.
- Apply mode changes immediately without deleting existing history or backfilling content omitted while silent.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `assistant-sidebar-ui`: Replace the shared live-render switch and Preferences checkbox with one synchronized three-mode control and silent progress presentation.
- `assistant-workspace-ui-refresh-governance`: Define silent publication, progress-only transcript refreshes, mode transitions, and managed-region identity rules.
- `acp-chat-performance-ui`: Define semantic assistant-message counting and final-only ACP Chat/ACP Skills presentation in silent mode.
- `acp-chat-file-backed-transcript-state`: Prevent suppressed ACP Chat events from reaching transcript persistence and commit only the last terminal assistant segment.
- `acp-skill-run-file-backed-runtime-state`: Prevent suppressed ACP Skills events from reaching transcript persistence while retaining final output and critical interaction state.
- `acp-skillrunner-compatible-runner`: Define silent ACP Skills protocol projection and workspace-activity observation behavior without changing execution semantics.
- `skillrunner-sidebar-host-runtime`: Define final-only SkillRunner conversation projection and semantic message counting in silent mode.
- `background-refresh-governance`: Disable and safely resume ACP Skills workspace-activity timers according to the global mode.

## Impact

The change affects Assistant Workspace preference and publish policy, ACP transcript boundary projection, ACP Chat session state, ACP Skills run/transcript orchestration, SkillRunner conversation projection, shared panel controls and rendering, localization, and focused core/UI tests. Snapshot fields and child actions change from a boolean live-render contract to an execution-display-mode contract. Existing transcript JSONL/index formats, historical files, backend protocols, workflow manifests, output revision artifacts, dependencies, and detailed ACP audit ownership remain unchanged. The implementation builds on the existing owner-scoped buffered transcript writer rather than introducing another buffer or cache.
