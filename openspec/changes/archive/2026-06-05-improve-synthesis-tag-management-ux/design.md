## Design

The Tags page remains a native DOM-rendered Workbench surface. The redesign uses
existing Workbench primitives and CSS tokens, with Tags-specific classes where
the current global `panel` and `filters` styles are too generic.

The page layout is:

- summary/action bar: canonical count, staged count, warning count, cache state,
  plus Validate, Export, and Import actions;
- segmented subview navigation: Vocabulary and Staged;
- subview toolbar: search/filter controls and view-specific bulk actions;
- table work area: direct row content, inline edit state, and expandable
  long-form details.

No right-side inspector is rendered. Vocabulary rows expose note, source,
aliases, abbreviations, warnings, status, and usage in the table. Staged rows
expose tag edit, note edit, parent count, source flow, updated time, and
row-level promote/discard actions in the table.

Staged bulk actions use existing host commands with `tags: [...]`. Clear All
remains a confirmed destructive action and is only available when staged rows
exist.

`rebuildTagVocabularyIndex` remains a host command for other internal flows, but
the Tags UI does not expose it.
