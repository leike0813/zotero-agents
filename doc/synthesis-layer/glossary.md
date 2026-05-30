# Synthesis Glossary

This file is the terminology SSOT. If another document needs a term, link here instead of redefining it.

## Identity Terms

| Term | Canonical Meaning |
| --- | --- |
| `libraryId:itemKey` | Zotero item binding. It identifies a Zotero item inside one Zotero library. It is not stable across deletion/reimport and must not be used as a durable intellectual-work ID. |
| `paper_ref` | Canonical public locator for a Zotero-bound paper. Format v1 is `<libraryId>:<itemKey>`, for example `1:EIMSDEU3`. API DTOs may carry `{ libraryId, itemKey }`, and parsers may accept older URI-like strings only as compatibility input, but new docs and artifacts use the v1 string. It is useful for Host Bridge lookup, UI/debug display, and historical topic source manifests; it is not a durable intellectual-work ID and must not be the default seed for canonical literature identity. |
| Identity anchor | Stable evidence used to choose or derive a `literature_item_id`. Accepted redirects and durable merge decisions have highest priority, followed by unique non-conflicting strong identifiers such as DOI, arXiv, ISBN, and stable canonical URL. A Zotero binding anchor derived from `paper_ref` is only a local fallback when no stronger work identity is available. |
| `literature_item_id` | Deterministic opaque Synthesis ID for one canonical literature/work record. Current format is `lit:<24 hex chars>`. It derives from the selected identity anchor, not from `paper_ref` by default. Strong work identifiers should produce the same ID whether the work is currently Zotero-bound or external-only. Binding-derived fallback IDs may later redirect to a stronger work identity when DOI/arXiv/ISBN/stable URL evidence or a user decision becomes available. Rebuild must resolve redirects, strong identifiers, current bindings, and fallback anchors before allocating any new provisional ID. |
| Registry binding | The relationship between a `literature_item_id` and zero or more current Zotero item bindings. Binding rows preserve `paper_ref` lookup/display semantics without making the binding key the canonical work identity. |
| Source artifact | A derived note/artifact produced by workflows such as `literature-digest`; Synthesis consumes it but does not own its generation contract. |
| External work node | Citation Graph node for a referenced work that is not currently bound to a Zotero item. It still needs stable identity through strong identifiers or a provisional reference key. |

## Domain Terms

| Term | Canonical Meaning |
| --- | --- |
| Paper Registry Cache | DB-backed cache of current library papers, artifact coverage, bibliographic identity, and reference facts. This replaces older “Index” wording for the core Synthesis base layer. |
| Literature Registry | Historical name. Use only when referring to old code or archived documents. Prefer Paper Registry Cache in new docs. |
| Citation Graph | Derived graph built from Registry reference facts and reference-resolution results. It contains library nodes and external work nodes. |
| Topic artifact | User-facing synthesis result for a topic. It is owned by the Topics domain and should not be silently rewritten by Registry or Graph rebuilds. |
| Concept KB | Concept knowledge base used by Topics through bounded proposal ingestion and overlay context. It does not own topic artifacts. |
| Tag Vocabulary | Controlled or curated tags used as topic inputs and filters. Topics may depend on tags, but tags do not depend on topics. |

## Freshness Terms

| Term | Canonical Meaning |
| --- | --- |
| Coverage | Diagnostic comparison between a topic artifact and the source artifacts it explicitly used. Coverage answers “what did this topic include?” |
| Source check | Explicit check that verifies whether a topic artifact’s cited/used source artifacts still exist and whether their relevant hashes changed. |
| Fresh | A topic artifact whose recorded source check passes. Fresh does not mean “all newly added papers have been considered.” |
| Changed source check | A source-check result showing that a topic artifact’s used sources changed or disappeared. Registry rebuild alone must not mark a topic changed when library and artifacts are unchanged. |
| Stale | Technical derived-state term for graph layout, epoch/basis guards, job/run markers, or review evidence guards. Do not use `stale` as the primary topic freshness/source-check state. |
| Discovery hint | Best-effort suggestion that a new/changed literature item might be relevant to a topic. It is not a freshness signal. |

## Runtime Terms

| Term | Canonical Meaning |
| --- | --- |
| Dirty event | Repository-backed work item indicating derived state should be recomputed. It is not an event-sourcing ledger. |
| Job progress | Current or recent user-visible progress row for background work. It may be determinate or indeterminate. |
| `registry_epoch` | Lightweight counter or marker advanced by Registry rebuilds that replace Registry facts. |
| Candidate registry epoch | Rebuild output that has not been promoted. It must not affect Workbench reads until validation and promotion succeed. |
| Last-known-good registry epoch | Previous promoted Registry basis retained so a failed or bad rebuild can leave or restore a usable state. |
| `graph_basis_registry_epoch` | Registry epoch used as the basis for a Citation Graph build/layout. A graph can be stale if its basis no longer matches the current Registry epoch. |
| Topic artifact version | Version/hash recorded by the Topics domain for a topic artifact. It is independent from Registry epoch. |
