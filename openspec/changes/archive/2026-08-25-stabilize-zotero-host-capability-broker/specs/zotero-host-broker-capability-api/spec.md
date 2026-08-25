## MODIFIED Requirements

### Requirement: JSON-safe broker read API

The system SHALL expose context, library, and metadata capabilities through the canonical Zotero Host Capability Broker. Public broker inputs, successful DTOs, and structured error details SHALL contain only null, booleans, strings, finite numbers, arrays, and plain objects recursively. They SHALL NOT contain undefined properties, non-finite numbers, bigint, symbols, functions, dates, maps, sets, cyclic structures, or Zotero runtime objects.

#### Scenario: Current view DTO

- **WHEN** a caller requests the current view or selected items
- **THEN** the result SHALL describe the current Zotero target, library, selection state, item summaries, and optional collection using strict JSON values
- **AND** collection membership and collection identifiers SHALL be normalized to bounded scalar values.

#### Scenario: Library item DTOs

- **WHEN** a caller lists, searches, or reads Zotero items, notes, payloads, annotations, or attachments
- **THEN** every returned DTO SHALL be constructed from explicitly normalized fields
- **AND** raw Zotero objects SHALL NOT be returned
- **AND** unknown payload values SHALL be rejected rather than silently coerced or dropped.

#### Scenario: Metadata translate identifier DTO

- **WHEN** a caller translates a DOI, ISBN, arXiv identifier, or PMID
- **THEN** successful and diagnostic results SHALL contain strict JSON values
- **AND** all numeric values SHALL be finite
- **AND** translator runtime objects SHALL NOT be returned.

### Requirement: Controlled mutation command API

The canonical broker SHALL expose limited Zotero write operations through mutation preview and execute operations. The broker SHALL validate and perform these operations without owning caller authorization; each exposed adapter SHALL enforce its declared permission policy before execution.

#### Scenario: Preview validates without writing

- **WHEN** a supported mutation request is previewed
- **THEN** the broker SHALL validate references and inputs, return a strict JSON summary, and mark confirmation as required
- **AND** Zotero data SHALL NOT be changed.

#### Scenario: Execute delegates to handlers

- **WHEN** an adapter has authorized a supported mutation and invokes execute
- **THEN** the broker SHALL reuse the canonical mutation implementation
- **AND** the result SHALL contain strict JSON changed-object summaries.

#### Scenario: Literature ingest uses canonical operation

- **WHEN** a literature ingest mutation is passed to preview or execute
- **THEN** the canonical operation SHALL be `literature.ingest`
- **AND** successful preview and execute responses SHALL report `operation: "literature.ingest"`.

#### Scenario: Legacy and batch literature ingest inputs are rejected

- **WHEN** a mutation request uses `operation: "paper.ingest"` or passes a `papers` batch payload to `operation: "literature.ingest"`
- **THEN** the broker SHALL reject the mutation with a structured JSON-safe error
- **AND** Zotero data SHALL NOT be changed.

#### Scenario: Unsupported or invalid mutation

- **WHEN** a mutation has an unsupported operation, invalid reference, invalid field, empty payload, or oversized input
- **THEN** the broker SHALL reject it with a structured JSON-safe error
- **AND** Zotero data SHALL NOT be changed.

## ADDED Requirements

### Requirement: Broker references are portable

The canonical broker SHALL accept only portable JSON item and collection references. Workflow compatibility code MAY accept raw Zotero objects only when it normalizes them before calling the broker.

#### Scenario: Workflow passes a raw item

- **WHEN** a v11 workflow host method receives a resolvable raw Zotero item
- **THEN** the workflow adapter SHALL derive a portable reference before invoking the broker
- **AND** downstream Host Bridge and MCP adapters SHALL never receive the raw item.

### Requirement: Navigation is separate from context queries

The broker SHALL expose Zotero UI selection and focus effects through a navigation capability family separate from context queries.

#### Scenario: Caller reads context

- **WHEN** a caller requests current view or selected items
- **THEN** no navigation or focus effect SHALL occur.

#### Scenario: Adapter invokes navigation

- **WHEN** an authorized and exposed adapter invokes a navigation operation
- **THEN** the broker SHALL return a JSON-safe navigation result
- **AND** interaction and exposure policy SHALL remain owned by the adapter.

### Requirement: Broker failures use stable codes and safe details

Broker failures that cross an adapter seam SHALL provide a stable canonical error code, retryability, and optional strict JSON details without retaining raw references or host objects.

#### Scenario: Referenced item is missing

- **WHEN** a broker operation cannot resolve an item reference
- **THEN** the failure SHALL use the canonical item-not-found code
- **AND** adapters MAY map that code to their existing external protocol code
- **AND** public details SHALL NOT contain the original raw host object.
