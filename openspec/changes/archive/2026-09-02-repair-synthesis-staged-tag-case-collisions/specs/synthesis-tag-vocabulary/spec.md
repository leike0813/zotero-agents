## MODIFIED Requirements

### Requirement: Synthesis tag vocabulary promotes staged suggestions

Synthesis Tag Vocabulary SHALL promote selected staged suggestions into the canonical controlled vocabulary through the normal canonical write boundary, SHALL preserve case-insensitive canonical uniqueness, and SHALL dispatch stable bound-parent Tag effects after commit.

#### Scenario: Staged suggestion is promoted
- **WHEN** a user or workflow promotes a staged tag
- **THEN** the tag SHALL be added to canonical vocabulary if not already active
- **AND** the staged entry SHALL be removed after a successful commit
- **AND** bound-parent effects SHALL run only after that commit

#### Scenario: Selected suggestions differ only by case
- **WHEN** one promotion selects multiple staged spellings of the same case-insensitive tag
- **THEN** the first selected spelling SHALL supply the canonical entry and its descriptive metadata
- **AND** bindings from all selected variants SHALL be merged, deduplicated, and deterministically ordered
- **AND** every selected variant SHALL be consumed by the successful promotion
- **AND** non-winning variants SHALL be reported as skipped
- **AND** each unique bound parent SHALL receive exactly one effect for the winning spelling

#### Scenario: Canonical spelling already exists
- **WHEN** a selected staged suggestion matches an active canonical tag ignoring case
- **THEN** every selected variant in that case-insensitive group SHALL be reported as skipped
- **AND** the staged variants SHALL remain available for user action

#### Scenario: Invalid staged suggestion is promoted
- **WHEN** a staged tag violates the active tag protocol
- **THEN** promotion SHALL fail with validation diagnostics
- **AND** canonical vocabulary and Host targets SHALL remain unchanged

#### Scenario: Host effect is unavailable
- **WHEN** canonical promotion succeeds but the Tag effect port is absent, throws, or returns malformed receipts
- **THEN** promotion SHALL remain committed
- **AND** the result SHALL contain bounded stable diagnostics without raw Host errors

#### Scenario: Host effect satisfies a target
- **WHEN** a receipt is `applied` or `already_satisfied`
- **THEN** `applied_parent_tags` SHALL identify the tag and stable `parent_ref`
- **AND** no numeric item ID SHALL appear in the result

## ADDED Requirements

### Requirement: Canonical tag vocabulary SHALL be unique ignoring case

Every canonical vocabulary write SHALL reject a candidate containing tag spellings that differ only by case before persistence commits.

#### Scenario: Canonical write contains case variants
- **WHEN** a candidate contains two canonical tags with the same case-insensitive value
- **THEN** the write SHALL fail as invalid
- **AND** the previously readable aggregate SHALL remain unchanged

### Requirement: Startup SHALL repair historical canonical case collisions

Sidecar startup SHALL make one best-effort attempt to repair historical case-insensitive canonical collisions atomically before readiness. Repair failure SHALL be recorded and SHALL NOT block readiness.

#### Scenario: Historical canonical group has case variants
- **WHEN** startup finds multiple canonical entries with the same case-insensitive tag
- **THEN** a builtin entry SHALL win over a non-builtin entry, then a non-deprecated entry SHALL win, followed by earliest creation time, earliest update time, and exact tag lexical order
- **AND** the winner SHALL retain its descriptive fields while aliases, abbreviations, usage, and parent references are merged without referring to removed spellings
- **AND** only affected pending Host effects SHALL be replaced with one effect per winning tag and unique parent
- **AND** terminal Host effect receipts SHALL remain unchanged
- **AND** the repaired aggregate SHALL remain readable after restart

#### Scenario: Repair commits
- **WHEN** historical collisions are repaired successfully
- **THEN** candidate state, redirected references, affected pending effects, vocabulary identity, projection staleness, and the completed fixed repair operation SHALL commit atomically
- **AND** a later startup SHALL make no repair write when no collisions remain

#### Scenario: Repair transaction fails
- **WHEN** any repair mutation fails before commit
- **THEN** candidate state and Host effects SHALL remain unchanged
- **AND** startup SHALL continue to readiness after recording a failed repair operation when possible
- **AND** a later startup SHALL be able to retry the repair
