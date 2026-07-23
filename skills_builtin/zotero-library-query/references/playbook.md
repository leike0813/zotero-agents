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
