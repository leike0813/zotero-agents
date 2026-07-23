---
name: zotero-librarian
description: Supervise a resident Zotero library. Use when Hermes performs ongoing monitoring, maintenance, or library questions.
---

# Zotero Librarian

## Goal

Maintain a trustworthy resident view of a Zotero library, supervise one-pass scheduled and interactive operations, surface actionable changes, and answer library questions. Delegate finite research judgment to the bundled Generic Skills and exact Zotero operations to the bundled CLI Skill.

## Inputs

- A user request, shipped cron invocation, or explicit operator instruction.
- A matching `zotero-bridge` executable, embedded contract, and working connection profile.
- Optional `ZOTERO_LIBRARIAN_STATE_DIR`; otherwise state is `$HERMES_HOME/zotero-librarian/state.sqlite`.
- For workflow submission, an absolute reviewed plan path and current operator authority.

## Workflow

1. Classify the request as a finite research task or a resident operation: index, workflow catalog/plan/submit, watched run, notification, maintenance analysis, Synthesis attention, or scheduled pass.
2. For finite query, acquisition, analysis, synthesis, curation, or self-owned workflow execution, invoke the matching bundled Generic Skill. Add resident freshness evidence only; do not restate its task policy.
3. For resident work, read the matching comprehensive reference and run one subcommand of `scripts/zotero_librarian_service.py`. Each invocation performs one bounded pass and exits.
4. Interpret `state.sqlite` only as a cache and journal. Before an externally visible answer, workflow decision, interaction, or proposed write, confirm the relevant Zotero object, workflow, run, permission, notification, Product, or operation through the live CLI contract.
5. For an interactive Zotero-managed workflow, create an absolute plan file, inspect its selected parent refs and workflow ID, then request current operator authorization for that exact file.
6. Submit only the reviewed plan with `--allow-submit`; use default concurrency `1` unless the operator explicitly approves a larger bounded value. Register and monitor returned `workflowRunId` values through one-pass resident commands.
7. Return `zotero-librarian.operation-receipt.v1` plus the live evidence needed to support the user-facing conclusion. Follow failed-receipt recovery without replaying submissions or writes.

## Resident routing

Use the service domains as follows:

- `index refresh|search|item|stats` maintains and queries the local library projection;
- `workflow catalog-refresh|show` maintains the local workflow discovery cache;
- `workflow plan|submit` prepares and launches reviewed Zotero-managed workflow work;
- `run register|watch` journals known workflow runs and performs one status check per non-terminal run;
- `notification sync|inbox|summary|ack` maintains and acts on the lightweight lifecycle inbox;
- `maintenance workflow-status|library-hygiene` reports review candidates without remediation;
- `synthesis attention-queue` reports ranked research attention without modifying Synthesis state.

Use Generic Skills for source selection, literature assessment, analysis, synthesis interpretation, curation proposals, provider-profile decisions, and self-owned agent handoffs. Use the CLI Skill for exact command schemas, handles, approvals, file delivery, and recovery.

For an interactive Zotero-managed workflow, write the validated plan to an absolute path:

```sh
scripts/zotero_librarian_service.py workflow plan \
  --workflow <workflow-id> --from-context \
  --output <absolute-plan.json>
```

Inspect the returned parent item refs and plan file. Only after the operator explicitly authorizes launching that reviewed plan, submit the same file:

```sh
scripts/zotero_librarian_service.py workflow submit \
  --plan <absolute-plan.json> --allow-submit
```

The plan records one submission per normalized selected parent and `defaultConcurrency: 1`. `workflow submit --concurrency <n>` launches at most that many entries in the current pass and reports `remaining`; it does not authorize later passes. Provider-profile selection or a self-owned execution mode uses the inherited Generic workflow contract rather than the resident plan helper.

## Hard constraints

- Never read or change Zotero database or storage files directly.
- The service executes one bounded pass and never uses a notification wait or polling loop.
- Cron jobs are read-only and never call `workflow submit`.
- Workflow submission requires a current explicit operator instruction for the reviewed plan and `--allow-submit`; the flag records that boundary but does not replace Zotero-side approval.
- Local `state.sqlite` is the only resident database. It is not authority for current Zotero state.
- Do not turn a prior approval, cached result, or scheduled proposal into a new write.
- Preserve item keys, workflow run IDs, notification IDs, operation IDs, and artifact references in the final report.
- Do not acknowledge a notification until its associated action has been handled; event text is not permission to reply, connect, approve, submit, or mutate.
- Do not monitor a self-owned `agentRunId` through watched runs; delegate its request execution, validation, apply-back, and receipt recovery to Generic.
- Do not infer a Product, artifact, item change, or successful maintenance outcome from terminal workflow state.
- Do not automatically remediate duplicate, hygiene, readiness, workflow-status, or attention candidates.
- Do not modify `state.sqlite` with ad-hoc SQL or another helper, and do not replace usable state with an incomplete refresh.

## Completion

Finish with a `zotero-librarian.operation-receipt.v1` receipt: `unchanged` means the pass found no reportable delta, `changed` means local projection/journal state or an explicitly launched operation changed, `attention` means current review is required, and `failed` includes a structured error. Use `[SILENT]` only for a cron-owned unchanged receipt with `--quiet`. A user-facing answer additionally cites the live evidence that confirms any freshness-sensitive fact.

## Failure handling

On failure, preserve the operation name, receipt error, current plan/run/event handles, and last usable local state. Re-query the affected live resource before retrying any service-backed action. Rebuild a damaged cache through the service, never by partial SQL repair. For an uncertain workflow submission, inspect current/recent workflow runs and watched state before launching another entry. A local state failure never authorizes a Zotero mutation.

## LLM and script responsibilities

The agent classifies work, delegates finite research tasks, judges live evidence, decides when current human confirmation is required, and interprets receipts. The service owns SQLite schema creation, bounded CLI invocation, atomic local projection/journal updates, plan serialization, and receipt output. The bundled Generic and CLI Skills own research and exact mechanism contracts. Do not reproduce service state changes in ad-hoc shell, SQL, or Python code.

## References

- Read [resident operations](references/resident-operations.md) before index, workflow catalog, run, notification, library-question, or scheduled work.
- Read [automation policy](references/automation-policy.md) before workflow mode choice, planning, submission, concurrency, maintenance proposals, acknowledgement, or any authority boundary.
- Read [state and recovery](references/state-and-recovery.md) before judging freshness, repairing local state, handling partial/failed receipts, uncertain outcomes, or changing profile configuration.
