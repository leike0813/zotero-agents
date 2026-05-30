## Context

Synthesis treats Zotero Library, child notes, attachments, and workflow-produced artifact notes as external or semi-external facts. These facts can change outside the plugin's control:

- Zotero may be used while the plugin is disabled or not loaded.
- Zotero sync, conflict resolution, database repair, or external tools may modify items and notes.
- Duplicate merges or batch deletions can invalidate many bindings at once.
- Artifact notes can be edited, deleted, or regenerated outside Synthesis background workers.

The existing startup reconcile contract compares Zotero fingerprints with DB state, but it does not define what happens when the difference is large. Expanding every changed/deleted item into downstream dirty events can flood the queue, obscure diagnostics, and accidentally re-couple Topics to registry cache drift.

## Goals / Non-Goals

**Goals:**

- Define the external source consistency boundary for Zotero and artifact notes.
- Make startup reconcile bounded and fail-closed for bulk or suspicious drift.
- Keep defensive validation at adapter/materializer ingress instead of spreading expensive checks throughout every internal worker.
- Ensure bulk drift does not fan out into unbounded dirty events, graph jobs, review items, or topic work.
- Define Workbench and debug diagnostics for source drift incidents.

**Non-Goals:**

- No runtime implementation in this change.
- No automatic repair of structural Zotero DB corruption.
- No replacement for explicit registry/graph cache rebuild.
- No topic source-check/freshness coupling to external drift.
- No arbitrary SQL/file inspection capability.

## Decisions

### Optimistic by default, defensive at ingress

Normal internal Synthesis workers may trust committed Synthesis DB facts. The defensive boundary is the adapter/materializer layer that reads Zotero items, notes, attachments, and artifact payloads.

Rationale: validating every internal operation against live Zotero would make the system slow and hard to reason about. Lightweight validation at ingress catches malformed external inputs without making every worker defensive.

### Startup reconcile is a detector, not an impact executor

Startup reconcile should scan within budget, classify drift, and decide whether bounded incremental work is safe. It should not turn a large Zotero batch merge/delete into hundreds of dirty events plus downstream graph/topic jobs.

Rationale: startup should restore confidence, not create a queue storm before the user understands what changed.

### Drift severity controls fan-out

The contract uses three severity levels:

- `small`: changes are below configured count/ratio/budget thresholds; bounded incremental reconcile may proceed.
- `bulk`: many items changed/deleted/merged; record a summary and recommend explicit registry/graph cache rebuild.
- `structural`: identity assumptions look unsafe, payload decode failures are widespread, or scan budget is exhausted; pause incremental processing and require inspect/repair.

Thresholds are implementation details, but the contract should define examples such as changed bindings over a small fixed threshold, deleted ratio over a percentage threshold, payload decode failure ratio over a threshold, or fingerprint scan timeout.

### Bulk and structural drift fail closed

When startup reconcile classifies drift as `bulk` or `structural`, the system should:

- record a bounded drift incident;
- avoid per-item dirty event fan-out;
- avoid topic source-check/freshness/discovery fan-out;
- avoid permanent active jobs in the Workbench statusbar;
- show clear recommended actions: inspect drift, run registry/graph cache rebuild, or reset Synthesis DB if appropriate.

Rationale: partial "best effort" repair can leave the system in a misleading state. Explicit repair/rebuild is safer for large unknown external changes.

### Topics remain isolated from external source drift

External drift affects the Paper Registry Cache and Citation Graph maintenance domain. Topics are generated artifacts; they should only observe source differences through explicit source check or update flow.

Rationale: this preserves the Topics/Index decoupling contract and prevents a Zotero batch operation from producing multi-domain cascading failures.

## Risks / Trade-offs

- **Risk: Bulk drift may delay legitimate incremental repair.** → Mitigation: provide explicit rebuild/reconcile actions and bounded diagnostics.
- **Risk: Thresholds may be too conservative or too permissive.** → Mitigation: thresholds should be configurable or at least surfaced in debug output.
- **Risk: Users may not understand why reconcile did not process every item.** → Mitigation: Workbench summary should show source drift severity, counts, and recommended next command.
- **Risk: Structural drift handling could hide real data loss.** → Mitigation: fail closed and preserve existing committed DB state until explicit repair/rebuild succeeds.

## Migration Plan

This change is documentation-only. Future runtime work can implement it in phases:

1. Add source drift classification to startup reconcile diagnostics.
2. Add bounded source drift incident rows or job diagnostics.
3. Gate dirty event fan-out behind drift severity.
4. Add Workbench/debug read surfaces for drift incidents and recommended commands.
5. Add tests for small, bulk, and structural drift scenarios.
