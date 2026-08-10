## ADDED Requirements

### Requirement: Durable import SHALL commit only a normalized redirect graph

Durable import SHALL evaluate the complete prospective canonical redirect graph after applying imported entities and before committing the repository transaction. Cycles SHALL be repaired using the same deterministic precedence and proposal supersession semantics as startup recovery, and the local repaired state SHALL remain eligible for later export.

#### Scenario: Imported redirect entries form a cycle
- **WHEN** a valid durable bundle would leave canonical redirects cyclic
- **THEN** import SHALL repair the prospective graph before commit
- **AND** record the displaced edge and proposal state in the import transaction
- **AND** later capture SHALL expose the repaired local facts.

#### Scenario: Imported redirect graph is already valid
- **WHEN** imported redirects already form an acyclic rooted forest
- **THEN** normalization SHALL leave their topology and proposal states unchanged.

