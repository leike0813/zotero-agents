## ADDED Requirements

### Requirement: Shadow persistence does not change production ownership
The isolated repository SHALL persist only its own foundation metadata and MUST NOT read, mirror, migrate, or mutate production Synthesis rows or canonical files. The plugin SHALL remain the production database and canonical-file owner until a separately approved cutover.

#### Scenario: Foundation canary runs independently
- **WHEN** the service exercises cache-basis and operation CRUD across restart
- **THEN** it does so entirely within the shadow root and production repository behavior and bounds remain unchanged
