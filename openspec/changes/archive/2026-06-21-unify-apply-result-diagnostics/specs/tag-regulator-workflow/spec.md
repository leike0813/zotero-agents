## MODIFIED Requirements

### Requirement: Workflow SHALL apply tag-regulator result conservatively
The workflow MUST apply `remove_tags` and `add_tags` only when output mutation fields are valid.

#### Scenario: Successful normalization result
- **WHEN** skill returns valid output with mutation fields
- **THEN** workflow SHALL remove tags listed in `remove_tags` and add tags listed in `add_tags`
- **AND** parent tags not listed in mutations SHALL remain unchanged
- **AND** skill output diagnostics such as `error` and `warnings` SHALL be returned for user review without blocking valid mutations.

#### Scenario: Skill reports error with valid mutation payload
- **WHEN** skill returns `error != null`
- **AND** `remove_tags`, `add_tags`, and `suggest_tags` are structurally valid
- **THEN** workflow SHALL still apply the valid tag mutation payload
- **AND** workflow SHALL include the skill error in returned diagnostics.

#### Scenario: Malformed payload
- **WHEN** output schema check fails or required mutation fields are malformed
- **THEN** workflow SHALL skip tag mutation for that parent
- **AND** SHALL emit warnings/diagnostics for user review.
