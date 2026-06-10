# Design

## Refresh Model

The Workbench already tracks named surfaces and marks hidden surfaces dirty after
host commands complete. This change extends the invalidation map rather than
adding a new event bus:

- topic synthesis create/update invalidates `home`, `topics`, `graph`, and
  `review`;
- relation accept/reject and graph review actions invalidate `home`, `graph`,
  and `review`.

The current visible surface is reloaded immediately; hidden dirty surfaces reload
when selected.

## Review Page Topic Graph Rows

The Topic Graph Review tab becomes a ledger for graph relation state:

- relation edges with status other than `deleted` are rendered as edge rows;
- graph review items with status other than `deleted` are rendered as review
  item rows;
- pending rows expose their existing host commands;
- decided rows are visible but not actionable.

Rows are derived from the existing snapshot. No new storage shape or topic graph
service API is introduced.

## Graph Details Entry

The graph inspector reuses the existing `openTopicArtifact` host command for a
selected materialized topic. This keeps Topic Details loading host-owned and
consistent with the Topics page.

## Visual Weight

Topic graph SVG links keep the existing relation colors and dashed suggested
state, but use stronger stroke width and opacity so relation structure is visible
without changing the layout algorithm.
