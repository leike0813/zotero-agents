# Reference Sidecar and Citation Graph

The Reference Sidecar and Citation Graph form the fast lookup layer for graph and inspection workflows. They are valuable because they are rebuildable sidecar projections over workflow artifacts, not because they own Zotero Library facts or user-authored topic content.

The SSOT boundary is defined in [Library SSOT and Sidecar Cache](./library-ssot-and-sidecar-cache.md). Historical Registry terminology is retained only to identify old implementation surfaces that must be removed or renamed during the hard cut. The active product model is artifact sidecar plus raw references, canonical references, accepted reference binding facts, canonical redirects, and explicit advanced-matching proposals.

## Data Model

The reference layer has six active table families.

### Artifact Sidecar

Artifact sidecar rows are keyed by `source_ref`, where `source_ref = <libraryId>:<itemKey>`.

Minimum fields:

| Field | Meaning |
| --- | --- |
| `source_ref` | Primary key for one Zotero source item. |
| `library_id`, `item_key` | Parsed Zotero binding for direct host lookup. |
| `digest_exists`, `digest_hash`, `digest_locator_json` | Digest artifact presence, hash, and locator. |
| `references_exists`, `references_hash`, `references_locator_json` | References artifact presence, hash, and locator. |
| `citation_analysis_exists`, `citation_analysis_hash`, `citation_analysis_locator_json` | Citation-analysis artifact presence, hash, and locator. |
| `scanned_at`, `updated_at` | Cache timing metadata. |

This table must not store Zotero item title, creators, year, tags, collections, item type, or deletion state as library facts. The Workbench Index should join direct Zotero reads with artifact/reference sidecar rows when it needs current library facts.

### Raw References

Raw reference rows are extracted from references artifacts.

Minimum fields:

| Field | Meaning |
| --- | --- |
| `raw_reference_id` | Stable row id for one extracted reference occurrence. |
| `source_ref` | Source Zotero item whose artifact contained the reference. |
| `references_artifact_hash` | Hash of the references artifact used during extraction. |
| `reference_index` | Index inside the extracted reference list. |
| `raw_hash` | Hash of normalized raw/parsed reference content. |
| `parsed_json` | Bounded parsed fields and raw text needed for diagnostics. |
| `normalized_title`, `doi`, `arxiv`, `isbn`, `url`, `citekey`, `year` | Indexed matcher evidence. |
| `canonical_reference_id` | Current canonical representative initially assigned at extraction. |
| `status` | `active` or `stale`. |
| `extracted_at`, `extractor_version` | Basis and version metadata. |

When a source item's `references_hash` changes, old active raw references for the previous `source_ref + references_artifact_hash` become `stale`; the newly extracted references are inserted as new rows. Refresh must not rewrite historical raw rows in place except for status/provenance fields.

### Canonical References

Canonical references represent deduped referenced works, not Zotero Library items.

Minimum fields:

| Field | Meaning |
| --- | --- |
| `canonical_reference_id` | Synthesis-owned reference identity. |
| `representative_json` | Selected display/evidence fields from one or more raw references. |
| `normalized_title`, `identity_key` | Indexed dedupe evidence. |
| `status` | `active`, `merged`, or `deprecated`. |
| `created_from_raw_reference_id` | Provenance for the first materialized raw reference. |
| `created_at`, `updated_at` | Lifecycle timestamps. |

Every newly extracted raw reference may initially create or point to a canonical reference. Dedupe writes redirects rather than relying on destructive row rewriting.

### Canonical Reference Redirects

Redirects record dedupe, merge, and retarget decisions:

| Field | Meaning |
| --- | --- |
| `from_canonical_reference_id` | Superseded canonical reference. |
| `to_canonical_reference_id` | Effective canonical reference. |
| `reason`, `method`, `confidence` | Why the redirect exists. |
| `created_at` | Decision timestamp. |

Reads must resolve the effective canonical reference before graph materialization and binding lookup. Ambiguous redirects require explicit review.

### Reference Bindings

Reference bindings map canonical references to current Zotero Library items. They are accepted facts, not candidate storage.

| Field | Meaning |
| --- | --- |
| `binding_id` | Stable binding row id. |
| `canonical_reference_id` | Effective canonical reference being bound. |
| `library_id`, `item_key` | Zotero target item. |
| `status` | New writes use `accepted`; legacy values normalize into the read model. |
| `method`, `confidence`, `evidence_json` | Matching provenance. |
| `created_at`, `updated_at` | Lifecycle timestamps. |

Automatic and user-confirmed provenance is recorded as evidence, not as separate lifecycle states. Refresh preserves accepted bindings and the read model may derive `stale_target` when the Zotero target is gone, but refresh must not silently overwrite or delete accepted facts.

### Reference Match Proposals

Advanced Reference Matching stores uncertain matcher output in `synt_reference_match_proposal`.

| Field | Meaning |
| --- | --- |
| `proposal_id` | Stable proposal id for one source/target/basis. |
| `kind` | `zotero_binding` or `canonical_merge`. |
| `status` | `open`, `accepted`, `rejected`, or `superseded`. |
| `source_canonical_reference_id` | Candidate source canonical reference. |
| `target_library_id`, `target_item_key` | Zotero target for binding proposals. |
| `target_canonical_reference_id` | Canonical target for merge proposals. |
| `confidence`, `score`, `reasons_json`, `evidence_json` | Matcher evidence. |
| `basis_hash`, `source_hash` | Reopen suppression and provenance basis. |

Accepted proposals write facts to `synt_reference_binding` or `synt_canonical_reference_redirect`. Rejected proposals suppress reopening for the same basis. Open proposals never create graph edges.

## Two-Stage Reference Refresh

The target reference refresh is a two-stage operation.

Stage 1: artifact sidecar scan and diff.

1. Enumerate the selected Zotero source scope and locate Synthesis artifacts.
2. Update only artifact sidecar existence, locator, fingerprint/hash, and diagnostics.
3. Compute the changed set from `references_hash` changes, newly discovered references artifacts, and disappeared references artifacts.
4. Do not materialize Zotero item metadata into sidecar tables.
5. Do not rebuild graph metrics/layout or run binding review inside this stage.

Stage 2: changed-reference processing.

1. For each changed `source_ref`, process a bounded slice or small transaction.
2. If the references artifact disappeared, mark old active raw references for that source as `stale`.
3. If the references artifact hash changed, mark old active raw references for the previous hash as `stale`.
4. Read and parse only the changed references artifact.
5. Insert new raw references for the new `source_ref + references_hash`.
6. Assign canonical references and run incremental dedupe against the active canonical reference index.
7. Run only lightweight best-effort binding for new or affected canonical references when citekey or exact title-year keys can be checked within budget.
8. Leave heavy reference matching, ambiguous binding, broad library metadata scans, and user approval to explicit Advanced Reference Matching.

This refresh must expose progress from real counts: scanned artifact sources, changed artifacts, extracted references, canonical matches, and affected binding candidates. A failed source should write bounded diagnostics for that source without making the entire refresh appear permanently running.

On success, reference refresh marks `reference-sidecar:library` ready in `synt_cache_basis`. It also marks `citation-graph:library` and `related-items-sync:global` stale with bounded diagnostics for changed source refs, binding canonical ids, and redirect canonical ids where applicable. It does not start graph refresh, graph bootstrap, or related-items sync. Refresh progress and terminal failure are recorded in `synt_operation`; operation rows are not data-readiness sources.

## Workflow Apply

`literature-digest` apply is an explicit workflow action and may run the same single-source pipeline:

1. Write or update the digest/references/citation-analysis artifacts through Zotero APIs.
2. Update the artifact sidecar row for that `source_ref`.
3. If `references_hash` changed, stale old raw references for that source/hash and extract new raw references.
4. Run incremental canonical dedupe for the new raw references.
5. Run lightweight best-effort binding where safe.

This is not an implicit Zotero Library trigger. It is scoped to the applied item and must not start topic source check, a library-wide backscan, graph refresh, graph bootstrap, or related-items sync. Apply marks Citation Graph and related-items sync stale for the applied `source_ref`; a later explicit stale graph refresh consumes that source-scoped delta and may run scoped related-items sync after graph refresh succeeds.

## Advanced Reference Matching and Review

Advanced Reference Matching is separate from ordinary refresh because it may need current Zotero metadata, heavier title matching, and user judgment.

- It is started only by `runAdvancedReferenceMatchingNow` or scoped debug/test harnesses.
- It has two passes: Zotero reference binding and external canonical-reference dedupe.
- The binding pass uses `referenceMatcher.ts` and builds a Zotero matcher index once per operation.
- The dedupe pass runs the cluster-first canonical dedupe algorithm over active
  unbound effective canonical references, using identifier evidence,
  title-candidate provenance, structured containment classification, sticky
  representatives, exact title/year subclusters, and bounded fuzzy review
  candidates.
- `matched` binding results with deterministic or high confidence may automatically write accepted binding facts.
- Deterministic external duplicates may write canonical redirects; fuzzy dedupe candidates only create `canonical_merge` proposals.
- Suggested or ambiguous binding/dedupe results create `synt_reference_match_proposal` rows.
- User actions accept or reject proposals; accepted proposals write binding or canonical redirect facts.
- Accepted fact changes may trigger a separate visible source-slice graph refresh and then a visible related-items sync. Open proposals never create graph edges or related-item writes.

The Synthesis Index harness runs the same cluster-first dedupe algorithm as a
debug tool for current index state. Harness runs write only the isolated debug
database; production Advanced Matching writes accepted redirects or
`canonical_merge` proposals. Representative selection uses effective-canonical
raw aggregation, title-candidate provenance, sticky existing representatives,
and capped raw support as documented in
`.codex/artifacts/advanced-reference-dedupe-cluster-algorithm.md`.

## Citation Graph Cache Refresh and Rebuild

Citation graph structure is derived from:

1. active raw references;
2. effective canonical references after redirects;
3. accepted reference bindings;
4. direct Zotero checks for currently bound source/target item existence when graph correctness requires it.

Graph cache has two maintenance modes. Source-slice incremental refresh rewrites only affected source outgoing edges, source ownership rows, incoming groups, related nodes, and affected light metrics. Full rebuild remains exposed as `rebuildCitationGraphCacheNow` in the service/host layer and replaces the whole graph cache.

When another explicit operation marks `citation-graph:library` stale, it may record bounded incremental scope in cache-basis diagnostics: changed `source_refs`, canonical ids, binding canonical ids, and redirect canonical ids. Manual `refreshCitationGraphCacheIncrementalNow` consumes only that recorded stale delta; if no delta is recorded, the user-facing fallback is full rebuild.

The graph cache primitive must not scan artifacts, extract references, repair bindings, rebuild layout, or run related-items sync. It reads active raw references, resolves effective canonical references, applies accepted bindings, writes graph nodes/edges/light metrics, and marks `citation-graph:library` ready in `synt_cache_basis` on success. The public manual stale graph refresh wrapper may run a scoped related-items sync after the graph primitive succeeds, using the primitive's final affected source refs.

Graph cache rebuild must not read old Registry/literature-index tables as truth. It may produce nodes, edges, and metrics for speed, but those outputs remain stale-tolerant projections. Layout rebuild is a separate operation that computes coordinates for an existing graph hash and must not rebuild graph data.

Graph display rules:

- Library source nodes use current Zotero reads for display facts when available.
- Bound reference nodes point to current Zotero `libraryId:itemKey`.
- Unbound canonical references become external nodes.
- External nodes with incoming degree greater than 1 should be shown by default as shared external references.
- External nodes with incoming degree 1 are hover-only by default.
- If graph structure exists but layout is missing or stale, the UI should draw using available coordinates when possible and offer explicit layout refresh.
- If graph cache is stale and stale delta metadata exists, the UI should offer explicit incremental graph cache refresh. If graph cache is missing or stale without delta metadata, the UI should offer explicit graph cache rebuild, not layout rebuild.

## Related Items Sync

The old literature-digest apply path no longer runs automatic note-level Reference Matching. Zotero Library remains the SSOT for native related-item relations; Synthesis can only perform bounded side effects with provenance:

- Source is accepted library-to-library citation edges from ready Citation Graph cache when available, or directly from active sidecar facts when graph cache is missing, stale, failed, empty, or graph refresh failed.
- Target is Zotero related-item relations between the source Zotero item and accepted target Zotero item.
- The sync should be idempotent and bounded, with Synthesis-owned provenance for every attempted effect.
- Literature-digest apply and Reference Sidecar refresh mark related-items sync stale for changed source refs; manual stale graph refresh may run scoped sync after graph refresh succeeds. Advanced Matching may run full sync after accepted binding or redirect facts change.
- Related-items sync must not rebuild graph cache, extract references, run matcher logic, or mutate sidecar facts.
- It should never run from unbound, external-only, rejected, or candidate-only references.
- It should expose progress and diagnostics but should not block graph/reference cache refresh completion unless the user explicitly chose an all-or-nothing sync.
- It must never delete a Zotero related-item relation that lacks Synthesis provenance.
- If a relation already existed before sync, record it as `already_existed` and never remove it automatically.
- If Synthesis created a relation and the backing citation edge is later rejected, retargeted, superseded, or loses an active binding, the worker may revoke only that proven Synthesis-created relation after rechecking the current Zotero relation still matches the recorded source/target effect.
- Cache validation must not treat pending external writes as successfully synchronized. Already `applied` Synthesis-created effects may become stale so an explicit sync/review flow can drive revoke.
- If ownership cannot be proven or the current Zotero state diverged from the recorded effect, mark the sync effect `needs_attention` and leave the Zotero relation untouched.
- Zotero write or revoke failures update sync diagnostics only; they must not roll back Reference Sidecar or Citation Graph facts.

## Removed Model

Startup reconcile, dirty queues, WorkItems, WorkRuns, full Registry rebuild, source-item ID allocation outside Zotero, and old Synthesis-owned Zotero library fact tables are not active design targets. Active code must not depend on them for correctness or compatibility.

## Cache Basis and Graph Freshness

Reference sidecar refresh records artifact hashes, extractor version, matcher policy version, binding decision version where relevant, scope, and refresh time in `synt_cache_basis`. Citation graph structure/metrics and graph layout record separate cache basis over active references, binding decisions, graph hash, and layout preset.

Runtime readiness must come from `synt_cache_basis`, not terminal `synt_operation` rows and not legacy sidecar state files, sidecar index files, graph index files, or graph manifests. Terminal operation rows are progress/history diagnostics only. If a graph basis is missing, stale, or failed, the Graph page should show a cache diagnostic and an explicit graph cache rebuild action.
