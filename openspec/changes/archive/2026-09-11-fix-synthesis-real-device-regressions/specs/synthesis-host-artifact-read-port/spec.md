## ADDED Requirements

### Requirement: Note payload limits SHALL use the public Broker error taxonomy

The Host Broker SHALL translate note payload byte-limit failures to the public `resource_limited` capability error before Synthesis artifact scanning classifies them. Private codec error names SHALL NOT cross the Broker boundary.

#### Scenario: A payload decoder rejects an oversized child note
- **WHEN** artifact scanning reads a child note whose HTML, embedded payload, attachment, or encoded image exceeds the note payload byte limit
- **THEN** the Broker SHALL report `resource_limited` with bounded byte-limit details
- **AND** the artifact page SHALL remain available with an affected-note decode diagnostic.
