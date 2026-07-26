---
name: zotero-bridge-cli
description: Operate Zotero Bridge CLI for exact Zotero library, workflow, and Synthesis access. Use when an agent needs low-level Zotero operations, command discovery, or structured recovery.
license: AGPL-3.0-or-later
---

# Zotero Bridge CLI

## Goal

Use the installed `zotero-bridge` CLI safely and deterministically for Zotero library, workflow, file, run, and Synthesis operations. This Skill is the complete mechanism contract: it owns executable selection, connection setup, command discovery, exact invocation, effects and approval interpretation, typed handles, output evidence, and recovery. It does not choose or compose research goals.

## Inputs

- A requested CLI operation or an already selected canonical command.
- A run-local CLI shim, an installed `zotero-bridge` executable, or the bundled installer when neither is available.
- The active release envelope and connection profile, including supplied endpoint, scope, mode, and secret environment values.
- The selected canonical command's inputs, including JSON payloads, object refs, opaque handles, cursors, provider profiles, workflow options, and output destinations.

## Workflow

1. Select one executable and one connection profile using the rules below. Keep the binary, embedded contract, profile, and release envelope in one release set.
2. Run `zotero-bridge surface identity`. Compare `protocol`, `cliSchema`, `version`, `buildFingerprint`, and `commandCatalogChecksum` with the active release envelope; stop on any mismatch.
3. If the canonical operation is unknown, read the command catalog, select the closest task family, and use `surface search --intent '<operational terms>'` only to narrow the candidates. Run `surface describe '<canonical command>'` before execution and read only the generated command-surface reference that owns the command's first token.
4. Resolve live identity and readiness from the outside in: service health, authenticated manifest/profile, backend readiness when relevant, then the domain object or workflow contract.
5. Prepare only the inputs declared by the command descriptor. Keep workflow options, provider profile, selection, payload, opaque handles, and output path in their distinct bindings.
6. Inspect effects, approval timing, typed handle transitions, pagination, targets, and recovery before the call. Present any requested Zotero-side approval without treating valid input as authorization.
7. Execute one canonical command. Treat stdout as one JSON envelope and preserve its identifiers, cursors, checksums, receipts, paths, and structured error fields.
8. Complete any paging, file delivery, workflow control, or receipt check using the returned contract. Verify live Zotero state after a requested change rather than inferring success from submission or terminal execution alone.
9. Return the valid result and its evidence, or classify the failure and take only a declared safe next action.

## Executable and profile selection

Prefer a run-local shim supplied with the current workspace. Otherwise use the installed executable. Use the bundled installer only when neither exists. Never combine a binary, profile, embedded descriptor, asset, or release envelope from different release sets; a matching version string is insufficient identity evidence.

Preserve supplied `ZOTERO_BRIDGE_PROFILE`, `ZOTERO_BRIDGE_ENDPOINT`, `ZOTERO_BRIDGE_SCOPE`, and `ZOTERO_BRIDGE_CONNECTION_MODE`. Use `ZOTERO_BRIDGE_HOST_PROFILE` or `ZOTERO_BRIDGE_HOST_HOME` only when the packaged installer needs to select the Zotero-side connection profile. `ZOTERO_BRIDGE_TOKEN` is secret input: never print, persist, place in argv, or include it in evidence.

Offline `surface` commands describe the embedded contract. They do not prove that Zotero, the Zotero Bridge service, or a configured backend is reachable. For live failures, diagnose in this order:

1. `bridge status` for service health;
2. `bridge profile inspect` and `bridge profile diagnose` for redacted connection facts;
3. `bridge manifest` for the authenticated service contract;
4. `bridge backend list` or `bridge backend status` for provider readiness;
5. the selected domain read, workflow description, run status, or durable operation receipt.

## Parameter semantics and placement

Only `--endpoint`, `--profile`, `--operation-id`, and `--schema` are global CLI options. They may appear before or after the canonical leaf command. Every other option is leaf-local and must be present in that command's `surface describe` result or generated command card before use.

Use the global options at these boundaries:

- `--endpoint` selects the Zotero Bridge service endpoint for this invocation. An explicit value overrides `ZOTERO_BRIDGE_ENDPOINT`, which overrides the selected profile endpoint. Do not guess a port when none of those sources resolves an endpoint.
- `--profile` selects the connection-profile JSON file. An explicit value or `ZOTERO_BRIDGE_PROFILE` overrides the well-known profile. Keep the connection profile separate from a workflow provider profile.
- `--operation-id` supplies the idempotency identity for one state-changing request. Use a stable value when the same uncertain operation may need durable recovery; do not treat it as a workflow, run, Product, or receipt handle. Ordinary reads do not need an agent-supplied operation id.
- `--schema` performs an offline structured-input schema lookup for one canonical leaf. Use it only when the selected command declares at least one structured JSON input. A leaf without structured input returns `command_input_schema_unavailable`; use command help or `surface describe` instead.

Every successful command and every structured failure already writes exactly one JSON envelope to stdout. Do not add `--json` to `bridge status`, workflow commands, or another ordinary leaf. `--json` is a leaf-local option accepted only by `surface identity`, `surface describe`, and `surface search`, where it is unnecessary for obtaining the JSON envelope.

`--query` and `--input` both transport JSON but express different command contracts:

- `--query` is the canonical binding for a read-only query, selector, filter, or pagination object. When the descriptor marks it optional, omission means `{}`. Some query parsers accept `--input` as an alias, but construct and document the invocation with `--query`.
- `--input` is the canonical binding for a command-owned input payload, including raw capability calls and many mutation, maintenance, or debug operations. The name alone does not prove that an operation changes state; effects and approval still come from the descriptor.

For either binding, use inline JSON for a short reviewed value, `@file` for an intentional JSON file, or `-` for stdin. A bare existing path is also read as a JSON file, so prefer `@file` when file interpretation matters. Do not move a payload from `--query` to `--input`, or the reverse, merely because the transport syntax is the same.

There is no global result-output option. `file download --output`, `product download --output-dir` and its local alias, and `workflow agent-run --output-dir` have different destination and overwrite contracts. Use an output option only when the selected leaf descriptor declares it.

## Command discovery and invocation

Use `surface search` to discover operations, not to decide a research task. `surface describe` is authoritative for argv bindings, invocation and payload schemas, result shape, pagination, effects, approval scope, handle transitions, recovery, and targets. Use raw `call` only for an advanced diagnostic capability that has no canonical semantic command.

## Output boundary and continuation discipline

Every canonical command declares exactly one `outputBoundary.strategy` in its descriptor: `fixed`, `cursor`, `offset`, `limit`, `file`, or `raw`. Read that object before execution and treat its default, maximum, section, continuation, truncation, and file fields as part of the result contract. Do not infer boundedness from a short first response, a capability category, or an older command example.

For a `cursor` result, preserve the original canonical command and all normalized selectors and filters. Read the declared domain array, record `returned`, `total`, `limit`, `hasMore`, and `nextCursor`, and continue only by passing that opaque cursor back to the same command with the same criteria. A cursor is not an item id, timestamp, array offset, or reusable cross-command token. Never decode it to construct a new cursor, substitute a cursor from another section, or silently restart when continuation fails.

When `hasMore` is true, a missing `nextCursor` is an incomplete response and blocks completion. When `hasMore` is false, require an empty continuation and stop. Merge pages by stable domain identity, reject duplicates, and compare the final number of unique rows with the available `total` when that total describes the same filtered collection. For a response with several paged arrays, follow only the cursor under `pagination.<section>` that owns the array being consumed; do not advance unrelated sections implicitly.

`invalid_host_bridge_cursor` means the cursor is malformed, expired, scoped to another command, bound to different criteria, or anchored to a row that is no longer available. Preserve the structured `reason`. If the intended read is still required, intentionally restart from the first page with the original filters, rebuild the result, and report that the snapshot changed; do not append a restarted first page to rows collected under the failed cursor.

For an `offset` result, preserve the selector and request `offset=nextOffset` until `hasMore` is false. Keep chunks in offset order, require each chunk's `offset` to equal the previous `nextOffset`, and concatenate exactly once. The default text window is 8,000 characters and the maximum is 16,000 unless the descriptor declares a stricter value. An offset beyond the end is a valid empty terminal chunk, not permission to retry from zero. Completion requires the reconstructed character count to match `totalChars` when present.

For a `limit` result, use the declared default and hard maximum, inspect `truncated`, and narrow the selector when the desired evidence cannot fit. A limit-bounded result has no implicit continuation: do not invent a cursor. For `fixed`, verify that the result is a registry, singleton, aggregate, or otherwise hard-bounded contract before treating one response as complete.

For a `file` result, stdout is only the delivery control plane. Preserve the owning object or operation identity and the returned file descriptor, verify that no private filesystem path from the Zotero computer is exposed, download through `file download`, and compare byte count and SHA-256 with the descriptor. If the handle expires, reacquire it from the owning semantic command instead of retrying an arbitrary path. Do not treat a successful descriptor response as proof that the bytes were downloaded or verified.

`raw` is reserved for `call`. The target capability still owns its own paging, limit, offset, or file boundary; raw invocation never widens it and is not a bypass for a canonical semantic command. If a semantic command exists, use it so argv validation, result contracts, recovery, and generated guidance remain enforceable.

### Start from user intent

An agent often receives a request such as “show me the papers about this topic,” “download the analysis result,” or “run the deep-reading workflow” before it knows any CLI names. Do not make the user translate that request into a command.

Use this sequence:

1. Read [the command catalog](references/command-catalog.md).
2. Identify the requested Zotero object, task family, freshness, deliverable, and state-change boundary.
3. Select the smallest candidate command or ordered command sequence from the catalog.
4. Use `surface search` only when multiple candidates still match.
5. Use `surface describe` to obtain the exact live contract.
6. Read the one detailed reference that owns the command root.
7. Construct and execute the invocation only after inputs, effects, approval, handles, completion evidence, and recovery are known.

The catalog is intentionally compact. It owns discovery by user intent, while the command references own executable detail. Do not construct argv from the catalog table or copy a command merely because its summary shares a keyword with the user's request.

### Translate common request shapes

- “This paper,” “these items,” and “the current collection” first require `context` commands to resolve the live selection.
- “What is in my library?” and “do I have papers about X?” require `library` reads and a complete bounded paging decision.
- “Change these tags” or “put this in a collection” requires a live identity read, a reviewed mutation, current authority, and post-write verification.
- “Get the generated report” may require a Product or workflow artifact read followed by file delivery; it is not automatically an attachment read.
- “Run workflow X” requires workflow discovery, description, selection validation, provider-profile validation when declared, and submission.
- “How is the workflow going?” begins from the typed handle returned by submission. For direct admission, retain the returned `workflowRunId` and use `run`, not workflow discovery. For host-queue admission, retain `submissionId`, inspect `workflow submission get`, and use `workflow queue list` or `workflow queue cancel` only for queue-level observation or pending cancellation; do not invent a `workflowRunId` before an admitted task exposes one.
- “Refresh the synthesis graph” requires diagnosis of the exact derived model and maintenance scope before any write.
- “Why is the bridge failing?” begins with semantic health and profile diagnostics; raw `call` is the last resort.

When a request spans families, preserve the boundary between each result and the next input. A context read does not authorize a mutation, workflow validation does not authorize submission, run termination does not prove Product delivery, and a maintenance receipt does not prove an unrelated model is current.

### Confirm the selected command

Before execution, answer all of these questions from the live descriptor and detailed reference:

- What canonical command will run?
- Which values are positionals, flags, inline JSON, stdin, or files?
- What object or typed handle identity is required?
- Is the operation read-only, navigational, mutating, maintenance, or diagnostic?
- Where can approval occur, and what exact scope does it cover?
- Does the result page, issue another handle, or require a later receipt?
- What live evidence proves the requested outcome?
- If the call is interrupted, what state or handle must be inspected before retry?

If any answer is absent, do not guess. Continue discovery, resolve live identity, or return the missing input or authority as the current blocker.

Choose an input channel only when the descriptor permits it:

- use direct flags and positionals for short scalar values and typed refs;
- use inline JSON only for short, reviewed payloads;
- use a documented path, `@file`, or `-` for stdin for larger payloads;
- keep workflow selection, workflow options, and provider profile as separate values;
- use absolute output paths when a command or profile helper requires them.

Do not reinterpret a CLI option from a similarly named command. The generated command-surface references expose all bindings, but the active binary's `surface describe` result wins when the loaded artifact and executable differ.

## Identity, paging, and freshness

A title, citation string, cached index row, generated report, or search candidate is not a Zotero object identity. Resolve current context for deictic requests, keep returned library IDs and item keys, normalize child notes or attachments to their top-level parent only when the next contract requires parent items, and fetch the selected object before reporting detailed state or writing.

For cursor or offset pagination, preserve accepted pages and the last returned cursor or offset. Continue until the response reports completion or the bounded request is satisfied. After interruption, resume from the last accepted position and never merge an already accepted page twice. An empty first page or truncated search is not proof of absence.

Local indexes, snapshots, workflow catalogs, notifications, and generated Synthesis artifacts have explicit freshness limits. Re-read the live object, selection, permission, run, Product, operation, or workflow description whenever the requested conclusion or write depends on current state.

## Effects, approval, and handles

The command card distinguishes read, navigation, write, maintenance, and debug operations. Navigation may change visible Zotero UI state without modifying bibliographic data. Ephemeral output or workflow control is not automatically a library mutation. Maintenance and debug repair require their own diagnosed scope and must not be used as shortcuts around a failed semantic command.

Zotero-managed writes and apply-back remain subject to the declared Zotero-side approval path. Permission reads are observational and cannot approve or reject a request. A prior approval, valid preview, local validation, notification, cached proposal, or terminal run never authorizes another operation.

Treat every returned identifier as an opaque typed handle. Keep Zotero refs, `submissionId`, `queueId`, `workflowRunId`, `skillRunId`, `agentRunId`, `agentRequestId`, `permissionRequestId`, `operationId`, `eventId`, `fileId`, and Product identifiers in their declared command families. Never synthesize, recast, or exchange them. A `submissionId` identifies one immutable native-queue admission, while a `queueId` identifies one pending unit inside that submission; neither is a workflow-run identity. Do not reuse a handle after `handleConsumption` is `consumed` or `unknown` without a domain receipt that explicitly permits continuation.

## Files, Products, and artifacts

A Zotero-side path is not automatically readable by the agent. When an attachment, Product, artifact, or operation returns a `fileId` or delivery instruction, use the declared download command and verify checksum and byte count before using the bytes as evidence. Reacquire expired access from the owning object rather than guessing a storage path.

Keep these identities separate:

- a local path names agent-accessible bytes;
- `fileId` is a short-lived bridge-issued transfer handle;
- Product identity names a Dashboard record and its downloadable assets;
- a workflow artifact belongs to its workflow or item contract;
- a Zotero attachment is live library state and must be verified through an item read.

For a local file writeback, verify the artifact first, upload it, retain the returned checksum and `fileId`, perform the approved attachment mutation, and re-read the parent item's attachments. A completed workflow run does not prove that a Product or expected artifact exists; inspect and download the requested output separately.

## Workflow and run control

For Zotero-managed execution, discover the current workflow, read its description or requirements, validate selection and workflow options, validate the backend provider profile independently, then submit them through the declared join point. Read the returned `admission` branch before choosing a monitoring family. Direct admission returns a `workflowRunId`; preserve it and use run commands for status, cancellation, skill interaction, permission observation, notifications, history, and events. A direct-run cancellation request is intent until a later run read confirms terminal state.

Host-queue admission returns a `submissionId`, unit counts, and queue links instead of fabricating an already-started run. Preserve that submission handle and inspect `workflow submission get` for the immutable unit projection and current aggregate state. Use `workflow queue list` to observe active queue units, `workflow queue cancel <queueId>` only to cancel a still-pending unit, and `run list --submission <submissionId>` to discover admitted Zotero-managed tasks without confusing task lineage with queue membership. Once a unit is admitted or running, queue cancellation must fail closed; use the returned `workflowRunId` and the normal run-control plane for execution cancellation or interaction.

The native queue owns bounded admission and keeps each admitted slot occupied through terminal execution and apply-back. Queue position or aggregate submission state is not a workflow result, a Product receipt, or proof that requested Zotero changes exist. Inspect every admitted task and its expected outputs independently, preserve failed and canceled units as distinct outcomes, and do not resubmit an uncertain submission merely because no `workflowRunId` was present in the initial response.

Active submission and queue projections are process-local. If Host restart makes the original `submissionId` unavailable, use submission-filtered task discovery and live run reads to recover units that had already been admitted; do not reconstruct pending units from labels or member counts. Report unadmitted units as no longer active, preserve their original source scope outside queue internals, and require current authority before submitting a replacement bounded request.

For self-owned agent execution, confirm that the workflow supports that mode, prepare the handoff, preserve `agentRunId`, every `agentRequestId`, bundle locations, and checksums, then inspect each request contract. Validate every completed result locally before apply-back. Apply the complete request-to-result mapping through `workflow agent-apply` and use `workflow agent-apply-status` for the durable receipt. The apply response is only a bounded aggregate; page `workflow agent-apply-status` with the same `agentRunId` until every receipt result is collected, and preserve its state-change and handle-consumption evidence separately from individual result rows. Never monitor an `agentRunId` through the Zotero-managed run plane.

`workflow agent-bundle inspect` and `workflow agent-result validate` are local preflight commands. They accept a directory or ZIP without contacting the service, applying data, renewing a lease, or consuming a handle. Unsafe paths, symbolic links, duplicate entries, excessive entry counts, oversized JSON, malformed archives, and unsupported compression return structured local-input failures. Local success proves structural validity only; it does not prove semantic correctness or authorize apply-back.

Notifications are lifecycle signals, not transcripts, interaction targets, or authorization. Use `skillRunId` for reply/connect, `permissionRequestId` for permission inspection, and `eventId` for acknowledgement. Acknowledge an event only after its action has been handled.

## Synthesis operation boundaries

Treat topics, graphs, indexes, resolvers, artifacts, concepts, schemas, and attention queues as distinct derived models. A derived association is not automatically a scholarly or causal claim, and a generated artifact is not proof of a current Zotero write.

Use cache and index status reads before proposing maintenance. Reference-sidecar refresh, citation-graph update, graph-metric refresh, and cache invalidation are separate operations with separate scopes, approvals, operation IDs, and receipts. Preserve the committed basis hash where required; do not treat one operation's completion as evidence that another derived model is current.

## Hard constraints

- Use only documented canonical CLI commands and the argv confirmed by `surface describe` or the command reference. Do not guess flags or substitute raw `call` for an available semantic command.
- Never read or modify Zotero databases, storage, or application internals directly. All library writes and apply-back operations stay on the Zotero-side approval path.
- Treat every returned identifier as an opaque, typed handle. Do not exchange handle kinds, reuse a consumed or unknown handle, or send local paths where a bridge-issued handle is required.
- Keep bearer tokens and other credentials out of command arguments, JSON results, diagnostics, and task evidence.
- Treat stdout as one JSON envelope. Preserve pagination cursors, file checksums, operation receipts, and output locations exactly as returned.
- A local validation success does not authorize a later `workflow agent-apply`; Zotero-side preflight and approval remain authoritative.
- Use the CLI binary, profile, embedded contract, and release envelope from one release set. A matching version string alone is not sufficient identity evidence.
- Do not infer current Zotero state from a cached projection, workflow terminal status, notification, local artifact, or generated analysis.
- Do not retry a state-changing call until its durable state and handle consumption are known.
- Do not implement an agent-side workflow queue, plan-entry registry, reservation loop, replay loop, or background batching layer around `workflow submit`. Bounded concurrency and pending-unit ownership belong to Zotero's native workflow queue.
- Do not treat `submissionId`, `queueId`, and `workflowRunId` as interchangeable. Queue cancellation applies only to a pending `queueId`; admitted work is controlled through its real run handle.

## LLM and tool responsibilities

- The agent owns operation selection, semantic interpretation, approval-aware decisions, evidence use, and recovery choices.
- The CLI owns exact argv parsing, Zotero Bridge service requests, typed-handle transport, structured errors, and local bundle/result validation.
- The renderer owns the command-surface references and embedded Agent Surface; do not hand-assemble those artifacts or invent a handle, receipt, checksum, or result envelope.

## Completion

The Skill is complete when the requested operation has returned a valid JSON envelope, all required pages or delivered bytes have been obtained, relevant handles and receipts are preserved, and any requested state change is live-verified. It is also complete when a structured failure is classified with the next safe action and no unsafe repeat has occurred.

Match the evidence to the operation:

- for a bounded read, retain the stable object ref and the fields that answer the request;
- for a paged result, retain the completed boundary or the last accepted cursor;
- for delivered bytes, retain the checksum, byte count, and owning object;
- for a mutation, retain the approval outcome, operation receipt, and live post-read;
- for an asynchronous run, retain terminal state and separately verify the requested deliverable;
- for a host-queue submission, retain `submissionId`, each unit's `queueId` and admitted task identity when present, the aggregate terminal projection, and the independently verified result or failure for every requested unit;
- for a local validator, report only structural validity and do not imply remote authority.

## Failure handling

1. Preserve the command, sanitized inputs, structured error code, relevant handles, accepted pages, and any operation or output identifiers.
2. Read `retryable`, `stateChange`, `handleConsumption`, `safeNextActions`, and `nextCommand` from the envelope.
3. When `stateChange` is `changed` or `unknown`, read the durable operation, apply-back receipt, workflow/run state, or affected live object before another change.
4. When `handleConsumption` is `consumed` or `unknown`, do not reuse the handle unless the domain receipt declares a resumable action.
5. Retry only when `retryable` is true, current state permits it, and the retry will not duplicate an accepted page, submission, mutation, upload, or apply-back.
6. For partial apply-back, report each applied, failed, and unattempted request from the receipt; never collapse the result into success or replay the complete mapping.
7. For file or paging failure, keep verified bytes/pages and resume only through the returned cursor, file owner, or safe next command.
8. If authority, input, identity, profile readiness, or approval is missing, return the structured failure and required decision rather than bypassing the CLI or Zotero-side boundary.
9. For an uncertain host-queue submission, inspect the original `submissionId`, then correlate admitted tasks with `run list --submission`; never create a second submission until the first admission outcome is known.
10. When pending cancellation races with admission, accept the queue endpoint's conflict as evidence that ownership has crossed to the run plane, re-read the submission projection, and continue only with the exposed task or run handle.

## References

When the canonical command is unknown, first read [the command catalog](references/command-catalog.md). The catalog links exactly one generated card for every canonical leaf command. After selecting a command, load only that card; it is independently complete for inherited globals, local argv, structured inputs, schemas, examples, effects, approval, handles, targets, and recovery. The active executable's `surface describe` result wins before a live operation.
