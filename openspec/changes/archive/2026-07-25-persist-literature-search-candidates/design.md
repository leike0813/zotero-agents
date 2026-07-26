## Context

The baseline is commit `f644def9`, which contains the archived weak-gate
refactor. Its Stage 20 keeps cumulative candidates as main-agent state, while
Stage 40 still describes dynamic candidate data and output paths without a
durable producer/consumer handoff.

## Goals / Non-Goals

### Goals

- Make every discovered candidate immediately available as a readable runtime
  file.
- Make Stage 30's review table and Stage 40's research input projections of the
  same candidate files.
- Keep one candidate file paired with one future Host payload path.
- Preserve one-or-many candidate grouping per subagent and main-agent-owned
  serial Zotero mutation.
- Keep the package current-state only and avoid a new gate protocol.

### Non-Goals

- Changing discovery-round records or final output schemas.
- Changing metadata resolution, direct-work identity, PDF route order, Host
  payload shape, receipts, or workflow versions.
- Adding a candidate JSON schema, aggregate candidate file, assignment envelope,
  scheduler, fixed batch size, or validation script.

## Decisions

### 1. One file per deduplicated candidate

The main agent writes files under `runtime/candidates/` using stable sequential
names such as `candidate-0001.json`. The filename is not derived from an
identifier and remains stable if stronger evidence later updates the candidate.

The file contains one flat candidate object. Required fields are
`candidateId`, `title`, `tier`, and `payloadPath`; known discovery fields such as
creators, year, container, language, material type/version, identifiers,
landing URL, discovery sources, and missing fields are retained when available.

Every new candidate file is created immediately after current deduplication and
identity classification. Later evidence for the same direct work updates that
file instead of creating another file.

### 2. Stage 30 reads files; it does not create an aggregate

Stage 30 enumerates candidate files, projects their known fields into the user
review table, and resolves the user response to approved candidate ids. The
discovery-round record remains a separate summary of query/source attempts and
stopping reasons.

### 3. Stage 40 passes file paths and reads payloadPath from the file

The static prompt receives `CANDIDATE_FILES_JSON`, a JSON array containing one
or more approved candidate file paths, plus `TARGET_COLLECTION`. The subagent
reads each candidate file, performs the mandatory research, and writes a
single-paper Host payload to that file's `payloadPath`.

The main agent may process any candidate file itself. A subagent may receive one
or multiple candidate files; grouping and concurrency remain the main agent's
choice. Candidate files are read-only for subagents.

### 4. Recovery follows the file pairing

Recovery scans `runtime/candidates/` and uses each file's `payloadPath` to find
the paper-specific Host payload. Candidate path, payload path, and receipt path
remain associated in the ledger/runtime records. The final JSON remains
unchanged.

### 5. Research completion uses a compact stdout report

After processing all assigned candidate files, a subagent returns one
`literature_search_research_report` JSON object in stdout. Its
`candidateResults` array contains exactly one entry for each assigned candidate
and reuses the candidate id, candidate path, title, metadata status, PDF probe
status, and payload path fields used by the search ledger.

The report also carries compact metadata sources, the three PDF route results,
and remaining uncertainties for main-agent review. It is not a Host payload or
a new runtime source of truth. The main agent derives receipt, ingest, item, and
final curation fields after serial Host mutation. A missing or malformed report
is repaired per candidate and does not invalidate another candidate's valid
payload.

## Migration Map

| Retained behavior | New source of truth |
| --- | --- |
| Cumulative candidate identity and evidence | One file per candidate under `runtime/candidates/` |
| Stage 30 review fields | Projection of candidate files |
| Stage 40 research input | `CANDIDATE_FILES_JSON` path array |
| Per-paper Host output | `payloadPath` in the candidate file |
| Stage 40 research completion | stdout `candidateResults` projection |
| Receipt and recovery association | candidate path + payload path + receipt path |

## Risks / Mitigations

- **Duplicate files:** apply existing deduplication before creating a new file;
  update the existing file for the same direct work.
- **Unsafe filenames:** use sequential opaque filenames rather than candidate ids.
- **Worker identity drift:** pass the approved file and require the worker to
  preserve its candidate identity while redoing metadata and PDF verification.
- **Concurrent mutation:** retain the existing main-agent-only serial Host rule.
