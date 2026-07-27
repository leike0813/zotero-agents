## ADDED Requirements

### Requirement: Readonly harness SHALL NOT construct a Synthesis owner

The readonly UI harness SHALL build Synthesis surfaces through dedicated
readonly snapshot/query adapters and, where the reused UI requires it, the
neutral grouped client over a bounded readonly fake port. It MUST NOT import or
construct a legacy composition, production service/repository owner, canonical
writer, native mutation client, reverse-Host effect port, or implementation
selector.

#### Scenario: Harness reads Synthesis surfaces
- **WHEN** the local harness renders Workbench chrome, Topics, Index, Tags, Concepts, Review, or Graph data
- **THEN** it reads stable readonly snapshots through bounded query/projection adapters
- **AND** it acquires no production owner lock or write-capable port

#### Scenario: Harness receives a mutation command
- **WHEN** the reused UI requests a Synthesis write or unsupported owner operation
- **THEN** the harness records the existing mock/blocked action and returns an explicit bounded result
- **AND** it does not start a native production owner or recreate the deleted plugin owner

#### Scenario: Harness dependency graph is checked
- **WHEN** static boundary validation scans harness imports and dynamic imports
- **THEN** no legacy owner factory, production root opener, WebDAV credential adapter, or Host effect implementation is reachable

