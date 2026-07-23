# Automation Policy

## Authority matrix

| Action | Cron | Interactive resident request | Required evidence |
| --- | --- | --- | --- |
| Refresh local index/catalog | Allowed | Allowed | Receipt and refresh/change counts |
| Search local projection | Allowed when the job declares it | Allowed | Cache freshness plus live confirmation for external claims |
| Read live library/Synthesis state | Allowed as one bounded pass | Allowed | Returned refs and freshness facts |
| Watch registered runs or sync notifications | Allowed as one bounded pass | Allowed | Run/event IDs and receipt |
| Produce hygiene, workflow-status, or attention proposal | Allowed | Allowed | Candidate reason and next live check |
| Plan a Zotero-managed workflow | Not shipped in cron | Allowed | Current selection, workflow validation, persisted plan |
| Submit a workflow | Never | Allowed only for the reviewed plan | Current operator instruction, `--allow-submit`, Zotero approval path |
| Execute a self-owned agent handoff | Never | Delegate to Generic | Handoff contracts, local validation, apply receipt |
| Mutate Zotero or apply agent output | Never | Use Generic/CLI contract | Current request, exact target/effect, Zotero-side approval |
| Destructive maintenance | Never | Requires current target-level human decision | Diagnostics, proposal, approval, post-state |

Local cache and journal writes are resident bookkeeping, not authority to change Zotero. A prior approval, old plan, pending workflow, cached candidate, or scheduled proposal cannot be promoted into a new write.

## Workflow mode and delegation

Choose workflow ownership from the live description. The resident plan helper supports Zotero-managed execution for the current selection. It produces runs that can be registered and watched. Provider-profile decisions, workflow options beyond this helper's plan contract, and finite research judgment belong to the inherited Generic task Skill.

When the workflow advertises self-owned agent execution, delegate the entire handoff to Generic: prepare/inspect requests, perform semantic work, validate each result, apply the mapping, and inspect the durable apply receipt. Resident watched runs and notifications do not supervise `agentRunId` values.

Use live workflow discovery even when a cached catalog entry exists. A cached definition helps selection but cannot establish current execution modes, backend compatibility, permissions, or result schema.

## Plan and submit

Create the deterministic plan from current context:

```sh
scripts/zotero_librarian_service.py workflow plan \
  --workflow <workflow-id> --from-context \
  --output <absolute-plan.json>
```

Inspect `receipt.data.selectionRefs`, `inputUnit`, workflow ID, `planId`, `planDigest`, workflow contract digest, `defaultConcurrency`, entries, and the file returned in `receipt.data.path`. If the selection is empty, stale, or contains unintended objects, correct the Zotero selection and produce a new plan. Do not hand-edit the file and represent it as service-validated.

After the operator authorizes that exact plan, submit it:

```sh
scripts/zotero_librarian_service.py workflow submit \
  --plan <absolute-plan.json> --allow-submit
```

The explicit flag records current operator authority but cannot replace Zotero-side approval. The service verifies the file, registered path, plan digest, live workflow contract, and every pending selection before a remote call. Preserve every returned run and the count of remaining plan entries. Another pass over remaining entries requires another current instruction; do not treat the original authorization as an indefinite batch grant or replay an entry marked launched or unknown.

## Provider profiles and concurrency

The resident plan file does not encode a backend provider profile. If the workflow requires backend-owned provider options, use Generic to list/describe the backend profile, validate the provider JSON independently from workflow inputs, and submit through the exact CLI contract that joins them. Connection profile and provider profile are separate concepts.

Resident submission defaults to concurrency one. A higher `--concurrency` launches at most that many plan entries in the current pass and must be explicitly approved after considering backend/provider limits, cost, item independence, and monitoring capacity. Never use a large value to emulate an unattended queue.

Record each launched `workflowRunId` independently. Partial launch does not mean remaining entries failed or were authorized for a later run. If one launch is uncertain, inspect live recent runs before resubmitting that entry.

## Cron and maintenance

Every shipped cron is Zotero-read-only and one-pass. It may update `state.sqlite`, emit attention, and produce `[SILENT]` for no reportable delta. It cannot wait, ask for approval, submit, apply, acknowledge events on assumption, invoke user-selected scripts, or write arbitrary paths.

Workflow-status triage identifies watched runs needing review. Library hygiene currently identifies repeated-title candidates. Synthesis attention reports live ranked entries. These are diagnostics and proposals. Before remediation, invoke the appropriate Generic task, re-read the current objects, explain the effect, and obtain current authority.

Maintenance of Synthesis cache, indexes, sidecar, graph, or metrics follows the Generic Synthesis and CLI contracts. An empty queue or stale local projection is not sufficient reason to modify derived state.

## Interaction and reporting

For a waiting run, inspect its live `skillRunId` and declared actions before reply or connect. Permission IDs are observational in the CLI; approval remains in the scoped Zotero UI. Notification events are acknowledged only after their requested or implied follow-up has actually been handled.

Report attention with its reason, item/run/event identifiers, cache freshness when relevant, and next safe live check. Distinguish a proposal from a launched run, a launched run from a terminal result, and a terminal result from verified Products, artifacts, or Zotero changes. Failed receipts retain the stable code and explain the live re-read needed before retry.

## Natural-language automation decisions

Resident requests often use operational language without naming the actual authority boundary. Use the following decision patterns.

### “Watch this workflow”

Determine:

- Does the user provide a `workflowRunId`, or must a known run be registered?
- Do they want one current status check or refer to an existing schedule?
- Which states or events are reportable?
- Is interaction allowed, or should the pass only report?
- Does the expected output require Product/artifact verification beyond run state?

Policy:

- Register only a real Zotero-managed workflow run.
- Perform one `run watch` pass.
- Use live run commands for interaction.
- Do not wait, sleep, or poll until completion.
- Do not place a self-owned `agentRunId` in watched runs.
- Do not acknowledge a notification merely because the run is terminal.

### “Tell me when something needs attention”

Determine:

- Which domains count: failed/stalled runs, unhandled events, duplicate candidates, Synthesis attention, or all of them?
- Does the user want every candidate or only a threshold?
- Is this a current report or an existing recurring schedule?

Policy:

- Run the bounded attention-producing passes.
- Preserve each candidate's reason and identity.
- Treat `attention` as a completed proposal/report.
- Do not mutate, resubmit, repair, or acknowledge automatically.
- Use Generic task policy for any follow-up research or curation.

### “Keep my library clean”

This wording is never sufficient mutation authority.

Convert it into:

1. A declared diagnostic domain.
2. A one-pass candidate report.
3. A live re-read of candidate objects.
4. A Generic Curation proposal.
5. A separate current target-level decision.
6. A verified write and durable receipt if approved.

The scheduled library-hygiene pass currently identifies repeated-title candidates. Repeated title is not duplicate proof and cannot select a survivor.

### “Run analysis every night”

Separate:

- finite workflow selection and validation;
- operator-approved plan/submit;
- external schedule configuration;
- per-run monitoring;
- output verification.

The resident service cannot install or modify cron. The shipped cron jobs intentionally do not submit workflows. Report the requested cadence as an external configuration need; do not modify a cron file or imply the schedule exists.

### “Answer questions from my library”

Use the resident index for discovery or change comparison, then delegate the bounded answer to Generic Query. Confirm current facts live. Do not expose cache-only conclusions as current Zotero state.

### “Automatically fix whatever failed”

Reject the implied blanket authority. Different failures may represent:

- no remote effect;
- successful remote effect with lost response;
- partial workflow launch;
- missing Product or artifact;
- provider unavailability;
- denied permission;
- stale local projection;
- destructive curation ambiguity.

Classify the failure and return the next safe check. Never turn the word “automatically” into mutation or replay authority.

## Workflow plan authority lifecycle

### Prepare

A plan is prepared only when:

- the live workflow description is available;
- the selection contract uses an input unit supported by the helper;
- each selected object is normalized according to that input unit;
- every entry passes live workflow validation;
- no unsupported required workflow option or provider input is hidden;
- the absolute output path is accepted;
- the plan file and database registry share the same identity.

The plan stores:

- `schema: zotero-librarian.workflow-plan.v2`;
- `planId`;
- `workflowId`;
- creation time;
- workflow description digest;
- default concurrency;
- validated submissions;
- canonical `planDigest`.

### Review

The operator reviews:

- workflow outcome;
- exact selected refs;
- input unit;
- number of entries;
- expected provider/execution boundary;
- plan path and digest;
- concurrency for the next pass;
- expected run/result evidence.

Review does not mutate the file. Any desired change requires a new plan from live context.

### Authorize

Authority is current and invocation-specific:

- `--allow-submit` must be present.
- The user instruction must refer to the reviewed exact plan.
- A previous submit does not authorize remaining entries.
- Increasing concurrency requires explicit consideration and authority.
- Zotero-side approval remains independent.

Never persist an “approved” flag in the plan database. That would convert a past decision into reusable authority.

### Validate again

Before the remote submit:

- read the absolute file;
- validate Schema and required fields;
- recompute canonical digest;
- match plan ID, digest, output path, workflow ID, and registered JSON;
- re-describe the workflow;
- match the workflow description digest;
- revalidate every entry selected for this pass.

Any mismatch fails closed before remote effect.

### Reserve and launch

For each eligible entry:

1. Persist `launching`.
2. Call the remote workflow submit.
3. On a valid returned `workflowRunId`, persist `launched` and the watched run in one local transaction.
4. On transport error or missing run ID, persist `unknown`.
5. Stop the batch after `unknown`.

Only `pending` entries are eligible. `launched`, `unknown`, and stale `launching` entries are never automatically replayed.

### Report

The submit receipt states:

- plan ID;
- runs launched in this pass;
- remaining pending count;
- uncertain entry when present;
- status `changed` for known launches;
- status `attention` for unknown remote effect.

This receipt proves local recording of the returned result. It does not prove workflow completion, output quality, Product delivery, or Zotero writeback.

## Provider, options, and unsupported plans

The resident plan helper intentionally handles only the simple current-selection join it can validate safely. Route to Generic when:

- required workflow options are not represented by the helper;
- a provider profile must be chosen or validated;
- the workflow uses self-owned agent execution;
- the selection contract accepts a unit the helper does not support;
- no-selection execution is required;
- one workflow entry needs a multi-item grouping not represented by one selected ref;
- the task needs custom result handling or apply-back.

Do not strip required options, choose a default provider silently, convert a self-owned workflow into a Zotero-managed one, or split a grouped selection merely to make the helper accept it.

## Concurrency decisions

Default concurrency one is a safety boundary, not a performance accident.

Increase concurrency only when:

- entries are independent;
- provider/backend capacity is known;
- expected cost is acceptable;
- monitoring can distinguish each run;
- failure of one does not invalidate another;
- the operator authorizes the exact bound for this pass.

Do not increase concurrency when:

- selections overlap;
- writes can conflict;
- provider quotas are uncertain;
- run interaction may be required;
- the workflow result order matters;
- prior entries have unknown state.

A concurrency value applies only to the current submit call. It does not create a queue worker or authorize future passes.

## Cron decision model

Shipped cron owns cadence; the service owns one pass. Keep those responsibilities separate.

Cron may:

- refresh local projections;
- compare state;
- watch known runs once;
- sync lightweight notifications;
- produce workflow-status, hygiene, or attention reports;
- emit `[SILENT]` for `unchanged`.

Cron may not:

- submit or resubmit a workflow;
- execute self-owned handoffs;
- acknowledge events without handled action;
- mutate Zotero;
- apply results;
- run destructive maintenance;
- wait for interaction;
- create another schedule.

If a user requests a new cadence, report:

- intended service command;
- read/write authority;
- desired reporting threshold;
- external scheduling requirement.

Do not edit the profile schedule as part of ordinary Skill execution.

## Attention and escalation playbooks

### Waiting run

1. Read live run state.
2. Resolve the current `skillRunId`.
3. Inspect declared actions.
4. Report the required interaction.
5. Reply or connect only under the matching Generic/CLI contract.
6. Acknowledge related notification after handling.

### Failed run

1. Preserve run and workflow IDs.
2. Inspect structured failure and expected outputs.
3. Determine whether any Product/artifact exists.
4. Separate provider failure, workflow failure, missing output, and Zotero apply failure.
5. Route finite semantic retry decisions to Generic.
6. Do not resubmit from a notification.

### Unknown submission

1. Preserve plan ID, entry ordinal, selection refs, and error.
2. Inspect live active/recent runs for a match.
3. Reconcile with watched state.
4. Do not replay the unknown entry.
5. Create a new plan only after proving no earlier run/effect exists and obtaining new authority.

### Hygiene candidate

1. Preserve candidate reason and item refs.
2. Read both live objects.
3. Determine whether they are duplicates, versions, or false positives.
4. Delegate proposal construction to Curation.
5. Require exact destructive authority.

### Synthesis attention

1. Inspect the live attention entry.
2. Resolve model identity and freshness.
3. Delegate interpretation to Generic Synthesis.
4. Diagnose maintenance separately.
5. Do not mutate derived state from queue membership alone.

## Reporting language

Use:

> The one-pass run check found two runs requiring review. No workflow was submitted or retried.

Use:

> Entry 2 has an uncertain submission outcome. I preserved the plan identity and stopped before later entries. Live recent runs must be reconciled before any new plan.

Use:

> The weekly hygiene pass found three repeated-title groups. These are review candidates, not confirmed duplicates.

Do not use:

- “monitoring continuously” for one-pass checks;
- “approved” for a stored plan;
- “fixed” for an attention proposal;
- “completed” for a terminal run whose output was not verified;
- “scheduled” when no external schedule was configured;
- “safe to retry” when remote effect is unknown.
