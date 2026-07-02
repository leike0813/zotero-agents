---
name: zotero-bridge-cli
description: Use when an agent needs ZoteroBridge CLI access to the Zotero library or Host Bridge, library or synthesis context, workflow submission or monitoring, or agent-owned workflow apply-back.
license: AGPL-3.0-or-later
---

# Zotero Bridge CLI

Use this skill when the task needs Zotero library data, current Zotero UI context, synthesis context, Host Bridge diagnostics, workflow execution, run monitoring, mutation preview/apply, note or item writeback, annotation export, or file-handle transfer through the `zotero-bridge` command.

The CLI is the contract boundary. Prefer commands documented in `references/host-bridge-cli.md` over raw capabilities. Use `call` only for diagnostics or for a capability that is explicitly raw-only.

## Operating Principles

1. Start with the narrowest read operation that can answer the question.
2. Treat Zotero item keys, topic IDs, workflow IDs, `workflowRunId`, `skillRunId`, `agentRunId`, and `agentRequestId` as opaque handles.
3. Use `context current` or `context selection get` when the user's request depends on the active Zotero view, selected items, or where the user should be taken next.
4. Treat `context ... open` as Zotero UI navigation only. It does not write library data and it must target Zotero object handles returned by Zotero or Host Bridge.
5. Use `bridge profile inspect`, `bridge profile diagnose`, and `bridge backend ...` when availability, backend readiness, or profile compatibility is uncertain.
6. Inspect first, preview writes when the user has not already approved the exact operation, then apply through `mutation apply` or a mutation-backed semantic command.
7. For workflow execution, decide whether Host Bridge owns the run or the agent owns the execution before issuing commands.
8. Do not infer a hidden interactive target from a workflow run. Reply and connect actions require `skillRunId`.
9. Treat permission visibility as read-only. Use `run permission ...` to understand pending approval state; do not try to approve or reject from the CLI.
10. Do not assemble workflow result bundles by hand when `workflow agent-run` provides a prepared handoff contract.
11. Treat uploaded files as Host Bridge handles. Upload local artifacts with `file upload`, attach them with `mutation item attach-file`, and do not pass local paths as Zotero paths.

## Runtime Setup

The published bundle includes `install.ps1`, `install.sh`, and `assets/profile.template.json`. Use `.\install.ps1 --yes --json` on Windows or `./install.sh --yes --json` on POSIX when the run-local shim is unavailable and the CLI needs to be installed for the current profile.

## Workflow Model

Use `workflow describe <workflowId>` or `workflow requirements <workflowId>` before submitting a workflow whose input shape, output contract, or execution mode is uncertain. Use `workflow validate` when you have a draft selection, workflow options, or provider profile and need to check readiness without starting a run.

Use `workflow submit` when Host Bridge should execute the workflow and produce a `workflowRunId`. Register and monitor only these Host-owned runs through the run control plane.

Use `workflow agent-run` when the agent should perform one or more requests locally and then return the result. The returned `agentRunId` is an apply-back session handle, not a backend run handle. Apply results with `workflow agent-apply <agentRunId> --result <agentRequestId>=<bundlePath>`.

Use `run get`, `run active`, `run recent`, `run workflow recent`, `run skill recent`, `run skill events`, `run notification ...`, `run cancel`, and `run skill ...` for Host-owned workflow runs and skill runs. These commands do not monitor or complete agent-owned handoff sessions.

Use `run notification list` or `run notification wait` when you need a lightweight inbox of workflow and skill-run lifecycle events. Notification output is for progress awareness and callback-style handoff; it is not a transcript and is not a hidden interaction target.

Use `run skill events <skillRunId>` when you need lifecycle/progress facts for one skill run without starting a watch stream. Events are not transcripts and do not include workspace paths or provider private payloads.

Use `synthesis cache status` and `synthesis index status` for maintenance diagnostics. Use `synthesis cache invalidate` only for the supported enum scopes and only when the user or workflow has accepted an approval-gated maintenance operation.

## Failure Handling

When a command fails, inspect the structured JSON error first. Retry only after the failure mode is clear: missing handle, invalid payload, unavailable Zotero state, waiting interaction, permission review, or backend recovery.

When a run is waiting for user input, use `run get` or `run active` to locate the `skillRunId`, then use `run skill reply <skillRunId> --message ...`.

When a run is failed and recoverable, use `run skill connect <skillRunId>` only when the returned actions indicate that connection is supported.

After handling a notification, acknowledge it with `run notification ack --event <eventId>` so later checks can focus on new events.

For library writeback, prefer mutation-backed commands such as `mutation tag add`, `mutation item update`, `mutation note create`, and `mutation item attach-file` after the target item or note has been read. If an apply command returns an approval or validation error, report the structured code and stop rather than retrying with `call`.

## Canonical Surface

<!-- host-bridge-surface:wrapper-skill:start -->
<!-- host-bridge-surface:wrapper-skill:end -->

## References

- `references/host-bridge-cli.md`: command groups, endpoints, capabilities, and examples generated from the Host Bridge surface catalog.
- `references/agent-guidance.md`: command selection rules, workflow handoff rules, and failure-handling guidance for agents.

## Remote Export Bundles

When Zotero returns file handles, download them with `file download`. Preserve returned paths and checksums in task artifacts when the downstream skill needs to cite or reuse the exact exported file.

When an agent needs to return a local artifact to Zotero, upload it with `file upload` and use the returned `fileId` in a writeback mutation. The upload handle is short-lived and may be consumed by attach.
