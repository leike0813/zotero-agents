## Overview

The change separates ACP Skill run state into three ownership tiers:

- Metadata record: small, persisted in plugin run store and safe to hydrate for
  all runs.
- Runtime files: transcript, output revisions, continuation context, and final
  result under the run runtime directory.
- Live session handle: adapter, session id, in-flight prompt state, timeout, and
  activity timestamp only.

This keeps history, selected run details, and UI snapshots bounded while
preserving recovery and forensic data. Transcript display is an explicit
asynchronous page load, not part of the panel snapshot.

## State Layout

- `<runtimeDir>/transcript.jsonl` is the canonical transcript event log. Events
  are append-only and support item upserts, text appends, patches, and deletes.
- `<runtimeDir>/transcript.index.json` is a rebuildable paging/index helper. It
  stores item order, latest item metadata, and event offsets so ordinary page
  reads only materialize the requested page.
- `<runtimeDir>/run-context.json` stores request, runner JSON, materialization,
  and continuation metadata needed after controller detach.
- `<runtimeDir>/output-revisions.jsonl` stores full validation candidates.
- `resultJsonPath` remains the final result JSON location.

The plugin run store payload and ACP Skills panel snapshot keep only status,
ids, paths, counts, revisions, timestamps, recovery state, pending interaction
previews, and bounded previews. They must not contain transcript items or output
revision candidate text. Pending interactions retain `candidatePreview` and
`candidateRef` only; the complete candidate text is stored in
`output-revisions.jsonl`.

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

## UI Paging

ACP Skills sidebar snapshots carry metadata only. When a run is selected, the
child panel sends `load-transcript-page` with request id, cursor, and limit. The
host reads the page asynchronously and sends `acp-skill-run:transcript-page`
back to the child panel. The child panel owns a small page cache for the
currently selected run only, clears it on run switch, and refreshes the tail page
when the transcript revision changes while the user remains at the bottom.

## Test Data Reset

Old embedded payloads are not migrated for compatibility. Before validating v3
against the local Zotero test data root, the implementation takes a backup of
`state/zotero-agents.db`, clears ACP Skill run ledger/events and old
`skill_run_feedback` rows, and removes `runtime/acp/skill-runs`. Synthesis data,
ACP Chat history, and non-feedback workflow products are preserved.

## ACP Chat Cap

ACP Chat session manager tracks live adapters by backend/conversation, busy
state, and last activity. Before creating a new adapter, it evicts the least
recently active idle adapter if the global live count is already three. If all
three are busy, creation fails without mutating existing sessions.
