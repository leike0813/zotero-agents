## Overview

The change separates ACP runtime state into three ownership tiers:

- Metadata record: small, persisted in the database and safe to hydrate for all
  runs/conversations.
- Runtime files: transcript, output revisions, continuation context, and final
  result under the run/conversation runtime directory.
- Live session handle: adapter, session id, active item ids, timeout, and
  activity timestamp only.

This keeps history, selected run details, and UI snapshots bounded while
preserving recovery and forensic data. Transcript display is either an explicit
asynchronous page load or an ephemeral live delta; it is not part of panel
snapshots.

## State Layout

- `<runtimeDir>/transcript.jsonl` for ACP Skills and
  `<conversationStorageDir>/transcript.jsonl` for ACP Chat are canonical
  transcript event logs. Events are append-only and support item upserts, text
  appends, patches, and deletes.
- The adjacent `transcript.index.json` is a rebuildable paging/index helper. It
  stores item order, latest item metadata, bounded previews, and event offsets
  so ordinary page reads only materialize the requested page.
- `<runtimeDir>/run-context.json` stores request, runner JSON, materialization,
  and continuation metadata needed after controller detach.
- `<runtimeDir>/output-revisions.jsonl` stores full validation candidates.
- `resultJsonPath` remains the final result JSON location.

The plugin run store payload, ACP Chat conversation request payload, and panel
snapshots keep only status, ids, paths, counts, revisions, timestamps, recovery
state, pending interaction previews, and bounded previews. They must not contain
transcript item arrays or output revision candidate text. Pending interactions
retain `candidatePreview` and `candidateRef` only; complete candidate text is
stored in `output-revisions.jsonl`.

ACP Chat no longer writes conversation items to `plugin_task_rows`. A
conversation request row stores only metadata plus transcript file references,
count, revision, event seq, and preview. Old ACP Chat DB transcript rows are not
migrated; local test data is reset.

Runtime context files are dirty-written: `run-context.json` is updated when the
request, runner, provider options, workspace/runtime refs, or materialization
refs change. Transcript chunks, usage, plan, and tool updates do not rewrite
the context file.

## Runtime Model

The registered controller is reduced to a live handle facade. It must not close
over prompt builders, materialization, shared skill catalogs, result objects, or
unbounded assistant text. When a reply needs workflow continuation, the runner
loads the required context from runtime files for that operation and releases it
after the operation completes.

Assistant chunks for the active prompt are appended to
`<runtimeDir>/turns/<turnId>.assistant.txt`. Convergence reads that turn file at
the prompt boundary; the controller keeps only the file handle state needed to
serialize appends.

`waiting_user` keeps the live handle only for 30 minutes. When the timer fires,
local connection resources are detached and the run remains recoverable.

## UI Paging And Live Deltas

ACP Skills and ACP Chat sidebar snapshots carry metadata only. When a run or
conversation is selected, the child panel sends a transcript page request with
id, cursor, and limit. The host reads the page asynchronously and sends the page
back to the child panel. The child panel owns a small page cache for the
currently selected run/conversation only and clears it on switch.

Live transcript updates are delivered through an ephemeral delta channel for the
currently selected run/conversation. The delta mirrors transcript JSONL
operations but is not a persistence truth source. When the UI is displaying the
tail page, a sequence gap, missing item, or overflow signal discards the current
cache and reloads the tail page from JSONL. When the UI is displaying a
historical page, new off-page items and missing-target deltas advance the known
revision without mutating the visible page or forcing a jump to the tail; if a
reload is required, the current page cursor is reloaded.

Delta batches are bounded by count and serialized size. Overflow is represented
as a lightweight `resyncRequired` sentinel that preserves target ids and event
sequence metadata while dropping item/text/patch payloads. ACP Chat and ACP
Skills use the same streaming convention: the first text chunk creates an
`upsert_item` containing that chunk, and subsequent chunks use `append_text`.
The live session still stores only active ids and bounded metadata; complete
text remains in JSONL.

## Test Data Reset

Old embedded payloads are not migrated for compatibility. Before validating v4
against the local Zotero test data root, the implementation takes a backup of
`state/zotero-agents.db`, clears ACP Skill run ledger/events, old
`skill_run_feedback` rows, and ACP Chat conversation/index/frontend rows, then
removes `runtime/acp/skill-runs`, `runtime/acp/chat/conversations`,
`runtime/acp/chat/runtime`, and legacy `runtime/acp/chat/workspaces`. Synthesis
data, backend configuration, and non-feedback workflow products are preserved.

## ACP Chat Cap

ACP Chat session manager tracks live adapters by backend/conversation, busy
state, and last activity. Before creating a new adapter, it evicts the least
recently active idle adapter if the global live count is already three. If all
three are busy, creation fails without mutating existing sessions. The live slot
keeps active transcript item ids and bounded metadata only; transcript text is
written to JSONL and delivered to UI through deltas.
