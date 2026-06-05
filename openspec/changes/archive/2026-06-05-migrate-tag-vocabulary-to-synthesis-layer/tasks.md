## 1. OpenSpec Contracts

- [x] 1.1 Add proposal, design, tasks, and delta specs for the migration.
- [x] 1.2 Validate the OpenSpec change in strict mode.

## 2. Synthesis Tag Vocabulary APIs

- [x] 2.1 Add staged suggestion data types and deterministic normalization in the Synthesis tag vocabulary service.
- [x] 2.2 Expose list, stage, promote, discard, and clear staged suggestion APIs through `SynthesisService`.
- [x] 2.3 Keep canonical vocabulary writes behind the existing autosync write boundary.

## 3. Workflow Packaging

- [x] 3.1 Move `tag-regulator` into `literature-workbench-package`.
- [x] 3.2 Remove `tag-vocabulary-package` and `tag-manager` from builtin workflow registration.
- [x] 3.3 Update workflow scan and manifest tests for the new package ownership.

## 4. Tag-Regulator Hooks

- [x] 4.1 Remove user-facing `valid_tags_format` and always send YAML internally.
- [x] 4.2 Remove prefs-backed vocabulary fallback from request building.
- [x] 4.3 Route accepted and staged `suggest_tags` through Synthesis tag vocabulary APIs.

## 5. Tests and Verification

- [x] 5.1 Add focused Synthesis tag vocabulary tests for staged suggestions and regulator export.
- [x] 5.2 Update tag-regulator tests for Synthesis-only storage and package path.
- [x] 5.3 Run targeted workflow, Synthesis, and OpenSpec validation commands.

## 6. Synthesis Workbench Staged Inbox

- [x] 6.1 Extend Tags snapshot/model with staged rows, visible staged rows, staged count, staged filters, and active tag subview.
- [x] 6.2 Add Vocabulary/Staged segmented UI in Synthesis Workbench Tags.
- [x] 6.3 Implement staged search, facet filtering, parent count display, inline tag/note editing, promote, discard, and confirmed clear-all actions.
- [x] 6.4 Add Workbench host commands for staged update, promote, discard, and clear with Tags surface refresh.
- [x] 6.5 Apply promoted staged tags to bound parent items and report parent mutation diagnostics without rolling back vocabulary promotion.
- [x] 6.6 Keep duplicate canonical promotions staged when they are skipped.
- [x] 6.7 Extend Synthesis service and Workbench UI tests for staged inbox behavior.
