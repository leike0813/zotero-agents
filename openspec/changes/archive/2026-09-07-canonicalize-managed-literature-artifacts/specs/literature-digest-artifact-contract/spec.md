## MODIFIED Requirements

### Requirement: Literature-Digest Generated Notes SHALL Support Canonical Artifact Export Mapping

The three generated note kinds from literature-digest and the literature-score note SHALL map deterministically to the closed canonical artifact contract. Export SHALL preserve semantic content and opaque source identities while keeping storage wrappers, HTML, attachment keys, and derived images internal.

#### Scenario: References note exports a canonical Source Reference artifact
- **WHEN** a references generated note is exported
- **THEN** the exporter SHALL read the complete canonical Source Reference artifact set
- **AND** it SHALL write the declared canonical JSON artifact without the plugin-internal wrapper payload shape
- **AND** every valid opaque `sourceReferenceId` and Citation mention evidence SHALL be preserved.

#### Scenario: References note exports decoded JSON payload
- **WHEN** a references generated note is exported
- **THEN** the exporter SHALL decode its canonical semantic payload
- **AND** it SHALL export the canonical JSON artifact rather than a plugin-internal wrapper payload.

#### Scenario: References note is written after deterministic validation
- **WHEN** literature-digest applies a references result
- **THEN** the canonical contract SHALL validate all closed groups before storage
- **AND** invalid rows SHALL be reported as a rejected conversion rather than silently filtered
- **AND** warning-only evidence SHALL remain in the artifact with its declared evidence and confidence facts.

#### Scenario: References note is written after deterministic quality filtering
- **WHEN** literature-digest applies a references generated note
- **THEN** deterministic invalid reference rows SHALL be rejected before the canonical payload is stored
- **AND** warning-only low-quality rows SHALL remain in the stored artifact
- **AND** quality counters SHALL not become a second top-level artifact wrapper.

#### Scenario: Citation analysis retains evidence and derives display fields
- **WHEN** a citation-analysis artifact is exported
- **THEN** citation mentions and their evidence SHALL remain in the canonical source payload
- **AND** display labels, `report_md`, and reference snapshots SHALL be derived projections
- **AND** they SHALL not replace or duplicate the source artifact fields.

### Requirement: Literature-Digest Artifact Import SHALL Reuse Canonical Generated-Note Writing

Artifact import flows SHALL use the one canonical managed-artifact writer used by the literature-digest workflow. The ordinary importer SHALL accept the canonical contract and SHALL return `legacy_artifact_requires_migration` for recognized legacy shapes; legacy parsing and conversion SHALL remain in the explicit migration seam.

#### Scenario: Import digest markdown
- **WHEN** a valid digest markdown file is imported for a parent item
- **THEN** the workflow SHALL upsert the digest artifact through the canonical writer
- **AND** it SHALL not construct a package-local note/payload sequence.

#### Scenario: Import references and citation-analysis JSON
- **WHEN** valid canonical references or citation-analysis JSON artifacts are imported
- **THEN** the importer SHALL validate them against the closed contract
- **AND** it SHALL write them through the canonical parent-set writer
- **AND** a paired References/Citation import SHALL have one operation identity and one durable set receipt.

#### Scenario: A legacy wrapper is submitted to ordinary import
- **WHEN** a references or citation-analysis JSON file uses an older wrapper, alias, positional identity, or converted export shape
- **THEN** ordinary import SHALL return `legacy_artifact_requires_migration`
- **AND** it SHALL not guess, filter, or write that payload.

#### Scenario: Import only accepts native artifacts
- **WHEN** a references or citation-analysis JSON file uses an old wrapper shape
- **THEN** ordinary import SHALL reject it with `legacy_artifact_requires_migration`
- **AND** only canonical native artifact JSON SHALL reach the managed writer.

#### Scenario: Legacy references representation requires explicit migration
- **WHEN** a references JSON artifact uses a historical runtime wrapper or alternate schema representation
- **THEN** ordinary import SHALL return `legacy_artifact_requires_migration`
- **AND** only the explicit migration preview/confirmation path MAY convert it to the canonical semantic artifact.

#### Scenario: Native references import accepts both runtime-native and schema-native forms
- **WHEN** a references JSON file uses the canonical contract-set object with its declared schema and `references` array
- **THEN** ordinary import SHALL validate and write that one canonical shape
- **AND** it SHALL not normalize a bare array, top-level `items`, or any other alias.
- **WHEN** a references JSON file uses a bare array, top-level `items`, or another legacy runtime wrapper
- **THEN** ordinary import SHALL return `legacy_artifact_requires_migration` without normalization
- **AND** only the explicit migration preview/confirmation path MAY convert it to the one canonical contract-set artifact shape.

### Requirement: Literature-Digest Artifact Validation SHALL Use Copied Workflow-Local Schemas

Structured artifact import SHALL validate against the repository's versioned contract-set owner for canonical Source Reference, Citation, digest, and score artifacts. Workflow-local copies and external Skill-Runner trees SHALL not become independent schema authorities.

#### Scenario: References schema is validated by the contract owner
- **WHEN** canonical references JSON is imported
- **THEN** validation SHALL use the declared contract-set version
- **AND** runtime SHALL not read the external `reference/Skill-Runner` tree
- **AND** unknown fields and aliases SHALL fail closed.

#### Scenario: References schema copy is used for validation
- **WHEN** references JSON is imported by a legacy-compatible workflow adapter
- **THEN** the adapter SHALL resolve the declared schema through the contract-set owner
- **AND** runtime SHALL not depend on reading the external `reference/Skill-Runner` tree.

#### Scenario: Citation analysis schema is validated by the contract owner
- **WHEN** canonical citation-analysis JSON is imported
- **THEN** validation SHALL use the same versioned contract-set identity
- **AND** it SHALL validate the closed Citation evidence and Source Reference linkage
- **AND** it SHALL not apply a second workflow-local normalizer or quality filter.

#### Scenario: Citation analysis schema copy is used for validation
- **WHEN** citation-analysis JSON is imported
- **THEN** validation SHALL resolve the declared contract-set schema rather than the external Skill-Runner tree
- **AND** it SHALL interpret the canonical inner citation-analysis artifact contract.

### Requirement: Literature score SHALL use a native portable artifact contract

Literature score export and import SHALL preserve the native `literature_score.v1` JSON as the portable source artifact and SHALL route writes through the canonical managed-artifact owner.

#### Scenario: Score note is exported
- **WHEN** a literature-score generated note is exported
- **THEN** its semantic payload SHALL export as native `literature_score.json`
- **AND** the external artifact SHALL be the bare `literature_score.v1` object
- **AND** any derived radar image or readable body SHALL remain a projection.

#### Scenario: Score artifact is imported
- **WHEN** a valid native `literature_score.json` is imported
- **THEN** import SHALL use the canonical score writer
- **AND** it SHALL rebuild the readable body and radar image from the JSON
- **AND** it SHALL return one semantic operation result.

#### Scenario: Literature or research bundle is round-tripped
- **WHEN** a bundle containing a score is exported and imported
- **THEN** the score payload SHALL be preserved exactly as canonical JSON
- **AND** derived image attachment keys SHALL be remapped or rebuilt without changing the score JSON.
