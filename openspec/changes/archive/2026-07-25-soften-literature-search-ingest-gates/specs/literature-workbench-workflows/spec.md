## ADDED Requirements

### Requirement: Literature search ingest SHALL use flexible research delegation with independent paper outputs

After Stage 30 approval, the main agent SHALL choose subagent grouping,
concurrency, dispatch timing, and waiting strategy. A subagent MAY receive one
or multiple approved candidates. Every candidate SHALL retain an independent
identity decision and writable output path.

#### Scenario: Main agent groups several candidates

- **GIVEN** several approved candidates require similar research
- **WHEN** the main agent delegates them to one subagent
- **THEN** the subagent SHALL process each candidate independently
- **AND** it SHALL use the per-paper output path supplied for that candidate

#### Scenario: Research is not delegated before scope approval

- **WHEN** Stage 30 has not approved an ingest scope
- **THEN** the main agent SHALL NOT delegate candidate metadata or PDF research
- **AND** no Host ingest payload SHALL be prepared

#### Scenario: Candidate scope remains stable

- **WHEN** a subagent researches an approved candidate
- **THEN** it SHALL resolve that same direct bibliographic work
- **AND** it SHALL NOT replace it with a related work, another material type,
  or a materially different version

### Requirement: The static research prompt SHALL have one source of truth in SKILL.md

The full subagent contract SHALL be written in
`skills_builtin/literature-search-ingest/SKILL.md`. Dynamic context SHALL
contain the selected candidate data and one writable Host-payload path per
candidate. The prompt SHALL require metadata resolution, direct-work identity,
the three-route PDF probe, canonical fields, file output, and completion of the
assigned candidate set.

#### Scenario: Main agent supplies a dynamic candidate set

- **WHEN** the main agent constructs a subagent dispatch
- **THEN** it SHALL use the static prompt from `SKILL.md`
- **AND** it SHALL provide the chosen candidates and their output paths as
  dynamic context

#### Scenario: Worker reports optional audit details

- **WHEN** a subagent has useful source, route, or uncertainty details
- **THEN** it MAY report them in stdout
- **AND** the main agent MAY summarize them in an internal workspace audit
- **AND** audit collection SHALL NOT block a valid paper payload or change final
  output

### Requirement: Each metadata-qualified paper SHALL produce one direct Host ingest payload

For each metadata-qualified approved paper, the subagent SHALL write one
single-paper Host ingest payload containing canonical paper fields and optional
collection. The main agent SHALL perform a final semantic check before Host
mutation. A candidate whose direct-work identity or minimum metadata cannot be
resolved SHALL remain `not_attempted` without a mutation payload.

#### Scenario: Worker writes a qualified paper payload

- **WHEN** direct-work identity and minimum metadata are resolved
- **THEN** the worker SHALL write one payload with one `paper` object
- **AND** that file SHALL be independently usable for a single Host ingest
  command

#### Scenario: No public PDF is found

- **WHEN** metadata is qualified and all applicable PDF routes find no verified
  public PDF
- **THEN** the worker SHALL write a metadata-only Host payload
- **AND** the absence of `pdfUrl` SHALL NOT make the paper `not_attempted`

#### Scenario: Direct-work identity is unresolved

- **WHEN** the worker cannot verify the candidate's direct bibliographic work
- **THEN** it SHALL report the unresolved result to the main agent
- **AND** it SHALL NOT fabricate a mutation payload

### Requirement: Literature search ingest SHALL allow incremental payload collection

The main agent SHALL be allowed to inspect and process any completed per-paper
payload while other subagents continue research. Missing or malformed output
SHALL be recoverable per paper.

#### Scenario: Early payload is collected

- **GIVEN** one valid payload is ready while unrelated subagents are running
- **WHEN** the main agent observes that payload
- **THEN** it MAY validate and ingest that paper immediately

#### Scenario: One failed payload does not block others

- **WHEN** one candidate's payload is missing or invalid
- **THEN** the main agent SHALL repair or re-delegate only that candidate
- **AND** it SHALL continue processing valid payloads for other candidates

## MODIFIED Requirements

### Requirement: Literature search ingest SHALL serialize Zotero mutations through the main agent

Stage 70 literature-ingest commands SHALL be executed only by the main agent,
one approved metadata-qualified paper at a time. The main agent SHALL wait for
the current mutation's terminal Host outcome, preserve its raw receipt, bind
the outcome to the same paper payload, and only then start another paper
mutation. Serial mutation applies even while subagent research continues.

#### Scenario: Workers cannot mutate Zotero

- **WHEN** a subagent performs metadata or PDF research
- **THEN** it SHALL NOT execute, queue, retry, or monitor a Zotero mutation
- **AND** it SHALL NOT own a Host receipt

#### Scenario: Main agent executes one Host mutation at a time

- **GIVEN** one or more validated paper payloads are ready
- **WHEN** the main agent starts ingestion
- **THEN** it SHALL invoke at most one literature-ingest mutation
- **AND** it SHALL wait for that mutation's terminal outcome before the next
  paper mutation

#### Scenario: Receipt remains associated with the paper

- **WHEN** the main agent records a Host outcome
- **THEN** it SHALL associate the raw receipt and outcome with the same paper
  payload
- **AND** it SHALL NOT reuse the receipt for another candidate

### Requirement: Literature search ingest SHALL enforce canonical Zotero metadata names before submission and ingestion

Every direct ingest payload SHALL use item-type-compatible canonical Zotero
metadata names including `abstractNote`. Titles, creators, identifiers,
landing/PDF URLs, and attachment decisions SHALL remain in their designated
Host structures. The main agent SHALL repair only unambiguous evidence-backed
mapping errors before mutation.

#### Scenario: Canonical abstract field is accepted

- **WHEN** a payload supplies a supported abstract as `abstractNote`
- **THEN** the main agent SHALL preserve it under that canonical field

#### Scenario: Noncanonical abstract alias is rejected

- **WHEN** a payload contains `abstract`
- **THEN** the main agent SHALL reject or repair the payload before mutation
- **AND** it SHALL NOT defer the invalid field to Host Bridge

#### Scenario: Dedicated values remain in designated structures

- **WHEN** a payload contains title, identifiers, creators, or PDF information
- **THEN** the main agent SHALL verify that each value is placed in its
  designated Host structure
- **AND** it SHALL NOT accept a conflicting generic-field placement

#### Scenario: Canonical names remain item-type appropriate

- **WHEN** the main agent accepts a canonical Zotero metadata field
- **THEN** the field SHALL be semantically compatible with the selected
  `itemType`

## REMOVED Requirements

### Requirement: Literature search ingest SHALL delegate one atomic research assignment per approved paper

**Reason**: Candidate grouping is a main-agent orchestration decision; paper
identity and output independence remain required by the new delegation
requirement.

### Requirement: Every research assignment SHALL be minimal, contained, and finitely bounded

**Reason**: Research remains bounded by semantic completion conditions without
runtime-generated fixed assignments or search-limit objects.

### Requirement: The gate SHALL expose the complete result-missing dispatch plan

**Reason**: The main agent schedules and collects per-paper work incrementally.

### Requirement: Each worker SHALL write one lightweight flat research result and then exit

**Reason**: Metadata-qualified workers write direct single-paper Host payloads;
unresolved candidates remain `not_attempted`.

### Requirement: The main agent SHALL repair and validate each result before formal review submission

**Reason**: The main agent validates direct Host payloads without a separate
formal-review protocol.
