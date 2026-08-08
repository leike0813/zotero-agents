## ADDED Requirements

### Requirement: Plugin release SHALL verify the matching complete Host Bridge release set
A plugin release that bundles Host Bridge Skills and CLI assets SHALL require a complete Host Bridge receipt matching its source and release identities. The release SHALL verify the built XPI contains the exact manifest-declared seven-Skill inventory, byte digests, CLI identity, seven platform binaries, sidecars, and release manifest before publication.

#### Scenario: Matching receipt is absent
- **WHEN** plugin release preparation or publication cannot resolve a matching complete Host Bridge receipt
- **THEN** the plugin release is blocked before publication

#### Scenario: Built XPI drifts from the bundle manifest
- **WHEN** the built XPI has a missing, extra, duplicate, digest-mismatched, traversal, or CLI-identity-mismatched Host Bridge asset
- **THEN** the plugin release is blocked

### Requirement: Host Bridge-only plugin changes SHALL not require Content Package release
Changes confined to the plugin-owned Host Bridge Skill bundle or XPI verification SHALL be classified as plugin/Host Bridge release candidates and SHALL not independently require a Content Package release.

#### Scenario: Change touches only bundled Host Bridge assets
- **WHEN** release coordination evaluates a change limited to the addon Host Bridge bundle and its plugin-side consumers
- **THEN** it requires the applicable plugin and Host Bridge gates but not Content Package publication
