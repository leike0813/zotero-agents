# Host Bridge Control Invariants

Use these protocol-level rules in every Host Bridge agent-facing surface.

## Handles

- Treat Zotero object refs, topic IDs, product IDs, file IDs, workflow IDs, `workflowRunId`, `skillRunId`, `agentRunId`, and `agentRequestId` as opaque typed handles.
- Use `workflowRunId` for Host-owned workflow status and cancellation.
- Use an explicit `skillRunId` for skill-run reply, reconnect, and skill event reads.
- Use `agentRunId` only as the apply-back session for agent-owned work, paired with its declared `agentRequestId` values.
- Never substitute one handle type for another or recover a missing handle by parsing display text.

## Authority And Approval

- Reads do not grant write authority.
- Provider permission policy controls backend tool permissions for one submitted run; it does not approve Zotero writes.
- Mutation and workflow apply-back remain subject to Host Bridge approval and current readiness checks.
- Stop on denial. Do not retry through raw calls, direct storage access, or a different command family to bypass the boundary.

## Workflow Ownership

- `workflow submit` starts Host-owned execution and returns a `workflowRunId`.
- `workflow agent-run` prepares a local handoff and returns an `agentRunId` plus request contracts; it does not start a Host backend run.
- `workflow agent-apply` applies finalized agent-owned result bundles through the prepared `agentRunId` contract.
- Validate selection, workflow options, provider profile, result bundle, and apply readiness at their declared boundary instead of assuming earlier validation remains current.

## Files And Artifacts

- Treat `fileId` and broker download handles as opaque and potentially short-lived.
- Verify declared size or checksum when exact artifact identity matters.
- Upload local files before referencing them in Host mutations; do not pass arbitrary local paths as Zotero mutation targets.
- Treat generated paths and evidence locations as locators. Stable refs and digests carry identity across handoffs.

## Operation Receipts And Recovery

- Every state-changing request carries an opaque `operationId`. Preserve it until the durable operation receipt is terminal.
- After a response transport failure, inspect `operation get <operationId>` before retrying. A missing response means `stateChange: unknown`, not unchanged.
- Interpret `stateChange` as `unchanged`, `changed`, or `unknown`, and `handleConsumption` as `unconsumed`, `consumed`, or `unknown`. Never collapse unknown into a Boolean default.
- An `operationId` cannot be reused for different input. Domain handles such as `fileId` and `agentRunId` remain distinct from the operation receipt handle.

## Surface Identity

- A SemVer difference is advisory. Confirm the required command with active CLI help.
- A build fingerprint or command catalog checksum difference means bundled command cards may be stale. Use the active CLI's `surface describe` and `surface search` for the commands needed by the current task.
- A protocol or CLI schema difference requires command-level confirmation of argv, approval, handles, effects, and recovery. Stop only when the required command is absent or its control contract cannot be confirmed.
- Effects are multi-valued. For example, `workflow agent-apply` changes both workflow-control state and the Zotero library; approval alone does not describe its complete effect.

## Privacy And Output

- Keep credentials, authorization headers, full transcripts, provider-private payloads, and agent-private state out of portable evidence.
- Prefer structured error codes, typed handles, cursor metadata, and artifact digests over copied logs or inferred state.
- Treat cached, paged, or generated data as a performance or handoff aid, not the source of current Zotero truth.
