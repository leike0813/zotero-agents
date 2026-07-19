## MODIFIED Requirements

### Requirement: Transcript geometry work is dirty-row scoped

Steady transcript mutation SHALL measure only newly inserted or content-changing rows. Unchanged rows SHALL retain cached height and DOM position. A height change SHALL update scroll geometry or spacers through one coalesced reconcile against committed live state without scheduling a full transcript rebuild. Scheduler tokens and pending controller state SHALL NOT be committed from a staged virtual-state clone.

#### Scenario: One row changes in an 80-item page

- **WHEN** one visible item is patched without changing its neighbors
- **THEN** only its presentation row is eligible for rerender and measurement
- **AND** measurement work does not grow with the other 79 items.

#### Scenario: Terminal Markdown converges in the current mutation

- **GIVEN** a visible assistant message is streaming as plain text
- **WHEN** its terminal patch changes it to a complete Markdown message
- **THEN** the existing row SHALL render the Markdown body during that mutation
- **AND** virtual geometry SHALL reconcile from the terminal measured height
- **AND** no owner switch, tab switch, or later transcript event SHALL be required.

#### Scenario: Consecutive tall-row changes remain schedulable

- **GIVEN** a live transcript row changes height across consecutive mutation batches
- **WHEN** one committed geometry reconcile completes and a later measurement changes again
- **THEN** the later change SHALL schedule a new bounded reconcile
- **AND** pending scheduler state SHALL clear after convergence
- **AND** the transcript row and every non-transcript managed-region node SHALL retain identity.

#### Scenario: Failed staged mutation does not poison live scheduling

- **WHEN** a staged transcript mutation fails before its exact commit
- **THEN** it SHALL NOT leave live scheduler state marked as pending
- **AND** a later valid mutation SHALL remain eligible to reconcile geometry.
