## ADDED Requirements

### Requirement: Sequence step apply SHALL remain an explicit execution seam

The run seam SHALL provide the sequence runtime with an explicit callback for
applying opt-in sequence step results.

#### Scenario: Run seam resolves step apply workflow

- **GIVEN** a sequence step declares `apply_result.workflow_id`
- **WHEN** that step succeeds
- **THEN** the run seam SHALL resolve the target workflow by id
- **AND** invoke its `applyResult` hook with step-scoped result context.

#### Scenario: Final apply seam skips step-owned final result

- **GIVEN** a completed sequence job whose final step declares `apply_result`
- **WHEN** the final apply seam processes the job
- **THEN** it SHALL record a skipped final apply outcome
- **AND** it SHALL NOT duplicate the final step's workflow apply.
