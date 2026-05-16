# Design

## Shared Permission UI

`assistant-panel-renderer.js` remains the shared renderer for ACP Chat and ACP Skills permission prompts. The permission interaction renders:

- a compact one-line summary card;
- a `View full request` button that emits `open-permission-request`;
- full-width compact approval buttons.

The renderer builds a readable `permissionRequest` DTO from `interaction.permission`, parsing `detail` as JSON when possible and falling back to `toolTitle`, `summary`, `source`, and `requestedAt`.

## Permission Bottom Sheet

ACP Chat and ACP Skills page scripts store the last `permissionRequest` DTO in local UI state. `open-permission-request` opens a dedicated permission bottom sheet, not the generic details drawer. The bottom sheet shows source/tool, summary, request time, a code-style command/parameter preview capped by CSS and the DTO content limit, and the same permission action buttons.

The generic details drawer remains reserved for run details and diagnostics. Permission full-request review must not mutate the details drawer title or content.

## ACP Skills Transcript Projection

ACP Skills run store introduces `kind: "permission"` transcript items. Permission request and resolution events use the same `permissionRequestId`, so the transcript row updates in place instead of appending raw status rows.

Workspace activity stays a status item but carries `details.relativePath`. The transcript renderer displays it as a single file row: icon plus relative path.

Low-signal success statuses are no longer transcript-visible. Runtime logs still keep the full event history.
