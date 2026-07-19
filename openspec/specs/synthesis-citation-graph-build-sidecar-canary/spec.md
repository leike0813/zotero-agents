# synthesis-citation-graph-build-sidecar-canary Specification

## Purpose
Defines the synthesis citation graph build sidecar canary capability for the Synthesis plugin, specifying its service boundary, integration contracts, and runtime behavior.

## Requirements

### Requirement: Graph build canary SHALL be authenticated and internal only

The service SHALL expose `compute.citation_graph_build` for authenticated
internal compute clients while production Citation Graph build remains on the
in-process engine.

#### Scenario: Internal canary executes
- **WHEN** an authenticated internal client submits a valid wire-bounded graph-build request
- **THEN** the service SHALL execute `citation_graph_build.v1` through the worker and return a strictly rebuilt result

#### Scenario: Production composition is inspected
- **WHEN** production Synthesis composition and public client routes are inspected
- **THEN** graph build SHALL remain in process and no sidecar retry or fallback branch SHALL exist

### Requirement: Canary SHALL not claim production-scale transport

The graph-build canary SHALL retain the existing compute wire limits and SHALL
not lower the synthesis-engine production bounds to fit those limits.

#### Scenario: Graph payload exceeds the wire envelope
- **WHEN** a request or result exceeds the existing byte or JSON-node limit
- **THEN** the call SHALL fail with the corresponding stable wire error without chunking, compression, persistence, or promotion

### Requirement: Canary SHALL preserve plugin data authority

The plugin SHALL retain ownership of graph facts, Host metadata, basis capture
and recapture, DB writes, canonical files, promotion, and last-good retention.

#### Scenario: Canary fails
- **WHEN** graph-build canary execution is rejected, canceled, timed out, or fails
- **THEN** no production graph row, cache basis, canonical file, or operation state SHALL change

### Requirement: Representative scale remains outside canary eligibility

The internal Citation Graph build canary SHALL remain limited by the existing
compute request/response byte and JSON-node bounds. Benchmark evidence SHALL NOT
route an ineligible profile, raise limits, split payloads, or change production
composition.

#### Scenario: Benchmark proves wire ineligibility
- **WHEN** a representative graph-build request or result exceeds an existing compute limit
- **THEN** the canary remains internal-only and production graph build continues through the injected in-process engine

### Requirement: Streaming canary does not alter production graph routing

The normal-scale transfer worker SHALL remain an internal explicit canary, while production full rebuild, source-slice rebuild, and related-items fallback continue to use plugin-owned composition and promotion.

#### Scenario: Production composition is constructed
- **WHEN** the default Synthesis client composition is created
- **THEN** Citation Graph Build SHALL remain injected as an in-process engine and SHALL NOT automatically invoke transfer execution

### Requirement: Graph-build transfer SHALL be an authenticated staging canary

The repository SHALL exercise begin, paged input, seal, internal paged output publication, and paged output reads through the real authenticated sidecar HTTP boundary without routing production graph build through the transfer.

#### Scenario: Staging canary succeeds
- **WHEN** a strict graph-build fixture is split into multiple input and output pages
- **THEN** the service stages and returns those pages with manifest and direct-engine oracle parity while the compute worker remains lazy

#### Scenario: Production build runs
- **WHEN** production refresh or rebuild executes during this change
- **THEN** plugin composition still captures Host facts, computes in process, recaptures basis, and promotes through the repository

### Requirement: Transfer canary SHALL cover payloads beyond one compute body

The staging canary SHALL prove that aggregate input can exceed the 8 MiB compute body limit while each action remains within its independent page and HTTP bounds.

#### Scenario: Aggregate input exceeds 8 MiB
- **WHEN** a generated fixture is uploaded over at least three bounded pages
- **THEN** input seal succeeds without changing the monolithic compute wire limit
