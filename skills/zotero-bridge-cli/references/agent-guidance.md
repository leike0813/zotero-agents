# Agent Guidance

Use this reference when choosing Host Bridge CLI commands, planning a bounded sequence, or recovering from a structured failure. Pair it with one generated command manual under `commands/`; use `host-bridge-cli.md` only for exhaustive target inspection.

Read `terminology.md` first when the task uses shorthand, artifact names, graph terms, run handles, or writeback terms that may be ambiguous.

## CLI Release Check

Use the run-local shim first when it exists. Run `<zotero-bridge> --version` when the loaded skill path is uncertain, command help does not match this reference, or a CLI error suggests that the command shape differs.

Version mismatch alone is not a blocker. When versions differ, inspect `<zotero-bridge> <command> --help` before executing that command. Use offline `surface search --intent <intent> --json` or `surface describe <command> --json` when command availability, argv, approval, handles, effects, or recovery remain uncertain. Run `surface identity --json` to compare the complete CLI schema, build fingerprint, and command catalog checksum with the current release envelope.

Stop only when the required command is absent, the accepted argv cannot be confirmed, or the observed approval, handle, state-change, or recovery contract is incompatible with the requested operation.

## Command Selection

- Use `surface` for offline identity and command-contract discovery.
- Use `bridge` to check Host Bridge availability, inspect the manifest and active connection profile, and diagnose backend readiness.
- Use `context` to inspect the active Zotero view or selection and navigate to known Zotero objects.
- Use `library` for current Zotero object reads: items, notes, annotations, attachments, readiness, and bounded snapshots.
- Use `synthesis` for derived research context: topics, concepts, graphs, indexes, resolvers, artifacts, insights, and schemas.
- Use `product` for completed Dashboard workflow outputs. Products are not Synthesis paper artifacts, file handles, or run handles.
- Use `workflow` to inspect workflow definitions, validate inputs, submit Host-owned workflows, prepare agent-owned handoffs, and apply completed handoff results.
- Use `run` to inspect or cancel Host-owned workflows, follow notifications, inspect permission waits, and interact with explicit skill runs.
- Use `mutation` for previewable, approval-aware writes to tags, collections, item fields, notes, and attachments.
- Use `file` to download Host Bridge file handles or upload local artifacts into short-lived Host Bridge handles.
- Use `debug` and raw `call` only when the task is diagnostic or the required capability has no semantic command.

## JSON Argument Intent

Use inline JSON by default. Semantic reads use `--query`; workflow submission, mutations, and other request payloads use `--input`. Use stdin, `@file`, or a bare JSON file path only when that source is intentional.

Use `library item search --query '{"text":"...","limit":10}'` for finite candidate discovery. Use `library items list --query '{"query":"...","limit":50,"collectionKey":"..."}'` for paged inventory reads. Do not substitute one command for the other.

Do not bypass a semantic command's argument validation with `call`. Raw `call` is limited to a raw-only capability or a bounded diagnostic investigation.

## Diagnostics and Readiness

Use diagnostics before submitting work when the failure may be caused by the environment, connection profile, backend, or workflow contract:

```text
zotero-bridge bridge profile inspect
zotero-bridge bridge profile diagnose
zotero-bridge bridge backend list
zotero-bridge bridge backend status <backendId>
zotero-bridge workflow requirements --workflow <workflowId>
zotero-bridge workflow validate --workflow <workflowId> --selection <JSON_OR_FILE>
```

Diagnostics are lightweight projections for agent decisions. They must not be treated as sources for tokens, private backend payloads, complete local paths, transcripts, or unrestricted backend error text.

If diagnostics point to a permission wait, inspect it without attempting to decide it from the CLI:

```text
zotero-bridge run permission pending
zotero-bridge run permission get <permissionRequestId>
```

The permission commands are read-only. They explain what is waiting and which workflow or skill run owns it; they do not approve or reject the request.

## Library Readiness

Use readiness commands before planning remediation batches for missing source files or generated literature artifacts:

```text
zotero-bridge library readiness missing-pdf --query '{"limit":100}'
zotero-bridge library readiness missing-markdown --query '{"collectionKey":"COLL","limit":100}'
zotero-bridge library readiness missing-analysis --query '{"tag":"to-review","limit":100}'
```

Readiness is read-only. It does not retrieve PDFs, convert Markdown, run literature analysis, or write notes. `missing-markdown` follows the Zotero Artifacts source-Markdown rule: a `.md` or `.markdown` attachment shares the selected PDF's filename stem. `missing-analysis` requires the digest, references, and citation-analysis artifact markers used by the same column.

## Large Response Pagination

Treat library, topic, index, ranking, and graph collection results as pages. Pass an explicit `limit` whenever result size can grow with the library. Omit a cursor on the first page, then pass the exact returned opaque `nextCursor` while `hasMore` is true; never construct or increment a cursor.

`synthesis graph overview` returns summary counts plus separately paged `nodes`, `edges`, `hover_only_nodes`, and `hover_only_edges`. Use section cursors when advancing them independently. Prefer `synthesis graph get-slice`, `get-layout`, or `get-metrics` when the task needs a coherent bounded neighborhood, layout, or ranked metric page.

## Zotero UI Context

Use context reads when the task is anchored in what the user is viewing or selecting:

```text
zotero-bridge context current
zotero-bridge context selection get
```

Use navigation only with Zotero object handles returned by Zotero or Host Bridge:

```text
zotero-bridge context item open <itemRef>
zotero-bridge context note open <noteRef>
zotero-bridge context collection open <collectionKey> --library-id <libraryId>
zotero-bridge context selection open <itemRef...>
```

Navigation changes the visible Zotero target or selection. It is not a library mutation, does not authorize writes, and must not receive file paths, web URLs, arbitrary JavaScript, or inferred object identifiers.

## Safe Writeback

Read the target object before writing. Preview open-ended edits before applying them:

```text
zotero-bridge mutation preview --input <JSON_OR_FILE>
zotero-bridge mutation apply --input <JSON_OR_FILE>
```

Use the corresponding semantic mutation when the write is already concrete:

```text
zotero-bridge mutation tag add --items <itemRef> --tags <tag>
zotero-bridge mutation item update --item <itemRef> --patch <JSON_OR_FILE>
zotero-bridge mutation note create --item <itemRef> --input <JSON_OR_FILE>
zotero-bridge mutation note update --note <noteRef> --input <JSON_OR_FILE>
zotero-bridge mutation collection add-items --collection <collectionRef> --items <itemRef...>
```

All mutation-backed writes use Host Bridge approval and stable Zotero object refs. Do not use raw `call` for a write that has a semantic mutation command, and do not pass local paths, URLs, JavaScript, or inferred identifiers as mutation targets.

## Annotation Reads

Annotations are read-only in the CLI surface:

```text
zotero-bridge library annotation list --item <itemRef>
zotero-bridge library annotation export --item <itemRef> --format markdown
```

Use annotation export when a downstream task needs quoted highlights or comments. It does not create or modify annotations.

## File Writeback

Use Host Bridge file handles for artifacts moving between the agent filesystem and Zotero. Download outbound handles with `file download`. Upload local artifacts before attachment:

```text
zotero-bridge file upload <path> --display-name digest.md --content-type text/markdown
zotero-bridge mutation item attach-file --item <itemRef> --file <fileId>
```

The returned `fileId` is opaque, short-lived, and may be consumed by attachment. Preserve the checksum and byte count when exact artifact identity matters. A local path, registered `fileId`, Product asset, and Zotero attachment record are different objects.

## Dashboard Products

Use `product list --limit <n>` and returned cursor metadata for bounded Product inventory reads. Filter by workflow, backend, or request id when the originating run is known. `product download <productId> --output-dir <dir>` downloads every asset; add `--asset <assetId>` for one asset and `--force` only when replacement is intentional. Follow the returned remote-delivery envelope rather than assuming a Host-local path is readable.

`product remove <productId>` removes the Dashboard Product record through Zotero approval. It does not imply immediate deletion of managed asset bytes. Do not retry an approval denial with raw `call`.

## Request-Level Provider Profiles

Use `--provider-profile` only for a request-level provider preset supplied by the calling agent or workflow. It selects a configured backend and non-sensitive provider options; it does not select or modify the Host Bridge connection profile.

For an ACP workflow whose contract allows it, `{"providerOptions":{"autoApproveAcpPermissions":true}}` automates ACP backend tool-permission requests for that submitted run. It does not approve Zotero writes and does not decide pending requests exposed by `run permission`.

## Workflow Execution Choices

Choose `workflow submit` when Host Bridge should run the workflow. The result is a `workflowRunId`; monitor it with `run get`, `run active`, history, notifications, or skill-run events.

Choose `workflow agent-run` when the workflow delegates execution to the calling agent. The result is an `agentRunId` and one or more prepared requests, each with an `agentRequestId`, input contract, output contract, and result-bundle rule.

Apply a completed agent-owned result only after it satisfies the request contract:

```text
zotero-bridge workflow agent-apply <agentRunId> --result <agentRequestId>=<bundlePath>
```

Do not use run control-plane commands for `agentRunId`; those commands apply to Host-owned workflow and skill runs. If apply-back status is uncertain, query `workflow agent-apply-status <agentRunId>` before deciding whether another action is safe.

## Notification Inbox

Use the notification inbox for callback-style progress without a long-running watch stream:

```text
zotero-bridge run notification list --client-id <agentId> --workflow-run-id <workflowRunId>
zotero-bridge run notification wait --client-id <agentId> --workflow-run-id <workflowRunId> --since-event-id <eventId>
zotero-bridge run notification ack --client-id <agentId> --event <eventId>
```

Notifications are lightweight lifecycle facts. They may report started, waiting, completed, canceled, failed, and recoverable-failed states, but they are not transcripts and do not expose workspace paths or provider-private payloads. Use a stable client id per agent or service. Acknowledge handled events so later checks can focus on new work.

## Run History and Events

Use bounded history and events when you need to determine whether a task is active, completed, or failed without reading transcripts:

```text
zotero-bridge run recent --limit 10
zotero-bridge run workflow recent --workflow <workflowId> --limit 10
zotero-bridge run skill recent --state waiting_user --limit 10
zotero-bridge run skill events <skillRunId> --limit 20
```

Skill-run events are lifecycle and progress facts, not a watch stream, cursor transcript, or hidden continuation channel.

## Interactive Runs

Workflow status may expose `currentSkillRunId` for display and decision support. Interaction commands still require an explicit `skillRunId` returned for the current task.

```text
zotero-bridge run skill reply <skillRunId> --message "..."
zotero-bridge run skill connect <skillRunId>
```

Use reply only while the skill run is waiting for user input. Use connect only when a failed run is recoverable and the returned actions permit it. Otherwise report the structured error rather than guessing another handle.

## Synthesis Maintenance

Use maintenance commands only for explicit diagnosis or repair:

```text
zotero-bridge synthesis cache status
zotero-bridge synthesis index status
zotero-bridge synthesis cache invalidate --scope <topic|graph|index> --id <optional-id>
```

Cache and index status are read-only. Cache invalidation is approval-gated and accepts only supported scopes; it is not a database, filesystem, JavaScript, or table-reset channel. Use `synthesis graph refresh-metrics` only for citation-graph metric repair.

## Structured Failure Recovery

Treat the JSON error envelope as authoritative:

- Retry only when `retryable` is true.
- If `stateChanged` is true, inspect current state before issuing another write.
- If `handleConsumed` is true, do not reuse the handle.
- Choose a suitable `safeNextActions` entry and prefer `nextCommand` when supplied.
- Preserve the original handle and receipt while resolving partial apply-back, paging interruption, file verification, or uncertain mutation state.
- If the safe action requires user approval, missing authority, or a new input choice, stop and report that boundary.

## Evidence and Artifacts

For library and synthesis tasks, keep the Zotero item keys, topic ids, workflow and skill-run handles, Product or artifact ids, exported file handles, verified local paths, checksums, and relevant receipts in the task result. Prefer current structured command output over memory when explaining how a result was derived.
