# Design

## Notification Inbox Retention

The in-process notification inbox remains lightweight runtime state. It now prunes by two deterministic bounds: a maximum retained event count and a maximum event age. Pruning removes both the event and its deduplication key so repeated runtime projections cannot grow memory without bound.

## Diagnostic Redaction

Diagnostics remain agent-readable summaries, not raw backend payloads. Redaction covers complete URLs, local/private path prefixes, and common token or credential query forms before values are returned from diagnostics endpoints.

## Cache Invalidation Semantics

`synthesis cache invalidate` continues to accept only enum scopes for safe audit and approval prompts. The current implementation invalidates the default Synthesis service cache as a whole; response fields and documentation must describe that effect directly instead of implying scoped cache eviction.

## Semantic Governance

Current-state-only checks include the workflow operation profile semantic sources and their rendered copies. Terminology equality is a profile structure invariant and is checked once outside cron command validation.
