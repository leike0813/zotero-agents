# managed-literature-artifacts Specification

## Purpose

Define one Broker-owned semantic contract for managed notes, Source Reference artifacts, and Citation evidence so every writer, importer, exporter, and Synthesis consumer observes the same identity, basis, and failure rules.

## Requirements

### Requirement: Managed Note operations SHALL have one canonical semantic owner

The system SHALL expose exactly six semantic operations for managed note content: `managed_note.write_custom`, `managed_note.write_conversation`, `literature_artifact.upsert_digest`, `literature_artifact.upsert_references`, `literature_artifact.upsert_citation_analysis`, and `literature_artifact.upsert_score`. Each operation SHALL validate its declared managed type, return one confirmed operation result, and SHALL NOT expose a sequence of list/create/upsert/cleanup effects as the public result.

#### Scenario: A custom or conversation note is written
- **WHEN** a caller submits a portable parent reference, a title, and markdown to the matching managed-note operation
- **THEN** the system SHALL create or update exactly that managed type
- **AND** the result SHALL identify the normalized semantic note state and one operation outcome
- **AND** the caller SHALL not need to know the storage wrapper, HTML anchor, payload attachment, or derived image layout.

#### Scenario: A singleton literature artifact is upserted
- **WHEN** a caller upserts a digest, references, citation-analysis, or score artifact for a parent
- **THEN** zero matching managed notes SHALL create one note and one matching note SHALL update it
- **AND** more than one matching note SHALL return `ambiguous_state` with bounded candidate references
- **AND** the operation SHALL perform no write or duplicate cleanup for the ambiguous case.

#### Scenario: A managed note is addressed with the wrong type
- **WHEN** an update or upsert reference resolves to a note whose managed type differs from the operation
- **THEN** the operation SHALL fail with a stable type-conflict error
- **AND** it SHALL not change the note, move it, or silently convert it.

### Requirement: Ordinary notes SHALL be protected from managed semantic writes

Managed operations SHALL reject ordinary notes, and ordinary `notes.updateContent` SHALL reject managed notes. Ordinary note creation SHALL reject reserved managed markers or anchors. Corrupt or ambiguous managed content SHALL fail closed instead of being treated as an ordinary note.

#### Scenario: An ordinary note is supplied to a managed operation
- **WHEN** a managed operation receives a reference to an ordinary note
- **THEN** it SHALL return a stable managed-type error
- **AND** it SHALL leave the ordinary note and its attachments unchanged.

#### Scenario: Ordinary content update targets a managed note
- **WHEN** ordinary `notes.updateContent` receives a managed-note reference
- **THEN** it SHALL return a stable managed-type error before changing content or attachments
- **AND** the caller SHALL use the matching managed semantic operation instead.

#### Scenario: An ordinary note attempts to use a reserved marker
- **WHEN** an ordinary note create request contains a reserved managed marker or anchor
- **THEN** validation SHALL fail before any note or attachment is created
- **AND** the error SHALL identify the required capability category without exposing native objects.

#### Scenario: Managed content is damaged or ambiguous
- **WHEN** the system finds conflicting markers, an unreadable required payload, or multiple singleton candidates
- **THEN** the result SHALL be a closed diagnostic such as `invalid_artifact` or `ambiguous_state`
- **AND** the content SHALL not be downgraded to ordinary-note behavior.

### Requirement: Managed detail SHALL return a bounded discriminated semantic result

Managed note detail reads SHALL return an ordinary/managed discriminated result. The managed branch SHALL include the complete normalized semantic payload, stable provenance and health facts, and serialized byte facts. The Broker domain result SHALL remain bounded by the existing 1 MiB response budget; a downstream ToolResult adapter MAY apply its separate 50 KiB gate. A result exceeding the applicable domain budget SHALL return typed `resource_limited` without truncation, pagination of the payload, implicit file creation, or raw ordinary HTML fallback.

#### Scenario: A managed note detail fits the response bound
- **WHEN** a caller requests a valid managed note detail and its normalized semantic payload is within the bound
- **THEN** the result SHALL identify its managed type and include the complete payload and declared byte facts
- **AND** no storage wrapper or native host object SHALL cross the boundary.

#### Scenario: A managed note detail fits the Broker budget but not a downstream ToolResult
- **WHEN** the complete normalized payload is greater than 50 KiB but does not exceed the 1 MiB Broker domain budget
- **THEN** the Broker read SHALL succeed with exact serialized byte facts
- **AND** the downstream ToolResult adapter SHALL return its typed resource-limited result without changing the Broker semantic result.

#### Scenario: A managed note detail exceeds the Broker budget
- **WHEN** the complete normalized payload exceeds the 1 MiB Broker domain budget
- **THEN** the read SHALL return `resource_limited`
- **AND** it SHALL not truncate, page, silently omit fields, or return the note as ordinary HTML.

### Requirement: Source Reference artifacts SHALL use one closed strict-JSON contract

Every Source Reference artifact SHALL be a versioned strict-JSON object with no aliases or unknown fields. Its closed semantic groups SHALL keep extraction `{ raw, confidence } | null` together; bibliographic `title`, `authors`, and integer-or-null `year` together; renderer metadata together; and matching DOI, URL, ISBN, ISSN, and citekey facts together. Citation mention evidence SHALL be preserved separately from the Source Reference facts, while display labels, `report_md`, and reference snapshots SHALL be derived projections rather than alternate source shapes.

#### Scenario: A complete Source Reference artifact is accepted
- **WHEN** a producer submits a versioned artifact containing the declared closed groups and required minimum facts
- **THEN** validation SHALL accept the artifact as strict JSON
- **AND** all citation mention evidence SHALL remain available to downstream projections.

#### Scenario: An alias or unknown field is submitted
- **WHEN** a payload uses a legacy alias, an open-ended extra field, a positional reference number, or a second spelling for an existing concept
- **THEN** validation SHALL reject it with a stable schema error
- **AND** the system SHALL not silently normalize it into the canonical contract.

#### Scenario: Extraction confidence is absent or forged
- **WHEN** a producer attempts to represent manual input as extraction confidence or supplies an invalid extraction group
- **THEN** validation SHALL reject the payload or represent the extraction group as null
- **AND** manual input SHALL not be promoted to extracted evidence.

### Requirement: Citation evidence SHALL preserve function category and contextual role separately

Citation evidence SHALL preserve citation mentions and their evidence. Its function value SHALL use the closed function classification category, while `role_in_context` SHALL remain a separate text value. Neither value SHALL be merged into Source Reference bibliographic facts or replaced by a display label.

#### Scenario: Citation evidence contains function and context
- **WHEN** a Citation artifact records a mention with a function category and contextual role
- **THEN** the function category SHALL remain machine-readable as its declared category
- **AND** `role_in_context` SHALL remain separate text
- **AND** both values SHALL survive canonical round-trip.

#### Scenario: Citation evidence has an unknown function category
- **WHEN** a Citation artifact supplies a function value outside the closed classification
- **THEN** validation SHALL reject that value
- **AND** it SHALL not coerce it into `role_in_context` or a display label.

### Requirement: Source Reference and Citation identity SHALL be opaque and basis-bound

Each Source Reference SHALL carry an opaque runtime or producer-issued `sourceReferenceId`. Citation records SHALL reference that ID only. Existing IDs SHALL be preserved by editing and canonical import when the same source row is intentionally retained; new extraction SHALL receive a new ID. IDs SHALL NOT be derived from position, `ref-N`, title, DOI, content hashes, or Synthesis IDs. Runtime SHALL compute `referencesBasis` from the complete canonical Source Reference artifact set, derive Citation staleness by comparing bases, and SHALL NOT accept caller-supplied basis or persist a stale flag as authority.

#### Scenario: A canonical reference is edited in place
- **WHEN** an authorized rewrite retains an existing source row
- **THEN** its opaque `sourceReferenceId` SHALL be preserved
- **AND** the runtime SHALL recompute the basis from the resulting complete set.

#### Scenario: A new reference is extracted
- **WHEN** an extraction introduces a source row with no existing identity
- **THEN** the runtime or trusted producer SHALL allocate a fresh opaque ID
- **AND** no content or location-derived ID SHALL be accepted.

#### Scenario: References change while Citation remains unchanged
- **WHEN** the current References basis differs from the basis recorded by a Citation artifact
- **THEN** the Citation SHALL be projected as stale for current Synthesis evidence
- **AND** the system SHALL not mutate the Citation merely because it is stale.

### Requirement: References and Citation writes SHALL preserve paired semantic behavior

References-only writes SHALL retain an existing Citation note while making it stale when the basis changes. Citation-only writes SHALL validate every referenced source ID against the current References set and compute the current basis in a private preflight. Trusted workflow, migration, and paired import paths MAY commit References and Citation together through one parent-set semantic operation; public callers SHALL not be required to compose two partial public tools.

#### Scenario: References-only write changes the basis
- **WHEN** a References artifact is successfully rewritten and an existing Citation artifact remains
- **THEN** the Citation note SHALL remain stored
- **AND** its current-evidence projection SHALL be marked stale until an exact matching rewrite or explicit deletion occurs.

#### Scenario: Citation references an unknown ID
- **WHEN** a Citation-only write names a sourceReferenceId absent from current References
- **THEN** preflight SHALL fail before mutation
- **AND** no Citation content or basis record SHALL be committed.

#### Scenario: Paired import writes both artifacts
- **WHEN** a trusted import or migration has validated a References/Citation pair
- **THEN** it SHALL verify IDs and basis and commit the pair in the same Zotero transaction with one operation identity and one durable receipt
- **AND** it SHALL not expose an intermediate partial success as the public result.

### Requirement: Synthesis SHALL consume the complete artifact and derive projections

The Synthesis Application SHALL receive complete canonical Source Reference artifacts and Citation evidence. It SHALL derive labels, report markdown, snapshots, matching views, and readiness projections from that input; runtime adapters SHALL not recreate aliases or apply a second semantic filter.

#### Scenario: Live and cold Synthesis reads consume an artifact
- **WHEN** a live workflow apply or a cold Host scan submits a Source Reference artifact
- **THEN** both paths SHALL use the same closed artifact shape and opaque identity
- **AND** the Synthesis Application SHALL be the sole semantic projection owner.

#### Scenario: A derived display field changes
- **WHEN** a label or report projection is recomputed from a valid artifact
- **THEN** the source artifact and its evidence SHALL remain unchanged
- **AND** no alternate persisted DTO SHALL become a second source of truth.