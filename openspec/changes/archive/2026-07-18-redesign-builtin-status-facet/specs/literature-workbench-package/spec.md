## ADDED Requirements

### Requirement: Literature Workbench package documentation SHALL use workflow pending status semantics
Package documentation and localized copies MUST state that builtin statuses exist after plugin startup, may coexist on an item, are not created by Bootstrapper or Regulator, and are not automatically cleared by manual PDF attachment.

#### Scenario: User consults status documentation
- **WHEN** the user reads package or site documentation
- **THEN** it SHALL present the five builtin statuses and lifecycle transition table
- **AND** SHALL NOT recommend numeric reading progress, `status:to_read`, `status:0-inbox`, `match_status`, or `matching_status`
