## ADDED Requirements

### Requirement: Literature Workbench workflows SHALL use only v12 owner modules
Literature Workbench, MinerU, Synthesis-layer, and workflow-debug consumers SHALL use the named v12 library, metadata, mutation, note, image, attachment, bibliography, research-bundle, status-tag, file, archive, resource, UI, logging, and grouped Synthesis members. They MUST NOT access raw items, handlers, globals, filesystem adapters, warning bags, or flat Synthesis aliases.

#### Scenario: Tag auditor scans a library
- **WHEN** tag auditing runs under v12
- **THEN** it combines `library.traverseItems` with `synthesis.tags.withAuditRun` and promotes only completed traversal evidence

#### Scenario: Tag regulator clears an audit row
- **WHEN** a tag regulation mutation returns a confirmed receipt
- **THEN** the workflow calls `synthesis.tags.acknowledgeRegulation` with that receipt rather than a flat clear method

#### Scenario: Research bundle imports papers
- **WHEN** a Workbench workflow applies a portable Research Bundle
- **THEN** it delegates the graph to `researchBundles.importPapers` instead of sequencing raw parent, attachment, relation, and handler calls

### Requirement: Workflow partial outcomes SHALL consume structured evidence
Built-in workflows SHALL map committed/unchanged results and failed/canceled/unknown/repair-required attempts to their own user-facing or product partial outcomes. They MUST NOT infer success from missing exceptions or open warning arrays.

#### Scenario: Status transition fails after primary artifact succeeds
- **WHEN** a workflow has a valid primary artifact and status-tag transition returns a failed attempt
- **THEN** the workflow preserves the primary result and reports the structured partial diagnostic rather than silently succeeding
