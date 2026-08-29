## Context

The Rust production sidecar owns the grouped `SynthesisClient`, but three adapter boundaries have drifted from their contracts. The reverse-Host client waits for connection EOF while the Gecko endpoint closes immediately after a successful write, production admission applies the general 64 KiB member limit before the 1 MiB operation budget, literature-digest apply records only a receipt, and the staged-Tag adapter exposes the application's page DTO instead of the client's complete array DTO.

The repair must preserve the closed public client surface, existing request budget and artifact-read size exception, the reference-refresh application's ownership of parsing/canonicalization/binding, SQLite foundation identity, and all current R9a worktree edits.

## Goals / Non-Goals

**Goals:**

- Deliver complete bounded reverse-Host responses under capability-specific deadlines.
- Materialize one literature apply atomically through the existing reference domain path, including matching metadata and cache invalidation.
- Make identical applies idempotent and all failures rollback cleanly.
- Return all staged Tag suggestions through the existing array contract.
- Cover the repaired boundaries with focused TypeScript, Zotero, and Rust tests.

**Non-Goals:**

- Changing public TypeScript DTOs, workflow payloads, or production ownership.
- Enlarging the 1 MiB general response/request budgets or the 8 MiB artifact-read exception.
- Reintroducing legacy/Node fallback, a background reconciliation queue, or a second reference-apply implementation.
- Rebuilding historical cache formats or advancing schema identity.
- Prebuilding or releasing the sidecar.

## Decisions

### Reverse-Host completion is length-delimited

Rust will parse the HTTP header, validate `Content-Length` against the operation response limit, and read exactly that many body bytes. A complete body is decoded immediately even while the Host retains the socket; EOF before the declared length is a stable truncation failure. The Gecko endpoint will release ownership after a successful write without force-closing, while write failure and endpoint stop continue to abort the transport.

This follows HTTP message framing and removes the accidental EOF handshake. Retaining unconditional Host close was rejected because Gecko may accept a write before draining its own buffered tail.

### Artifact scan and read share one deadline policy source

`library.artifacts.scan_page` and `library.artifacts.read` will both resolve the ten-second reverse-Host deadline from the production contract policy. Only `read` keeps the 8 MiB response exception; scan remains at 1 MiB. Per-call literals were rejected because they already drifted across TypeScript and Rust.

### Production admission spends the operation budget

The production `client.*` request validator will allow an individual string to consume the operation's existing 1 MiB aggregate request budget. General capabilities keep the 64 KiB member bound; JSON depth and node limits remain unchanged. Raising all capability limits was rejected because it would weaken unrelated ingress boundaries.

### Literature apply reuses reference-refresh preparation and promotion

A strict Rust DTO will normalize the existing workflow request into artifact descriptors plus optional reference/citation payloads. The existing `ReferenceRefreshApplication` prepare/project/promote pipeline remains the single owner of reference extraction, canonicalization, safe matching, binding, role projection, and stale-cache decisions. Digest content contributes only descriptor/hash state. Reference or citation-analysis changes reproject the source; digest-only changes do not rebuild raw references.

The repository transaction will also upsert normalized `synt_literature_matching_metadata` and the operation receipt. Matching terms use the existing 12/8/8/8/6 category bounds, trim/deduplicate deterministically, and persist a canonical hash. The new table is additive `CREATE TABLE IF NOT EXISTS` foundation-v1 state.

`matchedReferences` prefers unique citekey matches, then unique normalized title+year matches; ambiguous title+year candidates remain unbound. Cache bases become stale only when reference, binding, or citation-role facts change. If validation, preparation, or commit fails, the preparation is discarded and no success receipt or partial projection remains.

A separate bespoke apply path was rejected because it would duplicate the reference domain and let refresh/apply semantics diverge.

### The Tag adapter drains the internal pager

`client.listStagedTagSuggestions` will repeatedly request up to 100 rows, validate that a nonterminal cursor changes, collect all entries, and return one deterministically sorted array. Pagination remains private to the Rust application port; the public operation continues accepting no paging arguments.

Changing the public client to `{ entries, cursor }` or adding TypeScript compatibility branches was rejected because workflows already depend on the array DTO.

## Risks / Trade-offs

- [A successful Host transport is not explicitly closed by the endpoint] → endpoint ownership is released only after a complete write; stop/failure paths still abort, and Rust length framing ends the request without waiting for EOF.
- [A 1 MiB string requires more validator work than 64 KiB] → aggregate byte, depth, and node limits remain enforced before dispatch.
- [Single-item apply must bridge workflow DTOs into refresh internals] → keep conversion in the existing canonical/reference module and test restart, idempotency, change classification, and rollback.
- [A corrupted Tag pager could loop forever] → reject unchanged/repeated cursors and bound progress by the application's total/page evidence.

## Migration Plan

Add the matching-metadata table through the existing transactional foundation initializer. Existing repositories open without data rewriting; the first apply creates or updates rows. Rollback is source-compatible because the additive table can remain unused, while public DTOs and schema identity do not change.

## Open Questions

None. The approved plan fixes the ownership, bounds, and matching rules.
