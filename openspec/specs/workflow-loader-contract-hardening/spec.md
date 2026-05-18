# workflow-loader-contract-hardening Specification

## Purpose
TBD - created by archiving change harden-workflow-loader-contracts. Update Purpose after archive.
## Requirements
### Requirement: Loader SHALL enforce explicit manifest and hook contracts
Workflow loading MUST validate manifest and required hooks through explicit contract checks before exposing loaded entries.

#### Scenario: Missing required hook is classified deterministically
- **WHEN** a workflow manifest references a required hook file that does not exist
- **THEN** loader reports a normalized `hook_missing_error` classification
- **AND** workflow is excluded from loaded workflows

#### Scenario: Invalid manifest shape is classified deterministically
- **WHEN** a workflow manifest fails schema/shape validation
- **THEN** loader reports a normalized `manifest_validation_error` classification
- **AND** workflow is excluded from loaded workflows

### Requirement: Loader SHALL preserve behavior parity for valid workflows
Hardening changes MUST NOT alter successful load behavior for valid workflow packs.

#### Scenario: Valid workflow set remains load-equivalent
- **WHEN** loader scans a directory containing valid workflows
- **THEN** loaded workflow count and ids remain equivalent to current behavior
- **AND** scan integration consumers (startup/menu) receive equivalent ready-state outcomes

### Requirement: Loader outputs SHALL be deterministic for diagnostics and tests

Warnings/errors, loaded entries, and startup-adjacent workflow diagnostics MUST
be emitted in deterministic order and include enough context to distinguish
loader failures from packaged built-in sync failures.

#### Scenario: Debug probe reports workflow source counts

- **WHEN** a workflow debug probe runs after startup
- **THEN** it SHALL report builtin workflow count and user workflow count
- **AND** it SHALL include latest built-in sync status when available.

#### Scenario: Empty workflow list preserves cause

- **WHEN** no workflows are loaded because built-in sync failed
- **THEN** diagnostics SHALL include the built-in sync failure details
- **AND** the user-facing debug path SHALL not require inspecting console logs
  alone.

### Requirement: Loader hardening SHALL support seam-level testing
Validation and classification logic MUST be testable independently from scan-side effects.

#### Scenario: Contract helper test without runtime scan
- **WHEN** contract-level tests run against fixture manifests/hooks
- **THEN** classification and normalization are asserted without requiring full startup/menu initialization

