## ADDED Requirements

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
