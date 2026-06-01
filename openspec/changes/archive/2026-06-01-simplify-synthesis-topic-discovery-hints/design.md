## Context

Topic update has its own source-selection and workflow apply mechanism.
Discovery hints are lightweight nudges and must stay separate from freshness and
topic update consumption.

## Goals / Non-Goals

**Goals:**

- Keep discovery hint lifecycle simple: `open`, `rejected`, `superseded`.
- Preserve durable user rejection.
- Remove accept semantics from UI and service actions.
- Normalize legacy status values safely.

**Non-Goals:**

- No topic update source-selection implementation.
- No old-literature backscan on topic metadata changes.
- No full Workbench redesign.

## Decisions

- Legacy `filtered` maps to `rejected` because it suppresses resurfacing.
- Legacy `accepted` maps to `open` because acceptance no longer means the topic
  consumed the literature.
- Digest rerun, metadata hash drift, and Registry rebuild must not reopen
  rejected pairs.
- Restore/reset/force repair are the only reopen paths.

## Risks / Trade-offs

- Users may see previously accepted hints as open after migration. This is more
  honest than pretending the topic consumed them.
