# synthesis-sidecar-prebuild-release Specification

## Purpose

Defines the exact seven-platform, content-addressed prebuild set and result
evidence required before Synthesis sidecar binaries can be synchronized.

## Requirements

### Requirement: Sidecar prebuilds SHALL produce exact build-only content-addressed sets

The manual seven-target prebuild SHALL accept one exact pushed source SHA and
request ID without requiring release-verification evidence. It SHALL produce a
strict `synthesis-sidecar-runtime-prebuild-result.v4` that binds the exact
source/build identities, prebuild producer revision, immutable set, and seven
closed target evidence entries. The result SHALL make no release-eligibility
claim.

The repository SHALL store release-eligible Synthesis native runtime prebuilds
on `synthesis-sidecar-runtime-prebuilds` under `sets/<aggregate>/`. Each set
SHALL have exactly seven target archives and a complete archive-digest manifest.
A reused entry SHALL bind its donor run and source identity, while every
native-smoke target SHALL bind smoke evidence from the current prebuild run.
Legacy result versions MAY be parsed for read-only audit but MUST NOT authorize
synchronization, release preparation, or release.

The sole manually dispatched prebuild workflow SHALL derive its seven target
builds and pinned toolchain construction from one checked-in sidecar build
recipe. Linux cross-build targets `linux-x86`, `linux-x64`, and `linux-arm`
SHALL use the recipe-pinned Zig/cargo-zigbuild construction; `linux-arm64`
SHALL build natively on its Linux ARM64 runner with Cargo and SHALL retain its
native smoke. The workflow SHALL NOT depend on runner-installed cross-GCC apt
packages.

#### Scenario: Verification is absent or failed
- **WHEN** an exact pushed source has no successful matching verification receipt
- **THEN** the prebuild SHALL still build or validate all seven target archives
- **AND** it SHALL publish a v4 immutable build result when construction succeeds
- **AND** formal release preparation SHALL remain blocked

#### Scenario: An immutable branch advances
- **WHEN** a result binds a commit containing its set and later sets advance the branch
- **THEN** synchronization SHALL read the result's exact commit
- **AND** it SHALL NOT require that commit to remain the branch head

#### Scenario: Concurrent publishers race
- **WHEN** another publisher advances the branch before the current push
- **THEN** the publisher SHALL fetch and retry the append operation within a fixed bound
- **AND** it SHALL never force push or rewrite an existing set

#### Scenario: An exact prior target is reused across source commits
- **WHEN** a prior target artifact has the exact current source and build
  fingerprints and its archive and bundle manifest validate
- **THEN** the current prebuild MAY reuse its exact bytes and SHALL record the
  donor run and donor source commit in that target's v4 evidence
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

### Requirement: Formal release SHALL join build and verification evidence

Formal release preparation SHALL be the only operation that joins one v4
prebuild result with one trusted `synthesis-sidecar-verification-result.v2`.
The verification workflow SHALL retain the complete Linux contract/parity/
license roster and complete Linux/Windows/macOS Rust workspace tests. No release
set SHALL be written unless both evidence documents and the exact immutable set
validate.

#### Scenario: Matching verification arrives after prebuild
- **WHEN** a v4 set already exists and a trusted matching v2 receipt later succeeds
- **THEN** release preparation SHALL create a release-set v2 without rebuilding targets
- **AND** the release set SHALL bind both evidence documents and their lane revisions

#### Scenario: Receipt metadata is untrusted
- **WHEN** receipt repository, workflow, run ID, event, head SHA, identity, host result, or producer revision differs from GitHub run metadata or the release source
- **THEN** release preparation and materialization SHALL fail before changing addon bytes

### Requirement: Development prebuild SHALL complete through bounded local synchronization

The supported development command SHALL dispatch or resume one exact run,
validate its v4 result and immutable set, synchronize all seven sidecar bundle
roots atomically, and run freshness by default. Unrelated dirty paths SHALL be
reported but SHALL NOT block construction. Dirty paths inside a target bundle
root SHALL block replacement unless explicitly authorized.

#### Scenario: Release verification fails after a successful build
- **WHEN** construction, synchronization, and freshness succeed but verification is failed or pending
- **THEN** the command SHALL report build completion and release blockage separately
- **AND** it SHALL exit successfully for the requested development prebuild

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

### Requirement: Windows prebuilds SHALL retain matching durable symbols

Every fresh Windows prebuild SHALL produce a deterministic gzip PDB and strict
manifest under `symbols/<buildFingerprint>/win32-x64/` on the existing prebuild
branch. The publisher SHALL copy or byte-verify that directory in the same
commit as the seven-runtime set. Symbols SHALL NOT enter runtime bundles, the
seven-platform aggregate, XPI contents, or release-result contracts.

#### Scenario: A Windows cache run has no symbols

- **WHEN** cache resolution finds a runtime artifact without its matching symbol artifact
- **THEN** Windows is a cache miss and is rebuilt
- **AND** other platform candidates remain reusable

#### Scenario: The compressed PDB exceeds the storage gate

- **WHEN** symbol packaging exceeds the configured pre-Git-hosting size limit
- **THEN** the prebuild fails explicitly without falling back to ephemeral-only symbols
