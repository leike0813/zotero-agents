## ADDED Requirements

### Requirement: Official content installation SHALL expose shared progress

Official Workflow package installation SHALL expose a coarse, shared progress snapshot that UI surfaces can consume while an install is active.

#### Scenario: Installer reports coarse stages

- **WHEN** official content package installation runs
- **THEN** it SHALL report progress for feed checking, package download, verification, extraction, staging, promotion, state writing, registry refresh, and completion
- **AND** progress SHALL include a stable stage id, current step, total step count, percent, and fallback label.

#### Scenario: Preferences reuses the shared progress

- **WHEN** Preferences is open during official content package installation
- **THEN** the official package area SHALL show the shared progress snapshot using its progress bar
- **AND** it SHALL hide the progress row when no install is active.

#### Scenario: Completion semantics remain unchanged

- **WHEN** official content package installation succeeds or fails
- **THEN** the installed package state schema SHALL remain unchanged
- **AND** existing final success/failure user feedback SHALL remain available.
