# Spec Delta

## ADDED Requirements

### Requirement: Native Topic Detail SHALL adapt discovery storage to the public candidate contract

The native Topic Workbench surface SHALL map internal discovery records to the strict public candidate DTO before returning Topic Detail or discovery-command results. It MUST NOT expose internal lifecycle states, raw matching fields, outcome payloads, or arbitrary stored properties.

#### Scenario: Ready Topic Detail crosses the native surface
- **WHEN** the Topic application returns actionable discovery candidates
- **THEN** native Topic Detail returns bounded open and rejected candidate arrays that satisfy the public capability result definition

#### Scenario: Stored record contains private fields
- **WHEN** a discovery record contains matching details, outcome data, or unknown storage extensions
- **THEN** the public candidate contains only the allowlisted candidate fields
- **AND** the complete Topic Detail still passes recursive capability validation

#### Scenario: Discovery status changes
- **WHEN** the native surface commits reject or restore for a valid hint
- **THEN** its result returns the updated strict public candidate rather than the stored payload

