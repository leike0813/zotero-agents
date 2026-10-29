## ADDED Requirements

### Requirement: Windows ACP bridge builds SHALL carry source-bound evidence

The Windows build entry SHALL bind its output checksum and size to a content fingerprint of current Rust sources, Cargo manifests and lockfile, and build/package logic. It SHALL use locked dependencies and issue evidence only after successful compilation with unchanged inputs. Packaging SHALL verify and preserve this evidence.

#### Scenario: Successful build and package

- **WHEN** the Windows build succeeds and its inputs remain unchanged
- **THEN** the packaged executable, checksum sidecar and build record SHALL agree
- **AND** the record SHALL identify the supported target and source HEAD for traceability.

#### Scenario: Inputs change or build fails

- **WHEN** compilation fails or build inputs change during compilation
- **THEN** the entry SHALL fail without issuing new valid build evidence or replacing packaged assets.

#### Scenario: Standalone packaging receives an old binary

- **WHEN** local build evidence is missing, stale or inconsistent with the executable
- **THEN** packaging SHALL fail before replacing packaged assets
- **AND** it SHALL require a Windows rebuild rather than certifying the old executable against current source.

### Requirement: Windows ACP bridge freshness SHALL have a read-only command

The repository SHALL expose `check:acp-ws-bridge-freshness` on all development platforms. It SHALL return JSON and a nonzero exit status for absent or invalid evidence, stale build inputs, or inconsistent binary/checksum identity. Freshness SHALL depend on relevant content rather than HEAD or timestamps.

#### Scenario: Current source and verified output agree

- **WHEN** all recorded build inputs and executable/checksum identities match
- **THEN** the checker SHALL report success without rebuilding or modifying files.

#### Scenario: Relevant source changes

- **WHEN** an input is changed, added or removed after building
- **THEN** the checker SHALL fail with a structured diagnostic.

#### Scenario: Only unrelated work changes

- **WHEN** HEAD or unrelated repository files change without altering bridge build inputs
- **THEN** the checker SHALL retain successful freshness status.

### Requirement: Successful build preflight SHALL continue to one plugin build

Build preflight SHALL consume the bridge freshness command and require current evidence for every prerequisite. Ordinary successful invocation SHALL run the selected build command once, defaulting to `npm run build`. Explicit check-only/preparation-only requests SHALL retain their scope; an outer build workflow SHALL continue its existing command without duplicate or recursive builds.

#### Scenario: Ordinary preflight passes

- **WHEN** all required preparation checks pass
- **THEN** the agent SHALL run the selected plugin build without requesting an additional build instruction
- **AND** it SHALL verify build-owned help documentation after success.

#### Scenario: Preparation cannot complete

- **WHEN** any required component lacks current successful evidence
- **THEN** the agent SHALL report the remaining blocker and stop before the plugin build.

#### Scenario: Explicit limited scope or outer build

- **WHEN** the user requests only checking or preparation, or preflight is called within an existing build workflow
- **THEN** the agent SHALL honor that scope or continue the outer build command once respectively.
