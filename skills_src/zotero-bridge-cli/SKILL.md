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
2. Run `zotero-bridge surface identity --json`. Compare `protocol`, `cliSchema`, `version`, `buildFingerprint`, and `commandCatalogChecksum` with the active release envelope; stop on any mismatch.
3. If the canonical operation is unknown, run `surface search --intent '<operational terms>' --json`. Run `surface describe '<canonical command>' --json` before execution and read the generated command reference for the complete offline card.
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

## Command discovery and invocation

Use `surface search` to discover operations, not to decide a research task. `surface describe` is authoritative for argv bindings, invocation and payload schemas, result shape, pagination, effects, approval scope, handle transitions, recovery, and targets. Use raw `call` only for an advanced diagnostic capability that has no canonical semantic command.

Choose an input channel only when the descriptor permits it:

- use direct flags and positionals for short scalar values and typed refs;
- use inline JSON only for short, reviewed payloads;
- use a documented path, `@file`, or `-` for stdin for larger payloads;
- keep workflow selection, workflow options, and provider profile as separate values;
- use absolute output paths when a command or profile helper requires them.

Do not reinterpret a CLI option from a similarly named command. The generated reference exposes all bindings, but the active binary's `surface describe` result wins when the loaded artifact and executable differ.

## Identity, paging, and freshness

A title, citation string, cached index row, generated report, or search candidate is not a Zotero object identity. Resolve current context for deictic requests, keep returned library IDs and item keys, normalize child notes or attachments to their top-level parent only when the next contract requires parent items, and fetch the selected object before reporting detailed state or writing.

For cursor or offset pagination, preserve accepted pages and the last returned cursor or offset. Continue until the response reports completion or the bounded request is satisfied. After interruption, resume from the last accepted position and never merge an already accepted page twice. An empty first page or truncated search is not proof of absence.

Local indexes, snapshots, workflow catalogs, notifications, and generated Synthesis artifacts have explicit freshness limits. Re-read the live object, selection, permission, run, Product, operation, or workflow description whenever the requested conclusion or write depends on current state.

## Effects, approval, and handles

The command card distinguishes read, navigation, write, maintenance, and debug operations. Navigation may change visible Zotero UI state without modifying bibliographic data. Ephemeral output or workflow control is not automatically a library mutation. Maintenance and debug repair require their own diagnosed scope and must not be used as shortcuts around a failed semantic command.

Zotero-managed writes and apply-back remain subject to the declared Zotero-side approval path. Permission reads are observational and cannot approve or reject a request. A prior approval, valid preview, local validation, notification, cached proposal, or terminal run never authorizes another operation.

Treat every returned identifier as an opaque typed handle. Keep Zotero refs, `workflowRunId`, `skillRunId`, `agentRunId`, `agentRequestId`, `permissionRequestId`, `operationId`, `eventId`, `fileId`, and Product identifiers in their declared command families. Never synthesize, recast, or exchange them. Do not reuse a handle after `handleConsumption` is `consumed` or `unknown` without a domain receipt that explicitly permits continuation.

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

For Zotero-managed execution, discover the current workflow, read its description or requirements, validate selection and workflow options, validate the backend provider profile independently, then submit them through the declared join point. Preserve `workflowRunId`; use run commands for status, cancellation, skill interaction, permission observation, notifications, history, and events. A cancellation request is intent until a later run read confirms terminal state.

For self-owned agent execution, confirm that the workflow supports that mode, prepare the handoff, preserve `agentRunId`, every `agentRequestId`, bundle locations, and checksums, then inspect each request contract. Validate every completed result locally before apply-back. Apply the complete request-to-result mapping through `workflow agent-apply` and use `workflow agent-apply-status` for the durable receipt. Never monitor an `agentRunId` through the Zotero-managed run plane.

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

## LLM and tool responsibilities

- The agent owns operation selection, semantic interpretation, approval-aware decisions, evidence use, and recovery choices.
- The CLI owns exact argv parsing, Zotero Bridge service requests, typed-handle transport, structured errors, and local bundle/result validation.
- The renderer owns the command reference and embedded Agent Surface; do not hand-assemble either artifact or invent a handle, receipt, checksum, or result envelope.

## Completion

The Skill is complete when the requested operation has returned a valid JSON envelope, all required pages or delivered bytes have been obtained, relevant handles and receipts are preserved, and any requested state change is live-verified. It is also complete when a structured failure is classified with the next safe action and no unsafe repeat has occurred.

## Failure handling

1. Preserve the command, sanitized inputs, structured error code, relevant handles, accepted pages, and any operation or output identifiers.
2. Read `retryable`, `stateChange`, `handleConsumption`, `safeNextActions`, and `nextCommand` from the envelope.
3. When `stateChange` is `changed` or `unknown`, read the durable operation, apply-back receipt, workflow/run state, or affected live object before another change.
4. When `handleConsumption` is `consumed` or `unknown`, do not reuse the handle unless the domain receipt declares a resumable action.
5. Retry only when `retryable` is true, current state permits it, and the retry will not duplicate an accepted page, submission, mutation, upload, or apply-back.
6. For partial apply-back, report each applied, failed, and unattempted request from the receipt; never collapse the result into success or replay the complete mapping.
7. For file or paging failure, keep verified bytes/pages and resume only through the returned cursor, file owner, or safe next command.
8. If authority, input, identity, profile readiness, or approval is missing, return the structured failure and required decision rather than bypassing the CLI or Zotero-side boundary.

## References

- Read the [generated command reference](references/command-reference.md) after selecting a command and whenever exact argv, schemas, pagination, effects, approvals, handles, targets, or recovery are needed. It is the exhaustive offline command inventory; confirm the active executable with `surface describe` before a live operation.
