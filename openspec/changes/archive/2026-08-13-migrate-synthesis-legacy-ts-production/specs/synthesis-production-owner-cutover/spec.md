## MODIFIED Requirements

### Requirement: Production storage SHALL be opened directly by Rust

The launched Rust service SHALL acquire the production OS lock before opening or migrating `state/synthesis.db` and `data/synthesis`. Current storage SHALL open directly. An exact registered legacy pair SHALL be migrated and adopted by Rust during the same locked startup. Startup SHALL NOT run a plugin-to-Rust cutover, receipt progression, critical-smoke activation, or runtime admission workflow.

#### Scenario: Existing current production storage is valid
- **WHEN** both database and canonical root match the current identities
- **THEN** Rust opens them and publishes readiness

#### Scenario: Existing registered legacy production storage is valid
- **WHEN** both legacy stores pass registered migration and canonical adoption validation
- **THEN** Rust migrates them under the production lock, assumes the canonical identity, and publishes readiness

#### Scenario: Existing production storage is unsupported
- **WHEN** either store does not satisfy the current identity or registered legacy contract
- **THEN** startup fails closed without invoking a legacy owner

