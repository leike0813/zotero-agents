## ADDED Requirements

### Requirement: metadata.translateIdentifier SHALL return a closed three-outcome lookup
`metadata.translateIdentifier` SHALL accept a closed request of exactly `type` (one of `DOI`, `ISBN`, `arXiv`, `PMID`) and a non-empty `value`, and SHALL reject the legacy `normalized` alias, an open `type` string, optional identifier input, multiple identifiers, or any caller-controlled resource knob as `invalid_request`. The Host SHALL normalize the request value per identifier type (validating ISBN format and checksum), examine every translator candidate within the fixed hard budgets, and select candidates by exact match on the corresponding identifier field rather than accepting the first translator result. A completed lookup SHALL return exactly one of three normal outcomes — `matched` with one canonical portable regular-item DTO, `ambiguous` with a bounded list of only exact-match candidates, or `not_found` with a closed reason of `no_translator`, `no_candidate`, or `identifier_mismatch` — and every branch SHALL carry the same required evidence of normalized identifier, examined candidate count, exact-match count, and bounded translator id/label pairs. Input over 2,048 characters SHALL fail as `invalid_request`; translator count over 32, examined candidates over 64, returned ambiguous candidates over 64, translator id over 128 characters, translator label over 256 characters, or serialized result over 4 MiB SHALL fail as `resource_limited` with controlled `resource/limit/observed` details and no truncated payload. Translator runtime unavailability SHALL fail as `unavailable`, translator execution failure SHALL fail as `execution_failed`, and neither SHALL be downgraded to a `not_found` result. Item creators SHALL be returned complete up to the shared canonical creator budget of 100 per item, with overflow failing as `resource_limited` rather than silently truncating the creator list.

#### Scenario: First candidate does not match the identifier
- **WHEN** a translator returns multiple candidates and only a later candidate matches the requested identifier exactly
- **THEN** the result is `matched` with that exact candidate and the evidence reports the full examined candidate count and the exact-match count

#### Scenario: Multiple candidates match the identifier
- **WHEN** two translator candidates carry the same requested identifier
- **THEN** the result is `ambiguous` with both candidates and no preferred candidate is silently selected

#### Scenario: No candidate matches the identifier
- **WHEN** translator candidates exist but none carries the requested identifier
- **THEN** the result is `not_found` with reason `identifier_mismatch` and the same required evidence as a `matched` result

#### Scenario: Legacy alias or open type is submitted
- **WHEN** a caller submits `normalized` instead of `value`, a `type` outside the closed four-value union, or a limit/diagnostics knob
- **THEN** the call fails as `invalid_request` before any translator is invoked

#### Scenario: Translator throws during lookup
- **WHEN** the translator runtime raises during translation
- **THEN** the call fails with the stable `execution_failed` taxonomy entry and is not reported as `not_found`

#### Scenario: Candidate volume exceeds the hard budget
- **WHEN** the translator returns more candidates than the fixed examination budget
- **THEN** the entire lookup fails as `resource_limited` with controlled details and no partial candidate list is returned

#### Scenario: Creator list exceeds the canonical budget
- **WHEN** a matched item carries more creators than the shared per-item creator budget
- **THEN** the lookup fails as `resource_limited` instead of returning a silently truncated creator list

### Requirement: notes.create SHALL use a placement discriminated union
`notes.create` SHALL accept a request of exactly `operationId`, a `placement` discriminated union, `content`, and optional `initialTags`. The `top_level` placement MAY carry `libraryId` (defaulting to the user library) and `collectionRefs`; the `child` placement MUST carry `parentRef` and SHALL NOT accept a library or collections, deriving the library from the parent. Every referenced collection SHALL exist, be active, and belong to the target library, and every placement, content, and tag violation SHALL fail before any note is committed. `initialTags` SHALL be applied in the same accepted operation as the note creation, so callers never orchestrate a separate tag mutation to tag a new note. `operationId` SHALL be required and a safe retry of the same operation SHALL NOT create a duplicate note. The request SHALL NOT accept a standalone `title`, and success SHALL return only the portable note summary and the Host-issued receipt.

#### Scenario: Top-level note is created into collections
- **WHEN** a caller creates a `top_level` note with valid same-library `collectionRefs` and `initialTags`
- **THEN** one note is created, placed in every listed collection, and tagged, all confirmed by one receipt

#### Scenario: Child placement rejects library overrides
- **WHEN** a `child` placement carries a library id or collection references
- **THEN** the call fails as `invalid_request` before any write

#### Scenario: Invalid collection fails before commit
- **WHEN** a `top_level` placement references a missing, trashed, or foreign-library collection
- **THEN** the call fails before any note is created

#### Scenario: Operation retry is idempotent
- **WHEN** the same caller scope retries a committed `notes.create` with the same operation identity and request
- **THEN** the original receipt and result are returned and no second note exists

#### Scenario: Optional-field bag is rejected
- **WHEN** a caller submits the legacy flat request mixing `parentRef` with library or collection fields, or a standalone `title`
- **THEN** the call fails as `invalid_request` without creating a note

### Requirement: notes.upsertPayload SHALL be idempotent, conflict-safe, and compensated
`notes.upsertPayload` SHALL accept only the logical payload (`payloadType`, kind, schema identity, format, and value) plus `operationId`, `noteRef`, and optional `expectedRevision`, and SHALL reject caller-chosen encoding, storage preference, source, or attachment references. Its success result SHALL be exactly `{note, payload, outcome}` where `outcome` is one of `created`, `replaced`, or `unchanged`. When the stored logical content and schema identity match the request hash exactly, the Host SHALL return `unchanged` without rewriting the note or any attachment. When multiple payloads of the same `payloadType` exist on the note, the Host SHALL fail with `conflict` and details reason `ambiguous_state` rather than silently replacing all of them. If a new payload attachment has been created but the note update fails, the Host SHALL attempt to delete the new attachment, preserve the original failure as the primary error, and report any attachment that could not be removed in `residualRefs`. If the note was updated but old-attachment cleanup cannot be confirmed, the outcome SHALL be `repair_required` or `unknown` rather than a full success. Replaying the same operation identity SHALL return the original result without creating another attachment.

#### Scenario: Identical payload short-circuits
- **WHEN** the note already stores a payload whose logical content and schema identity hash equal the request
- **THEN** the result outcome is `unchanged`, no attachment is rewritten, and the receipt confirms verified state

#### Scenario: Duplicate payload type is a conflict
- **WHEN** the note holds two payloads with the requested `payloadType`
- **THEN** the call fails with `conflict` reason `ambiguous_state` and no payload is modified or deleted

#### Scenario: Note update fails after attachment staging
- **WHEN** the new payload attachment was created but updating the note fails
- **THEN** the Host attempts to delete the new attachment, the attempt report preserves the original failure as primary, and any surviving attachment appears in `residualRefs`

#### Scenario: Old attachment cleanup is unconfirmed
- **WHEN** the note update committed but removal of the superseded attachment cannot be confirmed
- **THEN** the result is `repair_required` or `unknown` with the residual attachment recorded, not a committed success

#### Scenario: Storage knobs are rejected
- **WHEN** a caller submits `encoding`, `source`, `attachmentRef`, or an inline/attachment preference
- **THEN** the call fails as `invalid_request` before any write

### Requirement: attachments.replaceFile SHALL perform staged atomic replacement
`attachments.replaceFile` SHALL replace the file content of a file-backed attachment through one member whose `source.kind` SHALL match the target's current link mode: stored-file and stored-URL targets accept only a `stored_file` source, linked-file targets accept only a `linked_file` source, linked-URL targets and note image/payload attachments SHALL be rejected, and the member SHALL NOT convert between stored and linked modes. A stored replacement SHALL validate the main file and every companion input before touching Zotero state, copy the complete set into managed staging, enforce entry-count, total-bytes, filename, path-traversal, duplicate-target, and symlink policy, atomically switch the attachment's managed content, and clean up the old managed content only after commit; when cleanup cannot be confirmed the outcome SHALL be `repair_required` or `unknown` rather than full success, and any failure SHALL preserve the original file and the original error as primary. A linked-file relocation SHALL verify the new path exists as a regular readable file, canonicalize it, update only the Zotero link, and never delete or modify the external files at the old or new path. Identical content hash with the complete companion set, or an identical canonical linked path, SHALL return `unchanged`. `operationId` SHALL be required, `expectedRevision` SHALL act as compare-and-swap when supplied, replay SHALL not repeat staging, swap, or cleanup, filename and MIME SHALL be re-derived from the actual source, and the receipt SHALL cover verified before-and-after facts of the replacement.

#### Scenario: Stored replacement commits atomically
- **WHEN** a stored-file target receives a valid main file plus companions
- **THEN** the managed content switches atomically, the receipt records before/after attachment facts, and the old managed content is cleaned after commit

#### Scenario: Staging validation fails before any change
- **WHEN** a companion input fails path-traversal, duplicate-target, or size validation
- **THEN** the call fails before any Zotero state changes and the original attachment file remains intact

#### Scenario: Replacement failure preserves the original file
- **WHEN** the staged switch fails after validation
- **THEN** the attachment keeps its original file and the attempt report preserves the original failure as the primary error

#### Scenario: Link mode mismatch is rejected
- **WHEN** a stored-file target receives a `linked_file` source or a linked-file target receives a `stored_file` source
- **THEN** the call fails as `invalid_request` without converting the link mode

#### Scenario: Linked relocation never touches external files
- **WHEN** a linked-file target is relocated to a new canonical path
- **THEN** only the Zotero link is updated and neither the old nor the new external file is copied, modified, or deleted

#### Scenario: Identical replacement is unchanged
- **WHEN** the replacement content hash and complete companion set equal the current state, or the linked canonical path is unchanged
- **THEN** the result outcome is `unchanged` with a confirmed receipt and no staging swap occurs

#### Scenario: Cleanup cannot be confirmed
- **WHEN** the new content committed but old managed content cleanup cannot be confirmed
- **THEN** the outcome is `repair_required` or `unknown` and the residual content is recorded, not reported as full success
