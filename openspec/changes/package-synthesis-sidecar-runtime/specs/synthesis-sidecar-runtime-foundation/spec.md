## ADDED Requirements

### Requirement: The isolated service has a packageable JavaScript artifact

The Synthesis service build SHALL expose a deterministic packageable JavaScript
tree without changing its isolation or mutation-disabled behavior.

#### Scenario: Runtime packaging builds the service

- **WHEN** the runtime packaging pipeline builds the current service sources
- **THEN** the generated entrypoint SHALL run with the product-owned Node
  executable
- **AND** it SHALL not require `tsx`, npm resolution, plugin globals, production
  repositories, canonical files, or compute engines.
