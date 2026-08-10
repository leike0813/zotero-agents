## ADDED Requirements

### Requirement: Canonical redirect facts SHALL form a rooted forest

Persisted canonical redirects SHALL remain acyclic, and every canonical in a redirect component SHALL resolve to one deterministic effective canonical. Every redirect mutation boundary SHALL normalize its intended component change and validate the complete prospective graph before commit.

#### Scenario: Reverse decision reroots an existing component
- **WHEN** an explicit reverse decision selects a non-root canonical in an existing redirect component
- **THEN** the system SHALL reroot the component without losing any member
- **AND** the committed redirect graph SHALL remain acyclic.

#### Scenario: Automatic matching revisits a resolved component
- **WHEN** automatic matching proposes a redirect whose endpoints already resolve to the same effective canonical
- **THEN** the system SHALL treat the graph effect as idempotent
- **AND** it SHALL NOT override an explicit user-selected root.

### Requirement: Existing canonical redirect cycles SHALL be repaired before production reads

The production repository migration SHALL repair every pre-existing canonical redirect cycle before the sidecar becomes ready. Repair SHALL preserve component membership, prefer explicit user decisions over automatic facts, record the chosen root and displaced facts, and mark dependent projections stale.

#### Scenario: Legacy database contains a cycle with a later reverse decision
- **WHEN** startup opens a supported prior repository whose redirect cycle contains a newer explicit reverse decision
- **THEN** migration SHALL retain the root selected by that decision
- **AND** supersede accepted proposal facts corresponding to the displaced edge
- **AND** complete without user interaction.

#### Scenario: Legacy cycle has incomplete provenance
- **WHEN** no unique explicit decision determines the root of a legacy redirect cycle
- **THEN** migration SHALL choose a root using a stable deterministic fallback
- **AND** record that fallback in a completed repair receipt rather than blocking startup.

