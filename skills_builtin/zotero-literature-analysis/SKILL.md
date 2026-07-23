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

## Completion

Return one final `zotero-library-task.result.v1` object with required `schema`, `status`, and `summary`. Use `completed` when the requested analytical dimensions are answered from the declared source level and every material conclusion is traceable. Use `canceled` for an underspecified question, unresolved comparison set, or required unavailable source choice; use `failed` for unrecoverable access, workflow, or processing errors.

## Failure handling

Retain the source identity, available evidence level, accepted content, artifact paths, workflow handles, and structured failure. A partial batch result identifies successful and failed papers separately. Offer a narrower basis only when it answers a declared portion of the request, and label the resulting limitation rather than presenting it as full analysis.

## References

Consult [the comprehensive analysis playbook](references/playbook.md) when the task needs a detailed evidence-level decision, extraction or quotation protocol, comparison/contradiction pattern, mixed-version or mixed-depth analysis, multi-paper workflow artifact validation, OCR handling, or evidence-gap recovery.
