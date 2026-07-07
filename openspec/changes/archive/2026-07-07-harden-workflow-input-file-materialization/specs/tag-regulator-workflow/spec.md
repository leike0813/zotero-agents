## ADDED Requirements

### Requirement: Tag regulator generated input files SHALL use managed workflow input materialization
The tag-regulator workflow SHALL materialize generated skill input files through the workflow host API managed input materialization operation.

#### Scenario: Valid tags YAML is generated
- **WHEN** tag-regulator builds a request with controlled vocabulary tags
- **THEN** it SHALL materialize the generated `valid_tags` YAML through `runtime.hostApi.file.materializeWorkflowInputFile(...)`
- **AND** ACP requests SHALL reference the returned absolute local path
- **AND** SkillRunner requests SHALL use the returned path as the source for the existing upload file entry

#### Scenario: Standalone digest markdown is generated
- **WHEN** standalone tag-regulator builds a request with parent digest markdown
- **THEN** it SHALL materialize the generated digest markdown through `runtime.hostApi.file.materializeWorkflowInputFile(...)`
- **AND** SkillRunner upload packaging semantics SHALL remain unchanged.
