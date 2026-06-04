## MODIFIED Requirements

### Requirement: Matcher output affects graph only through explicit decisions or safe apply
Reference matcher output SHALL become graph-affecting state only through deterministic safe apply for the current item, deterministic/high-confidence explicit advanced matching, or explicit user-approved sidecar decisions.

#### Scenario: Suggested candidate is produced
- **WHEN** the matcher returns suggested, ambiguous, or low-confidence output
- **THEN** Synthesis SHALL store it only as bounded review evidence or diagnostics
- **AND** it SHALL NOT refresh graph cache or create matched graph edges automatically.

#### Scenario: High-confidence explicit run is produced
- **WHEN** an explicit advanced reference matching operation returns `matched` with deterministic or high confidence
- **THEN** Synthesis MAY write an accepted binding fact
- **AND** it SHALL mark citation graph cache stale instead of rebuilding it.

## ADDED Requirements

### Requirement: Heavy matcher is explicit
The production reference matcher SHALL run only from an explicit advanced matching command or scoped test/benchmark harness.

#### Scenario: Reference sidecar refresh runs
- **WHEN** `refreshReferenceSidecarNow` or workflow apply updates sidecar rows
- **THEN** it SHALL NOT call `buildReferenceMatcherIndex` or `resolveReferenceWithPolicy`
- **AND** it SHALL keep lightweight binding semantics.

### Requirement: Advanced matcher reuses one library index
Advanced matching SHALL build the library matcher index once per operation and reuse it for processed references.

#### Scenario: Advanced matching processes many references
- **WHEN** `runAdvancedReferenceMatchingNow` runs
- **THEN** it SHALL build one matcher index for the current library scope
- **AND** each processed reference SHALL use that existing index.

