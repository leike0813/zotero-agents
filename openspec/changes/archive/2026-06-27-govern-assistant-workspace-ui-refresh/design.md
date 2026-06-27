## Context

The previous streaming render toggle suppressed direct text chunk UI emits, but
other live events such as usage updates, session metadata, diagnostics,
workspace activity, and SkillRunner store changes could still publish snapshots
that included partially accumulated transcript text. As a result, the UI could
continue rendering chunk-by-chunk through side channels.

## Goals

- Treat ACP Chat, ACP Skills, and SkillRunner as Assistant Workspace panels that
  use the same UI publish policy.
- Keep canonical state real-time and complete.
- Make UI-visible transcript state explicitly published instead of implicitly
  equal to canonical transcript state.
- Preserve natural backend streaming when enabled, with bounded non-transcript
  UI work.
- Use boundary-only transcript publishing when streaming render is disabled.

## Non-Goals

- Do not change backend streaming, ACP transport, SkillRunner REST semantics, or
  workflow output validation.
- Do not introduce per-backend, per-run, or per-conversation preferences.
- Do not redesign transcript item schemas or persisted history formats.

## Decisions

### Shared publish reasons

Introduce an internal publish reason model:

- `critical`: immediate UI publish for permission, error, waiting-user,
  cancellation/interruption, user actions, tab/panel selection, and preference
  changes.
- `boundary`: immediate transcript publish for completed/failed/cancelled turns
  and transcript structure boundaries such as a new tool, tool result, plan,
  workspace activity, or completed streaming item.
- `live`: live run update. Text/thought transcript chunks publish naturally
  when streaming render is enabled; metadata live updates are eligible for
  throttled publish.
- `background`: canonical state update only, merged into the next published
  snapshot.

Metadata live publish cadence is 160ms. The existing preference key
`assistantStreamingRenderEnabled` remains the single source of truth. Enabled
means natural transcript streaming scoped by transcript revisions, not whole
panel rerendering. Disabled means boundary-only text publishing while structural
transcript events remain immediate.

### UI-visible transcript state

Each runtime keeps canonical transcript state separately from the last published
UI transcript view. UI snapshots are built from the UI-visible view. Background
or metadata publishes must not leak partial text simply because canonical text
has advanced. Structural transcript events update the UI-visible view without
releasing unrelated held streaming text.

For ACP Chat this state belongs with the session slot. For ACP Skills it belongs
with the selected run store record or a per-run publish shadow. For SkillRunner
it belongs with the run workspace host snapshot state.

### Panel rendering

Panel snapshots carry a transcript render key or revision. Child pages call the
transcript renderer only when the transcript revision changes. Non-transcript
updates may still update toolbar, banner, details, drawer, or reply regions
without forcing transcript work.

### Switch scope

ACP Chat, ACP Skills, and SkillRunner all show the global switch. The switch and
Preferences checkbox read and write `assistantStreamingRenderEnabled`. The
persisted Zotero preference is the single source of truth; neither Assistant
Workspace nor the Preferences page may cache an independent authoritative
state. Open surfaces synchronize through the Zotero preference observer so a
change made in Preferences updates Assistant Workspace snapshots even when the
two surfaces run in different script contexts. Preferences checkbox activation
also submits through the plugin prefs event dispatcher so the main runtime can
apply the same setter immediately. The existing action name may remain
`set-streaming-render-enabled`.

## Risks

- If a runtime misclassifies a completion boundary as background, the visible
  transcript may lag until a later publish. Tests must cover turn completion,
  error, cancellation, permission, and waiting states.
- If child render keys are too broad, unrelated metadata can still rerender the
  transcript. Tests must assert transcript render suppression for metadata-only
  refreshes.
