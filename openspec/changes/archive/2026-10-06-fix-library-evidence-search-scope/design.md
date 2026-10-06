# Design

## Context

See proposal.md for the closeout defects. The Broker's private `resolveEvidenceScope` already owns evidence source scope. Library item search resolves Libraries before calling it again with the remaining constraints. Rust consumes the resolved source catalog and performs lexical matching; no matcher change is needed.

## Goals / Non-Goals

**Goals:** Put default Library precedence and item-reference intersection in the existing scope owner, and validate both public search operations through the existing native harness.

**Non-Goals:** New DTOs, search members, vector features, Topic changes, or agent-facing surface edits.

## Decisions

- Extend `resolveEvidenceScope` to use explicit Library IDs first, then the supplied collection's Library, then the captured current view. Validate the collection using the existing Host slice. Library search resolves all scope constraints in one call to this owner.
- Filter out-of-scope item references before the existing identity deduplication. Keep the field present when the intersection is empty, so enumeration cannot fall back to a whole Library. Library search delegates this work to the same resolver instead of maintaining a second intersection.
- Reject explicit Library/collection mismatches as invalid requests in both search paths. Empty Library lists and missing collections retain their validation failures. Evidence enumeration skips unrelated declared Libraries for a collection filter while preserving the declared scope in its basis.
- The scoped reverse-Host adapter authorizes the collection-derived Library before calling the source owner. Item refs remain filters, not authorization to add Libraries.
- Use existing Broker API tests and `281-synthesis-evidence-production-route.test.ts` for the agreed acceptance seams: `library.searchItems` and typed `SynthesisClient.searchEvidence`. Extend their existing fixtures and harness rather than adding another runner. Include collection/current-Library disagreement, absent or ambiguous current view, mixed and duplicate refs, empty intersections, explicit empty refs, and frozen continuation behavior.

## Risks / Trade-offs

- A cursor must not switch scope after the current view changes → exercise continuation through the real Rust route and existing frozen-scope logic.
- Scope filtering could accidentally turn an empty list into an omitted list → assert completed zero results and no continuation.
- Explicit scope could be silently widened → retain explicit mismatch and empty-Library checks.

## Migration Plan

Apply the isolated changes on the current branch. No storage or wire migration is required. Synchronize specifications and component documentation, verify and archive the change, and create the approved independent commit. Leave the issue open until the user integrates the commit into dev.
