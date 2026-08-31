## ADDED Requirements

### Requirement: Paged transfer capacity SHALL remain separate from monolithic compute envelopes

The 8 MiB direct compute HTTP envelope SHALL remain unchanged, while transfer actions SHALL carry at most one bounded page and aggregate transfer capacity SHALL be governed by transfer storage limits.

#### Scenario: Transfer exceeds direct compute size
- **WHEN** a valid paged graph transfer totals more than 8 MiB
- **THEN** it SHALL proceed through bounded transfer actions and worker frames
- **AND** the service SHALL NOT assemble or route it through the direct compute HTTP envelope

#### Scenario: Individual transfer page exceeds its bound
- **WHEN** one transfer page exceeds 4 MiB
- **THEN** it SHALL fail before worker admission or disk publication
