# Library Query Playbook

## Context and identity

Classify the request before reading:

| Request form | First resolution | Identity evidence |
| --- | --- | --- |
| “this paper”, “these notes”, “selected items” | Current Zotero context and selection | Ordered returned object refs and current pane facts |
| Known key, library ID, collection, topic, Product, run, or artifact | Direct live lookup | Exact returned identifier and object kind |
| Title, citation, author phrase, tag, or natural-language description | Bounded candidate search | Search boundary plus candidate refs; detail read for the chosen object |
| Complete inventory by collection/tag/type | Deterministic list | Filters and every accepted page |

Keep note and attachment identities distinct from their parent items. Normalize to top-level parents only for a downstream operation that declares parent inputs. Navigation to a known object changes the visible Zotero context but is not a metadata mutation and does not validate a guessed identifier.

When a current selection is empty, ask for an explicit target if the question depends on it. If the question is independent of UI context, continue with its declared library scope. When a returned ref is stale, re-read context or search candidates; never choose a replacement solely by title similarity.

## Library discovery and paging

Use relevance-ranked search for a finite candidate set. Use deterministic list operations when the user requests a collection/tag/type inventory or an exhaustive bounded enumeration. Fetch item detail only after selecting a stable candidate. A snapshot is suitable for constructing a local metadata mirror, not for asserting the newest fields of one item.

Record the filters, sort/ranking basis when exposed, result limit, accepted item refs, and cursor state. Continue every required `nextCursor` or offset until completion. If the query is intentionally bounded before exhaustion, say what was not traversed. On interruption, keep the accepted pages and resume from the last cursor without merging the previous page again.

An empty result is meaningful only with an explicit boundary and completed paging. A search candidate can support “this may match”; detailed metadata requires a current item read. For comparisons, resolve every compared object and use equivalent fields or locators so missing data is visible rather than silently imputed.

## Notes, attachments, and readiness

Read child notes and attachments as separate collections after resolving their parent. A note body may be chunked: continue through the returned offset/limit until the requested portion is complete. Embedded note payloads require payload discovery followed by selection of an explicit payload ID/type; do not infer structured payloads from note HTML.

Use annotation lists for structured annotation records and export when the requested evidence must be portable. Preserve page, position, quote, comment, color, or other returned locators. Annotation reads do not create authority to edit annotations.

Attachment metadata and bytes are different evidence. Preserve an accessible attachment's issued file handle and follow its download contract. Verify checksum and byte count before analyzing or quoting delivered bytes. If access is unavailable, report the attachment record and structured reason without reading Zotero storage directly.

Use focused readiness reads for missing PDF, source Markdown, or literature-analysis artifacts; use a combined audit when the question needs several checks together. Readiness identifies missing material but does not fetch, convert, analyze, attach, or repair it. For “selected papers missing PDFs”, resolve and normalize the selected parents, constrain the audit to them when supported, and return the missing set without starting remediation.

## Synthesis and answer evidence

Choose the derived model that matches the question:

- topic list and paper membership establish topic scope;
- topic context, report, and review input expose different views of one topic;
- graph overview, slice, layout, metrics, query cluster, and rankings answer different graph questions;
- library/reference indexes provide derived records and explicit paging;
- resolver converts declared selectors into a bounded paper set;
- artifact manifest discovers files, artifact read exposes selected content, and filtered export delivers bytes;
- attention queue ranks review candidates but does not authorize action;
- concept and schema reads expose typed semantic models rather than raw bibliographic search.

Record topic IDs, paper refs, graph/index cursor completion, resolver selectors and combine mode, artifact name/checksum, and model/schema identity. A graph edge or cluster can be computed structure rather than a causal claim. If a derived view may be stale, inspect its status before drawing a freshness-sensitive conclusion; do not initiate maintenance just because a query is empty.

Build the answer from the smallest sufficient evidence set. Mark direct Zotero facts, quoted source text, derived plugin state, and your inference separately. For a concise answer, one evidence entry may support a material claim; for comparison, carry every compared source and its locator or inspected field.

## Query decision matrix

Use this matrix when a request can plausibly map to several read surfaces:

| User intent | Preferred first read | Expand only when | Evidence boundary |
| --- | --- | --- | --- |
| Identify the current paper or selection | Current context and selection | The returned object is a child, stale, or insufficiently detailed | Current pane facts plus ordered live refs |
| Find a known work | Direct key/ID lookup, then bounded search on miss | Several candidates remain plausible | Exact identity fields for the selected candidate |
| Inventory a collection, tag, or type | Deterministic list | Paging is incomplete or child objects are separately requested | Filters, sort, accepted pages, terminal cursor |
| Answer a content question | Item and attachment resolution, then delivered content | The answer needs notes, annotations, or another attachment | Verified file plus section/page/chunk locators |
| Summarize reader activity | Notes and annotations | Embedded payloads or portable export are requested | Child identity, author/reader distinction, positions |
| Explain a topic or relationship | Topic, resolver, graph, or index model matching the question | Freshness or provenance affects the conclusion | Model identity, scope, cursor and status |
| Locate a generated output | Product or artifact discovery | The user needs content or bytes rather than identity | Record/manifest identity followed by selected asset evidence |
| Check whether work is ready | Focused readiness read or combined audit | The user separately asks for remediation | Declared checks and bounded missing set |

When several rows apply, resolve identity once and reuse the returned refs. Do not broaden from a bounded query into a library-wide inventory merely because a narrower result is empty.

## Evidence delivery contracts

For a factual answer, carry an evidence record at the granularity needed to reproduce each material claim:

```text
claim: the bounded statement supported by this record
source_kind: live-item | note | annotation | attachment-bytes | derived-model | workflow-artifact
source_identity: stable item/note/attachment/topic/artifact ref
locator: field, page, section, chunk, annotation position, or model query
retrieval_boundary: filters, cursor completion, file checksum, or model scope
interpretation: none, comparison, or explicit agent inference
limitation: unavailable pages, stale status, mixed source levels, or unresolved identity
```

For inventories, one query-level record may cover paging and filters while each exceptional item gets its own note. For quotations or close paraphrases, preserve the source locator even when the final response is short. For byte-backed content, attach checksum and size to the file evidence rather than repeating them on every claim. For negative findings, the evidence is the completed search boundary, not the absence of a remembered item.

When sources disagree, emit separate records and state the comparison rule. When a derived model points to a paper, treat the model result as discovery evidence and use a live item or source read for claims that depend on current bibliographic or textual content.

## Escalation and handoff

Hand off only the unresolved operation and carry the read evidence already established:

| Boundary crossed | Destination task | Handoff payload |
| --- | --- | --- |
| Candidate discovery becomes import or attachment acquisition | Literature acquisition | Search boundary, candidate IDs, live duplicate checks, requested target |
| Factual lookup becomes close reading or comparison | Literature analysis | Resolved refs, available source levels, analytical question, inspected locators |
| Library facts become topic/graph/report construction | Research synthesis | Bounded paper set, question, current derived-model status, required output |
| Read result becomes metadata, tag, collection, note, file, or Product change | Library curation | Exact live targets, current values, proposed effect, correction evidence |
| The user requests recurring observation or unattended remediation | Hosted monitoring facet | Watch scope, cadence or trigger, alert threshold, allowed actions |

The handoff does not inherit write, workflow-submission, or maintenance authority. If the target task cannot preserve the established identity, return the ambiguity instead of re-resolving silently. When the read itself is complete but the follow-on operation is blocked, deliver the answer and describe the separately blocked stage.

## Recovery and near misses

- If an item has no accessible full text, an abstract answer may still be useful only when labeled as abstract-based.
- If an attachment handle expires, request current access from its owning attachment instead of retaining or guessing a local path.
- If note chunking or paging fails, return accepted content and the exact resume position rather than restarting silently.
- If the question crosses into import, repair, writeback, or workflow submission, complete the read evidence and hand the new operation to acquisition, curation, or synthesis with a fresh authority check.
- If privacy requires withholding attachment text, cite the source identity and locator without exposing unnecessary content.
- If a cached resident index finds a likely object, use it as a lead and confirm the answer with a live read.
## End-to-end decision traces

These traces show how to apply the executable query contract when the user's wording, evidence, or recovery path is not straightforward. They are examples of decisions, not alternate hard rules.

### Trace 1: “Help me understand this paper” with no selection

User utterance:

> Help me understand this paper.

Interpretation:

- The task may be a bounded query or a deeper analysis.
- “This paper” depends on live current selection.
- No item identity can be inferred from conversation context alone.
- No state change is requested.

First action:

1. Read current Zotero selection.
2. If exactly one bibliographic item or one child with a resolvable parent is selected, preserve both child and parent identities.
3. If selection is empty, ask the user to select or identify the paper.
4. If several papers are selected, ask whether all are intended and whether the user wants a simple answer or comparison.

Do not:

- search the whole library for a recently mentioned title;
- choose the first visible item;
- turn an attachment into its parent without recording the attachment;
- begin a deep-reading workflow before the intended object and outcome are known.

Possible clarification:

> I do not have an unambiguous current Zotero selection. Which paper should I use, and do you want a concise answer or a source-located analysis?

Pending behavior:

- Use the Runner pending branch because a concrete identity and outcome decision is required.
- Do not emit a business result while waiting.

Canceled result when the identity cannot be supplied:

```json
{
  "schema": "zotero-library-task.result.v1",
  "status": "canceled",
  "summary": "Stopped before reading because no unambiguous Zotero paper was selected or identified.",
  "diagnostics": [
    {
      "code": "source_identity_required",
      "message": "Select one paper or provide a stable Zotero item reference."
    }
  ]
}
```

Resume point:

- Re-read the current selection after the user's answer.
- Do not reuse a stale empty selection result.

### Trace 2: “My library has no papers about X, right?”

User utterance:

> My library has no papers about federated multimodal retrieval, right?

Interpretation:

- The user asks for a negative conclusion.
- A first page, cached index, or fuzzy title search is insufficient.
- The relevant scope may be the whole current library or a named collection.
- Terms may appear in title, abstract, tags, notes, or full text; the requested search depth must be bounded.

Clarification/default:

- If no collection is named, disclose use of the current library.
- Ask whether metadata/abstract search is sufficient if full-text coverage would materially change the answer.
- Declare synonyms and filters used.

Execution:

1. Resolve the live library scope.
2. Run the narrow semantic search.
3. Complete all required pages.
4. Inspect plausible matches rather than rejecting them from snippets.
5. Record the final cursor/offset completion.
6. Distinguish “no matches in searched fields” from “no relevant work exists.”

Evidence record:

- library identity;
- filters and query terms;
- page count and terminal paging fact;
- plausible candidates inspected;
- source fields covered;
- freshness timestamp or live-read fact.

Human-facing answer:

> I found no matching items in the current library across the declared metadata and abstract fields after completing all pages. This does not establish absence from inaccessible full text or external literature.

Completed result:

```json
{
  "schema": "zotero-library-task.result.v1",
  "status": "completed",
  "summary": "Completed the bounded current-library search and found no matches in the declared metadata and abstract fields.",
  "evidence": [
    {
      "kind": "library-query",
      "ref": {
        "scope": "current-library",
        "pagingComplete": true
      },
      "description": "The exhaustive boundary supporting the negative answer."
    }
  ]
}
```

Near miss:

- If paging stops after one page, return `failed` with the accepted cursor and do not state absence.

### Trace 3: Interrupted attachment delivery

User utterance:

> Read the results section of this PDF and tell me the main numbers.

Interpretation:

- The answer requires delivered full-text bytes, not attachment metadata.
- The selected attachment and parent item must both remain identifiable.
- The task is read-only.

Execution:

1. Resolve the selected attachment.
2. Inspect attachment metadata and confirm readable media type.
3. Request bridge-mediated file delivery.
4. Download to the declared local artifact path.
5. Verify checksum and byte count.
6. Read only the requested results section and preserve page locators.

Failure:

- The file handle expires after metadata inspection but before verified download.

Recovery decision:

- Preserve the attachment ref and failed transfer diagnostic.
- Reacquire file access from the same attachment.
- Do not guess a Zotero storage path.
- Do not substitute another attachment with a similar filename.
- If the second delivery fails, return `failed`.

Failed result:

```json
{
  "schema": "zotero-library-task.result.v1",
  "status": "failed",
  "summary": "Could not answer the results-section question because the selected attachment bytes were not successfully delivered and verified.",
  "evidence": [
    {
      "kind": "attachment",
      "ref": {
        "libraryId": 1,
        "key": "ATTACH01"
      },
      "description": "The resolved source attachment; its content was not claimed as read."
    }
  ],
  "diagnostics": [
    {
      "code": "attachment_delivery_failed",
      "message": "File access expired and safe reacquisition did not complete."
    }
  ]
}
```

Unsafe alternative:

- Answering from the abstract, a prior digest, or a similarly named local file without obtaining the user's agreement to a weaker basis.

## Conversation and result patterns

Use a short clarification when one user decision unblocks the task:

> I found two Zotero items with that title. Should I use the 2023 conference paper or the 2024 journal version?

Use disclosed defaults when clarification would not materially change the bounded read:

> I will search the current library, keep the task read-only, and return a conversational answer. I will report if only metadata or abstract evidence is available.

Use limitation-first wording when evidence is asymmetric:

> The first two claims are supported by delivered full text. The third paper was available only as an abstract, so I have not compared its implementation details.

Use recovery wording that names the preserved state:

> Three pages were accepted before the cursor failed. I preserved the last accepted cursor and will resume from the returned continuation rather than repeat the completed pages.

Do not use:

- “Zotero says” when the fact came from your interpretation;
- “I read the PDF” when only metadata was inspected;
- “there are no papers” when the search boundary is incomplete;
- “the workflow produced it” when the Product or artifact was not inspected;
- “the graph proves” for a computed relationship.

Before returning, ensure the summary, inline evidence, optional artifacts, and diagnostics tell the same story. A conversational answer can be richer than the summary, but it cannot contradict the machine result.

## Extended query decision record

For a complex query, keep one compact record while working:

| Field | Record |
| --- | --- |
| User question | The exact bounded question |
| Scope | Library, collection, selection, topic, run, Product, or operation |
| Identity evidence | Stable refs and candidate-resolution facts |
| Freshness | Live reads and derived-model status |
| Source depth | Metadata, abstract, note, partial content, or verified bytes |
| Paging | Filters, accepted pages, terminal cursor, and resume position |
| Privacy | Content needed and content deliberately excluded |
| Claims | Direct facts, source text, derived output, and interpretation |
| Deliverable | Conversation answer or verified artifact |
| Status | Completed, canceled, or failed with reason |

This record is working memory, not a second result envelope. Transfer only the relevant evidence, artifact, and diagnostic fields into `zotero-library-task.result.v1`.

If the task hands off:

- to analysis, include exact source refs, attachment identity, delivered evidence level, and question;
- to synthesis, include the verified source/model boundary and unsupported claims;
- to curation, include live before-state evidence and requested desired state, but no implied authority;
- to hosted supervision, include the finite query result and monitoring criteria, not an invented schedule.

Delete speculative candidates from the handoff while retaining a diagnostic explaining why they were excluded.
