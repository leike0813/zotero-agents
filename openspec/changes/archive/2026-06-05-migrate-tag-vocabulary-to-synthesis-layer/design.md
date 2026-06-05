## Overview

The migration removes the legacy workflow package as an active tag vocabulary
authority. Synthesis Tag Vocabulary becomes the only runtime store used by
Workbench UI and tag-regulator hooks.

## Storage and API Boundary

The Synthesis tag vocabulary service will keep its existing canonical entries,
aliases, abbrev, protocol, import/export, validation, and regulator export
behavior. It will add staged suggestion operations for the regulator apply
path:

- list staged suggestions;
- stage regulator suggestions with optional parent bindings;
- promote selected staged suggestions into canonical vocabulary;
- discard selected staged suggestions or clear all staged suggestions.

These APIs are exposed through `SynthesisService` and therefore through
`runtime.hostApi.synthesis`.

## Workflow Packaging

`tag-regulator` moves into `literature-workbench-package`. Its workflow id and
skill id remain `tag-regulator` so saved workflow references continue to point
to the same workflow identity. `tag-vocabulary-package` is removed from the
builtin manifest so `tag-manager` is no longer registered as a builtin workflow.

The old source files may remain in the repository as unshipped legacy code, but
they must not appear in `workflows_builtin/manifest.json`.

## Tag-Regulator Request Contract

The workflow manifest no longer declares `valid_tags_format`. The build hook
always:

- calls `runtime.hostApi.synthesis.exportTagVocabularyForRegulator()`;
- fails deterministically if the export is missing or empty;
- writes the active tag strings to a YAML upload;
- sends `parameter.valid_tags_format = "yaml"` internally.

No old prefs fallback is used.

## Tag-Regulator Apply Contract

The apply hook continues to apply `remove_tags` and `add_tags` to the current
Zotero parent item conservatively. Accepted or staged `suggest_tags` are routed
through Synthesis tag vocabulary APIs rather than prefs-backed bridges. If a
publish/promote action fails, the hook stages the suggestions through Synthesis
when possible and reports structured diagnostics.

## Workbench Staged Inbox

The Synthesis Workbench Tags surface now owns both canonical vocabulary editing
and staged suggestion review. The Tags UI adds Vocabulary and Staged subviews
within the same page so users do not need to open a legacy workflow to process
regulator suggestions.

The Workbench snapshot for the Tags surface reads canonical vocabulary and
Synthesis staged suggestions together. Its staged model includes the normalized
tag, facet, note, source flow, parent bindings, parent count, and timestamps,
plus staged-specific search and facet filters.

The Staged subview provides inline tag suffix and note editing, per-row promote
and discard actions, and a confirmed clear-all action. These controls call
Workbench host commands that route back into `SynthesisService` staged
suggestion APIs and refresh the Tags surface after completion. Promotion uses
the canonical write boundary and, when parent bindings are present, applies the
promoted tag to those parent Zotero items. Missing parent items or tag mutation
failures are returned as diagnostics without rolling back a successful
canonical vocabulary promotion.

Duplicate existing canonical tags remain staged when promotion skips them. This
keeps the row visible so the user can edit or discard it explicitly instead of
mistaking a skipped duplicate for a completed promotion.

## Compatibility

No migration runs for `tagVocabularyJson`, `tagVocabularyStagedJson`, or
tag-manager GitHub workflow settings. Existing data in those prefs is ignored
after the migration. Synthesis Git Sync remains the only remote sync mechanism
for canonical tag vocabulary state.
