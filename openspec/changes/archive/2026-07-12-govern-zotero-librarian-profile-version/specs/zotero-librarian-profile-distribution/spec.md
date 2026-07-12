## ADDED Requirements

### Requirement: Profile version derives its release line from the CLI
The generated Zotero Librarian profile version SHALL use the recorded Host
Bridge CLI major and minor components and a Profile-owned patch component. The
Profile patch source SHALL be scoped to a CLI major/minor line; an unscoped new
CLI line SHALL resolve to patch zero.

#### Scenario: CLI patch changes
- **WHEN** the recorded CLI patch changes without a CLI major/minor change
- **THEN** the generated Profile version SHALL remain unchanged

#### Scenario: CLI release line changes
- **WHEN** the recorded CLI major or minor changes and no Profile patch exists
  for that line
- **THEN** the generated Profile version SHALL use that CLI major/minor and
  patch zero

### Requirement: Profile publication exposes version provenance
The generated Profile source manifest and standalone published manifest SHALL
identify both the resolved Profile version and the recorded CLI version.

#### Scenario: Profile is published
- **WHEN** the standalone Profile publisher creates its manifest
- **THEN** the manifest SHALL contain the resolved Profile version and the CLI
  version associated with the packaged binaries
