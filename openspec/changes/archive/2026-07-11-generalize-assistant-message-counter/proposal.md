## Why

The silent execution change introduced an Assistant-only progress count that is coupled to transcript rendering and disappears outside silent work. Users need one consistent, localized execution summary across Assistant panels and display modes without weakening transcript pagination or managed-region DOM identity guarantees.

## What Changes

- Replace the silent-only transcript progress node with a shared, independently rendered message counter between the banner and transcript regions.
- Show separate Assistant, Thought, and Tool counts as current user execution / selected owner cumulative totals across ACP Chat, ACP Skills, and SkillRunner in live, boundary, and silent modes.
- Count semantic protocol activity before display-mode suppression, persist owner summaries across terminal state and restart, and keep legacy owners honest by omitting unavailable cumulative totals.
- Localize the Assistant transcript role through the shared Fluent-backed label model.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `assistant-sidebar-ui`: Generalize the counter into a localized three-category managed panel region.
- `assistant-workspace-ui-refresh-governance`: Isolate counter updates from transcript and other managed-region renders.
- `acp-chat-performance-ui`: Define display-mode-independent semantic counting and current/cumulative execution semantics.
- `acp-chat-file-backed-transcript-state`: Persist conversation count summaries without changing transcript JSONL or index schemas.
- `acp-skill-run-file-backed-runtime-state`: Persist ACP Skills run count summaries independently of transcript projection.
- `acp-skillrunner-compatible-runner`: Preserve user-execution boundaries across automatic repair and retry activity.
- `skillrunner-sidebar-host-runtime`: Count normalized SkillRunner Assistant, Thought, and Tool entries with stable identities.

## Impact

The change affects shared Assistant panel DTOs and rendering, ACP Chat and ACP Skills execution progress and owner persistence, SkillRunner transcript normalization, Assistant localization resources, and focused core/UI tests. It adds no dependency, does not change transcript storage formats, and does not make full-mirror hydration a prerequisite for owner-first rendering.
