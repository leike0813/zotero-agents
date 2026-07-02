## Why

Zotero supports plugin-defined library item tree columns. The current spike
proves that the plugin can add an `Artifacts` column, but it only exposes the
source Markdown artifact. Users need the same library-level glanceability for
generated digest, references, and citation-analysis notes without paying the
cost of full Synthesis sidecar validation on every item-tree refresh.

The Synthesis Index already exposes D/R/C artifact availability from validated
registry state, but it uses text badges that no longer match the new Artifacts
icon language.

## What Changes

- Document and complete the Zotero library `Artifacts` custom column.
- Display source Markdown, digest, references, and citation-analysis artifacts
  as compact icons in that column.
- Keep the library column detection lightweight: source Markdown is checked by
  attachment filename, and generated notes are checked through `parseNoteKind()`
  note markers plus payload-anchor markers without decoding payloads.
- Replace the Synthesis Index D/R/C text badges with the same artifact icon
  assets while preserving the existing registry-backed availability semantics.

## Capabilities

### New Capabilities

- `zotero-library-artifacts-column`: adds the custom Zotero library item tree
  column and its lightweight artifact detection contract.

### Modified Capabilities

- `synthesis-tab-ui`: the Index Artifacts column renders artifact icons instead
  of D/R/C text badges.
- `zotero-skills-visual-theme`: artifact status icons are a reusable bundled SVG
  set for Zotero library and Synthesis browser UI surfaces.

## Impact

- Affects Zotero library item tree rendering, Synthesis Index rendering, and
  icon assets.
- Does not add settings, click actions, payload validation, database reads, or
  workflow protocol changes to the library column.
