# ACP Skills Transcript Direct Rendering

## Summary

Move ACP Skills transcript rendering back to the direct snapshot model. The selected run snapshot carries `transcriptItems`, the front-end renders that array, and JSONL remains the durable cold-storage format behind the store-owned mirror.

## Problem

The current live mirror still keeps the old page/delta synchronization protocol. That means transcript truth is split across the store mirror, JSONL, the host delta queue, and front-end local transcript state. Missed deltas or stale page guards can leave the UI with a revision that claims to be current while the rendered items are incomplete.

## Goals

- Make `selectedRun.transcriptItems` the only ACP Skills transcript input consumed by the front-end.
- Keep JSONL persistence as durable storage and cold hydrate source.
- Keep full transcript mirrors for runs whose lifecycle is still open and for the selected foreground run.
- Remove ACP Skills `load-transcript-page`, `transcript-page`, and `transcript-delta` protocol paths.
- Batch JSONL writes so live rendering does not wait on per-chunk disk/index IO.
- Release only lifecycle-settled, non-foreground mirrors to bound memory.
- Hydrate a released mirror from JSONL before a recovered/replied run appends more transcript events.
- Do not block run state projection on cold transcript hydrate; show transcript loading state and update when hydrate completes.

## Non-Goals

- Rework ACP Chat transcript storage.
- Rework legacy SkillRunner transcript rendering.
- Preserve the removed ACP Skills page/delta wire protocol.
