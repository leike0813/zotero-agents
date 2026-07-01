---
name: zotero-bridge-cli
description: Use when an agent needs ZoteroBridge CLI access to the Zotero library or Host Bridge, library or synthesis context, workflow submission or monitoring, or agent-owned workflow apply-back.
license: AGPL-3.0-or-later
---

# Zotero Bridge CLI

Use this skill when the task needs Zotero library data, synthesis context, Host Bridge workflow execution, run monitoring, mutation preview/apply, or file-handle transfer through the `zotero-bridge` command.

The CLI is the contract boundary. Prefer commands documented in `references/host-bridge-cli.md` over raw capabilities. Use `call` only for diagnostics or for a capability that is explicitly raw-only.

## Operating Principles

1. Start with the narrowest read operation that can answer the question.
2. Treat Zotero item keys, topic IDs, workflow IDs, `workflowRunId`, `skillRunId`, `agentRunId`, and `agentRequestId` as opaque handles.
3. Keep writes inside `mutation preview`, `mutation apply`, or workflow apply-back paths that expose review and approval.
4. For workflow execution, decide whether Host Bridge owns the run or the agent owns the execution before issuing commands.
5. Do not infer a hidden interactive target from a workflow run. Reply and connect actions require `skillRunId`.
6. Do not assemble workflow result bundles by hand when `workflow agent-run` provides a prepared handoff contract.

## Runtime Setup

The published bundle includes `install.ps1`, `install.sh`, and `assets/profile.template.json`. Use `.\install.ps1 --yes --json` on Windows or `./install.sh --yes --json` on POSIX when the run-local shim is unavailable and the CLI needs to be installed for the current profile.

## Workflow Model

Use `workflow describe <workflowId>` before submitting a workflow whose input shape, output contract, or execution mode is uncertain.

Use `workflow submit` when Host Bridge should execute the workflow and produce a `workflowRunId`. Register and monitor only these Host-owned runs through the run control plane.

Use `workflow agent-run` when the agent should perform one or more requests locally and then return the result. The returned `agentRunId` is an apply-back session handle, not a backend run handle. Apply results with `workflow agent-apply <agentRunId> --result <agentRequestId>=<bundlePath>`.

Use `run get`, `run active`, `run cancel`, and `run skill ...` for Host-owned workflow runs and skill runs. These commands do not monitor or complete agent-owned handoff sessions.

## Failure Handling

When a command fails, inspect the structured JSON error first. Retry only after the failure mode is clear: missing handle, invalid payload, unavailable Zotero state, waiting interaction, permission review, or backend recovery.

When a run is waiting for user input, use `run get` or `run active` to locate the `skillRunId`, then use `run skill reply <skillRunId> --message ...`.

When a run is failed and recoverable, use `run skill connect <skillRunId>` only when the returned actions indicate that connection is supported.

## Canonical Surface

<!-- host-bridge-surface:wrapper-skill:start -->
<!-- host-bridge-surface:wrapper-skill:end -->

## References

- `references/host-bridge-cli.md`: command groups, endpoints, capabilities, and examples generated from the Host Bridge surface catalog.
- `references/agent-guidance.md`: command selection rules, workflow handoff rules, and failure-handling guidance for agents.

## Remote Export Bundles

When Zotero returns file handles, download them with `file download`. Preserve returned paths and checksums in task artifacts when the downstream skill needs to cite or reuse the exact exported file.
