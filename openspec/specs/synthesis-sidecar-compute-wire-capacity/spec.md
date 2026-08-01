# synthesis-sidecar-compute-wire-capacity Specification

## Purpose

Defines the independent byte, JSON-structure, and paged-transfer capacity boundaries for Synthesis sidecar compute traffic.

## Requirements

### Requirement: Paged transfer capacity SHALL remain separate from monolithic compute envelopes

The 8 MiB direct compute HTTP envelope SHALL remain unchanged, while transfer actions SHALL carry at most one bounded page and aggregate transfer capacity SHALL be governed by transfer storage limits.

#### Scenario: Transfer exceeds direct compute size
- **WHEN** a valid paged graph transfer totals more than 8 MiB
- **THEN** it SHALL proceed through bounded transfer actions and worker frames
- **AND** the service SHALL NOT assemble or route it through the direct compute HTTP envelope

#### Scenario: Individual transfer page exceeds its bound
- **WHEN** one transfer page exceeds 4 MiB
- **THEN** it SHALL fail before worker admission or disk publication

### Requirement: Direct compute SHALL use capability-specific structural limits

Direct compute SHALL retain the 8 MiB request and response byte envelopes while accepting at most 1,000,000 request JSON nodes and 200,000 response JSON nodes. General and system calls SHALL retain the independent 50,000-node structural limit.

#### Scenario: A compact large layout crosses the general JSON-node limit
- **WHEN** `compute.citation_graph_layout` stays within 8 MiB and the 1,000,000-node compute request limit
- **THEN** native HTTP admission SHALL NOT reject it under the 50,000-node general-call limit
- **AND** the successful response SHALL remain within 8 MiB and 200,000 JSON nodes.

#### Scenario: Count-valid layout exceeds the byte envelope
- **WHEN** long bounded strings make an otherwise count-valid layout request exceed 8 MiB
- **THEN** transport SHALL fail without truncation, compression, retry, or local fallback.
