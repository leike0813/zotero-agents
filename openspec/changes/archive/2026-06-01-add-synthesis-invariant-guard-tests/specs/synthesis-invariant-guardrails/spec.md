## ADDED Requirements

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
