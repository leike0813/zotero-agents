# Synthesis Domain Model

The Synthesis Layer is a local knowledge workbench over Zotero Library and workflow artifacts. Zotero Library and artifact notes are the primary sources of truth; Synthesis persistence is a sidecar cache plus user-approved derived decisions.

The detailed SSOT boundary lives in [Library SSOT and Sidecar Cache](./library-ssot-and-sidecar-cache.md). This document defines domain ownership after that boundary is applied.

## Domain Ownership

| Domain | Owns | Does Not Own |
| --- | --- | --- |
| Platform Runtime | Workflow execution, Host Bridge, debug capability gating | Synthesis facts |
| Zotero Library | Zotero items, metadata, collections, tags, native relations, notes, attachments | Synthesis sidecar cache or reference binding decisions |
| Source Artifacts | Digest/reference/citation-analysis payloads attached to Zotero items | Topic artifacts, graph decisions, or library facts |
| Synthesis Sidecar Cache | Artifact sidecar rows, raw references, canonical references, cache basis metadata, graph/read-model projections | Zotero Library facts, Zotero metadata copies, or continuous library synchronization |
| Reference Binding Decisions | User-approved reference dedupe, merge, canonical redirect, binding, rejection, and repair decisions with provenance | Zotero item metadata or native relation truth |
| Citation Graph Cache | Graph edges from active raw references, effective canonical references, bindings, metrics, layout state, external canonical nodes | Topic artifact validity or Zotero Library freshness |
| Tags | Tag vocabulary and tag assignments | Topic artifact ownership |
| Topics | Topic definitions, topic artifacts, source check, discovery review | Cache refresh policy |
| Concepts | Concept cards and concept graph facts | Topic artifact source of truth |
| Workbench UI | Read models and user actions | Domain fact ownership |

## Dependency Direction

- Zotero Library and Source Artifacts feed sidecar cache projections only through digest apply, explicit reference sidecar refresh, explicit binding repair, or explicit graph refresh.
- Artifact sidecar scanning records artifact existence/hash only; it does not persist a Zotero Library item index.
- Raw references feed canonical references, Reference Binding Decisions, and Citation Graph Cache.
- Zotero Library remains the SSOT for library facts even when a sidecar projection exists.
- Topics read Zotero Library and Source Artifacts during create/update; Graph metrics are optional enhancement only.
- Topics may read Tags and Concept overlays, but Topics own topic artifact validity.
- Concept KB may ingest proposals from topic workflows, but proposal ingestion is explicit and bounded.
- Workbench reads committed sidecar snapshots for speed and direct Zotero/artifact reads for correctness-sensitive source checks.

## Sidecar Cache Boundary

The old design tried to keep a Registry/Index layer continuously synchronized with Zotero. That model is no longer the target design.

Sidecar projections are allowed to be stale. They should record basis metadata such as `source_ref`, source artifact hash, extractor/matcher policy version, refresh time, and binding decision version where useful. Missing or stale sidecar state may disable graph metrics or show a refresh prompt, but it must not block `literature-analysis`, topic create/update, or topic source check.

Reference binding decisions are different from ordinary cache rows. They can contain user judgment and should be durable, reviewable, and removable. A cache rebuild may preserve or flag them as `needs_attention`; it must not silently overwrite them.

## Topics and Reference/Graph Cache Decoupling

Reference sidecar refresh and graph cache refresh must not automatically invalidate complete and fresh topics when library items and their source artifacts are unchanged. Topic freshness is based on the topic’s recorded source artifact dependencies and current Zotero/artifact reads, not on cache row churn.

New or changed literature may create discovery hints during digest apply or explicit repair, but discovery hints are not source-check signals. A topic remains fresh until its own recorded sources fail source check or the user explicitly updates the topic.

## Topics and Concepts Anti-Corruption

Topics and Concepts are related but not one shared domain. Detailed Concept KB behavior lives in [Concepts](./concepts.md); this section only defines cross-domain coupling.

All interaction uses explicit DTO boundaries:

| Direction | DTO | Producer | Consumer | Meaning |
| --- | --- | --- | --- | --- |
| Topics -> Concepts | `concept_card_proposal` / `topic_concept_link_proposal` | topic synthesis apply | Concept KB proposal ingestion | Candidate concepts, aliases, evidence, and topic links. Concept KB validates, merges, opens review, or materializes facts. |
| Concepts -> Topics | `concept_overlay_context` | Concept KB read facade | Topics UI / workflow context builder | Optional read-only context for overlay display and generation hints. It must not alter topic artifact text, source manifest, source check, or topic graph facts. |

Proposal ingestion boundary:

- Topic apply can submit proposals, but cannot directly write Concept-owned canonical facts.
- Concept ingestion failure should produce diagnostics/review and should not roll back a successfully applied topic artifact unless an explicit all-or-nothing host transaction was chosen.
- Concept review actions belong to Concept KB and cannot rewrite topic artifacts or topic graph relations.
- Repeated topic apply may produce duplicate proposals; Concept KB owns dedupe/merge/reject preservation.

Overlay boundary:

- Overlay is best-effort and bounded by topic id, concept ids, selected neighborhood, or request limit.
- Concept KB unavailable, empty, outdated, or diagnostic-only must not block Topic List/Detail/Create/Update.
- Overlay output must not be written into topic source manifest or source-check baseline.
- Overlay failure does not enqueue topic source-check work or concept rebuild work; explicit refresh/repair/debug commands do that.

Failure semantics:

| Scenario | Topics Behavior | Concept KB Behavior |
| --- | --- | --- |
| Concept KB empty | Topic functions normally; overlay area can show empty state. | No concept facts are created. |
| Concept KB read failed | Topic functions normally and records bounded diagnostic. | May expose retry/rebuild recommendation. |
| Concept proposal ingestion failed | Topic artifact apply remains successful by default; sidecar ingestion failure is diagnostic/review data. | Failed proposal can be retried; no partial concept fact is assumed. |
| Concept review action failed | Topic artifact remains unchanged. | Review item remains open/retryable. |
| Concept merge/delete removes overlay target | Topic artifact remains unchanged; next overlay read shows updated/empty context. | Concept KB maintains redirect/Needs Attention. |

## Boundary Rules

- No domain may mutate another domain’s user-facing facts as a side effect of a rebuild.
- Cross-domain actions should write bounded review items, explicit cache-refresh recommendations, or diagnostics.
- User-approved durable overrides may survive rebuilds, but they must remain understandable and manageable by a user.
- If a design needs a new cross-domain dependency, add it here before implementing it.
