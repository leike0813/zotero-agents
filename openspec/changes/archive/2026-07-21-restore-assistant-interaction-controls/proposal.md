## Why

Assistant Workspace can receive `waiting_user` state without exposing the interaction controls needed to continue the run. ACP Skills publication drops structured `ui_hints`, while the SkillRunner quick-reply path emits a non-canonical action that the host silently ignores. File-request interactions are displayed but ACP has no governed staging path and SkillRunner has no capability-gated plugin client path.

## What Changes

- Define one bounded, validated Assistant pending-interaction DTO shared by ACP Skills and SkillRunner snapshots.
- Restore open-text, option, confirmation, and file-request controls with canonical owner/token-checked actions.
- Add ACP native-file selection, shallow workspace staging, privacy-safe manifesting, and shared continuation submission.
- Add a capability-gated SkillRunner file-reply client and multipart request shape while preserving a safe unsupported fallback for current backends.
- Preserve transcript/chrome render separation and region-level DOM identity guards.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `assistant-shell-interaction-bridge`: Define the shared pending-interaction DTO, bounded wire validation, canonical actions, and stale-interaction rejection.
- `acp-skills-interactive-execution`: Preserve ACP `ui_hints`, restore replies, and stage file replies into shallow managed workspace paths.
- `skillrunner-sidebar-host-runtime`: Restore canonical quick replies and expose capability-gated multipart file replies without changing the SkillRunner submodule.
- `assistant-workspace-publication-data-plane`: Publish structured interaction state without duplicating pending messages or leaking local file data.
- `assistant-workspace-ui-refresh-governance`: Keep interaction regions signature-guarded and independent from transcript-only updates.

## Impact

The change touches Assistant shared contracts and rendering, ACP Skills publication/orchestration/runtime prompts, SkillRunner run-dialog/handshake/management client integration, localized labels, and focused tests. It adds one ACP runtime prompt template and one host-side staging module. It does not modify `reference/Skill-Runner`, dependencies, persisted transcript formats, or backend database/event contracts.
