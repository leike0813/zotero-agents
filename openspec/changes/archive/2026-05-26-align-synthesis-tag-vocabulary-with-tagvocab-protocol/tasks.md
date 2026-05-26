## 1. OpenSpec

- [x] 1.1 Create `align-synthesis-tag-vocabulary-with-tagvocab-protocol`.
- [x] 1.2 Add proposal, design, tasks, and delta specs.
- [x] 1.3 Validate the change with `openspec validate --strict`.

## 2. Protocol alignment

- [x] 2.1 Centralize TagVocab v1 protocol constants in the tag vocabulary module.
- [x] 2.2 Parse TagVocab-native `{ tags, facets, abbrevs }` import payloads.
- [x] 2.3 Write new canonical `vocabulary.json` using TagVocab-native `tags` field while reading legacy `entries`.
- [x] 2.4 Read/write `abbrevs` while keeping legacy `abbrev` compatibility.
- [x] 2.5 Validate registered abbreviation casing from the imported/canonical abbrev registry.

## 3. UI and workflow integration

- [x] 3.1 Ensure Workbench import preview shows additions/conflicts for TagVocab `tags/tags.json`.
- [x] 3.2 Preserve explicit import apply behavior and canonical autosync trigger.
- [x] 3.3 Preserve tag-regulator `valid_tags` export shape.

## 4. Tests and validation

- [x] 4.1 Add core tests for `reference/Zotero_TagVocab/tags/tags.json` import.
- [x] 4.2 Add compatibility tests for legacy `{ entries }` and array import payloads.
- [x] 4.3 Add canonical write/read tests for `tags` and `abbrevs`.
- [x] 4.4 Run targeted core/UI/tag-regulator tests, TypeScript, and Prettier checks.
