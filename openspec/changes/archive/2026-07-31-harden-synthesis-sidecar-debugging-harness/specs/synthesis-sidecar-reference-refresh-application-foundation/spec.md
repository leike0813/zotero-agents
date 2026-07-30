## ADDED Requirements

### Requirement: Materialized refresh input SHALL remain aggregate bounded

Before retaining or applying prepared payloads, both Reference Refresh
implementations SHALL rebuild and validate the complete apply request at no
more than 8 MiB of UTF-8 JSON and 250,000 JSON nodes. The bound SHALL cover all
planned references and citation-analysis payloads together.

#### Scenario: Multiple legal artifact responses exceed the aggregate bound
- **WHEN** each artifact read is within its transport limit but the complete apply request exceeds 8 MiB or 250,000 nodes
- **THEN** refresh fails with `reference_refresh_payload_too_large`
- **AND** no payload is promoted or retained by an outstanding preparation

#### Scenario: Aggregate input is at the declared bounds
- **WHEN** every planned payload is exact and the rebuilt request remains within both bounds
- **THEN** normal validation and transactional promotion continue
