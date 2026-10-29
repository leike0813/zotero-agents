# Design

## Context

See proposal.md for the failure. Prepare, resolver and finalize share a runtime workspace; the runner also saves each step's accepted JSON separately. The artifact manifest already declares `final_output_candidate`, and the existing artifact reader supports local resolution and downloaded bundles. Native Topic apply owns validation, canonical writes and optimistic concurrency.

The source fix and main-spec synchronization preceded this supplemental change. This document records the implemented decisions; real-run recovery is still outstanding.

## Goals / Non-Goals

**Goals:** preserve runtime-owned completion fields through the apply boundary and keep real stale-basis conflicts observable.

**Non-Goals:** change generic ACP result precedence, hash algorithms, public DTOs, schemas, native CAS, persistent storage or recovery UI.

## Decisions

- Resolve the candidate inside the Synthesis workflow package through the existing artifact manifest. Generic result precedence remains available to other workflows; changing it globally would expand this repair beyond the affected contract.
- Use the complete declared candidate rather than patching only returned hashes. This gives language, topic definition and concurrency basis the same runtime owner. Missing, malformed or invalid declared candidates fail with `invalid_request`; a missing declaration retains the existing direct-input route. Cancellation is handled before artifact reads.
- Share the package's artifact reader and per-asset size limit between candidate selection and closed-request materialization. Keep JSON-safe reconstruction, aggregate materialization limits and native validation in their existing owners. Candidate selection is one declared lookup, not a recursive candidate chain.
- Keep artifact, manifest and metadata hashes captured during preparation. Reading replacement hashes at apply time would allow stale analysis to overwrite newer content. The native sidecar remains the final CAS authority.
- Reuse the hook and real-sidecar test seams. The native regression reads an actual audit basis, applies a correct candidate despite altered returned hashes, then refuses the now-stale candidate even when the returned JSON supplies newer hashes.
- Recover the failed run through the existing debug reapply capability with the saved candidate as a replace override, `persistResult: false` and `force: false`. This works with the existing installed hook and does not require rebuilding the analysis or publishing a content package first.

## Risks / Trade-offs

- Returned artifact locators still provide the initial entrypoint; declared candidates pass the existing asset and native validation boundaries.
- The Topic may change before recovery. Preserve the original basis and stop on conflict rather than retrying with refreshed hashes.
- Recovery requires the original plugin-enabled Zotero instance and its Bridge. The Bridge was unavailable during implementation; the launched Joshua-Side profile had no Zotero Agents installation. Keep live recovery tasks unchecked until apply and readback succeed.

## Migration Plan

No data migration is required. Source and generated Skill instructions are synchronized, while installation and publication use the existing content-package workflow. Preserve original runtime artifacts for recovery. A code rollback restores the previous workflow hook/reader and matching instructions; it does not reverse any successfully applied canonical Topic update.
