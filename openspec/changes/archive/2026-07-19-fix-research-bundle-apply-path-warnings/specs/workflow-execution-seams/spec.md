## ADDED Requirements

### Requirement: Successful apply hooks SHALL expose bounded warning diagnostics

An apply hook MAY return structured `applyDiagnostics` without changing successful apply semantics, and the apply seam SHALL record only a bounded warning summary in the corresponding success log.

#### Scenario: Apply succeeds with warnings

- **WHEN** an apply hook succeeds and returns a valid non-zero warning count with warning code counts
- **THEN** the apply outcome SHALL remain successful
- **AND** the success log SHALL use warning severity and include the normalized count summary.

#### Scenario: Apply succeeds without diagnostics

- **WHEN** an apply hook succeeds without `applyDiagnostics`
- **THEN** existing info-level success logging SHALL remain unchanged.

#### Scenario: Apply diagnostics are malformed

- **WHEN** a successful hook returns invalid or unbounded diagnostics
- **THEN** the apply seam SHALL ignore or bound the invalid fields without failing apply
- **AND** it SHALL NOT log the complete hook result or unrestricted warning messages.
