# Spec Delta

## ADDED Requirements

### Requirement: Host Bridge SHALL project semantic evidence reads

Host Bridge SHALL publish `synthesis.search_semantic_evidence` and `synthesis.read_semantic_context` as bounded read-only capabilities with shared Synthesis contracts and MCP mirroring. CLI SHALL expose the two operations under `synthesis evidence`.

#### Scenario: An agent answers a question from its library

- **WHEN** it calls a semantic evidence operation
- **THEN** it receives source excerpts with stable provenance and explicit coverage or failure information. Existing Host Bridge authorization applies.
