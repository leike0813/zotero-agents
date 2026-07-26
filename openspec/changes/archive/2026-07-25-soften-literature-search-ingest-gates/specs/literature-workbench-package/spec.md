## MODIFIED Requirements

### Requirement: Literature search ingest is ACP interactive and context aware

`literature-search-ingest` SHALL run only as an interactive SkillRunner Skill
and SHALL support `auto`, `guided`, `topic_expansion`,
`paper_seed_expansion`, and `targeted_ingest` search modes. It SHALL require
user approval of the search plan before external discovery and user approval of
the ingest scope before selected-candidate research or Zotero mutation. After
scope approval it SHALL automatically complete metadata resolution,
direct-work identity verification, public-PDF probing, per-paper payload
preparation, and serial ingest without another waiting state.

#### Scenario: Blank auto query starts guided planning

- **WHEN** the workflow starts with a blank `query` and `searchMode` is omitted
  or `auto`
- **THEN** the skill SHALL ask focused questions until it has a minimum research
  goal
- **AND** it SHALL inspect Zotero/Synthesis context read-only before presenting
  a structured search brief
- **AND** it SHALL NOT perform web search, download, or Zotero writes before
  the user confirms that brief

#### Scenario: Guided brief is confirmed

- **WHEN** a user confirms the guided search brief
- **THEN** the skill SHALL begin candidate search directly from that brief
- **AND** it SHALL preserve `search_mode: "guided"` in a completed result

#### Scenario: Explicit mode has no query

- **WHEN** `query` is blank and the user explicitly selects
  `topic_expansion`, `paper_seed_expansion`, or `targeted_ingest`
- **THEN** the skill SHALL ask for the minimum seed required by that mode
- **AND** it SHALL retain the selected mode

#### Scenario: User selects non-blank auto mode

- **WHEN** the workflow starts with a non-blank `query` and `searchMode` is
  omitted or `auto`
- **THEN** the skill SHALL compare the query against read-only
  library/Synthesis context to recommend an effective mode and search brief
- **AND** it SHALL NOT perform external discovery until the user approves that
  brief

#### Scenario: User approves ingest scope

- **WHEN** the user approves a set of ingestible candidate ids after discovery
- **THEN** the skill SHALL treat that decision as authorization to research and
  ingest those same direct bibliographic works
- **AND** it SHALL continue through metadata resolution, legal public-PDF
  probing, payload preparation, and per-paper mutation
- **AND** it SHALL NOT enter another waiting state

#### Scenario: User requests focused discovery expansion

- **WHEN** Stage 30 receives an expansion request for the current discovery
  round
- **THEN** the skill SHALL retain the accumulated candidate set and accepted
  evidence while returning to Stage 20
- **AND** it SHALL return to the same ingest-scope decision after the expanded
  round

#### Scenario: Expanded discovery omits an accepted candidate

- **WHEN** a later discovery round omits a candidate accepted in an earlier
  round without evidence-backed reclassification
- **THEN** the skill SHALL keep that candidate in the cumulative set

#### Scenario: User cancels at a decision stage

- **WHEN** the user cancels at Stage 10 or Stage 30
- **THEN** the workflow SHALL return the canceled kind, status, reason, and
  message required by `output.schema.json`

#### Scenario: Selected candidate fails direct-work identity

- **WHEN** post-selection research cannot verify that a candidate is the same
  direct bibliographic work or cannot resolve a material version conflict
- **THEN** the workflow SHALL record that candidate as `not_attempted`
- **AND** it SHALL continue processing the remaining approved candidates
- **AND** it SHALL NOT substitute a different work or request a replacement

#### Scenario: Targeted ingest identifies one exact record

- **WHEN** the user selects `targeted_ingest`
- **THEN** the skill SHALL locate and present only the requested record with its
  identity, authoritative landing page, metadata match, and duplicate status
- **AND** after scope approval it SHALL research and ingest that record without
  expanding to related literature

#### Scenario: Candidate has no resolved identifier

- **WHEN** a traceable candidate has completed applicable identifier searches
  without a DOI, ISBN, arXiv, or PMID
- **THEN** the skill SHALL retain authoritative metadata provenance, landing
  URL, and PDF outcome
- **AND** it MAY classify the candidate as `needs_curation`
- **AND** it SHALL retain a bare title or unverified snippet only as
  non-ingestible `lead_only` evidence

### Requirement: Literature search ingest performs legal public PDF best effort

The skill SHALL resolve direct-work identity and authoritative metadata before
accepting a legal public PDF. It SHALL execute the authoritative landing-page,
open-access, and public web-search routes for each approved paper, stopping
later routes only after an earlier route produces a verified matching PDF.
Failure to find a PDF SHALL NOT block otherwise eligible metadata ingest.

#### Scenario: Public PDF is uncertain

- **WHEN** a candidate PDF cannot be matched confidently to the direct work
- **THEN** the skill SHALL omit that PDF from the Host payload
- **AND** it SHALL preserve the eligible metadata-only ingest path

#### Scenario: No public PDF is found

- **WHEN** all applicable PDF routes complete without a verified public PDF
- **THEN** the skill SHALL prepare a metadata-only Host payload
- **AND** it MAY request landing-page attachment through the existing Host
  field

### Requirement: Literature search ingest SHALL preserve original-script ingest metadata

Literature Search Ingest SHALL prefer authoritative metadata in the work's
original script, preserve complete verified creator lists, and keep Zotero
field roles semantically correct while preparing each direct Host payload.

#### Scenario: Original-script title is authoritative

- **WHEN** an authoritative record supplies the title in the work's original
  script
- **THEN** the Host payload SHALL preserve that title
- **AND** a translated or romanized title SHALL NOT replace it

#### Scenario: Creator list is incomplete

- **WHEN** the available evidence cannot verify a complete creator list
- **THEN** the candidate SHALL remain `needs_curation` or `not_attempted`
- **AND** the skill SHALL NOT present a partial list as complete

### Requirement: Literature search ingest SHALL require three public-PDF routes

Every approved direct work SHALL receive ordered PDF research through its
authoritative landing page, applicable open-access sources, and public web
search. A later route MAY be marked `skipped_after_verified_pdf` only when an
earlier route has already produced a verified legal matching PDF.

#### Scenario: Earlier route finds a verified PDF

- **WHEN** the authoritative landing page or open-access route produces a
  verified public PDF
- **THEN** later routes MAY be marked `skipped_after_verified_pdf`

#### Scenario: No earlier route finds a PDF

- **WHEN** no completed earlier route has produced a verified public PDF
- **THEN** every remaining route SHALL be attempted before the paper is treated
  as missing a PDF

## REMOVED Requirements

### Requirement: Literature search ingest SHALL enforce file-backed stage gates

**Reason**: Stage ordering and per-paper readiness are represented by the
Skill's semantic completion conditions rather than a package-local action
state machine.

**Migration**: Stage 10/30 decisions, mandatory metadata and PDF work, serial
mutation, receipts, ledger, and final output remain requirements in this
capability and `literature-workbench-workflows`.
