## MODIFIED Requirements

### Requirement: Canonical assets use versioned JSON envelopes

Synthesis Layer canonical JSON assets SHALL use a versioned envelope with
`schema_id`, `schema_version`, `created_at`, `updated_at`, and `data`, and the
default plugin service SHALL store those assets under durable
`data/synthesis`.

#### Scenario: Default Synthesis canonical root is durable

- **WHEN** the default Synthesis service writes canonical assets
- **THEN** the assets SHALL be stored below `<DataDirectory>/zotero-agents/data/synthesis`
- **AND** they SHALL NOT be stored below cleanable runtime directories.

## REMOVED Requirements

### Requirement: Note shards encode sync mirror payloads

Synthesis note shards SHALL encode mirror payloads in hidden HTML comments and
SHALL not expose machine JSON as visible note content.

## ADDED Requirements

### Requirement: Zotero note mirror is not a runtime persistence path

Zotero note mirror SHALL NOT participate in normal Synthesis runtime
persistence.

#### Scenario: Canonical write completes without mirror refresh

- **WHEN** a topic synthesis apply, delete, purge, or canonical transaction
  succeeds
- **THEN** the default service SHALL NOT create or update Zotero anchor notes or
  mirror shards.

#### Scenario: Legacy mirror is migration-only

- **WHEN** legacy mirror content exists
- **THEN** only the explicit one-shot migration script MAY read it as a legacy
  source
- **AND** the plugin runtime SHALL NOT expose mirror rebuild/recovery as the
  primary sync mechanism.
