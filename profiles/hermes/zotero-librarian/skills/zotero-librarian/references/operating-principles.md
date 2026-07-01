# Operating Principles

## Inspect Before Acting

Start with the narrowest command that can answer the user's question. Use `library` for Zotero objects and `synthesis` for derived research context. Use `workflow describe` when the task may be better served by a declared workflow.

## Preserve Evidence

Keep item keys, topic IDs, workflow IDs, run handles, file paths, checksums, and exported artifact names in the working notes for the task. The final answer should make it clear which Zotero or Host Bridge artifacts support the result.

## Choose the Right Workflow Mode

Use `workflow submit` when Host Bridge should execute the workflow. The returned `workflowRunId` is monitored through `run get`, `run active`, and related run commands.

Use `workflow agent-run` when the workflow asks the agent to perform local work. The returned `agentRunId` is an apply-back session handle. Complete each request according to its contract, then run:

```powershell
zotero-bridge workflow agent-apply <agentRunId> --result <agentRequestId>=<bundlePath>
```

Do not treat `agentRunId` as a `workflowRunId`.

## Interact Explicitly

Workflow status may expose `currentSkillRunId`, but interaction commands require an explicit `skillRunId`. Reply only when the action flags allow reply. Connect only when the action flags show a recoverable failed run.

## Mutate Through Reviewed Paths

For library changes, prefer `mutation preview` before `mutation apply`. For workflow-produced changes, use the workflow output contract and apply-back endpoint. Avoid direct raw calls for writes unless the capability is explicitly raw-only and the user has accepted the risk.

## Scheduled Work

Recurring maintenance should stay small and observable. Read the attention queue with `synthesis insight attention-queue`, refresh only the needed local state, and leave broad changes to reviewed workflows.
