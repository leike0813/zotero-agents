## ADDED Requirements

### Requirement: Tag Regulator apply boundary SHALL preserve builtin workflow status instances
The non-submodule apply boundary MUST filter all builtin status values from both `add_tags` and `remove_tags`, record structured diagnostics, and continue applying ordinary tag changes.

#### Scenario: Mixed ordinary and builtin changes are returned
- **WHEN** Regulator returns both ordinary tag changes and builtin status changes
- **THEN** only ordinary changes SHALL be applied to the literature item
- **AND** each ignored builtin operation SHALL be represented by a diagnostic
