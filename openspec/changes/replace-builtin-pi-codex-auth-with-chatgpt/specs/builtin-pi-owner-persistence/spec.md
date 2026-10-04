## ADDED Requirements

### Requirement: Task consent and incomplete usage remain canonical

Task-scoped ChatGPT automation consent SHALL be an owner fact bound to task scope and registration identity, default absent. It SHALL not be inferred from running status. Actual terminal, measured usage completeness and retry invocation identity SHALL remain canonical and deduplicated; legacy absent facts SHALL remain unknown without rewriting history.

#### Scenario: Task account changes

- **WHEN** a task consent names a different registration identity from continuation
- **THEN** unattended continuation is refused

#### Scenario: Failed invocation has partial usage

- **WHEN** the service supplies only part of its usage
- **THEN** the owner retains those measurements and marks its aggregate incomplete
