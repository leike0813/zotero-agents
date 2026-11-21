# Design

## Context

Production client operations distinguish request deadlines from the work owned by an accepted public maintenance receipt. Retrieval already commits sources atomically and retains compatible staging.

## Goals / Non-Goals

Keep an accepted retrieval build, rebuild or update running across the old deadline. Make the receipt visible again when a Workbench opens. Preserve bounded I/O and other maintenance policies.

## Decisions

- Use an explicit null work deadline for the three retrieval routes. Preserve numeric values when decoding historical receipts and use the current policy on explicit retry or continue.
- Serialize retrieval maintenance at the durable operation owner. Treat an accepted idempotent duplicate as the same receipt.
- Keep the existing post-publication cleanup budget as a separate phase. Add the most relevant retrieval receipt to the state read so Workbench can observe it independently of command lifetime.

## Risks / Trade-offs

There is no estimated finish time during a long build. Progress is based on completed source groups. On process restart, existing explicit recovery classifications still apply.
