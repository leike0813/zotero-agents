## Context

Literature Search Ingest is an interactive SkillRunner workflow whose business
logic currently lives in one long `SKILL.md`. The prompt describes local context
inspection, search planning, discovery, metadata resolution, PDF probing, and
typed ingest, but no runtime prevents an agent from skipping the expensive
post-selection work. Existing tests mostly assert that key phrases occur in the
Skill text.

The workflow must remain interactive because the user owns both the search plan
and the set of candidates authorized for Zotero mutation. Once that ingest scope
is approved, repeating confirmation between metadata, PDF, and per-paper ingest
adds friction without increasing authority.

## Goals / Non-Goals

**Goals:**

- Enforce search-plan approval before external discovery.
- Enforce ingest-scope approval before candidate enrichment or Zotero writes.
- Require structured metadata and PDF receipts for every approved candidate.
- Continue automatically after ingest-scope approval without another waiting
  state.
- Preserve original-script bibliographic identity and normalize DOI storage.
- Keep the runtime small, package-local, and dependency-free.

**Non-Goals:**

- Changing the workflow to an automatic SkillRunner execution mode.
- Introducing SQLite, a persistent workflow product, a provider API client, or a
  result renderer.
- Making successful PDF retrieval a condition of metadata ingest.
- Changing the public workflow parameters, final result shape, apply hook, or
  release process.

## Decisions

### Use a file-backed gate, not a database

The Skill package adds `gate_runtime.py` as the only agent-facing runtime entry
and `stage_runtime.py` as its internal validator/state writer. A compact JSON
file records only the current stage, decisions, approved candidate ids,
per-candidate gate status, prepared payload hashes, and ingest receipt indexes.
Detailed semantic evidence remains in stage payload files.

State updates use write-to-temporary-file plus atomic replacement. Each accepted
action records a deterministic payload hash so exact retries are idempotent and
conflicting retries fail. This is sufficient for one interactive runner job and
context recovery without turning the workflow ledger into a database.

### Keep exactly two interactive decision gates

The first waiting state approves the search brief. No external discovery occurs
before that approval, including for non-blank `auto` mode; `auto` may use the
input and read-only local context to recommend an effective mode.

The second waiting state approves the ingest scope. Its prompt explicitly states
that approved candidates will be resolved, probed for public PDFs, and ingested
automatically if they remain the same direct bibliographic work and pass the
quality gates. After this decision the runtime cannot return another waiting
action.

At Stage 30 the same decision may request focused discovery expansion. The
runtime validates the current round, increments it, preserves accepted evidence,
and returns to Stage 20. Every later discovery payload is cumulative; prior
candidates and evidence cannot disappear without an explicit evidence-backed
reclassification. This loop does not introduce another user-decision stage.

User cancellation is legal only at Stage 10 or Stage 30. It records a stable
reason/message and enters canceled terminal state.

### Validate semantic payloads without automating semantic judgment

The LLM remains responsible for query design, source selection, same-work
judgment, conflict resolution, and explaining evidence. The stage runtime checks
required structure and deterministic invariants: stage order, selected ids,
evidence counts, original/alternate title roles, complete-or-empty creators,
PDF route coverage, allowed status enums, and payload identity.

Metadata acceptance follows the `literature-metadata-search` contract: an exact
normalized identifier with no material conflict, or same-direct-work title
agreement plus two corroborating signals and an authoritative landing page.
Candidates that fail are recorded as `not_attempted`; they are never replaced
with a different work.

The Draft-07 action schema is the structural SSOT for all agent-authored gate
actions. Strict `oneOf` branches, required fields, enums, conditional
qualified/not-attempted rules, and `additionalProperties` policies fail unknown
or incomplete payloads before state mutation. Runtime checks add
stage-dependent invariants such as current round, selected candidate, cumulative
evidence, accepted hashes, and replay identity.

### Route one deep reference per stage family

The main Skill contains the complete minimal protocol for every stage.
`gate_runtime.py` returns one stage-specific `required_reads` entry:

- Stages 10-30: search planning and discovery;
- Stage 40: metadata resolution;
- Stage 50: PDF probing;
- Stages 60-70 and terminal: ingest, output, and recovery.

References provide detailed judgment tables, full examples, anti-examples, and
recovery cases. They cannot replace a main-file command, payload, completion
condition, or terminal contract.

### Make PDF probing a separate repeated hard stage

For each metadata-qualified candidate, the gate derives applicable route
families from identifiers and item type. A receipt must cover every required
family with an actual outcome. A missing, restricted, unavailable, mismatched,
or errored route counts as an attempt; an unattempted route does not. Only a
public, reachable, identity-matched result can become `pdfUrl`.

### Prepare immutable ingest payloads before mutation

After all selected candidates have terminal metadata and PDF outcomes, the
runtime writes one typed payload per ingestible candidate and stores its hash.
The agent may display a non-blocking summary, then the gate returns per-paper
mutation commands. The runtime rejects payload changes after scope approval and
records every mutation receipt.

### Prefer native DOI fields

Typed ingest normalization compares normalized `identifiers.doi` and
`fields.DOI`; conflicting values fail validation. When the selected Zotero item
type supports DOI, the Host writes the normalized value to the native DOI field.
Only item types without a native DOI field use the existing `DOI: ...` Extra
representation.

## Semantic Preservation Matrix

The clean-worktree `HEAD:skills_builtin/literature-search-ingest/SKILL.md` is the
semantic baseline. Every baseline rule group has a main-file landing point;
references deepen the contract but never replace the main workflow.

| Baseline rule group | Status | Main `SKILL.md` landing | Deepening reference |
| --- | --- | --- | --- |
| ACP interactive execution and prohibition on browser, Connector, CDP, login-session automation, and piracy sources | `preserved_in_main` | Mission; When To Use; Responsibilities | Search Planning And Discovery; PDF Probe |
| Waiting state, progress-message, confirmation, continuation, and terminal-output discipline | `strengthened_in_main_and_reference` | Interactive Contract; Gate Discipline; Final Output | Ingest, Output, And Recovery |
| LLM, Zotero Bridge, schema, runner, and runtime responsibilities | `strengthened_in_main_and_reference` | Runtime Model; Responsibilities | Ingest, Output, And Recovery |
| Five search modes, four parameter groups plus target collection, and defaults | `preserved_in_main` | Inputs; Mode Routing | Search Planning And Discovery |
| Guided intake, read-only local coverage checks, and seed artifact use | `strengthened_in_main_and_reference` | Mode Routing; Stage 10 | Search Planning And Discovery |
| Complete Search Brief fields, source roles, candidate policy, batching, and stop conditions | `strengthened_in_main_and_reference` | Mode Routing; Stage 10 | Search Planning And Discovery |
| Non-blank `auto`, explicit modes, and `targeted_ingest` routing | `authorized_correction` | Mode Routing; Stage 10 | Search Planning And Discovery |
| Core, multilingual, seed, and gap query lanes; original-script expansion; source composition | `strengthened_in_main_and_reference` | High-recall Search; Stage 20 | Search Planning And Discovery |
| `broad`, `balanced`, and `quick` completion definitions and stopping rules | `preserved_in_main` | High-recall Search | Search Planning And Discovery |
| Strong and weak identity, discovery and matching evidence, deduplication, and material versions | `strengthened_in_main_and_reference` | High-recall Search; Stage 20 | Search Planning And Discovery; Metadata Resolution |
| `ready`, `needs_curation`, and `lead_only` tiers | `preserved_in_main` | Candidate Tiers And Review | Search Planning And Discovery |
| Candidate table fields, readable batching, expansion requests, and unrestricted selection count | `strengthened_in_main_and_reference` | Candidate Tiers And Review; Stage 30 | Search Planning And Discovery |
| Selected-candidate metadata resolution, identifier lookup, public-PDF work, and typed ingest | `authorized_correction` | Stages 40-70 | Metadata Resolution; PDF Probe; Ingest, Output, And Recovery |
| Zotero item type, item-compatible fields, original-script creators, identifiers, and URL roles | `strengthened_in_main_and_reference` | Stage 40; Stage 60 typed payload | Metadata Resolution; Ingest, Output, And Recovery |
| One-paper mutation, `created`/`existing`/`failed`/`not_attempted`, and attachment truth from Host receipts | `strengthened_in_main_and_reference` | Stage 70; Final Output | Ingest, Output, And Recovery |
| User cancellation, unavailable tools, denied approval, unrecoverable execution, and resume behavior | `strengthened_in_main_and_reference` | Failure, Cancellation, And Resume | Ingest, Output, And Recovery |
| Completed and canceled JSON envelopes plus search audit ledger | `authorized_correction` | Final Output | Ingest, Output, And Recovery |
| No external discovery before search-plan approval, including non-blank `auto` | `authorized_correction` | Interactive Contract; Mode Routing; Stage 10 | Search Planning And Discovery |
| Exactly two user decision stages: search plan and ingest scope | `authorized_correction` | Interactive Contract; Gate Discipline; Stages 10 and 30 | Search Planning And Discovery |
| Automatic metadata, PDF, payload, and ingest execution after scope approval | `authorized_correction` | Interactive Contract; Stages 40-70 | Metadata Resolution; PDF Probe; Ingest, Output, And Recovery |
| Three-route PDF probe as a hard coverage gate while missing PDF remains non-blocking for safe metadata ingest | `authorized_correction` | Stage 50 | PDF Probe |
| Evidence-gated metadata, authoritative original text, and complete-or-empty Chinese creators | `authorized_correction` | Stage 40 | Metadata Resolution |
| DOI canonicalization through `identifiers.doi`, native Host DOI storage, and Extra only for unsupported item types | `authorized_correction` | Stage 40; Stage 60 | Metadata Resolution; Ingest, Output, And Recovery |
| Compact audit-summary ledger that is not execution state | `authorized_correction` | Runtime Model; Final Output | Ingest, Output, And Recovery |
| Lightweight JSON gate state without a database or result renderer | `authorized_correction` | Runtime Model; Gate Discipline | Ingest, Output, And Recovery |

## Risks / Trade-offs

- [A JSON state file cannot express arbitrary recovery histories] → Keep only
  gate-critical indexes and hashes; reject corrupt or conflicting state instead
  of attempting repair heuristics.
- [Agents can still provide weak semantic evidence in a structurally valid
  payload] → Require explicit source roles, authoritative landing evidence, and
  testable minimum signals while leaving same-work judgment with the LLM.
- [Automatic continuation after scope approval may skip a newly desired user
  review] → Make the authorization consequence explicit in the scope prompt and
  refuse identity-changing metadata rather than requesting a replacement.
- [Broad PDF route rules can create meaningless attempts] → Derive route
  families from identifiers and item type and permit structured not-applicable
  reasons only where the candidate facts support them.

## Implementation Plan

1. Add failing runtime and DOI behavior tests.
2. Add the gate scripts, strict action schema, cumulative discovery rounds, and
   stage-specific reference routing.
3. Rewrite the Skill as the complete current gate-first interactive contract,
   add the four deep references, and update runner/workflow documentation.
4. Correct Host DOI normalization and retain the unsupported-type Extra path.
5. Run focused tests, manifest checks, type checks, formatting, and strict
   OpenSpec validation.

No release or data migration is part of this change.

## Open Questions

None.
