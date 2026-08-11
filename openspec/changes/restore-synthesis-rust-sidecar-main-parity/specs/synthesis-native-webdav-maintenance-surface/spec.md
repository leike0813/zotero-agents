## ADDED Requirements

### Requirement: Known native WebDAV timestamps SHALL migrate before canonical validation

The Rust WebDAV application SHALL recognize the exact decimal Unix-millisecond timestamp encoding written by the earlier native production clock at persisted local-state and remote-HEAD read boundaries. It SHALL canonicalize those known fields to ISO-8601 before applying the unchanged strict state or pointer validator. Local state SHALL be saved atomically only after the complete migrated state validates, while a remote HEAD SHALL change only through the normal ETag-guarded synchronization publication path.

#### Scenario: Disabled legacy state is reconciled on startup

- **WHEN** startup reconciliation reads a schema-valid disabled WebDAV state whose native-owned timestamps use the historical decimal-millisecond encoding
- **THEN** Rust canonicalizes and atomically persists that state as ISO-8601
- **AND** startup reports ready with disabled WebDAV state rather than `webdav_sync_state_invalid`

#### Scenario: Legacy state contains run or retry timestamps

- **WHEN** a schema-valid state contains historical last-run timestamps or an established retry timestamp whose base uses decimal milliseconds
- **THEN** Rust canonicalizes every known native-owned timestamp before validating ordering and retry bounds
- **AND** it preserves queue, retry, conflict, diagnostic, and last-run semantics

#### Scenario: Remote HEAD uses the historical native clock

- **WHEN** a configured sync reads an otherwise valid remote HEAD whose `updated_at` is a decimal Unix-millisecond string
- **THEN** Rust canonicalizes the pointer in memory and continues strict preview and synchronization behavior
- **AND** it does not rewrite the remote pointer outside the existing ETag-guarded publication transaction

#### Scenario: Persisted timestamp is not a known historical encoding

- **WHEN** local state or a remote pointer contains a malformed, signed, fractional, overflowing, or otherwise noncanonical timestamp outside the exact historical encoding
- **THEN** the existing stable invalid-state or invalid-HEAD failure is returned before unsafe work
- **AND** public DTO rebuilders and canonical validators remain strict
