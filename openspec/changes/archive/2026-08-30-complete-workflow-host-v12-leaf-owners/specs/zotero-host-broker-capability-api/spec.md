## MODIFIED Requirements

### Requirement: Workflow Host API executes ordered text export translators

The staged bibliography API SHALL list stable Host-issued format refs with current availability and SHALL render portable regular-item refs using the caller's ordered, non-empty format preference. The Host MUST select only the first available declared format, report the actual format and derived fallback status, validate strict-JSON options against that format's schema, preserve input item order, and return complete bounded content without exposing translator objects or native identities. The active v11 text-export adapter MAY delegate to the same renderer until atomic activation.

#### Scenario: Preferred translator succeeds
- **WHEN** bibliography render receives valid portable regular-item refs and the first requested format is available
- **THEN** the Host returns complete content, the actual stable format DTO, `fallbackUsed: false`, and no fallback issue
- **AND** item order is preserved

#### Scenario: Host advances to fallback translator
- **WHEN** an earlier requested format is unavailable and a later requested format is available
- **THEN** the Host uses the later format, reports `fallbackUsed: true`, and returns the closed fallback issue
- **AND** it does not insert an undeclared fallback

#### Scenario: Every candidate fails
- **WHEN** none of the caller-declared formats is currently available
- **THEN** rendering fails with stable `unavailable` data for `bibliography_format`
- **AND** it does not return partial content or native translator diagnostics

#### Scenario: Render request is not safely bounded
- **WHEN** a request contains duplicates, a non-regular or missing item, more than 10,000 refs, invalid format options, or output larger than 64 MiB
- **THEN** the entire render fails with the applicable stable validation or resource error
- **AND** no partial bibliography is returned

#### Scenario: Workflow remains decoupled from plugin-private interfaces
- **WHEN** a workflow prefers a format supplied by an optional extension
- **THEN** it uses the stable format ref and availability contract
- **AND** it does not require extension globals, add-on-manager lookup, localhost RPC, translator UUIDs, or numeric native constants

## ADDED Requirements

### Requirement: Prepared-image contract SHALL be bounded and run-scoped
Image preparation SHALL validate encoded and decoded source size, MIME declaration and signature, dimensions, options, and output before unbounded decode or registry admission. One input MUST NOT exceed 32 MiB decoded, `maxLongEdge` MUST NOT exceed 8,192 pixels, `hardMaxBytes` MUST NOT exceed 8 MiB, `targetBytes` MUST NOT exceed `hardMaxBytes`, and one workflow run MUST NOT retain more than 64 MiB of live prepared images.

#### Scenario: Prepared image is reused within one run
- **WHEN** the same valid prepared-image ref is bound to multiple note operations in its owning run
- **THEN** each operation may resolve the same immutable prepared content
- **AND** operation replay does not create duplicate Zotero attachments

#### Scenario: Workflow run terminates
- **WHEN** a workflow run reaches any terminal outcome
- **THEN** all prepared-image resources owned by that run are cleaned automatically
- **AND** callers are not required to release refs manually

#### Scenario: Image request exceeds a bound
- **WHEN** source size, dimensions, options, output bytes, or live per-run bytes exceed a declared hard limit
- **THEN** preparation fails with `resource_limited` before admitting the result
- **AND** no partial registry entry remains
