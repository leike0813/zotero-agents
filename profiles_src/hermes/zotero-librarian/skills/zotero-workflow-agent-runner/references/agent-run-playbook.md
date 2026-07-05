# Agent-Run Playbook

Use this playbook after choosing `workflow agent-run`.

## Choose Agent-Owned Execution

Use agent-owned execution when the workflow prepares a handoff for local agent work, the request does not need backend queue ownership, and the user expects the agent to do the work directly. Good candidates are workflow-level inputs, search or ingest preparation, and tasks whose output can be checked locally before apply-back.

Use Host-owned `workflow submit` when the backend should own execution, when the workflow requires backend runtime state, or when progress should be tracked as a `workflowRunId`.

## Execute The Handoff

1. Build or review a plan with `zotero_librarian_workflow_service.py plan --mode agent`.
2. Submit the plan with `zotero_librarian_workflow_service.py submit --plan <plan.json>`.
3. Open the downloaded handoff bundle.
4. Read the request context and output contract before doing work.
5. Produce the requested bundle with the contract's required file names and schema.
6. Apply only completed request results with `workflow agent-apply`.

## Handle Outputs

Keep `agentRunId`, `agentRequestId`, handoff bundle path, result bundle path, and any generated artifact checksums in task notes. If the output contract is unclear or missing, stop and report the structured error rather than inventing a bundle layout.

## Boundaries

Agent-owned handoffs are not Host-owned runs. They do not appear in `run active`, they are not cancelled with `run cancel`, and they are not monitored through notification inbox. Completion is controlled by the handoff contract and `workflow agent-apply`.
