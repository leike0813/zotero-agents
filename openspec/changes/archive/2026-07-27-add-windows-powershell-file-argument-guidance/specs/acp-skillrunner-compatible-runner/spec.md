## ADDED Requirements

### Requirement: ACP Skills startup preamble SHALL guide PowerShell file arguments

The packaged ACP Skills startup preamble SHALL instruct agents that, when Windows PowerShell invokes a command-line tool or script and that target supports an `@file` argument form, structured or path-containing values SHALL prefer that form over inline command-line values to reduce shell quoting and escaping errors.

#### Scenario: ACP Skills starts with conditional file-argument guidance
- **WHEN** ACP Skills builds its startup preamble
- **THEN** the rendered preamble SHALL contain the conditional PowerShell `@file` guidance
- **AND** it SHALL preserve existing ACP Skills run-local contract and Host Bridge guidance.
