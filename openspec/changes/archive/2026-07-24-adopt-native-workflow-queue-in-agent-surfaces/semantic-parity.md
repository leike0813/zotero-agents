# Host Bridge Native Queue Semantic Parity

Baseline commit: `e63a5a636099cda54d61d745a8ba54d70d9de9a8`

Unmapped semantic count: `0`

Downgraded semantic count: `0`

Intra-package duplicate count: `0`

Unauthorized dropped semantic count: `0`

## Method

The baseline is the clean governed surface at the pinned commit. Every affected baseline meaning remains at its current owner unless this matrix explicitly names it as an authorized deletion. Existing paragraphs outside the exact plan-entry deletion scope are preserved without compression, deletion, merging, stylistic rewriting, or replacement by a summary.

New native-queue guidance is accepted only when its owner supplies the same decision-domain depth as the neighboring baseline instructions: entry conditions, choices, procedure branches, hard constraints, completion evidence, failure/recovery, and representative examples or near misses. Relative line/prose measurements are blocking regression signals and cannot establish semantic parity by themselves.

Source abbreviations:

- `M/S` — materialized Minimum `zotero-bridge-cli/SKILL.md`
- `M/W` — materialized Minimum workflow command reference
- `G/S` — materialized Generic coordinator `SKILL.md`
- `G/R` — materialized Generic research-task model
- `G/C` — materialized Generic workflow catalog
- `G/AQ` / `G/AA` — acquisition / analysis playbooks
- `H/S` — materialized Hermes Librarian `SKILL.md`
- `H/A` — Hermes automation policy
- `H/O` — Hermes resident operations
- `H/R` — Hermes state and recovery
- `H/P` — Hermes README and SOUL

## Protected Workflow Input Planning v2 units

| ID | Baseline sources | Canonical meaning | Current owner | Preservation |
| --- | --- | --- | --- | --- |
| V2-001 | G/C, G/AA, H/S, H/A, H/O | Live workflow inspection exposes `inputs` and `validateSelection` as separate consumer and candidate-production contracts | Generic workflow catalog; Hermes live workflow procedure | Preserved verbatim and expanded only at the post-plan queue handoff |
| V2-002 | G/C, G/AA | Agents inspect member kind, grouping, selector, filters, candidate counts, MIME, and execution mode independently | Generic workflow catalog and analysis playbook | Preserved |
| V2-003 | H/S, H/A, H/O | Hermes freezes raw selection; Host planning owns candidate production, filtering, grouping, and prepared units | Hermes executable workflow and authority policy | Preserved |
| V2-004 | M/W, G/C | External submit accepts explicit raw `selection`; agents do not upload planned/prepared units | Minimum command contract | Preserved and made an explicit queue-submit constraint |
| V2-005 | Runtime contract reflected by G/C, H/A | Confirmed prepared units are immutable admission, duplicate, preflight, queue, and Host build boundaries | Host runtime; Generic/Hermes explanation | Preserved |
| V2-006 | Runtime contract reflected by G/C | `each`, `all`, and `parent` grouping and first-seen order are planner-owned | Workflow Input Planning v2 | Preserved; submission seam cannot regroup |
| V2-007 | Runtime contract reflected by G/C | Candidate skips and top-level unit outcomes are different accounting domains | Workflow Input Planning v2 and queue summary | Preserved |
| V2-008 | Runtime contract reflected by M/W, G/C | Preview is advisory; confirmed planning reruns permitted rules and is execution SSOT | Workflow Input Planning v2 | Preserved |
| V2-009 | Runtime contract reflected by M/W | Public queue projections expose safe label/member count, not member identities or selection payload | Minimum queue contract | Preserved |

## Minimum semantic units

| ID | Baseline sources | Canonical meaning | Current owner | Preservation |
| --- | --- | --- | --- | --- |
| MIN-001 | M/S | Select and verify one CLI/profile before operations | M/S | Preserved without edits |
| MIN-002 | M/S | Use capability and intent discovery before guessing commands | M/S | Preserved without edits |
| MIN-003 | M/S, M/W | Validate explicit workflow input and provider contracts before submit | M/S | Preserved; native queue procedure is appended at equal depth |
| MIN-004 | M/S, M/W | Zotero-managed and agent-owned workflow modes have different owners and apply paths | M/S | Preserved |
| MIN-005 | M/S | Treat handles as typed and never substitute one handle domain for another | M/S | Preserved; `submissionId` and `queueId` are added as distinct handles |
| MIN-006 | M/S | State-changing operations use operation receipts and unknown-effect recovery | M/S | Preserved; pending cancel is integrated |
| MIN-007 | M/W | Workflow command cards expose complete argv, payload/result schema, effects, approvals, handles, next action, and recovery | Generated M/W | Expanded by descriptor generation |
| MIN-008 | M/S | Read current Zotero/Host facts rather than inferring success from artifacts or terminal labels | M/S | Preserved |
| MIN-009 | M/S | Large reads are paged and cursors are opaque | M/S | Preserved without edits |
| MIN-010 | M/S | Sensitive payloads, credentials, paths, and private backend state stay out of lightweight results | M/S | Preserved and applied to queue/submission DTOs |
| MIN-011 | new | Queue-managed submit returns a submission handle before backend handles; pending cancellation uses queue identity only | M/S with exact facts in M/W | Expanded current-state instruction |
| MIN-012 | new | Active submission inspection bridges pending/admitted units to task/run handles and handles process restart | M/S with exact facts in M/W | Expanded current-state instruction |

## Generic semantic units

| ID | Baseline sources | Canonical meaning | Current owner | Preservation |
| --- | --- | --- | --- | --- |
| GEN-001 | G/S, G/R | Route one bounded research objective to one task Skill and return one structured task result | G/S | Preserved without compression |
| GEN-002 | G/S, G/R | Separate LLM judgment from deterministic tool/Runner validation | G/S | Preserved |
| GEN-003 | G/S, G/R | Preserve inline evidence and the three task result statuses | Each Generic Skill | Preserved |
| GEN-004 | G/C | Use live workflow list/describe/validate facts and the generated official catalog together | G/C | Preserved |
| GEN-005 | G/C | Separate workflow contract, provider preparation, ownership mode, result/apply contract, and evidence | G/C | Preserved |
| GEN-006 | G/AQ, G/AA | Acquisition and analysis choose bounded concurrency from task risk and evidence needs | Respective playbooks | Preserved and mapped to Host queue options without deleting examples |
| GEN-007 | G/AA | Literature analysis checks candidate production, execution input, grouping, member kinds, and MIME | G/AA | Preserved verbatim |
| GEN-008 | G/R | Generated artifacts and task completion do not independently prove current Zotero state | G/R | Preserved |
| GEN-009 | new | One bounded Zotero-managed objective becomes one confirmed multi-unit Host submission | G/S and G/R | Expanded |
| GEN-010 | new | Generic records `submissionId`, observes admission, and hands concrete run supervision to the appropriate owner | G/R | Expanded; no CLI facts duplicated |
| GEN-011 | new | Generic may request pending cancellation interactively but does not own FIFO, queue state, or resident automation | G/R | Expanded |

## Hermes semantic units

| ID | Baseline sources | Canonical meaning | Current owner | Preservation |
| --- | --- | --- | --- | --- |
| HER-001 | H/P, H/S | Hermes is a resident facet over Generic and Minimum, not a replacement copy | H/P and H/S | Preserved |
| HER-002 | H/S, H/A | Live Zotero facts outrank resident cache and every operation is one pass | H/S | Preserved without compression |
| HER-003 | H/S, H/A | Interactive, confirmed automation, and cron authority tiers remain distinct | H/S and H/A | Preserved |
| HER-004 | H/S, H/A, H/O | Cron may inspect and supervise but cannot submit, approve, replay, or cancel workflow work | H/S | Preserved and extended to native queue cancel |
| HER-005 | H/S, H/A, H/O | Freeze raw selection and re-read live `inputs` / `validateSelection` before state-changing submit | H/S | Preserved |
| HER-006 | H/S, H/A | Current operator authority and Zotero approval are separate gates | H/S | Preserved |
| HER-007 | H/O | Workflow catalog refresh, validation, submission, run registration, and monitoring are separate one-pass operations | H/O | Preserved with native submission replacing plan-entry launch |
| HER-008 | H/O, H/R | `watched_runs` and run watch project already-created runs; they are not an admission queue | H/O | Preserved |
| HER-009 | H/O, H/R | Notification inbox/sync, attention ranking, indexing, maintenance, and catalog cache are independent resident domains | H/O and H/R | Preserved |
| HER-010 | H/R | Operation receipts, unknown outcomes, live reinspection, and no-unsafe-replay rules survive restart | H/R | Preserved |
| HER-011 | H/S, H/O | Results and artifacts require independent live verification before reporting success | H/S | Preserved |
| HER-012 | new | Interactive Hermes submits one reviewed raw selection through the inherited Host queue contract | H/S and H/O | Expanded at full procedure depth |
| HER-013 | new | Hermes observes active submission state, then registers concrete runs; process-local expiry requires live resubmission | H/O and H/R | Expanded |
| HER-014 | H/S, H/A, H/O, H/R | Profile-owned durable plan identity and backlog | none | `explicit-deletion`: user-authorized removal of the external admission owner |
| HER-015 | H/O, H/R | `workflow_plan_entries` ordinal and `pending/launching/launched/unknown` state machine | none | `explicit-deletion`: replaced by plugin pending/admitted/runtime owners |
| HER-016 | H/S, H/A, H/O | Resident `workflow plan|submit`, `--allow-submit`, entry batch concurrency, and remaining-entry passes | none | `explicit-deletion`: external queue commands are removed |
| HER-017 | H/A, H/R | Stale launching/unknown-entry replay recovery for the external queue | none | `explicit-deletion`: pending native entries are process-local and never replayed |

## Materialized depth baseline

The validator compares rendered current files against these exact e63 materialized paths. Substantive line count may not decrease; normalized prose characters must remain at least 95 percent of baseline.

| Surface | Materialized path | Baseline substantive lines | Baseline non-whitespace chars | Required disposition |
| --- | --- | ---: | ---: | --- |
| Minimum | `skills_builtin/zotero-bridge-cli/SKILL.md` | 140 | 16854 | preserve-or-expand |
| Minimum | `skills_builtin/zotero-bridge-cli/references/commands/workflow.md` | 242 | 29951 | preserve-or-expand |
| Generic | `skills_builtin/zotero-library-agent/SKILL.md` | 144 | 12991 | preserve-or-expand |
| Generic | `skills_builtin/zotero-library-agent/references/research-task-model.md` | 273 | 18036 | preserve-or-expand |
| Generic | `skills_builtin/zotero-library-agent/references/workflow-catalog.md` | 281 | 27132 | preserve-or-expand |
| Generic | `skills_builtin/zotero-literature-acquisition/references/playbook.md` | 281 | 14353 | preserve-or-expand |
| Generic | `skills_builtin/zotero-literature-analysis/references/playbook.md` | 262 | 14668 | preserve-or-expand |
| Hermes | `profiles/hermes/zotero-librarian/README.md` | 20 | 3179 | preserve-or-expand |
| Hermes | `profiles/hermes/zotero-librarian/SOUL.md` | 12 | 1788 | preserve-or-expand |
| Hermes | `profiles/hermes/zotero-librarian/skills/zotero-librarian/SKILL.md` | 149 | 13084 | preserve-or-expand |
| Hermes | `profiles/hermes/zotero-librarian/skills/zotero-librarian/references/automation-policy.md` | 264 | 13946 | preserve-or-expand |
| Hermes | `profiles/hermes/zotero-librarian/skills/zotero-librarian/references/resident-operations.md` | 319 | 15705 | preserve-or-expand |
| Hermes | `profiles/hermes/zotero-librarian/skills/zotero-librarian/references/state-and-recovery.md` | 298 | 13210 | preserve-or-expand |

## Review disposition

- Minimum result: aligned. The native queue commands, admission branches, handle distinctions, pending cancellation boundary, submission-scoped run discovery, and process-local restart recovery are present without removing or compressing unaffected guidance.
- Generic result: aligned. Input Planning v2 remains intact, while coordinator, research-task, catalog, acquisition, and analysis guidance now hand bounded admission to the native queue and retain candidate-specific completion evidence.
- Hermes result: aligned. Only the external workflow plan, entry, reservation, launch, and replay instructions were removed; native submission observation, run registration, authority, receipts, restart behavior, and resident-domain recovery replace them at equivalent or greater procedural depth.
- Agent Control Contract result: aligned. The review contains zero unmapped, downgraded, duplicate, unauthorized dropped, and depth-regression units.
- Instruction-depth warnings: accepted for the seven generated Minimum command references `connection-and-context.md`, `diagnostics.md`, `files-products-and-operations.md`, `library.md`, `mutation.md`, `run.md`, and `workflow.md`. Each warning is the existing advisory absolute-line threshold; every generated command card still carries its exact argv, schema, effect, approval, handle, and recovery fields, and the pinned relative-depth comparison reports no regression.
- Rendering and ownership review are complete. The materialized surfaces, planned release set, and 29-file Chinese review mirror are aligned, all semantic exception counts remain zero, and no publication has been performed.
