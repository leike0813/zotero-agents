## ADDED Requirements

### Requirement: Plugin SHALL initialize a protected builtin workflow status policy before startup completes
The plugin MUST initialize Synthesis persistence, ensure the `status` facet is present, and persist the five builtin status definitions before marking startup complete: `need-metadata-curation`, `need-fulltext`, `need-markdown`, `need-analysis`, and `need-deep-reading`.

#### Scenario: Fresh vocabulary is initialized eagerly
- **WHEN** plugin startup reaches the Synthesis initialization phase
- **THEN** the controlled vocabulary SHALL contain all five builtin status definitions
- **AND** startup SHALL NOT depend on opening the Tags page or running a workflow

#### Scenario: Startup initialization fails closed
- **WHEN** repository or builtin vocabulary initialization fails
- **THEN** the plugin SHALL NOT mark startup as initialized
- **AND** a structured startup error SHALL remain observable

### Requirement: Builtin status definitions SHALL retain protected identity fields
The plugin MUST derive builtin identity from the policy's exact tags and MUST normalize `tag`, `facet`, `source`, `deprecated`, and `replacement` while allowing `note` and `aliases` to be updated.

#### Scenario: Existing vocabulary is upgraded without losing editable metadata
- **WHEN** an existing vocabulary lacks a builtin or contains a legacy definition of the same exact tag
- **THEN** missing definitions SHALL be restored and protected fields SHALL be normalized
- **AND** existing note and aliases SHALL be preserved

#### Scenario: Persistence input omits or deprecates a builtin
- **WHEN** save, import, sync recovery, or staged promotion input omits a builtin or changes a protected field
- **THEN** persistence SHALL restore the canonical builtin definition
- **AND** custom status tags SHALL remain ordinary manageable entries

### Requirement: Workflow host SHALL expose status instance transitions by stable key
The host API MUST expose a read-only builtin key/tag policy and an idempotent transition operation that modifies tags on a literature item without modifying controlled vocabulary definitions.

#### Scenario: Valid transition adds and removes item status instances
- **WHEN** a workflow requests disjoint known keys in `add` and `remove`
- **THEN** the host SHALL idempotently update the target item
- **AND** return structured added, removed, and warning information

#### Scenario: Invalid transition is rejected
- **WHEN** a key is unknown, the same key appears in add and remove, or builtin vocabulary is not initialized
- **THEN** the host SHALL reject the transition without modifying the item

### Requirement: Builtin workflow apply lifecycles SHALL transition only completed work
Search creation and successful artifact-producing workflows MUST apply the policy transition table, while skipped, failed, canceled, or incomplete apply paths MUST retain existing statuses.

#### Scenario: Search creates a new item
- **WHEN** Search creates a literature item
- **THEN** it SHALL add markdown, analysis, and deep-reading pending statuses
- **AND** add metadata curation only when `needsCuration` is true
- **AND** add fulltext only when the current result did not obtain a PDF

#### Scenario: Search reuses an existing item
- **WHEN** Search reuses an existing literature item
- **THEN** it SHALL only add metadata or fulltext statuses justified by the current result
- **AND** SHALL NOT enqueue the complete downstream workflow

#### Scenario: Successful artifact clears its pending statuses
- **WHEN** Curator completes or verifies no change, MinerU attaches Markdown, Analysis writes its formal artifact, or Deep Reading attaches HTML
- **THEN** the corresponding pending status SHALL be removed
- **AND** MinerU SHALL remove both fulltext and markdown pending statuses

#### Scenario: Status update fails after artifact success
- **WHEN** an artifact is successfully applied but the status transition fails
- **THEN** the artifact SHALL remain applied
- **AND** the result SHALL include a structured partial warning

### Requirement: Bootstrapper and Regulator SHALL NOT govern builtin status definitions or instances
Bootstrapper MUST treat builtin definitions as read-only reserved entries, and Regulator MUST ignore builtin status additions and removals while continuing ordinary tag changes.

#### Scenario: Bootstrapper candidate matches builtin
- **WHEN** Bootstrapper output contains a tag equal to a builtin status definition
- **THEN** the apply boundary SHALL ignore it without counting it as added

#### Scenario: Regulator output changes builtin instance
- **WHEN** Regulator output includes a builtin status in add or remove tags
- **THEN** the apply boundary SHALL ignore that operation and record a structured diagnostic
- **AND** other valid tag changes SHALL continue
