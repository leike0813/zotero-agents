# Third-party Agent Guidance Semantic Parity

Historical pre-redesign baseline: `4b9a3b4b0fab7fdcce54571ba07dd770b4d3219f`

Current refinement baseline: `8b7dfd8ecb6063f5dd24a8dda3b09179a6d2817a`

Unmapped semantic count: `0`

Downgraded semantic count: `0`

Intra-package duplicate count: `0`

## Preservation method

The complete pre-redesign semantic inventory remains recorded in
`openspec/changes/archive/2026-07-23-redesign-host-bridge-agent-surfaces/semantic-parity.md`.
The later refinement inventory remains recorded in
`openspec/changes/archive/2026-07-23-refine-host-bridge-agent-surfaces/semantic-parity.md`.
This change additionally treats every unique instruction at the current
refinement baseline as mandatory. A unit is retained only when its capability,
decision boundary, procedure, evidence rule, completion condition, and
recovery behavior remain available from its current normative owner.

Generated equivalents are compared by structured fields and exhaustive
identity, not by prose length. New line-depth gates are triage constraints:
they can reject a thin package or require human disposition, but cannot prove
semantic coverage. Moving a hard rule into an optional reference would be a
downgrade; repeating the same rule in both files would violate package-local
ownership.

## Minimum-core delta mapping

| Baseline domain | Current owner | Result |
| --- | --- | --- |
| Executable/profile selection, identity, connection diagnosis, paging, effects, approval, handles, files, Products, workflow/run control, Synthesis boundaries, and recovery | `skills_src/zotero-bridge-cli/SKILL.md` | retained |
| Every public command's argv, input/result schemas, pagination, effects, approval scope, handle transitions, recovery, targets, aliases, and search visibility | eight generated command partitions | retained |
| Knowing which command family to inspect before the canonical command is known | generated `references/command-catalog.md` plus catalog-first `SKILL.md` workflow | expanded |
| File, Product, operation, artifact, transfer, and uncertain-outcome distinctions | `SKILL.md` plus `references/commands/files-products-and-operations.md` | expanded |

The catalog repeats only compact command identity, summary, intent cues, and
the detail-file route. Full command-card facts remain owned by exactly one
partition.

## Generic delta mapping

| Baseline domain | Current owner | Result |
| --- | --- | --- |
| Bounded routing, task composition, workflow ownership, evidence handoff, staged lifecycle, and recovery | coordinator `SKILL.md` and `research-task-model.md` | retained |
| Query, acquisition, analysis, synthesis, and curation execution, constraints, completion, and first failure | each task `SKILL.md` | retained and expanded |
| Complex decisions, near misses, record forms, partial outcomes, and recovery | each task's optional `playbook.md` | expanded |
| Ordinary human requests, inferred defaults, material ambiguity, and clarification boundaries | every Generic `SKILL.md`; multi-stage cases in the coordinator model | expanded |
| Official non-debug workflow identity and static selection facts | generated coordinator `workflow-catalog.md` | retained and expanded |
| Live availability, exact workflow contract, selection, provider readiness, and submission authority | live workflow list/describe/validate/profile-validate/submit | retained |
| Machine-readable task result and truthful completed/canceled/failed status | every Generic `SKILL.md` plus shared `output.schema.json` | retained and expanded |
| Runner terminal framing and schema enforcement | shared Runner template plus materialized runner/schema assets | made explicit |

Every task contract now states that the agent authors the business JSON,
defines the nested `evidence`, `artifacts`, and `diagnostics` fields, gives a
valid example, and keeps `__SKILL_DONE__` outside that JSON. The shared Schema
remains the only machine-readable result definition.

## Hosted delta mapping

| Baseline domain | Current owner | Result |
| --- | --- | --- |
| Resident indexing, catalog refresh, run monitoring, notification handling, maintenance analysis, attention triage, receipts, and live-state precedence | Librarian `SKILL.md`, resident operations, and service | retained and expanded |
| Interactive versus scheduled authority, concurrency, provider decisions, mutation limits, and cron non-submission | Librarian `SKILL.md` and automation policy | retained |
| Cache freshness, atomic refresh, typed state, uncertain effects, and recovery | state/recovery reference and SQLite service state | retained and expanded |
| Reviewed workflow planning against the current selection and workflow contract | `zotero-librarian.workflow-plan.v2`, normalized plan/entry tables, and live validation | expanded |
| Crash-safe submission without replaying an uncertain remote effect | per-entry reservation, watched-run linkage, `unknown` state, and attention receipt | expanded |
| Schedule definitions without hidden operating-system mutation | profile cron files and explicit operator/runtime ownership | clarified |

The resident service remains one-pass. A plan never carries submission
authority: each submit requires current explicit authority, verifies the
immutable file and registry identity, rechecks the live workflow description,
and validates every still-pending selection entry.

## Acceptance

- Every command appears once in the compact catalog and once in exactly one
  detailed partition; every descriptor field remains rendered.
- All six Generic Skills execute an ordinary natural-language request from
  `SKILL.md` alone; optional references contain complete complex domains and
  at least normal, ambiguous, and recovery traces.
- `zotero-library-task.result.v1` has one Schema source, valid status examples,
  materialized Runner validation, and no second DTO.
- Hosted workflow plans have immutable identity, per-entry state, live
  revalidation, and a fail-closed uncertain-effect path.
- All materialized files clear hard depth floors; every advisory warning is
  either expanded or explicitly accepted by semantic review.
- The package validator and semantic review report zero unmapped, downgraded,
  or duplicated semantic units.
