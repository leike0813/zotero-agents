# Workflow Execution

## Choose Ownership

Use `workflow submit` when Host Bridge and a configured backend should own execution. Keep the returned `workflowRunId` and obtain explicit `skillRunId` values before replying or reconnecting.

Use `workflow agent-run` when the current agent should execute prepared requests locally. The downloaded handoff contains sanitized context, request metadata, output contracts, and the authoritative output-contract toolkit. The returned `agentRunId` is an apply-back session handle, not a running Host task.

## Prepare Inputs

1. Inspect the workflow description and selection contract.
2. Resolve current Zotero context when the request uses deictic language.
3. Normalize workflow selection to the required parent item refs.
4. Put workflow parameter values in workflow options and request-level backend selection in the provider profile.
5. Default to one backend submission unless the user explicitly authorizes greater concurrency.

## Host-Owned Execution

1. Submit the workflow and record its `workflowRunId`.
2. Use bounded `run get`, recent history, notification list, or explicit skill-run events to obtain current status.
3. Use `run skill reply|connect` only with a returned `skillRunId` whose action flags allow the operation.
4. Use `run cancel` only with the workflow handle and report that cancellation intent may precede terminal state.

## Agent-Owned Execution

1. Run `workflow agent-run` with an explicit output directory.
2. Read `agent-run/context.json` and every relevant `agent-run/requests/*/output-contract.json`.
3. Execute the requested local work using the supplied context and Skill packages.
4. Finalize each result with the bundled output-contract toolkit or an equivalent implementation of that exact contract.
5. Optionally inspect the handoff and validate a result with `scripts/zotero_library_agent.py workflow ...`.
6. Apply completed results with `workflow agent-apply <agentRunId> --result <agentRequestId>=<bundlePath>` only after reviewing the result and write intent.

Do not use run-control commands for `agentRunId`, monitor agent-owned work as a Host run, or hand-build a result namespace when an output contract is present.

## Completion

Record the ownership mode, relevant typed handles, final state, result bundle paths, and any applied writeback in the current task's evidence. Do not retain a private background monitor after returning the task result.
