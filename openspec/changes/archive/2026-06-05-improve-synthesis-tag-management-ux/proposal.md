## Why

Synthesis Tags is now the canonical tag management surface, but the current UI
still reads like a collection of controls around generic tables. Users need a
denser workbench for scanning canonical vocabulary and processing staged
tag-regulator suggestions without opening a separate inspector.

## What Changes

- Rework the Tags page into a summary bar plus a main table work area.
- Replace the ad-hoc Vocabulary/Staged buttons with segmented navigation.
- Present canonical and staged detail directly in tables, expandable rows, and
  inline edit status.
- Add staged multi-select with bulk promote and bulk discard actions.
- Keep `rebuildTagVocabularyIndex` out of the Tags page action bar.

## Impact

- Affects Synthesis Workbench Tags UI and UI model state only.
- Reuses existing Synthesis tag vocabulary and staged suggestion host commands.
- Does not restore or reuse legacy tag-manager UI.
