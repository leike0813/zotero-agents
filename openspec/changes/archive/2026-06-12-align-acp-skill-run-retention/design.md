# Design: Align ACP Skill Run Retention

## Retention Source

ACP Skills retention uses `getTaskDashboardHistoryRetentionConfig()` so its
default window stays aligned with the existing 30-day task history retention.

## Eligibility

A run is eligible for retention cleanup only when it is terminal and removed or
archived. The timestamp used for expiry is the first available value among
`removedAt`, `archivedAt`, and `updatedAt`.

Runs that are still active, waiting for user input, prompting, permission
required, or otherwise non-terminal are not eligible for TTL cleanup even if
their filesystem timestamps are old.

## Cleanup Shape

The ACP Skills run store owns parsing and deletion of `acp/skill-runs` rows.
Runtime persistence calls that internal cleanup helper and removes workspace
directories reported by the helper after validating they are under
`acpSkillRunsDir`.

Manual category cleanup remains stronger than retention cleanup: it clears all
ACP skill run rows and the whole `runtime/acp/skill-runs` directory.

## Test Strategy

Tests cover stable behavior rather than exact logs or wording:

- expired terminal archived run removes row and workspace;
- fresh terminal archived run remains;
- stale non-terminal/recoverable run remains;
- manual category cleanup still clears the whole category.
