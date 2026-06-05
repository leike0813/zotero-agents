## Why

Tag vocabulary management is currently split between the legacy `tag-manager`
workflow prefs model and the newer Synthesis Tag Vocabulary store. This creates
two sources of truth for controlled tags, staged suggestions, import/export, and
remote sync behavior.

This change finishes the migration by making Synthesis Tag Vocabulary the only
canonical tag management surface and by moving `tag-regulator` into the
literature workbench workflow package.

## What Changes

- **BREAKING**: Remove legacy `tag-manager` from builtin workflow
  registration. Existing prefs-backed tag vocabulary state is not migrated.
- Make Synthesis Tag Vocabulary own controlled vocabulary CRUD, staged
  suggestion intake, promote/discard actions, import/export, validation, and
  regulator exports.
- Move `tag-regulator` from `tag-vocabulary-package` to
  `literature-workbench-package` while preserving workflow id and skill id.
- Remove the user-facing `valid_tags_format` parameter from `tag-regulator`.
  Host request building always materializes YAML and sends
  `valid_tags_format: "yaml"` internally.
- Remove `tag-regulator` fallback reads/writes against `tagVocabularyJson` and
  `tagVocabularyStagedJson`; Synthesis APIs become the only workflow storage
  integration.
- Treat Synthesis Git Sync as the remote sync path for tag vocabulary; legacy
  tag-manager GitHub subscribe/publish settings are not preserved.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `synthesis-tag-vocabulary`: Synthesis becomes the canonical owner for tag
  management and staged regulator suggestions.
- `tag-vocabulary-management-workflow`: Legacy tag-manager is deprecated and no
  longer builtin.
- `tag-regulator-workflow`: Tag-regulator moves to literature workbench,
  consumes and mutates Synthesis vocabulary only, and uses YAML-only valid tags.
- `workflow-execution-seams`: Remove active tag-manager prefs and GitHub sync
  seams from the tag vocabulary execution contract.

## Impact

- Affected areas: Synthesis tag vocabulary service, workflow host API,
  `tag-regulator` build/apply hooks, builtin workflow manifests, OpenSpec
  contracts, and workflow/tag vocabulary tests.
- Compatibility: `tag-regulator` keeps id `tag-regulator` and skill id
  `tag-regulator`. The backend skill contract still receives `valid_tags` plus
  `valid_tags_format`, but the host always sends YAML.
- Out of scope: migrating old prefs data, preserving tag-manager GitHub
  workflow settings, or keeping tag-manager loadable as a builtin workflow.
