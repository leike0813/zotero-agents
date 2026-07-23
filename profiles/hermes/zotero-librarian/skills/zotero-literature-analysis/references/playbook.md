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

## Recovery and near misses

- An abstract-only source cannot answer a full-text method or result question; request the missing source or return a bounded abstract analysis.
- OCR gaps require locators and confidence notes; do not reconstruct missing sentences as quotations.
- An expired attachment handle is recovered from the owning attachment, never a guessed local path.
- A comparison with mixed source levels can proceed only when the asymmetry is visible in every affected conclusion.
- If one paper in a batch fails, preserve successful artifacts and exclude the failed paper from conclusions that require its evidence.
- If workflow output is empty or malformed, retain the run and validation diagnostics; do not manufacture the expected digest or references.
- If the requested writeback lacks authority, return the analysis as completed work and mark the write stage canceled rather than modifying Zotero.
