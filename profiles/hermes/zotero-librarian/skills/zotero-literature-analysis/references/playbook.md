# Literature Analysis Playbook

## Source availability and evidence levels

Establish the strongest current source level for every item before choosing analytical claims:

| Available source | Suitable claims | Required limitations |
| --- | --- | --- |
| Bibliographic metadata | Identity, publication facts, indexed fields | No claims about unexposed methods or results |
| Abstract | Stated purpose, high-level methods/results in the abstract | Label as abstract-based; no full argument reconstruction |
| Notes or annotations | Recorded excerpts and reader observations | Preserve note/annotation identity and distinguish author text from commentary |
| OCR or partial content view | Claims visible in available chunks | Mark missing pages, recognition uncertainty, and discontinuities |
| Delivered full text | Questions supported by inspected sections | Preserve page/section/chunk locators and file verification facts |
| Generated digest or analysis artifact | Prior interpretation and declared source basis | Treat as secondary unless the current task explicitly analyzes that artifact |

Resolve edition, translation, version, and attachment identity before combining sources. When an item has several attachments, identify which one supplied the evidence. Verify delivered bytes according to the file contract and avoid exposing broader private content than the question requires.

## Analysis procedure

1. Convert the request into explicit analytical questions and, for comparison, stable dimensions applied to every source.
2. Resolve the item set and available evidence level per item.
3. Extract relevant passages, fields, annotations, or observations with locators.
4. Separate what the source states from your interpretation, methodological assessment, comparison, and uncertainty.
5. Test conclusions against contradictory passages and missing data rather than filling gaps from expectation.
6. Produce the requested deliverable and attach inline source evidence to material claims.

A paper digest should be shaped by the requested purpose, not by a generic template when the user asked a focused question. A comparison matrix uses equivalent criteria and shows `not available` rather than silently changing dimensions. Citation or reference analysis distinguishes cited-record metadata, citation context, and your inference about influence.

For annotation review, retain quote, comment, color/category, page or position, and parent item where returned. Reader annotations can provide evidence of what was marked or noted; they do not necessarily state the paper author's claim.

## Workflow-produced analysis

Use a declared literature-analysis workflow when it provides a stable multi-artifact contract, background provider execution, or repeated per-paper processing. Describe and validate current inputs before submission. For multiple papers, default to serial or explicitly bounded concurrency so provider limits and per-item receipts remain attributable.

Monitor each submitted Zotero-managed run by its `workflowRunId`. Record successful and failed parent refs independently. Where the workflow promises a digest, structured references, and citation analysis, inspect each expected artifact rather than accepting the terminal run status as sufficient.

For self-owned execution, follow the coordinator's handoff contract: inspect every request, produce outputs against each request's schema, validate them locally, and apply only through the reviewed mapping. The analytical quality decision remains with the agent even after structural validation succeeds.

## Deliverables and completion evidence

Common deliverables include:

- a focused digest with source identity and evidence level;
- an extraction table with locators and uncertainty;
- a cross-paper comparison using stable dimensions;
- a method/result/limitation analysis;
- an annotation-derived claim map;
- a report artifact plus inline evidence for its material conclusions;
- validated workflow artifacts for each successful paper.

Declare file artifacts with path, role, and media type. When the mechanism supplies checksum or byte count, carry it in source-oriented evidence. A local report is evidence that analysis was produced, not that Zotero contains it. If the user requests a Zotero note, attachment, tag, or metadata update, finish the analysis artifact first and route the separate write to curation.

Completion requires the requested analytical dimensions, explicit unavailable evidence, traceable conclusions, and a clear distinction between extraction and inference. A smaller truthful answer is preferable to a broad report that implies unread content.

## Analytical deliverable patterns

Select a pattern by the decision the user needs:

| Deliverable | Internal structure | Evidence emphasis |
| --- | --- | --- |
| Focused paper digest | Question, answer, supporting passages, limitations | Strongest available source level and exact locators |
| Method extraction | Population/data, design, variables, procedure, analysis, validity limits | Parallel fields; `not available` where absent |
| Result extraction | Outcome, estimate/direction, conditions, uncertainty, author interpretation | Tables/figures/sections and unit of analysis |
| Cross-paper comparison | Stable dimensions, per-paper entries, convergences, contradictions | Equivalent source levels or visible asymmetry |
| Claim-evidence map | Claim, source statement, evidence type, support/challenge relation | Separate author claims from agent inference |
| Annotation synthesis | Reader theme, quoted/marked passages, comments, open questions | Annotation identity, position, and parent source |
| Workflow artifact audit | Expected output, schema validity, source basis, content adequacy | Run identity plus each inspected artifact |

A deliverable can combine patterns, but each section should retain one evidence grammar. For example, a comparison may contain short digests, yet its conclusions must still point to the shared comparison dimensions rather than the prose summaries alone.

For structured outputs, choose stable field names before extraction. For narrative outputs, create an internal evidence table first when the answer spans multiple papers or source levels; this prevents polished prose from hiding missing support.

## Comparison and contradiction handling

Build a comparison frame before interpreting results:

```text
comparison question:
unit of comparison:
dimensions:
source level per item:
normalization decisions:
missing-value policy:
contradiction test:
```

Classify apparent disagreement before calling it a contradiction:

| Difference | Diagnostic question | Reporting treatment |
| --- | --- | --- |
| Population or corpus | Were different subjects, datasets, or periods studied? | Conditional difference, not direct contradiction |
| Construct or measure | Do similar labels represent different variables? | Preserve definitions and avoid numeric comparison |
| Method or model | Could design choices explain the result? | Compare assumptions and sensitivity |
| Outcome direction | Are estimates about the same outcome and scale? | Direct contradiction only after alignment |
| Interpretation | Do authors infer different mechanisms from compatible findings? | Separate empirical agreement from interpretive disagreement |
| Version or edition | Did the source change between versions? | Attribute claims to the exact version |
| Evidence level | Is one conclusion abstract-only or annotation-derived? | Mark asymmetry; do not equalize confidence |

When contradictions remain after alignment, present the strongest support for each side, relevant methodological differences, and what additional evidence could discriminate them. Do not resolve disagreement by vote count unless the task explicitly defines a systematic aggregation method.

## Evidence-gap matrix

| Gap | What remains supportable | What is not supportable | Next useful evidence |
| --- | --- | --- | --- |
| Bibliographic record only | Identity and indexed publication facts | Methods, findings, argument | Abstract or full text |
| Abstract only | Abstract-stated purpose and headline result | Detailed procedure, robustness, nuanced limits | Full text or verified analysis artifact |
| Missing pages/chunks | Claims in inspected portions | Continuity across the gap | Complete delivery or page-specific source |
| OCR uncertainty | Approximate visible content with confidence note | Exact quotation of corrupted text | Native PDF/text or manual check |
| Notes without source locator | Reader interpretation | Attribution to the paper | Located passage or annotation |
| Mixed versions | Version-specific claims | Unified paper-level conclusion | Version resolution and comparison |
| Workflow artifact lacks source basis | Artifact contents as an object of analysis | Claims that it faithfully represents papers | Manifest/source mapping or direct reads |
| One failed item in a comparison | Conclusions about successful items | Complete-set comparison | Recover that item or narrow declared scope |

Gap handling is part of the deliverable, not merely a failure appendix. State whether the answer was narrowed, the claim was weakened, or the task is blocked. If the missing evidence changes only one dimension, preserve the rest of the analysis and isolate that dimension.

## Recovery and near misses

- An abstract-only source cannot answer a full-text method or result question; request the missing source or return a bounded abstract analysis.
- OCR gaps require locators and confidence notes; do not reconstruct missing sentences as quotations.
- An expired attachment handle is recovered from the owning attachment, never a guessed local path.
- A comparison with mixed source levels can proceed only when the asymmetry is visible in every affected conclusion.
- If one paper in a batch fails, preserve successful artifacts and exclude the failed paper from conclusions that require its evidence.
- If workflow output is empty or malformed, retain the run and validation diagnostics; do not manufacture the expected digest or references.
- If the requested writeback lacks authority, return the analysis as completed work and mark the write stage canceled rather than modifying Zotero.
