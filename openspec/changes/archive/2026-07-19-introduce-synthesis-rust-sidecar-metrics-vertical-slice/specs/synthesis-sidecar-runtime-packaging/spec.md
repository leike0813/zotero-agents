## MODIFIED Requirements

### Requirement: Citation Graph application artifacts are packaged and fingerprinted

The temporary v1 Node oracle runtime SHALL include the target-matching Rust Metrics executable and provenance as ancillary hashed files while retaining the Node executable and JavaScript entrypoint as the v1 launch target. Native candidates SHALL also be built independently for five targets and SHALL NOT enter the formal XPI or native manifest v2 release chain in this change.

#### Scenario: Rust source or lock changes
- **WHEN** Rust Metrics sources, the locked toolchain, or `Cargo.lock` change
- **THEN** candidate and temporary runtime fingerprints SHALL change and stale or mismatched binaries SHALL be rejected

#### Scenario: V1 runtime is launched
- **WHEN** the supervisor resolves the active v1 bundle
- **THEN** its launch config, discovery, Node executable, entrypoint, and active/previous pointer semantics SHALL remain unchanged
