# Operating Principles

## Inspect Before Acting

Start with the narrowest command that can answer the user's question. Use `context` when the question depends on the active Zotero pane, selected items, current note, or active collection. Use `library` for Zotero objects and `synthesis` for derived research context. Use `bridge profile inspect`, `bridge profile diagnose`, and `bridge backend ...` when readiness or backend compatibility is uncertain. Use `workflow describe`, `workflow requirements`, or `workflow validate` when the task may be better served by a declared workflow or draft run.

When a request uses shorthand such as 图谱, 三件套, digest, references, citation analysis, notification inbox, writeback, or run handles, read `terminology.md` before mapping the request to commands.

Use `library readiness` for missing PDF, source Markdown, and literature-analysis artifact discovery. Treat those results as read-only findings for planning follow-up work; do not infer readiness by manually combining raw attachment and note queries.

Use `common-tasks.md` when the request matches common library management work such as missing PDF, missing Markdown, missing literature-analysis artifacts, tag regulation, annotation export, synthesis graph, topic synthesis, or writeback.

For broad library, topic, index, or graph reads, use paged commands with explicit limits and follow returned cursor metadata. Do not assume `synthesis graph overview`, `synthesis topic list`, `synthesis index library get`, graph metrics, or graph ranking commands return complete collections in one call.

## Navigate Deliberately

Use `context current` and `context selection get` to ground deictic requests such as "this paper" or "the selected items". Use `context ... open` only to bring Zotero to a known item, note, collection, or selected item set. Navigation is not a write path and must target Zotero object handles, not local paths, URLs, scripts, or guessed identifiers.

## Preserve Evidence

Keep item keys, topic IDs, workflow IDs, run handles, file paths, checksums, and exported artifact names in the working notes for the task. The final answer should make it clear which Zotero or Host Bridge artifacts support the result.

Use `library annotation list` or `library annotation export` when the user asks about highlights, notes attached to annotations, or evidence inside a PDF. Annotation commands are read-only and should be preferred over guessing from item metadata.

## Choose the Right Workflow Mode

Use `workflow submit` when Host Bridge should execute the workflow. The returned `workflowRunId` is monitored through `run get`, `run active`, `run notification ...`, and related run commands.

Before submitting any workflow, normalize selected notes, attachments, or child items to top-level parent item refs. Use `workflow-execution-policy.md` for selection, mode, and concurrency rules.

Use `$zotero-workflow-agent-runner` when the workflow asks the agent to perform local work. The returned `agentRunId` is an apply-back session handle. Complete each request according to its contract, then run:

```powershell
zotero-bridge workflow agent-apply <agentRunId> --result <agentRequestId>=<bundlePath>
```

Do not treat `agentRunId` as a `workflowRunId`.

For ACP and SkillRunner workflows, launch one submission by default. Ask the user before launching more than one workflow for the same backend or provider group. If the concurrency answer is unclear, stay serial.

## Interact Explicitly

Workflow status may expose `currentSkillRunId`, but interaction commands require an explicit `skillRunId`. Reply only when the action flags allow reply. Connect only when the action flags show a recoverable failed run.

Use notification events for progress awareness and callback-style handoff. Acknowledge handled events with `run notification ack --event <eventId>`. Do not treat notification text as a transcript or as authorization to guess an interactive target.

Use profile notification sync scripts for scheduled monitoring. Do not use long-polling notification waits in the agent loop or cron jobs.

Use `run recent`, `run workflow recent`, `run skill recent`, and `run skill events` for lightweight history and lifecycle/progress facts. These commands are useful for deciding whether work is still moving, waiting, recently failed, or recoverable, but they do not expose transcripts or authorize reply/connect.

Use `run permission pending` and `run permission get` to inspect approval waits. Permission commands are read-only; approval or denial happens in Zotero or the scoped run UI.

## Mutate Through Reviewed Paths

For library changes, prefer `mutation preview` before `mutation apply`. For workflow-produced changes, use the workflow output contract and apply-back endpoint. Avoid direct raw calls for writes unless the capability is explicitly raw-only and the user has accepted the risk.

Use semantic mutation commands for clear Zotero writes after inspecting the target object: tags, collection membership, item field patches, note creation, note updates, and note payload upserts. Navigation commands do not write library data.

When attaching an agent-produced artifact, upload it first with `file upload`, then attach the returned `fileId` with `mutation item attach-file`. Treat `fileId` as an opaque, short-lived Host Bridge handle; do not pass local paths to Zotero as write targets.

## Scheduled Work

Recurring maintenance should stay small and observable. Read the attention queue with `synthesis insight attention-queue`, refresh only the needed local state, and leave broad changes to reviewed workflows.

Use `synthesis cache status` and `synthesis index status` for read-only maintenance diagnostics. Use `synthesis cache invalidate` only for supported scopes and only as an approval-gated operation. Keep citation graph metric repair on `synthesis graph refresh-metrics`.
