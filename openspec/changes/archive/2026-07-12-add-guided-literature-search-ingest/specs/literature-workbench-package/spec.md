## MODIFIED Requirements

### Requirement: Literature search ingest is ACP interactive and context aware

`literature-search-ingest` SHALL support `auto`, `guided`, `topic_expansion`,
`paper_seed_expansion`, and `targeted_ingest` search modes. It SHALL resolve
each candidate before interactive confirmation.

#### Scenario: Blank auto query starts guided planning

- **WHEN** the workflow starts with a blank `query` and `searchMode` is omitted
  or `auto`
- **THEN** the skill SHALL ask focused questions until it has a minimum research
  goal
- **AND** it SHALL inspect Zotero/Synthesis context read-only before presenting
  a structured search brief
- **AND** it SHALL NOT perform web search, download, or Zotero writes before
  the user confirms that brief.

#### Scenario: Guided brief is confirmed

- **WHEN** a user confirms the guided search brief
- **THEN** the skill SHALL begin candidate search directly from that brief
- **AND** it SHALL NOT classify or map the work to `topic_expansion`,
  `paper_seed_expansion`, or `targeted_ingest`
- **AND** a completed result SHALL use `search_mode: "guided"`.

#### Scenario: Explicit legacy mode has no query

- **WHEN** `query` is blank and the user explicitly selects
  `topic_expansion`, `paper_seed_expansion`, or `targeted_ingest`
- **THEN** the skill SHALL ask for the minimum seed required by that selected
  mode
- **AND** it SHALL retain the selected mode.

#### Scenario: User selects non-blank auto mode

- **WHEN** the workflow starts with a non-blank `query` and `searchMode` is
  omitted or `auto`
- **THEN** the skill SHALL compare the query against library/Synthesis context
  and perform an initial web lookup before selecting the effective mode.

#### Scenario: Candidate has no resolved identifier

- **WHEN** a candidate has completed applicable identifier searches without a
  DOI, ISBN, arXiv, or PMID
- **THEN** the skill SHALL record `identifier_not_found`, authoritative metadata
  provenance, landing URL, and PDF attempt outcome before showing it
- **AND** it SHALL NOT admit a bare title or unverified search snippet.
