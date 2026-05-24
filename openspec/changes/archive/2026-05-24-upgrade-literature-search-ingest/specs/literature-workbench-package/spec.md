## ADDED Requirements

### Requirement: Literature search ingest is ACP interactive and context aware

`literature-search-ingest` SHALL support `auto`, `topic_expansion`,
`paper_seed_expansion`, and `targeted_ingest` search modes.

#### Scenario: User selects auto mode

- **WHEN** the workflow starts with `searchMode` omitted or set to `auto`
- **THEN** the skill SHALL compare the query against library/Synthesis context
  and perform an initial web lookup before selecting the effective mode.

#### Scenario: Exact new paper is found

- **WHEN** the initial lookup finds a highly matching single paper not present
  in the library
- **THEN** the skill SHALL use `targeted_ingest`
- **AND** user confirmation SHALL ingest that paper without an additional
  candidate expansion search.

#### Scenario: Seed paper expansion uses references artifacts

- **WHEN** the effective mode is `paper_seed_expansion`
- **THEN** the skill SHALL try to read the seed paper references/citation
  artifacts through Host Bridge synthesis commands before falling back to web
  search from seed metadata.

### Requirement: Literature search ingest performs legal public PDF best effort

The skill SHALL explicitly guide agents to search legal public PDF sources and
skip uncertain or restricted PDFs without blocking metadata ingest.

#### Scenario: Public PDF is uncertain

- **WHEN** a candidate PDF URL cannot be matched confidently to title, authors,
  or identifiers
- **THEN** the skill SHALL mark the PDF as skipped instead of attaching it.
