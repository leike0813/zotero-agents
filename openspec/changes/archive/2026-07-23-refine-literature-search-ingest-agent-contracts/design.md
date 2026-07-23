## Context

Literature Search Ingest is a Tier 5 gate-driven, reference-backed, script-assisted Skill with a machine-facing schema. Its lightweight JSON gate state correctly prevents stage skipping and supports context recovery, but the agent still has to repeat data the gate already knows: action names, discovery rounds, candidate ids, fixed approval assertions, policy constants, derived identity keys, counts, and receipt bindings. The completed result also repeats discovery and audit detail even though no downstream workflow consumes it and the compact ledger already preserves traceability.

The current clean `HEAD:skills_builtin/literature-search-ingest/SKILL.md` is the semantic baseline. The new main file must remain independently executable. References deepen judgment and examples; they cannot replace main-file commands, payloads, completion criteria, failure rules, or output contracts.

## Goals / Non-Goals

**Goals:**

- Make every agent-authored payload contain only semantic facts or decisions that the runtime cannot determine.
- Preserve exactly two user-decision stages and automatic Stage 40-70 progression.
- Let discovery rounds submit deltas while preserving one cumulative runtime candidate/evidence set.
- Generate the compact ledger and final output deterministically from accepted state and Host receipts.
- Keep the completed output useful to the user and apply hook without repeating audit detail.
- Preserve or strengthen every baseline semantic rule except the explicitly authorized body-section and wire-contract changes.

**Non-Goals:**

- Adding SQLite, another database, a persistent workflow product, or an independent result renderer.
- Adding stages, waiting states, subagent protocols, dependencies, or public-PDF providers.
- Changing workflow parameters, the apply hook's business behavior, Host DOI normalization, typed ingest shape, or the `0.3.0` version.
- Archiving, publishing, or releasing this change.

## Decisions

### Keep the existing Tier 5 architecture

The workflow remains gate-driven because discovery, scope authorization, metadata qualification, PDF probing, immutable payload preparation, and mutation have strong ordering constraints. JSON state remains sufficient because each run is a single interactive workspace and needs recovery, not cross-run database querying. SQLite would add a second persistence product without solving a current failure mode.

### Separate semantic input from deterministic context

The gate state identifies the current stage, round, candidate, expected path, and accepted hashes. The stage runtime derives internal actions from the current stage plus the payload's semantic discriminator (`decision` or `status`). It also derives fixed policies, candidate ids, identity keys, counts, excluded ids, metadata warnings, curation status, PDF status, and receipt bindings.

The LLM retains all semantic work: search planning, actual queries, relevance, source interpretation, material-version judgment, direct-work identity, metadata selection, creator completeness, and PDF identity evidence.

The action schema remains the structural contract. Gate payload help is generated from the selected schema definition: `payload_schema_ref`, an example-backed `payload_template`, and extracted `payload_enums`. Stage 10 and Stage 30 expose decision-specific `payload_variants`.

### Merge discovery deltas into cumulative state

Each Stage 20 payload represents actual attempts and candidate additions or evidence-backed updates for the current round. The runtime:

1. binds the current discovery round;
2. derives a stable candidate id from a normalized strong identifier, or from an original-script weak identity;
3. merges candidate facts and evidence additively;
4. computes source, unique, merge, and conflict counts;
5. preserves all previously accepted candidates and evidence.

An optional gate-issued candidate id may identify an update. A new candidate cannot choose its own id. Direct-work identity cannot be changed through an update; material conflicts remain separate candidates.

This is safer and smaller than requiring the agent to copy the full accumulated set on every round. It also avoids splitting every query or candidate into another runtime stage.

### Derive metadata and PDF control fields

Stage 40 binds the pending candidate from state. Qualified payloads provide bibliographic metadata, evidence, corroborating signals, and curation notes. The runtime derives identifier status, normalized matching state, title field projection, required PDF routes, warnings, and `needsCuration`. Not-attempted payloads provide only the semantic reason, message, and evidence.

Stage 50 uses an object keyed by the three required routes, so the agent does not repeat route names inside each attempt. A `found` attempt supplies URL, content type, and identity evidence. Fixed self-asserted booleans such as `legal_source`, `reachable`, and `identity_match` are removed; the Skill still requires the LLM to verify those facts, and the runtime rejects a `found` attempt without the observable evidence fields.

### Bind raw Host receipts in runtime

The gate-issued receipt path and current prepared state already identify the candidate and payload hash. Stage 70 therefore accepts the exact Host JSON instead of an agent-authored wrapper. The runtime records the current candidate/hash/path binding, rejects reuse of an accepted receipt hash for another candidate, rejects inconsistent item-id reuse, and retains prepared-payload tamper checks and conflicting replay detection.

A Host command that cannot start uses a small `failure`/`message` object. Only `host_unavailable`, `approval_denied`, and `execution_blocked` are fatal.

### Generate the ledger and final output

At terminal state the runtime writes `result/search-ledger.json` from accepted paths, hashes, round summaries, candidate statuses, and receipt summaries. It then constructs `final_output` and returns it from the gate. The agent copies that object exactly and never hand-builds the machine-facing result.

The completed top level contains `kind`, `status`, `summary`, `outcomes`, and `searchLedgerPath`. Outcomes cover approved candidates only:

- `created` and `existing`: `title`, `ingestStatus`, `itemRef.id`, `pdfStatus`, `needsCuration`;
- `failed` and `not_attempted`: `title`, `ingestStatus`.

The canceled shape remains `kind`, `status`, `reason`, and `message`.

### Preserve a complete executable main Skill

Removing `When To Use` and `Do Not Use` removes duplicated trigger/body sections only. The frontmatter description remains the trigger source, while operational safety boundaries remain in Mission, Gate Discipline, Responsibilities, stage-specific Forbidden rules, and Failure/Resume.

Every Stage 10-70 contract in the main file continues to include purpose, semantic/runtime responsibilities, command, path, actual minimum payload, enum guidance, completion, forbidden behavior, recovery, and next stage. The complete typed ingest, completed, and canceled examples remain in the main file.

## Semantic Preservation Matrix

| Baseline rule group | Status | Main-file landing | Deepening reference |
| --- | --- | --- | --- |
| Trigger conditions formerly repeated in `When To Use` | `authorized_correction` | Frontmatter description | None |
| Near-miss use cases formerly grouped in `Do Not Use` | `authorized_correction` | Mission; Responsibilities; stage Forbidden rules | Stage-specific references |
| Interactive execution and legitimate-tool/source boundary | `preserved_in_main` | Mission; Interactive Contract; Responsibilities | Search Planning; PDF Probe |
| Backend-exclusive interactive wording | `authorized_correction` | Mission | None |
| Stage 10/30 waiting, progress, approval, and terminal discipline | `preserved_in_main` | Interactive Contract; Gate Discipline | Ingest, Output, Recovery |
| LLM, gate/runtime, runner, Zotero Bridge, and Host roles | `strengthened_in_main_and_reference` | Runtime Model; Responsibilities | All four references |
| Four input forms, five modes, parameters, and defaults | `preserved_in_main` | Inputs; Mode Routing | Search Planning |
| Guided intake, local coverage, and seed artifact use | `preserved_in_main` | Mode Routing | Search Planning |
| Search Brief semantic content | `preserved_in_main` | Search Brief; Stage 10 | Search Planning |
| `auto`, explicit-mode, guided, and targeted routing | `preserved_in_main` | Mode Routing | Search Planning |
| Four query lanes and multilingual expansion | `preserved_in_main` | High-recall Search | Search Planning |
| Discipline/language/region/literature-type source composition | `preserved_in_main` | High-recall Search | Search Planning |
| `broad`, `balanced`, `quick` definitions and stopping | `preserved_in_main` | High-recall Search | Search Planning |
| Strong/weak identity, evidence, material version, and deduplication | `strengthened_in_main_and_reference` | High-recall Search; Stage 20 | Search Planning |
| Discovery wire shape and cumulative retention | `authorized_correction` | Stage 20 | Search Planning |
| `ready`, `needs_curation`, and `lead_only` tiers | `preserved_in_main` | Candidate Tiers And Review | Search Planning |
| Candidate fields, batching, expansion, approval, and exclusions | `preserved_in_main` | Candidate Tiers; Stage 30 | Search Planning |
| Identifier-first/title-path metadata acceptance | `preserved_in_main` | Stage 40 | Metadata Resolution |
| Original titles, alternate titles, containers, language, and script | `preserved_in_main` | Stage 40 | Metadata Resolution |
| Complete-or-empty Chinese creators | `preserved_in_main` | Stage 40 | Metadata Resolution |
| DOI in `identifiers.doi` and typed Zotero fields | `preserved_in_main` | Stage 40; Stage 60 | Metadata Resolution; Ingest Recovery |
| Three-route public-PDF gate and legal same-work requirements | `preserved_in_main` | Stage 50 | PDF Probe |
| Metadata ingest when all PDF routes terminate without a file | `preserved_in_main` | Stage 50 | PDF Probe |
| One-paper immutable typed ingest payload | `preserved_in_main` | Stage 60 | Ingest Recovery |
| Per-paper mutation and created/existing/failed/not-attempted semantics | `preserved_in_main` | Stage 70; Final Output | Ingest Recovery |
| Host attachment status as authoritative | `preserved_in_main` | Stage 70 | Ingest Recovery |
| Agent action, round, candidate, hash, count, and fixed assertion fields | `authorized_correction` | Stage payload contracts | All four references |
| Cancellation, source/tool failure, blockers, resume, and fail-closed rules | `preserved_in_main` | Failure, Cancellation, And Resume | All four references |
| Replay, conflicting replay, tampering, input drift, and corrupt state | `strengthened_in_main_and_reference` | Gate Discipline; Stage recovery | Ingest Recovery |
| Completed output detail | `authorized_correction` | Final Output | Ingest Recovery |
| Canceled output and compact ledger role | `preserved_in_main` | Final Output | Ingest Recovery |

The implementation is incomplete if any preserved rule lacks a main-file landing or if any difference outside the four authorized correction groups cannot be explained.

## Risks / Trade-offs

- [Runtime derives too much semantic meaning] → Derive only deterministic context and projections; keep relevance, direct-work judgment, evidence interpretation, and creator/PDF identity decisions in LLM payloads.
- [Schema, runtime, and examples drift] → Use schema definition refs for gate templates/enums and add Ajv plus runtime parity tests.
- [Delta merge combines different works] → Prefer strong identifiers, preserve original-script weak identities, reject identity-changing updates, and keep material conflicts separate.
- [Raw Host receipt is reused] → Bind by gate-issued path/current state and reject cross-candidate receipt-hash or inconsistent item-id reuse.
- [Minimal final output hides diagnostics] → Keep detailed accepted payloads and compact path/hash/status summaries in the ledger; do not duplicate full evidence.
- [Skill text is over-compressed] → Enforce the semantic matrix and per-stage structural contract rather than a line-count target.

## Migration Plan

This is an unpublished `0.3.0` workflow contract. Update schemas, runtime, tests, Skill instructions, references, runner prompt, and README atomically in the same change. No compatibility adapter or dual payload format is added. Rollback is the normal source-control reversal of this unarchived change.

## Open Questions

None. The payload shapes, output fields, interaction boundaries, and preservation requirements are fixed by the approved plan.
