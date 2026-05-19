# Design

## Refresh Boundary Model

Recurring snapshot renderers must distinguish structural changes from live
field changes. Structural changes may rebuild a keyed region; live field
changes update existing nodes in place. Active input value, caret, focus,
open custom-select state, and scroll position are live state and must not be
part of the structural signature.

The preferred pattern is:

- keep a persistent shell for long-lived surfaces;
- split the shell into keyed regions with stable signatures;
- update text, disabled state, counters, timestamps, and selected state in
  place when structure is unchanged;
- preserve active input and scroll state before unavoidable structural rebuilds;
- write a behavior-baseline test before changing any UI path with established
  button, disabled, drawer, selection, or submit behavior.

## Audit Table

| Surface | Refresh source | Current risk | Existing protection | Change |
| --- | --- | --- | --- | --- |
| Shared assistant reply | ACP Chat, ACP Skills, SkillRunner snapshots | Reply region can be cleared and textarea recreated | Draft/focus restoration in ACP Skills | Add reply structural signature and live-field updater |
| Assistant drawer | Task/session snapshots | Drawer rows can rebuild during interaction | Stable drawer signature already exists | Keep behavior locked by tests and avoid regressions |
| ACP Skills run page | All run snapshots and selected-run projection | Other run updates can affect selected composer | Per-run draft capture/restore | Make composer stable by selected reply context |
| Synthesis Workbench | Host `synthesis:snapshot` messages | Shell rebuild can replace search/filter inputs and reset scroll | None found for search/filter | Preserve active controls and scroll across refresh |
| Workflow settings dialog | Option/status/model refreshes | Root rebuild can replace edited fields and custom selects | Draft serialization model | Preserve active fields and custom select state |
| Dashboard main page | Task/backend refresh timers | Whole app rebuild can affect filters and scroll | Several scroll fast paths | Audit and harden active controls without layout changes |
| Dialog/tab host shells | iframe/browser initial mount | Mostly initial mount-only `innerHTML` resets | Host lifecycle | Record as low risk unless recurring refresh rebuilds active UI |

## Assistant Reply Stability

The shared assistant panel renderer owns composer DOM semantics. The reply
region gets a structural signature based only on reply context and control
shape: request/session key, interaction kind, enabled/disabled policy, busy or
interrupt action, footer control groups, and option button structure. Textarea
value, selection, and focus are live state.

If the structural signature is unchanged, the renderer updates placeholders,
disabled flags, button state, status text, and usage text in place. If focused,
the textarea value is not overwritten by a snapshot echo unless the reply
context changes. If not focused, the rendered value may be synced from the
model.

## ACP Skills Composer Isolation

ACP Skills continues to store per-run draft/focus state as a fallback, but the
normal path must preserve the selected run composer node. Updates for non-
selected runs may update drawer rows, tables, transcript metadata, and status
summaries, but they must not structurally rebuild the selected reply region.

Existing semantics stay intact: running or repairing runs disable text input
and expose interrupt/cancel affordances; waiting open-text runs enable text
reply when conversation is available; choice and permission prompts keep their
button-first interaction; terminal runs with available conversation can still
continue.

## Synthesis And Settings Surfaces

Synthesis Workbench and workflow settings are allowed to keep their current
hand-written DOM style. The change is to preserve active user state around
snapshot refreshes and to move high-churn subsections behind stable region
updates. Navigation, action names, empty states, error states, lifecycle
confirmation behavior, and form serialization remain unchanged.

## UI/UX Regression Guard

When behavior is uncertain, the current working behavior is the default
contract. Tests should lock observable behavior with structural assertions,
state flags, emitted actions, and key semantic fragments rather than exact
full copy, whitespace, DOM order beyond the contract, or broad snapshots.
