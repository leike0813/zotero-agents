# synthesis-sidecar-prebuild-release Specification

## Purpose

Defines the exact seven-platform, content-addressed prebuild set and result
evidence required before Synthesis sidecar binaries can be synchronized.

## Requirements

### Requirement: Sidecar prebuilds SHALL be exact content-addressed sets

The repository SHALL store release-eligible Synthesis native runtime prebuilds
on `synthesis-sidecar-runtime-prebuilds` under `sets/<aggregate>/`. Each set
SHALL have exactly seven target archives, a complete archive-digest manifest,
and a result document using `synthesis-sidecar-runtime-prebuild-result.v2`
with an explicit cache-hit, cache-miss, and source-run summary.
The sole manually dispatched prebuild workflow SHALL derive its seven target
builds and pinned toolchain construction from one checked-in sidecar build
recipe. Linux cross-build targets `linux-x86`, `linux-x64`, and `linux-arm`
SHALL use the recipe-pinned Zig/cargo-zigbuild construction; `linux-arm64`
SHALL build natively on its Linux ARM64 runner with Cargo and SHALL retain its
native smoke. The workflow SHALL NOT depend on runner-installed cross-GCC apt
packages.

#### Scenario: A verified set is synchronized
- **WHEN** synchronization receives a v2 result and its declared immutable set
- **THEN** the result identity, exact seven-target cache partition, set
  manifest, archive digests, and bundle manifests SHALL all validate
- **AND** an unknown field, incomplete cache partition, duplicate target, or
  mismatched identity SHALL fail before add-on bytes are replaced

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
and SHALL NOT embed platform-illegal timestamp punctuation.

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
