# synthesis-workbench-sync-command-client-consumer Specification

## Purpose
Defines the Synthesis Workbench client consumer contract for sync command operations, specifying how Workbench reads and reacts to client-side state changes.

## Requirements

### Requirement: Synthesis client exposes bounded Git and WebDAV Sync commands

The Synthesis client SHALL expose `sync.git` and `sync.webDav` transports implementing the shared `runNow`, `pause`, `resume`, `retry`, and `resolveConflict` command interface. Command results SHALL be opaque JSON-safe objects, and the Workbench SHALL NOT resolve the complete legacy service for these commands.

#### Scenario: Workbench invokes a Sync command
- **WHEN** a user runs any existing Git or WebDAV Sync command
- **THEN** the Workbench SHALL invoke the matching method on `client.sync.git` or `client.sync.webDav`
- **AND** all ten existing host command names SHALL remain available

### Requirement: Sync conflict requests are strict and canonical

A conflict request SHALL contain exactly one canonical allowed action after reconstruction. The canonical action enum SHALL cover existing Git conflict aliases and WebDAV conflict actions. Unknown JSON-safe fields SHALL NOT be forwarded.

#### Scenario: Conflict request is valid
- **WHEN** a request contains an allowed canonical action and optional unknown JSON-safe fields
- **THEN** the adapter SHALL invoke the conflict port with a rebuilt request containing only the canonical action

#### Scenario: Conflict request is invalid
- **WHEN** a request is not JSON-safe, is not an object, or contains a missing or unsupported action
- **THEN** the adapter SHALL reject with `invalid_request`
- **AND** it SHALL NOT resolve or invoke the legacy port

### Requirement: In-process Sync commands normalize ports, results, and errors

The in-process adapter SHALL depend on ten narrow optional legacy command ports. It SHALL normalize each returned value through the shared JSON-safe object path, reject a missing port with `unavailable`, preserve an existing client error and `storage_busy`, and normalize an ordinary exception or invalid result to `internal`.

#### Scenario: No-argument Sync command succeeds
- **WHEN** a configured run, pause, resume, or retry port returns a JSON-safe object
- **THEN** the client SHALL return a rebuilt opaque JSON-safe object

#### Scenario: Sync command port is absent
- **WHEN** a caller invokes a Sync command whose legacy port was not composed
- **THEN** the adapter SHALL reject with `unavailable`

#### Scenario: Sync command fails
- **WHEN** a configured port throws an ordinary exception or returns an invalid result
- **THEN** the adapter SHALL reject with `internal`

### Requirement: Workbench Sync commands always acquire fresh composition

Every Workbench Sync command SHALL acquire a fresh default Synthesis client from inside its existing single-flight execution closure. Fresh acquisition SHALL clear any cached client and SHALL invalidate the legacy default service before constructing the replacement client, including when no client was cached.

#### Scenario: Cached client exists
- **WHEN** a Sync command acquires a fresh client after a default client was cached
- **THEN** both the cached client and legacy default service SHALL be replaced

#### Scenario: Client cache is empty
- **WHEN** a Sync command acquires a fresh client while no default client is cached
- **THEN** the legacy default service SHALL still be invalidated before client construction

### Requirement: Existing Workbench Sync orchestration is preserved

Client-routed Sync commands SHALL preserve single-flight arguments, action trimming and defaults, start timing, failure-state transformation, Sync polling, and Sync chrome refresh behavior. Only `syncWebDavNow` SHALL retain deferred start. Git/WebDAV run and retry SHALL retain `failOnSyncFailureState`; pause, resume, and conflict commands SHALL retain their current result handling.

#### Scenario: Run or retry command executes
- **WHEN** Git or WebDAV run/retry enters its single-flight closure
- **THEN** it SHALL acquire a fresh client and invoke the matching transport command
- **AND** it SHALL retain failure-state transformation

#### Scenario: Pause, resume, or conflict command executes
- **WHEN** Git or WebDAV pause, resume, or conflict resolution enters its single-flight closure
- **THEN** it SHALL acquire a fresh client and preserve the existing raw result handling

#### Scenario: WebDAV run starts
- **WHEN** `syncWebDavNow` is invoked
- **THEN** it SHALL retain `deferStart: true`
- **AND** every other Sync command SHALL retain immediate start

#### Scenario: Sync command settles
- **WHEN** a Sync command completes or fails
- **THEN** the existing polling and Sync chrome fast path SHALL remain intact

### Requirement: Workbench no longer directly consumes the complete service

The pure `topicPathId` helper SHALL live in the Synthesis foundation and SHALL be shared by service and Workbench. Production Workbench SHALL have no import of `synthesis/service`. The public service inventory SHALL remain 128 methods and direct legacy consumers SHALL be exactly legacy composition, Host Bridge, and MCP.

#### Scenario: Static service boundaries are checked
- **WHEN** inventory and direct-consumer checks run
- **THEN** the public service method count SHALL remain 128
- **AND** the direct legacy consumer count SHALL be three
- **AND** Workbench SHALL not appear in that consumer list

#### Scenario: Out-of-scope Sync APIs are inspected
- **WHEN** raw Sync query, configuration, status, credential, or connection-test APIs are reviewed
- **THEN** Host Bridge and MCP access SHALL remain unchanged
