## ADDED Requirements

### Requirement: Release replacement SHALL preserve the previous install on failure

The installer SHALL extract and validate a release in a sibling staging directory before replacing an existing version. Promotion failure SHALL attempt to restore the previous directory without overwriting another target. Failed restoration SHALL retain the backup and report its location with the primary failure.

#### Scenario: Extraction or validation fails during same-version reinstall

- **WHEN** the new archive partially extracts or lacks required artifacts
- **THEN** the existing install retains its original contents

#### Scenario: Promotion fails and another target is present

- **WHEN** the staged directory cannot be promoted and the final path already exists
- **THEN** restoration does not overwrite that path
- **AND** the previous install remains in the reported backup

### Requirement: Temporary release artifacts SHALL follow outcome-specific retention

The installer SHALL select temporary artifact retention from the final outcome for both normal returns and exceptions.

#### Scenario: A failure returns before the exception handler

- **WHEN** download, checksum, extraction or validation returns a failure
- **THEN** keepTempOnFailure determines artifact retention independently of keepTempOnSuccess
