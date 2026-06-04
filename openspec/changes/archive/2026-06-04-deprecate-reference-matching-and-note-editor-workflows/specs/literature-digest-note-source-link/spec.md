## MODIFIED Requirements

### Requirement: Obsidian Template Projection SHALL Include Source And Locator

Literature Digest Obsidian templates SHALL project references metadata including `Source` and `Locator`, aligned with canonical reference-note ordering, and SHALL NOT render a per-reference Citekey column.

#### Scenario: Render references in zt-note template

- **WHEN** `references-json` payload includes optional source/locator fields
- **THEN** `zt-note.eta` SHALL render references table columns in order:
  `#`, `Year`, `Title`, `Authors`, `Source`, `Locator`
- **AND** `Source` and `Locator` values SHALL follow canonical mapping rules.

#### Scenario: Render references in zt-field template

- **WHEN** `references-json` payload includes optional source/locator fields
- **THEN** `zt-field.eta` SHALL include `Source` and `Locator` in each rendered references row
- **AND** per-row segment order SHALL follow:
  `Year | Title | Authors | Source | Locator`.
