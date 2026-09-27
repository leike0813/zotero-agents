## Context

See `proposal.md` for motivation. Repository projection replacement currently protects Canonical References used by active Source References and non-refresh bindings, but not those used by redirects or persisted Canonical Revision reviews. The matcher validates all redirect chains before dispatching compute, so one missing effective target prevents Advanced Reference Matching from starting. Existing production schema preparation already provides verified backups, a transaction, cycle repair, proposal supersession, cache invalidation, and an audit receipt.

The Dashboard already has a whole-trace outcome helper, while the trace-row renderer independently selects the root terminal outcome.

## Goals / Non-Goals

**Goals:**

- Prevent projection replacement from creating dangling durable Reference facts.
- Repair supported v1/v2 repositories before production reads with existing migration guarantees.
- Make the trace-row outcome agree with the durable terminal without changing raw events.

**Non-Goals:**

- Recover deleted Canonical Reference metadata by inference.
- Relax matcher graph validation or change public maintenance diagnostics.
- Add a new repair command, public DTO, dependency, or end-to-end fixture.

## Decisions

### Preserve Canonical References at the projection replacement boundary

Extend the existing canonical deletion predicate to retain redirect sources, redirect targets, and Canonical References used by active revision reviews. This fixes the shared producer of invalid state. Matcher-side skipping was rejected because it would hide corrupted durable facts from one consumer while leaving every other consumer exposed.

### Advance the private redirect-graph marker to v3

Repository preparation will treat missing/v1 and v2 markers as supported prior versions, create or verify the existing migration backup, and run repair inside the existing immediate transaction. The private cycle repair will become redirect-graph repair: retain the existing cycle normalization, then remove every redirect component whose source resolves to a missing terminal Canonical Reference. A missing source row remains valid when its effective target exists.

For every removed redirect, reuse the existing proposal supersession, Citation Graph and related-items cache invalidation, matching readiness reset, and `canonical_redirect_repair` receipt. The marker and all repairs commit together; rollback leaves the source database and verified backup available. A committed v3 marker is a no-op on reopen.

Removing a complete unresolvable component was chosen over rerooting it at an intermediate identity: the deleted terminal metadata cannot be reconstructed, so choosing another effective Canonical Reference would invent a matching decision.

### Reuse the whole-trace outcome projection

The trace-row renderer will use the existing whole-trace outcome helper. Observation ingestion, root event semantics, lifecycle pinning, and public receipts remain unchanged.

## Risks / Trade-offs

- **Invalid historical redirect decisions are removed** → preserve the pre-migration database backup and record structural repair diagnostics; do not invent replacement Canonical References.
- **A repair can stale graph-derived views** → reuse the existing bounded stale markers so explicit maintenance rebuilds them.
- **Migration failure could block startup** → keep the existing transaction rollback and verified-backup behavior.

## Migration Plan

1. On repository preparation, detect a supported marker older than v3 and create or verify the migration backup.
2. Inside one immediate transaction, repair cycles, repair unresolvable components, converge proposals/cache/readiness/receipt, and write v3.
3. Commit before production reads. On failure, roll back and leave the source and backup intact.
