## MODIFIED Requirements

### Requirement: Sidecar prebuilds SHALL be exact content-addressed sets

The repository SHALL store release-eligible Synthesis native runtime prebuilds
on `synthesis-sidecar-runtime-prebuilds` under `sets/<aggregate>/`. Each set
SHALL have exactly seven target archives and a complete archive-digest manifest.
Release-eligible evidence SHALL use
`synthesis-sidecar-runtime-prebuild-result.v3`, bind one trusted successful
Linux/Windows/macOS verification receipt, and record one closed per-target
`built` or `reused` evidence entry. A reused entry SHALL bind its donor run and
source identity, while every native-smoke target SHALL bind smoke evidence from
the current prebuild run. Legacy result versions MAY be parsed for read-only
audit but MUST NOT authorize synchronization, release preparation, or release.

The sole manually dispatched prebuild workflow SHALL derive its seven target
builds and pinned toolchain construction from one checked-in sidecar build
recipe. Linux cross-build targets `linux-x86`, `linux-x64`, and `linux-arm`
SHALL use the recipe-pinned Zig/cargo-zigbuild construction; `linux-arm64`
SHALL build natively on its Linux ARM64 runner with Cargo and SHALL retain its
native smoke. The workflow SHALL NOT depend on runner-installed cross-GCC apt
packages.

#### Scenario: A verified set is synchronized
- **WHEN** synchronization receives a v3 result and its declared immutable set
- **THEN** the verification identity, result identity, exact seven-target
  evidence, set manifest, archive digests, and bundle manifests SHALL all validate
- **AND** an unknown field, incomplete target map, duplicate target, mismatched
  identity, legacy result, or stale native smoke SHALL fail before add-on bytes
  are replaced

#### Scenario: An exact prior target is reused across source commits
- **WHEN** a prior target artifact has the exact current source and build
  fingerprints and its archive and bundle manifest validate
- **THEN** the current prebuild MAY reuse its exact bytes and SHALL record the
  donor run and donor source commit in that target's v3 evidence
- **AND** a native-smoke target SHALL execute its smoke again in the current run

#### Scenario: A cache candidate is stale or unavailable
- **WHEN** a candidate is expired, missing, incomplete, or differs in target,
  source fingerprint, build fingerprint, size, digest, or bundle manifest
- **THEN** only that target SHALL be rebuilt from the current source
- **AND** the candidate SHALL NOT contribute evidence to the result

#### Scenario: Linux ARM64 is built on its native runner
- **WHEN** the manual seven-target prebuild builds `linux-arm64`
- **THEN** it SHALL compile `aarch64-unknown-linux-gnu` directly with Cargo,
  SHALL not install or invoke Zig/cargo-zigbuild for that matrix member, and
  SHALL run its native smoke before the archive is accepted

#### Scenario: A Linux target needs cross compilation
- **WHEN** the manual seven-target prebuild builds `linux-x86`, `linux-x64`, or
  `linux-arm`
- **THEN** it SHALL use the recipe-pinned Zig and cargo-zigbuild construction
  path without installing `gcc-multilib` or `gcc-arm-linux-gnueabihf`

### Requirement: Prebuild verification SHALL exercise current production seams deterministically

Every relevant source change SHALL run one automatic verification workflow on
Linux, Windows, and macOS. The Linux verifier SHALL run format, lint, shared
contract/parity/license checks, and the complete Rust workspace tests; Windows
and macOS SHALL run the complete Rust workspace tests. Workspace tests SHALL
continue after an individual test binary fails so one receipt reports every
failure discovered in that run. A trusted receipt SHALL be emitted only after
all three hosts pass and SHALL be accepted by prebuild only from same-repository
push or manual-dispatch events. A receipt from another source commit MAY be used
only when its verification fingerprint exactly equals the current fingerprint.

Every matrix member configured for native smoke SHALL construct its candidate
launch input through the shared current launch-config contract and SHALL
exercise the production repository, canonical store, reverse Host probe,
Workbench read, shutdown, and reopen process boundary before its archive is
accepted. Platform-sensitive tests SHALL synchronize observable lifecycle
events and SHALL release repository and canonical owners before removing their
storage. Concurrent artifact-read evidence SHALL use an explicit rendezvous and
completion gate rather than elapsed-time ordering, and migration fixtures SHALL
release every inspected source or backup connection before removing their
temporary database root. A process-lifecycle reverse Host fixture SHALL
explicitly restore each accepted stream to blocking mode before its bounded
request read, regardless of the listener mode, and fixture teardown SHALL NOT
replace an in-flight test failure with a second panic. Test fixture
temporary-path components SHALL use identities valid on every supported target
and SHALL NOT embed platform-illegal timestamp punctuation. The raw loopback
verifier SHALL complete an HTTP response when exactly its declared
`Content-Length` bytes have arrived and SHALL NOT require transport EOF after a
complete frame. EOF before the declared frame is complete SHALL fail closed.
After accepted shutdown, the verifier SHALL join the complete child-process
close, including stdio closure, before removing temporary repository storage.
Exceptional cleanup SHALL terminate and join a still-running candidate before
removing that storage.

#### Scenario: Relevant source is proposed or pushed
- **WHEN** a pull request or branch push changes sidecar runtime, contract,
  verification, packaging, or pipeline inputs
- **THEN** Linux, Windows, and macOS verification SHALL run automatically
- **AND** only an all-host success SHALL produce a verification receipt

#### Scenario: Prebuild lacks trusted current verification
- **WHEN** no trusted receipt has the current verification fingerprint, or the
  only receipt came from an untrusted pull-request context
- **THEN** prebuild SHALL fail before creating any seven-target build work

#### Scenario: A native candidate is smoked
- **WHEN** a native-smoke matrix member launches its packaged Rust candidate
- **THEN** the smoke SHALL use a shared-contract-valid launch configuration
- **AND** it SHALL verify the current production health and persistence paths
- **AND** successful shutdown SHALL permit the same source to reopen cleanly

#### Scenario: Platform scheduling and file ownership differ
- **WHEN** verification tests run under slower thread scheduling or Windows
  SQLite file locking
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
