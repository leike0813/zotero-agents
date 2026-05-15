# Synthesize Topic

Generate or update a Zotero Synthesis Layer `topic_synthesis` artifact.

This skill is an ACP Skills backend for the Zotero Skills Synthesis Layer. It
does not write Zotero items, notes, files, or canonical assets directly. The
plugin host performs persistence through the workflow `applyResult` hook after
this skill returns a valid result bundle.

## Required Process

1. Read the user-provided topic seed and mode from `parameter.topicSeed` and
   `parameter.mode`.
2. If `mode=create`, first call `synthesis.list_topics`. Compare the seed only
   against each existing topic's title/description/aliases. Do not use resolver,
   paper set, artifact hash, graph, registry, or Markdown content for this
   duplicate precheck.
3. If there is a suspected duplicate, use ACP interactive confirmation before
   continuing. Ask the user to choose one of: update existing topic, still
   create a new topic, cancel, or revise the seed. If the user chooses update,
   switch to update mode and call `synthesis.get_topic_context` for that topic.
   If the user chooses cancel, return the canceled final JSON immediately.
4. Read `assets/resolver.schema.json` from this skill package before proposing
   a resolver. The resolver must use the canonical schema exactly.
5. Use the embedded Zotero MCP synthesis tools as the source of truth:
   - `synthesis.list_topics` for create-mode semantic duplicate checks
   - `synthesis.get_library_index`
   - `synthesis.resolve_resolver`
   - `synthesis.get_paper_registry` for paper readiness and artifact availability
   - `synthesis.get_topic_context` when updating an existing topic
6. Create or update a topic resolver. Prefer deterministic Zotero tags,
   collections, and explicit paper refs. Free-form interpretation is allowed
   only to propose the resolver; the plugin must validate and resolve it through
   `synthesis.resolve_resolver`.
7. Call `synthesis.resolve_resolver` with the canonical resolver. Continue only
   when the result has `ok: true` and a non-empty `papers` array. If it returns
   `ok: false`, revise the resolver using the returned errors and diagnostics.
8. Read paper artifacts only after the resolver has been resolved. Do not use
   synthesis-specific artifact read tools. For each resolved paper, use
   `get_item_notes`, then `list_note_payloads`, then `get_note_payload` to read
   the required workflow payloads.
9. Write the topic synthesis Markdown artifact to a file under the run
   workspace, preferably `result/synthesis.md`. Do not put the full Markdown
   body in the final JSON payload.
10. The Markdown artifact must contain:
   - a concise topic overview;
   - a topic timeline section;
   - main findings across papers;
   - coverage and missing evidence notes;
   - citations by Zotero paper refs where possible.
11. Finish by outputting exactly one JSON object matching the output schema.

## Topic Duplicate Check

`synthesis.list_topics` is intentionally small. It returns only semantic topic
inventory fields: `topic_id`, `title`, `description`, `aliases`, `updated_at`,
and optionally `status`. Treat this as a create-mode duplicate precheck, not as
freshness or readiness context.

When `mode=create`, use this exact flow:

1. Call `synthesis.list_topics` before `synthesis.get_library_index`.
2. Compare the user seed against existing topic `title/description/aliases`.
3. If there is no plausible duplicate, continue as a new topic.
4. If there is a plausible duplicate, pause with ACP interactive confirmation.
5. Only after the user chooses update existing topic, call
   `synthesis.get_topic_context` for the chosen `topic_id`.
6. If the user chooses cancel, stop immediately with a canceled final output.
   Do not generate Markdown, do not resolve a resolver, do not read paper
   artifacts, and do not create placeholder synthesis content.

Do not ask `synthesis.list_topics` to answer whether a topic is stale. Freshness
is deterministic plugin governance and is not part of this duplicate precheck.

## Paper Artifact Reading

Paper-level artifacts are Zotero note payloads, not separate Synthesis MCP
resources. After resolver execution, use `synthesis.get_paper_registry` to check
artifact availability, then read available artifacts with the generic Zotero MCP
note payload tools:

1. Call `get_item_notes` for each resolved paper ref.
2. Call `list_note_payloads` on candidate notes to identify hidden workflow
   payloads.
3. Call `get_note_payload` with an explicit `payloadType` and bounded
   `maxChars`/`offset` chunks when needed.

Relevant payload types are:

- `digest-markdown`
- `references-json`
- `citation-analysis-json`

Never request unbounded full-note bodies or attachment contents. Do not call
synthesis-specific paper artifact read tools; they are not public job-time
tools.

## Resolver Contract

Only these canonical resolver shapes are allowed:

```json
{ "mode": "tag_query", "query": "model:DL/DETR" }
```

```json
{
  "mode": "tag_query",
  "query": {
    "and": ["model:DL/DETR"],
    "or": ["topic:real-time"],
    "not": ["exclude:reviewed"]
  }
}
```

```json
{ "mode": "explicit", "paper_refs": ["1:ABCD1234"] }
```

```json
{
  "mode": "mixed",
  "include": [{ "mode": "tag_query", "query": "model:DL/DETR" }],
  "exclude": [{ "mode": "tag_query", "query": "exclude:reviewed" }]
}
```

Do not use non-canonical fields such as `selection_strategy`, `tag_criteria`,
or `filters`; `synthesis.resolve_resolver` rejects them.

## Output Contract

The final JSON object must be a Synthesis Layer result bundle:

- `kind` must be `topic_synthesis`.
- `mode` must be `create` or `update`.
- `base_hashes` must contain the hashes supplied by current topic context, or
  empty strings when creating a new topic.
- `topic_definition.id` must be stable across updates.
- `topic_definition.description` should define the semantic scope, and
  `topic_definition.aliases` should list common abbreviations or alternate names.
- `topic_resolver` must be the resolver that was validated and resolved.
- `resolved_paper_set.papers` must contain resolved paper refs and match
  reasons.
- `markdown_path` must point to the Markdown artifact file written under the run
  workspace, such as `result/synthesis.md`.
- `timeline` must duplicate or structure the timeline section for downstream
  workflows.

Never include a `markdown` field with the full Markdown body in the final JSON.
Never include direct-write instructions such as `write_zotero_raw_source`.

If the user cancels after the duplicate-topic confirmation, return this final
JSON shape instead:

```json
{
  "__SKILL_DONE__": true,
  "kind": "topic_synthesis_canceled",
  "status": "canceled",
  "reason": "user_cancelled_duplicate_topic",
  "message": "User canceled after duplicate topic confirmation.",
  "duplicate_topic_id": "existing-topic-id",
  "topic_seed": "original seed"
}
```

Canceled output is a no-op for the plugin host. It must not include
`markdown_path`, `topic_resolver`, `resolved_paper_set`, or any placeholder
artifact fields.
