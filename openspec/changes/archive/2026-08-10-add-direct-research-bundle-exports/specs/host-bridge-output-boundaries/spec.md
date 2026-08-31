## ADDED Requirements

### Requirement: Direct research bundles SHALL use safe file-delivery boundaries

Direct research-bundle commands SHALL stage all files beneath a controlled root, reject unsafe or colliding relative paths, avoid overwriting local content, and publish remote bytes only through an opaque broker-issued file Handle. Large source files and archive downloads SHALL be processed incrementally in the Zotero runtime rather than requiring the complete aggregate archive in memory.

#### Scenario: Remote archive is registered
- **WHEN** a direct bundle ZIP passes final size and integrity checks
- **THEN** the Host registers its temporary file path with the existing file registry
- **AND** subsequent download streams the registered file through the existing bounded transfer path.

#### Scenario: Archive runtime is unavailable
- **WHEN** production direct export cannot access the supported Zotero archive writer
- **THEN** it fails with structured `archive_runtime_unavailable`
- **AND** it does not silently fall back to an unbounded in-memory archive.

### Requirement: Handle creation and byte delivery SHALL remain distinct evidence

A bridge-download descriptor SHALL prove only that the requested archive was prepared and registered. A caller SHALL claim downloaded delivery only after obtaining the Handle bytes and validating the declared size and SHA-256 when present.

#### Scenario: Handle expires before download
- **WHEN** a direct-bundle Handle is no longer valid
- **THEN** the caller can repeat the same stable source scope to obtain a new bundle
- **AND** no host path or expired Handle is reused as recovery state.
