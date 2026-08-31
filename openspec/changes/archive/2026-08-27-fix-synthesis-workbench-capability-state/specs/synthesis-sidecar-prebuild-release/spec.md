## ADDED Requirements

### Requirement: Prebuild verification SHALL exercise current production seams deterministically

Every matrix member configured for native smoke SHALL construct its candidate
launch input through the shared current launch-config contract and SHALL
exercise the production repository, canonical store, reverse Host probe,
Workbench read, shutdown, and reopen process boundary before its archive is
accepted. Platform-sensitive tests run by the workflow SHALL synchronize
observable lifecycle events and SHALL release repository and canonical owners
before removing their storage. Concurrent artifact-read evidence SHALL use an
explicit rendezvous and completion gate rather than elapsed-time ordering, and
migration fixtures SHALL release every inspected source or backup connection
before removing their temporary database root. A process-lifecycle reverse Host
fixture SHALL explicitly restore each accepted stream to blocking mode before
its bounded request read, regardless of the listener mode, and fixture teardown
SHALL NOT replace an in-flight test failure with a second panic. Test fixture
temporary-path components SHALL use identities valid on every supported target
and SHALL NOT embed platform-illegal timestamp punctuation. The raw loopback
verifier SHALL complete an HTTP response when exactly its declared
`Content-Length` bytes have arrived and SHALL NOT require transport EOF after a
complete frame. EOF before the declared frame is complete SHALL fail closed.
After accepted shutdown, the verifier SHALL join the complete child-process
close, including stdio closure, before removing temporary repository storage.
Exceptional cleanup SHALL terminate and join a still-running candidate before
removing that storage.

#### Scenario: A native candidate is smoked

- **WHEN** a native-smoke matrix member launches its packaged Rust candidate
- **THEN** the smoke SHALL use a shared-contract-valid launch configuration
- **AND** it SHALL verify the current production health and persistence paths
- **AND** successful shutdown SHALL permit the same source to reopen cleanly

#### Scenario: Platform scheduling and file ownership differ

- **WHEN** prebuild tests run under slower thread scheduling or Windows SQLite
  file locking
- **THEN** deadline evidence SHALL synchronize task start and completion
- **AND** concurrent-read completion order SHALL NOT be inferred from sleep durations
- **AND** temporary storage SHALL be removed only after all owning handles drop

#### Scenario: A nonblocking fixture listener accepts a request

- **WHEN** a process-lifecycle fixture accepts a reverse Host connection on any supported operating system
- **THEN** the accepted stream SHALL use an explicit blocking mode with a bounded read timeout
- **AND** a foreground failure SHALL remain the primary test failure during fixture teardown

#### Scenario: A fixture creates temporary state on Windows

- **WHEN** a platform test derives a unique temporary storage path
- **THEN** every generated path component SHALL be valid on all seven supported targets
- **AND** an ISO-8601 value SHALL NOT be used directly as a path component

#### Scenario: Concurrent artifact reads complete out of source order

- **WHEN** Reference Refresh verifies that two Host artifact reads overlap while preserving source-order application
- **THEN** both reads SHALL rendezvous before either completion is observed
- **AND** the gated completion order SHALL be independent of runner scheduling latency

#### Scenario: A complete response body arrives before connection EOF

- **WHEN** the native candidate returns a valid HTTP response with its complete declared body while the loopback connection remains open
- **THEN** the durable smoke SHALL accept the response at the declared message boundary
- **AND** it SHALL NOT wait for TCP EOF or relax its bounded response deadline

#### Scenario: A candidate terminates before temporary storage cleanup

- **WHEN** the durable smoke has accepted shutdown or must terminate a candidate after another failure
- **THEN** it SHALL join the child's complete close before removing the temporary repository root
- **AND** Windows sharing violations SHALL remain failures rather than being ignored or retried as cleanup policy
