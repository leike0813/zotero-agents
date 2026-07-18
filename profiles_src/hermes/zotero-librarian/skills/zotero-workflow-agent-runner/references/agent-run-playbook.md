# Agent-Run Playbook

Use this playbook after choosing `workflow agent-run`.

## Choose Agent-Owned Execution

Use agent-owned execution when the workflow prepares a handoff for local agent work, the request does not need backend queue ownership, and the user expects the agent to do the work directly. Good candidates are workflow-level inputs, search or ingest preparation, and tasks whose output can be checked locally before apply-back.

Use Host-owned `workflow submit` when the backend should own execution, when the workflow requires backend runtime state, or when progress should be tracked as a `workflowRunId`.

## Execute The Handoff

1. Read live `workflow describe` or `workflow requirements`; require `executionModes.agentOwned.supported=true` and note why Host-owned execution is not selected.
2. Normalize child refs to top-level parents and build a plan with `zotero_librarian_workflow_service.py plan --mode agent`. Agent mode cannot carry workflow options or provider profiles.
3. Submit the plan with `zotero_librarian_workflow_service.py submit --plan <plan.json>` and preserve `agentRunId`, request ids, bundle paths, and checksums.
4. Open every downloaded handoff bundle. Read request context, requested skill/task, input artifacts, output schema, required filenames, and apply-back rule before doing work.
5. Complete each request independently. Validate output JSON and referenced files before assembling the result bundle; never invent fields or filenames absent from the contract.
6. Preflight the complete request-to-bundle mapping. Do not start apply-back with an invalid bundle merely because another request succeeded.
7. Run `workflow agent-apply <agentRunId> --result <agentRequestId>=<bundlePath> ...` only when all submitted bundles are final.
8. Preserve the returned per-request receipt and live-confirm any Zotero object claimed as written.

## Handle Outputs

Keep `agentRunId`, `agentRequestId`, handoff bundle path, result bundle path, and any generated artifact checksums in task notes. If the output contract is unclear or missing, stop and report the structured error rather than inventing a bundle layout.

The handoff bundle is input evidence; the result bundle is proposed output; the apply receipt is writeback evidence. None of them is interchangeable with a `workflowRunId`, `skillRunId`, Product, or registered `fileId`.

## Apply Failure And Receipt Recovery

Bundle preflight happens before approval and before consuming the apply handle. A preflight failure leaves all requests unapplied; correct the named bundle and submit the complete mapping again only when the error says the handle remains usable.

Once apply execution starts, treat `agentRunId` as one-shot. If the response is interrupted or contains mixed per-request outcomes, run:

```sh
zotero-bridge workflow agent-apply-status <agentRunId>
```

Use the persisted receipt as the sole authority for `applied`, `failed`, state change, consumption, and recoverability. Do not rerun locally completed work or resubmit a result marked applied. If recovery requires a new handoff, create a new agent run rather than reusing the consumed id.

## Boundaries

Agent-owned handoffs are not Host-owned runs. They do not appear in `run active`, they are not cancelled with `run cancel`, and they are not monitored through notification inbox. Completion is controlled by the handoff contract and `workflow agent-apply`.
