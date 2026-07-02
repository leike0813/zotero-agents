# Design

## Profile Skill Layout

The existing `zotero-librarian` skill remains the profile entrypoint for library inspection, synthesis, writeback, and Host-owned workflow coordination. A new `zotero-workflow-agent-runner` skill handles agent-owned workflow handoffs created by `workflow agent-run`.

Detailed workflow policy is reference-backed:

- `workflow-execution-policy.md` defines workflow mode choice, parent-item selection, concurrency confirmation, and notification monitoring.
- `common-tasks.md` maps common librarian requests to Host Bridge command families and workflow choices.
- `agent-run-playbook.md` defines the agent-owned handoff loop.

## Script Boundary

Helper scripts perform deterministic work only: JSON/file parsing, selection normalization through Host Bridge reads, readiness page planning, non-blocking submission, SQLite run/notification registration, and stable JSON rendering.

The agent remains responsible for semantic choices: choosing workflow intent, confirming concurrency, deciding whether a task should be Host-owned or agent-owned, and interpreting workflow outputs.

## Non-Blocking Execution

Submission scripts may start workflows, but they do not wait for completion. By default, one submission is launched per invocation. Higher launch counts require explicit `--confirm-concurrency`.

Notification sync uses `run notification list` and stores event projections locally. It must not use `run notification wait` in cron or service scripts.
