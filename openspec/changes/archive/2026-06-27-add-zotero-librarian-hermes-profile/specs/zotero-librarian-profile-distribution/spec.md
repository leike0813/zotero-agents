## ADDED Requirements

### Requirement: Hermes profile distribution includes Zotero librarian assets

The repository SHALL provide a `zotero-librarian` Hermes profile distribution
that can operate Zotero through the Host Bridge CLI.

#### Scenario: Profile source tree is complete

- **WHEN** the profile check runs
- **THEN** the profile SHALL include distribution metadata, Hermes instructions,
  a Zotero librarian skill, generated references, helper scripts, cron templates,
  and a Host Bridge profile example
- **AND** it SHALL exclude credentials, memories, sessions, logs, and runtime
  databases.

#### Scenario: Published profile embeds CLI prebuilds

- **WHEN** the profile publisher runs with complete `addon/bin` prebuilds
- **THEN** the published branch SHALL include every supported platform
  `zotero-bridge` binary and checksum file under `assets/zotero-bridge/bin/`
- **AND** the publish manifest SHALL record each platform, binary path, size,
  and SHA-256 checksum.

### Requirement: Profile maintains an agent-side metadata index

The profile SHALL include a helper script that maintains a local metadata and
structure index for Zotero library management tasks.

#### Scenario: Index refresh stores current metadata

- **WHEN** the helper runs `refresh`
- **THEN** it SHALL page through `zotero-bridge library snapshot`
- **AND** it SHALL write item metadata, tags, collections, note counts, and
  attachment counts into SQLite
- **AND** entries absent from the latest successful refresh SHALL be marked
  deleted.

#### Scenario: Search prefers the local index

- **WHEN** the helper runs `search`
- **THEN** it SHALL return matching non-deleted indexed items without calling
  Zotero
- **AND** the profile instructions SHALL require live Host Bridge confirmation
  when the user requests current facts or the local index is stale.

### Requirement: Profile caches workflow payload guidance

The profile SHALL provide a workflow catalog that lets the agent submit known
workflows without describing them on every run.

#### Scenario: Runtime workflow catalog refresh

- **WHEN** the helper runs `workflow-refresh`
- **THEN** it SHALL call `workflow list`
- **AND** it SHALL call `workflow describe` only for new or changed workflows
- **AND** it SHALL store selection, workflow option, and provider profile
  guidance for later `workflow-show` calls.

### Requirement: Profile monitors workflow runs

The profile SHALL track submitted Host Bridge workflow runs until terminal
state.

#### Scenario: Monitor active run records

- **WHEN** the helper runs `run-watch`
- **THEN** it SHALL call `workflow run <runId>` for active registered runs
- **AND** it SHALL update local run state
- **AND** it SHALL report only state changes, terminal states, or required user
  attention.

### Requirement: Profile declares scheduled library manager jobs

The profile SHALL include recurring Hermes cron templates for library upkeep.

#### Scenario: Scheduled tasks are present

- **WHEN** the profile check runs
- **THEN** cron templates SHALL exist for index refresh, workflow catalog
  refresh, run monitoring, inbox triage, library hygiene, and attention queue
  summaries
- **AND** quiet no-change runs SHALL instruct Hermes to return `[SILENT]`.
