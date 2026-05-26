## Why

Synthesis Tag Vocabulary was intended to consume the `reference/Zotero_TagVocab` protocol, but the current implementation has drifted into a plugin-local `{ entries: [...] }` shape. As a result, the real TagVocab source file `tags/tags.json` uses top-level `tags`, `facets`, and `abbrevs` and imports as an empty vocabulary in the Workbench.

## What Changes

- Align Synthesis Tag Vocabulary import, canonical write shape, validation, and export behavior with Zotero TagVocab v1.
- Support TagVocab-native payloads shaped as `{ version, updated_at, facets, tags, abbrevs, tag_count }`.
- Keep legacy `{ entries: [...] }` and plain tag arrays as compatibility input, but write new canonical vocabulary with TagVocab field names.
- Validate tags against the TagVocab protocol rules: pattern, max length, allowed facets, and registered abbreviation casing.
- Preserve the tag-regulator `valid_tags` output contract as an active tag string array.

## Capabilities

### New Capabilities

- `synthesis-tag-vocabulary`: Defines the Synthesis canonical tag vocabulary contract against Zotero TagVocab v1.

### Modified Capabilities

- `tag-regulator-workflow`: Require tag-regulator vocabulary export to remain compatible while reading Synthesis canonical TagVocab state.
- `synthesis-workbench-ui`: Require the Tags import wizard to preview/apply TagVocab-native `tags/tags.json` payloads.

## Impact

- Affects `src/modules/synthesis/tagVocabulary.ts`, Synthesis service import preview/apply paths, Workbench Tags UI snapshots, and tag-regulator host API consumption.
- Adds tests using `reference/Zotero_TagVocab/tags/tags.json` as the protocol fixture.
- No new npm dependency; protocol constants are centralized in TypeScript and tested against the reference protocol files.
