## MODIFIED Requirements

### Requirement: Rust CLI exposes canonical Host Bridge commands

The Host Bridge CLI SHALL expose only the canonical command tree for public semantic operations.

#### Scenario: Legacy top-level command wrappers are absent

- **WHEN** users inspect or parse Host Bridge CLI commands
- **THEN** legacy top-level `task` and `skill-run` command groups SHALL NOT be accepted
- **AND** canonical `run active` and `run skill ...` commands SHALL remain available.

### Requirement: Rust CLI validates unsafe local inputs before request dispatch

The Host Bridge CLI SHALL reject clearly unsafe local object refs and file handles before sending Host Bridge requests.

#### Scenario: Unsafe object refs are rejected locally

- **WHEN** a context, mutation, annotation, or note command receives a string object ref
- **THEN** the CLI SHALL accept Zotero object keys and `libraryId:itemKey` refs
- **AND** it SHALL reject local paths, URI-like refs, and eval-like payloads.

#### Scenario: Attach-file requires an opaque file handle

- **WHEN** `mutation item attach-file` receives `--file`
- **THEN** the CLI SHALL accept only Host Bridge opaque `file-*` handles.
