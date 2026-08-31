## MODIFIED Requirements

### Requirement: Citation and Reference orchestration SHALL have environment-neutral typed owners
The application package SHALL own private typed Citation Graph orchestration and one grouped Reference application interface for read projection, refresh, matching/review, canonical mutation, and quiesce. Reference Refresh, Reference Matching/Review, and Canonical Reference Mutation SHALL remain independently verifiable internal use cases. These owners SHALL enforce strict bounded reads, lifecycle admission, durable-write checkpoints, and result projection without Node, Zotero, Host, UI, service, or production persistence imports.

#### Scenario: Private compositions share application behavior
- **WHEN** Node-oracle and Rust-candidate compositions execute equivalent fixture inputs
- **THEN** each uses its own typed application owner and equivalent observable behavior
- **AND** no production route or fallback is introduced.

#### Scenario: Runtime invokes a Reference operation
- **WHEN** a runtime route requests a Reference read, refresh, matching/review, or Canonical Reference mutation
- **THEN** it invokes the grouped Reference application interface with typed semantic input
- **AND** the runtime performs only wire translation, lifecycle ownership, and dependency adaptation.
