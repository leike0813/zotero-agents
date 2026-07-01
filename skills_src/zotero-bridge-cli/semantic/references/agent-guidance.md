# Agent Guidance

This reference explains how to choose Host Bridge CLI commands during agent work. Use it with the generated command reference in `host-bridge-cli.md`.

## Command Selection

- Use `bridge` to check Host Bridge availability and inspect the manifest.
- Use `library` for direct Zotero object reads: items, notes, attachments, and snapshots.
- Use `synthesis` for research context: topics, concept queries, graph slices, indexes, resolvers, artifacts, insights, and schemas.
- Use `workflow` to inspect workflow definitions, submit Host-owned workflows, create agent-owned handoffs, and apply completed agent-owned results.
- Use `run` to inspect, cancel, reply to, or reconnect Host-owned workflow and skill runs.
- Use `mutation` for previewable and approvable writes.
- Use `file` to download Host Bridge file handles.
- Use `debug` and `call` only when the task is diagnostic or the needed capability has no semantic command.

## Workflow Execution Choices

Choose `workflow submit` when Host Bridge should run the workflow. The result is a `workflowRunId`; monitor it with `run get` or `run active`, and use `run skill ...` for explicit skill-run interaction.

Choose `workflow agent-run` when the workflow delegates work to the agent. The result is an `agentRunId` plus one or more prepared requests. Each request has an `agentRequestId`, input contract, output contract, and result-bundle rule.

Apply agent-owned results only after the requested artifact is complete and valid for the request contract:

```powershell
zotero-bridge workflow agent-apply <agentRunId> --result <agentRequestId>=<bundlePath>
```

Do not use `run get`, `run active`, `run-register`, or `run-watch` for `agentRunId`. Those controls apply to Host-owned workflow runs.

## Interactive Runs

The workflow run status exposes workflow-level state and known `skillRuns`. Use `currentSkillRunId` only for display and decision support. Interaction commands require an explicit `skillRunId`.

When a skill run is waiting for user input:

```powershell
zotero-bridge run skill reply <skillRunId> --message "..."
```

When a skill run is failed and recoverable:

```powershell
zotero-bridge run skill connect <skillRunId>
```

If the action flags do not allow the operation, stop and report the structured error rather than guessing another handle.

## Evidence and Artifacts

For literature and synthesis tasks, keep Zotero item keys, topic IDs, digest IDs, exported artifact handles, and local artifact paths in the final work product. Prefer cited command outputs over memory when explaining how a result was derived.
