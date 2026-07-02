# Agent Guidance

This reference explains how to choose Host Bridge CLI commands during agent work. Use it with the generated command reference in `host-bridge-cli.md`.

## Command Selection

- Use `bridge` to check Host Bridge availability, inspect the manifest, inspect the active profile, and diagnose backend readiness.
- Use `context` to read the active Zotero view, inspect the current selection, or navigate Zotero to known items, notes, collections, or selected item sets.
- Use `library` for direct Zotero object reads: items, notes, annotations, attachments, and snapshots.
- Use `synthesis` for research context: topics, concept queries, graph slices, indexes, resolvers, artifacts, insights, and schemas.
- Use `workflow` to inspect workflow definitions, submit Host-owned workflows, create agent-owned handoffs, and apply completed agent-owned results.
- Use `run` to inspect, cancel, follow notifications for, reply to, or reconnect Host-owned workflow and skill runs.
- Use `mutation` for previewable and approvable writes, including tags, collection membership, item fields, notes, and file attachment writeback.
- Use `file` to download Host Bridge file handles or upload local artifacts into short-lived Host Bridge handles.
- Use `debug` and `call` only when the task is diagnostic or the needed capability has no semantic command.

## Diagnostics and Readiness

Use diagnostics before submitting work when the failure mode might be environment, backend, profile, or workflow compatibility:

```powershell
zotero-bridge bridge profile inspect
zotero-bridge bridge profile diagnose
zotero-bridge bridge backend list
zotero-bridge bridge backend status <backendId>
zotero-bridge workflow requirements <workflowId>
zotero-bridge workflow validate --workflow <workflowId> --items .\items.json
```

Diagnostics are lightweight projections for agent decision-making. They should not contain tokens, private backend payloads, full local paths, transcripts, or complete backend error text. If diagnostics point to a permission wait, use the read-only permission commands to inspect state:

```powershell
zotero-bridge run permission pending
zotero-bridge run permission get <permissionRequestId>
```

The permission commands do not approve or reject requests. They only explain what is waiting and which workflow or skill run it belongs to.

## Zotero UI Context

Use Zotero context commands when the task is anchored in what the user is currently viewing or selecting:

```powershell
zotero-bridge context current
zotero-bridge context selection get
```

Use navigation commands only with Zotero object handles returned by Zotero or Host Bridge:

```powershell
zotero-bridge context item open <itemRef>
zotero-bridge context note open <noteRef>
zotero-bridge context collection open <collectionKey> --library-id <libraryId>
zotero-bridge context selection open <itemRef...>
```

Navigation changes the visible Zotero target or selection. It is not a library mutation, does not approve writes, and must not be used with file paths, web URLs, arbitrary JavaScript, or inferred object identifiers.

## Safe Writeback

Read the target object before writing. For open-ended edits, preview the operation first:

```powershell
zotero-bridge mutation preview --input .\mutation.json
zotero-bridge mutation apply --input .\mutation.json
```

Use semantic mutation commands when the requested write is already clear:

```powershell
zotero-bridge mutation tag add --items <itemRef> --tags <tag>
zotero-bridge mutation item update --item <itemRef> --patch .\patch.json
zotero-bridge mutation note create --item <itemRef> --input .\note.json
zotero-bridge mutation note update --note <noteRef> --input .\note.json
zotero-bridge mutation collection add-items --collection <collectionRef> --items <itemRef...>
```

All mutation-backed writes use Host Bridge approval and stable Zotero object refs. Do not use `call` for writes that have a semantic mutation command, and do not pass arbitrary local paths, URLs, JavaScript, or inferred object identifiers as mutation targets.

## Annotation Reads

Annotations are read-only in the CLI surface:

```powershell
zotero-bridge library annotation list --item <itemRef>
zotero-bridge library annotation export --item <itemRef> --format markdown
```

Use annotation export when a downstream task needs quoted highlights or comments from an item. Annotation export does not create or modify annotations.

## File Writeback

Use Host Bridge file handles for artifacts that need to move between the agent filesystem and Zotero. Download outbound handles with `file download`. Upload local artifacts before attaching them to an item:

```powershell
zotero-bridge file upload .\digest.md --display-name digest.md --content-type text/markdown
zotero-bridge mutation item attach-file --item <itemRef> --file <fileId>
```

The returned `fileId` is opaque, short-lived, and may be consumed by attachment. Keep the uploaded file's checksum in task notes when the exact artifact matters.

## Workflow Execution Choices

Choose `workflow submit` when Host Bridge should run the workflow. The result is a `workflowRunId`; monitor it with `run get`, `run active`, or `run notification ...`, and use `run skill ...` for explicit skill-run interaction.

Choose `workflow agent-run` when the workflow delegates work to the agent. The result is an `agentRunId` plus one or more prepared requests. Each request has an `agentRequestId`, input contract, output contract, and result-bundle rule.

Apply agent-owned results only after the requested artifact is complete and valid for the request contract:

```powershell
zotero-bridge workflow agent-apply <agentRunId> --result <agentRequestId>=<bundlePath>
```

Do not use run control-plane commands for `agentRunId`. Those controls apply to Host-owned workflow runs.

## Notification Inbox

Use the notification inbox when you need callback-style progress without a long-running watch stream:

```powershell
zotero-bridge run notification list --workflow-run-id <workflowRunId>
zotero-bridge run notification wait --workflow-run-id <workflowRunId> --since-event-id <eventId>
zotero-bridge run notification ack --event <eventId>
```

Notifications are lightweight lifecycle facts. They can show started, waiting, completed, canceled, failed, and recoverable failed states, but they do not contain transcripts, workspace paths, or provider private payloads. Use `workflowRunId` only for workflow-level status and cancellation. Use `skillRunId` from `run get`, `run active`, or a notification before replying or reconnecting.

## Run History and Events

Use recent/history commands when you need to determine whether a task is still active, recently completed, or failed without reading transcripts:

```powershell
zotero-bridge run recent --limit 10
zotero-bridge run workflow recent --workflow <workflowId> --limit 10
zotero-bridge run skill recent --state waiting_user --limit 10
zotero-bridge run skill events <skillRunId> --limit 20
```

`run skill events` returns lifecycle and progress facts for one skill run. It is useful after reply/connect or when a long-running run needs a lightweight progress check. It is not a watch stream, cursor transcript, or hidden continuation channel.

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

## Synthesis Maintenance

Use maintenance commands only when the task is about diagnosis or repair:

```powershell
zotero-bridge synthesis cache status
zotero-bridge synthesis index status
zotero-bridge synthesis cache invalidate --scope <topic|graph|index> --id <optional-id>
```

Cache and index status are read-only. Cache invalidation is approval-gated and only accepts supported enum scopes; it is not a raw database, filesystem, JavaScript, or table reset command. Keep `synthesis graph refresh-metrics` for citation graph metric repair.

## Evidence and Artifacts

For literature and synthesis tasks, keep Zotero item keys, topic IDs, digest IDs, exported artifact handles, and local artifact paths in the final work product. Prefer cited command outputs over memory when explaining how a result was derived.
