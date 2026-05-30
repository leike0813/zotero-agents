# Synthesis Workbench UI

Workbench UI is a DB-backed read model over committed Synthesis state. It should explain what is happening without exposing internal implementation churn.

## UI Read Path

- Home, Topics, Graph, Cleanup, Jobs, and option lists read from repository-backed snapshot state.
- Legacy JSON, canonical projections, and archived files must not appear as implicit fallback rows.
- Debug file inspection belongs in debug tools, not normal Workbench UI.

## Jobs and Statusbar

Jobs should show:

- submitted/queued/running/waiting/failed/completed state;
- source and label;
- determinate progress only when `current/total` or fixed phase count exists;
- indeterminate progress when work is real but total is unknown.

Do not invent percentages.

## Graph UI

- Show all library nodes by default.
- Show shared external nodes with incoming degree greater than 1.
- Keep single-degree external nodes hover-only by default.
- If graph structure exists but layout is missing/stale, show “drawing/refreshing layout” and trigger async layout.
- If graph structure is absent, show a clear rebuild-required empty state.

## Review and Overrides

Review & Overrides should be user-facing and compact:

- show durable decisions in one management entry point;
- allow user to remove or change decisions;
- show why a decision exists in human terms;
- avoid exposing raw hashes unless in debug mode.

Examples of manageable decisions:

- rejected discovery hint;
- confirmed reference-resolution suggestion;
- ignored cleanup proposal;
- user-confirmed merge/delete override.

Review queues should be bounded and batchable. If a rebuild detects a very large duplicate or reference-resolution candidate set, the UI should show an aggregate diagnostic with filters and bulk actions instead of rendering thousands of individual cards.

## Dangerous Actions

Dangerous actions require:

- visible warning copy;
- first confirmation dialog;
- exact typed confirmation phrase;
- backend confirmation validation;
- success/failure status update;
- snapshot refresh after success.
