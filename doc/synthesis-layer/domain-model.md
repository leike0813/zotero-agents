# Synthesis Domain Model

The Synthesis Layer is a local, DB-first knowledge workbench. Its domains should stay loosely coupled so rebuilds and debugging remain predictable.

## Domain Ownership

| Domain | Owns | Does Not Own |
| --- | --- | --- |
| Platform Runtime | Workflow execution, Host Bridge, debug capability gating | Synthesis facts |
| Zotero Library | Zotero items, collections, relations, notes | Synthesis runtime state |
| Source Artifacts | Digest/reference/citation-analysis payloads attached to Zotero items | Topic artifacts or citation graph decisions |
| Paper Registry Cache | Current paper facts, bindings, artifact coverage, reference instances | Topic freshness or topic content |
| Citation Graph | Reference resolution, graph edges, metrics, layout state, external work nodes | Topic artifact validity |
| Tags | Tag vocabulary and tag assignments | Topic artifact ownership |
| Topics | Topic definitions, topic artifacts, source check, discovery review | Registry rebuild policy |
| Concepts | Concept cards and concept graph facts | Topic artifact source of truth |
| Workbench UI | Read models and user actions | Domain fact ownership |

## Dependency Direction

- Zotero Library and Source Artifacts feed the Registry Cache.
- Registry Cache feeds Citation Graph.
- Topics read Zotero Library and Source Artifacts during create/update; Graph metrics are optional enhancement only.
- Topics may read Tags and Concept overlays, but Topics own topic artifact validity.
- Concept KB may ingest proposals from topic workflows, but proposal ingestion is explicit and bounded.
- Workbench reads committed repository snapshots; it must not scan legacy files for normal UI state.

## Topics and Registry Decoupling

Registry rebuild must not automatically invalidate complete and fresh topics when library items and their source artifacts are unchanged. Topic freshness is based on the topic’s recorded source artifact dependencies, not on Registry row churn.

New or changed literature may create discovery hints, but discovery hints are not source-check signals. A topic remains fresh until its own recorded sources fail source check or the user explicitly updates the topic.

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
- Cross-domain actions should write bounded review items, dirty events, or diagnostics.
- User-approved durable overrides may survive rebuilds, but they must remain understandable and manageable by a user.
- If a design needs a new cross-domain dependency, add it here before implementing it.
