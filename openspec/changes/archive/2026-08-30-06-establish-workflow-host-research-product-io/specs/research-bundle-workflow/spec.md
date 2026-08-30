## ADDED Requirements

### Requirement: Research Bundle materialization SHALL return immutable run-scoped resources
`researchBundles.materializePapers` SHALL resolve bounded portable paper refs, preserve first-selection order, materialize the canonical paper artifacts and source graph, and return immutable run-scoped resource references plus closed issues. It MUST NOT return live attachment paths as resource identity.

#### Scenario: Paper has Markdown images and a PDF
- **WHEN** materialization resolves an eligible paper with both sources
- **THEN** the result contains portable paper metadata, a validated source graph, and resources whose bytes remain fixed for the run

### Requirement: Research Bundle import SHALL own the complete graph write
`researchBundles.importPapers` SHALL validate the entire portable paper graph, resolve explicit create/existing targets, compute strongly connected consistency groups, schedule dependency-ready groups, create or reuse targets, stage resources, bind relations after targets exist, and report one bounded result per paper. The caller MUST NOT orchestrate equivalent low-level writes.

#### Scenario: Acyclic dependency chain imports
- **WHEN** paper B depends on paper A and both validate
- **THEN** the owner establishes A before B and binds their relation only after both target identities exist

#### Scenario: Cycle forms one consistency group
- **WHEN** several paper nodes form a strongly connected component
- **THEN** the owner treats them as one consistency group for commit, compensation, and result reporting

### Requirement: Import target mapping SHALL be explicit and non-destructive
Each paper SHALL declare whether it creates a new target or reuses an existing portable target. Existing targets SHALL be validated and reused without metadata, type, creator, tag, collection, relation, note, or attachment mutation except effects explicitly named by the request contract.

#### Scenario: Existing target is reused
- **WHEN** a paper maps to an existing regular item
- **THEN** import attaches only explicitly requested child resources and relations and does not rewrite the existing parent metadata

#### Scenario: Caller omits target mapping
- **WHEN** an import row provides neither a valid create target nor a valid existing target
- **THEN** validation fails without guessing from DOI, title, file hash, or library search

### Requirement: Import partial success SHALL preserve group consistency
Independent consistency groups MAY succeed when another group fails, but no result SHALL report success for a group whose required targets or resources are incomplete. Failed, canceled, unknown, and repair-required rows SHALL reference canonical attempt evidence without copying an open error bag.

#### Scenario: Independent group fails
- **WHEN** one consistency group fails before affecting another dependency-independent group
- **THEN** the independent group may commit and both groups receive explicit per-paper outcomes

#### Scenario: Compensation leaves residue
- **WHEN** a failed group cannot remove all newly created items or managed resources
- **THEN** affected rows report `repair_required` with bounded residual evidence and unaffected committed groups remain valid

### Requirement: Import SHALL not resume after process restart
Research Bundle import operation state and run-scoped resources SHALL be process-scoped. After Host restart, a caller MUST inspect current Zotero state and submit a new operation rather than resuming a prior graph scheduler.

#### Scenario: Host restarts after ambiguous import
- **WHEN** an import attempt has `unknown` outcome and the Host restarts
- **THEN** the caller performs reconciliation and cannot replay the old operation identity or resource handles
