## ADDED Requirements

### Requirement: Migration SHALL distinguish empty References from missing sources

Conversion SHALL retain readable valid References source presence independently of entry count. Empty canonical References SHALL qualify as an existing basis. Missing, malformed, unreadable or discarded invalid entries SHALL retain their blocking or review semantics.

#### Scenario: Explicit empty References and Citation
- **WHEN** a readable References artifact explicitly contains an empty collection and Citation has no mentions
- **THEN** conversion SHALL accept a valid canonical empty pair.

#### Scenario: Empty basis has unresolved mentions
- **WHEN** empty References accompany Citation mentions without linkage
- **THEN** mentions SHALL remain unresolved under the existing review policy.

#### Scenario: Citation has no References source
- **WHEN** no valid References source or permitted existing basis exists
- **THEN** the Citation-only input SHALL remain blocked.

### Requirement: Migration SHALL preserve summary meaning and validation evidence

Citation summary SHALL use only the summary field, defaulting to empty when absent. Validation and receipt diagnostics SHALL retain bounded path/code and applicable numeric limit/actual evidence, deduplicating repetitive diagnostics and prioritizing blocking evidence within twenty entries.

#### Scenario: An empty summary accompanies a large report
- **WHEN** summary is empty or absent and report_md is large
- **THEN** the report SHALL NOT become summary and the summary limit SHALL remain unchanged.

#### Scenario: A real summary exceeds its limit
- **WHEN** summary itself exceeds the canonical limit
- **THEN** migration SHALL reject it and retain its validation evidence through exclusion and terminal receipt persistence.

#### Scenario: Repetitive evidence exceeds the diagnostic budget
- **WHEN** repetitive evidence precedes a blocking validation issue
- **THEN** the bounded persisted diagnostics SHALL retain the blocking issue without raw payloads.
