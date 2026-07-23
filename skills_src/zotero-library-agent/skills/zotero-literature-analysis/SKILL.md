---
name: zotero-literature-analysis
description: Analyze bounded Zotero literature and attachments with traceable source evidence. Use when a user needs a paper digest, comparison, extraction, or structured interpretation from current library material.
---

# Zotero Literature Analysis

## Goal

Produce a bounded digest, extraction, comparison, or interpretation from verified Zotero sources, with explicit evidence depth and locators, without treating generated analysis or artifacts as live library state.

## Inputs

- Resolved item, note, annotation, or attachment refs, or a bounded query that can resolve them.
- The analytical question, comparison dimensions, desired deliverable, and required source depth.
- Available metadata, abstract, OCR, full text, prior analysis artifacts, and workflow authority when relevant.

## Natural-language intake

Translate “read,” “summarize,” “explain,” “compare,” “extract,” and “analyze” into a declared analytical lens and evidence requirement.

| User wording | Initial analytical task | Required boundary |
| --- | --- | --- |
| “Summarize this paper” | Single-source digest | Resolve the selected source and acceptable metadata/abstract/full-text depth |
| “Explain the method” | Method-focused interpretation | Identify the exact paper/version and whether implementation details require full text |
| “Compare these papers” | Structured comparison | Resolve the set, stable dimensions, and treatment of unequal source depth |
| “Extract the results” | Source-located extraction | Define target fields, tables, measures, or outcomes and required locators |
| “Do a deep reading” | Detailed multi-part analysis | Confirm full-text availability and whether the built-in workflow is desired |
| “Translate and analyze this” | Ordered translation and analysis | Decide source/target language, translated artifact, and which text supports conclusions |
| “Analyze all papers about X” | Query then bounded analysis | Establish the source set and batch boundary before analysis |

Capture:

- exact item, attachment, note, annotation, edition, and version identities;
- analytical question and intended use;
- requested deliverable;
- dimensions applied across sources;
- minimum acceptable evidence level;
- quotation or locator requirements;
- privacy and output-language constraints;
- direct analysis versus a workflow-produced multi-artifact result.

Ask when:

- the current selection is absent or contains multiple plausible source objects;
- only metadata or abstract is available but the request requires methods, results, limitations, or quotation;
- sources have asymmetric depth and the user must choose between a narrower comparison and a clearly limited one;
- editions, translations, preprints, or published versions could change findings;
- “analyze” could mean a digest, extraction, critique, comparison, or synthesis;
- workflow execution introduces provider, options, cost, or submission authority.

Safe defaults:

- analyze only the resolved bounded source set;
- use the strongest available source for each item and disclose asymmetry;
- keep analysis read-only;
- produce a conversational answer unless a separate artifact is requested;
- treat prior generated analysis as a secondary lead, not source text.

There is no safe default for fabricating full-text access, silently excluding a requested paper, changing comparison dimensions per source, or writing an analysis back to Zotero.

## Workflow

### Establish source basis

1. Resolve the exact item, note, annotation, attachment, version, and edition set. State the analytical question, stable comparison dimensions, required source depth, and deliverable.
2. Determine the strongest available evidence level for every source: metadata, abstract, note/annotation, partial OCR/content view, delivered full text, or prior generated analysis.
3. Obtain content only through supported Zotero reads and file delivery. Record which attachment and locator supplied each inspected passage, and make missing or asymmetric evidence visible before analysis.

### Analyze with locators

4. Extract the fields, passages, annotations, or observations relevant to the declared lens. Separate quotation and extraction from comparison, methodological assessment, inference, and synthesis.
5. Apply the same declared dimensions to every compared source. Record unavailable evidence instead of silently changing criteria, and test conclusions against contradictions and source-version differences.
6. Choose direct analysis when the bounded material is already available. Choose a declared workflow when the task needs a stable multi-artifact contract, provider execution, or repeated per-paper processing.

### Validate workflow deliverables

7. For workflow execution, validate the source selection, workflow options, and provider profile; retain each submitted parent ref and its run outcome separately.
8. Inspect every promised digest, structured reference set, citation analysis, translation, deep-reading output, or report. Structural result success does not establish analytical quality or Zotero writeback.
9. Return `zotero-library-task.result.v1`; declare generated reports as artifacts, attach source-located evidence to material conclusions, and route any separately requested Zotero change to curation.

### Structure the analytical deliverable

For a single paper:

1. Identify the exact source and evidence depth.
2. State the research question, contribution, method, data, findings, limitations, and relevance only where supported.
3. Attach locators to quotations, numerical claims, and specific methodological details.
4. Separate author claims from your interpretation.
5. State missing sections, OCR uncertainty, or version limitations.

For comparison:

1. Fix the comparison dimensions before interpreting results.
2. Apply every dimension to every source.
3. Use “not available in inspected evidence” rather than silently changing the dimension.
4. Preserve contradictory findings and methodological incompatibility.
5. Distinguish a missing report from evidence that a feature or result is absent.

For workflow-produced analysis:

1. Verify the workflow selection matches its declared candidate-production and execution-input contracts.
2. Validate options and provider profile separately.
3. Preserve one run outcome per submitted source.
4. Inspect every promised artifact.
5. Evaluate content against the declared analytical question.
6. Route any desired note, tag, attachment, or metadata change to curation with new authority.

### Analysis completion checklist

Source basis:

- Every source has a stable Zotero and attachment identity.
- Version, edition, translation, and publication relationships are explicit.
- Evidence depth is recorded per source.
- Delivered bytes or content views are verified before full-text claims.

Analytical method:

- The question and dimensions were fixed before comparison.
- Extraction and quotation are separate from interpretation.
- Each material conclusion has a locator.
- Contradictions and unavailable dimensions remain visible.
- Generated prior analysis is not substituted for source evidence.

Workflow output:

- Selection matches the workflow candidate-production and execution-input contracts.
- Options and provider readiness were validated.
- Each source has its own run outcome.
- Every promised artifact exists and was inspected.
- Artifact structure and analytical quality are not conflated.

Deliverable:

- The answer states source scope and evidence depth.
- Quotations are minimal and accurately located.
- Missing content, OCR uncertainty, and asymmetric evidence are disclosed.
- Any separate Zotero write is left to curation.

Near misses:

- Abstract-only evidence cannot support unreported method details.
- Citation metadata cannot support a paper's experimental result.
- Similar method names do not prove equivalent implementations.
- A workflow “succeeded” state does not prove usable analysis artifacts.
- A readable generated digest is not live note state.
- One analyzed source does not complete a requested multi-source comparison.

If the available evidence can answer only a declared subset of the request, tell the user which subset and return the overall status required by the result contract.

## Hard constraints

- Do not claim to have read content that `zotero-bridge` did not deliver or expose through a supported view.
- Do not alter notes, annotations, attachments, metadata, or workflow state as part of analysis.
- Keep quotations and private attachment content no broader than needed for the requested analysis.
- Mark uncertainty, missing pages, OCR limits, and inference as such.
- Do not use a digest, abstract, citation record, or prior generated analysis as evidence for statements that require current full text.
- Do not merge findings from different editions, translations, or versions without identifying the distinction.
- Do not claim analysis completion from workflow termination alone; inspect the requested digest, references, citation analysis, or report artifacts.

## LLM And Tool Responsibilities

The LLM owns the analytical lens, comparison model, evidence sufficiency, source-located interpretation, uncertainty, and artifact content. The bundled CLI and runner own exact argv, content delivery, file checks, workflow transport, and result-schema validation. Do not invent handles, receipts, unread content, quotations, or source locations.

## Result contract

Return one business JSON object matching `assets/output.schema.json`.

Required:

- `schema`: `zotero-library-task.result.v1`.
- `status`: `completed`, `canceled`, or `failed`.
- `summary`: identify the analytical question, source set, evidence depth, delivered result, and material limitation.

Optional:

- `evidence` is an optional array; every entry requires `kind` and `ref`; use `locator` for pages, sections, annotations, quote spans, tables, or source blocks, and `description` for the supported claim.
- `artifacts` is an optional array; every entry requires an existing agent-accessible `path` and `role`, such as `digest`, `comparison`, `translation`, or `deep-reading-report`; add `mediaType` when known.
- `diagnostics` is an optional array; every entry requires `code` and `message` for unavailable content, OCR limits, version ambiguity, asymmetric evidence, workflow failure, or another stable gap.

Status rules:

- `completed`: the declared analytical dimensions are answered from the declared evidence level and every promised artifact is inspected.
- `canceled`: a material question, source identity, comparison set, evidence-depth choice, or workflow authority is missing.
- `failed`: an attempted read, file delivery, workflow, or analysis batch cannot complete the declared overall objective.

Minimal result:

```json
{
  "schema": "zotero-library-task.result.v1",
  "status": "completed",
  "summary": "Compared the three resolved papers on the declared method and evaluation dimensions, with full-text evidence for each material conclusion."
}
```

Do not invent `partial`. When only part of a requested batch can be analyzed, use `failed`, preserve completed source evidence and artifacts, and diagnose every unavailable or unattempted source.

The Runner's `__SKILL_DONE__` marker is transport metadata. It is removed before Schema validation and must not appear in the business object or result file. Emit exactly one JSON object without Markdown framing.

## Completion

Return one final `zotero-library-task.result.v1` object with required `schema`, `status`, and `summary`. Use `completed` when the requested analytical dimensions are answered from the declared source level and every material conclusion is traceable. Use `canceled` for an underspecified question, unresolved comparison set, or required unavailable source choice; use `failed` for unrecoverable access, workflow, or processing errors.

## Failure handling

Retain the source identity, available evidence level, accepted content, artifact paths, workflow handles, and structured failure. A partial batch result identifies successful and failed papers separately. Offer a narrower basis only when it answers a declared portion of the request, and label the resulting limitation rather than presenting it as full analysis.

## References

Consult [the comprehensive analysis playbook](references/playbook.md) when the task needs a detailed evidence-level decision, extraction or quotation protocol, comparison/contradiction pattern, mixed-version or mixed-depth analysis, multi-paper workflow artifact validation, OCR handling, or evidence-gap recovery.
