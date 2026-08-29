## MODIFIED Requirements

### Requirement: Zotero note mirror is not a runtime persistence path

Zotero note mirror SHALL NOT participate in normal Synthesis runtime persistence, synchronization, or recovery.

#### Scenario: Canonical transaction completes without mirror access

- **WHEN** a topic synthesis apply, delete, purge, or canonical transaction succeeds
- **THEN** the default service SHALL NOT discover, create, read, update, or delete Zotero anchor notes or mirror shards
- **AND** success SHALL depend only on canonical transaction outcomes.

#### Scenario: Legacy mirror data exists

- **WHEN** legacy anchor or shard items remain in Zotero
- **THEN** normal plugin runtime SHALL leave those items untouched
- **AND** it SHALL NOT advertise mirror rebuild or canonical-from-shard recovery actions.

#### Scenario: Future legacy migration is required

- **WHEN** a future product requirement needs data from legacy mirror shards
- **THEN** that migration SHALL be implemented as a separately specified, explicitly confirmed one-shot tool
- **AND** it SHALL NOT restore Topic mirror as a normal Synthesis persistence path.
