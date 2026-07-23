# Research Task Model

## Scope

This reference owns decisions that cross the five bounded research domains. It assumes the coordinator contract is already loaded. Use it to choose a task owner, join task results, select workflow ownership, preserve portable evidence, and recover a multi-stage request. Exact CLI bindings remain in the bundled CLI Skill, while unattended supervision remains in the hosted Librarian facet.

## Routing decisions

| Requested outcome | Primary Skill | Inputs that must be resolved | Completion evidence |
| --- | --- | --- | --- |
| Identify current selection, search items, inspect notes or attachments, or answer from current library state | `zotero-library-query` | Question, live scope, freshness, result bound | Stable object refs, locators, completed pages, and a source-grounded answer |
| Discover literature, assess candidates, import approved records, resolve duplicates, or prepare sources | `zotero-literature-acquisition` | Inclusion rules, target library/collection, candidate provenance, write authority | Candidate rationale or verified acquired item/attachment state |
| Digest, extract, compare, or interpret one or more papers | `zotero-literature-analysis` | Resolved items/attachments, analytical lens, available source level | Source-located findings and declared report artifacts |
| Relate sources to a question, topic, claim, graph, gap, or research bundle | `zotero-research-synthesis` | Explicit source boundary, Synthesis model, intended deliverable | Traceable relationships, disagreement/gap report, or verified workflow output |
| Correct or organize metadata, tags, collections, notes, links, files, or readiness | `zotero-library-curation` | Live targets, current and desired state, mutation authority | Approved change receipt plus post-change live reads |

Route by the requested outcome, not by the first command that might be useful. “Find papers and compare their methods” is acquisition followed by analysis. “Which selected papers lack PDFs?” is query; “obtain those PDFs” adds acquisition. “Explain this topic and save the result as a note” is synthesis followed by curation. A request for recurring monitoring is not a Generic task: answer any bounded question, then leave scheduling to the hosted facet.

Resolve deictic language such as “this paper”, “these notes”, or “the selected collection” before routing a downstream operation. If a selected object is a note or attachment, retain its own identity and derive the top-level parent only for a contract that requires parent items.

## Task composition

Use one Skill when its completion condition directly satisfies the request. Compose only when one task's verified output is a declared input to another. Before starting a sequence, state:

1. each task owner and bounded outcome;
2. the stable identities and evidence that cross each boundary;
3. which stages are read-only and which introduce a new authority decision;
4. the artifact or live-state evidence that proves each stage finished;
5. the first safe resume point if a later stage fails.

Typical compositions include acquisition → analysis → synthesis, query → curation → query verification, and analysis → curation when the user separately requests writeback. Do not combine stages into an opaque “research workflow” that hides selection criteria, failed items, approvals, or intermediate evidence.

At a handoff, preserve stable Zotero refs, topic/Product IDs, workflow or operation handles, source locators, artifact roles, checksums returned by the mechanism, and diagnostics. Re-read live data when freshness matters, a handle expired, a predecessor was incomplete, or the next step can modify Zotero. A downstream task may narrow its input to successful predecessor items but must report excluded or failed subjects.

## Workflow execution ownership

Use a workflow only when its live description matches the intended outcome and declares the needed execution mode. Workflow discovery identifies candidates; requirements and validation determine whether the current selection and options are acceptable.

For Zotero-managed execution:

1. describe the workflow and its selection/options contract;
2. normalize only the selection identities required by that contract;
3. validate workflow input;
4. describe and validate the backend provider profile independently;
5. confirm provider compatibility and submit through the workflow join point;
6. retain `workflowRunId` and inspect the exact run until the bounded task reaches a result or needs interaction;
7. inspect expected Products, artifacts, and changed Zotero objects separately from terminal run status.

Use active/recent lists only for discovery. Target reply or connect with the returned `skillRunId`; inspect permissions without pretending the CLI can decide them. Treat notifications as lifecycle hints, not transcripts or authorization. On uncertain submission, search current/recent matching runs before creating another.

Choose self-owned agent execution when the workflow advertises support and the current agent will fulfill every downloaded request contract. It cannot carry Zotero-managed workflow options or a backend provider profile unless the live contract explicitly declares them.

## Agent-owned handoff

Prepare one handoff with an explicit selection or the declared no-selection form. Preserve `agentRunId`, all `agentRequestId` values, bundle path, checksum, lease facts, and output-contract locations.

For each request:

1. inspect the handoff bundle locally;
2. read the request input and its own output contract;
3. perform the bounded semantic work without inventing result files or namespaces;
4. assemble the result directory or ZIP exactly as declared;
5. run local result validation against that request's contract;
6. keep the validated request-to-result mapping until every required request is ready.

Local inspection and validation are structural preflight. They do not contact Zotero, renew the lease, consume the run handle, judge semantic quality, or authorize writeback. Do not apply a partial mapping merely because one request is complete unless the live apply contract explicitly permits it.

Apply the complete mapping with the original `agentRunId`. Zotero preflights all results before approval or handle consumption. Once execution begins, treat that handle as one-shot. On a failed, mixed, or uncertain response, read the apply-status receipt; it is authoritative for preflight rejection, applied requests, failed requests, state change, consumption, and recovery. Do not inspect this handoff through Zotero-managed run commands.

## Evidence, files, and Products

Every final result uses `zotero-library-task.result.v1`:

```json
{
  "schema": "zotero-library-task.result.v1",
  "status": "completed",
  "summary": "Compared three current abstracts within the requested scope.",
  "evidence": [{
    "kind": "zotero-item",
    "ref": { "libraryId": 1, "key": "ABCD1234" },
    "locator": "abstract",
    "description": "Source for one comparison row."
  }],
  "artifacts": [{
    "path": "comparison.md",
    "role": "report",
    "mediaType": "text/markdown"
  }]
}
```

`completed` requires the bounded outcome and its completion evidence. `canceled` identifies a missing decision, authority, input, or resolvable identity. `failed` records an attempted path that cannot finish safely. Diagnostics retain stable codes and actionable context.

Use inline evidence for source identity, locator, workflow/operation handle, approval outcome, or checksum-bearing delivery facts. Artifacts name files produced by the task; their paths are locators, not durable identity or proof of Zotero state. Do not create a second evidence envelope. Exclude tokens, authorization headers, cookies, full private transcripts, and unrelated attachment content.

Keep local paths, bridge-issued `fileId` values, Dashboard Product IDs, workflow artifacts, and Zotero attachments distinct. A terminal run does not imply a Product. A Product does not imply an attachment. A downloaded artifact does not prove writeback. Verify transferred bytes using returned checksum and size, and verify persisted state through the owning Zotero object.

## Multi-stage research lifecycle

A complete literature-to-synthesis request may contain these independently evidenced stages:

1. Search and ingest: validate the candidate boundary and provider profile, then retain provenance and successfully ingested item refs.
2. Literature analysis: run only for successful or explicitly selected parents; record digest, references, citation analysis, and failures per paper.
3. Reference-sidecar refresh: submit the successful paper scope, retain its operation ID, terminal receipt, basis hash, successful refs, and failed refs.
4. Citation-graph update: start a separate approved operation with the committed scope and expected basis hash; preserve its own receipt.
5. Topic synthesis: choose creation for a new seed or update for an identified topic, then verify the topic ID and requested report rather than run termination alone.
6. Research-bundle export: verify the intended Product, download its selected asset, and retain file metadata or digest.

Each approval belongs to its stage. Sidecar completion is not graph completion; graph completion is not topic completion; topic completion is not export evidence. Resume at the first stage whose stable completion evidence is missing, without replaying earlier mutating stages.

## Recovery and near misses

- A search hit, title, citation, or cached index row is a candidate until a live Zotero read confirms identity.
- An empty bounded search can be a completed answer; an unpaged or truncated search cannot establish absence.
- A failed or canceled task is a terminal boundary for that stage. Downstream work may continue only with explicitly valid successful subjects.
- A report may complete while a requested write remains unapproved. Return the report artifact and `canceled` for the pending mutation instead of claiming total completion.
- If a workflow finishes without the expected artifact or Product, retain the run evidence and report the missing deliverable.
- If a file handle expires, reacquire access from its owning attachment, Product, or artifact rather than guessing a path.
- If a scope change alters candidates or conclusions, request a new decision; do not silently broaden the task.
- If a user requests continuous surveillance, do not simulate residency with repeated polling. Route ongoing supervision to the hosted facet.
