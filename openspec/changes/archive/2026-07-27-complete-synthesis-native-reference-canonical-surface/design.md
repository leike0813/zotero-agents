## Context

This change owns the sixteen Reference Matcher and canonical-reference operations in the parent matrix. The public facade spans read projections, native matching jobs, review actions, multi-action batches, canonical merges, metadata updates, and archival.

## Goals / Non-Goals

**Goals:**

- Preserve public ranking, attention, review, proposal, canonical, job, and batch DTOs.
- Keep native compute, repository decisions, and canonical writes behind typed ports with coherent basis checks.
- Make retries and batch mutations idempotent and restart-safe.

**Non-Goals:**

- Citation Graph cache or Tag vocabulary behavior.
- Opening canonical roots from the dispatcher or compatibility module.
- Activating production mutations.

## Decisions

### Use one consistency boundary for reference and canonical state

Compatibility adapters obtain the current reference/canonical basis from the typed applications. Canonical merge, update, archive, and review actions use dedicated canonical ports; none may be substituted with a generic reference-review action.

### Preserve public batch semantics

Single and multi-proposal actions, merge requests, and review actions are normalized into explicit typed commands. Validation completes before the atomic durable commit; conflicts return stable per-request or batch results without silent partial success.

### Make matching jobs Host-fed and durable

Paged Zotero inputs flow through reverse Host, matching runs in native workers, and job/retry/proposal results persist before publication. Differential fixtures compare both stable DTOs and durable decisions after reopen.

## Risks / Trade-offs

- [Repository and canonical bases diverge] → Capture both identities and reject mixed-basis writes.
- [Batch compatibility hides partial failure] → Model and test the legacy atomicity/result contract explicitly.
- [Matching retry repeats Host effects] → Persist job and application receipts under stable operation identity.
