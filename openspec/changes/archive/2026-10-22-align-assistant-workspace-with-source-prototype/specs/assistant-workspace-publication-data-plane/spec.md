## ADDED Requirements

### Requirement: Source navigation remains current independently of active content

A visible Workspace SHALL initialize and update lightweight navigation for every source. Inactive source navigation SHALL update counts, attention and creation choices without reading transcript or owner regions. Closing the Workspace SHALL stop that work. Late deliveries from replaced documents SHALL not replace current navigation.

#### Scenario: A background source needs approval

- **WHEN** an inactive source publishes a navigation change with an actionable owner
- **THEN** its attention updates without selecting that owner or materializing its transcript
