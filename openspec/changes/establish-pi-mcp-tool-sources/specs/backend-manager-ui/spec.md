# Spec Delta

## ADDED Requirements

### Requirement: Built-in Agent page manages MCP Tool Sources

The Built-in Agent page SHALL allow explicit source configuration, import preview, source testing, tool selection/review, direct-tool promotion, disable and delete without changing Backend Profile rows. It SHALL show redacted source credential metadata and request-bound test status, with no raw secret in snapshots or result messages.

#### Scenario: Review a discovered tool
- **WHEN** the user tests a source and selects a discovered tool
- **THEN** only the reviewed descriptor becomes eligible for a later turn

#### Scenario: Source credential stays private
- **WHEN** the user saves or imports a source credential
- **THEN** the page clears the input and subsequent snapshots contain only redacted metadata

