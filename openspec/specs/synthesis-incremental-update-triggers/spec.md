## ADDED Requirements

### Requirement: Canonical maintenance epochs coalesce WebDAV autosync

Synthesis canonical maintenance SHALL publish one WebDAV autosync opportunity
after the active maintenance epoch drains, while projection and job writes
remain outside the trigger boundary.

#### Scenario: Maintenance writes several canonical batches

- **WHEN** active maintenance workers commit several canonical batches
- **THEN** the epoch SHALL be marked dirty once
- **AND** WebDAV autosync SHALL wait for all active workers to drain before its
  debounce window begins.

