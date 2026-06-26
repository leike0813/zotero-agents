---
name: tag-bootstrapper
description: Interactive TagVocab bootstrap skill. Use when a Zotero Agents workflow needs to ask the user about research domains, tag facets, vocabulary granularity, and missing controlled-vocabulary entries, then produce initial or incremental TagVocab additions as add_tags objects with tag notes.
---

# Tag Bootstrapper

## Purpose

Build an initial controlled tag vocabulary, or expand an existing one, through an interactive conversation with the user. The output is not a tagging decision for one paper. It is a governed vocabulary proposal that the host workflow may write into the formal Zotero Agents TagVocab store.

This skill must:

- read the existing vocabulary from `{{ input.existing_tags }}`;
- use Host Bridge library index context when the injected `zotero-bridge` CLI is available;
- ask the user only for vocabulary-design information that is missing;
- generate new controlled tags that obey the supplied protocol and `references/tag_standard.md`;
- avoid duplicates against existing tags and within the current result;
- output a single machine-readable JSON object matching `assets/output.schema.json`.

## Inputs

- `{{ input.existing_tags }}`: existing controlled vocabulary entries. Each entry may contain `tag`, `facet`, and `note`.
- `{{ input.protocol.facets }}`: allowed facet prefixes.
- `{{ input.protocol.tag_pattern }}`: required tag pattern.
- `{{ input.protocol.max_tag_length }}`: maximum tag length.
- `{{ parameter.tag_note_language }}`: language for `add_tags[].note`; default to `zh-CN` when absent.

Missing `existing_tags` is treated as an empty array. Missing protocol fields are input errors because the skill cannot safely propose vocabulary entries without the host-owned TagVocab constraints.

## Reference Loading

Before generating any tag, read `references/tag_standard.md`. Use it as the naming and governance reference for:

- facet meaning and boundaries;
- `facet:value` and `facet:path` format;
- hierarchy with `/`;
- multiword segments with `-`;
- uppercase registered abbreviations;
- controlled versus semi-controlled facets;
- recommended vocabulary size and maintenance limits.

Do not invent facets outside `input.protocol.facets`. If the reference suggests a facet that is absent from `input.protocol.facets`, omit that facet and add a warning instead of emitting an invalid tag.

## Host Bridge Library Context

When the runtime provides Zotero host access, use the library index before asking the user for missing vocabulary information. The index helps you ground the vocabulary in the user's actual Zotero library instead of generic domain guesses.

Before using Zotero host data:

1. Read the built-in `zotero-bridge-cli` wrapper skill.
2. Read `zotero-bridge-cli/references/host-bridge-cli.md` for the current command surface.
3. Prefer the run-local shim in the ACP or SkillRunner workspace:
   - Windows: `.\.zotero-bridge\bin\zotero-bridge.cmd`
   - POSIX: `./.zotero-bridge/bin/zotero-bridge`
4. Use the PATH command `zotero-bridge` only when the run-local shim is absent.

Read the current library index with:

```bash
<zotero-bridge> library-index get --input '{"cursor":0,"limit":200}'
```

If the response has `has_more: true` and a non-empty `next_cursor`, continue with the same input shape and the returned cursor until enough context has been collected or the pages are exhausted. For large libraries, collect a representative view rather than trying to summarize every paper.

Use library index fields only for vocabulary design:

- `papers[].title`, `papers[].year`, `papers[].item_type`, and `papers[].creators` reveal recurring domains and methods;
- `papers[].tags` and top-level `tags` reveal the user's current informal or imported tagging habits;
- `collections` reveal project, corpus, and topic groupings;
- repeated terms across titles, collections, and tags are stronger candidates than one-off terms.

Do not copy paper titles directly into tags. Convert observed library patterns into compact controlled vocabulary candidates that obey `input.protocol` and `references/tag_standard.md`. Do not directly read Zotero DB files, Zotero storage paths, plugin internals, or attachment paths to bypass Host Bridge.

If the Host Bridge CLI is unavailable, the command fails, the index is empty, or pagination cannot continue, keep working from `existing_tags`, `protocol`, and the user's answers. Add a concise warning such as `Host Bridge library index unavailable; generated tags from user-provided context`.

## Interaction Flow

Ask concise questions until the vocabulary intent is clear. Do not ask about plugin internals, file formats, workflow hooks, or implementation details.

1. Identify the user's research domains and recurring literature areas.
2. Review the Host Bridge library index when available and identify recurring domains, methods, models, datasets, tools, collections, and informal tags.
3. Identify the facets they actually want to govern: field, topic, method, model, ai_task, data, tool, status, match_status, or the subset allowed by `input.protocol.facets`.
4. Ask about desired granularity: broad browse tags, mid-level retrieval tags, or fine-grained project tags.
5. Review `existing_tags` and ask what is missing, over-specific, or underrepresented.
6. Propose a compact vocabulary increment. Prefer a small coherent set over an exhaustive list.
7. If the user rejects a naming pattern or granularity, revise the candidate set before final output.

For an empty vocabulary, start with foundational tags: 1-3 `field:` tags, a small set of core `method:` or `model:` tags when relevant, and workflow tags only if the user wants status tracking. For a non-empty vocabulary, focus only on gaps and adjacent additions.

## Tag Generation Rules

- `add_tags` is an array of objects similar in spirit to `tag-regulator.suggest_tags`: every item must carry the candidate controlled tag and a short note.
- Each item must have:
  - `tag`: normalized `facet:value` or `facet:path`;
  - `note`: short semantic description of the tag, in `tag_note_language`;
  - `facet`: optional, but include it when it is clear from the tag prefix.
- `note` describes the tag itself, not the reason for adding it. Keep it short, for example `目标检测`, `Survey study`, or `Tunnel engineering`.
- Use only facets listed in `input.protocol.facets`.
- Keep the facet prefix lowercase.
- Use `/` for hierarchy and `-` for multiword non-abbreviation segments.
- Preserve registered abbreviations in uppercase, such as `AI`, `DL`, `ML`, `CV`, `FE`, `MC`, `TBM`, and `NATM`.
- Keep non-abbreviation value segments lowercase unless `references/tag_standard.md` permits a registered uppercase segment.
- Do not emit any tag whose lowercase form already exists in `input.existing_tags`.
- Do not emit duplicate tags within `add_tags`, comparing by `tag.toLowerCase()`.
- Keep each tag within `input.protocol.max_tag_length`.
- Ensure every emitted tag matches `input.protocol.tag_pattern`.

When uncertain, omit the tag and add a warning. Do not pad the result with speculative tags.

## Responsibilities

### Must Be Done By LLM

- Elicit the user's vocabulary intent and granularity.
- Interpret research domains, methods, tools, models, collections, library index patterns, and workflow needs.
- Decide whether a candidate belongs in a controlled vocabulary.
- Write concise `add_tags[].note` values.
- Resolve semantic overlap between new candidates and existing tags.

### Must Be Done By Scripts

- Validate output JSON structure.
- Deduplicate and sort `add_tags`.
- Normalize `facet` from the tag prefix when omitted.
- Preserve stable warning arrays and provenance fields.

### Forbidden

- Do not use scripts to decide semantic tag meaning.
- Do not emit Markdown fences, logs, explanations, or multiple JSON objects.
- Do not place implementation commentary in `add_tags[].note`.
- Do not read Zotero DB/storage, plugin internals, or attachment paths directly; use Host Bridge only.
- Do not create aliases, abbreviations, protocol changes, or deprecation records; this skill only emits `add_tags`.

## Output Contract

Write exactly one JSON object to stdout. It must match `assets/output.schema.json`.

Required shape:

```json
{
  "kind": "tag_bootstrapper_result",
  "status": "success",
  "add_tags": [
    {
      "tag": "facet:value",
      "facet": "facet",
      "note": "short semantic description"
    }
  ],
  "warnings": [],
  "error": {},
  "provenance": {
    "generated_at": "YYYY-MM-DDTHH:MM:SSZ",
    "input_hash": "",
    "model": ""
  }
}
```

Failure shape keeps the same top-level keys:

```json
{
  "kind": "tag_bootstrapper_result",
  "status": "failed",
  "add_tags": [],
  "warnings": [],
  "error": {
    "code": "invalid_input",
    "message": "protocol.facets is required"
  },
  "provenance": {
    "generated_at": "YYYY-MM-DDTHH:MM:SSZ"
  }
}
```

`kind`, `status`, `provenance.input_hash`, and `provenance.model` are audit fields. Include them when known. `assets/output.schema.json` keeps these audit fields extensible for structured-output renderers; `scripts/validate_output.py` applies the same output shape plus deterministic `add_tags` duplicate checks.

When Host Bridge library index context was attempted, include optional audit data under `provenance.library_index`, for example `{"used": true, "pages_read": 2, "total_papers": 318}` or `{"used": false, "reason": "cli_unavailable"}`. Do not put tokens, endpoint URLs, local paths, or raw command output in provenance.

If the user chooses not to add tags, return `add_tags: []`, `error: {}`, and a warning such as `No additions requested by user`.

## Deterministic Scripts

Use the scripts when the runtime can execute local Python. If scripts cannot run, apply the same deterministic rules manually before stdout.

### `scripts/normalize_output.py`

Use when: after drafting the output JSON and before final stdout.

Command:

```bash
python -u scripts/normalize_output.py --output tag-bootstrapper-output.json
```

Input:

- `--output`: path to a JSON file containing the candidate output object.

Output:

- rewrites the JSON file in place with stable `add_tags` ordering and deduplication;
- fills missing `facet` from each tag prefix;
- prints `OK` on success.

On failure: repair the candidate JSON, rerun the script, or return schema-compatible `error`.

### `scripts/validate_output.py`

Use when: immediately before final stdout when the runtime can run local Python.

Command:

```bash
python -u scripts/validate_output.py --output tag-bootstrapper-output.json
```

Input:

- `--output`: path to the normalized output JSON.

Output:

- exits 0 when the output satisfies the contract;
- exits non-zero with a diagnostic on stderr when required keys, field types, or `add_tags` objects are invalid.

On failure: repair the output and rerun validation. If repair is impossible, return the failure shape with `add_tags: []`.

## Final Checklist

Before stdout, verify:

- `references/tag_standard.md` has been applied;
- Host Bridge library index context has been used when available, or a warning explains why it was not used;
- `add_tags` contains only objects with non-empty `tag` and `note`;
- every tag has an allowed facet and matches the protocol;
- no tag duplicates an existing tag case-insensitively;
- no tag duplicates another result tag case-insensitively;
- `warnings` is an array of strings;
- `error` is an object; use `{}` for success and include fields such as `code` and `message` when reporting a failure;
- `provenance.generated_at`, when present, is a string;
- audit fields do not replace `add_tags`, `warnings`, `error`, or `provenance`;
- stdout contains only the JSON object.
