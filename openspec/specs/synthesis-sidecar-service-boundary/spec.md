# synthesis-sidecar-service-boundary Specification

## Purpose
Defines the boundary between the Zotero plugin and the Rust Synthesis sidecar service, fixing the production owner and the service's plugin-isolation rules for shadow-only R8 candidates. The post-cutover owner transfer rule is added separately by the cut-over change.
## Requirements
### Requirement: Native delivery SHALL not change the production owner

Manifest v2, native installation, and native lifecycle integration SHALL use
isolated shadow roots while the existing plugin production owner remains
authoritative.

#### Scenario: R8 candidate runs
- **WHEN** the plugin integrates with a native v2 candidate
- **THEN** no production database, canonical tree, Host mutation, or public mutation capability SHALL be owned or modified by the candidate
- **AND** failure SHALL not fall back to a Node runtime

### Requirement: R9 cutover SHALL transfer the production owner exactly once

R8 native installation SHALL remain shadow-only until the explicit R9 cutover protocol succeeds. After a completed receipt, the Rust service SHALL be the only production database and canonical-tree owner; the plugin SHALL retain only typed client, lifecycle, UI bridge, proxy, and bounded Host-adapter responsibilities.

#### Scenario: R8 candidate runs before cutover
- **WHEN** a native v2 candidate has no completed production receipt
- **THEN** it remains mutation-disabled in isolated roots

#### Scenario: R9 production owner runs
- **WHEN** the cutover receipt and owner lock identify the current native instance
- **THEN** the plugin cannot open or write production DB/canonical roots
- **AND** the service cannot directly access Zotero DB or plugin internals

### Requirement: Service diagnostics SHALL use the internal debug wire only

The sidecar request envelope MAY contain v2 trace context only in debug mode.
Rust SHALL reject invalid or unknown trace-context fields and SHALL return
production failures through the existing RPC result and process state.

#### Scenario: Trace context is absent
- **WHEN** debug mode is disabled
- **THEN** the request bytes remain free of observation fields

