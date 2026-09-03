## MODIFIED Requirements

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

Every reused runtime artifact SHALL come from a workflow run whose head SHA
exactly equals the requested source SHA, then pass the existing target, source
fingerprint, build fingerprint, archive, and bundle-manifest validation.
Artifacts from another source SHA SHALL NOT become cache candidates even when
their build fingerprints match.

The requested source's bundle inputs, including `manifest.json.createdAt`,
SHALL be source-derived. Re-running the same source with the same recipe and
toolchain SHALL reproduce or reuse the same seven source-bound archives, so an
existing aggregate is verified as a no-op rather than overwritten.

#### Scenario: A newer cache donor belongs to another source

- **WHEN** recent workflow history contains artifacts from another source SHA
- **AND** an older run for the requested source contains a complete candidate
- **THEN** the resolver SHALL ignore the cross-source run
- **AND** it SHALL select and validate the exact-source candidate

#### Scenario: No exact-source cache candidate exists

- **WHEN** every prior artifact belongs to another source SHA, is expired, or is incomplete
- **THEN** the affected target SHALL be rebuilt from the requested source
- **AND** no cross-source artifact SHALL contribute bytes or evidence

#### Scenario: The same source SHA is prebuilt twice

- **WHEN** the exact source is prebuilt twice from the same recipe and toolchain
- **THEN** both runs SHALL compute the same seven-target aggregate
- **AND** the second publisher SHALL byte-verify the immutable set without a new commit

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

- **WHEN** a prior target from another source commit has the exact current source
  and build fingerprints and its archive and bundle manifest validate
- **THEN** the current prebuild SHALL NOT reuse its bytes across source commits
- **AND** only a donor run for the exact requested source SHA MAY be selected
- **AND** a native-smoke target SHALL execute its smoke again in the current run

#### Scenario: A cache candidate is stale or unavailable

- **WHEN** a candidate is expired, missing, incomplete, belongs to another source
  SHA, or differs in target, source fingerprint, build fingerprint, size, digest,
  or bundle manifest
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

### Requirement: Development prebuild SHALL complete through bounded local synchronization

The supported development command SHALL dispatch or resume one exact run,
validate its v4 result and immutable set, synchronize all seven sidecar bundle
roots atomically, and run freshness by default. Unrelated dirty paths SHALL be
reported but SHALL NOT block construction. Dirty paths inside a target bundle
root SHALL block replacement unless explicitly authorized.

The command SHALL download an admitted cache artifact, preserve its inner
tar.gz bytes, validate its archive layout, and extract it through the governed
tar runtime. Windows SHALL use Git for Windows' bundled GNU tar and gzip rather
than the system bsdtar. Deterministic creation SHALL retain sorted entries,
fixed timestamps, and numeric zero ownership. Listing and extraction SHALL
avoid absolute archive drive letters and native-backslash `tar -C` arguments.

#### Scenario: A cached archive is extracted on Windows

- **WHEN** the archive and output directory use native Windows paths
- **THEN** tar SHALL run from the output directory with a relative forward-slash archive path
- **AND** the expected target directory SHALL be available for verification

#### Scenario: A deterministic archive is created on Windows

- **WHEN** staging creates a content-addressed runtime archive on Windows
- **THEN** it SHALL use Git for Windows' GNU tar and bundled gzip
- **AND** it SHALL preserve the governed sorting, timestamp, and ownership flags

#### Scenario: Release verification fails after a successful build

- **WHEN** construction, synchronization, and freshness succeed but verification is failed or pending
- **THEN** the command SHALL report build completion and release blockage separately
- **AND** it SHALL exit successfully for the requested development prebuild

### Requirement: Windows prebuilds SHALL retain matching durable symbols

Every fresh Windows prebuild SHALL produce a deterministic gzip PDB and strict
manifest under `symbols/<sourceSha>/win32-x64/` on the existing prebuild branch.
The manifest `sourceCommit` SHALL equal `<sourceSha>`. The publisher SHALL copy
or byte-verify that directory in the same commit as the runtime set. Symbols
SHALL NOT enter runtime bundles, the seven-platform aggregate, XPI contents, or
release-result contracts.

#### Scenario: Distinct sources share a build fingerprint

- **WHEN** two source SHAs produce Windows symbols with the same build fingerprint
- **THEN** each source SHALL retain its own immutable symbol directory
- **AND** neither source manifest nor PDB SHALL be treated as equivalent to the other

#### Scenario: A source is republished with different symbol bytes

- **WHEN** `symbols/<sourceSha>/win32-x64` exists and a candidate differs
- **THEN** publication SHALL fail closed with a Windows-symbol conflict
- **AND** the existing symbol directory SHALL remain unchanged

#### Scenario: A runtime aggregate is republished with different bytes

- **WHEN** `sets/<aggregate>` exists and the candidate files differ
- **THEN** publication SHALL fail closed with a runtime-set conflict

#### Scenario: A Windows cache run has no symbols

- **WHEN** cache resolution finds a runtime artifact without its matching symbol artifact
- **THEN** Windows is a cache miss and is rebuilt
- **AND** other exact-source platform candidates remain reusable

#### Scenario: The compressed PDB exceeds the storage gate

- **WHEN** symbol packaging exceeds the configured pre-Git-hosting size limit
- **THEN** the prebuild fails explicitly without falling back to ephemeral-only symbols
