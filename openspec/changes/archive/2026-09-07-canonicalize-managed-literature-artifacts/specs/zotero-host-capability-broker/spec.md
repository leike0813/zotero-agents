## ADDED Requirements

### Requirement: Broker SHALL own canonical Managed Note semantic operations

The Zotero Host Capability Broker SHALL be the sole public semantic owner for custom, conversation-note, digest, references, citation-analysis, and literature-score note reads and writes. It SHALL expose the six named operations and SHALL keep storage wrappers, payload attachments, derived images, singleton resolution, compensation, verification, and receipts inside that owner. Workflow, Bundle, Bridge, MCP, and migration callers SHALL consume the projection rather than reimplementing note orchestration.

#### Scenario: A caller requests managed note detail
- **WHEN** the Broker resolves an ordinary or managed note
- **THEN** it SHALL return the closed discriminated semantic result
- **AND** it SHALL not expose raw Zotero objects, local paths, storage wrappers, or native payload exceptions.

#### Scenario: A caller writes a References/Citation pair
- **WHEN** a trusted caller submits a validated pair for one parent
- **THEN** the Broker SHALL verify the parent and current note facts and commit the pair in one Zotero transaction
- **AND** one operation identity and one durable receipt SHALL cover the parent-set result.

#### Scenario: A legacy payload reaches an ordinary Broker reader
- **WHEN** a note contains a recognized legacy artifact shape
- **THEN** the Broker SHALL return `legacy_artifact_requires_migration`
- **AND** it SHALL not silently parse, normalize, or write the legacy shape.

#### Scenario: Ordinary note content update targets a managed note
- **WHEN** `notes.updateContent` receives a managed-note reference
- **THEN** the Broker SHALL reject the update before changing note content or attachments
- **AND** the caller SHALL use the matching managed semantic operation.

### Requirement: Broker SHALL enforce strict canonical Source Reference and Citation identity

Broker artifact inputs SHALL be strict JSON and SHALL accept only the versioned closed Source Reference/Citation contract. The Broker SHALL preserve explicit opaque source IDs on intentional editing/import, allocate IDs for new extraction or approved recovery, compute References basis from the complete canonical set, and derive Citation staleness from basis comparison. Caller-supplied IDs derived from position, content, DOI, title, or Synthesis identity SHALL not be accepted as authority. Matching facts SHALL remain the single declared DOI, URL, ISBN, ISSN, and citekey fields; aliases and duplicate representations SHALL be rejected.

#### Scenario: Canonical references are rewritten
- **WHEN** an authorized rewrite explicitly retains a sourceReferenceId
- **THEN** the Broker SHALL retain that opaque ID and recompute the current basis
- **AND** it SHALL not assign a new ID merely because the note revision changed.

#### Scenario: A Citation uses an unknown source ID
- **WHEN** a Citation write references an ID absent from the current complete References set
- **THEN** Broker preflight SHALL fail before any note or attachment mutation
- **AND** the error SHALL contain stable code/retryability and strict-JSON details only.

#### Scenario: An alias or unknown artifact field is supplied
- **WHEN** a caller submits a legacy alias, open-ended field, positional reference number, or duplicate representation
- **THEN** the Broker SHALL reject the payload
- **AND** it SHALL not delegate to a legacy handler or native fallback.

### Requirement: Broker managed-artifact detail SHALL enforce the bounded public result

Broker managed detail SHALL report complete normalized semantic content and serialized byte facts within the existing 1 MiB Broker domain budget. A downstream ToolResult adapter MAY apply its separate 50 KiB gate. If the complete Broker result exceeds 1 MiB, the Broker SHALL return typed `resource_limited` without truncation, pagination, implicit file export, or ordinary-note fallback.

#### Scenario: Managed detail is within the result bound
- **WHEN** a valid managed note is read and its semantic result fits the bound
- **THEN** the Broker SHALL return the complete declared payload and health facts
- **AND** it SHALL not return storage HTML as a substitute.

#### Scenario: Managed detail exceeds a downstream ToolResult gate only
- **WHEN** a complete managed detail result exceeds 50 KiB but remains within the 1 MiB Broker budget
- **THEN** the Broker SHALL return the complete semantic result with exact byte facts
- **AND** a downstream ToolResult adapter SHALL enforce its own gate without changing Broker semantics.

#### Scenario: Managed detail exceeds the Broker budget
- **WHEN** a complete managed detail result exceeds 1 MiB
- **THEN** the Broker SHALL return `resource_limited`
- **AND** it SHALL not drop fields or expose a path to bypass the budget.

### Requirement: Broker trusted parent-set writes SHALL produce one identity and one receipt

Broker-private workflow, migration, and paired-import seams MAY compose References and Citation input, but the canonical effect SHALL be one parent-set admission, one Zotero transaction, one operation identity, and one durable receipt. Public operations SHALL not permit callers to observe a half-pair or chain independent note receipts as a substitute.

#### Scenario: Parent-set preflight fails
- **WHEN** either artifact, parent, revision, source ID, permission, or computed basis fails validation
- **THEN** the Broker SHALL perform no note or attachment write
- **AND** it SHALL return one failed attempt for the parent-set operation.

#### Scenario: Parent-set commit succeeds
- **WHEN** all artifacts pass preflight and the transaction commits
- **THEN** the Broker SHALL publish one confirmed parent-set result and receipt
- **AND** downstream readers SHALL observe both artifacts and the resulting basis coherently.
