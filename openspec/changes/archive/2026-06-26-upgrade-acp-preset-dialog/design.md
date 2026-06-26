## Design

ACP presets become a single host-owned source of truth for agent metadata and
profile materialization. Each preset describes its bare command, optional npx
package command, default `useNpx`, and optional isolation environment. A new
pure materializer builds the exact `BackendInstance` for a preset plus
`useNpx`/`isolated` options; Backend Manager preview and confirmation use this
same materializer.

Backend Manager's iframe owns the preset subwindow UI. The parent window keeps
duplicate detection and row creation authority: the iframe sends the chosen
preset options, the parent validates the preview backend id against the current
draft rows, then returns the finalized draft row. This preserves the existing
draft save flow and avoids persisting anything on cancel.

OpenCode's built-in backend is migrated to the bare command only when the
persisted row still matches the old automatic npx profile. User-edited
OpenCode profiles remain untouched.

## Non-Goals

- Do not rebuild generated help docs.
- Do not redesign manual ACP row editing or backend persistence.
- Do not add runtime command probing to the preset dialog.
