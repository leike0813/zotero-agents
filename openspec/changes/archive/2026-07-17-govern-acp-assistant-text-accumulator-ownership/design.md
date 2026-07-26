## Context

`acpExecutionProgress` currently combines message-count/open-segment tracking with an unbounded `terminalCandidateChunks` collection. ACP Chat consumes that collection only when a prompt settles in silent mode, while ACP Skills feeds the same assistant chunks through execution progress even though its orchestrator already owns the prompt-local text required for output convergence. Visible transcript projection can retain a third representation.

The release constraint is semantic preservation: transcript formats, display-mode projection, ACP Skills output convergence, repair/recovery, and cancellation behavior must not change.

## Goals / Non-Goals

**Goals:**

- Remove assistant bodies from shared execution progress state and snapshots.
- Give ACP Chat silent terminal projection an explicit owner-scoped, prompt-local collector.
- Leave ACP Skills with exactly its existing business accumulator.
- Preserve the existing protocol-level assistant segment boundary classifier and user-visible behavior.

**Non-Goals:**

- Adding byte/chunk limits, truncation, spill-to-disk, or new failure semantics.
- Changing transcript JSONL/index schemas, persistence cadence, profiler metrics, or UI publication behavior.
- Changing forced-interrupt projection or ACP Skills orchestration behavior.

## Decisions

1. **Keep execution progress text-free.** Its state retains message counts and `openSegment`; its change result retains only count and segment-closure signals. This removes the duplicate Skills retention and keeps snapshots bounded by count metadata.

2. **Use a Chat-specific collector rather than a shared Chat/Skills accumulator.** The Chat collector owns the final assistant segment after the latest hard boundary, whereas Skills owns the full prompt output across process activity. Sharing a domain accumulator would hide this semantic difference and expand the regression surface.

3. **Reuse `classifyAcpTranscriptSemanticUpdate`.** Consecutive assistant chunks append, soft side channels preserve the candidate, terminal boundaries preserve it for settlement, and thought/tool/plan/user/turn boundaries discard it. No backend-specific conditions are introduced.

4. **Make display-mode transitions explicit lifecycle boundaries.** Entering silent resets the collector after sealing visible text, so previously persisted live text cannot be emitted again. Leaving silent discards the collector, preserving the existing no-backfill contract.

5. **Do not modify the Skills orchestrator accumulator.** Removing text from execution progress is sufficient to eliminate its duplicate retention. Existing output convergence, profiler gauges, recovery, and repair paths remain byte-for-byte outside this change.

## Risks / Trade-offs

- **Risk: silent final assistant output is lost during ownership transfer.** → Preserve success/error settlement tests before removing the old candidate API, then route those paths through the Chat collector.
- **Risk: boundary behavior diverges between progress counts and Chat collection.** → Both continue to consume the same shared semantic classifier; table-driven tests lock soft and hard boundary behavior.
- **Risk: a cleanup path retains stale candidate text.** → Reset at prompt start and mode entry; discard on mode exit, forced stop, disconnect, runtime reset, and non-silent settlement.
- **Trade-off: legitimate single-owner output remains unbounded.** → Accepted for this change because enforcing limits changes business success semantics and requires a separate production baseline.

## Migration Plan

No persisted-data migration is required. The change is an internal runtime-state refactor. Rollback consists of reverting the source and delta specs; transcript data remains compatible in both directions.

## Open Questions

None.
