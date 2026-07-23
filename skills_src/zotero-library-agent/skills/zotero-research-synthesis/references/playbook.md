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

## Derived-model decision records

Use a decision record when more than one Synthesis model could answer the question:

```text
research_question:
selected_model:
alternative_models_considered:
selection_reason:
source_scope:
model_identity_or_schema:
freshness_status:
paging_or_slice_boundary:
excluded_interpretations:
follow_on_read:
```

Examples of discriminating choices:

- choose topic membership to establish the paper set, then topic report for narrative synthesis;
- choose graph slice for a bounded neighborhood, metrics for computed structural properties, and source reads for scholarly interpretation;
- choose resolver when the paper set is defined by combined tags, collections, and refs rather than an existing topic;
- choose artifact manifest before artifact read, and read before export when content selection matters;
- choose attention queue only to prioritize review candidates, then diagnose the owning model before proposing maintenance.

Record rejected alternatives only when they were plausible and would have changed the interpretation. This keeps the decision auditable without turning every simple read into a planning artifact.

## Maintenance preconditions and receipts

| Maintenance operation | Required precondition evidence | Receipt fields to retain | Postcondition to inspect |
| --- | --- | --- | --- |
| Reference-sidecar refresh | Explicit paper scope and current sidecar diagnosis | Operation ID, successful/failed refs, retryability, basis hash | Sidecar status and per-paper result |
| Citation-graph update | Committed scope and compatible expected reference basis | Operation ID, scope, basis comparison, result partition | Graph status and requested slice/overview |
| Graph metric refresh | Existing graph state and missing/stale metric diagnosis | Operation ID, metric scope, approval, failures | Requested persisted metrics |
| Supported cache invalidation | Named cache scope and reason stale state cannot be read safely | Operation ID, invalidated scope, state change | Fresh read of the owning model |
| Topic create/update workflow | New seed for create or existing topic identity for update | Workflow run, interactions, terminal state | Topic identity, membership, report |

Interpret receipts conservatively:

- `stateChange: applied` means the declared operation changed state, not that every downstream model or export is now complete;
- partial success establishes only the successful partition and leaves failed refs outside freshness-sensitive claims;
- uncertain handle consumption requires receipt lookup before retry;
- a terminal workflow receipt still needs the promised topic, Product, report, or artifact inspection;
- a basis mismatch is a diagnostic boundary, not permission to omit the expected basis.

If the operation reports no change, distinguish “already current” from “scope empty” and “request rejected”. Only the first can satisfy a freshness precondition without another action.

## Export evidence matrix

| Export path | Identity before transfer | Byte-level evidence | Persistence claim allowed |
| --- | --- | --- | --- |
| Product asset download | Product ID and selected asset | Returned filename/media type, size, checksum when supplied | Local verified copy of that Product asset |
| Synthesis artifact export | Artifact manifest entry and requested format/filter | Export handle plus verified bytes | Local export of the named artifact |
| Workflow output file | Workflow run and output/artifact mapping | Output schema plus file checksum/size | Produced workflow artifact |
| Zotero attachment delivery | Live parent and attachment ref | Issued file handle plus verified bytes | Read copy of the existing attachment |
| Attach exported result to Zotero | Source Product/artifact, uploaded file handle, target parent | Source and upload checksums plus live child ref | Persisted Zotero attachment only after live confirmation |

An export manifest or file path proves discovery, not successful delivery. A verified local file proves delivery, not Zotero attachment. If the final bundle contains several assets, inventory each role and checksum and state which assets were intentionally excluded.

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
## End-to-end decision traces

These traces demonstrate how to select a synthesis basis, separate computed structure from scholarly evidence, and verify maintenance and export stages independently.

### Trace 1: Interpret a citation graph without overstating it

User utterance:

> What does the graph show about the relationship between these two research directions?

Interpretation:

- The user refers to a derived citation graph.
- Graph edges and clusters can support structural observations.
- Scholarly agreement, influence, causality, and conceptual similarity require source evidence beyond graph topology.

Preparation:

1. Resolve the exact graph or topic scope.
2. Record graph freshness and paging completion.
3. Resolve the relevant source items.
4. Inspect edge types, direction, provenance, and any metric definition.
5. Read source claims when the requested interpretation goes beyond structure.

Supported answer layers:

- Direct graph fact: which nodes and edges are present.
- Computed observation: clustering, centrality, or path under the declared algorithm.
- Source-grounded interpretation: what the cited papers claim.
- Agent inference: a qualified explanation tying them together.

Do not:

- call co-citation causal influence;
- call cluster membership scholarly agreement;
- treat a missing edge as no intellectual relationship;
- hide stale graph status.

Completed result:

```json
{
  "schema": "zotero-library-task.result.v1",
  "status": "completed",
  "summary": "Reported the verified citation-graph relationship and separated it from source-grounded interpretation; no causal or consensus claim was inferred from topology alone.",
  "evidence": [
    {
      "kind": "synthesis-graph",
      "ref": {
        "topicId": "topic-1",
        "graphVersion": "current"
      },
      "description": "The bounded derived model used for structural observations."
    }
  ]
}
```

### Trace 2: Diagnose, refresh, and synthesize a stale topic

User utterance:

> This topic is stale. Refresh it and tell me what changed.

Required boundaries:

- exact topic identity;
- source scope;
- which model is stale;
- maintenance operation;
- synthesis comparison;
- current maintenance authority.

Diagnosis:

1. Read topic status and source scope.
2. Inspect relevant index/graph/sidecar status.
3. Identify the exact stale model and basis.
4. Explain whether refresh can change topic content, graph state, or only an index.

Authority:

- Show the diagnosed maintenance proposal.
- Obtain current authority for that operation only.
- Do not treat the user's observation “stale” as permission for every maintenance command.

Execution:

1. Start the approved maintenance operation.
2. Preserve operation ID and pre-state.
3. Inspect the terminal receipt and committed basis.
4. Re-read the affected model.
5. Re-run the bounded synthesis read.
6. Compare supported pre/post facts.

Failure branch:

- Maintenance receipt reports success for sidecar refresh.
- Topic report has not been recomputed.

Result decision:

- Do not claim the topic is refreshed.
- Preserve the sidecar receipt.
- Return `failed` for the overall requested topic refresh and explain the missing stage.

```json
{
  "schema": "zotero-library-task.result.v1",
  "status": "failed",
  "summary": "The approved sidecar refresh completed, but the requested topic report was not recomputed or verified, so no current topic-change synthesis is claimed.",
  "evidence": [
    {
      "kind": "operation-receipt",
      "ref": {
        "operationId": "operation-1"
      },
      "description": "Completed sidecar maintenance only."
    }
  ],
  "diagnostics": [
    {
      "code": "topic_output_not_refreshed",
      "message": "A separate topic workflow or read is required before reporting topic changes."
    }
  ]
}
```

### Trace 3: Synthesize and export a research bundle

User utterance:

> Synthesize these papers into a gap map and export the bundle.

Visible stages:

1. Resolve and verify sources.
2. Build the gap synthesis.
3. Verify the gap-map artifact.
4. Produce or locate the declared Product/export.
5. Download and verify the selected asset.

Synthesis decisions:

- Fix the research question and corpus.
- Distinguish absent evidence from a supported gap.
- Preserve contradictory findings.
- State source-depth asymmetry.

Export decisions:

- Identify requested format.
- Inspect expected Product identity.
- Select asset by role and media type.
- Obtain current delivery handle.
- Verify local checksum and byte count.

Near misses:

- A local gap-map artifact is not the exported bundle.
- A Product record is not a downloaded asset.
- A terminal export workflow is not checksum verification.
- Missing papers cannot be silently converted into research gaps.

Completed result:

```json
{
  "schema": "zotero-library-task.result.v1",
  "status": "completed",
  "summary": "Synthesized the verified source set into a gap map, preserved evidence limitations, and downloaded the requested export asset with verified bytes.",
  "artifacts": [
    {
      "path": "/workspace/exports/research-gap-bundle.zip",
      "role": "research-bundle",
      "mediaType": "application/zip"
    }
  ],
  "evidence": [
    {
      "kind": "product",
      "ref": {
        "productId": "product-1",
        "assetRole": "research-bundle"
      },
      "description": "The inspected Product asset that issued the verified download."
    }
  ]
}
```

Recovery:

- If export fails after synthesis, preserve the synthesis artifact.
- Resume from Product/asset inspection.
- Do not rerun maintenance or synthesis unless their evidence is invalid.

## Synthesis conversation and decision patterns

Model-choice question:

> A topic report answers what themes and claims occur; the citation graph answers structural relationships. Which question should drive this synthesis?

Freshness disclosure:

> The source items are current, but the graph reports an older basis. I can answer from source text now or prepare a separate graph-maintenance proposal.

Gap disclosure:

> This source set does not report evidence on X. Because two relevant full texts are unavailable, I am labeling this a coverage gap rather than a research gap.

Maintenance disclosure:

> Refreshing the sidecar and updating the citation graph are separate operations with separate receipts. I will not treat one as completion of the other.

Export disclosure:

> The synthesis artifact is complete. Export remains a separate Product/asset delivery step and will be complete only after the selected bytes are verified.

A synthesis decision record should preserve:

- research question;
- included and excluded source refs;
- source evidence depth;
- model identity and status;
- claim and locator map;
- disagreement;
- missing coverage;
- workflow and maintenance stages;
- Products and artifacts;
- result status and diagnostics.

Do not use the decision record as authority to submit, maintain, persist, attach, or apply results.
