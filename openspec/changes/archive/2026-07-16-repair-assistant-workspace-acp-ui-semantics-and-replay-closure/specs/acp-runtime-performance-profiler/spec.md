## MODIFIED Requirements

### Requirement: Publication lifecycle retains bounded renderer diagnostics

In-window publication lifecycle records SHALL retain each ACK outcome, bounded
failure stage/code, render path, and first-write-wins terminal result.
Publication lifecycle metrics SHALL NOT infer a materialization source from
wire form or publication kind. Materialization source SHALL be recorded only
by the shared runtime at an actual region or transcript-page builder entry.
The lifecycle ledger SHALL not retain the former 512-record ceiling. Its
independent bounded capacity and drop counter SHALL make long formal profiles
complete when within the declared limit and structurally incomplete when that
limit is exceeded.

#### Scenario: Child rejects a transcript render

- **WHEN** a render-failed ACK includes a bounded failure descriptor
- **THEN** the completed profile preserves that descriptor
- **AND** Replay does not reduce it to a generic missing ACK.
