## ADDED Requirements

### Requirement: Librarian profile treats large reads as paged work

The Zotero Librarian profile SHALL instruct agents to use explicit limits and
cursor metadata for broad library, topic, index, and graph reads.

#### Scenario: Agent needs broad graph context
- **WHEN** a task requires citation graph context
- **THEN** the profile SHALL prefer bounded graph slice, layout, metrics, or
  paged overview reads
- **AND** it SHALL NOT instruct agents to expect a full citation graph in one
  `synthesis graph overview` call.
