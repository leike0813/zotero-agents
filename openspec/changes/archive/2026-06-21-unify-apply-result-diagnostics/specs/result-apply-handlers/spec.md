## ADDED Requirements

### Requirement: Builtin apply hooks preserve skill diagnostics without treating them as apply blockers

Builtin workflow apply hooks SHALL treat skill output `warnings`, `error`, `status`, `kind`, and `reason` fields as diagnostics for result application. A non-null skill output `error` or failed-like skill output status SHALL NOT by itself prevent a hook from applying otherwise usable business artifacts or mutation fields.

#### Scenario: Diagnostics do not block usable apply output

- **WHEN** a builtin apply hook receives canonical business output containing usable apply artifacts or mutation fields
- **AND** the same output contains `error`, failed-like `status`, failed-like `kind`, or `reason`
- **THEN** the hook SHALL attempt the normal business apply path
- **AND** the hook SHALL decide success from the result of that business apply path.

#### Scenario: Warnings are returned with apply results

- **WHEN** a builtin apply hook receives output containing `warnings`
- **THEN** successful and skipped apply returns SHALL include normalized warnings.

#### Scenario: Skill diagnostics accompany apply failures and skips

- **WHEN** a builtin apply hook cannot apply because required business input is missing or malformed
- **THEN** the skipped return SHALL include available skill diagnostics.
- **WHEN** a builtin apply hook throws because the business apply path failed
- **THEN** the thrown error SHALL include a compact summary of available skill diagnostics.
