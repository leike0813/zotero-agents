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

## Privacy And Output

- Keep credentials, authorization headers, full transcripts, provider-private payloads, and agent-private state out of portable evidence.
- Prefer structured error codes, typed handles, cursor metadata, and artifact digests over copied logs or inferred state.
- Treat cached, paged, or generated data as a performance or handoff aid, not the source of current Zotero truth.
