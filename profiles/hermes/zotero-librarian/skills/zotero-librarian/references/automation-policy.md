# Automation Policy

## Authority matrix

| Action | Cron | Interactive resident request | Required evidence |
| --- | --- | --- | --- |
| Refresh local index/catalog | Allowed | Allowed | Receipt and refresh/change counts |
| Search local projection | Allowed when the job declares it | Allowed | Cache freshness plus live confirmation for external claims |
| Read live library/Synthesis state | Allowed as one bounded pass | Allowed | Returned refs and freshness facts |
| Watch registered runs or sync notifications | Allowed as one bounded pass | Allowed | Run/event IDs and receipt |
| Produce hygiene, workflow-status, or attention proposal | Allowed | Allowed | Candidate reason and next live check |
| Validate a Zotero-managed workflow | Not shipped in cron | Allowed through Generic/CLI | Current selection, workflow/options validation, provider compatibility |
| Submit a workflow | Never | Allowed only for the reviewed current scope | Current operator instruction, bounded concurrency, Zotero approval path |
| Execute a self-owned agent handoff | Never | Delegate to Generic | Handoff contracts, local validation, apply receipt |
| Mutate Zotero or apply agent output | Never | Use Generic/CLI contract | Current request, exact target/effect, Zotero-side approval |
| Destructive maintenance | Never | Requires current target-level human decision | Diagnostics, proposal, approval, post-state |

Local cache and journal writes are resident bookkeeping, not authority to change Zotero. A prior approval, observed native submission, pending workflow, cached candidate, or scheduled proposal cannot be promoted into a new write.

## Workflow mode and delegation

Choose workflow ownership from the live description. Zotero-managed execution uses the Generic task policy and exact CLI join point; the Zotero plugin's native queue owns pending-unit ordering, bounded admission, and slot lifetime. Admitted runs can be registered and watched. Provider-profile decisions, workflow options, source grouping judgment, and finite research interpretation belong to the inherited Generic task Skill.

When the workflow advertises self-owned agent execution, delegate the entire handoff to Generic: prepare/inspect requests, perform semantic work, validate each result, apply the mapping, and inspect the durable apply receipt. Resident watched runs and notifications do not supervise `agentRunId` values.

Use live workflow discovery even when a cached catalog entry exists. A cached definition helps selection but cannot establish current execution modes, backend compatibility, permissions, or result schema.

## Native submission and queue supervision

Describe and validate the current request through the bundled CLI:

```sh
zotero-bridge workflow describe --workflow <workflow-id>
zotero-bridge workflow validate \
  --workflow <workflow-id> --selection '<reviewed-selection>' \
  --workflow-options '<reviewed-options>'
```

Inspect the exact selection refs, separate `inputs` and `validateSelection` contracts, workflow ID, required options, provider requirements, candidate-production rules, immutable unit grouping, expected outputs, and approval boundary. If the selection is empty, stale, or contains unintended objects, correct the live Zotero selection and validate again. Do not reconstruct prepared units locally or represent cached catalog data as live validation.

After the operator authorizes that exact reviewed scope and bounded concurrency, submit once:

```sh
zotero-bridge workflow submit \
  --workflow <workflow-id> \
  --selection '<reviewed-selection>' \
  --workflow-options '<reviewed-options>' \
  --max-concurrency <bounded-count>
```

Valid arguments record the current reviewed scope but cannot replace Zotero-side approval. The Host revalidates the live workflow contract and selection before admitting work. Read the returned `admission` branch: preserve `workflowRunId` for direct admission, or preserve `submissionId`, counts, queue links, and immutable unit projections for host-queue admission. Do not invent a run handle when the initial response intentionally represents pending work.

For queued work, inspect `workflow submission get <submissionId>` as the aggregate admission record. Use `workflow queue list` to observe active units and `workflow queue cancel <queueId>` only for a still-pending unit. Once a unit is admitted, correlate it with `run list --submission <submissionId>` and supervise the real run. A later submission requires another current instruction; do not treat the original authorization as an indefinite grant or replay a unit whose admission effect is uncertain.

## Provider profiles and concurrency

The workflow selection and options do not encode a backend provider profile. If the workflow requires backend-owned provider options, use Generic to list/describe the backend profile, validate the provider JSON independently from workflow inputs, and submit through the exact CLI contract that joins them. Connection profile and provider profile are separate concepts.

Interactive submission defaults to concurrency one. A higher `--max-concurrency` admits at most that many native units concurrently and must be explicitly approved after considering backend/provider limits, cost, item independence, apply-back duration, and monitoring capacity. The bound belongs to this accepted submission; it does not authorize future work.

Record the returned `submissionId`, every unit's `queueId`, and each admitted task or `workflowRunId` independently. Pending units are already part of the accepted native submission; they do not require resident relaunch and must not be interpreted as failed. If admission is uncertain, inspect the original submission and submission-filtered task list before making another call.

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
- operator-approved validation/submission scope;
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
- partial native admission;
- missing Product or artifact;
- provider unavailability;
- denied permission;
- stale local projection;
- destructive curation ambiguity.

Classify the failure and return the next safe check. Never turn the word “automatically” into mutation or replay authority.

## Native submission authority lifecycle

### Prepare

A Zotero-managed request is ready for authority review only when:

- the live workflow description is available;
- the live description exposes separate execution-input and candidate-production contracts;
- the raw current selection is resolved without resident candidate or grouping inference;
- the complete selection passes live workflow validation;
- required workflow options are explicit and validated;
- provider requirements are identified and validated through the separate profile contract;
- the supported execution mode is Zotero-managed;
- expected Products, artifacts, live changes, and interaction points are known;
- the proposed concurrency is a finite positive bound for this request.

The review record keeps these values distinct:

- workflow identity and outcome;
- exact selected refs or the declared no-selection form;
- workflow options;
- provider profile identity and validated provider JSON;
- candidate-selection and immutable grouping behavior;
- proposed native admission bound;
- expected unit-to-source correlation;
- expected run and output evidence.

### Review

The operator reviews:

- workflow outcome;
- exact selected refs;
- execution member and grouping contract;
- candidate selection and validation contract;
- expected number or shape of native units;
- expected provider/execution boundary;
- workflow options and their scope effects;
- concurrency for this accepted submission;
- expected run/result evidence;
- Zotero-side approval timing.

Review does not create queue entries or durable authority. Any desired change requires revalidation against current live context.

### Authorize

Authority is current and invocation-specific:

- The user instruction must refer to the reviewed workflow, selection, options, and provider scope.
- The bounded concurrency must be part of the reviewed effect when it is greater than one.
- A previous submission does not authorize another submission.
- A pending unit inside the accepted native submission does not need a new resident launch decision.
- Increasing concurrency requires explicit consideration and authority before the call.
- Zotero-side approval remains independent.

Never persist an “approved” flag in resident state. That would convert a past decision into reusable authority.

### Validate again

Before the remote submit:

- re-describe the workflow;
- confirm the execution mode;
- resolve the current selection;
- validate the complete selection and workflow options;
- revalidate the independently selected provider profile;
- preserve exact JSON bindings without moving provider fields into workflow options;
- confirm expected unit grouping and output contracts;
- confirm the authorized concurrency bound.

Any mismatch fails closed before remote effect.

### Admit through Zotero

Submit the reviewed request once. Then:

1. Read `admission` before choosing a monitoring family.
2. For direct admission, preserve the returned task identity and `workflowRunId`.
3. For host-queue admission, preserve `submissionId`, unit counts, queue links, and every immutable `queueId`.
4. Inspect the submission projection for pending, admitted, terminal, failed, and canceled units.
5. Correlate admitted tasks through the submission lineage filter.
6. Use queue cancellation only while the target unit remains pending.
7. Use run cancellation or interaction only after a real run handle exists.
8. Keep source refs and expected outputs attached to each unit throughout supervision.

The Zotero plugin owns pending-unit ordering, admission, and slot release. The resident profile does not reserve units, launch the next entry, or run a replay worker.

### Supervise and report

The interactive submission evidence states:

- direct or host-queue admission;
- `submissionId` when queued;
- aggregate unit counts and links;
- immutable unit identities;
- admitted task and run identities when present;
- pending cancellation receipts when requested;
- uncertain transport or state evidence when present.

The supervision report distinguishes:

- pending units already accepted by the native queue;
- units canceled before admission;
- admitted or running tasks;
- terminal successful tasks;
- terminal failed tasks;
- tasks whose Product, artifact, or live-change verification is incomplete.

This evidence proves the observed native admission and execution state. It does not prove output quality, Product delivery, Zotero writeback, or completion of the user's research outcome.

## Provider, options, and unsupported submissions

The interactive path sends one reviewed request to Host validation and delegates candidate production and immutable grouping to the live workflow contract. Route to Generic when:

- required workflow options need semantic selection or clarification;
- a provider profile must be chosen or validated;
- the workflow uses self-owned agent execution;
- no-selection execution is required;
- the task needs custom result handling or apply-back.

Do not strip required options, choose a default provider silently, convert a self-owned workflow into a Zotero-managed one, or locally reconstruct the Host's prepared units.

## Concurrency decisions

Default concurrency one is a safety boundary, not a performance accident. The selected value becomes the native queue's admission bound for this submission.

Increase concurrency only when:

- entries are independent;
- provider/backend capacity is known;
- expected cost is acceptable;
- monitoring can distinguish each run;
- submission lineage can correlate every admitted unit with its source identity;
- failure of one does not invalidate another;
- the operator authorizes the exact bound for this submission.

Do not increase concurrency when:

- selections overlap;
- writes can conflict;
- provider quotas are uncertain;
- run interaction may be required;
- apply-back may hold native slots for materially different durations;
- the workflow result order matters;
- an earlier submission has unknown state.

A concurrency value applies only to the current submit call. It configures Zotero's native queue; it does not create a resident queue worker, reserve local entries, or authorize future submissions. Pending native units are already accepted work and must not be resubmitted to simulate progress.

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

1. Preserve the returned or previously observed `submissionId`, unit `queueId` values, selection refs, and structured error.
2. Inspect the native submission projection before looking for a replacement operation.
3. Correlate admitted work with submission-filtered task discovery and real run state.
4. Reconcile admitted runs with watched state without treating the watched-run journal as queue authority.
5. Do not replay the selection or any unit whose admission effect remains unknown.
6. Make a new submission only after proving the earlier call created no accepted submission or admitted task and obtaining new authority.

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

> The native submission has an uncertain response. I preserved its submission and unit handles and stopped before any replacement call. The original submission projection and correlated tasks must be reconciled before any new submission.

Use:

> The weekly hygiene pass found three repeated-title groups. These are review candidates, not confirmed duplicates.

Do not use:

- “monitoring continuously” for one-pass checks;
- “approved” for cached validation or resident state;
- “fixed” for an attention proposal;
- “completed” for a terminal run whose output was not verified;
- “scheduled” when no external schedule was configured;
- “safe to retry” when remote effect is unknown.
