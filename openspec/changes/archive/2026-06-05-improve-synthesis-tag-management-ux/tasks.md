## 1. OpenSpec

- [x] 1.1 Add proposal, design, tasks, and delta spec for Tags UX workbench improvements.
- [x] 1.2 Validate the OpenSpec change in strict mode.

## 2. UI Model

- [x] 2.1 Extend Tags UI state with staged/vocabulary selection, density, editing staged tag state, and expanded rows.
- [x] 2.2 Preserve Tags subview/filter state while normalizing new UI state fields.
- [x] 2.3 Add stable operation keys for staged bulk promote/discard commands.

## 3. Renderer

- [x] 3.1 Replace the Tags inspector layout with a summary bar plus table workbench shell.
- [x] 3.2 Render Vocabulary and Staged as segmented subviews.
- [x] 3.3 Render dense Vocabulary and Staged tables with direct row detail and expandable long content.
- [x] 3.4 Add staged multi-select, bulk promote, bulk discard, and confirmed clear-all controls.
- [x] 3.5 Add inline staged edit status while preserving drafts on failure.
- [x] 3.6 Ensure `rebuildTagVocabularyIndex` is not exposed from the Tags page action bar.

## 4. Styling and Tests

- [x] 4.1 Add Tags-specific CSS classes for summary, segmented tabs, tables, bulk bar, and edit status.
- [x] 4.2 Update Synthesis tab UI tests for summary bar, segmented navigation, bulk actions, expanded rows, and no Inspector.
- [x] 4.3 Run targeted Synthesis, tag-regulator, OpenSpec, and type-check regressions.
