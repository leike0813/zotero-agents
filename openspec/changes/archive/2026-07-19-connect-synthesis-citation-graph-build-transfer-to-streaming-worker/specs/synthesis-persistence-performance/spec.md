## ADDED Requirements

### Requirement: Streaming transfer bounds retained memory and output publication
The transfer owner SHALL retain only page metadata/path state, the worker protocol SHALL permit at most one unacknowledged page per direction, and attempt output SHALL count against existing direction and service byte limits.

#### Scenario: Input pages are staged
- **WHEN** validated pages have been written atomically
- **THEN** the owner SHALL release their row object graphs and later read each page on demand

#### Scenario: Normal profile is executed
- **WHEN** the normal benchmark profile uses streaming transfer
- **THEN** it SHALL complete under the 256 MiB worker old-generation limit and 30-second active deadline without an absolute host-memory assertion
