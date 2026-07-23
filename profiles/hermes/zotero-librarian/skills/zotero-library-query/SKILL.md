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

### Classify and resolve scope

1. State the bounded question, required freshness, source depth, result limit, and evidence format. Decide whether it depends on current UI context, a known object, candidate discovery, or an exhaustive bounded inventory.
2. Resolve deictic context first. For a known ref, read the live object; for a title, citation, or description, search candidates and choose only after stable identity evidence; for an inventory, preserve the complete filter and paging boundary.
3. Keep note, attachment, parent item, collection, topic, Product, artifact, run, and operation identities distinct. Derive a top-level parent only when the selected read contract requires it.

### Collect live evidence

4. Use the narrowest current operation that can answer the question, then expand only when required: item detail before children, note metadata before body/payload, attachment metadata before bytes, and derived-model status before freshness-sensitive interpretation.
5. Complete required cursor, offset, or content paging. Preserve accepted pages, filters, refs, locators, returned freshness facts, and the last safe resume position without merging a page twice.
6. When bytes are required, obtain access from the owning attachment, Product, or artifact and verify the delivered checksum and byte count. Never infer a readable local path from Zotero-side metadata.
7. Separate direct Zotero facts, source text, plugin-derived structure, workflow state, and your interpretation. Limit every claim to the strongest evidence actually delivered.

### State the bounded answer

8. Answer from the smallest sufficient evidence set. State untraversed scope, unavailable content, stale derived views, or asymmetric source depth wherever they affect the conclusion.
9. Return `zotero-library-task.result.v1` with source-oriented inline evidence for each material conclusion and declared artifacts only when the answer produces a separate deliverable.

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

Consult [the comprehensive query playbook](references/playbook.md) when the request needs a detailed search/list/snapshot decision, note payload or annotation handling, attachment-byte delivery, readiness interpretation, Synthesis model selection, privacy minimization, or interrupted paging/file recovery.
