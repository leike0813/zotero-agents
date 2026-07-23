## MODIFIED Requirements

### Requirement: Literature search ingest is ACP interactive and context aware

`literature-search-ingest` SHALL run only as an interactive SkillRunner Skill
and SHALL support `auto`, `guided`, `topic_expansion`,
`paper_seed_expansion`, and `targeted_ingest` search modes. It SHALL require
user approval of the search plan before external discovery and user approval of
the ingest scope before selected-candidate enrichment or Zotero mutation. After
ingest-scope approval, it SHALL automatically perform metadata resolution, PDF
probing, typed payload preparation, and per-paper ingest without another waiting
state.

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

#### Scenario: Explicit mode has no query

- **WHEN** `query` is blank and the user explicitly selects
  `topic_expansion`, `paper_seed_expansion`, or `targeted_ingest`
- **THEN** the skill SHALL ask for the minimum seed required by that selected
  mode
- **AND** it SHALL retain the selected mode.

#### Scenario: User selects non-blank auto mode

- **WHEN** the workflow starts with a non-blank `query` and `searchMode` is
  omitted or `auto`
- **THEN** the skill SHALL compare the query against read-only
  library/Synthesis context to recommend an effective mode and search brief
- **AND** it SHALL NOT perform external discovery until the user approves that
  brief.

#### Scenario: User approves ingest scope

- **WHEN** the user approves a set of ingestible candidate ids after discovery
- **THEN** the skill SHALL treat that decision as authorization to resolve,
  probe, and ingest those same direct bibliographic works
- **AND** it SHALL automatically continue through metadata resolution, legal
  public-PDF probing, payload preparation, and per-paper mutation
- **AND** it SHALL NOT enter another waiting state.

#### Scenario: User requests focused discovery expansion

- **WHEN** Stage 30 receives an expansion request for the current discovery
  round
- **THEN** the gate SHALL increment the discovery round and return to Stage 20
- **AND** the next discovery payload SHALL retain the accumulated candidate set
  and accepted evidence
- **AND** the workflow SHALL return to the same ingest-scope decision after the
  expanded round.

#### Scenario: Expanded discovery drops an accepted candidate

- **WHEN** a later discovery round omits a candidate accepted in an earlier
  round without an evidence-backed reclassification
- **THEN** the runtime SHALL reject the cumulative discovery payload
- **AND** it SHALL keep the workflow at the current discovery round.

#### Scenario: User cancels at a decision stage

- **WHEN** the user cancels at Stage 10 or Stage 30
- **THEN** the runtime SHALL enter a canceled terminal state with a stable
  reason and message
- **AND** the gate SHALL return `return_final_output` with canceled kind and
  status.

#### Scenario: Selected candidate fails metadata identity gate

- **WHEN** post-selection resolution cannot verify that a candidate is the same
  direct bibliographic work or cannot resolve a material version conflict
- **THEN** the workflow SHALL record that candidate as `not_attempted`
- **AND** it SHALL continue processing the remaining approved candidates
- **AND** it SHALL NOT substitute a different work or request a replacement.

#### Scenario: Targeted ingest identifies one exact record

- **WHEN** the user selects `targeted_ingest`
- **THEN** the skill SHALL locate and present only the requested record with its
  identifier, authoritative landing page, metadata match, and library-duplicate
  status
- **AND** after ingest-scope approval it SHALL resolve metadata, probe legal
  public PDFs, and ingest that record without expanding to related literature.

#### Scenario: Candidate has no resolved identifier

- **WHEN** a candidate has completed applicable identifier searches without a
  DOI, ISBN, arXiv, or PMID
- **THEN** the skill SHALL record `identifier_not_found`, authoritative metadata
  provenance, landing URL, and PDF attempt outcome before ingesting the selected
  candidate
- **AND** it MAY show the traceable candidate as `needs_curation`
- **AND** it SHALL retain a bare title or unverified search snippet only as
  non-ingestible `lead_only` evidence.

## ADDED Requirements

### Requirement: Literature search ingest SHALL enforce file-backed stage gates

The Skill SHALL use a package-local gate runtime to enforce stage order and
per-candidate completion without using SQLite or treating the search ledger as a
workflow state database.

#### Scenario: Agent attempts to skip metadata resolution

- **WHEN** an approved candidate lacks a terminal metadata receipt
- **THEN** the gate SHALL refuse to advance to PDF probing or ingest preparation.

#### Scenario: Agent attempts to skip PDF probing

- **WHEN** an approved and metadata-qualified candidate lacks an outcome for an
  applicable PDF route family
- **THEN** the gate SHALL refuse to prepare or execute its ingest payload.

#### Scenario: PDF attempts find no usable file

- **WHEN** every applicable PDF route has a terminal attempt outcome but no
  public identity-matched PDF is found
- **THEN** the gate SHALL record the candidate PDF status as `missing`
- **AND** it SHALL allow eligible metadata ingest to continue.

#### Scenario: Context resumes during the interactive run

- **WHEN** execution resumes after context compression
- **THEN** the agent SHALL obtain the current stage and next action from the
  gate state
- **AND** it SHALL NOT infer completed stages from conversation memory.

#### Scenario: Gate reports a legal next action

- **WHEN** the agent runs the initial gate
- **THEN** the response SHALL include the current stage, real `next_action`,
  legal `allowed_actions`, discovery round, stage-specific `required_reads`,
  and recovery packet
- **AND** every accepted state-changing action SHALL require rerunning the
  initial gate.

#### Scenario: Action payload contains an unknown field or enum

- **WHEN** an agent-authored action does not match exactly one strict action
  schema branch
- **THEN** schema validation SHALL fail before state mutation.

#### Scenario: Terminal gate is reached

- **WHEN** all approved candidates are terminal or a legal cancellation occurs
- **THEN** the gate SHALL return `return_final_output`
- **AND** it SHALL distinguish completed and canceled kind/status pairs.

### Requirement: Literature search ingest SHALL preserve original-script ingest metadata

Selected-candidate metadata SHALL preserve the direct work's authoritative
original-script identity and SHALL keep translations, romanizations, and
containers in separate roles.

#### Scenario: Chinese original work has incomplete native creators

- **WHEN** an authoritative source verifies the Chinese original title but not
  the complete Chinese-character creator list
- **THEN** the ingest metadata SHALL retain the Chinese title
- **AND** it SHALL use an empty creator replacement list
- **AND** it SHALL mark the record as requiring metadata curation instead of
  writing English or romanized creators.

#### Scenario: Translation is available for a Chinese original work

- **WHEN** a translated or romanized title is found for a Chinese original work
- **THEN** the workflow SHALL retain it only as alternate or matching evidence
- **AND** it SHALL NOT create a translated or bilingual primary title.

### Requirement: Literature search ingest SHALL require three public-PDF routes

Every metadata-qualified candidate SHALL have one actual terminal attempt for
the authoritative-landing, open-access, and public-web-search routes before
payload preparation.

#### Scenario: A PDF route is omitted

- **WHEN** a PDF payload omits any hard route
- **THEN** the runtime SHALL reject the payload and remain at Stage 50.

#### Scenario: A public identity-matched PDF is found

- **WHEN** a route returns a reachable legal `application/pdf` response for the
  same direct work
- **THEN** the runtime MAY select that URL for typed ingest
- **AND** all three route attempts SHALL still be recorded.

#### Scenario: All PDF routes terminate without a usable file

- **WHEN** every route records `not_found`, `restricted`, `unavailable`,
  `mismatch`, or `error`
- **THEN** the candidate SHALL receive PDF status `missing`
- **AND** safe metadata ingest SHALL continue without `pdfUrl`.
