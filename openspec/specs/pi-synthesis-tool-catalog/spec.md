# pi-synthesis-tool-catalog Specification

## Purpose

Expose the reviewed public Synthesis Client tools independently through the Built-in Pi Tool Gateway with canonical semantics and owner-managed delivery.

## Requirements

### Requirement: Independent complete Synthesis catalog

Both Pi Conversations and Skill Runs SHALL compose an explicit catalog of 29 public Synthesis Client tools independently of the Broker catalog. It SHALL preserve the existing search names, resolve the Client lazily and reuse canonical closed payload schemas. It SHALL NOT consume Host Bridge registry policy or expose private UI/debug operations or caller-supplied runtime paths and delivery handles.

#### Scenario: Freeze without starting Synthesis

- **WHEN** either owner freezes its tool catalog
- **THEN** all 29 reviewed tools are available without resolving the Client or starting a sidecar

### Requirement: Bounded canonical reads and safe failures

Ordinary Synthesis reads SHALL return canonical DTOs and opaque cursors within 50 KiB without truncation, automatic retries or file fallback. Structured Client errors SHALL preserve safe codes and details, mapping internal failures to `internal_error`; unknown exceptions SHALL expose no native diagnostics.

#### Scenario: Oversized ordinary read

- **WHEN** a read exceeds the model-visible bound
- **THEN** it fails with `resource_limited` and no partial result

### Requirement: Context and artifact workspace delivery

Topic context SHALL support explicit owner-managed JSON delivery. Planning context SHALL always publish managed JSON. Filtered artifact export SHALL publish an atomically committed workspace directory preserving relative paths and the original manifest, with no model-visible ZIP, download handle or staging path. File-producing tools SHALL claim the trusted owner workspace resource.

#### Scenario: Export preserves nested artifacts

- **WHEN** a filtered export contains nested artifact paths and a manifest
- **THEN** the returned directory contains those paths and manifest after complete publication

### Requirement: Maintenance submission and explicit observation

Reference refresh, Citation Graph update and metrics refresh SHALL claim `external-mutation`, require Gateway approval and submit once. Before publishing acceptance, the owner SHALL durably correlate the returned canonical operation view with the originating call and turn. Acceptance SHALL NOT imply background completion. Status SHALL be read explicitly through `synthesis.operation.get`, without polling, automatic retry or replay. Missing acknowledgement or durable evidence after possible effect SHALL remain unknown.

#### Scenario: Automatic mode without approval

- **WHEN** an automatic run lacks maintenance authorization
- **THEN** the Gateway rejects the call before Client dispatch

#### Scenario: Accepted operation

- **WHEN** submission returns a pending operation and evidence is durable
- **THEN** the tool returns that pending view immediately and performs no status polling

#### Scenario: Evidence write fails

- **WHEN** operation submission succeeds but durable evidence fails
- **THEN** the result reports unknown state and does not submit again
