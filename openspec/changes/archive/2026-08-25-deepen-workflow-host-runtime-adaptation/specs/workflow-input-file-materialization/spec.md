## MODIFIED Requirements

### Requirement: Workflow host API materializes provider input files under managed runtime tmp

The Workflow Input Materialization module SHALL implement the workflow host file
operation for files that workflow hooks generate as provider inputs. It SHALL
write under the plugin-managed runtime tmp root through strict runtime filesystem
operations while preserving the Workflow Host API v11 interface.

#### Scenario: Text input file is materialized

- **WHEN** a workflow hook materializes a text provider input file with workflow
  id, input key, file name, and content
- **THEN** the host SHALL write the file under `runtime/tmp/workflow-inputs`
- **AND** it SHALL return an absolute local path to the written file.

#### Scenario: Binary input file is materialized

- **WHEN** a workflow hook materializes a binary provider input file with
  workflow id, input key, file name, and bytes
- **THEN** the host SHALL write the file under `runtime/tmp/workflow-inputs`
- **AND** it SHALL return an absolute local path to the written file.

#### Scenario: Invalid materialization request fails

- **WHEN** a workflow hook requests materialization without exactly one content
  payload
- **THEN** the operation SHALL fail before writing a provider input file.
