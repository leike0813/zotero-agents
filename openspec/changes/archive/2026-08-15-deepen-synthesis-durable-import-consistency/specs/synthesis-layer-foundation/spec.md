## MODIFIED Requirements

### Requirement: Canonical asset service validates and persists assets

Synthesis Layer foundation SHALL provide internal helpers that read, validate,
and write canonical JSON assets through registered schemas and plugin-safe
runtime persistence APIs.

#### Scenario: Valid asset is written and read

- **WHEN** a canonical JSON asset matches its registered schema and its managed
  relative path satisfies canonical asset policy
- **THEN** the asset service SHALL persist it as a versioned canonical envelope
- **AND** a later read SHALL return the validated envelope data.

#### Scenario: Invalid asset path is rejected before staging

- **WHEN** any canonical transaction asset path violates KG scope, traversal,
  segment, relative path budget, reserved name, or case-collision rules
- **THEN** the foundation SHALL reject the transaction before staging
- **AND** it SHALL NOT write target assets, receipts, or projection stale marks.

### Requirement: WebDAV durable import uses one Foundation transaction

WebDAV durable import SHALL apply validated canonical assets through one
Foundation transaction. The import SHALL become successful only after canonical
promotion completes, all promoted targets are verified, and the repository
commit receipt is cleared.

#### Scenario: Valid import is promoted

- **WHEN** a WebDAV durable import passes validation, preview, and conflict gates
- **THEN** one Foundation transaction SHALL apply all imported canonical facts
- **AND** an interrupted promotion SHALL remain unsuccessful until ready-gated
  recovery completes it
- **AND** WebDAV import SHALL NOT schedule canonical autosync publication.

## REMOVED Requirements

### Requirement: Canonical transactions emit a single store change event

**Reason**: Native production has no emitter or consumer for this historical event, and canonical autosync now uses the central post-commit classifier. Retaining the requirement would create a second fact source and could reintroduce WebDAV import publication loops.

**Migration**: Callers observe committed mutation results and the existing projection-staleness state. WebDAV imports remain excluded from canonical autosync triggers.

