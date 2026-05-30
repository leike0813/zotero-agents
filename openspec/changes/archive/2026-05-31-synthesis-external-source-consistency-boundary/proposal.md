## Why

Zotero Library is an external fact source that can change while the plugin is not running or through tools outside this plugin. Current Synthesis contracts describe startup reconcile and fingerprints, but they do not define how to bound large or suspicious external drift without creating unbounded dirty events, review items, graph jobs, or topic work.

This change establishes the consistency boundary: Synthesis is optimistic during normal operation, defensive at the Zotero ingress boundary, and fail-closed when startup reconcile detects bulk or structural drift.

## What Changes

- Define Zotero Library and artifact notes as volatile external sources.
- Define startup reconcile as a bounded detector, not an unbounded impact executor.
- Add drift severity levels:
  - small drift: bounded incremental reconcile;
  - bulk drift: summarize, suppress fan-out, recommend explicit index rebuild;
  - structural drift: stop incremental processing and require diagnostic/repair action.
- Define defensive validation at adapter/materializer ingress:
  - item existence and top-level regular item checks;
  - stable `libraryId:itemKey` binding checks;
  - note payload decode/hash checks;
  - parent/attachment consistency checks;
  - impossible collision / invalid identity diagnostics.
- Define fail-closed behavior for bulk/structural drift:
  - no unbounded dirty event expansion;
  - no topic source-check/freshness/discovery fan-out;
  - no permanent statusbar queued jobs;
  - bounded Workbench/debug diagnostics and explicit recommended commands.
- Add machine-readable engineering invariants and sequences for external source drift.

## Capabilities

### New Capabilities

- `synthesis-external-source-consistency-boundary`: Defines Synthesis behavior when Zotero external facts drift outside plugin-controlled execution.

### Modified Capabilities

None. This is a documentation and engineering contract change that future runtime work can implement against existing Synthesis capabilities.

## Impact

- Documentation and OpenSpec contract change.
- No runtime migration.
- No dependency changes.
- No changes to `literature-digest`.
- Future implementation work can use this contract to harden startup reconcile, debug diagnostics, and registry/graph cache rebuild recommendations.
