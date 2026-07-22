# Host-Owned Workflow

Use this journey when Host Bridge or its configured backend should own execution and expose a monitorable `workflowRunId`.

## Prepare and submit

1. `workflow list` discovers candidates; it does not prove a workflow accepts the current input.
2. `workflow describe` or `workflow requirements` returns only workflow-owned selection, workflow options, provider requirements, purpose, and execution-mode facts.
3. Normalize child refs to top-level item refs and run `workflow validate` with the intended selection and workflow options. Provider profile input is invalid on workflow describe and validate.
4. Independently use `workflow profile list`, `workflow profile describe --backend <id>`, and `workflow profile validate --provider-profile <JSON_OR_FILE>` for backend-owned provider options. These commands never accept a workflow id.
5. Check that the validated profile satisfies the workflow's provider requirements. `workflow submit` performs the same compatibility preflight and is the only join point for both contracts.
6. Submit only when `executionModes.hostOwned.supported` is true. Pass workflow options and provider profile separately and preserve `workflowRunId`.

An explicit `--provider-profile` always wins. Otherwise the CLI may inject `ZOTERO_BRIDGE_DEFAULT_PROVIDER_PROFILE`, whose value is inline JSON or `@` followed by an absolute profile path. The default belongs to the current agent/CLI process; it is not saved by Zotero and is never applied to agent-owned handoffs.

## Monitor and interact

Use `run get <workflowRunId>` for authoritative run status. Use active/recent lists only for discovery. If status exposes a `skillRunId`, inspect that exact skill run before reply/connect. Permission reads are observational; approval happens in the Host UI. Notification events are progress signals, not transcripts or authorization.

## Completion evidence

A terminal workflow status proves execution ended, not that every expected Product exists. For Dashboard output, list/get the `productId`, then download the chosen asset and verify it. Record run id, terminal state, relevant skill/permission/event handles, and Product evidence.

## Recovery

Cancellation is intent, not immediate completion; reread run state. On uncertain submission, search recent workflow runs using workflow/backend filters before creating another run. Never monitor a returned `agentRunId` with this control plane.
