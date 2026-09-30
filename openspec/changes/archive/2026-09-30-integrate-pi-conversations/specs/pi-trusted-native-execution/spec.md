## ADDED Requirements

### Requirement: Conversation user files are immutable managed snapshots

Explicit Conversation user files SHALL be validated as regular files, copied with bounded reads before durable admission and committed atomically as owner-managed snapshots. Limits SHALL be 20 MiB per file, 50 MiB per send, and the existing 2 GiB owner quota shared with generated and Workspace files. Original paths SHALL remain transient and absent from manifests, canonical transcript, preparation, model and UI. Managed snapshots SHALL expose exact read-only access without granting their parent directory or private owner files.

#### Scenario: Copy crosses a declared limit

- **WHEN** a file grows during copy beyond its admitted boundary
- **THEN** the operation fails without admitting the turn or partially committing the managed manifest.
