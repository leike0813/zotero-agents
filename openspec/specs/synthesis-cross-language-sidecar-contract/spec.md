# synthesis-cross-language-sidecar-contract Specification

## Purpose

Define canonical cross-language parity for native sidecar lifecycle identity and its shared corpus.

## Requirements

### Requirement: Native lifecycle identity SHALL have cross-language parity

A versioned language-neutral corpus SHALL define valid and invalid manifest v2,
launch, discovery, health, handshake, capability, timestamp, target, signature,
and fingerprint documents for TypeScript and Rust rebuilders.

#### Scenario: Corpus is checked
- **WHEN** TypeScript and Rust process the same native lifecycle corpus
- **THEN** both SHALL accept the same valid documents and return the same stable code for every invalid document

### Requirement: Complete sidecar protocol SHALL have cross-language parity

A JSON Schema 2020-12 registry and versioned corpus SHALL cover all sidecar capability and worker DTOs, including nested positive values and invalid values at every reachable object, array, map, and union boundary. TypeScript rebuilders and Rust serde DTOs SHALL accept and reject the same corpus entries with the same stable category.

#### Scenario: Protocol corpus is checked
- **WHEN** TypeScript and Rust process the complete sidecar protocol corpus
- **THEN** both accept every positive document
- **AND** both reject every derived nested negative document
- **AND** the registry reports 119 of 119 capabilities and 15 of 15 worker operations mapped

### Requirement: Current lifecycle versions SHALL be authoritative

The protocol registry SHALL describe the current launch v3, discovery v2, production discovery v5, runtime bundle, health, handshake, shutdown, error, diagnostic, trace, and observability documents. Superseded lifecycle shapes MUST NOT remain an alternative protocol SSOT.

#### Scenario: Stale lifecycle document is supplied
- **WHEN** a lifecycle document uses a superseded schema version or shape not declared by the current registry
- **THEN** both language implementations reject it as incompatible or invalid

### Requirement: Topic discovery candidates SHALL be recursively closed

The protocol registry SHALL define one strict `TopicDiscoveryCandidate` object shared by Topic Detail and discovery-hint command results. Every reachable candidate object and nested reasons array SHALL reject unknown fields and bound strings and collection sizes, and TypeScript and Rust SHALL accept and reject the same corpus entries.

#### Scenario: Discovery candidate corpus is checked
- **WHEN** TypeScript and Rust process valid and invalid Topic discovery candidate documents
- **THEN** both accept the same valid documents
- **AND** both reject unknown candidate fields, invalid statuses, missing identities, and out-of-bound reasons with the same stable category

#### Scenario: General Topic projection is checked
- **WHEN** a Topic list or summary projection is validated
- **THEN** it contains discovery counts and status without carrying an opaque hint-object array

### Requirement: Shared search contracts SHALL have TypeScript and Rust parity
The canonical sidecar protocol contract set SHALL define the strict shared search request, result, evidence passage, source identity, location, coverage, issue, and cursor-boundary DTOs for TypeScript and Rust.

#### Scenario: Valid search corpus is rebuilt
- **WHEN** TypeScript and Rust rebuild the same valid search request and result fixtures
- **THEN** both accept the same bounded values and preserve the same public fields and semantics

#### Scenario: Invalid search corpus is rebuilt
- **WHEN** either implementation receives unknown fields, malformed scope identities, invalid limits, invalid ranges, or unbounded issue/coverage values
- **THEN** both reject the fixture under the same stable invalid-contract category

#### Scenario: Unicode location corpus is rebuilt
- **WHEN** both implementations process evidence ranges over multilingual supplementary-plane text
- **THEN** they agree on UTF-16 half-open boundaries and reject ranges that split a Unicode character
