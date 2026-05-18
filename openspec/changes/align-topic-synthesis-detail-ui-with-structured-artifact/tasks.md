# Tasks

## 1. OpenSpec

- [x] Add proposal, design, tasks, and delta specs for the Topic Detail UI
  alignment.

## 2. UI Contract Tests

- [x] Add/update static tests for direct structured detail shell rendering,
  six tabs, topic tokens, and update workflow host handling.

## 3. Detail Shell and Rendering

- [x] Render structured Topic Detail outside the generic Workbench shell.
- [x] Add six detail tabs and map current structured sections to readable UI.
- [x] Preserve Markdown reader as a secondary export view.
- [x] Wire evidence/timeline interactions to the existing digest modal.

## 4. Styling

- [x] Align Topic Detail CSS tokens and layout with the mockup and token sheet.
- [x] Remove structured detail dependency on nested `reader-panel
  topic-detail-panel`.

## 5. Host Action

- [x] Handle `submitTopicSynthesisUpdate` from the detail topbar via the
  `update-topic-synthesis` workflow.

## 6. Verification

- [x] Run `npm run test:node:raw:core -- --grep "Synthesis tab UI"`.
- [x] Run `npm run test:node:core`.
- [x] Run `npm run build`.
- [x] Run `openspec validate align-topic-synthesis-detail-ui-with-structured-artifact --strict`.
