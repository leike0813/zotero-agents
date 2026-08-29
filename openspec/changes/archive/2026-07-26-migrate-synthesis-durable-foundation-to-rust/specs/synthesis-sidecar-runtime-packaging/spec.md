## ADDED Requirements

### Requirement: R7 candidate SHALL package one bundled SQLite implementation

The Rust candidate SHALL lock `rusqlite 0.40.1` with default features disabled and only `bundled` and `backup` enabled, and SHALL record SQLite/Rusqlite source, license, features, and lock identity in candidate provenance.

#### Scenario: Dependency provenance is checked
- **WHEN** the R7 candidate dependency inventory is validated
- **THEN** no system SQLite, dynamic runtime lookup, unapproved Rusqlite feature, or unlocked version is present

### Requirement: Bundled durability SHALL remain within native budgets

Each stripped compressed target candidate MUST be at most 15 MiB and all five target archives MUST total at most 75 MiB without weakening SQLite, fsync, journal, or recovery semantics.

#### Scenario: Bundled SQLite exceeds a size limit
- **WHEN** a target or aggregate archive exceeds its approved hard limit
- **THEN** candidate acceptance stops for design review and MUST NOT switch to system SQLite

### Requirement: Five-target packages SHALL run durable fault gates

Packaged candidates SHALL run repository locking, journal crash/recovery, application parity, fingerprint, and complete smoke checks on both macOS architectures, Windows x64, and both Linux architectures.

#### Scenario: Packaged bytes differ from tested bytes
- **WHEN** packaged executable identity does not match the executable that passed durability tests
- **THEN** provenance and freshness validation fail
