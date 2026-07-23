# Research Synthesis Playbook

## Synthesis model selection

Choose the derived model according to the question:

| Model | Use for | Do not infer |
| --- | --- | --- |
| Topic list/membership | Topic discovery and paper membership | That membership proves agreement or relevance to every subquestion |
| Topic context/report/review input | Different read views for one identified topic | That one view contains the complete source record |
| Graph overview/slice | Global summary or a bounded neighborhood | Causality from connectivity |
| Layout/metrics/query cluster | Coordinates, computed metrics, or topic-scoped clustering | Scholarly endorsement from rank or proximity |
| External-reference/library-paper ranking | Candidate prioritization | Completeness of literature search |
| Library/reference index | Derived indexed records | Current bibliographic write state |
| Resolver | Paper scope from tags, collections, refs, and combine rules | Identity beyond the returned bounded set |
| Artifact manifest/read/export | Discovery, content access, and file delivery | Persistence in Zotero from local file existence |
| Attention queue | Ranked review candidates | Authority to remediate them |
| Concept/schema | Typed semantic definitions | Raw Zotero metadata search |

Resolve the selected topic, paper refs, graph scope, resolver selectors, artifact identity, or schema before interpretation. Record model identity and paging completion so another task can reproduce the source boundary.

## Source and freshness discipline

State the research question and inclusion rule before relating sources. For each conclusion, distinguish:

- direct bibliographic or source facts;
- recorded notes or annotations;
- plugin-derived topic, graph, index, resolver, or artifact facts;
- workflow-produced interpretation;
- your own comparison or inference;
- disagreement and missing evidence.

Inspect current cache and index status when the answer depends on freshness. A stale derived view can still be evidence of its recorded state but not of the newest library. Confirm current selections, attachments, permissions, Products, and any requested write through their live owning commands.

Preserve conflicting sources rather than averaging them into a false consensus. Explain whether a gap means “not found within the declared source boundary”, “not represented in the derived index”, or “source material was unavailable”.

## Workflow and maintenance boundaries

Use a workflow when the desired synthesis requires its declared reusable behavior, provider execution, or multi-artifact output. Describe requirements, validate the source selection and workflow options, validate provider profile independently, and submit only in a supported mode. Retain `workflowRunId`, relevant `skillRunId`, interactions, terminal state, and expected output identities.

Topic creation and update have different identity requirements: create from an explicit new seed; update only an identified current topic. A workflow terminal state is intermediate evidence until the requested topic report, topic ID, artifact, or Product is inspected.

Maintenance operations are separate contracts:

- reference-sidecar refresh updates its own source basis and returns an operation receipt;
- citation-graph update consumes a committed scope and expected reference basis;
- graph metric refresh repairs persisted complex metrics;
- cache invalidation affects only its declared supported scope;
- local resident index refresh is not a Synthesis index operation.

Run diagnostics before maintenance. Preserve each operation ID, approval, pre-state, post-state, successful/failed refs, retryability, and basis hash. If `stateChange` or handle consumption is uncertain, query that operation's durable receipt before another attempt.

## Ordered synthesis lifecycle

For a complete bounded research bundle, maintain independent stage evidence:

1. Acquire the intended literature scope and retain successful live item refs plus provenance.
2. Produce literature-analysis artifacts for the successful or explicitly selected parent items; keep per-paper failures visible.
3. Refresh the reference sidecar for the committed paper scope and retain its `reference_basis_hash` and result partition.
4. Update the citation graph with that expected basis hash. On mismatch, inspect sidecar status and decide whether a new refresh is warranted.
5. Create or update topic synthesis through the matching workflow and verify its topic identity and report.
6. Export the research bundle, identify the intended Product or artifact asset, download it, and verify file metadata or digest.

Each stage may be skipped only when current evidence already satisfies its precondition. Resume from the first missing stable receipt or artifact; never rerun earlier mutation or maintenance merely because a later export failed.

## Recovery and near misses

- A graph edge, cluster, or ranking is a computed relationship until source evidence supports a stronger claim.
- An empty topic/index/resolver result does not by itself justify maintenance; check scope and status first.
- A partial sidecar receipt excludes failed refs from graph claims that depend on refreshed references.
- A basis mismatch requires a new status decision, not bypassing the comparison.
- A paper-scoped graph update may require an existing graph; a deliberate library scope has a different effect and approval boundary.
- If a workflow needs user interaction, preserve its exact run/skill handle and request the decision rather than changing workflows.
- If a terminal run lacks its report, topic, Product, or artifact, return the missing-output failure with the run evidence.
- If the user asks to persist an interpretation in Zotero, present the proposed note, tag, relation, or file and route it to curation with new authority.
- Continuous topic refresh or queue monitoring belongs to the hosted facet, not this bounded task.
