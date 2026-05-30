# Registry Cache and Citation Graph

The Paper Registry Cache and Citation Graph form the core deterministic infrastructure of the Synthesis Layer. They are valuable because they are rebuildable caches, not because they own user-authored topic content.

## Registry Cache

The Registry Cache stores current facts about Zotero-bound literature:

- Zotero bindings and recognized `literature_item_id` records.
- Bibliographic identity facts such as title, authors, year, DOI, arXiv, URL, and cite key when available.
- Source artifact coverage from derived artifact notes.
- Reference instances extracted from source artifacts.
- Cleanup/review surfaces for missing artifacts, duplicate candidates, and binding issues.

Registry rebuild should be precision-first. It may be slow, but it must be explainable and recoverable.

## Identity Resolution

`literature_item_id` is deterministic and opaque. It is not a human-readable DOI/title/citeKey and it is not a Zotero binding key. It is derived from the selected identity anchor so rebuild can preserve graph edges, redirects, topic source dependencies, review items, and user overrides when Zotero bindings change.

Canonical identity anchors:

- Accepted merge/redirect facts are canonical durable decisions and must be applied before deriving or allocating IDs.
- Strong work identity anchors use kind-specific refs such as canonical DOI, arXiv ID, ISBN, or stable canonical URL. They should produce the same `literature_item_id` whether the work is currently Zotero-bound or external-only.
- Current Zotero binding anchors use `paper_ref` format v1, `<libraryId>:<itemKey>`, only as a local fallback when no stronger work identity or accepted redirect is available.
- External work without strong identity uses a provisional reference key derived from the same normalization primitives as reference resolution. These IDs are lower-confidence and may later redirect to a stronger identity.
- Fallback and provisional identity classes must be exposed in diagnostics so users can understand why a node did not converge to a work-level strong identity.

Resolution order:

1. Apply accepted merge/redirect/tombstone facts created by user actions or validated import.
2. Resolve unique non-conflicting strong identifiers such as normalized DOI, arXiv ID, ISBN, or stable canonical URL to an existing or deterministic strong work `literature_item_id`.
3. Reuse an existing active Zotero binding (`libraryId:itemKey`) when that binding still exists and no stronger identity retargets it.
4. Reuse an existing provisional/fallback row when its normalized evidence and redirect history match the incoming work.
5. Use title/author/year identity only as matcher evidence and, for weak provisional keys, as part of a reviewable provisional identity.
6. Allocate a new binding-fallback or provisional external `literature_item_id` only when no accepted redirect, strong identity, current binding, or compatible provisional identity can be recognized.

The deterministic ID is still an implementation key, not a claim that two works are intellectually identical. Merge, split, retarget, and tombstone decisions remain domain facts expressed through redirects and review/override state. When a binding-fallback item later gains a unique strong identity, the safe materialization is a redirect/retarget to the strong work identity, not silently changing the original row ID in place.

## Reference Resolution

Reference resolution links a source paper’s reference instance to either:

- a current library `literature_item_id`;
- an external work node;
- an unresolved node;
- a review/suggestion state when confidence is insufficient.

`literature_matching_metadata` is not used for literature-to-literature reference matching. It is topic-discovery metadata and should not influence citation graph edges.

The full algorithm contract lives in [Reference Resolution](./reference-resolution.md). This document only records ownership and graph materialization boundaries.

## External Work Dedupe

External work dedupe should use the same normalization principles as library matching, but it has a different risk profile:

- External work nodes must have rebuild-stable identity when strong identifiers exist. DOI, arXiv, ISBN, and stable canonical URL should resolve to the same external work across rebuilds.
- External references without strong identifiers may use a provisional work key based on normalized title/authors/year/container evidence. Raw reference text belongs to the reference instance and diagnostics by default; it must not fragment provisional work identity.
- References with evidence too weak for a work-level provisional key remain unresolved or become reference-scoped placeholders. They must not participate in external dedupe as canonical targets.
- Dedupe may merge multiple unresolved/external references into one external work node.
- Dedupe must not override a stronger library match.
- When a library match and external dedupe candidate both exist, the library match wins if it passes automatic-match thresholds.
- Ambiguous external clusters remain separate or become review candidates; they must not be aggressively merged.

Before formal implementation, extract a fixture from the current library, build human-reviewed golden labels with the review harness, run policy experiments, and only then finalize thresholds.

## Review Queue Boundaries

Review is a scarce user resource. Matching and dedupe must not convert every weak pair into a review item.

- Candidate generation must use indexed blocking keys such as normalized identifier, strong compact title, title fingerprint, and bounded author/year buckets. O(N²) all-pairs review generation is forbidden.
- Strong identifier equality without contradictory bibliographic facts should auto-resolve and should not create a review item.
- Contradictory strong identifiers, duplicate strong identifiers with materially different titles, and ambiguous high-score clusters may create review items.
- Each source item should emit only a bounded number of review candidates per category. Overflow becomes an aggregate diagnostic with filters, not thousands of individual review cards.
- Workbench should support bulk accept/reject for repeated duplicate or external-dedupe decisions.
- Low-confidence suggestions that are useful for diagnostics may stay in debug/diagnostic output without becoming user-facing review items.

## Related Items Sync

The old reference matching workflow added Zotero built-in related-item relations during apply. In the new architecture this should be a Graph-owned optional after-commit effect:

- Source is accepted library-to-library citation edges from the Citation Graph.
- Target is Zotero related-item relations between the source Zotero item and matched target Zotero item.
- The sync should be idempotent and bounded, with Synthesis-owned provenance for every attempted effect.
- It should never run from unresolved, external-only, rejected, or suggestion-only references.
- It should expose progress and diagnostics but should not block Registry rebuild completion.
- It must never delete a Zotero related-item relation that lacks Synthesis provenance.
- If a relation already existed before sync, record it as `already_existed` and never remove it automatically.
- If Synthesis created a relation and the backing citation edge is later rejected, retargeted, superseded, or loses an active binding, the worker may revoke only that proven Synthesis-created relation after rechecking the current Zotero relation still matches the recorded source/target effect.
- If ownership cannot be proven or the current Zotero state diverged from the recorded effect, mark the sync effect `needs_attention` and leave the Zotero relation untouched.
- Zotero write or revoke failures update sync diagnostics only; they must not roll back Registry or Citation Graph facts.

## Graph Display

The Workbench Graph is a semantic view, not a raw reference dump.

- All current library nodes must be shown by default.
- External nodes with incoming degree greater than 1 should be shown by default as shared external references.
- External nodes with incoming degree 1 are hover-only by default.
- Layout is computed for default visible nodes. Hover-only nodes use local deterministic placement.
- If graph structure exists but layout is missing or stale, the UI should draw using available coordinates when possible and trigger async layout refresh.

## Registry and Graph Epochs

Registry rebuild advances `registry_epoch`. Graph structure, metrics, and layout record their `graph_basis_registry_epoch`. If the basis is stale, the graph can still be displayed with a refreshing diagnostic while workers recompute derived data.
