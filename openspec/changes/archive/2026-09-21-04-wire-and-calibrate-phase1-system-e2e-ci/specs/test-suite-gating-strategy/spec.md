## MODIFIED Requirements

### Requirement: Real-host compatibility SHALL remain blocking on supported targets

Existing supported real-host compatibility targets SHALL remain blocking. New System E2E cells SHALL begin non-blocking and SHALL become blocking only through explicit per-cell configuration after three reviewed clean independent rounds for the exact calibration identity. A missing, invalid, mixed-identity, or stale round MUST NOT authorize promotion.

#### Scenario: Compatibility matrix

- **WHEN** the compatibility gate runs
- **THEN** existing promoted Zotero 7, 9, and 10 Linux and Windows targets remain blocking
- **AND** unpromoted E2E cells and explicitly informational macOS evidence do not override blocking results

#### Scenario: E2E cell is promoted

- **WHEN** the maintainer has reviewed three qualifying clean manifests and explicitly changes the cell configuration
- **THEN** that cell becomes blocking independently of unrelated cells
- **AND** the evidence remains linked to its calibration identity

#### Scenario: Windows close lifecycle is unresolved

- **WHEN** `CG-02` still crashes, lacks a trustworthy terminal manifest, or has not been classified on the selected Windows target
- **THEN** the affected Windows release E2E cell SHALL NOT be promoted

## ADDED Requirements

### Requirement: Blocking System E2E lanes SHALL NOT auto-retry

Pull-request, main, and release System E2E cells SHALL run once per workflow attempt. A failed, aborted, incomplete, or indeterminate cell SHALL retain that verdict and SHALL NOT automatically rerun.

#### Scenario: Blocking cell fails

- **WHEN** a blocking PR, main, or release E2E cell does not produce a complete passing manifest
- **THEN** the gate SHALL fail with the first attempt's evidence
- **AND** orchestration SHALL NOT create an automatic successor attempt

### Requirement: Weekly orchestration MAY rerun one complete failed cell for diagnosis

Weekly scheduled orchestration MAY rerun a failed cell at most once outside the Zotero runner. The successor SHALL use a fresh profile and new run ID linked to the immutable first attempt, and SHALL rerun the whole cell rather than an individual case. A successor pass SHALL classify the failure as `intermittent`; a successor failure SHALL classify it as `persistent`. Any first-attempt failure SHALL keep the weekly workflow failed.

#### Scenario: Weekly cell fails then passes

- **WHEN** a weekly cell fails its first attempt and its single complete rerun passes
- **THEN** both manifests SHALL remain separately available and linked
- **AND** the cell SHALL be classified `intermittent`
- **AND** the weekly workflow SHALL remain failed

#### Scenario: Weekly cell fails twice

- **WHEN** the first attempt and its single complete rerun fail
- **THEN** the cell SHALL be classified `persistent`
- **AND** no further automatic attempt SHALL run
