## MODIFIED Requirements

### Requirement: Workflow Host SHALL expose one exact v12 surface

The Workflow Host SHALL expose one exact v12 surface composed from explicit
Broker, managed-artifact, file, resource, and grouped Synthesis projections. It
SHALL expose no raw note objects, handler aggregate, storage wrappers,
filesystem adapter, legacy artifact aliases, migration control, or navigation
projection. Managed artifact members SHALL be named semantic operations with
closed DTOs and stable error contracts.

#### Scenario: Interactive projection is inspected
- **WHEN** a workflow receives the v12 host projection
- **THEN** it SHALL expose only the approved v12 members
- **AND** the projection SHALL not expose navigation, raw `Zotero.Item`, handlers, native paths, or legacy payload readers.

#### Scenario: Removed navigation member is called
- **WHEN** a workflow probes for `hostApi.navigation` or a legacy open member
- **THEN** the member SHALL be absent
- **AND** the caller SHALL receive a deterministic capability/contract failure rather than an implicit fallback.

#### Scenario: Undeclared member is exposed
- **WHEN** a caller probes for an undeclared handler, navigation, migration, or legacy artifact member
- **THEN** the member SHALL be absent
- **AND** the caller SHALL receive a deterministic capability/contract failure rather than an implicit fallback.

### Requirement: V12 activation SHALL be a hard compatibility cut

The v12 surface SHALL NOT contain `items`, `prefs`, `parents`, generic `tags`,
generic `collections`, `command`, legacy `literature`, optional `resources`,
optional `synthesis`, flat Synthesis aliases, `items.getAll`, v11 operation
aliases, or Workflow Host navigation. No v2-v11 fallback or compatibility
adapter SHALL be installed.

#### Scenario: Official package is scanned after activation
- **WHEN** governance scans official Workflow packages
- **THEN** no package references navigation or a removed legacy host member
- **AND** no legacy host-version branch is accepted.

#### Scenario: Removed member is called by a migrated package
- **WHEN** governance scans official Workflow packages after activation
- **THEN** no package references a removed member or includes a legacy host-version branch.

#### Scenario: Unknown old mutation name is submitted
- **WHEN** a caller submits a removed handler-shaped operation name
- **THEN** the v12 owner returns `unsupported_operation` rather than mapping it to a compatibility alias.

#### Scenario: Removed navigation member is submitted
- **WHEN** a caller submits a removed Workflow navigation member
- **THEN** the v12 owner returns a deterministic unsupported or contract failure
- **AND** it does not route the request to a Host Bridge navigation capability.
