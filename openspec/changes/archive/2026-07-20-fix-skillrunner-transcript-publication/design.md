## Context

Legacy SkillRunner keeps canonical backend events in `RunDialogEntry.session.messages` and separately caches the UI-visible transcript in `runWorkspaceState.publishedTranscriptMessages`. The receiver renders transcript only when `transcriptRevision` changes. A selected run is initially published with local submit notices; later history catch-up commonly publishes through the `critical` lane. The current live-mode eligibility accepts only a scalar `live` reason, so a critical refresh can cancel a queued live flush without advancing the transcript mirror.

HTTP history batches also lose the per-event semantic-boundary classification already applied to SSE events. This makes the scalar refresh reason an incomplete description of the pending work.

## Goals / Non-Goals

**Goals:**

- Publish every changed SkillRunner UI-visible transcript on the next eligible snapshot in live mode, even when the snapshot is immediate for a critical lifecycle reason.
- Preserve semantic boundaries across history catch-up and release boundary-mode content exactly once.
- Keep canonical history, UI-visible transcript, message counts, and receiver revision gating as separate responsibilities.
- Preserve every non-transcript managed-region DOM identity during transcript-only changes.

**Non-Goals:**

- Changing the SkillRunner backend protocol, snapshot wire schema, persistence, or history limits.
- Bypassing the receiver's transcript revision guard.
- Changing ACP Chat or ACP Skills publication behavior.
- Making boundary or silent mode expose content that their display policy suppresses.

## Decisions

### Make transcript eligibility mode-aware instead of reason-equality based

When the UI-visible transcript signature changes, live mode will publish it on any non-background snapshot. `critical` remains an immediate scheduling classification, but it no longer downgrades transcript eligibility. Boundary mode will still require an explicit or detected semantic boundary, and silent mode will retain its current critical/terminal projection.

This is preferred over treating every critical refresh as a transcript boundary, which would leak partial or tool-only content in boundary mode.

### Preserve history boundary classification until mirror publication

History merge will report whether it appended normalized entries and whether any appended entry satisfies `isSkillRunnerDisabledLivePublishBoundary`. The observer will store a pending boundary bit on the run entry. The bit is consumed only when the selected owner's published transcript mirror catches up, including owner initialization.

This reuses the SSE boundary SSOT and survives intervening metadata or critical snapshots without adding backend-specific event rules. It is preferred over updating every `syncHistory()` caller independently, which would duplicate reason-combination logic and risk missed call sites.

### Keep revision as the receiver contract

`transcriptRevision` will increment only when the published mirror signature changes. The receiver will continue to skip equal revisions; projector and renderer code will remain unchanged.

### Test the temporal production contract

The real snapshot harness will expose controlled history append and chronological capture waiting. Tests will assert the first snapshot that reflects new semantic counts also contains the corresponding eligible transcript content, preventing a later incidental refresh from masking the regression.

## Risks / Trade-offs

- **More live-mode transcript work may occur on critical snapshots** → The mirror signature guard prevents work when transcript content is unchanged, and live mode already promises natural transcript advancement.
- **A pending boundary could leak across owner changes** → Boundary state is owner-local and is cleared whenever that owner's mirror is initialized or successfully advanced.
- **History and SSE classification could drift** → Both paths reuse the same normalized-entry boundary helper.
