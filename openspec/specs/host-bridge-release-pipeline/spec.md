# host-bridge-release-pipeline Specification

## Purpose
TBD - created by syncing change add-zotero-librarian-hermes-profile. Update Purpose after archive.

## Requirements

### Requirement: Host Bridge release pipeline publishes Zotero librarian profile

The Host Bridge release pipeline SHALL publish the `zotero-librarian` Hermes
profile distribution when profile, Host Bridge CLI, profile guidance, workflow
catalog, or CLI prebuild inputs change.

#### Scenario: GitHub release workflow publishes both surfaces

- **WHEN** the Host Bridge CLI GitHub workflow restores all prebuilt binaries
- **THEN** it SHALL publish the existing `host-bridge/zotero-bridge-cli-bundle`
  branch
- **AND** it SHALL publish `leike0813/zotero-librarian-profile` from the same
  source commit and prebuild set.

#### Scenario: Local release instructions mention profile checks

- **WHEN** the host bridge release-pipeline skill is read
- **THEN** it SHALL instruct agents to run the profile render/check path after
  capability, CLI, workflow catalog, profile, or documentation changes
- **AND** its report checklist SHALL include standalone profile repository publication and
  profile binary checksum synchronization.

#### Scenario: Local release instructions use one explicit dispatch

- **WHEN** a prepared Host Bridge release set is committed and pushed to `main`
- **THEN** the host bridge release-pipeline skill SHALL invoke the repository
  dispatch command with the exact `releaseSetId`
- **AND** ordinary pushes and CI SHALL NOT trigger Host Bridge publication.

### Requirement: CLI Builds Are Fingerprint-Gated

The unified Host Bridge release workflow SHALL run the pinned seven-platform build matrix only when the prepared release plan reports changed CLI binary inputs or an explicit rebuild intent. Version and generated-file changes SHALL be prepared in the source change before publication; CI SHALL not create a version self-commit on `main`.

#### Scenario: Surface-only change

- **WHEN** only wrapper, Library Agent, Profile, semantic, schema, installer, or generated surface inputs change without changing CLI binary inputs
- **THEN** the release plan SHALL report that a CLI prebuild is not required
- **AND** the workflow SHALL restore the exact immutable prebuild identity recorded by the release set.

#### Scenario: CLI build input changes

- **WHEN** CLI binary inputs differ from the completed release identity
- **THEN** preparation SHALL record the required CLI version decision and new build fingerprint
- **AND** the workflow SHALL build all supported platforms before materializing publishable manifests.

#### Scenario: Publication implementation changes

- **WHEN** workflow orchestration, receipt, synchronization, recovery, or pure
  validation code changes without changing CLI source or its build recipe
- **THEN** the CLI build fingerprint SHALL remain unchanged
- **AND** the release pipeline SHALL record those changes as pipeline revision
  metadata rather than binary compatibility identity.

#### Scenario: Packaged fingerprint is stale

- **WHEN** restored or built binaries do not match the prepared fingerprint and checksum set
- **THEN** publication SHALL fail before creating or advancing any surface target.

### Requirement: Surface Publishing Reuses Latest Prebuilds

Host Bridge surface publication SHALL restore the immutable CLI prebuild set named by the prepared release set when no CLI build is required. It SHALL not select prebuilds by a mutable latest pointer or SemVer alone.

#### Scenario: Surface-only publish

- **WHEN** public surface content changes without CLI binary input changes
- **THEN** the unified workflow SHALL restore the release set's exact CLI version, build fingerprint, command catalog checksum, binary aggregate, and seven binaries
- **AND** it SHALL publish all three surfaces without running the Rust build matrix.

### Requirement: CLI prebuilds use an append-only branch store

The repository SHALL store complete seven-platform CLI prebuild sets on the
`host-bridge-cli-prebuilds` branch under
`sets/<binaryAggregateSha256>`. GitHub Releases SHALL NOT be used as the Host
Bridge CLI prebuild store.

#### Scenario: Exact aggregate already exists

- **WHEN** publication requests an aggregate already present on the prebuild branch
- **THEN** all archive and identity hashes SHALL be verified and the set reused
- **AND** any differing bytes or CLI identity SHALL fail before surface publication.

#### Scenario: Exact aggregate is new

- **WHEN** the seven-platform build or verified repository binaries produce a new aggregate
- **THEN** the workflow SHALL append one manifest and seven archives without replacing another set.

### Requirement: Plugin Release Verifies CLI Prebuild Freshness

The plugin release workflow SHALL verify restored Host Bridge CLI prebuilds against the CLI release manifest before building the XPI.

#### Scenario: Manifest fingerprint is stale

- **WHEN** `cli/zotero-bridge/release.json` records a build fingerprint different from current CLI build inputs
- **THEN** the release workflow fails before `npm run test:gate:release`

#### Scenario: Binary checksum is stale

- **WHEN** any restored `addon/bin` CLI binary differs from its `.sha256` sidecar or release manifest checksum
- **THEN** the release workflow fails before building the XPI

#### Scenario: Release gate remains unchanged

- **WHEN** release validation runs
- **THEN** CLI prebuild freshness is executed as a release workflow step
- **AND** it is not added to `test:gate:release`

### Requirement: Release pipeline governs Profile patch decisions
The Host Bridge release pipeline SHALL classify release inputs before rendering
the Zotero Librarian profile and SHALL instruct operators to bump the
Profile-owned patch once for public Profile content changes.

#### Scenario: Profile-only public change
- **WHEN** a release changes public Profile content without a CLI major/minor
  change
- **THEN** the pipeline SHALL require one Profile patch bump before rendering
  and publishing

#### Scenario: Generated-output drift only
- **WHEN** only generated Host Bridge or Profile output is stale
- **THEN** the pipeline SHALL not bump the Profile patch and SHALL require the
  generated output to be synchronized before publication

### Requirement: Surface publication rejects stale generated inputs

The unified release workflow SHALL verify committed CLI wrapper, Zotero Library Agent, Zotero Librarian Profile, Agent Control Contract, and release-set generated targets before external publication.

#### Scenario: Source was not rendered

- **WHEN** a semantic, command, workflow, profile, bundle, or release source does not match its committed generated output
- **THEN** the workflow SHALL fail before publishing any immutable surface target.

### Requirement: Host Bridge release pipeline SHALL publish the Zotero Library Agent bundle

The Host Bridge release pipeline SHALL publish `leike0813/zotero-library-agent-bundle` alongside the CLI bundle and Zotero Librarian profile through the same release set and unified workflow.

#### Scenario: Unified workflow publishes all surfaces

- **WHEN** the prepared release set and complete CLI prebuild identity pass verification
- **THEN** the workflow SHALL materialize the CLI bundle, Zotero Library Agent bundle, and Zotero Librarian profile from the same source commit and identity envelope.

#### Scenario: A surface cannot be materialized

- **WHEN** any one of the three candidate surfaces fails local manifest or content validation
- **THEN** no external surface target SHALL be created or advanced.

### Requirement: Release pipeline SHALL govern Zotero Library Agent bundle versions
The release pipeline SHALL classify public bundle changes and generated drift before rendering.

#### Scenario: Public bundle content changes
- **WHEN** a release changes public Zotero Library Agent bundle content without changing the CLI major/minor line
- **THEN** the pipeline SHALL require one bundle patch bump before rendering and publishing.

#### Scenario: Generated output is stale only
- **WHEN** only generated Zotero Library Agent output is stale
- **THEN** the pipeline SHALL require regeneration without changing the bundle patch.

### Requirement: Surface publication SHALL reject stale Zotero Library Agent inputs

The unified Host Bridge release workflow SHALL verify the committed Zotero Library Agent semantic sources, shared control facts, helper/schema inputs, generated bundle, version, and release-set envelope before external publication.

#### Scenario: Agent bundle source is not rendered

- **WHEN** semantic, shared, schema, helper, version, or release identity sources do not match generated bundle files
- **THEN** publication SHALL fail before any immutable or mutable external surface is updated.
### Requirement: Host Bridge releases SHALL publish one verifiable release set
The pipeline SHALL generate `host-bridge.release-set.v2` only after a complete content-addressed seven-platform prebuild exists. Its releaseSetId SHALL bind CLI identity and bytes plus all three surface identities and content digests.

#### Scenario: Binary input changed without a prebuild
- **WHEN** the current build fingerprint lacks a verified seven-platform prebuild set
- **THEN** preparation SHALL report `prebuild_required`
- **AND** SHALL NOT create a publishable release set.

#### Scenario: Candidate bytes or surface content differ
- **WHEN** any binary hash, aggregate, surface digest, repository, mutable ref, or CLI identity differs
- **THEN** release identity SHALL differ or validation SHALL fail before publication.

#### Scenario: Historical v1 receipt is inspected
- **WHEN** planning reads a historical complete v1 receipt
- **THEN** it MAY use it as read-only baseline evidence
- **AND** new dispatch SHALL require v2.

### Requirement: Host Bridge publication SHALL be recoverable and two-phase
The release controller SHALL persist a `host-bridge.release-receipt.v2` from publication start through immutable publication, mutable advancement, and source finalize.

#### Scenario: A later target fails
- **WHEN** an earlier immutable or mutable target succeeded and a later target fails
- **THEN** the receipt SHALL be partial or failed with per-target results
- **AND** it SHALL always be uploaded for recovery.

#### Scenario: Publication resumes
- **WHEN** the same releaseSetId is resumed
- **THEN** the controller SHALL verify and reuse matching remote tags and refs
- **AND** SHALL reject existing identities with different payload bytes.

#### Scenario: All completion conditions succeed
- **WHEN** all three immutable surfaces verify, mutable refs advance, and source main finalize succeeds
- **THEN** and only then SHALL the receipt be complete.

### Requirement: Maintainers SHALL prepare releases through one coordinator

The repository SHALL expose a read-only `release:host-bridge:plan` and a single `prepare:host-bridge-release` command. Planning SHALL compare merge-base state and the latest materialized release identity so clean feature checkouts, binary inputs, installers, each public surface, and generated-only drift are classified correctly. Preparation SHALL apply required component bumps once, render all governed targets, materialize the release set, and run unified validation.

#### Scenario: Clean feature checkout differs from main

- **WHEN** the working tree is clean but Host Bridge inputs differ from the merge base
- **THEN** the planner SHALL report the affected release components rather than treating the checkout as unchanged.

#### Scenario: Only generated output drift exists

- **WHEN** governed generated files differ from their sources without a public source digest change
- **THEN** preparation SHALL regenerate and verify them without bumping a component version.

#### Scenario: Exact CLI target is supplied

- **WHEN** preparation receives `--cli-version X.Y.Z`
- **THEN** it SHALL accept only the current, next patch, or next minor version
- **AND** it SHALL fail before writing when the requested version conflicts with the required release intent.

#### Scenario: Repository release gate requests Host Bridge completion

- **WHEN** the project release coordinator detects Host Bridge candidate changes
- **THEN** it SHALL accept completion evidence only from a complete receipt for the prepared `releaseSetId`.

### Requirement: Feature work SHALL render Host Bridge content without preparing a release

The repository SHALL expose version-neutral content render and check commands that generate the Agent Surface and three semantic surfaces without changing component versions, release manifests, Release Set identity, or publication state.

#### Scenario: Feature branch renders semantic content
- **WHEN** a developer runs `render:host-bridge-content`
- **THEN** the command SHALL render deterministic command descriptors and semantic guidance
- **AND** SHALL NOT update component version files, release-set files, or identity-bound distribution metadata.

#### Scenario: Feature branch checks semantic content
- **WHEN** a developer runs `check:host-bridge-content`
- **THEN** the command SHALL validate source ownership, generated drift, canonical command references, and effective semantic coverage
- **AND** MAY report a pending future release bump without requiring the bump to have occurred.

#### Scenario: Release preparation renders the full surface
- **WHEN** `prepare:host-bridge-release` runs after release intent is selected
- **THEN** the full surface renderer SHALL compose the same content renderer with version and release-identity materialization.

### Requirement: Host Bridge publication SHALL require an explicitly prepared accumulated release

Release planning SHALL compare the current source to the latest completed release receipt or committed completed release identity, and ordinary feature merges SHALL not publish Host Bridge surfaces.

#### Scenario: Multiple unreleased changes merge to main
- **WHEN** Host Bridge changes have accumulated since the latest completed receipt
- **THEN** the planner SHALL include all accumulated binary, installer, semantic, profile, generated, and release inputs in one plan.

#### Scenario: Ordinary feature content merges
- **WHEN** a push to `main` changes Host Bridge source or generated content without changing a prepared Release Set and component versions
- **THEN** the unified publication workflow SHALL not publish external surfaces.

#### Scenario: Maintainer prepares the accumulated release
- **WHEN** a maintainer supplies explicit release intent and reviews the generated release-preparation commit
- **THEN** version bumping, release-set materialization, full validation, and publication SHALL occur once for the accumulated source state
- **AND** CI SHALL not create a version self-commit.

#### Scenario: Prepared release is retried
- **WHEN** publication resumes through manual dispatch
- **THEN** the dispatch SHALL identify the existing `releaseSetId`
- **AND** the workflow SHALL reuse its immutable bytes rather than rebuilding under the same identity.

### Requirement: Release repositories SHALL use source-owned README guidance

Each Host Bridge release surface SHALL publish a root README rendered from its owned semantic source. Publishers and materializers SHALL consume that generated README rather than assembling independent prose.

#### Scenario: Content guidance changes
- **WHEN** a surface README semantic source changes
- **THEN** `render:host-bridge-content` SHALL update the generated README
- **AND** `check:host-bridge-content` SHALL detect stale or missing output without changing release identity.

#### Scenario: Three surfaces are materialized
- **WHEN** the unified coordinator materializes the CLI bundle, Library Agent bundle, and Librarian Profile
- **THEN** every release repository root SHALL contain its surface-owned README
- **AND** the README SHALL participate in that surface's public content digest.

### Requirement: Surface publication SHALL resolve one composition manifest
Render, validation, materialization, and release-set generation SHALL resolve the same canonical surface graph, version patches, component identities, and mount paths.

#### Scenario: Impact propagates through inheritance
- **WHEN** a lower-layer component changes
- **THEN** every extending surface is rematerialized and records the new inherited component digest

### Requirement: Surface payload identity SHALL use staged bytes
Each surface payload digest SHALL be computed from a normalized manifest of the final staged files. Generated release-set metadata SHALL NOT be embedded into and recursively hashed as part of the same payload.

#### Scenario: Source digest cannot hide materialization drift
- **WHEN** staged payload bytes differ while source path lists are unchanged
- **THEN** the payload digest changes and stale publication is rejected

### Requirement: Surface versions SHALL remain release-line bound
Each surface version SHALL be the current CLI major/minor plus a surface-owned patch. Exact CLI identity, transitive component digests, payload digest, and release-set identity SHALL be published alongside the human version.

#### Scenario: CLI patch changes inherited payload identity
- **WHEN** only the CLI patch changes
- **THEN** downstream human surface versions remain stable while their exact CLI and payload identities change without overwriting prior bytes

### Requirement: Host Bridge publication SHALL validate governed Skill contracts
The content gate SHALL structurally validate every Skill declared by the three surfaces before materialization and SHALL require semantic-surface review for minimum completeness, semantic-baseline parity, package-local uniqueness, reference coherence, and layer independence.

#### Scenario: Invalid Skill blocks release preparation
- **WHEN** a governed Skill has a long/missing trigger description, missing mandatory section, orphan reference, duplicated substantive prose, or generated target used as source
- **THEN** Host Bridge content validation fails before release dispatch can be prepared
