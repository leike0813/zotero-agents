## ADDED Requirements

### Requirement: Library Agent SHALL route bibliographic identifiers to library search
The bounded Library Agent SHALL use library item search/get for DOI, title, citekey, ISBN, and mixed bibliographic identifiers, and SHALL reserve the Synthesis resolver for tag, collection, and paper-ref scope selection.

#### Scenario: User supplies a DOI
- **WHEN** a bounded task starts from a DOI or title
- **THEN** the Agent SHALL search bounded library candidates and confirm the selected item
- **AND** SHALL NOT pass that identifier to the Synthesis scope resolver.

### Requirement: Library Agent SHALL follow the current shared control contract
The bundle SHALL use workflowRunId, durable agent-run receipt state, operation inspection, field-specific identity checks, and stage-specific command cards.

#### Scenario: A write response is uncertain
- **WHEN** a bounded task receives an unknown operation outcome
- **THEN** it SHALL inspect the operation or apply receipt before any retry.
