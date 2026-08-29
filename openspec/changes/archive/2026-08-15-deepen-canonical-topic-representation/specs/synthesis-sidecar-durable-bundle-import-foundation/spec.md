## ADDED Requirements

### Requirement: Durable import SHALL decode canonical assets before staging

Durable import SHALL translate verified bundle envelopes into transport-neutral canonical Topic assets and SHALL use the canonical representation interface to decode them into opaque prepared writes before canonical batch staging. The durable application SHALL continue to own conflict policy, SQLite commit receipt, staging coordination, target verification, and restart reconciliation.

#### Scenario: Valid canonical assets are imported
- **WHEN** a verified bundle contains a complete valid canonical Topic asset set
- **THEN** canonical decoding produces a prepared write whose path, hashes, bytes, and promotion target preserve the existing format
- **AND** the existing receipt-first staging and recovery protocol consumes that prepared write without a wire or persisted-format change

#### Scenario: Canonical assets disagree
- **WHEN** canonical Topic asset paths, declared hashes, contents, or identity are inconsistent
- **THEN** import fails before canonical staging or the SQLite import transaction
- **AND** no current Topic or durable repository fact changes

