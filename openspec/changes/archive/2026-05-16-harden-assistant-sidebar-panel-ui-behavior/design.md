# Design: Assistant Sidebar Panel UI Hardening

## Decisions

The shared assistant panel renderer owns composer and drawer interaction semantics. Panel projectors provide state (`reply.inputEnabled`, `reply.action`, `reply.tone`) but should not duplicate DOM behavior.

Busy composer actions are interrupt actions, not destructive run cancellation. Explicit run cancellation remains available only through context actions such as `Cancel Run`.

Task ordering is stable by creation time. `updatedAt` remains visible metadata but must not drive drawer order.

## Composer Semantics

- Normal send state: text input enabled, blue primary `Send` button.
- Busy state: text input disabled, red `Cancel` button enabled.
- ACP Chat busy cancel calls the existing chat cancel action.
- ACP Skills busy cancel calls a new interrupt-current-turn action that delegates to the live controller cancel only for the current prompt and then records an interrupt event without marking the run canceled.
- SkillRunner busy composer follows the same visual rule where a prompt can be interrupted; waiting states remain reply-enabled.

## Drawer Semantics

Drawer overlays close only when the user clicks outside the drawer panel. All drawer panel clicks stop propagation, including section toggles, task rows, archive buttons, and close buttons.

Task rows can expose a warning LED when their state requires user attention: `waiting_user`, `waiting_auth`, or an active permission request.

## ACP Skills State Isolation

The ACP Skills frontend keeps draft/focus state by `requestId`. Snapshot refreshes must not clear drafts or steal focus from another run. Selecting another run switches to that run’s stored draft.

Completed ACP Skills runs can continue conversation. If a terminal run has an active reply or prompt state, the hint area must reflect the active turn instead of showing stale `Run completed`.

## Waiting Toasts

Waiting toasts are emitted when a task first enters `waiting_user`, `waiting_auth`, or permission-required state. The dedupe key is task/run id plus waiting state, so repeated snapshots do not create repeated toasts.
