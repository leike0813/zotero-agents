## ADDED Requirements

### Requirement: Metadata identifier translation SHALL be a bounded exact-match broker lookup
The broker SHALL own identifier metadata translation semantics: late binding of the Zotero search-translation capability, per-type identifier normalization from a closed normalization table, ISBN format and checksum validation, bounded examination of every translator candidate, exact-match candidate selection on the corresponding identifier field, canonical portable-item serialization, and stable failure mapping. The lookup SHALL be read-only — it SHALL NOT create items, save attachments, or write to the library — and SHALL complete in one bounded call with no caller-controlled pagination, limit, or diagnostics knobs. The broker SHALL NOT guess identifier types, extract identifiers from free text, accept multiple identifiers per request, treat the first translator candidate as a match, or silently truncate translator, candidate, creator, or evidence collections; budget overflow SHALL fail as `resource_limited` and translator runtime failure SHALL surface through the stable taxonomy rather than as a negative lookup result.

#### Scenario: Broker normalizes a provider URL
- **WHEN** a caller submits a bare identifier, a standard prefixed form, or a standard provider URL for a declared identifier type
- **THEN** the broker normalizes it per the closed per-type table and reports the normalized identifier in the result evidence

#### Scenario: Free-text extraction is refused
- **WHEN** a caller submits a citation string or paragraph expecting identifier extraction
- **THEN** the broker fails as `invalid_request` rather than guessing an identifier

#### Scenario: Translator list is empty
- **WHEN** no translator participates in the lookup
- **THEN** the broker reports the closed no-translator negative outcome and does not misreport it as runtime unavailability

#### Scenario: Invalid ISBN is rejected before translation
- **WHEN** an ISBN value fails format or checksum validation
- **THEN** the broker fails as `invalid_request` without invoking any translator

### Requirement: Broker note creation SHALL validate placement atomically
The broker SHALL own note creation semantics in which placement is exactly one of a top-level placement (optional library defaulting to the user library, optional same-library active collections) or a child placement (a valid parent item, library derived from the parent). Placement, content bound, collection validity, and initial tag validation SHALL all complete before any note is committed, and initial tags SHALL be committed within the same operation boundary as the note itself rather than as a separately orchestrated mutation. The broker SHALL derive the note title from note content and SHALL NOT accept a standalone title field.

#### Scenario: Cross-library collection is rejected before commit
- **WHEN** a top-level placement references a collection outside the resolved target library
- **THEN** the broker fails validation and no note exists afterwards

#### Scenario: Child note inherits the parent library
- **WHEN** a child placement names a valid parent item
- **THEN** the note is created in the parent's library with no independent library or collection input

#### Scenario: Initial tags commit with the note
- **WHEN** a creation request carries initial tags
- **THEN** a single accepted operation produces a tagged note and there is no observable committed note that lacks the requested tags

### Requirement: Broker payload upsert SHALL be idempotent and compensated
The broker SHALL own payload storage policy for note payload upsert: logical value validation against the decoded-size hard limit, canonical payload hashing, the inline-versus-attachment and encoding decisions, staging of a new attachment, note anchor and content update, superseded-attachment cleanup, revision advancement for the note and affected items, and a unified receipt covering the note plus old and new attachments. Identical logical content and schema identity SHALL short-circuit to a verified unchanged result without rewriting note or attachment state, and duplicate payloads of one payload type SHALL fail as a conflict with ambiguous-state details instead of being silently replaced. When a new attachment exists but the note update fails, the broker SHALL attempt compensating deletion of the new attachment, keep the original failure as the primary error, and record any surviving attachment as a residual reference; when superseded-attachment cleanup cannot be confirmed after a committed note update, the broker SHALL report a repair-required or unknown outcome rather than confirmed success.

#### Scenario: Hash-identical upsert does no work
- **WHEN** an upsert request's canonical hash equals the stored payload's logical content and schema identity
- **THEN** the broker returns the unchanged outcome, issues no attachment write, and the receipt records only verified state

#### Scenario: Compensation removes the orphaned attachment
- **WHEN** note update fails after the new payload attachment was created and the compensating delete succeeds
- **THEN** the attempt report names the original failure as primary and lists no residual attachment

#### Scenario: Compensation failure is visible
- **WHEN** note update fails and the new payload attachment cannot be deleted
- **THEN** the attempt report preserves the original failure as primary and records the orphaned attachment in residual references

### Requirement: Broker attachment file replacement SHALL preserve original content on failure
The broker SHALL own file replacement semantics for file-backed attachments: source-kind versus link-mode matching with no implicit conversion, pre-commit validation of the complete stored file set, managed staging, atomic switch of managed content, post-commit cleanup with an explicit repair-required or unknown outcome when cleanup is unconfirmed, and linked-file relocation that validates and canonicalizes the new path while never copying, modifying, or deleting external files. All filesystem access SHALL go through the shared runtime persistence adapter resolved per call. Content-identical replacement (same hash and complete companion set, or same canonical linked path) SHALL be confirmed as unchanged, and filename and MIME identity SHALL be re-derived from the actual replacement source. Any replacement failure SHALL leave the target attachment's original file intact and SHALL preserve the original failure as the primary error, with replay of the same operation identity returning the original receipt rather than repeating staging, swap, or cleanup.

#### Scenario: Failed switch keeps the original file
- **WHEN** the atomic switch fails after managed staging completed
- **THEN** the attachment still resolves to its original file content and the attempt report carries the original failure as primary

#### Scenario: Linked relocation validates the new path
- **WHEN** the new linked path does not exist or is not a regular readable file
- **THEN** the broker fails before updating the Zotero link and the attachment still points at the old path

#### Scenario: Replay returns the original receipt
- **WHEN** the same caller scope replays a committed replacement with the same operation identity
- **THEN** the broker returns the original receipt and result snapshot without repeating staging, swap, or cleanup
