# zotero-host-capability-broker Delta

## ADDED Requirements

### Requirement: Workflow Host API SHALL Support Binary Workflow Files

`WorkflowHostApi.file` SHALL expose binary file operations for workflow packages
that need to round-trip sidecar artifacts without embedding bytes in JSON.

#### Scenario: Workflow writes binary sidecar artifact
- **WHEN** a workflow package receives Host API v5
- **THEN** `hostApi.file.readBytes`, `hostApi.file.writeBytes`, and `hostApi.file.copy` SHALL be available
- **AND** those operations SHALL support local workflow sidecar files such as representative note images.
