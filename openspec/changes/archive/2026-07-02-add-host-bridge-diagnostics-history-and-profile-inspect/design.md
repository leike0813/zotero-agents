# Design: diagnostics, history, and profile inspect

## Control Surface

This change adds operational observability without expanding privileged write paths. Diagnostics and history endpoints return redacted, agent-usable summaries. Permission endpoints are read-only. Cache invalidation is the only write-like action in this change and remains approval-gated.

## Reuse Strategy

- Backend diagnostics reuse the existing backend registry and any cached runtime/probe metadata already maintained by the plugin. Responses expose identity, type, enabled state, readiness, and compact last-error summaries only.
- Workflow validation reuses the existing workflow describe and submit preparation logic. It must not submit jobs, start backends, request workflow execution approval, or mutate Zotero state.
- Recent run/history views reuse the active task runtime and dashboard history projections.
- Skill-run events are derived from notification inbox events, task history, and ACP skill-run status projections. They are lifecycle/progress facts, not transcripts.
- Permission visibility is registered centrally when Host Bridge permission requests are created and updated when the decision resolves.

## Safety Rules

- Redact token-like fields, backend private payloads, credential-bearing URLs, local private paths, transcript text, and provider private payloads.
- Keep stdout and REST responses as single JSON objects.
- Keep `workflowRunId` and `skillRunId` opaque.
- Use stable error codes for missing backend, workflow, permission, skill run, and unsupported cache scopes.
