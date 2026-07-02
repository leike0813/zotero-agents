## Overview

The change separates ACP Skill run state into three ownership tiers:

- Metadata record: small, persisted in plugin run store and safe to hydrate for
  all runs.
- Runtime files: transcript, output revisions, continuation context, and final
  result under the run runtime directory.
- Live session handle: adapter, session id, in-flight prompt state, timeout, and
  activity timestamp only.

This keeps history and UI snapshots bounded while preserving recovery and
forensic data.

## State Layout

- `<runtimeDir>/transcript.jsonl` is the canonical transcript event log.
- `<runtimeDir>/transcript.index.json` is a rebuildable paging/index helper.
- `<runtimeDir>/run-context.json` stores request, runner JSON, materialization,
  and continuation metadata needed after controller detach.
- `<runtimeDir>/output-revisions.jsonl` stores full validation candidates.
- `resultJsonPath` remains the final result JSON location.

The plugin run store payload keeps only status, ids, paths, counts, revisions,
timestamps, recovery state, and bounded previews.

## Runtime Model

The registered controller is reduced to a live handle facade. It must not close
over prompt builders, materialization, shared skill catalogs, result objects, or
unbounded assistant text. When a reply needs workflow continuation, the runner
loads the required context from runtime files for that operation and releases it
after the operation completes.

`waiting_user` keeps the live handle only for 30 minutes. When the timer fires,
local connection resources are detached and the run remains recoverable.

## Migration

Old run payloads are migrated lazily. When an embedded transcript, output
revision candidate, request payload, runner JSON, or result JSON is encountered,
the store writes the corresponding runtime files and persists a sanitized
metadata record. If migration cannot write files, the old payload is preserved
and a diagnostic event is recorded so the user can still inspect the run.

## ACP Chat Cap

ACP Chat session manager tracks live adapters by backend/conversation, busy
state, and last activity. Before creating a new adapter, it evicts the least
recently active idle adapter if the global live count is already three. If all
three are busy, creation fails without mutating existing sessions.
