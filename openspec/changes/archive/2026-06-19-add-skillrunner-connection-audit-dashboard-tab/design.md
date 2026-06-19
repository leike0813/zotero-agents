# Design: SkillRunner Connection Audit Dashboard Tab

## Dashboard Surface

The Dashboard adds a `skillrunner-connection-audit` tab only when debug mode is
enabled. The tab is read-only and renders the latest plugin-side governor
snapshot:

- active and queued counts
- backend and lane occupancy summaries
- timeout and late-settlement summaries
- foreground stream counts
- recent connection lifecycle events

The tab does not offer abort, retry, clear, cleanup, or mutation actions. It may
offer a copy-current-JSON action because that only reads the already-rendered
snapshot.

When debug mode is disabled, the tab key is not accepted by Dashboard tab
normalization. If a caller requests it, the Dashboard falls back to `home`.
Snapshot construction must not call `getSkillRunnerConnectionGovernorSnapshot`
unless debug mode is enabled and the selected tab is the audit tab.

## Governor Audit Model

The connection governor keeps a fixed-size in-memory ring buffer of redacted
metadata-only lifecycle events. Events include:

- `queued`
- `started`
- `finished`
- `timeout`
- `abort_requested`
- `aborted`
- `evicted_stream`
- `duplicate_stream_rejected`
- `late_resolve_after_timeout`
- `late_reject_after_timeout`

Each event records only connection metadata such as backend id, lane, request
id, operation label, timestamps, duration, timeout, reason, and error name. It
must not record request payloads, response bodies, parameters, tokens, local
paths, or backend result contents.

Timeouts release the governor slot as they do today. If the underlying task
settles after the governor already timed out or aborted it, the governor records
a late-settlement event. This is the diagnostic signal for suspected Gecko
connection retention after the plugin-side budget has been released.

## Host Bridge Debug Capability

`debug.skillrunner.connections.snapshot` returns the same redacted audit
snapshot. It is registered as a debug capability, so existing debug-mode gating
controls exposure and invocation.

## Performance Guard

The audit data path is opt-in by selected debug tab or debug capability. Normal
Dashboard refreshes, backend tabs, task lists, and runtime logs do not read or
derive connection audit data.
