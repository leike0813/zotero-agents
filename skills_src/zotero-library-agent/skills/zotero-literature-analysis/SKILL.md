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

1. Read [the analysis playbook](references/playbook.md), resolve the exact source set, and state the requested lens, source depth, and deliverable.
2. Inspect available metadata, abstracts, notes, annotations, supported content views, and attachments. Obtain delivered bytes only through the bundled CLI file contract.
3. Decide whether direct analysis or a declared literature-analysis workflow best satisfies the request. Validate the selected workflow and preserve per-item success and failure evidence.
4. Separate extraction, quotation, comparison, inference, and synthesis. Tie every material finding to stable item identity and the best available page, section, chunk, annotation, or field locator.
5. Return `zotero-library-task.result.v1`; declare generated reports as artifacts and retain their source basis without implying Zotero writeback.

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

Read [the analysis playbook](references/playbook.md) before choosing evidence depth, comparing papers, invoking an analysis workflow, validating analysis artifacts, or recovering mixed source availability.
