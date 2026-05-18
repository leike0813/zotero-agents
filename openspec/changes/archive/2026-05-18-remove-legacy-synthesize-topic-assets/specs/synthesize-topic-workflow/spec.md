# synthesize-topic-workflow

## MODIFIED Requirements

### Requirement: Topic synthesis workflows use split create/update entrypoints

Topic synthesis workflow execution SHALL use `create-topic-synthesis` and
`update-topic-synthesis` as the builtin entrypoints. The legacy single
`synthesize-topic` workflow and skill SHALL NOT be published.

#### Scenario: Builtin workflow package is loaded

- **WHEN** builtin workflow manifests are loaded from `workflows_builtin`
- **THEN** `create-topic-synthesis` SHALL be discovered
- **AND** `update-topic-synthesis` SHALL be discovered
- **AND** `synthesize-topic` SHALL NOT be discovered as a workflow.

#### Scenario: Builtin skill registry is scanned

- **WHEN** builtin skills are scanned
- **THEN** `create-topic-synthesis` SHALL be registered
- **AND** `update-topic-synthesis` SHALL be registered
- **AND** `synthesize-topic` SHALL NOT be registered.

### Requirement: Topic synthesis apply hook is shared by current workflows

The topic synthesis apply hook SHALL be owned by the synthesis-layer package
rather than by the removed legacy workflow directory.

#### Scenario: Create and update workflows declare applyResult

- **WHEN** create/update topic synthesis workflow manifests are inspected
- **THEN** both SHALL reference the neutral synthesis-layer apply hook.
