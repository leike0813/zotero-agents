# literature-artifact-migration Specification

## Purpose

Provide an explicit, reviewable upgrade path for legacy Literature Artifact payloads while keeping ordinary reads, imports, and Synthesis consumers on the canonical contract.

## Requirements

### Requirement: Artifact migration SHALL be an explicit Dashboard-local operation

The product SHALL expose a permanent Dashboard Migrations region with a statically registered Literature Artifact library migration entry. Opening, rendering, selecting, deep-linking, and observing the entry SHALL be side-effect free. Scan, preview, apply, stop, and continue SHALL be callable only from the Dashboard-local migration surface; Workflow Host, Host Bridge, MCP, Pi, and CLI surfaces SHALL not register or proxy the migration operation. Dashboard SHALL project the migration ID and exact current definition version from the registered migration definition rather than duplicating those values.

#### Scenario: The migration entry is unavailable or the scan is empty
- **WHEN** the user opens the Migrations region and the migration cannot run or finds no candidates
- **THEN** the Migrations region and its entry SHALL remain visible
- **AND** the entry SHALL show its own availability or empty result without hiding the surface.

#### Scenario: A user only navigates to migration history
- **WHEN** the user opens, selects, or deep-links to the migration entry or an existing run
- **THEN** the UI SHALL perform observation or navigation only
- **AND** it SHALL not scan, write, create a run, or dispatch a worker.

#### Scenario: A non-Dashboard transport requests migration
- **WHEN** Workflow Host, Host Bridge, MCP, Pi, or CLI receives a migration operation request
- **THEN** the request SHALL be unavailable or rejected as an unsupported operation
- **AND** it SHALL not create a scan or apply effect.

#### Scenario: Migration service is unavailable
- **WHEN** Dashboard cannot resolve the registered migration service
- **THEN** the view SHALL remain unavailable and SHALL NOT offer Apply
- **AND** an unknown non-positive placeholder version SHALL NOT be presented as an executable migration definition.

### Requirement: A migration scan SHALL bind one library and classify complete artifact sets

Each scan SHALL bind one explicit library, produce plans for regular parents' References/Citation sets, and classify every candidate as `ready`, `review_required`, or `blocked`. References-only sets MAY be candidates; Citation sets SHALL be paired with their References set. Duplicate, citation-only library notes, corrupted or contradictory content, unwritable targets, and representations that would lose data SHALL remain blocked.

#### Scenario: A scan finds deterministic canonical linkage
- **WHEN** every row in a References/Citation set has unique evidence and can be represented without loss
- **THEN** the set SHALL be classified `ready`
- **AND** applying it SHALL still require explicit user confirmation.

#### Scenario: A scan needs user review
- **WHEN** the set can be converted without loss but has unresolved linkage or a recoverable Citation snapshot
- **THEN** it SHALL be classified `review_required`
- **AND** apply SHALL require set-level opt-in.

#### Scenario: A scan detects a blocking condition
- **WHEN** the set has duplicates, contradictory facts, citation-only input without canonical References, damaged payload, no writable target, or unsupported data that would be dropped
- **THEN** it SHALL be classified `blocked`
- **AND** the UI SHALL not offer a force-apply path.

### Requirement: Migration linkage SHALL use deterministic evidence and preserve recovery facts

The converter SHALL match in this order: unique shared non-positional legacy identity, unique normalized DOI, unique normalized raw citation, then unique normalized title-plus-year-plus-authors. It SHALL permit only NFKC, whitespace, DOI wrapper/case, author array/semicolon, and strict integer/string year normalization. Position, `ref_number`, token similarity, punctuation stripping, year tolerance, fuzzy/model matching, and cross-parent lookup SHALL not establish identity.

#### Scenario: A legacy row has no unique match
- **WHEN** zero candidates match the allowed evidence levels
- **THEN** the row SHALL be represented as unresolved and the set SHALL require review or remain blocked
- **AND** the converter SHALL not guess an identity.

#### Scenario: A strong identity conflicts with facts
- **WHEN** a shared legacy identity or normalized DOI maps to a candidate whose authoritative facts conflict
- **THEN** the set SHALL be blocked
- **AND** no Source Reference or Citation write SHALL occur.

#### Scenario: A Citation snapshot can restore a missing reference
- **WHEN** a Citation snapshot contains canonical minimum facts, no equivalent existing row exists, and the evidence is consistent
- **THEN** the converter MAY create a new opaque Source Reference ID in the same plan
- **AND** the set SHALL be `review_required` with a separate recovery count and evidence record.

### Requirement: Migration apply SHALL use a runtime-owned plan and one verified parent-set commit

The UI SHALL submit only a scan operation identity and runtime-issued candidate IDs. The runtime SHALL re-read current facts, permissions, definition version, and basis before each set. For a paired References/Citation set, the trusted writer SHALL commit both artifacts in the same Zotero transaction with one operation identity and one durable set receipt; it SHALL verify the pair and basis before any cleanup.

#### Scenario: A candidate changed after scan
- **WHEN** the current artifact, note revision, permission, or basis no longer matches the scan plan
- **THEN** the set SHALL produce `changed_since_scan` without writing
- **AND** other independent sets MAY continue.

#### Scenario: A paired set passes verification
- **WHEN** staging, References/Citation validation, basis verification, and parent-set commit all succeed
- **THEN** the canonical pair SHALL be visible as one committed semantic result
- **AND** only then MAY old inline payloads be removed and old user payload attachments moved to Trash.

#### Scenario: Cleanup fails after canonical commit
- **WHEN** canonical verification succeeds but cleanup cannot be completed
- **THEN** the canonical result SHALL be retained
- **AND** the set SHALL be `repair_required` and the run SHALL be `completed_with_attention`.

#### Scenario: An infrastructure failure occurs before a set commits
- **WHEN** a database or transaction failure prevents the set's commit
- **THEN** the set and run SHALL report a typed failure
- **AND** independently committed sets SHALL not be rolled back by a global coordinator.

### Requirement: Migration lifecycle SHALL be durable, single-flight, and restart-safe

The migration runtime SHALL permit at most one active scan/apply in a process and SHALL share its active snapshot with multiple Dashboard windows. It SHALL persist an envelope and one receipt per completed set with library, migration ID, definition version, refs, basis/hash, classification, outcome, timestamps, bounded counts, and bounded diagnostics. Terminal run states SHALL be `completed`, `completed_with_attention`, or `failed`.

#### Scenario: A second run starts while one is active
- **WHEN** a user starts a scan or apply while another migration is active
- **THEN** the request SHALL return typed `busy` with the active run identity
- **AND** it SHALL not queue or duplicate work.

#### Scenario: The user stops a run
- **WHEN** stop is requested
- **THEN** the runtime SHALL stop claiming later sets
- **AND** a set already in commit SHALL finish verification and receipt persistence before stopping
- **AND** the run SHALL report `completed_with_attention` with processed and remaining counts.

#### Scenario: The process restarts with a nonterminal run
- **WHEN** a previously persisted run is found nonterminal after restart
- **THEN** opening migration UI SHALL classify it as `failed: interrupted`
- **AND** the runtime SHALL not replay, scan, dispatch, or continue it automatically.

#### Scenario: The user continues a prior run
- **WHEN** the user chooses Continue
- **THEN** the runtime SHALL create a new apply operation and re-read, reclassify, and revalidate every candidate
- **AND** it SHALL require fresh review when facts or classification changed.

### Requirement: Restart and definition changes SHALL require a fresh scan

After Zotero or the plugin restarts, an old actionable preview SHALL not be executable. Apply SHALL require the current static migration ID and exact definition version. An incompatible old receipt or candidate SHALL fail with a typed stale-plan or version-mismatch outcome while retaining bounded history.

#### Scenario: A user tries to apply a pre-restart preview
- **WHEN** the preview was created before the current process or Zotero restart
- **THEN** apply SHALL reject it as stale
- **AND** the user SHALL be directed to a new explicit scan.

#### Scenario: The migration definition changes
- **WHEN** a stored receipt uses a definition version that is not the current exact version
- **THEN** the receipt's common history summary MAY remain visible
- **AND** no old code or old plan SHALL execute.

#### Scenario: Dashboard projects an actionable migration
- **WHEN** the registered migration service is available or busy
- **THEN** Dashboard SHALL expose the registered migration ID and exact current definition version
- **AND** it SHALL NOT substitute a separately maintained version literal.

### Requirement: Offline legacy import SHALL reuse the migration converter with explicit confirmation

Recognized legacy note or bundle input SHALL be previewed and explicitly confirmed before conversion. Canonical input SHALL use the normal importer. Unknown or damaged input SHALL fail closed. References-only input MAY convert; paired References/Citation input SHALL commit as a set. Citation-only input SHALL be blocked unless the target parent already has canonical References and the converter can produce deterministic or explicitly accepted unresolved linkage. Original files and ZIPs SHALL never be overwritten or deleted. Dashboard migration and offline import SHALL obtain normalized artifacts, classification, reason codes, diagnostics, counts, and basis from the same converter entry and SHALL NOT independently reclassify its result.

#### Scenario: A recognized legacy bundle is imported
- **WHEN** a user selects a recognized legacy file or bundle
- **THEN** the UI SHALL show a bounded preview and require confirmation
- **AND** successful import SHALL write only canonical payloads through the shared converter.

#### Scenario: A Citation-only offline input lacks canonical References
- **WHEN** a selected legacy Citation input targets a parent with no canonical References
- **THEN** conversion SHALL be blocked before any write
- **AND** the original input SHALL remain unchanged.

#### Scenario: An unknown or damaged input is selected
- **WHEN** the converter cannot recognize or safely validate the input
- **THEN** it SHALL fail closed with a validation result
- **AND** it SHALL not create a partial note or attachment.

### Requirement: Migration SHALL preserve known non-target managed payloads

The Literature Artifact migration SHALL migrate only `references-json` and `citation-analysis-json`. It SHALL preserve `digest-markdown`, `literature-score-json`, `conversation-note-markdown`, and `custom-markdown` without treating their presence as unsupported input. Unknown payload types SHALL remain blocked, and cleanup SHALL remove only migrated References/Citation representations.

#### Scenario: Legacy parent contains target and known non-target payloads
- **WHEN** a writable legacy parent contains migratable References/Citation evidence together with known Digest, Literature Score, Conversation, or Custom payloads
- **THEN** classification SHALL be based on the References/Citation conversion evidence without `unsupported_input`
- **AND** applying the candidate SHALL preserve every known non-target payload unchanged.

#### Scenario: Legacy parent contains an unknown payload type
- **WHEN** a legacy parent contains a payload type outside the six registered managed payload types
- **THEN** the candidate SHALL remain blocked with `unsupported_input`
- **AND** Apply SHALL NOT offer a force path.

### Requirement: Dashboard candidate selection SHALL be bounded and explicit

The Dashboard SHALL project at most 25 migration candidates per page from the runtime-owned scan plan and persisted candidate receipts. Ready candidates SHALL start selected, review-required candidates SHALL require an explicit user selection, and blocked candidates SHALL be disabled. Applying from the Dashboard SHALL consume the runtime-owned selection and SHALL NOT require the page to hold the complete candidate ID set.

#### Scenario: A scan produces more than one candidate page
- **WHEN** a migration scan produces more than 25 candidates
- **THEN** the Dashboard SHALL render only the current page with forward and backward navigation
- **AND** the candidate list SHALL remain independently scrollable
- **AND** selecting or paging SHALL NOT expose parent refs or raw legacy payloads.

#### Scenario: User reviews candidate classifications
- **WHEN** the candidate page contains ready, review-required, and blocked candidates
- **THEN** ready candidates SHALL be selected by default
- **AND** review-required candidates SHALL remain unselected until the user opts in
- **AND** blocked candidates SHALL be disabled and excluded from Apply.