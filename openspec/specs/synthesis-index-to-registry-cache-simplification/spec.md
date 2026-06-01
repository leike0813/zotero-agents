## Purpose

Reference and graph cache maintenance is decoupled from topic lifecycle and semantic index maintenance.

## Requirements

### Requirement: Cache refresh does not drive topic or semantic index work
Reference cache refresh and citation graph cache refresh SHALL NOT enqueue or start topic source-check, topic discovery, tag, concept, or topic graph work.

#### Scenario: Reference cache refresh completes
- **WHEN** reference sidecar rows or graph cache rows are refreshed
- **THEN** topic freshness, discovery hints, tag index, concept KB, and topic graph state SHALL remain unchanged
- **AND** related explicit refresh operations MAY be recommended but not started automatically.
