## Context

The three published surfaces already have declared ownership and generated composition, but their authored guidance is uneven. Minimum-core assumes an agent already knows command names, Generic task Skills omit much of the natural-language intake and final-result contract, and the Hermes facet documents resident operations too tersely. The hosted workflow helper also writes unsigned plan files and validates workflows without the required concrete selection.

The design must preserve current ownership: minimum-core owns exact CLI facts, Generic owns finite research-task semantics, and Hermes owns resident supervision. Source packages remain authoritative; generated packages and the review mirror are derived.

## Goals / Non-Goals

**Goals:**

- Let an agent with no project context translate ordinary research requests into bounded Zotero operations.
- Keep every `SKILL.md` independently executable while reserving complex branches and examples for coherent references.
- Make the existing Generic result JSON discoverable, exemplified, and validated from one Schema source.
- Give hosted workflow plans durable identity, per-entry state, and fail-closed recovery.
- Add deterministic depth gates without treating raw length as a substitute for semantic review.

**Non-Goals:**

- Change Zotero Bridge CLI syntax or command behavior.
- Add a second result DTO or a plugin domain model for Generic task results.
- Let the Hermes service create or modify cron schedules.
- Publish any surface or release as part of this change.

## Decisions

1. **Generate an intent-first command catalog alongside detailed command references.** The catalog maps natural-language task families to canonical commands and detailed references, while command cards retain argv, schemas, effects, approvals, handles, and recovery. This avoids a duplicate command manual and preserves progressive disclosure.

2. **Use thick executable Skill contracts with coherent optional references.** Generic and Hosted `SKILL.md` files carry intake, routing, hard constraints, execution, verification, completion, failure handling, and result/receipt shape. References add decision matrices, end-to-end traces, complex branches, and recovery analysis without restating normative rules.

3. **Keep `output.schema.json` as the Generic result SSOT.** The shared Schema retains `$id: zotero-library-task.result.v1`, gains field descriptions and completed/canceled/failed examples, and is copied into every materialized Skill. `SKILL.md` contains the minimum field semantics and one valid example. The Runner marker remains outside the business payload and is stripped before AJV validation.

4. **Apply depth policy only to materialized instruction files.** A materialized `SKILL.md` below 100 lines or reference below 200 lines fails. Files below 200 or 350 lines respectively emit a non-blocking warning that semantic review must disposition. Source templates remain subject to structural and generation checks rather than materialized length checks.

5. **Use two normalized tables for hosted workflow plans.** `workflow_plans` owns immutable plan identity and aggregate state; `workflow_plan_entries` owns per-selection reservation, launch identity, uncertain effects, and run linkage. `watched_runs` remains the runtime watch cache. The unused generic journal table is not promoted into an untyped state store.

6. **Treat every hosted submit as fresh authority.** A plan is evidence of reviewed inputs, not an approval token. Submit verifies the file, database digest, current workflow contract, and entry selection before any remote call. An uncertain remote effect marks the entry unknown and stops the batch without replay.

## Risks / Trade-offs

- **Longer guidance can waste context** → Keep core and extended ownership separate, add clear reference-loading conditions, and retain command/workflow catalogs as indexed optional documents.
- **Line gates can reward padding** → Pair thresholds with required semantic domains, end-to-end trace checks, and duplicate review.
- **Workflow contract drift can invalidate prepared plans** → Store the described contract digest and require live revalidation before submit.
- **A crash can occur after remote submit but before local run registration** → Reserve each entry before the call, mark stale launching entries unknown, and prohibit automatic replay.
- **State migration could encounter unexpected journal data** → Drop only an empty unused table; preserve non-empty unknown data and fail closed for submission.
