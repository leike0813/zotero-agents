## ADDED Requirements

### Requirement: Topic synthesis gate uses canonical v2 public contracts

The topic synthesis gate SHALL expose only canonical v2 stage and action names in
JIT output.

#### Scenario: Paper unit persist action is accepted by the gate

- **WHEN** `persist_paper_units` persists all workset paper analyses and records
  `paper_refs[]` in its receipt
- **THEN** the next gate call proceeds to cross-paper context export
- **AND** it does not report `paper_analysis_action_receipts_incomplete`.

### Requirement: Gate blockers are actionable

Every blocked gate response SHALL include a repair action or command that can
advance or repair the current stage without direct SQLite edits.

#### Scenario: A blocker is returned

- **WHEN** the gate reports `status: blocked`
- **THEN** `command_example` is not just another gate invocation
- **AND** `execution_note` identifies the current stage repair path.

### Requirement: Final runtime validation matches host apply validation

The topic synthesis runtime SHALL reject final artifacts whose evidence or
evidence-map references would be rejected by host apply validation.

#### Scenario: Final sections reference a missing evidence map candidate

- **WHEN** a claim, timeline event, taxonomy node, comparison row, debate, gap,
  or review outline entry references an absent `evidence_map` id
- **THEN** `validate_final_artifacts` fails before writing `result/result.json`.

### Requirement: Runtime integrity is audited before progression

The runtime SHALL detect impossible stage state and hash/receipt inconsistencies
before returning a later gate action or finalizing artifacts.

#### Scenario: Later stages are completed while an earlier stage is still running

- **WHEN** the gate audits runtime state
- **THEN** it returns an integrity blocker instead of allowing later work.
