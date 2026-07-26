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

## Natural-language intake

Translate conversational wording into a bounded live read before choosing commands.

| User wording | Interpret as | First check |
| --- | --- | --- |
| “this paper,” “these items,” “the current collection” | Deictic current-context query | Read the live Zotero selection; if empty or heterogeneous, ask which object is intended |
| “Do I have papers about X?” | Bounded library search | Confirm library/collection filters and whether a negative answer requires exhaustive paging |
| “What notes do I have on X?” | Note discovery and optional body/payload reads | Establish whether titles/metadata suffice or note content is required |
| “Can you show me the PDF?” | Attachment identity and byte delivery | Resolve the parent and exact attachment; never infer a storage path |
| “What is missing analysis?” | Readiness query | Define the readiness category and requested scope; do not remediate |
| “What does the graph say about X?” | Derived Synthesis read | Select the exact model, scope, and freshness before interpretation |
| “Has workflow Y finished?” | Run query | Require the typed run identity; terminal state does not prove output delivery |

Clarify when:

- a deictic phrase has no unambiguous live selection;
- the user names a title with multiple candidate items;
- “all,” “none,” “latest,” or “current” changes the required paging or freshness;
- the requested conclusion requires full text but only metadata or abstract may be available;
- private note or attachment content would be exposed beyond the user's requested purpose;
- the question could mean a live Zotero fact or a derived Synthesis/workflow interpretation.

Safe defaults:

- use current live Zotero data rather than a cached report;
- keep the query read-only;
- use the narrowest library or collection scope explicitly named;
- return a conversational answer unless the user requests a separate artifact;
- use the strongest available evidence, but disclose when it is weaker than requested.

There is no safe default for an absent current selection, ambiguous item identity, or a negative conclusion from incomplete paging. Ask or return `canceled` instead of silently broadening the search.

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

### Report the answer to the user

Organize the human-facing answer before constructing the machine result:

1. State the direct bounded answer.
2. Name the live scope searched or object resolved.
3. Separate Zotero facts, delivered source text, derived model output, and interpretation.
4. Attach stable Zotero refs and precise locators to material claims.
5. State incomplete pages, unavailable attachments, stale models, or asymmetric source depth.
6. Offer the next bounded read only when it follows from the current result.

For a negative answer, state the completed boundary: library, collection, filters, page completion, freshness, and which source types were inspected. “No result in the first page” is not “not in the library.”

For a current-selection answer, preserve the actual selected object kinds. If a note or attachment is selected, do not silently answer about its parent unless the question and read contract require the parent.

For an attachment answer, distinguish metadata inspection from byte delivery. If bytes were delivered, verify checksum and byte count before using the file as evidence. If they were not delivered, do not claim to have read the full text.

### Query completion checklist

Identity:

- Deictic context was read live.
- Title or citation candidates were disambiguated with stable refs.
- Child and parent identities were not silently exchanged.
- Product, artifact, run, operation, and Zotero refs retain their kinds.

Scope:

- Library, collection, filters, source kinds, and result bound are explicit.
- Required pages are complete or the answer states the untraversed boundary.
- Freshness-sensitive objects or derived models were re-read.
- A negative conclusion is supported by the complete declared boundary.

Evidence:

- Each material claim is tied to a live object, delivered source, or named derived model.
- Full-text claims use delivered full text rather than metadata or abstract.
- Locators identify the relevant page, section, note, annotation, or asset.
- Interpretation is distinguishable from direct Zotero or source facts.

Privacy:

- Attachment and note content is limited to the requested purpose.
- No credential, token, Zotero storage path, or unrelated private content is exposed.
- A produced artifact contains only the necessary evidence.

Near misses:

- A snapshot is not automatically current library state.
- A search candidate is not a resolved item.
- An attachment record is not delivered bytes.
- A completed run is not a verified Product.
- A graph edge is not a source claim.
- A readiness warning is not authority to repair.
- An empty page is not absence unless paging is complete.

If one of these checks fails, repair the read boundary or return the exact limitation. Do not broaden the user's question simply to obtain an answer.

### Handoff boundaries

- Hand a resolved external-literature need to acquisition, not to a library mutation.
- Hand a question requiring sustained interpretation of source text to analysis with exact source refs and evidence depth.
- Hand a cross-source claim, gap, graph, or topic question to synthesis with the verified source boundary.
- Hand a requested note, tag, collection, metadata, or attachment change to curation with the read evidence but no implied authority.
- Hand persistent monitoring to the hosted facet only after returning the finite query result.

A handoff carries stable identities, accepted pages, source depth, relevant evidence, and diagnostics. It does not carry an inferred approval, guessed handle, private local storage path, or a claim that the successor task has already completed.

State the handoff boundary in the current summary so the next task and the user know exactly what remains.

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

## Result contract

Return one business JSON object matching `assets/output.schema.json`.

Required:

- `schema`: `zotero-library-task.result.v1`.
- `status`: `completed`, `canceled`, or `failed`.
- `summary`: the answer and its bounded search/read basis, not a bare success label.

Optional:

- `evidence` is an optional array; each entry has `kind` plus a stable `ref`; use `locator` for a page, section, annotation, note block, cursor boundary, asset role, or other exact source location, and `description` for its relevance.
- `artifacts` is an optional array; each entry has an existing agent-accessible `path` and `role`; add `mediaType` when known.
- `diagnostics` is an optional array; each entry has `code` and `message` for missing identity, incomplete paging, unavailable content, stale derived state, or another material limitation.

Status rules:

- `completed`: the declared query scope is sufficiently traversed and the answer is supported. A verified empty result is completed.
- `canceled`: a material scope, identity, source-depth choice, or privacy decision is missing before the read can safely answer.
- `failed`: an attempted read, page sequence, or file delivery cannot complete and the declared objective remains unmet.

Minimal result:

```json
{
  "schema": "zotero-library-task.result.v1",
  "status": "completed",
  "summary": "Found four current Zotero items matching the topic in the named collection after completing all result pages."
}
```

Do not invent `partial`; if only part of the requested objective completed, use `failed`, preserve accepted evidence, and explain the remaining gap. Omit empty optional arrays rather than fabricating entries.

The Runner's `__SKILL_DONE__` marker is transport metadata. Use `false` only while a concrete user decision is pending; use the final branch when ready, but never place the marker inside this business object or a result file. Emit no Markdown around the JSON.

## Completion

Return one final `zotero-library-task.result.v1` object with required `schema`, `status`, and `summary`. Use `completed` only when the declared scope has been searched or resolved far enough to support the answer and material claims carry live evidence. Use `canceled` when the question, scope, identity, or source-depth choice is missing, and `failed` for an unrecoverable access or paging error.

## Failure handling

Preserve accepted pages, last cursor or offset, source identity, file owner, and structured error. Narrow an over-broad request only when the narrowed boundary still answers the user's question. Reacquire expired file access from the attachment, Product, or artifact that issued it. If only a weaker source basis remains, offer that bounded answer with an explicit limitation rather than implying the requested evidence depth.

## References

Consult [the comprehensive query playbook](references/playbook.md) when the request needs a detailed search/list/snapshot decision, note payload or annotation handling, attachment-byte delivery, readiness interpretation, Synthesis model selection, privacy minimization, or interrupted paging/file recovery.
