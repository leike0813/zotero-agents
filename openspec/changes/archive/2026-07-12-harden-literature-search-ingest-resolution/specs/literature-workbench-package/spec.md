## MODIFIED Requirements

### Requirement: Literature search ingest is ACP interactive and context aware

`literature-search-ingest` SHALL support `auto`, `topic_expansion`,
`paper_seed_expansion`, and `targeted_ingest` search modes, and SHALL resolve
each candidate before interactive confirmation.

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

#### Scenario: Candidate has no resolved identifier

- **WHEN** a candidate has completed applicable identifier searches without a
  DOI, ISBN, arXiv, or PMID
- **THEN** the skill SHALL record `identifier_not_found`, authoritative metadata
  provenance, landing URL, and PDF attempt outcome before showing it
- **AND** it SHALL NOT admit a bare title or unverified search snippet
- **AND** it MAY ingest the candidate only after the user confirms the disclosed
  record.

#### Scenario: Seed paper expansion uses references artifacts

- **WHEN** the effective mode is `paper_seed_expansion`
- **THEN** the skill SHALL try to read the seed paper references/citation
  artifacts through Host Bridge synthesis commands before falling back to web
  search from seed metadata.

### Requirement: Literature search ingest performs legal public PDF best effort

The skill SHALL explicitly guide agents to resolve identifiers and authoritative
metadata before searching legal public PDF sources, and SHALL skip uncertain or
restricted PDFs without blocking eligible metadata ingest.

#### Scenario: Public PDF is uncertain

- **WHEN** a candidate PDF URL cannot be matched confidently to title, authors,
  or identifiers
- **THEN** the skill SHALL mark the PDF as skipped instead of attaching it.

### Requirement: Literature search ingest routes Chinese literature to applicable sources

The skill SHALL use additional Chinese metadata sources when the query or
candidate indicates Chinese literature.

#### Scenario: Chinese journal, thesis, or book candidate

- **WHEN** a Chinese literature candidate is resolved
- **THEN** the skill SHALL add China DOI, CNKI, Wanfang, official publishers,
  institutions, or repositories as applicable
- **AND** it SHALL add PDC and library catalogs for Chinese books or ISBNs
- **AND** it SHALL use only public metadata, landing pages, and legally public
  PDFs without login, proxy, or restricted full-text access.
