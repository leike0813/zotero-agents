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
6. branch on the returned admission contract: retain `workflowRunId` for direct admission, or retain `submissionId` for native host-queue admission and inspect the immutable unit projection until admitted tasks expose their real run identities;
7. inspect expected Products, artifacts, and changed Zotero objects separately from terminal run status.

For a queued admission, use the submission projection as the aggregate source of truth, the active queue only to observe or cancel still-pending units, and submission-filtered task discovery to correlate admitted work. Queue cancellation does not cancel an admitted run; after admission, target the real run through its normal control plane. Keep the native slot occupied through terminal execution and apply-back, and verify every promised Product, artifact, or live change independently.

The active native submission projection is process-local. If it is unavailable after Host restart, recover already-admitted work through submission-filtered task discovery and real run state, retain the original bounded source scope, and report which units can no longer be observed as pending. Do not synthesize replacement queue entries or automatically resubmit the unresolved remainder; a replacement submission is a new state-changing operation with a new authority boundary.

Use active/recent lists only for discovery. Target reply or connect with the returned `skillRunId`; inspect permissions without pretending the CLI can decide them. Treat notifications as lifecycle hints, not transcripts or authorization. On uncertain direct submission, search current/recent matching runs before creating another. On uncertain queued submission, inspect the original `submissionId` and its admitted tasks before creating another; absence of a run handle in the initial response is expected and is not permission to resubmit.

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

## Natural-language task intake

Use this extended intake when the user's wording combines several plausible research outcomes or when a default could materially alter the result.

### Outcome ladder

Ask what the user wants to possess at the end:

| Desired possession | Task interpretation |
| --- | --- |
| A direct answer about current Zotero content | Query |
| A set of external candidates with provenance | Acquisition, candidate-only |
| New or updated Zotero sources | Acquisition with a write stage |
| A digest, extraction, translation, or comparison | Analysis |
| A cross-source claim map, gap analysis, topic, graph interpretation, or export | Synthesis |
| Changed metadata, tags, notes, collections, files, links, or applied results | Curation |
| Recurring reports or ongoing supervision | Hosted facet after any finite task |

Do not infer the desired possession from the verb alone. “Collect” can mean make a reading list, import citations, or obtain attachments. “Analyze” can mean summarize one item, compare a set, or synthesize a field. “Save” can mean return an artifact or persist it in Zotero.

### Scope ladder

Resolve scope from the narrowest stable source:

1. Explicit stable Zotero refs supplied by the user.
2. Live current selection when deictic wording is used.
3. Explicit collection or topic identity.
4. Bounded live library query.
5. Bounded external search criteria.

Do not fall through to a broader step when a narrower step is ambiguous. An empty current selection requires a question; it does not authorize a whole-library search. An ambiguous title requires candidate disambiguation; it does not authorize selecting the first match.

### Freshness ladder

Choose the freshness basis needed by the conclusion:

- Current library object for present metadata, membership, notes, or attachment state.
- Current workflow/run/operation receipt for execution claims.
- Current Product or artifact read for deliverable claims.
- Current derived-model status for Synthesis interpretation.
- Historical snapshot only when the user explicitly asks about past state.

Cached indexes and prior task results may narrow discovery but cannot replace a live read where current state controls the answer or write.

### Evidence-depth ladder

State the strongest available basis per source:

1. Metadata only.
2. Abstract.
3. Note or annotation.
4. Partial content or OCR.
5. Delivered full text.
6. Workflow-produced analysis inspected against its sources.

Never average these into a vague “papers were analyzed.” Mixed depth must remain visible in comparisons and synthesis. Ask whether the user accepts a weaker basis when it changes what can responsibly be claimed.

### State-change ladder

Escalate authority one boundary at a time:

1. Read.
2. Candidate or change proposal.
3. Workflow/provider validation.
4. Current submission or mutation authority.
5. Zotero-side approval when declared.
6. Durable receipt.
7. Live post-state verification.

Evidence from an earlier rung does not authorize the next. A candidate report does not authorize import, a valid workflow does not authorize submit, an uploaded file does not authorize attachment, and a generated result does not authorize apply-back.

### Default disclosure

When using a safe default, state it in one sentence before execution or in the final answer:

> I will use the current live library, keep this pass read-only, search the named collection, and return a conversational answer; I will report if the available evidence is weaker than full text.

Do not burden the user with defaults that have no material effect. Do expose any default governing scope, freshness, evidence, deliverable, cost/provider, or state change.

## Visible multi-stage plans

Use a stage table when more than one task owner is required.

| Stage | Owner | Input evidence | Output evidence | New authority | Resume point |
| --- | --- | --- | --- | --- | --- |
| 1 | Task Skill | Stable sources or criteria | Task-specific verified result | None or exact new effect | First missing fact |

Populate every row before the first state-changing call. A read-only first stage may begin while later write stages remain explicitly pending.

### Composition rules

- A stage has exactly one domain owner.
- The coordinator owns ordering and handoff, not the domain decision.
- Each stage has its own bounded completion evidence.
- A downstream stage consumes only successful, explicitly valid subjects.
- Failed or excluded subjects remain in diagnostics.
- Every new state change receives a fresh authority decision.
- Recovery starts at the first stage lacking durable completion evidence.

### Handoff record

Carry only fields required by the next task:

- stable Zotero refs;
- selection or collection identity;
- source-depth record;
- source locators;
- candidate provenance;
- Product/artifact role and verified path;
- workflow, run, operation, or apply-back handle in its original type;
- structured diagnostics;
- the predecessor's declared completion boundary.

Do not carry:

- bearer tokens or provider credentials;
- private storage paths;
- speculative refs;
- prior approval as reusable authority;
- a title in place of a stable identity;
- a terminal run state in place of output evidence;
- a local artifact in place of live Zotero state.

### Plan updates

Update the plan when:

- identity resolution changes the subject set;
- requested evidence is unavailable;
- workflow availability or input contract changes the execution path;
- a batch must be split;
- a user denies or narrows authority;
- partial success changes the next valid input set.

Report the update before continuing. Do not silently substitute a new provider, workflow, source set, derived model, target collection, or write effect.

### Completion across stages

The coordinator returns `completed` only when every requested stage is complete. If a finite read or report completed but a later requested write lacks authority, preserve the valid artifact/evidence and return `canceled` for the overall request. If an attempted later stage fails, return `failed` while retaining earlier completed evidence.

Do not invent a `partial` status. Use summary, evidence, artifacts, and diagnostics to preserve the partial facts within the three-state contract.

## End-to-end compositions

### Composition 1: Find, analyze, and add to a collection

User: “Find ten recent papers on multimodal retrieval, summarize their methods, and add them to my project collection.”

Interpretation:

- acquisition criteria need a concrete date window, source coverage, result bound, and preprint policy;
- analysis needs a verified source set and acceptable evidence depth;
- collection membership is a separate curation write;
- import and collection changes require current authority.

Visible plan:

1. Acquisition prepares candidates, checks live duplicates, and obtains approval for any import.
2. Analysis consumes only verified item/attachment refs and reports method evidence per source.
3. Curation proposes collection membership for successfully verified items.

Authority:

- Candidate discovery is read-only.
- Import authority does not automatically include collection changes.
- Collection approval occurs after the final resolved item set is known.

Completion:

- Candidate set has provenance and duplicate decisions.
- Imported or existing items are live-verified.
- Analysis has source locators and visible evidence gaps.
- Collection membership is re-read after the approved change.

Recovery:

- If two imports fail, analyze the eight valid items only if that still meets a disclosed bounded outcome.
- Preserve the failed candidates.
- Do not re-import successful items when retrying the residual two.

### Composition 2: Explain selected papers and save a note

User: “Compare these papers and save the result as a note.”

Interpretation:

- Query resolves the current selection.
- Analysis compares the resolved sources.
- Curation writes the verified artifact as a note.

Required clarification:

- If the selection is empty or heterogeneous, ask which papers are intended.
- If only some full texts are available, ask whether a mixed-depth comparison is acceptable.
- Resolve the note's target parent and replacement/append behavior.

Completion:

- The comparison artifact exists and is source-grounded.
- The note proposal names the exact target and content role.
- Approval is current.
- The live note is re-read after write.

Near miss:

- A completed comparison does not prove the note exists.
- A local Markdown artifact is not a Zotero note identity.

### Composition 3: Refresh a topic and export it

User: “The topic looks stale; refresh it and export the latest synthesis.”

Interpretation:

- Query/synthesis first diagnoses topic identity, source scope, and model freshness.
- Maintenance is a distinct approved operation.
- Synthesis verifies the refreshed topic report.
- Export verifies Product or artifact delivery.

Required decisions:

- exact topic;
- stale model and scope;
- maintenance effect;
- export format and destination.

Completion:

- Maintenance receipt identifies changed subjects and committed basis.
- Topic/report is inspected after maintenance.
- Expected Product or artifact exists.
- Download checksum and byte count are verified.

Recovery:

- An empty topic result does not authorize maintenance.
- Maintenance success does not prove export completion.
- Retry begins from the first missing receipt or output, not from topic creation.

### Composition 4: Library absence followed by external discovery

User: “If my library does not contain work on X, find some for me.”

Interpretation:

- Query must complete the bounded library search before stating absence.
- Acquisition begins only if the query supports the condition.
- “Find” defaults to a candidate report, not import.

Completion:

- Query reports library/collection scope, filters, and paging completion.
- Acquisition reports external source coverage, candidates, provenance, and live duplicate status.

Near miss:

- A first-page miss does not trigger acquisition.
- A candidate report does not claim Zotero items were added.

### Composition 5: Persistent monitoring request

User: “Keep an eye on new papers and tell me every week.”

Interpretation:

- Generic may perform one bounded current acquisition query if requested.
- The recurring schedule and resident state belong to the hosted facet.

Handoff:

- topic criteria;
- source coverage;
- reporting threshold;
- target library/collection;
- allowed read/write authority;
- the current finite result.

Do not loop, sleep, poll indefinitely, or claim a schedule was created. The hosted facet must still distinguish its one-pass service from external cron configuration.
