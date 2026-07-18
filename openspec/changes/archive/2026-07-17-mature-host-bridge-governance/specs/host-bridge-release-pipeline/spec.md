## MODIFIED Requirements

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

#### Scenario: Packaged fingerprint is stale

- **WHEN** restored or built binaries do not match the prepared fingerprint and checksum set
- **THEN** publication SHALL fail before creating or advancing any surface target.

### Requirement: Surface Publishing Reuses Latest Prebuilds

Host Bridge surface publication SHALL restore the immutable CLI prebuild set named by the prepared release set when no CLI build is required. It SHALL not select prebuilds by a mutable latest pointer or SemVer alone.

#### Scenario: Surface-only publish

- **WHEN** public surface content changes without CLI binary input changes
- **THEN** the unified workflow SHALL restore the release set's exact CLI version, build fingerprint, command catalog checksum, binary aggregate, and seven binaries
- **AND** it SHALL publish all three surfaces without running the Rust build matrix.

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

### Requirement: Surface publication SHALL reject stale Zotero Library Agent inputs

The unified Host Bridge release workflow SHALL verify the committed Zotero Library Agent semantic sources, shared control facts, helper/schema inputs, generated bundle, version, and release-set envelope before external publication.

#### Scenario: Agent bundle source is not rendered

- **WHEN** semantic, shared, schema, helper, version, or release identity sources do not match generated bundle files
- **THEN** publication SHALL fail before any immutable or mutable external surface is updated.

### Requirement: Host Bridge releases SHALL publish one verifiable release set

The release pipeline SHALL materialize the CLI bundle, Zotero Library Agent bundle, and Zotero Librarian profile from one deterministic `host-bridge.release-set.v1` identity. Every surface manifest SHALL carry the same `releaseSetId`, source commit, CLI version, build fingerprint, command catalog checksum, binary aggregate checksum, and seven-platform binary set, plus its owned component version and content digest.

#### Scenario: Surface identities differ

- **WHEN** a candidate surface has the expected CLI SemVer but a different fingerprint, command catalog checksum, binary aggregate, source commit, or release-set identifier
- **THEN** publication SHALL fail before any mutable branch is advanced.

#### Scenario: CLI manifest names a missing file

- **WHEN** a surface manifest references a CLI release manifest or artifact that is not included in that surface
- **THEN** materialization SHALL fail before publication.

### Requirement: Host Bridge publication SHALL be recoverable and two-phase

The release pipeline SHALL publish immutable surface tags first, verify all three remote manifests by reading them back, and advance mutable branches only after every immutable surface is valid. It SHALL emit a `host-bridge.release-receipt.v1` recording target status, immutable commits, mutable pointer results, and overall completion. Recovery SHALL resume the same `releaseSetId` without rebuilding or overwriting immutable bytes.

#### Scenario: A later surface fails

- **WHEN** one or more immutable surfaces are already published and a later surface fails
- **THEN** no mutable latest pointer SHALL advance
- **AND** a retry with the same `releaseSetId` SHALL reuse verified immutable targets.

#### Scenario: Recovery proposes different bytes

- **WHEN** a retry would associate an existing component version or immutable target with different bytes
- **THEN** recovery SHALL fail and require a new prepared release identity.

#### Scenario: Every remote manifest verifies

- **WHEN** all three immutable manifests match the prepared release set
- **THEN** the workflow SHALL advance mutable pointers and emit a receipt with `status: complete`.

### Requirement: Maintainers SHALL prepare releases through one coordinator

The repository SHALL expose a read-only `release:host-bridge:plan` and a single `prepare:host-bridge-release` command. Planning SHALL compare merge-base state and the latest materialized release identity so clean feature checkouts, binary inputs, installers, each public surface, and generated-only drift are classified correctly. Preparation SHALL apply required component bumps once, render all governed targets, materialize the release set, and run unified validation.

#### Scenario: Clean feature checkout differs from main

- **WHEN** the working tree is clean but Host Bridge inputs differ from the merge base
- **THEN** the planner SHALL report the affected release components rather than treating the checkout as unchanged.

#### Scenario: Only generated output drift exists

- **WHEN** governed generated files differ from their sources without a public source digest change
- **THEN** preparation SHALL regenerate and verify them without bumping a component version.

#### Scenario: Repository release gate requests Host Bridge completion

- **WHEN** the project release coordinator detects Host Bridge candidate changes
- **THEN** it SHALL accept completion evidence only from a complete receipt for the prepared `releaseSetId`.
