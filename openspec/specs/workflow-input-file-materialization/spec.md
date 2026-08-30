# workflow-input-file-materialization Specification

## Purpose
Defines the workflow host API contract for materializing generated provider input files under managed runtime temporary storage.

## Requirements

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

### Requirement: Managed input materialization isolates workflow and key paths

The workflow host API SHALL sanitize workflow id, input key, and file name segments before writing generated provider input files.

#### Scenario: Unsafe path segments are provided

- **WHEN** a workflow hook materializes a provider input file with unsafe or traversal-like path segments
- **THEN** the host API SHALL normalize those segments to safe managed path segments
- **AND** the written path SHALL remain under `runtime/tmp/workflow-inputs`

#### Scenario: Repeated materialization uses unique paths

- **WHEN** a workflow hook materializes the same workflow id, input key, and file name more than once
- **THEN** each call SHALL return a distinct path
- **AND** later calls SHALL NOT overwrite earlier materialized files.

### Requirement: Workflow input materialization SHALL use centralized strict file operations

Managed workflow input files SHALL validate payload exclusivity, safe path segments, reserved names, uniqueness, and bounded size before delegating writes to strict runtime-persistence operations. The materializer MUST NOT select its own runtime filesystem adapter.

#### Scenario: Runtime adapter is unavailable

- **WHEN** input materialization has a valid payload but no strict filesystem adapter is available
- **THEN** materialization fails before publishing a managed path

#### Scenario: Runtime changes after host projection creation

- **WHEN** a cached host projection materializes an input after runtime globals change
- **THEN** the operation uses the current adapter and preserves the managed naming policy
### Requirement: Stored attachment inputs SHALL be fully staged before Host mutation

Stored attachment source and companion paths SHALL be normalized, validated for safe relative placement, proven readable, and copied into managed staging before a Zotero attachment is created. Linked-file inputs SHALL validate their declared locality without being copied into managed storage.

#### Scenario: Companion path escapes its source root

- **WHEN** a companion path is absolute, traverses outside the allowed root, collides after normalization, or cannot be read
- **THEN** the request fails before creating a Zotero attachment

### Requirement: Post-create attachment failure SHALL preserve the primary error

After attachment creation, failure to install staged files, update placement, verify final state, or clean staging SHALL trigger best-effort removal of the new attachment. Cleanup failures SHALL be secondary evidence and MUST NOT replace the original failure.

#### Scenario: File installation and rollback both fail

- **WHEN** the staged file cannot be installed and the new attachment cannot be removed
- **THEN** the mutation returns `repair_required`, preserves installation failure as primary, and reports bounded residual attachment evidence
