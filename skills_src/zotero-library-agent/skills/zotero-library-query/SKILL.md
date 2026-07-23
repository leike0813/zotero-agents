---
name: zotero-library-query
description: Retrieve current Zotero library content and answer bounded, source-grounded questions. Use when a user needs current items, collections, notes, attachments, context, or a library answer.
---

# Zotero Library Query

## Goal

Resolve a bounded question against current Zotero library, UI, attachment, and Synthesis context; distinguish live facts from interpretation; and return a source-grounded answer without modifying Zotero-managed state.

## Inputs

- A question, search/list filters, or an explicit object, collection, topic, Product, artifact, or run handle.
- Any deictic phrase that depends on the current Zotero pane or selection.
- The required freshness, source depth, result bound, and requested evidence format.

## Workflow

1. Read [the query playbook](references/playbook.md), state the bounded question, and decide whether the request names an object, describes a candidate search, or depends on current UI context.
2. Resolve current context and stable object identity before choosing item detail, notes, payloads, annotations, attachments, readiness, Product, run, or Synthesis reads.
3. Use the narrowest live operation that can answer the question. Complete required cursor or offset paging and preserve the filters, refs, locators, freshness facts, and file delivery evidence.
4. Separate extracted facts, source quotations, derived structure, and your interpretation. Do not strengthen a claim beyond the available metadata, abstract, annotation, or full text.
5. Return `zotero-library-task.result.v1` with source-oriented inline evidence for each material conclusion and declared artifacts only when the answer produces a separate deliverable.

## Hard constraints

- Read only through `zotero-bridge` and do not infer item identity from a title, citation string, or stale result.
- Do not mutate, submit, apply back, or start unattended monitoring while answering a query.
- Do not expose private attachment contents, credentials, or local storage paths in a result.
- Re-query live data when freshness matters or a handle has expired.
- Do not treat navigation, snapshot data, a notification, terminal run, generated artifact, or Synthesis association as proof of a bibliographic write.
- Do not claim full-text evidence when only metadata, abstract, OCR fragments, or inaccessible attachment records were available.
- Do not conclude absence from an incomplete page sequence or substitute another object after a stale ref.

## LLM And Tool Responsibilities

The LLM owns query scope, candidate selection, evidence sufficiency, source comparison, interpretation, and freshness judgment. The bundled CLI and runner own exact argv, live reads, cursor and file-handle transport, downloaded-byte checks, and result-schema validation. Do not invent handles, locators, command results, or library facts.

## Completion

Return one final `zotero-library-task.result.v1` object with required `schema`, `status`, and `summary`. Use `completed` only when the declared scope has been searched or resolved far enough to support the answer and material claims carry live evidence. Use `canceled` when the question, scope, identity, or source-depth choice is missing, and `failed` for an unrecoverable access or paging error.

## Failure handling

Preserve accepted pages, last cursor or offset, source identity, file owner, and structured error. Narrow an over-broad request only when the narrowed boundary still answers the user's question. Reacquire expired file access from the attachment, Product, or artifact that issued it. If only a weaker source basis remains, offer that bounded answer with an explicit limitation rather than implying the requested evidence depth.

## References

Read [the query playbook](references/playbook.md) before resolving current context, choosing search versus list, reading notes or attachments, auditing readiness, interpreting Synthesis state, or recovering pagination and file access.
