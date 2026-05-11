# Synthesize Topic

Generate or update a Zotero Synthesis Layer `topic_synthesis` artifact.

This skill is an ACP Skills backend for the Zotero Skills Synthesis Layer. It
does not write Zotero items, notes, files, or canonical assets directly. The
plugin host performs persistence through the workflow `applyResult` hook after
this skill returns a valid result bundle.

## Required Process

1. Read the user-provided topic seed and mode from `parameter.topicSeed` and
   `parameter.mode`.
2. Read `assets/resolver.schema.json` from this skill package before proposing
   a resolver. The resolver must use the canonical schema exactly.
3. Use the embedded Zotero MCP synthesis tools as the source of truth:
   - `synthesis.get_library_index`
   - `synthesis.resolve_resolver`
   - `synthesis.get_paper_artifact_manifest`
   - `synthesis.read_paper_artifacts`
   - `synthesis.get_topic_context` when updating an existing topic
4. Create or update a topic resolver. Prefer deterministic Zotero tags,
   collections, and explicit paper refs. Free-form interpretation is allowed
   only to propose the resolver; the plugin must validate and resolve it through
   `synthesis.resolve_resolver`.
5. Call `synthesis.resolve_resolver` with the canonical resolver. Continue only
   when the result has `ok: true` and a non-empty `papers` array. If it returns
   `ok: false`, revise the resolver using the returned errors and diagnostics.
6. Read paper artifacts only after the resolver has been resolved.
7. Write the topic synthesis Markdown artifact to a file under the run
   workspace, preferably `result/synthesis.md`. Do not put the full Markdown
   body in the final JSON payload.
8. The Markdown artifact must contain:
   - a concise topic overview;
   - a topic timeline section;
   - main findings across papers;
   - coverage and missing evidence notes;
   - citations by Zotero paper refs where possible.
9. Finish by outputting exactly one JSON object matching the output schema.

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
- `topic_resolver` must be the resolver that was validated and resolved.
- `resolved_paper_set.papers` must contain resolved paper refs and match
  reasons.
- `markdown_path` must point to the Markdown artifact file written under the run
  workspace, such as `result/synthesis.md`.
- `timeline` must duplicate or structure the timeline section for downstream
  workflows.

Never include a `markdown` field with the full Markdown body in the final JSON.
Never include direct-write instructions such as `write_zotero_raw_source`.
