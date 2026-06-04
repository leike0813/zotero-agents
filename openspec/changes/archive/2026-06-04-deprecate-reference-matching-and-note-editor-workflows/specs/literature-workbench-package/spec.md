## MODIFIED Requirements

### Requirement: literature-workbench-package SHALL unify builtin literature workflows under one package

The builtin package `literature-workbench-package` MUST provide the stable package home for active literature note generation, import/export, explainer, and ingestion workflows. Deprecated note-level workflows MUST NOT remain exposed as active built-in workflow ids.

#### Scenario: active workflow identity remains stable across package rename

- **WHEN** the package is loaded
- **THEN** workflow ids such as `literature-digest`, `literature-explainer`, `export-notes`, and `import-notes` SHALL remain unchanged
- **AND** deprecated note-level workflows `reference-matching` and `reference-note-editor` SHALL NOT be exposed as active built-in workflow ids.

## ADDED Requirements

### Requirement: Deprecated reference note workflows SHALL be archived only

Historical `reference-matching` and `reference-note-editor` implementations MAY remain under `deprecated/**`, but active built-in packaging SHALL NOT load, copy, menu-render, or settings-render them.

#### Scenario: Built-in manifest excludes deprecated workflows

- **WHEN** active built-in workflow files are synchronized and loaded
- **THEN** `workflows_builtin/manifest.json` SHALL NOT list `reference-matching` or `reference-note-editor` files
- **AND** `literature-workbench-package/workflow-package.json` SHALL NOT list either workflow id.
