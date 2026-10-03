# Spec Delta

## ADDED Requirements

### Requirement: Provider input retains prepared instruction and tool meaning

The Provider adapter SHALL normalize the prepared request while preserving instructions, message roles and tool definitions exactly once. Normalization SHALL NOT expand credentials, permission, Provider selection or durable transcript formats.

#### Scenario: Prepared instructions and tools reach an API request
- **WHEN** the frozen Provider executes a prepared instruction/message/tool context
- **THEN** the actual API request retains each instruction and tool definition once and uses only the selected authorization
