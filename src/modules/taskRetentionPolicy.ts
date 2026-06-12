const TASK_HISTORY_RETENTION_DAYS = 30;
const TASK_HISTORY_RETENTION_MS =
  TASK_HISTORY_RETENTION_DAYS * 24 * 60 * 60 * 1000;

export function getTaskHistoryRetentionConfig() {
  return {
    retentionDays: TASK_HISTORY_RETENTION_DAYS,
    retentionMs: TASK_HISTORY_RETENTION_MS,
  };
}
