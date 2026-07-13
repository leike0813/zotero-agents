# Agent Guidance

This reference explains how to choose Host Bridge CLI commands during agent work. Use it with the generated command reference in `host-bridge-cli.md`.

Read `terminology.md` first when the task uses Chinese shorthand, artifact names, graph terms, run handles, or writeback terms that may be ambiguous.

## CLI Release Check

Use the run-local shim first when it exists. Confirm the active command with `<zotero-bridge> --version` when the loaded skill path is uncertain, command help does not match this reference, or a CLI error points to command shape mismatch.

Compare the observed version with the expected version in `SKILL.md` or `host-bridge-cli.md`. If they differ, stop using this loaded skill copy for command syntax. Prefer the workspace-injected skill and shim, then inspect `<zotero-bridge> --help` or the generated reference beside that workspace copy.

## Command Selection

- Use `bridge` to check Host Bridge availability, inspect the manifest, inspect the active profile, and diagnose backend readiness.
- Use `context` to read the active Zotero view, inspect the current selection, or navigate Zotero to known items, notes, collections, or selected item sets.
- Use `library` for direct Zotero object reads: items, notes, annotations, attachments, and snapshots.
- Use `synthesis` for research context: topics, concept queries, graph slices, indexes, resolvers, artifacts, insights, and schemas.
- Use `product` for normal Dashboard workflow outputs. Start with `product list` or `product get`; use `product download` for their assets. These Products are not Synthesis `paper_artifacts` and exclude Skill Run Feedback.
- Use `workflow` to inspect workflow definitions, submit Host-owned workflows, create agent-owned handoffs, and apply completed agent-owned results.
- Use `run` to inspect, cancel, follow notifications for, reply to, or reconnect Host-owned workflow and skill runs.
- Use `mutation` for previewable and approvable writes, including tags, collection membership, item fields, notes, and file attachment writeback.
- Use `file` to download Host Bridge file handles or upload local artifacts into short-lived Host Bridge handles.
- Use `debug` and `call` only when the task is diagnostic or the needed capability has no semantic command.

## JSON Argument Intent

Use inline JSON by default. Semantic reads use `--query`; workflow submission, mutations, and other request payloads use `--input`. Use stdin, `@file`, or a bare JSON file path only when that input source is intentional.

Use `library item search --query '{"text":"...","limit":10}'` for finite candidate discovery. Use `library items list --query '{"query":"...","cursor":0,"collectionKey":"..."}'` for paged inventory reads; do not substitute one command for the other.

Do not bypass a semantic command's argument validation with `call`. Raw `call` is limited to a raw-only capability or a diagnostic investigation.

## Diagnostics and Readiness

Use diagnostics before submitting work when the failure mode might be environment, backend, profile, or workflow compatibility:

```powershell
zotero-bridge bridge profile inspect
zotero-bridge bridge profile diagnose
zotero-bridge bridge backend list
zotero-bridge bridge backend status <backendId>
zotero-bridge workflow requirements --workflow <workflowId>
zotero-bridge workflow validate --workflow <workflowId> --selection .\items.json
```

Diagnostics are lightweight projections for agent decision-making. They should not contain tokens, private backend payloads, full local paths, transcripts, or complete backend error text. If diagnostics point to a permission wait, use the read-only permission commands to inspect state:

```powershell
zotero-bridge run permission pending
zotero-bridge run permission get <permissionRequestId>
```

The permission commands do not approve or reject requests. They only explain what is waiting and which workflow or skill run it belongs to.

## Library Readiness

Use readiness commands before planning remediation batches for missing source files or generated literature artifacts:

```powershell
zotero-bridge library readiness missing-pdf --query '{"limit":100}'
zotero-bridge library readiness missing-markdown --query '{"collectionKey":"COLL","limit":100}'
zotero-bridge library readiness missing-analysis --query '{"tag":"to-review","limit":100}'
```

Readiness commands are read-only. They do not fetch PDFs, convert Markdown, run `literature-analysis`, or write notes. `missing-markdown` follows the Zotero Artifacts column source Markdown rule: a `.md` or `.markdown` attachment must share the best PDF's filename stem. `missing-analysis` follows the same column's generated artifact rule: `digest`, `references`, and `citation-analysis` markers must all be present.

## Large Response Pagination

Treat library, topic, index, and graph collection reads as page reads. Always pass an explicit `limit` when the result can grow with the Zotero library, and continue only through returned cursor metadata.

`synthesis graph overview` returns summary counts plus paged `nodes`, `edges`, `hover_only_nodes`, and `hover_only_edges`. It is not a full-graph dump. Use `nodeCursor`, `edgeCursor`, `hoverNodeCursor`, and `hoverEdgeCursor` when advancing sections independently.

Use `synthesis graph get-slice`, `synthesis graph get-layout`, or `synthesis graph get-metrics` when the task needs a coherent bounded graph neighborhood, layout, or ranked metric page.

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

## Dashboard Products

Use `product list --limit <n>` and returned cursor metadata for bounded product inventory reads. Filter by workflow, backend, or request id when the originating run is known. `product download <productId> --output-dir <dir>` downloads every asset; add `--asset <assetId>` for one asset and `--force` only when replacing an existing output is intended. Remote profiles receive a broker ZIP delivery rather than a host filesystem path.

`product remove <productId>` removes the Dashboard Product record through Zotero approval. It does not delete managed asset files immediately; do not retry an approval denial with a raw call.

## Request-Level Provider Profiles

Use `--provider-profile` only for a request-level provider profile supplied by the calling agent or workflow. It selects a concrete backend for a provider and the options for that backend; it does not select or modify the Host Bridge profile. For an ACP workflow that permits it, include `{"providerOptions":{"autoApproveAcpPermissions":true}}` to approve ACP backend tool permission requests for that submitted run; this neither approves Zotero writes nor approves or rejects pending requests exposed by `run permission`.

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
zotero-bridge run notification list --client-id <agentId> --workflow-run-id <workflowRunId>
zotero-bridge run notification wait --client-id <agentId> --workflow-run-id <workflowRunId> --since-event-id <eventId>
zotero-bridge run notification ack --client-id <agentId> --event <eventId>
```

Notifications are lightweight lifecycle facts. They can show started, waiting, completed, canceled, failed, and recoverable failed states, but they do not contain transcripts, workspace paths, or provider private payloads. Use a stable `--client-id` per agent or service so repeated lists advance that client's best-effort cursor without hiding retained events from other clients. Use `workflowRunId` only for workflow-level status and cancellation. Use `skillRunId` from `run get`, `run active`, or a notification before replying or reconnecting.

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
