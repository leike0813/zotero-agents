# synthesis-git-sync Specification

## Purpose
Documents the retired Synthesis Git Sync capability. All Git Sync runtime, preferences, credentials, service methods, client commands, Workbench projection, tests, and documentation have been deleted. WebDAV durable sync is the only Synthesis durable-sync transport.

## Requirements

### Requirement: Git Sync capability is retired

Synthesis SHALL NOT provide a Git Sync transport. All Git Sync runtime, command adapter, preferences, credential storage, service methods, client commands, Workbench projection, tests, and documentation have been removed without compatibility shims.

#### Scenario: No Git Sync runtime exists
- **WHEN** the Synthesis application service constructs its runtime composition
- **THEN** it SHALL NOT construct a Git Sync adapter, read Git Sync preferences, or expose Git Sync service methods
- **AND** WebDAV durable sync SHALL be the only Synthesis durable-sync transport.

#### Scenario: Startup cleanup removes legacy Git directories
- **WHEN** the plugin starts and detects plugin-managed Git runtime directories
- **THEN** it SHALL remove those directories as idempotent startup cleanup
- **AND** it SHALL NOT recreate Git Sync runtime state.
