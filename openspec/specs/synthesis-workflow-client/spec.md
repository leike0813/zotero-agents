# synthesis-workflow-client Specification

## Purpose
Defines the synthesis workflow client capability for the Synthesis plugin, specifying its service boundary, integration contracts, and runtime behavior.
## Requirements
### Requirement: Workflow Synthesis exposure is narrow

`WorkflowHostApi.synthesis` SHALL expose only the fourteen declared workflow methods and SHALL NOT expose the full `SynthesisService` or `SynthesisClient`.

#### Scenario: Workflow host is created

- **WHEN** the plugin creates a workflow host API
- **THEN** its Synthesis facade contains the declared apply, Topic report, paper artifact, Tag Vocabulary, staging, and audit methods
- **AND** unrelated repository, Workbench, debug, sync, and lifecycle methods are absent

### Requirement: Workflow methods route through grouped client capabilities

The workflow facade SHALL lazily resolve `SynthesisClient` and route each method to its domain capability without importing the legacy service.

#### Scenario: Workflow command executes
- **WHEN** a workflow invokes a Synthesis facade method
- **THEN** the corresponding grouped client method SHALL receive the request
- **AND** the observable result SHALL be returned unchanged except for the existing bounded invalidation side effect

#### Scenario: Direct legacy consumers are checked
- **WHEN** the boundary checker scans production sources
- **THEN** workflow host and workflow types SHALL be absent from the direct legacy consumer inventory
- **AND** the total direct consumer count SHALL be five

### Requirement: Digest apply receives a JSON-safe item snapshot

Workflow packages SHALL project parent item details into a flat environment-neutral item snapshot before invoking the closed v12 facade. The Host client SHALL receive the declared snapshot DTO without a live item or nested parentItem value.

#### Scenario: Digest workflow passes a parent item

- **WHEN** a workflow has a RegularItemDetailDto for its parent item
- **THEN** the package submits bounded identity, bibliographic, tag, collection, and identifier fields in the flat snapshot
- **AND** the request contains no live item, parentItem wrapper or callable member

### Requirement: Topic apply materializes controlled assets

Workflow packages SHALL resolve Topic apply run-workspace files before invoking the v12 facade and replace local locators with deterministic controlled asset identifiers. The Host client SHALL receive only bundle/assets and optional call control.

#### Scenario: Relative bundle paths are submitted

- **WHEN** Topic apply references relative files through a bundle reader
- **THEN** the package reads those files, rewrites bundle/manifest locators to controlled asset IDs, and submits JSON-safe asset texts

#### Scenario: ACP absolute paths are submitted

- **WHEN** result context resolves absolute ACP artifact paths
- **THEN** those paths are consumed only by the package materializer
- **AND** no absolute path appears in the Host facade request

#### Scenario: Asset input is invalid or unbounded

- **WHEN** an asset is missing, a manifest is invalid, the count exceeds 256, one asset exceeds 5 MiB, or aggregate text exceeds 50 MiB
- **THEN** the call fails with stable invalid_request details before any Synthesis mutation

### Requirement: Workflow contracts are environment-neutral

Workflow client DTOs SHALL be package-owned, JSON-safe, bounded where collections or assets cross the boundary, and free of repository rows, absolute paths, host objects, functions, and legacy service-derived types.

#### Scenario: Contract boundary is checked
- **WHEN** contract and boundary checks run
- **THEN** forbidden imports and non-environment-neutral workflow shapes SHALL fail validation

### Requirement: Active documentation describes the narrow current API

Current workflow API documentation SHALL identify `WorkflowSynthesisApi`, list the supported methods, and state that the default implementation uses the native production `SynthesisClient`.

#### Scenario: Workflow API docs are generated
- **WHEN** documentation consistency checks run
- **THEN** active source and generated workflow host documentation SHALL no longer advertise `SynthesisService` or an in-process default

### Requirement: Native workflow routing SHALL preserve controlled Host boundaries

Workflow Topic assets SHALL still be materialized by the plugin before the client boundary, and native workflow applications SHALL use only declared reverse-Host ports for Zotero, delivery, or WebDAV effects.

#### Scenario: Workflow mutation executes after cutover
- **WHEN** a workflow invokes a grouped Synthesis mutation
- **THEN** the request crosses the typed native client boundary
- **AND** any Host effect returns through its preconditioned receipt contract

### Requirement: Workflow Synthesis client SHALL expose fourteen explicit members
The client adapter SHALL explicitly project `workflowApply.applyLiteratureDigest`, `workflowApply.applyTopicPlan`, `workflowApply.applyTopicSynthesisResult`, `topics.getReport`, `artifacts.readPaperArtifacts`, and the nine declared `tags` members. Adding a client or sidecar method MUST NOT widen this projection.

#### Scenario: Native client gains a method
- **WHEN** the canonical Synthesis client adds an unrelated command
- **THEN** Workflow conformance remains unchanged until an explicit contract change names the member

### Requirement: Workflow Synthesis calls SHALL preserve invocation-late dependencies
A cached Workflow Host composition MAY capture adapter functions but SHALL resolve the current default Synthesis client, current Host-effect ports, and trusted audit execution identity for every call. It MUST NOT retain a stale client, repository, runtime global, package identity, or content identity. Audit begin SHALL fail closed if trusted identity is unavailable.

#### Scenario: Default client changes between calls
- **WHEN** two calls use the same Workflow projection after the default client is replaced
- **THEN** the second call uses the current client and preserves the same public contract

#### Scenario: Audit identity is unavailable
- **WHEN** a caller invokes `withAuditRun` without an invocation-bound trusted execution identity
- **THEN** the adapter rejects before creating a native run

### Requirement: Reverse Host effects SHALL use existing typed ports
Native Synthesis operations that require library reads, tag effects, related-item effects, artifact reads, or export delivery SHALL use the existing typed Host ports. The Workflow facade MUST NOT become a reverse transport or authorization source.

#### Scenario: Tag promotion requests a Host effect
- **WHEN** the native application needs a Zotero tag mutation
- **THEN** it invokes the canonical typed Host-effect port and returns typed evidence through the Synthesis result

### Requirement: Workflow producers SHALL submit the closed v12 DTO

Workflow packages SHALL convert their result artifacts and item detail DTOs into the declared v12 request before invoking Synthesis. Topic files SHALL become controlled assets. Digest input SHALL contain a flat item snapshot. Control SHALL retain its declared parameter and SHALL NOT carry artifact readers.

#### Scenario: Topic synthesis output is applied

- **WHEN** create or update output references nested manifests and section files
- **THEN** the real workflow hook submits bundle and bounded assets through Host and native client
- **AND** the result persists and remains readable after reopen without local paths crossing the client interface

#### Scenario: Literature analysis or import is applied

- **WHEN** a workflow has a regular item detail and available artifacts
- **THEN** the request preserves its portable identity and bibliographic facts in a flat snapshot
- **AND** absent optional fields are omitted

### Requirement: Workflow failures SHALL retain stable diagnostics and retry eligibility

Contract errors SHALL be permanent failures with a bounded safe field location. Diagnostic logs SHALL retain capability, stage and schema violations without request contents or local paths. A failed sidecar apply SHALL preserve successful note writes and use the Host error contract for retry eligibility.

#### Scenario: A nested resolver is invalid

- **WHEN** validation rejects its shape before RPC
- **THEN** the error identifies the safe resolver field and is not marked retryable
- **AND** diagnostics contain no original resolver values
