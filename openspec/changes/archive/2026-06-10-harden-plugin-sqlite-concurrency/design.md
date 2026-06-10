## Context

`pluginStateStore` and the Synthesis repository both open
`state/zotero-agents.db` through Zotero mozStorage. They can write different
tables in the same SQLite file during ACP startup, Synthesis background work, or
UI state persistence. The current adapters use `BEGIN IMMEDIATE` and statement
execution without a shared coordinator or retry path, so a short-lived writer
lock can fail the user-visible operation.

## Decision

Add an internal synchronous SQLite guard for Zotero mozStorage access. The guard
will cache one connection/coordinator per normalized DB path, configure
`PRAGMA busy_timeout=2500`, classify busy/locked failures, and retry guarded
operations up to three attempts.

The guard will also track transaction depth per DB path. If plugin code enters a
transaction while another guarded transaction is already active on the same
connection, the nested callback runs inside the outer transaction instead of
issuing a second `BEGIN IMMEDIATE`.

## Non-Goals

- Do not convert persistence APIs to Promise-returning async APIs.
- Do not split ACP and Synthesis state into separate SQLite files.
- Do not retry non-busy storage errors.

## Notes

This is a defensive runtime hardening layer. It does not claim full multi-process
transaction scheduling; it prevents plugin-owned same-process access from
failing immediately on transient busy windows and avoids nested transaction
misuse on the shared connection.
