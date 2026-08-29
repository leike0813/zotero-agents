## ADDED Requirements

### Requirement: Citation and Reference typed parity evidence SHALL be versioned
The cross-language contract inventory SHALL include the strict versioned Citation/Reference application corpus, development-only Rust driver, and checker inputs required to reproduce differential evidence.

#### Scenario: Candidate evidence is audited
- **WHEN** contract and candidate gates run
- **THEN** the corpus, driver, and checker SHALL identify deterministic source inputs and stable observable outputs
- **AND** none SHALL become a runtime capability or packaged production dependency.
