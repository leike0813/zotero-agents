## Context

ACP Chat and ACP Skills receive assistant output as incremental ACP
`agent_message_chunk`, `agent_thought_chunk`, and related session updates. The
existing UI already coalesces some updates, but low-performance machines can
still become sluggish when every text chunk causes the Assistant Workspace
conversation window to refresh.

The desired behavior is a user-controlled rendering policy:

- streaming render enabled by default for the current responsive experience;
- streaming render disabled for low-performance machines;
- backend streaming, transcript accumulation, output validation, and final
  persistence remain unchanged.

SkillRunner is outside this design because the managed SkillRunner sidebar does
not use the ACP text chunk rendering path.

## Goals / Non-Goals

**Goals:**

- Add one global preference for ACP streaming render behavior.
- Expose the same state from Preferences, ACP Chat, and ACP Skills.
- Suppress text chunk UI refreshes when disabled while keeping transcript data
  complete.
- Refresh visible ACP transcripts at locally observable message boundaries.
- Keep the shared Assistant panel model as the UI control source.

**Non-Goals:**

- Do not change ACP transport or request wire shape.
- Do not require any ACP backend to stop sending streamed output.
- Do not add a per-backend, per-conversation, or per-run setting.
- Do not add a SkillRunner toolbar switch or change SkillRunner behavior.
- Do not change workflow result validation, apply, or recovery contracts.

## Decisions

### Decision 1: Use a global preference helper as the state source

The preference key is `assistantStreamingRenderEnabled`, defaulting to `true`.
A small module owns reads, writes, and in-process subscriptions. Preferences UI,
ACP Chat, ACP Skills, and runtime chunk handling use this helper instead of
duplicating pref-key logic.

Rationale:

- keeps the preference state as a single source of truth;
- lets open Preferences and Assistant Workspace surfaces update each other;
- avoids panel-specific state drift.

### Decision 2: Inject the state into ACP panel snapshots

The Assistant Workspace host adds `streamingRenderEnabled` to ACP Chat and ACP
Skills snapshots before posting them to child frames. The shared Assistant panel
model reads this snapshot field and adds a managed toolbar switch action for
ACP Chat and ACP Skills only.

Rationale:

- child panels remain driven by their existing snapshot flow;
- SkillRunner snapshots remain unchanged;
- the shared managed toolbar renders the control consistently across ACP panels.

### Decision 3: Render the switch through the shared panel renderer

Toolbar actions support a `kind: "switch"` action. The shared renderer maps it
to a button with `role="switch"`, `aria-checked`, a right-aligned layout marker,
and visual on/off states. Enabled uses a green track; disabled uses a red track.

Rationale:

- avoids duplicating custom controls in ACP Chat and ACP Skills pages;
- keeps accessibility metadata with the control;
- preserves existing button actions for Sessions, Details, and Manage Backends.

### Decision 4: Suppress only pure text chunk UI refreshes

When streaming render is disabled:

- ACP Chat still appends text and thought chunks to the active in-memory item;
- ACP Skills still appends text and thought chunks to the selected run record;
- pure text chunk updates do not notify the sidebar transcript renderer;
- non-text events such as tool, plan, permission, diagnostics, error, prompt
  completion, or prompt cancellation still refresh normally.

Rationale:

- text chunk rendering is the high-frequency UI cost;
- non-text events are important state boundaries and should remain visible;
- final transcript data stays complete even while intermediate renders are
  suppressed.

### Decision 5: Use local observable boundaries for complete-message refresh

ACP currently exposes text chunks but not a dedicated `message_complete`
notification. The implementation therefore treats local observable boundaries as
message completion points:

- transition from text streaming to a non-text event;
- prompt completion;
- prompt failure or cancellation;
- explicit completion/error marking of open streaming transcript items.

Rationale:

- matches the current ACP event contract;
- avoids inventing backend-specific protocol extensions;
- leaves a clear path to use a future explicit message-complete event if ACP
  exposes one.

## Risks / Trade-offs

- Users may see less immediate text progress when the switch is off. This is an
  intentional performance trade-off and the default remains enabled.
- Some non-text events may still refresh the panel during an active prompt. This
  keeps important lifecycle feedback visible and avoids hiding tool/permission
  state.
- ACP Chat and ACP Skills share one global setting. This is simpler and avoids
  ambiguous mixed behavior across open Assistant Workspace panels.
- Because the boundary is inferred locally, a backend that emits very long text
  without any non-text event will show the full message at prompt completion.

## Verification Plan

1. Validate the archived OpenSpec change with strict validation.
2. Verify ACP Chat with many text chunks:
   - enabled preserves existing throttled streaming behavior;
   - disabled suppresses intermediate streaming assistant snapshots;
   - final assistant transcript text is complete and persisted.
3. Verify ACP Skills with text chunks:
   - disabled suppresses chunk notifications;
   - a tool boundary refreshes the panel;
   - the assistant message is complete and followed by the tool row.
4. Verify shared toolbar switch rendering:
   - `role="switch"` and `aria-checked` are set;
   - right-aligned marker is present;
   - clicking emits `set-streaming-render-enabled` with the next state.
5. Verify localization parity and formatting for all locale files.
