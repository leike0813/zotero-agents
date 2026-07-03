# Design

## Chosen Model

ACP Skills uses a store-owned transcript mirror as the live authority for prompt-active and foreground selected runs. `queueTranscriptEvent()` folds each transcript event into the mirror synchronously, and the selected run panel snapshot carries the current `transcriptItems` directly to the front-end.

The JSONL transcript remains the durable source for cold runs, diagnostics, and restart recovery. It is not part of the real-time UI consistency path while a prompt is active.

The ACP Skills front-end no longer maintains its own transcript page/delta state. It renders `selectedRun.transcriptItems` from the latest snapshot, just as the pre-JSONL model did. The only change from the old direct model is that lifecycle-settled non-foreground runs can release their in-memory item mirror and later hydrate it from JSONL.

## Lifecycle

- Prompt active: keep the mirror.
- Prompt stopped but output convergence, apply, reply, recovery, permission, or connection work is still open: keep the mirror.
- Selected run: keep the mirror even after the prompt stops.
- Lifecycle settled and not selected: release transcript item mirror data and transient continuity metadata.
- Recovery or reply before new prompt output: hydrate the mirror from JSONL first, then append new events.
- Delete, clear, reset, archive cleanup: remove mirror state with the run.

## Snapshot Contract

Panel snapshots remain compact for run lists, but the selected run is the foreground view and includes its full `transcriptItems` array when the mirror is ready. Snapshot preparation must not wait for cold JSONL hydrate. It returns run state immediately with `selectedTranscript.state = "loading"` or `"failed"` when the selected mirror is not ready, and a later snapshot carries the hydrated transcript.

There is no ACP Skills transcript page, transcript delta, or resync protocol. Store snapshot delivery is the single UI update path.

## Persistence

Transcript events keep their JSONL representation. The store assigns the event sequence when updating the mirror, then queues the event for batched per-run persistence. A strong flush remains available for hydrate, shutdown, recovery, and tests.

Cold UI hydrate flushes only the selected run's transcript batch before reading JSONL. Global runtime file flush remains reserved for shutdown, recovery barriers, and tests.

## Rejected Approaches

The previous per-path read queue tried to make JSONL reads consistent while writes were still active. That still kept disk IO in the live rendering path and did not remove races between stale pages and live deltas. The live path is now memory-first.

Keeping page/delta on top of the mirror is also rejected. It recreates the split-brain state machine that the mirror was intended to remove.
