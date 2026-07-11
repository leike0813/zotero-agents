## ADDED Requirements

### Requirement: Literature Workbench Package SHALL distribute portable literature bundle workflows

The built-in `literature-workbench-package` SHALL register and distribute `export-literature-bundle` and `import-literature-bundle` alongside its existing note and analysis workflows.

#### Scenario: Package manifest is loaded
- **WHEN** the built-in literature workbench package is loaded
- **THEN** both portable bundle workflow manifests SHALL be present
- **AND** each SHALL declare `provider: "pass-through"`
- **AND** neither SHALL be classified as a core workflow.

#### Scenario: Workflow labels are localized
- **WHEN** either workflow is shown under a supported package locale
- **THEN** its label SHALL resolve through the package locale catalog
- **AND** the raw English manifest label SHALL remain the fallback.

### Requirement: Portable bundle logic SHALL reuse package-owned note and artifact codecs

The bundle workflows SHALL keep literature-specific traversal, note payload recognition, Markdown dependency collection, manifest normalization, and result shaping in shared modules owned by `literature-workbench-package`.

#### Scenario: Existing package-managed note kinds are exported
- **WHEN** bundle export encounters digest-family, custom Markdown, or conversation notes
- **THEN** it SHALL use the package's note and embedded-payload codecs to identify their semantic payloads
- **AND** core runtime modules SHALL NOT branch on those workflow or note-kind identities.

#### Scenario: Existing note export remains independent
- **WHEN** `export-notes` or `import-notes` runs after portable bundle workflows are added
- **THEN** their editable artifact exchange behavior SHALL remain unchanged
- **AND** portable item migration SHALL use the new workflow ids rather than widening the existing note workflow contract.

