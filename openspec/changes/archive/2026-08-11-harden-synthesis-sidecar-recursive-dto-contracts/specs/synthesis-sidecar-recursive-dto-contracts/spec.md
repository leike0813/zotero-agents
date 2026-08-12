## Purpose

Defines the language-neutral, recursively concrete DTO contract for every Synthesis sidecar cross-process capability and deterministic worker operation.

## ADDED Requirements

### Requirement: Protocol registry SHALL cover every cross-process entry point

One versioned registry SHALL map all 119 sidecar capabilities and all 15 deterministic worker operations to exactly one request, success-result, and error contract, with worker operations additionally mapped to concrete header, section, row, and result contracts.

#### Scenario: Registry is checked
- **WHEN** the protocol contract gate reads the production, reverse-Host, system, compute, transfer, and worker rosters
- **THEN** every entry has exactly one complete mapping
- **AND** no unknown, duplicate, orphan, or unmapped contract remains

### Requirement: Nested DTOs SHALL be recursively concrete

Every object, array, map, and union reachable from a protocol entry point SHALL have a concrete recursive shape. Known domain data MUST NOT terminate in generic JSON, an untyped object, or an untyped array.

#### Scenario: Nested object is malformed
- **WHEN** a request or response contains an unknown nested key, missing required member, wrong nested scalar, wrong array element, invalid null, or unmatched union discriminator
- **THEN** both TypeScript and Rust reject it with the contract-owned stable failure
- **AND** neither side substitutes an empty object, empty array, empty string, zero, or null

### Requirement: Opaque leaves SHALL be explicit and bounded

Opaque data SHALL be permitted only through a named contract that declares its owner, schema identifier and version or codec identity, byte/depth/node bounds, and integrity metadata. A consumer MUST NOT inspect an opaque leaf before validating it at the declared owner boundary.

#### Scenario: Generic JSON is used as a domain field
- **WHEN** recursive analysis reaches a generic JSON definition outside the explicit opaque-leaf allowlist
- **THEN** the protocol contract gate fails

### Requirement: Output transfer references SHALL bind expected content

Every output-transfer reference SHALL carry both `sessionId` and `rootSha256`; the consumer SHALL compare the expected root to the downloaded manifest before consuming any page.

#### Scenario: Locator root differs from manifest
- **WHEN** an output locator names a root hash different from the retrieved transfer manifest
- **THEN** consumption fails before page content is rebuilt

