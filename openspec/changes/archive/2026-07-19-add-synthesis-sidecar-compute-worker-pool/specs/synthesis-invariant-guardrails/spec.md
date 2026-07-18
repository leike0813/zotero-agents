## ADDED Requirements

### Requirement: Worker-thread imports SHALL remain allowlisted

Synthesis static guards SHALL permit `node:worker_threads` only in designated
compute pool and worker files and SHALL continue rejecting child process,
repository, canonical-file, Host, and Zotero dependencies from the service
compute graph.

#### Scenario: Service boundary imports are inspected

- **WHEN** active service and engine imports are checked
- **THEN** worker-thread usage SHALL match the explicit allowlist
- **AND** forbidden application authority SHALL fail the guard.

### Requirement: Compute canary SHALL not change production ownership

Adding sidecar layout compute SHALL leave production DB, canonical files, all
eight engine compositions, and the public client routing in the plugin process;
`mutationEnabled` SHALL remain false and inventory SHALL remain `108 methods / 1
direct consumer`.

#### Scenario: Migration inventory is checked

- **WHEN** service migration governance is validated
- **THEN** all eight engines SHALL be present
- **AND** layout SHALL be marked as a sidecar worker canary with
  `production_worker: false`.

#### Scenario: Production composition is inspected

- **WHEN** static guards inspect `SynthesisClient` and Workbench composition
- **THEN** no production layout call SHALL target the sidecar
- **AND** no automatic in-process fallback branch SHALL have been added.
