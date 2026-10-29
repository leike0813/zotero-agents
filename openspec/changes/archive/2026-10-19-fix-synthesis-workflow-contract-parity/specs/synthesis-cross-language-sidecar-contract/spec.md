## MODIFIED Requirements

### Requirement: Current lifecycle versions SHALL be authoritative

The protocol registry SHALL describe the current launch v4, discovery v2, production discovery v5, runtime bundle, health, handshake, shutdown, error, diagnostic, trace, and observability documents. Superseded lifecycle shapes MUST NOT remain an alternative protocol SSOT.

#### Scenario: Stale lifecycle document is supplied

- **WHEN** a lifecycle document uses a superseded schema version or shape not declared by the current registry
- **THEN** both language implementations reject it as incompatible or invalid

## ADDED Requirements

### Requirement: Protocol coverage SHALL be derived from production obligations

Coverage SHALL enumerate capability request/result/error and worker input/output header/section/error contracts from production rosters. It SHALL separately report entry samples, recursive structure, cross-language execution and workflow producer evidence, with a complete uncovered list. Missing, skipped and mock-only evidence SHALL not count as executed coverage.

#### Scenario: A mapped capability has no executed sample

- **WHEN** coverage is checked
- **THEN** the capability remains uncovered and the completion gate fails

#### Scenario: A nested branch or bound is absent

- **WHEN** a reachable union branch or declared object, scalar, array or map constraint has no matching evidence
- **THEN** the report identifies the uncovered schema obligation

### Requirement: Cross-language evidence SHALL exercise production implementations

Shared samples SHALL execute production TypeScript rebuilders and Rust decoding, projection and serialization. Invalid requests SHALL also reach the native route without TypeScript prevalidation. Common cases SHALL agree on acceptance and stable error category. Every workflow producer SHALL cross its real hook, Host facade and native client.

#### Scenario: A language accepts a malformed nested request

- **WHEN** the other language rejects the shared sample
- **THEN** parity fails even if both implementation-specific suites pass

#### Scenario: Workflow output is accepted only by a mock

- **WHEN** the workflow producer has no real native execution evidence
- **THEN** it remains uncovered

#### Scenario: Entry slots pass without evidence from the actual receiver

- **WHEN** all protocol entry slots have production exchange receipts but a schema-derived recursive obligation has no matching production receiver verification
- **THEN** the cross-language structure report retains that obligation id as uncovered and the overall completion gate fails

#### Scenario: A message is produced by Rust and consumed by TypeScript

- **WHEN** a capability result/error, worker output/error or Reverse Host request is verified
- **THEN** a real production exchange proves its producer executed
- **AND** positive, boundary and malformed values execute the production TypeScript receiver with the declared error classification
- **AND** the report identifies TypeScript as the receiver without requiring a nonexistent Rust input route for its own output

#### Scenario: A shared definition reaches both message directions

- **WHEN** a recursive schema obligation is reachable by both TypeScript and Rust receivers
- **THEN** both production receivers need matching execution evidence
- **AND** an absent receiver, skipped probe or divergence prevents completion

#### Scenario: A direct worker has no section transport

- **WHEN** metrics or layout executes its direct run protocol
- **THEN** its input and output section schemas reject every JSON value
- **AND** explicit absence samples represent no transmitted section without inventing a null or empty-object DTO
- **AND** section slots require a successful real process exchange without sections and actual receiver rejection of attempted sections
- **AND** all 135 capability entries, 15 worker entries and 480 message slots remain in the roster while recursive obligations follow the corrected schema graph

#### Scenario: A paged worker header violates the shared contract

- **WHEN** a run header violates a declared version, enum, required or closed field, string length, or numeric bound
- **THEN** production Rust rejects it as `invalid_request` before accepting input sections
- **AND** valid Unicode strings at the Schema character limit remain accepted
- **AND** producers supply the required protocol version

#### Scenario: A canceled run has not executed deferred validation

- **WHEN** a worker returns cancellation after header admission
- **THEN** that observation does not count as rejection of a nested constraint
- **AND** unobserved compute validation remains uncovered

#### Scenario: String capacities and passage positions use their declared measures

- **WHEN** a search request, cursor or evidence string reaches its Schema length bound
- **THEN** producers and receivers count Unicode code points for that capacity
- **AND** passage offsets and range equality retain UTF-16 position semantics
- **AND** paging relations and source identities remain domain validation after structural decoding

### Requirement: Native build identity SHALL include embedded contract inputs

Source and build fingerprints SHALL include the protocol registry, schemas and SQL embedded by the production runtime, so their changes invalidate older native bundles.

#### Scenario: Embedded protocol or database schema changes

- **WHEN** a compiled registry, protocol schema or repository SQL input changes
- **THEN** the current source and build identity change
- **AND** an older seven-target bundle cannot pass the current freshness check
