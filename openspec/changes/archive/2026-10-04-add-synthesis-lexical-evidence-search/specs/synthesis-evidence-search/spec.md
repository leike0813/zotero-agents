# Spec Delta

## Purpose

Provides Synthesis-owned lexical search over bounded, citable Library source passages and returns only content verified against its current source owner during the search request.

## ADDED Requirements

### Requirement: Evidence search SHALL enforce explicit Library scope
Evidence search SHALL capture the current Library at request start when no library scope is supplied, reject an empty or ambiguous default scope, and treat supplied library, collection, tag, item type, and complete item references as intersecting filters.

#### Scenario: Current Library is uniquely available
- **WHEN** a request omits libraryIds and exactly one current Library can be captured
- **THEN** that Library is fixed as the request scope before source enumeration

#### Scenario: Scope is ambiguous or explicitly empty
- **WHEN** no unique current Library can be captured, libraryIds is empty, or an explicit scope cannot be resolved
- **THEN** the request fails with an explicit scope error and does not broaden to another Library

#### Scenario: Item references are supplied
- **WHEN** itemRefs contains duplicate complete `{libraryId, key}` identities or is an empty array
- **THEN** duplicates are removed and an empty array yields an empty result scope

### Requirement: Evidence search SHALL select only declared Library source kinds
Evidence search SHALL search the union of selected metadata, existing Markdown full-text, and canonical digest or analysis sources; omitted sourceKinds selects all supported kinds and an empty array selects none.

#### Scenario: Source kinds are combined
- **WHEN** more than one source kind is selected
- **THEN** matching spans their union while each result retains its actual source identity and type

#### Scenario: Unsupported material is encountered
- **WHEN** source material is an ordinary note, annotation, conversation, or Topic synthesis content, or would require new OCR
- **THEN** it is excluded from evidence search and is not reported as Library evidence

### Requirement: Evidence search SHALL return verified complete passages
Each returned result SHALL include its complete verified passage content and format, complete item reference, source identity and type, opaque source-owner version, and source location with a zero-based UTF-16 half-open range.

#### Scenario: Candidate passage is read and verified
- **WHEN** a candidate source is read within the request bound and its owner version, scope, and range still match
- **THEN** the same response returns the complete passage and its verified source facts

#### Scenario: Candidate source changes or cannot be read
- **WHEN** source version or scope changes, the source disappears, or its owner read fails
- **THEN** the result omits unverified content and reports limited or unavailable status with a bounded issue

#### Scenario: A passage crosses Unicode text
- **WHEN** a passage range is returned for Unicode text
- **THEN** its UTF-16 half-open range selects the original text and its boundaries do not split a Unicode character

#### Scenario: Supplementary context comes from elsewhere
- **WHEN** a result includes a table heading or other context from a different source range
- **THEN** that context carries its own location and is not represented as part of one continuous passage

### Requirement: Evidence search SHALL use bounded current source reads
Evidence search SHALL enumerate and read source-owner facts within per-request bounds, SHALL use current runtime Host adapters for source access, and SHALL NOT depend on a persistent lexical index or a separate retrieval process.

#### Scenario: Search completes within bounds
- **WHEN** all declared source kinds and scoped candidates are examined within the request bounds
- **THEN** the search reports actual coverage and exact total only when all matching passage results are known

#### Scenario: Search reaches a source-work bound
- **WHEN** the request cannot finish scanning or source verification within its bound
- **THEN** it returns bounded verified results as limited and does not claim an exact total or complete coverage

### Requirement: Evidence search SHALL expose one public operation
Synthesis SHALL expose evidence retrieval through `SynthesisClient.searchEvidence` and its explicit Workflow Host projection `host.synthesis.searchEvidence`, with retrieval execution owned by the in-runtime Rust application.

#### Scenario: Workflow caller searches evidence
- **WHEN** an authorized Workflow Host caller invokes `synthesis.searchEvidence`
- **THEN** the call uses the typed Synthesis client operation and returns the shared search result contract

#### Scenario: Public readback is proposed
- **WHEN** evidence passage verification is implemented
- **THEN** retrieval performs the source read internally and does not add a public `readEvidence` operation
