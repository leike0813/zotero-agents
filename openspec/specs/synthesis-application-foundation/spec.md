## ADDED Requirements

### Requirement: Citation and Reference orchestration SHALL have environment-neutral typed owners
The application package SHALL own private typed Citation Graph, Reference Refresh, and Reference Matching/Review orchestration, strict bounded reads, lifecycle admission, and result projection without Node, Zotero, Host, UI, service, or production persistence imports.

#### Scenario: Private compositions share application behavior
- **WHEN** Node-oracle and Rust-candidate compositions execute equivalent fixture inputs
- **THEN** each uses its own typed application owner and equivalent observable behavior
- **AND** no production route or fallback is introduced.
