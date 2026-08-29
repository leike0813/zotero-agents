## MODIFIED Requirements

### Requirement: Citation and Reference application parity SHALL use independent durable owners
The checker SHALL execute Citation Graph through its typed application entry point and Reference read, refresh, matching/review, and Canonical Reference mutation through the grouped Reference application interface. Node oracle and Rust candidate execution SHALL use distinct mutable roots and one immutable `synthesis-citation-reference-application-parity-v1` fixture.

#### Scenario: A cluster case is executed
- **WHEN** the checker executes a corpus case
- **THEN** neither implementation opens, derives, or mutates the other implementation's repository, canonical, journal, receipt, or owner path
- **AND** only fixture bytes are shared.

#### Scenario: Reference behavior is compared
- **WHEN** the corpus performs refresh, matching/review, or Canonical Reference mutation
- **THEN** the Rust candidate invokes the grouped Reference application interface with an explicit promotion checkpoint
- **AND** parity compares the compatible public result and close/reopen durable observations.
