---
name: zotero-workflow-agent-runner
description: Use when a Zotero Librarian task should be executed by the Hermes agent through `zotero-bridge workflow agent-run`, especially workflow-level or weak-Zotero-context handoffs such as literature search ingest preparation.
license: AGPL-3.0-or-later
---

# Zotero Workflow Agent Runner

Use this skill for agent-owned Host Bridge workflow handoffs. It prepares or consumes a `workflow agent-run` bundle, completes the local request contract, and applies results only when the handoff requires apply-back.

## First Steps

1. Read `../zotero-librarian/references/workflow-execution-policy.md` to confirm agent-owned execution is appropriate.
2. Read `references/agent-run-playbook.md` before opening or executing a handoff bundle.
3. Use `../zotero-librarian/references/common-tasks.md` when mapping a user request to a known librarian workflow.
4. Use `../zotero-librarian/references/terminology.md` when handles, artifacts, or workflow terms are ambiguous.

## Responsibilities

### Must Be Done By LLM

- Decide whether the workflow request can be handled as an agent-owned handoff.
- Interpret the handoff request and output contract.
- Execute the requested local skill work or delegate it according to the request contract.
- Decide whether the completed result is ready for `workflow agent-apply`.

### Must Be Done By Scripts

- Normalize workflow selection refs.
- Build non-blocking workflow plans.
- Submit `workflow agent-run` and return the downloaded bundle path.
- Validate deterministic JSON input and render stable stdout.

### Forbidden

- Do not treat `agentRunId` as a `workflowRunId`.
- Do not monitor agent-owned handoffs through `run active`, `run get`, or notification inbox.
- Do not hand-write result bundle structure when the request contract provides a bundle rule.
- Do not use Host-owned submit just because it is available when the workflow is clearly agent-owned and local execution is suitable.

## Minimal Commands

Prepare a plan:

```powershell
scripts/zotero_librarian_workflow_service.py plan --workflow <workflowId> --mode agent --items .\items.json
```

Launch one agent-owned handoff without waiting:

```powershell
scripts/zotero_librarian_workflow_service.py submit --plan .\plan.json
```

Apply the completed result bundle only when the handoff contract requires it:

```powershell
zotero-bridge workflow agent-apply <agentRunId> --result <agentRequestId>=<bundlePath>
```
