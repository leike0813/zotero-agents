## ADDED Requirements

### Requirement: Development prebuild orchestration SHALL remain build-only

The repository SHALL allow an attached, clean, pushed development branch to
dispatch and synchronize an exact Host Bridge CLI prebuild set without
preparing or publishing a Host Bridge release.

#### Scenario: Feature branch prebuild succeeds

- **WHEN** a clean attached feature branch has an upstream whose tip equals the
  requested full source SHA and the CLI version identity is already locked
- **THEN** `prebuild:zotero-bridge-cli` SHALL dispatch the seven-platform
  build-only workflow for that ref and source SHA
- **AND** it SHALL synchronize and verify the resulting immutable set without
  committing, pushing, or publishing any Host Bridge surface.

#### Scenario: Formal release remains isolated

- **WHEN** a development-branch prebuild completes
- **THEN** `release:host-bridge:dispatch` SHALL still require a clean
  synchronized `main`, an exact prepared release set, and explicit publication
  authorization
- **AND** neither ordinary pushes nor the prebuild command SHALL trigger
  publication or Gitee synchronization.

### Requirement: Prebuild workflow dispatch SHALL be exact and recoverable

Every prebuild dispatch SHALL carry a unique request id, full source SHA, and
explicit ref. Run discovery SHALL match that request id and identity rather
than selecting the latest workflow run.

#### Scenario: Operator resumes a known run

- **WHEN** the operator supplies `--resume-run-id`
- **THEN** the command SHALL reuse and validate that workflow run without
  dispatching another run
- **AND** SHALL continue from its structured result artifact.

#### Scenario: Matching run cannot be proven

- **WHEN** no workflow run matches the request id, workflow, ref, and source SHA
- **THEN** orchestration SHALL fail with recovery evidence
- **AND** SHALL NOT synchronize or modify local prebuild files.

### Requirement: Repository workflow dispatchers SHALL share run mechanics

Host Bridge release, content-package, and CLI prebuild dispatch paths SHALL use
one repository helper for request-id handling, exact run lookup, watch, run
validation, and artifact download.

#### Scenario: Existing release dispatch uses shared mechanics

- **WHEN** an existing release command dispatches or watches its workflow
- **THEN** its command-specific authorization and identity gates SHALL remain
  unchanged
- **AND** run selection SHALL use the shared exact-match implementation.
