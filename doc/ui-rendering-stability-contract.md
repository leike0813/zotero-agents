# UI Rendering Stability Contract

This plugin has several live UI surfaces backed by snapshots, polling, worker
progress, and streaming backend events. These surfaces must preserve user
interaction state during background updates.

## Core Rule

High-frequency updates must patch only the region they own. They must not
rebuild the main content area that the user is reading or manipulating.

Separate every live UI surface into three state classes:

- **Content state**: rows, cards, graph nodes, transcript items, form schema, and
  other data that changes the main content.
- **Chrome/status state**: task progress, action feedback, busy state, status
  bars, badges, and popovers.
- **Transient interaction state**: scroll positions, focus, selection, expanded
  details, drawer state, canvas camera, drag position, and local drafts.

Content state may trigger a section render. Chrome/status state may only update
the status area or the specific control it owns. Transient interaction state
must be owned locally or restored by stable keys.

## Prohibited Patterns

- Using a full `JSON.stringify(snapshot)` comparison to decide whether to
  rebuild a content pane.
- Running `clear(root)`, `root.innerHTML = ""`, `replaceChildren()`, or canvas
  teardown from a polling, heartbeat, streaming, or background-job update path.
- Destroying graph/canvas renderers from a generic shell render when graph data
  has not changed.
- Restoring scroll by DOM index instead of a stable `data-*` key.
- Rebuilding reply boxes, details drawers, tables, or graph canvases because a
  statusbar, progress row, or action receipt changed.

## Required Patterns

- Use page/tab/section-level content signatures that include only data that
  changes the rendered content.
- Use separate chrome/status signatures or explicit patch functions for status
  bars, task lists, and progress indicators.
- Assign stable keys to scrollable, expandable, focusable, and selectable
  elements.
- Preserve and restore at least:
  - scroll position for stable scroll containers,
  - focused control and text selection,
  - `details[open]`,
  - drawer open/closed state,
  - canvas/graph camera state.
- Prefer patching an existing DOM region over rebuilding the whole shell.

## Current Application

- Synthesis Workbench uses content signatures for the active tab and a separate
  chrome signature for action/background job status.
- Workspace shell keeps Dashboard and Synthesis mounts alive and toggles
  visibility instead of replacing iframes.
- Assistant surfaces must keep reply textareas, transcript scroll, and details
  drawers stable across unrelated status snapshots.

