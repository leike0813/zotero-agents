# Synthesis Glossary

This file is the terminology SSOT. If another document needs a term, link here instead of redefining it.

## Identity Terms

| Term | Canonical Meaning |
| --- | --- |
| `libraryId:itemKey` | Zotero item binding. It identifies a Zotero item inside one Zotero library. It is not stable across deletion/reimport and must not be used as a durable intellectual-work ID. |
| `source_ref` | Sidecar key for a Zotero source item that has, had, or may have Synthesis artifacts. Format is `<libraryId>:<itemKey>`. It is the primary key for artifact sidecar rows and the source key on raw references. |
| `paper_ref` | Legacy-compatible public locator for a Zotero-bound paper. New Synthesis sidecar docs should prefer `source_ref` when the key denotes an artifact source item. |
| Artifact sidecar row | Lightweight sidecar row keyed by `source_ref` that records only whether digest, references, and citation-analysis artifacts exist plus their hashes/locators. It must not copy Zotero item metadata. |
| Raw reference | One reference entry extracted from a references artifact for a specific `source_ref` and `references_artifact_hash`. It is regenerable and becomes `stale` when that source artifact hash is replaced or disappears. |
| Canonical reference | Synthesis-owned dedupe representative for one or more raw references. It stores normalized identity evidence and redirects, but it is not a copy of a Zotero library item. |
| Canonical reference redirect | Durable sidecar fact that maps one canonical reference to another after dedupe, merge, or retarget review. Reads must resolve effective canonical references through redirects. |
| Reference binding | Accepted sidecar fact from a canonical reference to a current Zotero `libraryId:itemKey`. Automatic versus reviewed origin is provenance, not binding state. |
| Reference match proposal | Reviewable advanced-matcher candidate for a Zotero binding or canonical merge, with status `open`, `accepted`, `rejected`, or `superseded`. |
| `literature_item_id` | Legacy Registry identity term from the old library-index model. New sidecar documents should not allocate or depend on it for source items or reference cache refresh. |
| Registry binding | Legacy relationship between `literature_item_id` and Zotero item bindings. New design uses `reference_binding` for canonical-reference-to-Zotero binding and direct Zotero reads for source item facts. |
| Source artifact | A derived note/artifact produced by workflows such as `literature-digest`; Synthesis consumes it but does not own its generation contract. |
| External work node | Citation Graph node for an effective canonical reference that is not currently bound to a Zotero item. |
| Zotero Library SSOT | Zotero Library is the authoritative source for Zotero-owned facts: item existence, metadata, tags, collections, native relations, notes, and attachments. Synthesis may cache projections of those facts, but the cache is not a competing source of truth. |
| Artifact SSOT | Workflow artifacts stored in Zotero notes or embedded payload attachments are authoritative for digest/reference/topic output. Synthesis sidecar rows summarize or index them for speed. |

## Domain Terms

| Term | Canonical Meaning |
| --- | --- |
| Synthesis sidecar cache | Local Synthesis persistence that stores cache projections and user-approved derived decisions beside Zotero Library. It is allowed to be stale and must record enough basis/provenance for users and debug tools to understand that state. |
| Cache projection | Regenerable sidecar data built from artifact sidecar rows, raw references, canonical references, binding decisions, and direct Zotero reads where needed. A missing or stale projection should degrade UI features, not block core workflows. |
| Reference Sidecar Index | Zotero direct-read plus Synthesis sidecar join used by the Workbench Index view and read APIs. It is a cache/read model, not Zotero Library truth. |
| Sidecar Cache | Plugin-owned cache for artifact status, raw references, canonical references, redirects, bindings, and graph cache inputs. Zotero Library remains the source of truth for Zotero-owned facts. |
| Citation Graph Cache | Derived graph built from active raw references, effective canonical references, and reference bindings. It contains Zotero-bound source/reference nodes and external canonical reference nodes, but it is a cache for graph/query speed rather than a topic correctness dependency. |
| Topic artifact | User-facing synthesis result for a topic. It is owned by the Topics domain and should not be silently rewritten by reference sidecar or graph cache refresh. |
| Concept KB | Concept knowledge base used by Topics through bounded proposal ingestion and overlay context. It does not own topic artifacts. |
| Tag Vocabulary | Controlled or curated tags used as topic inputs and filters. Topics may depend on tags, but tags do not depend on topics. |
| Reference binding review | Explicit user-facing process that approves, rejects, merges, or repairs reference-to-Zotero-item binding decisions. Ambiguous binding/dedupe should live here, not in automatic library sync. |

## Freshness Terms

| Term | Canonical Meaning |
| --- | --- |
| Coverage | Diagnostic comparison between a topic artifact and the source artifacts it explicitly used. Coverage answers “what did this topic include?” |
| Source check | Explicit check that verifies whether a topic artifact’s cited/used source artifacts still exist and whether their relevant hashes changed. |
| Fresh | A topic artifact whose recorded source check passes. Fresh does not mean “all newly added papers have been considered.” |
| Changed source check | A source-check result showing that a topic artifact’s used sources changed or disappeared. Cache refresh alone must not mark a topic changed when library and artifacts are unchanged. |
| Stale | Technical derived-state term for cache projections, graph layout, basis guards, or review evidence guards. Do not use `stale` as the primary topic freshness/source-check state. |
| Discovery hint | Best-effort suggestion that a new/changed literature item might be relevant to a topic. It is not a freshness signal. |

## Runtime Terms

| Term | Canonical Meaning |
| --- | --- |
| Explicit cache refresh | User/debug-triggered operation that refreshes selected sidecar projections. For reference sidecar refresh, the operation is two-stage: artifact sidecar scan/diff first, then changed-reference extraction/dedupe/binding. |
| Dirty event | Removed implementation term from the old automatic synchronization model. Do not create, render, or replay dirty events in active Synthesis code. |
| Explicit operation progress | Current or recent user-visible progress row for a bounded explicit operation. It may be determinate or indeterminate, but it is not a worker queue item. |
| `registry_epoch` | Removed runtime truth marker from the old Registry rebuild model. New graph/reference cache basis uses source artifact hashes, binding decision version, policy version, scope, and refresh time. |
| Candidate registry epoch | Legacy/cache rebuild output that has not been promoted. It must not affect Workbench reads until validation and promotion succeed. |
| Last-known-good registry epoch | Previous promoted Registry cache basis retained so a failed or bad cache rebuild can leave or restore a usable graph/reference projection. |
| `graph_basis_registry_epoch` | Removed graph-basis field from the old Registry epoch model. New graph cache basis must not depend on Registry epoch truth. |
| Topic artifact version | Version/hash recorded by the Topics domain for a topic artifact. It is independent from Registry epoch. |
