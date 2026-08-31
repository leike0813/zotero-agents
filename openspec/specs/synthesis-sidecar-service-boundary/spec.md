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

### Requirement: Rust SHALL be the sole production application owner

The Rust service SHALL be the only production database, canonical-tree,
application, and compute owner. The plugin SHALL contain only typed client,
lifecycle, UI bridge, proxy, runtime supervision, and bounded Host-adapter
responsibilities and MUST NOT retain a constructible legacy owner.

#### Scenario: Production sidecar runs
- **WHEN** the current XPI sidecar holds the production OS lock
- **THEN** the plugin cannot open or write production DB/canonical roots through an application owner
- **AND** the service cannot directly access Zotero DB, credentials, UI objects, or plugin internals

#### Scenario: Post-cutover plugin inventory is checked
- **WHEN** plugin source and build outputs are inspected after legacy retirement
- **THEN** no plugin service/repository/application composition capable of production ownership remains
- **AND** bounded reverse-Host and UI responsibilities remain available

### Requirement: Service diagnostics SHALL use the internal debug wire only

The sidecar request envelope MAY contain v2 trace context only in debug mode.
Rust SHALL reject invalid or unknown trace-context fields and SHALL return
production failures through the existing RPC result and process state.

#### Scenario: Trace context is absent
- **WHEN** debug mode is disabled
- **THEN** the request bytes remain free of observation fields

### Requirement: Rust executable SHALL be the sole Synthesis service implementation after R9b

After R9b, the repository and product build SHALL contain no Node or plugin-side
Synthesis service implementation. The Rust executable SHALL own all Synthesis
production application, repository, canonical, compute-worker, lifecycle, and
RPC service responsibilities. The plugin SHALL retain the public client, UI,
lifecycle supervision, and bounded Zotero/Host adapters, and Rust MUST NOT gain
direct access to Zotero DB, credentials, UI objects, or unbounded Host
authority.

#### Scenario: Final service inventory is inspected
- **WHEN** source, workspace, build, package, workflow, and XPI inventories run after R9b
- **THEN** exactly one Synthesis service implementation class remains: `rust-native`
- **AND** plugin-owned Host/UI authority remains outside the service

#### Scenario: Native service is unavailable
- **WHEN** the sole Rust service cannot reach verified production readiness
- **THEN** Synthesis callers fail through stable maintenance/unavailable/incompatible/repair-required behavior
- **AND** no deleted Node or plugin service is reconstructed

