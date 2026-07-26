## MODIFIED Requirements

### Requirement: Replay profile evidence is publication-epoch scoped

Before each profile window Replay SHALL drain both ACP publication lanes,
capture the active child generation and per-source delivery watermark, and
attribute current-run lifecycle evidence after that watermark.

#### Scenario: A prior Chat publication precedes Skills open-inactive

- **WHEN** the prior publication terminates before the Skills profile starts
- **THEN** it does not contaminate the Skills record
- **AND** a prior publication arriving after profile start makes measurement
  incomplete.

### Requirement: Formal Replay rejects renderer recovery and rebase storms

Target-active formal acceptance SHALL require accepted render terminals with
no automatic rebase or recovery-full path for valid trace publications.

#### Scenario: Skills delta failure triggers repeated rebase snapshots

- **WHEN** lifecycle evidence contains render rejection, recovery-full, or
  automatic rebase
- **THEN** formal acceptance fails with the structured reason
- **AND** posted rebase bytes remain visible in the report.
