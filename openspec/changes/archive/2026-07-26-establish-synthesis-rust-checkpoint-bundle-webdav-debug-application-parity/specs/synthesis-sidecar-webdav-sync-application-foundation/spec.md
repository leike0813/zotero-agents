## ADDED Requirements

### Requirement: WebDAV Sync SHALL expose typed Rust parity
The Rust application SHALL orchestrate strict HEAD reading, preview-first durable import, deterministic local export, asset-then-manifest-then-HEAD publication, conflict handling, pause/resume, stale-run recovery, and at most four cancellable retries through typed environment-neutral ports.

#### Scenario: Remote state changes during publication
- **WHEN** an observed ETag no longer matches while writing the manifest or HEAD
- **THEN** the run becomes retryable with the stable remote-change code
- **AND** no retry survives abort, pause, retrigger, stop, or shutdown
