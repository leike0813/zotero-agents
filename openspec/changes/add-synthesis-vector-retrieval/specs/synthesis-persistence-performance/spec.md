# Spec Delta

## ADDED Requirements

### Requirement: Retrieval storage SHALL remain local and rebuildable

Original vectors, source locations and publication state SHALL be local derived facts in the existing Repository. Rebuildable acceleration SHALL not be correctness authority. These facts SHALL be excluded from ordinary Git/WebDAV durable bundles; restored or incompatible publication bases SHALL be verified before queries.

#### Scenario: Durable bundle is exported

- **WHEN** Topic facts are exported or synchronized
- **THEN** local vectors, unfinished staging and acceleration are absent from that bundle

### Requirement: Retrieval capacity SHALL be reported from measured workloads

Validation SHALL distinguish 2k, 10k and 25k independent-paper workloads, actual bytes/fragments/dimensions, candidate coverage, query-only and end-to-end latency, and resource peaks. Research cutoffs SHALL not become production defaults without evidence. Unknown cold-cache/device/quality conditions SHALL remain unverified.

#### Scenario: A query performance result is reported

- **WHEN** retrieval latency is measured
- **THEN** it identifies scope, concurrency, model, dimensions, cache/storage conditions and embedding cost separately; query-ready p95 is compared with 1-second target and 2.5-second minimum requirement
