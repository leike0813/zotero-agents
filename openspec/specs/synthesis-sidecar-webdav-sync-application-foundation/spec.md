# synthesis-sidecar-webdav-sync-application-foundation Specification

## Purpose
Defines the application-level foundation for the Synthesis sidecar webdav sync component, including its service boundary, lifecycle, and integration with the sidecar runtime.

## Requirements

### Requirement: WebDAV snapshot orchestration is environment-neutral

The shared application SHALL coordinate the strict Host WebDAV port and durable bundle application without importing plugin, Zotero, Node filesystem, preference, credential, or HTTP modules.

#### Scenario: A composition is created
- **WHEN** production or private Node composition supplies the required ports
- **THEN** both SHALL use the same remote layout, state transitions, conflict projection, retry policy, and publication ordering

### Requirement: Remote durable import is preview-first

An existing remote snapshot SHALL be read through a bounded lazy source, strictly verified, previewed, and applied only from the issued single-use receipt.

#### Scenario: Remote snapshot is clean
- **WHEN** HEAD and every declared asset validate and preview reports no blocking conflict
- **THEN** the application SHALL apply the pinned receipt before building the local export

#### Scenario: Remote snapshot is unsafe
- **WHEN** validation fails, a tombstone is present, both local and remote changed, or an unbased update lacks the configured acknowledgement
- **THEN** the application SHALL publish no local mutation and SHALL enter a stable terminal or conflict-blocked state

### Requirement: Snapshot publication is deterministic and HEAD-last

The application SHALL upload immutable bundle texts in stable path order, then the manifest, and SHALL write `HEAD.json` only after all snapshot content succeeds.

#### Scenario: Publication succeeds
- **WHEN** all snapshot writes complete and the observed remote HEAD remains current
- **THEN** HEAD SHALL identify the deterministic snapshot and manifest hash using the observed ETag

#### Scenario: Publication is interrupted
- **WHEN** an asset write fails or the HEAD precondition conflicts
- **THEN** no new valid HEAD SHALL be published and any orphan immutable snapshot SHALL remain non-authoritative

### Requirement: Retry and cancellation are bounded

Each trigger SHALL schedule at most four retries at 60 seconds, 5 minutes, 15 minutes, and 30 minutes, and every pending automatic callback SHALL be generation-bound and cancelable.

#### Scenario: A retryable failure continues
- **WHEN** auto retry is enabled and four retry attempts fail retryably
- **THEN** the application SHALL schedule no fifth retry

#### Scenario: Runtime gates change
- **WHEN** pause, disablement, conflict, terminal failure, abort, a superseding trigger, stop admission, or shutdown occurs
- **THEN** pending debounce and retry callbacks SHALL perform no remote work

### Requirement: WebDAV application state is strict and secret-free

State, pointer, conflict, progress, and diagnostics SHALL be bounded canonical DTOs persisted through an injected store without credentials, raw authorization data, local absolute paths, or executable values.

#### Scenario: Restart reads saved state
- **WHEN** saved state is valid or represents a stale running operation
- **THEN** it SHALL be normalized deterministically and SHALL NOT restore a hidden retry timer

#### Scenario: Saved state is malformed
- **WHEN** state cannot be strictly rebuilt
- **THEN** recovery SHALL fail closed before any remote read or write

### Requirement: Private lifecycle preserves production boundaries

The sidecar SHALL compose WebDAV privately after durable recovery with a disabled Host port and SHALL stop and drain it before the durable, canonical, and repository owners close.

#### Scenario: Shutdown overlaps a sync run
- **WHEN** shutdown begins while WebDAV work is active
- **THEN** new triggers SHALL be rejected, timers SHALL be canceled, and dependency closure SHALL wait for the active run

#### Scenario: Foundation is packaged
- **WHEN** runtime and XPI inventories include the WebDAV foundation
- **THEN** no HTTP/RPC, worker, `SynthesisClient`, Workbench, Host Bridge, MCP, credential, or production mutation capability SHALL be added and inventories SHALL remain `108 methods / 1 direct consumer`

### Requirement: Production WebDAV behavior remains compatible

The production facade SHALL preserve existing DTOs, factory and method names, remote paths and bytes, state files, progress, action results, preferences, credentials, HTTP adapter, Host port shape, and current unbased-update policy.

#### Scenario: Established production fixtures run
- **WHEN** durable, WebDAV, runtime composition, retry, conflict, credential, autosync, packaging, and boundary suites execute
- **THEN** their valid externally observable results and capability counts SHALL remain unchanged
