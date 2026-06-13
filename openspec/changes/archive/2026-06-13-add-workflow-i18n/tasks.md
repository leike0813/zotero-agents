## 1. Specs

- [x] 1.1 Add delta specs for workflow manifest/package i18n resources.
- [x] 1.2 Add delta specs for localized settings/menu/dashboard display behavior.
- [x] 1.3 Add localization governance boundary for workflow package strings.

## 2. Implementation

- [x] 2.1 Extend workflow types and JSON schemas for optional i18n metadata.
- [x] 2.2 Load package locale JSON resources during workflow scan and attach them to `LoadedWorkflow`.
- [x] 2.3 Add shared workflow localization resolver with exact/language/default/raw fallback.
- [x] 2.4 Use localized display text in workflow menu, settings descriptors/dialog model, dashboard workflow projections, and new run labels.
- [x] 2.5 Add built-in `literature-workbench-package` locale resources and include them in the built-in manifest.
- [x] 2.6 Update workflow/localization documentation.

## 3. Validation

- [x] 3.1 Add focused loader/schema tests for inline and package i18n.
- [x] 3.2 Add resolver and UI descriptor tests for localized display projection.
- [x] 3.3 Run focused tests, built-in manifest check, TypeScript, and strict OpenSpec validation.
