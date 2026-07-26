## ADDED Requirements

### Requirement: Semantic CLI reads SHALL expose their owned continuation controls
Every semantic CLI command mapped to a cursor or offset boundary SHALL expose the
corresponding `--cursor`/`--limit` or `--offset`/`--max-chars` arguments and pass them
to its owned endpoint or capability. `call` SHALL NOT be documented or accepted as a
way to bypass the semantic command's output boundary.

#### Scenario: Agent follows a cursor page
- **WHEN** a semantic command returns a non-empty `nextCursor`
- **THEN** the same command accepts that value through `--cursor`
- **AND** preserves the original filters while requesting the next page.

### Requirement: Surface search SHALL return compact matches
`surface search` SHALL return only command identity, summary, category, danger, and
match reasons. It SHALL default to 10 matches and reject or clamp limits above 20.

#### Scenario: Agent searches by intent
- **WHEN** a search matches a command
- **THEN** the result does not embed the complete command descriptor
- **AND** directs full contract inspection to `surface describe`.
