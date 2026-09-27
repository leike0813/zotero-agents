# synthesis-native-reference-canonical-surface Specification

## Purpose
Expose one coherent Reference Application owner over a closed canonical Source Reference/Citation contract so live and cold Synthesis paths, TS and Rust consumers, and the typed Host bridge all share one artifact shape, opaque identity, and basis rule.
## Requirements
### Requirement: Reference and canonical operations SHALL preserve public semantics

The native surface SHALL implement exactly the sixteen Reference and Canonical operations assigned by the R9a operation-ownership matrix. Public ranking, attention, index, review, proposal, batch, merge, metadata, archive, refresh, retry, and advanced-matching DTOs MUST remain compatible.

#### Scenario: A reference read or review is requested
- **WHEN** the request is valid for the current repository and canonical basis
- **THEN** Rust returns or applies the compatible typed result
- **AND** no unrelated review action is used as a substitute

### Requirement: Canonical mutations SHALL be coherent and durable

Canonical Reference mutations and Source Reference artifact ingestion SHALL be planned and projected by the Reference Application owner. Every durable write SHALL validate the complete closed artifact, preserve or allocate opaque source identities according to the authoring/import rule, compute the References basis from the resulting set, and commit dependent state through the appropriate atomic persistence boundary. Application and runtime surfaces SHALL not expose repository records, locks, transaction closures, or storage wrappers.

#### Scenario: A canonical artifact pair is valid
- **WHEN** a References/Citation pair matches the captured parent and artifact contract and passes its promotion checkpoint
- **THEN** the Application SHALL commit the pair and resulting basis coherently
- **AND** the returned typed result SHALL contain no repository or storage record.

#### Scenario: A canonical batch is valid
- **WHEN** every command matches the captured basis, passes validation, and passes its promotion checkpoint
- **THEN** the Application SHALL commit the batch and dependent basis state atomically
- **AND** it SHALL return a compatible typed result without exposing repository owners or storage records.

#### Scenario: A command is stale or invalid
- **WHEN** an artifact field, source ID, note revision, basis, or required precondition fails
- **THEN** the Application SHALL return the stable conflict or validation result
- **AND** it SHALL not apply an unauthorized partial canonical mutation.

#### Scenario: Promotion is no longer permitted
- **WHEN** the caller-supplied checkpoint rejects a durable Source Reference or Canonical Reference write
- **THEN** the Application SHALL return the stable stopping or cancellation outcome
- **AND** it SHALL perform no durable mutation or terminal maintenance transition.

### Requirement: Matching jobs and readiness SHALL be evidence-backed

Reference refresh and advanced matching SHALL consume bounded reverse-Host pages, execute native worker compute, and persist job/proposal state. Every owned operation SHALL pass differential, restart, conflict, batch, bounds, and deadline evidence before ready-roster admission.

#### Scenario: A matching handler lacks full evidence
- **WHEN** registration succeeds but Host-fed job, durable proposal, or public DTO parity is incomplete
- **THEN** the operation remains not ready

### Requirement: Reference Host page reads SHALL use a capability-specific deadline

`library.items.list_page` SHALL retain the general 1 MiB response-body bound and use a ten-second call timeout. The Host endpoint and native client MUST enforce the same selected timeout, while unlisted reverse-Host capabilities retain the general two-second default.

#### Scenario: Reference Host page exceeds the general deadline
- **WHEN** a valid `library.items.list_page` response completes after two seconds and before ten seconds
- **THEN** the reverse-Host returns the complete bounded page

### Requirement: Reference operations SHALL use generic spans and facts

Reference refresh and Advanced Matching SHALL use the common boundary model.
Matching facts are limited to matching hash and proposal, fact, and warning
counts; warning text and library identifiers SHALL be absent.

#### Scenario: Advanced Matching completes
- **WHEN** binding, dedupe, and durable promotion reach a terminal state
- **THEN** one causal trace contains both worker attempts and allowlisted counts

### Requirement: Reference semantic projections SHALL have one application owner

Reference index, ranking, attention, review, workbench, and artifact projections SHALL be selected, ordered, paginated, and interpreted by one coherent Reference Application owner. Runtime adapters SHALL only decode requests and encode typed representations. The Application SHALL receive complete canonical Source Reference artifacts and Citation evidence, while labels, report markdown, snapshots, and other display facts SHALL be derived projections.

#### Scenario: A Reference projection is requested
- **WHEN** a runtime route supplies a valid typed projection query
- **THEN** the Application SHALL return a typed semantic projection from one coherent durable basis
- **AND** no runtime adapter SHALL reimplement selection, ranking, alias normalization, or effective identity rules.

#### Scenario: Live and cold ingestion use the same artifact
- **WHEN** a workflow apply and a cold Host scan submit a Source Reference artifact
- **THEN** both paths SHALL use the same closed fields, opaque ID, and Citation evidence shape
- **AND** the Application SHALL provide the sole semantic projection.

#### Scenario: A basis is stale
- **WHEN** Citation evidence references a References basis different from the current complete artifact set
- **THEN** the Application SHALL expose a derived stale fact for current evidence
- **AND** it SHALL not persist stale status as an independent source of truth.

### Requirement: Native Reference contracts SHALL preserve the closed Source Reference semantic groups

The TS and Rust native contracts SHALL accept only the versioned closed Source Reference/Citation shape: extraction `{ raw, confidence } | null`, bibliographic title/authors/year integer-or-null, renderer metadata, matching DOI/URL/ISBN/ISSN/citekey, and preserved Citation mention evidence. Citation function SHALL remain a closed classification category separate from `role_in_context` text. Unknown fields, alias families, positional identities, and alternate `SynthesisReferenceEntry` DTOs SHALL be rejected.

#### Scenario: Native contract receives a complete artifact
- **WHEN** a valid closed artifact reaches the TS or Rust Application boundary
- **THEN** it SHALL be decoded without dropping declared evidence or matching facts
- **AND** the same semantic fields SHALL be available to live and cold projections.

#### Scenario: Native contract receives an alias shape
- **WHEN** a payload contains a legacy raw reference ID, reference index, alias field, or unknown property
- **THEN** the contract SHALL reject it
- **AND** no application or repository write SHALL occur.

### Requirement: Canonical identity SHALL be retained or freshly allocated by explicit authoring intent

Normal rewrite and canonical import SHALL preserve an existing `sourceReferenceId` only when the caller explicitly retains that source row. New extraction and valid snapshot recovery SHALL receive a fresh opaque ID generated by the producer or authoring runtime. The Application SHALL preserve and merge independent Canonical Reference identity and MAY use existing canonical matching or hashes to validate and cohere a set; it SHALL not allocate identity from DOI, title, author, year, content hash, position, or Synthesis IDs.

#### Scenario: A normal rewrite retains a source row
- **WHEN** a rewrite explicitly carries an existing valid sourceReferenceId for the same source row
- **THEN** the Application SHALL retain that ID
- **AND** it SHALL recompute the complete References basis.

#### Scenario: A new row is authored
- **WHEN** authoring or snapshot recovery creates a source row with no retained identity
- **THEN** the Application SHALL allocate a fresh opaque ID
- **AND** it SHALL not derive that ID from content or location.
