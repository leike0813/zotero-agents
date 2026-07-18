# Scheduled Jobs

Scheduled jobs perform one bounded pass and return. They never long-poll and are read-only unless a separately reviewed current request reaches a Host-owned approval boundary.

| Job | Schedule | Command | Report only when | Mutation |
| --- | --- | --- | --- | --- |
| index-refresh | every 6h | index service `refresh` | added, deleted, changed, or error | none |
| workflow-catalog-refresh | 03:00 | index service `workflow-refresh` | new workflow, schema hash change, or error | none |
| notification-sync | every 5m | notification service `sync` | new actionable lifecycle event or error | none |
| run-monitor | every 5m | index service `run-watch` | waiting, succeeded, failed, or canceled transition | none |
| workflow-status-triage | 09:00 | index search `status:need-` | actionable workflow-pending candidates | never |
| library-hygiene | Monday 09:30 | index service `stats` | duplicates, suspicious metadata, orphan or structure candidates | never |
| attention-queue | 18:00 | `synthesis insight attention-queue` | high-priority reading, metadata, or analysis candidates | none |

When no report condition is met, emit exactly `[SILENT]`. Silence means “no reportable delta”, not that the job skipped validation.

Triage and hygiene may propose workflows or mutations but must not execute them. If a scheduled task encounters a possible write, permission, apply-back, or destructive maintenance action, preserve the evidence and escalate it for current user review.

On failure, retain the previous index/catalog/monitor state, report the command and structured error, and avoid tight retry loops. Live-confirm any cached fact before an external notification or recommended write.
