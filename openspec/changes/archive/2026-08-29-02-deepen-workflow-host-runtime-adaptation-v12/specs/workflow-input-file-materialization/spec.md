## ADDED Requirements

### Requirement: Workflow input materialization SHALL use centralized strict file operations
Managed workflow input files SHALL validate payload exclusivity, safe path segments, reserved names, uniqueness, and bounded size before delegating writes to strict runtime-persistence operations. The materializer MUST NOT select its own runtime filesystem adapter.

#### Scenario: Runtime adapter is unavailable
- **WHEN** input materialization has a valid payload but no strict filesystem adapter is available
- **THEN** materialization fails before publishing a managed path

#### Scenario: Runtime changes after host projection creation
- **WHEN** a cached host projection materializes an input after runtime globals change
- **THEN** the operation uses the current adapter and preserves the managed naming policy
