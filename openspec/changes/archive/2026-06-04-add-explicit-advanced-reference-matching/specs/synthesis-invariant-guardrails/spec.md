## ADDED Requirements

### Requirement: Invariants guard lightweight and advanced matcher separation
Synthesis invariant guards SHALL prevent heavy matcher calls from entering lightweight refresh or workflow apply paths.

#### Scenario: Static guard scans lightweight paths
- **WHEN** invariant tests inspect Reference Sidecar refresh and workflow apply sources
- **THEN** they SHALL fail if those paths call `buildReferenceMatcherIndex`, `resolveReferenceWithPolicy`, or write `synt_reference_match_proposal`.

#### Scenario: Static guard scans graph rebuild
- **WHEN** invariant tests inspect Citation Graph cache rebuild
- **THEN** they SHALL verify graph rebuild consumes accepted facts and not open proposals.

