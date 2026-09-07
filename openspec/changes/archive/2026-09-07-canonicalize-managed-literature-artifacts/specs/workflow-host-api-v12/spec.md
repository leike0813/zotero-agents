## MODIFIED Requirements

### Requirement: Workflow Host SHALL expose one exact v12 surface

The Workflow Host SHALL expose one exact v12 surface composed from explicit Broker, managed-artifact, file, resource, and grouped Synthesis projections. It SHALL expose no raw note objects, handler aggregate, storage wrappers, filesystem adapter, legacy artifact aliases, or migration control. Managed artifact members SHALL be named semantic operations with closed DTOs and stable error contracts.

#### Scenario: Interactive projection is inspected
- **WHEN** a workflow receives the v12 host projection
- **THEN** it SHALL expose only the approved v12 members, including the managed semantic operations required by its contract
- **AND** the projection SHALL not expose raw `Zotero.Item`, handlers, native paths, or legacy payload readers.

#### Scenario: Undeclared member is exposed
- **WHEN** a caller probes for an undeclared handler, navigation, migration, or legacy artifact member
- **THEN** the member SHALL be absent
- **AND** the caller SHALL receive a deterministic capability/contract failure rather than an implicit fallback.

### Requirement: Workflow Host SHALL be a closed composition root

Host composition SHALL project named owner members through explicit readonly object literals and deny adapters. It MUST NOT use spread, proxy, dynamic capability catalogs, whole-domain aliases, or runtime discovery to define public identity. Domain implementation, validation, adapter selection, repository state, authorization, and transport remain with their named owners. Managed artifact operations SHALL be explicit members and SHALL not expose Broker records, repository state, operation plans, attachment paths, or raw native host objects.

#### Scenario: Owner implementation is replaced
- **WHEN** an internal owner uses a different private implementation with the same interface
- **THEN** Workflow Host identity and callers remain unchanged

#### Scenario: Broker gains an internal managed-artifact helper
- **WHEN** the Broker adds an internal reader, converter, or migration seam
- **THEN** the Workflow Host projection SHALL remain unchanged unless a v12 member is explicitly approved
- **AND** the helper SHALL not become a package-visible capability through spread, proxy, or implicit inheritance.

#### Scenario: Workflow writes a paired artifact
- **WHEN** a workflow submits References and Citation content through the approved v12 surface
- **THEN** the Host SHALL route it to one trusted parent-set semantic writer
- **AND** the workflow SHALL observe one typed result rather than repository records or per-note internal receipts.

## ADDED Requirements

### Requirement: Workflow Host managed-artifact DTOs SHALL be strict and identity-aware

Workflow Host managed-artifact inputs and outputs SHALL contain only strict JSON values from the versioned contract set. They SHALL preserve explicit opaque sourceReferenceId values when the workflow intentionally retains a source row, allocate no identity from content, and expose computed References basis and Citation staleness as runtime facts rather than caller-controlled fields.

#### Scenario: Workflow passes a valid canonical artifact
- **WHEN** a workflow supplies a closed Source Reference/Citation artifact through v12
- **THEN** the Host SHALL validate it and return the normalized typed result
- **AND** unknown fields, aliases, raw IDs, paths, and native objects SHALL be rejected.

#### Scenario: Workflow supplies a caller-computed basis
- **WHEN** a workflow includes a caller-supplied References basis or stale flag as write authority
- **THEN** the Host SHALL reject or ignore that authority
- **AND** it SHALL compute the basis and stale projection from the complete canonical set.

### Requirement: Migration controls SHALL remain outside Workflow Host v12

Library migration scan, preview, apply, stop, continue, history, and legacy parsing SHALL remain Dashboard-local. Workflow Host SHALL not expose a generic migration command, legacy artifact parser, migration plan, candidate mapping, or durable migration receipt.

#### Scenario: A workflow requests library migration
- **WHEN** a workflow attempts to scan or apply legacy artifacts
- **THEN** the v12 surface SHALL return an unsupported-capability result
- **AND** it SHALL not inspect, mutate, or reserve a library migration run.

#### Scenario: A workflow imports a recognized legacy bundle
- **WHEN** a workflow uses the normal bundle importer on recognized legacy artifacts
- **THEN** the importer SHALL return the explicit migration-required result
- **AND** the approved offline Import UI private converter MAY continue after explicit confirmation
- **AND** no public Workflow Host migration lifecycle or generic migration command SHALL be exposed.
