## MODIFIED Requirements

### Requirement: Synthesis tag vocabulary owns staged regulator suggestions

Synthesis Tag Vocabulary SHALL store and manage staged `tag-regulator` suggestions as part of the Synthesis tag vocabulary domain, and current parent bindings SHALL be canonical stable item refs.

#### Scenario: Regulator stages a suggestion
- **WHEN** tag-regulator stages a suggested tag
- **THEN** Synthesis Tag Vocabulary SHALL persist the staged entry with tag, facet, note, source flow, and stable parent refs when provided
- **AND** the staged entry SHALL be readable through the Synthesis service API

#### Scenario: Existing staged suggestion is staged again
- **WHEN** the same tag is staged more than once
- **THEN** Synthesis Tag Vocabulary SHALL merge, deduplicate, and deterministically sort stable parent refs
- **AND** it SHALL NOT create duplicate staged rows for the same tag ignoring case

#### Scenario: New request carries numeric binding
- **WHEN** a stage or update request carries a numeric parent binding
- **THEN** the request SHALL fail as invalid
- **AND** staged state SHALL remain unchanged

#### Scenario: Legacy numeric rows are present
- **WHEN** staged storage contains legacy numeric parent bindings
- **THEN** Synthesis SHALL resolve and atomically rewrite them before staged operations continue
- **AND** missing targets SHALL remove only their binding while preserving the staged tag

#### Scenario: Legacy migration is unavailable
- **WHEN** the migration port is missing, fails, or returns a malformed result
- **THEN** the stored row SHALL remain unchanged
- **AND** staged list, update, and promote operations SHALL fail with stable unavailable diagnostics

### Requirement: Synthesis tag vocabulary promotes staged suggestions

Synthesis Tag Vocabulary SHALL promote selected staged suggestions into the canonical controlled vocabulary through the normal canonical write boundary and SHALL dispatch stable bound-parent Tag effects after commit.

#### Scenario: Staged suggestion is promoted
- **WHEN** a user or workflow promotes a staged tag
- **THEN** the tag SHALL be added to canonical vocabulary if not already active
- **AND** the staged entry SHALL be removed after a successful commit
- **AND** bound-parent effects SHALL run only after that commit

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
