## Context

The implementation baseline is commit
`71da2eb325e946291b901d778b20ceb3c5db368f`. At that baseline the Skill is 951
lines, its four references are 369/347/343/411 lines, and the package includes
three Python runtime files plus an 847-line semantic action schema.

The runtime files combine orchestration with business validation. The change
must therefore migrate retained rules before deleting the implementation. The
goal is not a thinner literature workflow; it is the same workflow with less
agent-authored protocol and more appropriate orchestration freedom.

## Goals / Non-Goals

### Goals

- Preserve the complete search and ingest workflow and its two deliberate user
  decisions.
- Preserve metadata search, direct-work identity, three-route PDF probing,
  canonical Host fields, receipts, ledger, recovery, and final output.
- Let the main agent choose delegation granularity and collect completed work
  incrementally.
- Make each metadata-qualified paper's subagent file directly usable as the
  existing single-paper Host input.
- Keep all Skill-package instructions current-state only.
- Reduce `SKILL.md` to roughly 480-540 lines through progressive disclosure.

### Non-Goals

- Changing Host Bridge, the CLI input contract, Zotero field ownership, or the
  `abstractNote` contract.
- Adding a replacement scheduler, gate, state database, payload envelope,
  evidence schema, or mandatory sidecar.
- Changing archived OpenSpec records, generated help documents, parameter or
  output schemas, the apply hook, or workflow versions.

## Decisions

### 1. Stages advance by semantic completion conditions

The Skill remains prescriptive about order and readiness. Stage 10 approval is
required before external discovery. Stage 30 approval is required before
candidate research or mutation. An approved paper is ready for Host mutation
only after direct-work identity, metadata, PDF-route work, and canonical
payload checks are complete.

No second runtime state machine is introduced. The main agent keeps the
current run's candidate, payload, receipt, and ledger records in the run
workspace and applies the Skill's completion conditions directly.

### 2. Delegation grouping is free; paper units stay independent

The main agent chooses which candidates to group into each subagent call and
how many subagents to run. The static prompt in `SKILL.md` remains the single
source of truth. Dynamic context contains candidate data and one writable
payload path per candidate.

One subagent may process multiple candidates, but each candidate retains its
own identity decision and output path. A metadata-qualified candidate produces
one single-paper Host payload. An unresolved direct-work identity produces no
mutation payload and remains `not_attempted`.

### 3. Completed payloads are collected incrementally

The main agent may inspect and process a payload as soon as it is written,
without waiting for unrelated subagents. A malformed or missing payload is a
paper-local recovery problem. It does not invalidate completed payloads for
other papers.

Research may continue concurrently, but Host mutation is serial. The main
agent waits for the current mutation's terminal Host response and records its
raw receipt before starting another mutation.

### 4. The worker file contract is the existing Host payload

The payload contains one `paper`, its canonical `fields`, `creators`,
`identifiers`, landing/PDF information, and optional `collection`. It does not
carry provenance, PDF route traces, or uncertainty because Host does not
consume those fields.

Subagent stdout may include sources, route outcomes, and uncertainty. The main
agent may summarize that information into an internal workspace audit file.
The summary is optional, never a stage condition, and never part of final
output.

### 5. Current-state-only package language

`SKILL.md`, references, examples, and the runner prompt describe only the
resulting workflow. Instructions that exist solely because an obsolete action
once existed are deleted rather than replaced with warnings about that action.

Negative instructions are retained only for hazards present in the current
workflow, such as premature external search, identity substitution, unlawful
PDF use, worker-side Zotero mutation, invalid canonical fields, concurrent Host
mutation, and receipt misuse.

## Semantic Migration Map

| Existing runtime responsibility | Current-state destination |
| --- | --- |
| Input normalization and mode selection | `SKILL.md` input and mode-routing sections |
| Search-plan readiness, discovery rounds, scope decisions | `SKILL.md` Stages 10/20/30 and `search-planning-and-discovery.md` |
| Candidate identity and metadata validation | Stage 40 plus `metadata-resolution.md` |
| Three-route PDF validation | Stage 40 plus `pdf-probe.md` |
| Canonical Host payload projection | Static worker prompt, main-agent check, and `ingest-output-recovery.md` |
| Serial mutation, raw receipt, paper outcomes | Stage 70 and `ingest-output-recovery.md` |
| Ledger and completed/canceled output | Terminal section, output schema, and `ingest-output-recovery.md` |
| Fixed assignments, dispatch barrier, review cursor, action schema, state hashes | Deleted implementation mechanics; no current workflow responsibility |

## Approved Deletion Boundary

Only these semantic units may disappear from the materialized Skill package:

- package-local gate commands and gate state;
- agent-authored stage action payloads and their schema/template/enums;
- runtime-created fixed one-paper assignments and fixed search-limit objects;
- all-worker dispatch/wait barriers and result-missing dispatch plans;
- raw-result-to-formal-review cursors and review submission protocol;
- runtime-generated canonical payload hashes, input-drift checks, and replay
  events tied to that state machine;
- recovery instructions whose only purpose is repairing those mechanics.

All literature-quality and output semantics outside this list must remain.

## Risks / Mitigations

- **Instruction-backed checks can be skipped**: state metadata, identity, PDF,
  and canonical-field completion conditions prominently in both Stage 40 and
  the static prompt; cover them with stable behavior tests.
- **Worker payload quality can vary**: keep the main-agent semantic check and
  paper-local repair/redelegation path.
- **Parallel research can tempt parallel mutation**: state and test that Host
  mutation is main-agent-only and serial.
- **Compression can silently remove behavior**: compare every baseline section
  against the migration map and approved deletion boundary before deleting the
  runtime assets.
- **Development history can leak into execution instructions**: perform a
  dedicated current-state-only review over every agent-facing package file.

## Migration Plan

1. Correct and validate the change artifacts.
2. Rewrite tests around the target behavior before editing the Skill.
3. Refactor `SKILL.md` section by section and move detail into existing
   references.
4. Update runner/workflow surfaces.
5. Delete pure gate assets after semantic parity review.
6. Run focused tests, workflow checks, documentation checks, lint/type checks,
   and current-state language audit.
