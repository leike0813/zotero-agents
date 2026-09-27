## Context

The current native sidecar is fresh and starts, but persisted data from the two September 2, 2026 migrations still reaches strict projection boundaries in legacy shapes. The affected paths have separate owners: Rust application/projection owns durable data and public DTO adaptation, the Workbench owns surface refresh, and the debug dashboard owns trace presentation. Existing protocol schemas, bounded trace retention, and Citation Graph application/repository ownership remain authoritative.

## Goals / Non-Goals

**Goals:**
- Make current migrated data readable through strict Concept, Topic, and maintenance projections.
- Make the existing public staged-tag selection size work without sacrificing atomic basis checks or bounded effect batches.
- Make failed sidecar traces diagnosable and make the first committed Citation Graph rebuild visible with its latest coordinates.
- Keep all changes compatible with Zotero plugin runtime constraints and existing public schemas.

**Non-Goals:**
- Do not loosen TypeScript protocol validation or add public wire fields.
- Do not change repository/application ownership, durable schema formats, release packaging, or trace retention limits.
- Do not modify archived changes or the unrelated active R9 acceptance change.
- Do not add a new cache or redesign the native layout algorithms unless the independent quality fixture proves a native defect.

## Decisions

### Canonicalize at producer boundaries
Use explicit compatibility mapping in the Rust decoder and public projection functions. Historical artifact and worker result JSON remain internal; public results are rebuilt from the existing schema allowlists. This keeps strict validation as the contract and avoids a permissive generic sanitizer.

### Remove only the incorrect tag request cap
The public schema already allows up to 25,000 tags and the application already batches effect work at 100. Remove the application-level 100-item request rejection instead of splitting one user mutation into multiple basis-sensitive operations, which could create partial promotion semantics.

### Repair legacy identity through the existing owner
Use the existing migration/reconciliation transaction and shared path resolution rules. Current canonical Topic identity wins; legacy paths are read/repair fallbacks only. No standalone database script or new persistence trait is introduced.

### Keep trace storage unchanged
Limit and prioritize only the dashboard presentation. Preserve the existing bounded trace store and patch interval, and add selection-aware rendering so older failed traces remain discoverable without an unbounded UI table.

### Refresh graph at the Workbench boundary
Use the existing operation/surface refresh lifecycle after rebuild terminal/ready and update Sigma coordinates when only layout identity changes. Do not move lifecycle ownership into CitationGraphApplication or public maintenance.

## Risks / Trade-offs

- [Historical artifact fields may be semantically incompatible, not merely extra] -> Project required sections field-by-field and return the existing unavailable diagnostic when a required value has no safe default.
- [Removing the request cap can increase one validation/compute workload] -> Keep the public 25,000-item bound, existing effect batching, existing compute limits, and add a multi-page promotion test.
- [A post-terminal refresh can race another graph operation] -> Use finite retries and basis/signature checks; leave the last-good graph visible on failure.
- [UI coordinate updates can expose a native layout defect] -> Run the independent native quality fixture first and change native spacing only if that fixture fails.

## Migration Plan

1. Land regression tests and projection fixtures using sanitized copies of the observed legacy rows.
2. Implement Rust compatibility/projection changes, then Workbench/dashboard refresh changes.
3. Validate the sidecar contract, native tests, UI tests, and runtime freshness.
4. On the next sidecar startup, let existing owned reconciliation normalize legacy paths/receipts; never edit the user profile with an ad hoc script.
5. If validation fails, retain the last-good graph and public durable state; revert the code change without modifying archived OpenSpec history.
