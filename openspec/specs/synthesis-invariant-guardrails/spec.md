# synthesis-invariant-guardrails Specification

## Purpose
TBD - created by archiving change add-synthesis-invariant-guard-tests. Update Purpose after archive.
## Requirements
### Requirement: Synthesis invariants declare executable evidence

Every Synthesis invariant SHALL declare machine-readable test references that point to runnable tests.

#### Scenario: Invariant declares test references

- **WHEN** an invariant has severity `fatal` or `high`
- **THEN** it declares at least one `test_refs` entry
- **AND** each entry includes a test file, invariant marker, and evidence kind.

#### Scenario: Test reference marker is missing

- **WHEN** a `test_refs` marker is not present in an `it(...)` title in the referenced file
- **THEN** the invariant guard test fails.

### Requirement: Invariant markers round-trip between tests and contract YAML

Tests SHALL reference Synthesis invariants with `[inv.*]` markers that resolve back to `invariants.yaml`.

#### Scenario: Test contains an invariant marker

- **WHEN** a Synthesis test title contains a marker matching `[inv.*]`
- **THEN** the marker must correspond to an invariant ID in `invariants.yaml`
- **AND** the invariant must list that test file and marker in `test_refs`.

### Requirement: Static-only guards are explicit exceptions

Static source-inspection guards SHALL be limited to architecture-style invariants where a behavior scenario is not the correct enforcement unit.

#### Scenario: Invariant has only static guards

- **WHEN** all test references for an invariant have kind `static_guard`
- **THEN** the invariant ID must be listed as an allowed static-only invariant by the guard test.

### Requirement: Invariants guard split sidecar operations

Invariant guards SHALL distinguish visible graph incremental refresh from hidden full graph rebuild.

#### Scenario: Sidecar refresh does not directly replace graph cache

- **WHEN** static guards inspect the Reference Sidecar refresh path
- **THEN** they SHALL reject direct `replaceCitationGraphState` calls from that path
- **AND** they SHALL allow a separate graph refresh operation.

#### Scenario: Workflow apply cannot bootstrap missing graph

- **WHEN** static guards inspect workflow apply sidecar code
- **THEN** they SHALL reject direct full graph rebuild calls from that path.

### Requirement: Invariants guard lightweight and advanced matcher separation
Synthesis invariant guards SHALL prevent heavy matcher calls from entering lightweight refresh or workflow apply paths.

#### Scenario: Static guard scans lightweight paths
- **WHEN** invariant tests inspect Reference Sidecar refresh and workflow apply sources
- **THEN** they SHALL fail if those paths call `buildReferenceMatcherIndex`, `resolveReferenceWithPolicy`, or write `synt_reference_match_proposal`.

#### Scenario: Static guard scans graph rebuild
- **WHEN** invariant tests inspect Citation Graph cache rebuild
- **THEN** they SHALL verify graph rebuild consumes accepted facts and not open proposals.

### Requirement: Cluster harness stays isolated from production hot paths
Clustered dedupe and the external harness SHALL remain outside refresh, workflow
apply, and production Workbench review wiring in this change.

#### Scenario: Refresh or workflow apply code is inspected
- **WHEN** Synthesis refresh or workflow apply paths are checked
- **THEN** they SHALL NOT call `dedupeCanonicalReferencesClustered`.

#### Scenario: Bibliographic containment classifier evolves
- **WHEN** title containment classification is updated
- **THEN** it SHALL prefer structured suffix evidence over expanding a long
  hard-coded concrete venue list.

#### Scenario: Harness source is inspected
- **WHEN** harness source files are checked
- **THEN** they SHALL NOT query `synt_literature_item`,
  `synt_reference_instance`, or `synt_reference_resolution`.

### Requirement: Synthesis Sidecar SHALL Not Materialize Deterministic Invalid References
Synthesis invariant guards SHALL cover the boundary that deterministic invalid
reference extraction rows are not promoted into canonical identities.

#### Scenario: Invalid raw reference reaches sidecar ingestion
- **WHEN** tests provide a deterministic invalid reference row to Synthesis sidecar ingestion
- **THEN** no active raw reference or canonical reference SHALL be materialized from that row
- **AND** warning-only references SHALL still be accepted.

### Requirement: Workbench hot paths are guarded against full refresh
Synthesis invariant guards SHALL prevent full snapshot reads and global rerenders from returning to Workbench hot paths.

#### Scenario: Static guard scans Workbench host
- **WHEN** active Workbench host code is tested
- **THEN** `ready`, `selectTab`, `setFilters`, progress polling, and local review action paths SHALL NOT contain full snapshot calls.

#### Scenario: Static guard scans Workbench frontend
- **WHEN** active Workbench frontend code is tested
- **THEN** surface-local handlers SHALL NOT call global `render()`
- **AND** surface render helpers SHALL NOT clear the Workbench root.

### Requirement: Invariant Guards SHALL Enforce Cluster Production Wiring
Synthesis invariant guards SHALL enforce cluster dedupe production wiring and
lightweight path isolation.

#### Scenario: Static guard scans active sources
- **WHEN** invariant tests inspect Synthesis active sources
- **THEN** `runAdvancedReferenceMatchingNow` SHALL call
  `dedupeCanonicalReferencesClustered`
- **AND** refresh/apply paths SHALL NOT call it
- **AND** active source SHALL NOT expose the old pairwise
  `dedupeCanonicalReferences` symbol.

### Requirement: Advanced dedupe guardrails keep heavy work out of refresh paths
Invariant guards SHALL prevent Reference Sidecar refresh and workflow apply from reconnecting advanced matcher or dedupe logic.

#### Scenario: Static guard scans refresh code
- **WHEN** tests inspect refresh/apply paths
- **THEN** they SHALL fail if those paths call advanced dedupe helpers, `buildReferenceMatcherIndex`, `resolveReferenceWithPolicy`, or write `synt_reference_match_proposal`.

### Requirement: Fuzzy dedupe is bounded
Invariant guards SHALL prevent fuzzy canonical dedupe from becoming an unbounded all-pairs scan.

#### Scenario: Static guard scans matcher code
- **WHEN** tests inspect the dedupe helper
- **THEN** they SHALL require bounded block and pair budget controls for fuzzy candidate generation.

### Requirement: Related-items sync SHALL NOT rebuild graph or run matcher

Related-items sync SHALL be a Zotero side-effect operation over already accepted library-to-library citation facts. It SHALL NOT rebuild Citation Graph cache, scan artifacts, extract references, or run any reference matcher.

#### Scenario: Related-items sync path stays side-effect only

- **WHEN** active source code is inspected
- **THEN** the related-items sync implementation SHALL NOT call `rebuildCitationGraphCacheFromSidecar`
- **AND** it SHALL NOT call artifact scanning, reference extraction, or advanced matcher entry points.

### Requirement: Digest workflow SHALL NOT contain removed auto matching path

The `literature-digest` workflow and apply hook SHALL NOT contain the removed `auto_reference_matching` option or `applyReferenceMatchingToNote` import.

#### Scenario: Static guard inspects digest workflow files

- **WHEN** active digest workflow files are inspected
- **THEN** they SHALL NOT contain `auto_reference_matching`
- **AND** they SHALL NOT contain `applyReferenceMatchingToNote`.

### Requirement: Synthesis invariant guards SHALL prevent legacy artifact fallback
Guardrails SHALL prevent reintroducing note-only or hidden-HTML artifact availability fallback in active Synthesis paths.

#### Scenario: Hidden payload fallback appears in Synthesis artifact availability
- **WHEN** active Synthesis artifact scan code treats hidden HTML payload blocks or note existence as available artifacts
- **THEN** invariant tests SHALL fail.

