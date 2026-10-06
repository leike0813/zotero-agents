## ADDED Requirements

### Requirement: Selected cases SHALL complete across owner restart

One logical invocation SHALL preserve the selected case set and each case's terminal verdict across runner-owned process restarts. It SHALL continue unexecuted cases, skip replay of completed cases, and return success only when every selected case has acceptable terminal evidence. The entry command SHALL print a logical-run summary and return nonzero for failed, aborted, empty or incomplete selections.

#### Scenario: Default catalog resumes after Host Bridge restart

- **WHEN** HB-03 terminates its owner and resumes
- **THEN** completed Phase 1 cases are not replayed and ordinary Phase 2 cases execute before subsequent owner-restart cases
- **AND** the summary counts cases from every process.

#### Scenario: Early assertion fails before a later successful restart

- **WHEN** an earlier selected case fails and the final process passes
- **THEN** the entry command returns nonzero and preserves the earlier failure.

#### Scenario: Selected evidence is missing

- **WHEN** a selected case never reports a terminal verdict or an empty selection finishes
- **THEN** the run is incomplete and the entry command returns nonzero.

#### Scenario: Skip has an explicit platform reason

- **WHEN** a selected case reports a declared unsupported-platform skip
- **THEN** the summary records that skip as terminal
- **AND** other pending cases do not satisfy selected-case completion.

#### Scenario: Selection is restricted

- **WHEN** a caller chooses a grep or Phase 1 family selection
- **THEN** only the actual selected cases are required and family selection excludes unrelated Phase 2 cases.
