## MODIFIED Requirements

### Requirement: Literature search ingest is ACP interactive and context aware

`literature-search-ingest` SHALL run in interactive mode and SHALL support
`auto`, `guided`, `topic_expansion`, `paper_seed_expansion`, and
`targeted_ingest` search modes. It SHALL require user approval of the search
plan before external discovery and user approval of the ingest scope before
selected-candidate enrichment or Zotero mutation. After ingest-scope approval,
it SHALL automatically perform metadata resolution, PDF probing, typed payload
preparation, and per-paper ingest without another waiting state.

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
- **AND** the completed runtime state SHALL retain `guided` as the effective
  search mode.

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

- **WHEN** Stage 30 receives an expansion request
- **THEN** the gate SHALL increment the discovery round and return to Stage 20
- **AND** the next discovery payload SHALL add a delta to the accumulated
  candidate set and accepted evidence
- **AND** the workflow SHALL return to the same ingest-scope decision after the
  expanded round.

#### Scenario: Expanded discovery updates cumulative evidence

- **WHEN** a later discovery round submits new candidates or evidence-backed
  updates
- **THEN** the runtime SHALL merge the delta into the accumulated candidate set
- **AND** it SHALL preserve every previously accepted candidate and evidence
  record
- **AND** it SHALL reject an update that changes a candidate's direct-work
  identity.

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
- **THEN** the skill SHALL retain authoritative metadata provenance, landing
  URL, and PDF attempt outcome before ingesting the selected candidate
- **AND** it MAY classify the traceable candidate as `needs_curation`
- **AND** it SHALL retain a bare title or unverified search snippet only as
  non-ingestible `lead_only` evidence.

### Requirement: Literature search ingest SHALL enforce file-backed stage gates

The Skill SHALL use a package-local gate runtime to enforce stage order,
normalize semantic agent payloads, and complete per-candidate processing without
using SQLite or treating the search ledger as a workflow state database.

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
  recovery packet, and the current payload schema/template/enum contract
- **AND** every accepted state-changing action SHALL require rerunning the
  initial gate.

#### Scenario: Agent omits gate-known context

- **WHEN** the agent submits a legal semantic payload for the current stage
- **THEN** the runtime SHALL bind the current action, discovery round, candidate,
  payload path, and accepted hashes
- **AND** it SHALL derive fixed policies, identity keys, counts, and receipt
  bindings rather than requiring the agent to repeat them.

#### Scenario: Action payload contains an unknown field or enum

- **WHEN** an agent-authored payload does not match exactly one strict schema
  branch
- **THEN** schema validation SHALL fail before state mutation.

#### Scenario: Terminal gate is reached

- **WHEN** all approved candidates are terminal or a legal cancellation occurs
- **THEN** the runtime SHALL write the compact ledger and construct the final
  output from accepted state and receipts
- **AND** the gate SHALL return `return_final_output` with that complete output
- **AND** it SHALL distinguish completed and canceled kind/status pairs.

## ADDED Requirements

### Requirement: Literature search ingest SHALL expose a minimal completed output

The completed output SHALL summarize the run without repeating discovery,
metadata, PDF, or recovery evidence that is already available in accepted
payloads and the compact ledger.

#### Scenario: Created or existing item is returned

- **WHEN** an approved candidate completes with `created` or `existing`
- **THEN** its outcome SHALL contain only `title`, `ingestStatus`, `itemRef`,
  `pdfStatus`, and `needsCuration`
- **AND** `itemRef` SHALL contain only the positive Zotero item `id`.

#### Scenario: Failed or not-attempted item is returned

- **WHEN** an approved candidate completes with `failed` or `not_attempted`
- **THEN** its outcome SHALL contain only `title` and `ingestStatus`.

#### Scenario: Completed counts are generated

- **WHEN** the runtime constructs completed output
- **THEN** the output SHALL include discovered, selected, created, existing,
  failed, and not-attempted counts
- **AND** selected count SHALL equal the number of outcomes
- **AND** terminal-status counts SHALL sum to selected count.

#### Scenario: Detailed audit information is needed

- **WHEN** a caller needs identifiers, evidence paths, hashes, reasons, or Host
  receipt summaries
- **THEN** the completed output SHALL point to `result/search-ledger.json`
- **AND** it SHALL NOT duplicate those details in every outcome.

### Requirement: Literature search ingest SHALL bind raw Host receipts safely

The runtime SHALL bind an exact Host response to the gate-issued receipt path,
current candidate, and immutable prepared payload without requiring the agent to
copy those control values into a receipt wrapper.

#### Scenario: Raw Host response is submitted

- **WHEN** Stage 70 receives exact Host JSON at the gate-issued receipt path
- **THEN** the runtime SHALL associate it with the current candidate and
  prepared-payload hash
- **AND** it SHALL derive created, existing, failed, item, and attachment status
  from that response.

#### Scenario: Receipt is reused for another candidate

- **WHEN** an accepted receipt hash or inconsistent Zotero item id is submitted
  for another candidate
- **THEN** the runtime SHALL reject the receipt without advancing state.

#### Scenario: Host mutation cannot start

- **WHEN** the agent records `host_unavailable`, `approval_denied`, or
  `execution_blocked` with a non-empty message
- **THEN** the runtime SHALL bind the failure to the current candidate
- **AND** it SHALL enter canceled terminal state without requiring a receipt
  wrapper.
