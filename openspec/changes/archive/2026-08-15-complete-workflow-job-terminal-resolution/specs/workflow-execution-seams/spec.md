## MODIFIED Requirements

### Requirement: Workflow jobs SHALL have one terminal resolution seam

Workflow terminal observation and result application SHALL use one synchronous
Workflow Job Terminal Resolution seam to interpret local queue execution,
sequence-root state, canonical SkillRunner or ACP lifecycle state, and terminal
apply evidence. The seam SHALL classify each admitted workflow job as missing,
pending, locally ready, or canonically ready and SHALL return one normalized
slot status with every classification, without owning lifecycle writes,
subscriptions, or apply execution. The run seam SHALL map slot statuses to
submission-slot actions and SHALL NOT read sequence, SkillRunner, or ACP stores
for slot sampling.

#### Scenario: One projection carries normalized slot status

- **WHEN** terminal resolution classifies a workflow job
- **THEN** the classification SHALL include one normalized slot status
- **AND** the slot status vocabulary SHALL be missing, unobserved, queued, running, waiting_user, waiting_auth, failed_retriable, repairing, succeeded, failed, or canceled

#### Scenario: Slot sampling preserves legacy canonical paths

- **WHEN** terminal resolution classifies a job as pending or locally ready
- **THEN** slot status SHALL sample the same canonical records as the terminal interpretation
- **AND** backend canonical paths with no resolvable record SHALL return unobserved instead of a local fallback
- **AND** local queue job state SHALL remain the fallback only for paths that previously used it, such as pass-through and SkillRunner sequences without a materialized step request
- **AND** a sequence state SHALL contribute request identity without projecting its own status

#### Scenario: Canonical terminal outcomes own slot status

- **WHEN** terminal resolution classifies a job as canonically ready
- **THEN** slot status SHALL match the canonical terminal outcome

#### Scenario: Run seam consumes the one projection

- **WHEN** the run seam observes workflow jobs
- **THEN** it SHALL call terminal resolution once per job per observation pass
- **AND** it SHALL map returned slot statuses to submission-slot actions
- **AND** it SHALL NOT read sequence, SkillRunner, or ACP stores for slot sampling
