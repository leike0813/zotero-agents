## ADDED Requirements

### Requirement: Topic synthesis freshness is deterministically tracked

The Synthesis service SHALL persist and update topic synthesis freshness from
plugin-owned deterministic dependency snapshots.

#### Scenario: Fresh baseline is written after apply

- **WHEN** a topic synthesis result is applied successfully
- **THEN** the service SHALL write an artifact-state entry for that topic
- **AND** the entry SHALL contain baseline and current dependency hashes
- **AND** the topic SHALL be reported as `fresh`
- **AND** incomplete evidence SHALL be reported through coverage, not by turning
  the topic stale.

#### Scenario: Legacy topic initializes baseline on first scan

- **GIVEN** an active topic has no artifact-state entry
- **WHEN** freshness is scanned and required canonical state is readable
- **THEN** the service SHALL initialize the baseline from the current dependency
  snapshot
- **AND** it SHALL log `baseline_initialized`
- **AND** it SHALL NOT mark the topic stale only because the baseline was
  missing.

#### Scenario: Topic becomes stale after dependency changes

- **WHEN** the current resolver result, resolved paper artifacts, artifact
  availability, or persisted graph hash differs from the baseline
- **THEN** the service SHALL mark the topic `stale`
- **AND** it SHALL record machine-readable stale reasons.

#### Scenario: Topic becomes dirty after canonical state cannot be trusted

- **WHEN** required topic files, resolver state, resolved paper set state, or
  index hashes are missing or inconsistent
- **THEN** the service SHALL mark the topic `dirty`
- **AND** it SHALL record dirty reasons without rewriting the topic Markdown.

#### Scenario: Mirror includes artifact state

- **WHEN** the Synthesis mirror is refreshed
- **THEN** artifact freshness state SHALL be included in mirror shards
- **AND** mirror failures SHALL NOT change the computed freshness result.
