## ADDED Requirements

### Requirement: SkillRunner lifecycle events SHALL remain runKey-scoped

Archive and delete event writes SHALL resolve the target record by runKey or
by the existing runKey-derived request identity. Bulk deletion by backend SHALL
expand into one delete event per resolved runKey and SHALL NOT introduce a
second identity path.

#### Scenario: Archive by request resolves the owning runKey

- **WHEN** an archive request supplies backend and request identity
- **THEN** the store SHALL resolve the unique owning runKey
- **AND** SHALL submit one `run.archived` event for that runKey

#### Scenario: Bulk backend deletion preserves runKey scope

- **WHEN** records are deleted by backend
- **THEN** the store SHALL resolve every affected runKey
- **AND** SHALL submit one `run.deleted` event per runKey
