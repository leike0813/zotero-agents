# synthesize-topic-workflow Delta

## ADDED Requirements

### Requirement: Topic synthesis workflow result bundles are validated

The `synthesize-topic` workflow SHALL produce a verifiable result bundle before
formal persistence.

#### Scenario: Valid bundle is received

- **WHEN** a bundle contains topic definition, resolver, resolved paper set,
  diagnostics, metadata, markdown, timeline, and base hashes
- **THEN** the validator SHALL accept the bundle.

#### Scenario: Unsupported synthesis kind is received

- **WHEN** a bundle kind is not `topic_synthesis`
- **THEN** the validator SHALL reject it.

### Requirement: Agents do not directly write formal assets

The workflow result bundle SHALL NOT contain direct write instructions for raw
Zotero source, canonical indexes, or note shards.

#### Scenario: Direct writes are requested

- **WHEN** a bundle contains write instructions
- **THEN** the validator SHALL reject it.

### Requirement: Apply decision uses base hashes

Workflow apply decisions SHALL use optimistic base-hash checks.

#### Scenario: Base hashes match

- **WHEN** current hashes match bundle base hashes
- **THEN** apply decision SHALL be `persist`.

#### Scenario: Base hashes mismatch

- **WHEN** current hashes differ from bundle base hashes
- **THEN** apply decision SHALL be `conflict`
- **AND** it SHALL return mismatch details without auto-merging Markdown.
