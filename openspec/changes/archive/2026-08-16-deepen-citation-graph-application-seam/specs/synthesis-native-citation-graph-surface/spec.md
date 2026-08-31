## ADDED Requirements

### Requirement: Native Citation Graph surfaces SHALL consume application projections

Native Graph page, continuation, neighborhood, metrics, and layout routes SHALL obtain their graph content from the typed Citation Graph application read interface. Runtime adapters SHALL validate and encode wire DTOs without independently assembling graph state from repository records.

#### Scenario: A graph commit races with a surface read
- **WHEN** a Graph surface read overlaps an atomic graph promotion
- **THEN** the response contains graph rows, counts, metrics identity, layout identity, and cache status from one coherent basis
- **AND** it preserves the existing bounded payload, stable cursor, and endpoint-closure behavior

#### Scenario: Runtime translates an application read failure
- **WHEN** the application reports an invalid request, basis mismatch, unavailable projection, or storage failure
- **THEN** the runtime maps the typed outcome to the existing wire-compatible error
- **AND** it does not retry through a direct repository read

