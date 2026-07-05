## MODIFIED Requirements

### Requirement: Archived specs remain strict-valid

Main OpenSpec specs SHALL use the main spec structure and SHALL NOT retain change-delta headers after archive.

#### Scenario: Full strict validation runs

- **WHEN** `openspec validate --specs --strict` runs
- **THEN** archived main specs SHALL validate without delta-header or missing-purpose structural errors.
