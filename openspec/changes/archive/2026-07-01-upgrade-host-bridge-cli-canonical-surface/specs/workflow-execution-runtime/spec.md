## ADDED Requirements

### Requirement: Workflow skills use canonical Host Bridge CLI commands

Workflow skill packages that call Host Bridge CLI SHALL use the canonical CLI
surface generated for the current minor version.

#### Scenario: Runtime-owned CLI argv uses canonical namespace
- **WHEN** topic synthesis or literature deep-reading runtime scripts invoke
  `zotero-bridge`
- **THEN** the argv SHALL use canonical groups such as `synthesis topic`,
  `synthesis graph`, `synthesis resolver`, and `synthesis artifact`
- **AND** the runtime SHALL NOT invoke removed top-level groups such as
  `topics`, `citation-graph`, `resolvers`, or `paper-artifacts`.

#### Scenario: Skill instructions show current-state CLI examples
- **WHEN** built-in workflow skills or profile skills include Host Bridge CLI
  examples
- **THEN** examples SHALL use canonical commands
- **AND** instructions SHALL NOT include backward-compatibility notes for
  removed legacy CLI commands.
