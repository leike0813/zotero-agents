## ADDED Requirements

### Requirement: Plugin SHALL bundle the exact Host Bridge Skill closure
The generated minimum-core and Generic Host Bridge surfaces SHALL be materialized as one plugin-owned bundle containing exactly the seven Skills resolved by surface inheritance. The bundle SHALL contain a machine-readable manifest that binds the CLI version, build fingerprint, command-catalog checksum, surface identities, runner contracts, every file's safe relative path, byte length, SHA-256 digest, and one aggregate digest.

#### Scenario: Renderer produces the plugin bundle
- **WHEN** maintainers render Host Bridge agent-facing surfaces
- **THEN** the plugin bundle contains one manifest and exactly the seven resolved Skill trees
- **AND** the old generated Host Bridge Skill directories under the Content Package source root are absent

#### Scenario: Bundle inventory is not exact
- **WHEN** a generated bundle contains a missing, additional, duplicate, traversal, or digest-mismatched entry
- **THEN** validation fails before the plugin can be built or released

### Requirement: Surface relocation SHALL preserve semantic parity
Relocating generated Skills SHALL preserve every source instruction, direct reference, asset, runner contract, and externally published surface byte. Relative baseline checks SHALL map the new plugin bundle root to the fixed baseline's former generated root and SHALL report zero unmapped, downgraded, unauthorized-dropped, and intra-package-duplicate semantic units.

#### Scenario: Relocated package is compared with baseline
- **WHEN** the materialized Skill validator compares the new bundle with the fixed pre-relocation commit
- **THEN** every governed file is compared against its former path
- **AND** the substantive-line, normalized-prose, reachability, and semantic-parity gates remain satisfied

