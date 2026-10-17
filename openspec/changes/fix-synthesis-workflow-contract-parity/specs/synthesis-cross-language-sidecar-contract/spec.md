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

#### Scenario: Entry slots and TypeScript structure pass without native recursive evidence

- **WHEN** all protocol entry slots have execution receipts but a schema-derived recursive obligation has no matching native-process verification
- **THEN** the cross-language structure report retains that obligation id as uncovered and the overall completion gate fails
