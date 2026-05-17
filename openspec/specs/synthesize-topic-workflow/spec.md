# synthesize-topic-workflow Specification

## Purpose
Defines the active topic synthesis workflow contract. The legacy single
`synthesize-topic` workflow is removed; current entrypoints are
`create-topic-synthesis` and `update-topic-synthesis`.

## Requirements
### Requirement: Topic synthesis workflow result bundles are validated

Topic synthesis workflows SHALL produce a verifiable result bundle before formal
persistence.

#### Scenario: Valid bundle is received

- **WHEN** a bundle contains topic definition, resolver, resolved paper set,
  diagnostics, metadata, markdown, timeline, and base hashes
- **THEN** the validator SHALL accept the bundle.

#### Scenario: Unsupported synthesis kind is received

- **WHEN** a bundle kind is not `topic_synthesis`
- **THEN** the validator SHALL reject it.

### Requirement: Agents do not directly write formal assets

The workflow result bundle SHALL NOT contain direct write instructions for raw
Zotero source, canonical indexes, or note shards.

#### Scenario: Direct writes are requested

- **WHEN** a bundle contains write instructions
- **THEN** the validator SHALL reject it.

### Requirement: Apply decision uses base hashes

Workflow apply decisions SHALL use optimistic base-hash checks.

#### Scenario: Base hashes match

- **WHEN** current hashes match bundle base hashes
- **THEN** apply decision SHALL be `persist`.

#### Scenario: Base hashes mismatch

- **WHEN** current hashes differ from bundle base hashes
- **THEN** apply decision SHALL be `conflict`
- **AND** it SHALL return mismatch details without auto-merging Markdown.

### Requirement: Topic synthesis workflows use split create/update entrypoints

Topic synthesis workflow execution SHALL use `create-topic-synthesis` and
`update-topic-synthesis` as builtin entrypoints. The legacy single
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
rather than by a legacy workflow directory.

#### Scenario: Create and update workflows declare applyResult

- **WHEN** create/update topic synthesis workflow manifests are inspected
- **THEN** both SHALL reference the neutral synthesis-layer apply hook.
