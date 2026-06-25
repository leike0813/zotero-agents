## Overview

`tag-bootstrapper` is a SkillRunner-backed workflow for controlled-vocabulary creation. The plugin owns the write boundary through the Synthesis tag vocabulary service; the skill owns interactive semantic elicitation and returns only proposed additions. The follow-up hardens the skill package so an agent has enough runtime guidance to generate governed tags and enough deterministic tooling to normalize and validate its JSON output.

## Decisions

- Keep `add_tags` as an object array, not a `tag-regulator` top-level clone.
- Model each `add_tags` item after `tag-regulator.suggest_tags`: `tag` and `note` are required semantic fields; `facet` is optional and can be inferred from the tag prefix.
- Require `references/tag_standard.md` as the naming and governance reference before tag generation.
- Keep `assets/output.schema.json` permissive for audit fields and nullable errors, because structured-output renderers may rewrite overly strict nested object schemas.
- Use `scripts/validate_output.py` as the strict final gate for required keys, non-empty tag/note values, duplicate detection, warnings shape, error object shape, and UTC provenance timestamp.
- Use `scripts/normalize_output.py` to fill missing facets from tag prefixes, drop duplicate returned tags by lower-case tag, normalize warnings, and sort results stably.
- Keep host apply logic focused on reloading the current formal vocabulary, skipping lower-case duplicates, and delegating final validity to `saveTagVocabulary`.

## Data Flow

1. The workbench empty tags state invokes `runTagBootstrapper`.
2. The workflow `buildRequest` reads the current Synthesis tag vocabulary and sends `existing_tags`, `protocol`, and `tag_note_language` to SkillRunner.
3. The interactive skill asks the user about domains, facets, granularity, and vocabulary gaps.
4. The skill reads `references/tag_standard.md`, drafts `add_tags`, normalizes and validates output when local scripts are available, then emits a single JSON object.
5. The workflow `applyResult` rejects skill errors, normalizes returned additions, reloads the current vocabulary, skips existing lower-case duplicates, and calls `saveTagVocabulary` with existing entries plus additions.

## Failure Handling

- A non-null skill `error` prevents vocabulary writes.
- Malformed `add_tags` prevents vocabulary writes.
- Duplicate result tags are collapsed before host write.
- Existing vocabulary tags are compared case-insensitively and skipped.
- Tags rejected by Synthesis vocabulary validation do not bypass the service boundary.
