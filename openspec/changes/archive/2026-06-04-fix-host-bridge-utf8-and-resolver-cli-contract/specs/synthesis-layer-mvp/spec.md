## MODIFIED Requirements

### Requirement: Resolver execution is deterministic
Topic Resolver execution SHALL be deterministic and plugin-owned, and `synthesis.resolve_resolver` SHALL require a canonical resolver under the top-level `resolver` input field.

#### Scenario: Resolver wrapper field is missing
- **WHEN** `synthesis.resolve_resolver` receives an input object without a valid `resolver` object
- **THEN** it SHALL return `ok: false`
- **AND** the errors SHALL identify `$.resolver` as the missing or invalid field.

#### Scenario: Workflow bundle resolver field is rejected
- **WHEN** `synthesis.resolve_resolver` receives `topic_resolver` instead of `resolver`
- **THEN** it SHALL return `ok: false`
- **AND** it SHALL explain that `topic_resolver` is not accepted by this Host Bridge/MCP contract.
