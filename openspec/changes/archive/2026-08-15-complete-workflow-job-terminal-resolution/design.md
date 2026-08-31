## Context

`terminalResolution.ts` now owns terminal classification, but `runSeam.ts` still duplicates request identity derivation and store reads inside `observeWorkflowRunTerminal` to feed the submission-slot coordinator. The duplicated sampler uses unit-level `requestKind`/`backendType`, while the resolver uses per-job facts. The two reads happen in the same observation pass and can diverge.

## Goals / Non-Goals

**Goals:**

- Make one resolver call return everything read-only observation owes both seams.
- Use per-job request kind and backend facts for slot sampling.
- Preserve the current slot action precedence byte-for-byte.
- Test slot derivation at the resolver and slot action mapping at the run seam.

**Non-Goals:**

- Moving slot yield/resume policy, subscriptions, or lifecycle writes into the resolver.
- Merging sequence, SkillRunner, or ACP persistence ownership.
- Changing provider status vocabularies, store schemas, or the slot coordinator interface.
- Revisiting when `running`/`repairing` reacquire a yielded slot.

## Decisions

### Enrich the existing resolver instead of adding a second one

Every `WorkflowJobTerminalResolution` branch carries `slotStatus`. The run and apply seams keep injecting the same resolver function; the apply seam ignores the new field. A separate slot resolver was rejected because it would preserve the two-reader drift.

### One normalized slot vocabulary

`slotStatus` is one of `missing`, `unobserved`, `queued`, `running`, `waiting_user`, `waiting_auth`, `failed_retriable`, `repairing`, `succeeded`, `failed`, or `canceled`. Backend canonical paths return `unobserved` when no record resolves, matching the legacy empty-string sampling exactly. The run seam maps only the statuses it acts on; the rest pass through harmlessly.

### Canonical terminal outcomes own slot status

A `canonical-ready` classification sets `slotStatus` from the terminal outcome so a failed sequence root without a materialized step never reports a contradictory running job state.

Pending and local-ready classifications sample the same canonical records as terminal interpretation. Backend canonical paths with no record return `unobserved`; local job state remains the fallback only for paths that previously used it. This preserves the edge where a locally succeeded non-deferred job still has a canonical `waiting_user` record: the apply seam is locally ready while the slot coordinator still yields.

### Sequence state resolves identity, not slot status

For a non-terminal sequence root, the resolver reads the last materialized step request identity and then its canonical record. If no step identity or record exists, the local job state is the fallback; sequence statuses such as `continuing` are not projected into the slot vocabulary.

### Run seam consumes one pass

`check()` maps each job to one resolver projection, collects `slotStatus` values, applies the unchanged yield/reacquire precedence, then settles when no projection is `pending`. Store imports used only by the old inline sampler are removed from the run seam.

## Risks / Trade-offs

- [Resolver reads more per call] -> Reads stay in one synchronous pass and only add the record lookup the run seam already performed; pending non-terminal sequences may read the last-step record earlier than before.
- [Full slot vocabulary grows the return type] -> The run seam keeps the action filter, and tests pin the complete vocabulary at the resolver.
- [Local-ready plus canonical waiting_user] -> Deliberately keeps slot sampling canonical-first; resolver tests pin the edge so it cannot regress silently.
- [Private observer tests depended on inline imports] -> Run-seam slot tests now inject the resolver, keeping observer behavior isolated from store setup.

## Migration Plan

No data migration. Add resolver slot-status tests, update existing resolver expectations, implement the enriched projection, remove the run-seam inline sampler, add injected slot-action tests, then update `CONTEXT.md`, architecture documentation, and the OpenSpec. Rollback is a source revert; persisted records are untouched.
