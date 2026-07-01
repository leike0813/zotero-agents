## MODIFIED Requirements

### Requirement: Release pipeline SHALL publish composed semantic and generated Host Bridge guidance

Host Bridge wrapper skill and Zotero Librarian profile release preparation SHALL
render both semantic instruction sources and generated surface sections before
publishing.

#### Scenario: Host Bridge CLI bundle is prepared

- **WHEN** the host-bridge-cli-bundle publication pipeline copies the wrapper
  skill
- **THEN** the copied package SHALL be the rendered output composed from wrapper
  semantic source and generated Host Bridge surface sections
- **AND** release checks SHALL fail if generated output is stale.

#### Scenario: Zotero Librarian profile is prepared

- **WHEN** the Zotero Librarian profile publication pipeline copies profile
  files
- **THEN** the profile SHALL be the rendered output composed from profile
  semantic source, generated Host Bridge reference, and generated workflow
  catalog reference
- **AND** release checks SHALL fail if semantic/generated output is stale.
