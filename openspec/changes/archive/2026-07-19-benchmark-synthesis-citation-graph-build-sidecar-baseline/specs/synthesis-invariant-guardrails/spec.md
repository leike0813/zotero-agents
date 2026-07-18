## ADDED Requirements

### Requirement: Benchmark adds no production authority
The Citation Graph build benchmark SHALL NOT add a public `SynthesisClient`
method, production route, runtime capability, worker operation, persistence,
Host access, canonical-file access, Zotero global access, or child-process
authority to the sidecar runtime.

#### Scenario: Boundary inventory is checked
- **WHEN** benchmark implementation and documentation are complete
- **THEN** the inventory remains 108 methods and one direct consumer, `mutationEnabled` remains false, and graph build remains an in-process production engine with an internal worker canary
