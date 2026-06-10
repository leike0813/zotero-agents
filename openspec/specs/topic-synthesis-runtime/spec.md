# topic-synthesis-runtime Specification

## Purpose
TBD - created by archiving change stabilize-topic-synthesis-runtime-gate-validation. Update Purpose after archive.
## Requirements
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
### Requirement: Split runtime uses a minimal stage contract




The split topic synthesis runtime SHALL expose only the state needed to execute
the staged business flow.

#### Scenario: Runtime progresses through valid stages

- **WHEN** a split topic synthesis stage is run or submitted
- **THEN** the runtime SHALL verify the stage is allowed
- **AND** payload stages SHALL validate the submitted payload against the stage schema
- **AND** command stages SHALL generate the runtime-owned files for that stage.

#### Scenario: Audit action is unavailable

- **WHEN** `scripts/gate.py --action audit` is invoked
- **THEN** the command SHALL fail as an unsupported action.

#### Scenario: Runtime avoids long-lived audit artifacts

- **WHEN** a split topic synthesis run completes
- **THEN** the run workspace SHALL NOT contain `runtime/gate-transcript/`
- **AND** it SHALL NOT contain `runtime/action-transcript/`
- **AND** it SHALL NOT contain `runtime/stage-receipts/`
- **AND** it SHALL NOT contain `runtime/artifact-registry.json`.
### Requirement: Runtime-owned outputs are materialized by runtime actions


The split topic synthesis runtime SHALL own handoffs, views, sidecars, sections,
manifests, and final candidates.

#### Scenario: Prepare materializes core and external context views

- **WHEN** prepare Stage 30 paper triage is submitted successfully
- **THEN** the runtime SHALL write `runtime/views/cross-paper-context.md`
- **AND** it SHALL write `runtime/views/external-literature-context.md`
- **AND** it SHALL write `runtime/views/cross-paper-context.manifest.json`
- **AND** it SHALL write `runtime/views/source-paper-evidence-index.json`.

#### Scenario: Cross-paper context is evidence-rich

- **WHEN** filtered digest artifacts and citation graph metrics are available
- **THEN** `cross-paper-context.md` SHALL include paper metadata, paper triage,
  citation graph metrics, context selection, and selected filtered digest
  excerpts.

#### Scenario: External literature context is not a placeholder

- **WHEN** references or citation analysis artifacts are available
- **THEN** `external-literature-context.md` SHALL include compact references or
  citation analysis report content
- **AND** it SHALL NOT be a fixed placeholder saying no external literature was
  fetched.

#### Scenario: Context manifest stays minimal

- **WHEN** prepare context views are written
- **THEN** `cross-paper-context.manifest.json` SHALL include context paths,
  selection constants, selected refs, and per-paper artifact availability
- **AND** it SHALL NOT include hashes, receipts, audit state, or apply-blocking
  diagnostics.
