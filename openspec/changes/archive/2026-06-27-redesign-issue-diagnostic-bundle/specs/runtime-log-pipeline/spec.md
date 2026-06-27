## MODIFIED Requirements

### Requirement: Runtime Log Pipeline SHALL Default to Recording info/warn/error and Not Record debug by Default

The default runtime write policy SHALL record `info`, `warn`, and `error` levels while excluding `debug` unless diagnostic collection is explicitly enabled.

#### Scenario: Debug entry under default policy

- **WHEN** a debug-level write is attempted under default settings
- **THEN** the pipeline SHALL ignore it and keep stored entries unchanged.

#### Scenario: Error entry under default policy

- **WHEN** an error-level write is attempted under default settings
- **THEN** the pipeline SHALL store the entry successfully.

## ADDED Requirements

### Requirement: Runtime Log Pipeline SHALL Cover Backend Cache Refresh Diagnostics

The runtime log pipeline SHALL record high-signal backend cache refresh events for issue diagnostics.

#### Scenario: ACP runtime options refresh

- **WHEN** an ACP backend runtime options refresh starts, succeeds, or fails
- **THEN** the system SHALL append structured runtime logs with backend identity, operation, stage, workspace/runtime path summaries, cache counts when available, and sanitized error details.

#### Scenario: SkillRunner model cache refresh

- **WHEN** a SkillRunner model cache refresh starts, succeeds, or fails
- **THEN** the system SHALL append structured runtime logs with backend identity, operation, request path summaries, engine/model counts when available, duration when available, and sanitized error details.
