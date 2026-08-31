---
status: accepted
date: 2026-08-28
decision-ticket: https://github.com/leike0813/zotero-agents/issues/25
---

# Keep Pi observability as projections over owned facts

The Built-in Pi Agent Runtime publishes observability through three narrow Interfaces: durable semantic facts in the Pi Agent Transcript, compact owner projections in owner records, and bounded diagnostic evidence in Runtime Audit Tiers. It has no overall progress contract and no universal observability event; each Interface shares stable identity semantics without sharing one extensible payload.

Usage and cost reuse Pi's existing `Usage` semantics and calculation. Each Pi Model Invocation is recorded independently, while turn and owner totals remain rebuildable projections; a small outer accounting state distinguishes complete, partial, unknown and inapplicable observations without reimplementing Pi's token or cost logic.

Failures use a project-owned structured core with stable category, origin, code, retryability and effect certainty. Process-specific phases remain in the modules that own those processes, a failure does not decide an owner terminal outcome, and user-visible recovery actions are computed from durable owner state rather than inferred by the UI.

Runtime audit evidence never duplicates prompts, literature content, tool payload bodies, credentials or absolute user paths. Audit remains bounded and best-effort, reports evidence gaps, and supports on-demand diagnostic export through references to canonical facts; health diagnostics are passive unless the user explicitly authorizes an active probe.

## Consequences

- Pi SDK objects do not become durable transcript types; persistence validates a project-owned snapshot with Pi's field shape and semantics.
- `state_unknown` and `recovery_required` remain effect/recovery states rather than failure-cause categories.
- Debug detail increases structural evidence, not the amount of private semantic content copied into audit files.
- Already sealed success cannot be downgraded by projection, notification, audit or cleanup failures.
