# Spec Delta

## ADDED Requirements

### Requirement: Synthesis Topic search SHALL use a concrete grouped client contract

The grouped client SHALL expose `topics.search` with strict typed request and result DTOs for query, optional canonical section scope, limits, opaque continuation, and the shared search result envelope. Native and in-process adapters SHALL preserve the same observable results and stable typed failures.

#### Scenario: Typed Topic search is called
- **WHEN** a caller invokes `SynthesisClient.topics.search` with a valid request
- **THEN** it receives the concrete Topic search result and no unknown transport or persistence fields

#### Scenario: Topic search crosses native composition
- **WHEN** a search result is transferred across native Synthesis composition
- **THEN** the adapter preserves Topic identity, matching sections, match explanation, status, lexical method, coverage, issues, cursor, and exact-or-null total
- **AND** it exposes no local path, internal frame, or public score

#### Scenario: A cursor becomes stale or expires
- **WHEN** the Topic application reports a changed basis or expired cursor
- **THEN** the client rejects with the corresponding stable typed control-flow code and structured reason
