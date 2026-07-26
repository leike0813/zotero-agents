## ADDED Requirements

### Requirement: Literature search ingest SHALL persist one file per discovery candidate

During Stage 20, the main agent SHALL write each deduplicated candidate as an
independent JSON object under `runtime/candidates/`. A candidate file SHALL
contain `candidateId`, `title`, `tier`, and `payloadPath`, and MAY contain known
discovery metadata and evidence fields. Later evidence for the same direct work
SHALL update the existing file rather than create another candidate file.

#### Scenario: New candidate is written immediately

- **WHEN** Stage 20 identifies a new deduplicated candidate
- **THEN** the main agent SHALL allocate a stable candidate filename and
  payload path
- **AND** it SHALL write the complete candidate object before continuing the
  discovery round

#### Scenario: Existing candidate receives new evidence

- **WHEN** a later discovery attempt finds stronger evidence for the same direct
  work
- **THEN** the main agent SHALL update the existing candidate file
- **AND** it SHALL preserve the candidate's stable file pairing and identity

### Requirement: Literature search ingest SHALL use candidate files for Stage 30 review and Stage 40 handoff

Stage 30 SHALL render its review table from the candidate files and resolve the
user decision to candidate ids. After approval, Stage 40 SHALL pass one or more
approved candidate file paths to a subagent through `CANDIDATE_FILES_JSON`.

#### Scenario: Stage 30 projects candidate files

- **WHEN** the current discovery round reaches Stage 30
- **THEN** the main agent SHALL enumerate the current candidate files
- **AND** the review table SHALL use fields from those files
- **AND** the user decision SHALL resolve to unambiguous candidate ids

#### Scenario: Stage 40 delegates candidate files

- **WHEN** Stage 30 has approved candidate ids
- **THEN** the main agent SHALL pass the corresponding candidate file paths
- **AND** it SHALL NOT construct an aggregate candidate JSON or a separate
  output-path map

### Requirement: Candidate payload paths SHALL remain paired with their candidates

Each candidate file SHALL contain a unique writable `payloadPath` for that
candidate's single-paper Host payload. A subagent SHALL read the candidate file
and write only that candidate's payload to the embedded path.

#### Scenario: One subagent receives multiple candidate files

- **GIVEN** the main agent assigns multiple approved candidate paths to one
  subagent
- **WHEN** the subagent processes the assignment
- **THEN** it SHALL research each candidate independently
- **AND** it SHALL write each qualified paper to its own embedded `payloadPath`

#### Scenario: Main agent processes a candidate directly

- **WHEN** the main agent chooses not to delegate a candidate
- **THEN** it SHALL read the same candidate file and use its `payloadPath`
- **AND** it SHALL preserve the same per-paper Host payload contract

## MODIFIED Requirements

### Requirement: Literature search ingest SHALL use flexible research delegation with independent paper outputs

After Stage 30 approval, the main agent SHALL choose subagent grouping,
concurrency, dispatch timing, and waiting strategy. A subagent MAY receive one
or multiple approved candidate file paths. Every candidate SHALL retain an
independent identity decision and the writable `payloadPath` embedded in its
candidate file.

#### Scenario: Main agent groups several candidate files

- **GIVEN** several approved candidates require similar research
- **WHEN** the main agent delegates their candidate file paths to one subagent
- **THEN** the subagent SHALL process each candidate independently
- **AND** it SHALL use the `payloadPath` in that candidate's file

#### Scenario: Research is not delegated before scope approval

- **WHEN** Stage 30 has not approved an ingest scope
- **THEN** the main agent SHALL NOT delegate candidate metadata or PDF research
- **AND** no Host ingest payload SHALL be prepared

#### Scenario: Candidate scope remains stable

- **WHEN** a subagent researches an approved candidate file
- **THEN** it SHALL resolve that same direct bibliographic work
- **AND** it SHALL NOT replace it with a related work, another material type,
  or a materially different version

### Requirement: The static research prompt SHALL have one source of truth in SKILL.md

The full subagent contract SHALL be written in
`skills_builtin/literature-search-ingest/SKILL.md`. Dynamic context SHALL
contain `CANDIDATE_FILES_JSON`, a JSON array of one or more approved candidate
file paths, and the selected collection. Each candidate file SHALL contain its
candidate identity and writable `payloadPath`. The prompt SHALL require
metadata resolution, direct-work identity, the three-route PDF probe, canonical
fields, file output, and completion of the assigned candidate files.

#### Scenario: Main agent supplies candidate file paths

- **WHEN** the main agent constructs a subagent dispatch
- **THEN** it SHALL use the static prompt from `SKILL.md`
- **AND** it SHALL provide the chosen candidate file paths as dynamic context
- **AND** the worker SHALL read each file's `payloadPath`

#### Scenario: Worker returns a structured research report

- **WHEN** a subagent finishes its assigned candidate files
- **THEN** it SHALL return one `literature_search_research_report` JSON object in
  stdout
- **AND** `candidateResults` SHALL contain exactly one entry for each assigned
  candidate file
- **AND** each entry SHALL reuse that file's candidate id, candidate path, and
  payload path
- **AND** each entry SHALL report metadata status, paper-level PDF probe status,
  compact metadata sources, the applicable three-route PDF results, and
  uncertainties
- **AND** the report SHALL NOT contain a Host payload, receipt, mutation result,
  or final workflow output

#### Scenario: Main agent projects research results into the ledger

- **WHEN** the main agent receives a structured research report
- **THEN** it MAY reuse the shared candidate result fields in the search ledger
- **AND** it SHALL derive receipt, ingest, item, attachment, and final curation
  fields from payload inspection and Host results
- **AND** a missing or malformed report for one candidate SHALL NOT block another
  candidate's valid payload
