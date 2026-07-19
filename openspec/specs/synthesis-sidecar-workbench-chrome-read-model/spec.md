# synthesis-sidecar-workbench-chrome-read-model Specification

## Purpose
Defines the synthesis sidecar workbench chrome read model capability for the Synthesis plugin, specifying its service boundary, integration contracts, and runtime behavior.

## Requirements

### Requirement: Operational chrome DTOs are strict and bounded


The system SHALL define one strict operational chrome request/result contract. The result SHALL contain only fixed cache-readiness descriptors and bounded background-job projections and MUST reject unknown, malformed, non-JSON, or over-limit structures.

#### Scenario: A valid result crosses process boundaries

- **WHEN** the application produces operational chrome and the client receives it
- **THEN** the service main process and client SHALL independently rebuild the result
- **AND** fixed cache ordering, deterministic job ordering, row bounds, and progress bounds SHALL be preserved.

#### Scenario: A result exposes internal repository details

- **WHEN** a result contains paths, repository identity, raw diagnostics JSON, source hashes, or unknown fields
- **THEN** strict rebuilding SHALL reject it.

### Requirement: Sidecar exposes an authenticated Workbench chrome canary


The sidecar SHALL advertise and serve `workbench.chrome.read` as a general authenticated capability over the existing call endpoint. It SHALL read only the isolated repository and SHALL NOT use the compute worker pool or access production storage, canonical files, Zotero, or Host capabilities.

#### Scenario: Authorized caller reads chrome

- **WHEN** a caller presents the correct client token, profile identity, protocol, and strict request
- **THEN** the sidecar SHALL return the operational projection from its isolated repository.

#### Scenario: Unauthorized or malformed caller reads chrome

- **WHEN** authentication, profile, protocol, payload, or capability validation fails
- **THEN** the sidecar SHALL reject the request using stable structured errors without reading production state.

### Requirement: Internal Workbench client is bounded and production-disconnected


The system SHALL provide an internal Workbench canary client with service-instance validation, AbortSignal support, a default one-second deadline, and strict request/result rebuilding. Production `SynthesisClient`, Workbench host, and legacy composition MUST NOT import or invoke it.

#### Scenario: Client transport is canceled or unavailable

- **WHEN** a call is aborted, exceeds its deadline, receives an invalid response, or cannot reach the service
- **THEN** the client SHALL fail with `request_canceled`, `request_timeout`, `response_invalid`, or `service_unavailable` respectively
- **AND** it SHALL NOT retry or fall back to plugin execution.

### Requirement: Control plane remains responsive


Operational chrome reads SHALL use fixed indexed queries, retain the general-call wire limits, and preserve health, handshake, compute, and shutdown responsiveness.

#### Scenario: Chrome and compute requests overlap

- **WHEN** the compute worker is busy and an operational chrome request arrives
- **THEN** the chrome request SHALL not enter the worker queue
- **AND** health, handshake, and authenticated shutdown SHALL remain responsive.
