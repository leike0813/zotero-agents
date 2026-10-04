## ADDED Requirements

### Requirement: ChatGPT task authorization separates execution from automation

A user-started Workflow SHALL authorize its ordinary continuous model calls in either lane. Unattended or startup continuation SHALL additionally require explicit task-scoped consent bound to the active registration. Missing consent or quota pause SHALL leave the original owner manually continuable after all recovery checks; sealed results and unknown-effect holds SHALL remain unchanged.

#### Scenario: Safe checkpoint lacks consent

- **WHEN** a previously running ChatGPT task has a safe checkpoint but no task automation consent
- **THEN** startup does not dispatch and existing explicit continuation controls remain available
