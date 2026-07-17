# Host-Owned Workflow

Use this journey when Host Bridge or its configured backend should own execution and expose a monitorable `workflowRunId`.

## Prepare and submit

1. `workflow list` discovers candidates; it does not prove a workflow accepts the current input.
2. `workflow describe` or `workflow requirements` returns selection, workflow option, provider profile, and structured `executionModes` facts.
3. Normalize child refs to top-level item refs. Keep workflow options separate from the provider profile. Never place secrets or local paths in either.
4. Run `workflow validate` with the same selection/options/profile intended for submission.
5. Submit only when `executionModes.hostOwned.supported` is true and validation succeeds. Preserve `workflowRunId`.

## Monitor and interact

Use `run get <workflowRunId>` for authoritative run status. Use active/recent lists only for discovery. If status exposes a `skillRunId`, inspect that exact skill run before reply/connect. Permission reads are observational; approval happens in the Host UI. Notification events are progress signals, not transcripts or authorization.

## Completion evidence

A terminal workflow status proves execution ended, not that every expected Product exists. For Dashboard output, list/get the `productId`, then download the chosen asset and verify it. Record run id, terminal state, relevant skill/permission/event handles, and Product evidence.

## Recovery

Cancellation is intent, not immediate completion; reread run state. On uncertain submission, search recent workflow runs using workflow/backend filters before creating another run. Never monitor a returned `agentRunId` with this control plane.
