## Context

SkillRunner backend jobs can outlive the Zotero plugin process. During plugin shutdown, the frontend network stack may fail local polling or fetch calls while the backend request keeps running and later reaches `succeeded`, `failed`, or `canceled`.

Current foreground settlement paths can collapse those local observer failures into terminal local failure. This is especially risky after a backend request id is known because startup recovery depends on persisted frontend state, not on broad backend run-list scanning.

## Goals / Non-Goals

**Goals:**

- Distinguish backend-confirmed terminal states from local observer failures.
- Keep recoverable SkillRunner requests non-terminal when local network/shutdown errors occur after a backend request id exists.
- Preserve existing recovery ownership: foreground continuation and recovery operate from projectable SkillRunner run records as SSOT.
- Keep true backend `failed` and `canceled` outcomes terminal.

**Non-Goals:**

- Do not add backend-wide run-list scanning as a recovery fallback.
- Do not solve the separate sequence step projection gap in this change unless it is required to prevent false terminal failure classification.
- Do not change backend API contracts or SkillRunner server behavior.

## Decisions

1. **Classify local observer failures separately from backend terminal failures.**

   Backend JSON status `failed` or `canceled` remains terminal. Local `NetworkError`, shutdown/disconnect errors, and comparable transport failures after a request id exists are treated as observer failures unless the backend response itself confirms a terminal failed/canceled state.

   Alternative considered: keep treating any thrown provider error as terminal. That preserves current simplicity but loses backend truth during shutdown and blocks recovery for still-running jobs.

2. **Use a recoverable non-terminal state instead of synthetic failed state.**

   When the frontend loses observation after a recoverable SkillRunner boundary, the local job/run state should remain active enough for recovery or foreground continuation. The implementation can log the observer failure and attach diagnostics, but it must not write terminal failed solely from that observer failure.

   Alternative considered: write failed and rely on recovery to query backend lists later. That violates the current SkillRunner run store SSOT and would hide projection bugs behind broad scanning.

3. **Keep recovery scan scope unchanged.**

   Recovery continues to operate on projectable SkillRunner run records. This change improves the correctness of what is written into that SSOT; it does not broaden recovery inputs.

   Alternative considered: scan sequence state or backend run lists. That may recover some bad states but creates another source of truth and makes projection regressions harder to see.

## Risks / Trade-offs

- **Risk:** Some genuine submit/upload failures after request creation may remain non-terminal longer than before.  
  **Mitigation:** Backend-confirmed `failed`/`canceled`, explicit client contract errors, and nonrecoverable submit failures can still become terminal when they are classified from authoritative evidence.

- **Risk:** Existing tests may encode the older pre-ready failure behavior.  
  **Mitigation:** Update tests to assert the new tolerance boundary by error class and request lifecycle evidence, not by full error text.

- **Risk:** Sequence step projection gaps can still prevent recovery even with terminal tolerance.  
  **Mitigation:** Keep that as an explicit follow-up investigation instead of changing recovery SSOT in this change.

## Migration Plan

No data migration is expected. Existing terminal failed records remain terminal; the change affects new foreground failure classification after implementation.

## Open Questions

- Whether the recoverable boundary should be any known backend request id, or only request id plus submit readiness. The current incident suggests request id alone needs tolerance during shutdown, but projection behavior still needs deeper investigation.
- Whether sequence step request-created projection should be made atomic with sequence state persistence in a separate change.
