# Design

## Workflow and skill

`export-research-bundle` is a core, automatic SkillRunner workflow with no selection. `paperTitle` and `researchContent` are required. `articleType` uses the same free-string/default contract as `manuscript-literature-framing`; count parameters default to 5 topics, 20 core papers, and 80 related papers.

The skill uses a run-local SQLite state machine with one gate entry. The runtime locks provider input, executes paged Host Bridge discovery, prepares bounded paper-assessment packets, persists receipts and evidence, handles remote artifact delivery, and renders the final selection. The agent owns query planning, Topic relevance, and paper semantic judgments; it cannot submit graph state, readiness, scores, or roles.

`SKILL.md` is the minimum complete executable contract. It directly contains the runner input and directory protocol, first gate command, valid gate actions, canonical stages, all agent-authored payload shapes and enums, Host/remote-delivery boundary, LLM/runtime responsibilities, selection policy, resume behavior, and success/cancellation envelopes. An agent must be able to complete or legally cancel a run after reading only `SKILL.md` plus the current gate-provided packet/schema. Short runtime, discovery, and paper-assessment references are not retained; those rules are required on the main path and therefore do not qualify for progressive disclosure.

## Selection

Related papers require semantic relevance of at least 0.45. Core score weights are 60% semantic relevance, 20% best graph importance signal, 15% topic coverage, and 5% material readiness. When graph state is unavailable or stale, weights become 80%, 15%, and 5% respectively and a warning is recorded.

Missing topic reports degrade the result. Zero related papers produces a business cancellation and no Product.

Topic coverage is computed from validated semantic Topic matches plus deterministic Topic source membership. Material readiness is 1.0 for source Markdown, 0.8 for PDF-only, and 0 otherwise. Graph importance is the maximum normalized foundation, frontier, PageRank, and in-degree signal. Core papers are always the highest-scoring prefix of the related set.

Candidate discovery merges library query results, selected Topic source papers, and Zotero-backed graph-cluster neighbors. The assessment budget is `min(250, max(50, 2 * maxRelatedPapers))`, split into batches of 20. Missing Topic, reference, artifact, graph, or readiness views degrade with diagnostics; missing/stale graph state never triggers maintenance. A remote artifact export pauses at the current gate until the declared bundle is downloaded and unpacked.

## Materialization

The apply hook validates the selection manifest, then reads current Zotero and Synthesis SSOTs. Every related paper receives portable metadata and every v2 digest, references, citation-analysis, and conversation payload. Core papers additionally receive preferred Markdown plus local images, otherwise preferred PDF. Missing optional material records warnings.

The hook uses atomic Product registration from the prerequisite change. The nested product manifest records selection provenance and integrity for every asset except itself.
