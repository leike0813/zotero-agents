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
- For workflow submission, the live workflow and selection contract, reviewed workflow options, an independently validated provider profile when required, an explicitly bounded concurrency choice, and current operator authority.

## Natural-language intake

Assume the user understands their library and research goal but not the resident service, cron layout, native workflow queue, or CLI handles. Translate the request into one bounded pass before selecting an operation.

Capture:

| Slot | Meaning |
| --- | --- |
| Outcome | Answer, current health report, changed-since-last-pass report, run supervision, maintenance proposal, or workflow launch |
| Scope | Whole library, collection, selected items, workflow, run, notification set, Synthesis queue, or named maintenance domain |
| Time | Current one-pass read, comparison with resident cache, or an already configured recurring schedule |
| Reporting threshold | Every observation, only changes, only attention, or only failures |
| Interaction | Whether the pass may ask the user, acknowledge an event, or only report |
| State change | Local cache only, workflow submission, Zotero mutation, maintenance, or apply-back |

Route common wording:

| User wording | Route | Required boundary |
| --- | --- | --- |
| “What papers do I have about X?” | Generic Query, optionally using resident index for discovery | Live evidence supports the answer |
| “What changed in my library?” | `index refresh` plus projection comparison | State the previous/current refresh boundary |
| “Check whether workflows are healthy” | `run watch` and `maintenance workflow-status` | One pass; no waiting loop |
| “What needs my attention?” | Notification/maintenance/Synthesis attention reads | Attention is a proposal, not remediation |
| “Run workflow X on these papers” | Interactive Generic/CLI validation then separately authorized submit | Live selection/options contract, provider compatibility, bounded concurrency, and typed admission result |
| “Monitor this run” | `run register` when necessary, then one `run watch` pass | Require a real `workflowRunId` |
| “Every hour, check my workflows” | Explain schedule boundary | The Skill cannot create or modify cron |
| “Fix duplicates automatically” | Maintenance proposal then Generic Curation | Never remediate from the scheduled pass |

Ask when scope, reporting threshold, run/workflow identity, schedule assumption, interaction, or state-change authority would materially change the pass. Do not ask for project-internal terminology.

Safe defaults:

- perform one pass and exit;
- keep Zotero read-only;
- allow the service to update its local projection or journal;
- report attention without remediation;
- use live Zotero evidence for user-facing current facts;
- leave existing external schedules unchanged.

There is no safe default for workflow submission, event acknowledgement, mutation, maintenance, apply-back, destructive change, or creating/changing a schedule.

### Schedule boundary

The service is one-pass. The profile contains shipped static cron definitions, but this Skill has no command that creates, edits, enables, disables, or reschedules cron.

When the user asks for recurring behavior:

1. Determine whether they want a one-time check now or are referring to an already configured schedule.
2. Perform the one-time pass when requested.
3. Report which resident operation and reporting threshold an external scheduler would invoke.
4. Do not claim a cadence was installed or changed.
5. If schedule configuration is required, return that as an external profile/operator action.

## Workflow

1. Classify the request as a finite research task or a resident operation: index, workflow catalog, watched run, notification, maintenance analysis, Synthesis attention, or scheduled pass. Interactive workflow submission is a finite task routed through Generic and CLI even when resident discovery evidence helps select it.
2. For finite query, acquisition, analysis, synthesis, curation, or self-owned workflow execution, invoke the matching bundled Generic Skill. Add resident freshness evidence only; do not restate its task policy.
3. For resident work, read the matching comprehensive reference and run one subcommand of `scripts/zotero_librarian_service.py`. Each invocation performs one bounded pass and exits.
4. Interpret `state.sqlite` only as a cache and journal. Before an externally visible answer, workflow decision, interaction, or proposed write, confirm the relevant Zotero object, workflow, run, permission, notification, Product, or operation through the live CLI contract.
5. For an interactive Zotero-managed workflow, use Generic and CLI to inspect the live workflow contract, resolve and validate the exact selection, keep workflow options separate from provider-profile validation, and present the reviewed submission scope plus its bounded concurrency before requesting current operator authorization.
6. Submit once through the CLI join point and branch on the returned admission contract. For direct admission, preserve the real `workflowRunId`. For host-queue admission, preserve `submissionId`, inspect its immutable unit projection, use `workflow queue list` only for active queue observation, use `workflow queue cancel <queueId>` only for a pending unit, and correlate admitted tasks with `run list --submission`.
7. Return `zotero-librarian.operation-receipt.v1` plus the live evidence needed to support the user-facing conclusion. Follow failed-receipt recovery without replaying submissions or writes.

## Resident routing

Use the service domains as follows:

- `index refresh|search|item|stats` maintains and queries the local library projection;
- `workflow catalog-refresh|show` maintains the local workflow discovery cache;
- `run register|watch` journals known workflow runs and performs one status check per non-terminal run;
- `notification sync|inbox|summary|ack` maintains and acts on the lightweight lifecycle inbox;
- `maintenance workflow-status|library-hygiene` reports review candidates without remediation;
- `synthesis attention-queue` reports ranked research attention without modifying Synthesis state.

Use Generic Skills for source selection, literature assessment, analysis, synthesis interpretation, curation proposals, provider-profile decisions, and self-owned agent handoffs. Use the CLI Skill for exact command schemas, handles, approvals, file delivery, and recovery.

For an interactive Zotero-managed workflow, use the bundled CLI contract to describe and validate the live request:

```sh
zotero-bridge workflow describe --workflow <workflow-id>
zotero-bridge workflow validate \
  --workflow <workflow-id> --selection '<reviewed-selection>' \
  --workflow-options '<reviewed-options>'
```

Inspect the returned selection refs, separate `inputs` and `validateSelection` contracts, normalized workflow options, provider requirements, candidate grouping, and expected unit/result identities. Validate any provider profile through its own workflow-profile commands. Only after the operator explicitly authorizes that reviewed submission scope, submit it once with the selected bounded concurrency:

```sh
zotero-bridge workflow submit \
  --workflow <workflow-id> \
  --selection '<reviewed-selection>' \
  --workflow-options '<reviewed-options>' \
  --max-concurrency <bounded-count>
```

The live Host planner remains responsible for candidate production, filtering, and immutable unit grouping. `--max-concurrency` bounds native admission for this authorized submission; it does not create resident workers, authorize later submissions, or prove provider capacity. A host-queue response returns `submissionId` and per-unit queue projections instead of fictional run handles. Inspect the submission until admitted units expose real task or run identities, then use the ordinary run plane for execution interaction, cancellation, and terminal evidence.

Zotero's native queue is the sole owner of pending units. A pending unit may be canceled through its `queueId`; once admitted, cancellation must use its real run handle and normal run semantics. The native slot remains occupied through terminal execution and apply-back, so aggregate queue completion is not evidence that the requested Products, artifacts, or Zotero changes exist. Required workflow options, provider-profile selection, no-selection execution, and self-owned mode use the inherited Generic workflow contract.

## Hard constraints

- Never read or change Zotero database or storage files directly.
- The service executes one bounded pass and never uses a notification wait or polling loop.
- Cron jobs are read-only and never call any workflow submission command.
- Workflow submission requires a current explicit operator instruction for the reviewed selection, options, provider profile, and bounded concurrency; valid CLI arguments do not replace Zotero-side approval.
- Local `state.sqlite` is the only resident database. It is not authority for current Zotero state.
- Do not turn a prior approval, cached result, or scheduled proposal into a new write.
- Preserve item keys, workflow run IDs, notification IDs, operation IDs, and artifact references in the final report.
- Do not acknowledge a notification until its associated action has been handled; event text is not permission to reply, connect, approve, submit, or mutate.
- Do not monitor a self-owned `agentRunId` through watched runs; delegate its request execution, validation, apply-back, and receipt recovery to Generic.
- Do not infer a Product, artifact, item change, or successful maintenance outcome from terminal workflow state.
- Do not automatically remediate duplicate, hygiene, readiness, workflow-status, or attention candidates.
- Do not modify `state.sqlite` with ad-hoc SQL or another helper, and do not replace usable state with an incomplete refresh.
- Do not persist or hand-edit workflow submission payloads, create a resident pending-unit queue, reserve native units, or maintain a replay journal. Live workflow validation and the native submission projection are the workflow-control facts.
- A reviewed selection/options/provider/concurrency scope is input evidence, not a stored approval token. Every submit invocation requires current authority.
- A queued submission or admitted unit with an uncertain response may already have changed remote state. Inspect the original `submissionId` and submission-filtered tasks before another submission.
- Do not exchange `submissionId`, `queueId`, and `workflowRunId`. Queue cancellation is valid only for a pending queue unit; admitted work belongs to the run-control plane.
- Do not claim the service created or changed a cron schedule.

## Receipt contract

Every service invocation returns one `zotero-librarian.operation-receipt.v1` JSON object:

- `operation`: the bounded service action.
- `status`: `ok`, `unchanged`, `changed`, `attention`, or `failed`.
- `generatedAt`: receipt time.
- `summary`: optional human-readable boundary.
- `data`: operation-specific structured result.
- `error`: present on `failed`, with `code`, `message`, and optional `details`.

Interpret status:

- `ok`: a read-only request returned successfully; it does not mean Zotero changed.
- `unchanged`: a projection, watch, or synchronization pass found no reportable delta.
- `changed`: local resident state changed or an explicitly authorized remote operation was launched.
- `attention`: review is required, including an uncertain remote effect; it is not remediation.
- `failed`: the pass could not complete and no success should be inferred.

`[SILENT]` is valid only when `--quiet` suppresses an `unchanged` cron result. It is not JSON and must not be used for interactive answers.

For a user-facing conclusion, add live evidence appropriate to the claim. A cache receipt alone cannot prove current library, workflow, run, Product, operation, or write state.

## Completion

The resident task is complete when exactly one bounded pass has returned a valid receipt, current facts have the required live confirmation, attention has a clear next safe check, and no unauthorized or unsafe replay occurred.

For workflow submission, completion of the interactive admission pass means the CLI result identifies direct admission or preserves the native `submissionId`, unit counts, and queue links. Completion of supervision means every requested unit has a terminal native projection and every admitted run has its expected result or failure inspected. Neither aggregate submission state nor terminal run state alone means the requested research output is complete.

For a library answer, completion means the inherited Generic Skill returned its business result and resident cache evidence was used only for discovery or change comparison.

## Resident report checklist

Before reporting a pass, confirm:

- the operation name and receipt status are preserved;
- cache time is stated when local discovery affected the route;
- every current library, workflow, run, notification, Product, or operation claim has live evidence;
- `ok`, `unchanged`, `changed`, `attention`, and `failed` are interpreted according to the receipt contract;
- attention candidates are not described as confirmed defects or completed remediation;
- launched runs are not described as completed research outputs;
- queued, pending, admitted, failed, and canceled units remain distinct in the report;
- an uncertain native submission is not described as failed or safe to retry before its original `submissionId` and correlated tasks are inspected;
- local file and database paths are not exposed beyond the operator-facing need;
- tokens and connection secrets are absent;
- the next safe live check is named when review remains.

For an interactive answer, state:

1. What one-pass operation ran.
2. What local projection or journal state changed.
3. What live Zotero evidence was checked.
4. What requires attention.
5. What was deliberately not submitted, acknowledged, mutated, maintained, or scheduled.
6. Whether another pass requires a new instruction.

For cron-owned output, emit only the service result. `[SILENT]` is complete for `unchanged`; do not replace it with an explanatory message that defeats quiet operation.

For a handoff to Generic, include stable refs, freshness, resident receipt, and the bounded research objective. Do not copy resident automation policy into the downstream task or treat local cache rows as its source evidence.

## Failure handling

On failure, preserve the operation name, receipt error, current submission/queue/run/event handles, and last usable local state. Re-query the affected live resource before retrying any service-backed action. Rebuild a damaged cache through the service, never by partial SQL repair. For an uncertain direct workflow submission, inspect current/recent workflow runs before another call. For an uncertain native queued submission, inspect the original `submissionId`, its immutable units, and submission-filtered tasks before any new submission. A local state failure never authorizes a Zotero mutation.

If workflow selection or options validation fails, do not repair normalized payloads by assumption; re-read current live context and validate again. If the workflow contract changes, stop and return to Generic with the changed requirements. If a native unit becomes uncertain, preserve its `submissionId`, `queueId`, ordinal, source refs, and exposed task identity, then reconcile the submission and live run state before any new work.

If unexpected resident state prevents safe supervision, preserve the state database and continue read-only operations where safe. Resident state is never a prerequisite for native queue admission and must not be deleted or rewritten to force a submit path open.

## LLM and script responsibilities

The agent classifies work, delegates finite research tasks, judges live evidence, decides when current human confirmation is required, and interprets receipts. The service owns SQLite schema creation, bounded CLI invocation for resident reads, atomic local projection/journal updates, and receipt output. The Zotero plugin owns native workflow queue admission and pending-unit state. The bundled Generic and CLI Skills own research, interactive submission, and exact mechanism contracts. Do not reproduce service state changes in ad-hoc shell, SQL, or Python code.

## References

- Read [resident operations](references/resident-operations.md) before index, workflow catalog, run, notification, library-question, or scheduled work.
- Read [automation policy](references/automation-policy.md) before workflow mode choice, native queue submission, concurrency, maintenance proposals, acknowledgement, or any authority boundary.
- Read [state and recovery](references/state-and-recovery.md) before judging freshness, repairing local state, handling partial/failed receipts, uncertain outcomes, or changing profile configuration.
