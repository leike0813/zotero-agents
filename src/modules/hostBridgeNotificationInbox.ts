import type {
  HostBridgeRunLiveness,
  HostBridgeSkillRunActions,
  HostBridgeSkillRunDto,
  HostBridgeWorkflowRunStatus,
  HostBridgeWorkflowTaskDto,
} from "./hostBridgeWorkflowControl";

export type HostBridgeNotificationType =
  | "workflow.run.started"
  | "workflow.run.waiting"
  | "workflow.run.completed"
  | "workflow.run.failed"
  | "workflow.run.canceled"
  | "skill_run.started"
  | "skill_run.waiting_user"
  | "skill_run.waiting_auth"
  | "skill_run.failed_retriable"
  | "skill_run.completed";

export type HostBridgeNotificationEvent = {
  eventId: string;
  type: HostBridgeNotificationType;
  createdAt: string;
  workflowRunId?: string;
  skillRunId?: string;
  workflowId?: string;
  taskName?: string;
  state?: string;
  liveness?: HostBridgeRunLiveness;
  sequenceStepId?: string;
  sequenceStepIndex?: number;
  actions?: HostBridgeSkillRunActions;
  summary: string;
  relatedHandles: {
    workflowRunId?: string;
    skillRunId?: string;
  };
  acknowledgedAt: string | null;
};

export type HostBridgeNotificationFilters = {
  workflowRunId?: string;
  skillRunId?: string;
  type?: HostBridgeNotificationType | string;
  sinceEventId?: string;
  acknowledged?: boolean;
  limit?: number;
};

export type HostBridgeNotificationListResult = {
  notifications: HostBridgeNotificationEvent[];
  nextSinceEventId?: string;
  returned: number;
  hasMore: boolean;
};

export type HostBridgeNotificationAckResult = {
  acknowledged: string[];
  missing: string[];
  acknowledgedAt: string;
};

type NotificationInput = Omit<
  HostBridgeNotificationEvent,
  "eventId" | "createdAt" | "relatedHandles" | "acknowledgedAt"
> & {
  eventKey: string;
  createdAt?: string;
};

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

const events: HostBridgeNotificationEvent[] = [];
const eventIdByKey = new Map<string, string>();
let eventCounter = 0;

function normalizeString(value: unknown) {
  return String(value || "").trim();
}

function nowIso() {
  return new Date().toISOString();
}

function nextEventId() {
  eventCounter += 1;
  return `hb-notification-${eventCounter}`;
}

function normalizeLimit(limit: unknown) {
  if (typeof limit === "number" && Number.isFinite(limit)) {
    return Math.max(1, Math.min(MAX_LIMIT, Math.floor(limit)));
  }
  return DEFAULT_LIMIT;
}

function eventMatches(
  event: HostBridgeNotificationEvent,
  filters: HostBridgeNotificationFilters,
) {
  if (filters.workflowRunId && event.workflowRunId !== filters.workflowRunId) {
    return false;
  }
  if (filters.skillRunId && event.skillRunId !== filters.skillRunId) {
    return false;
  }
  if (filters.type && event.type !== filters.type) {
    return false;
  }
  if (
    typeof filters.acknowledged === "boolean" &&
    Boolean(event.acknowledgedAt) !== filters.acknowledged
  ) {
    return false;
  }
  return true;
}

function insertNotification(input: NotificationInput) {
  const eventKey = normalizeString(input.eventKey);
  if (!eventKey || eventIdByKey.has(eventKey)) {
    return;
  }
  const eventId = nextEventId();
  eventIdByKey.set(eventKey, eventId);
  events.push({
    eventId,
    type: input.type,
    createdAt: input.createdAt || nowIso(),
    workflowRunId: input.workflowRunId,
    skillRunId: input.skillRunId,
    workflowId: input.workflowId,
    taskName: input.taskName,
    state: input.state,
    liveness: input.liveness,
    sequenceStepId: input.sequenceStepId,
    sequenceStepIndex: input.sequenceStepIndex,
    actions: input.actions,
    summary: input.summary,
    relatedHandles: {
      workflowRunId: input.workflowRunId,
      skillRunId: input.skillRunId,
    },
    acknowledgedAt: null,
  });
}

function workflowEventType(
  status: Pick<HostBridgeWorkflowRunStatus, "state" | "liveness">,
): HostBridgeNotificationType | null {
  if (status.state === "succeeded") {
    return "workflow.run.completed";
  }
  if (status.state === "failed") {
    return "workflow.run.failed";
  }
  if (status.state === "canceled") {
    return "workflow.run.canceled";
  }
  if (status.state === "waiting" || status.liveness === "waiting") {
    return "workflow.run.waiting";
  }
  if (
    status.state === "running" ||
    status.state === "queued" ||
    status.liveness === "active"
  ) {
    return "workflow.run.started";
  }
  return null;
}

function skillRunEventType(
  skillRun: Pick<HostBridgeSkillRunDto, "state" | "liveness">,
): HostBridgeNotificationType | null {
  if (skillRun.state === "succeeded") {
    return "skill_run.completed";
  }
  if (skillRun.state === "waiting_user") {
    return "skill_run.waiting_user";
  }
  if (skillRun.state === "waiting_auth") {
    return "skill_run.waiting_auth";
  }
  if (skillRun.liveness === "failed_retriable") {
    return "skill_run.failed_retriable";
  }
  if (
    skillRun.state === "running" ||
    skillRun.state === "queued" ||
    skillRun.liveness === "active"
  ) {
    return "skill_run.started";
  }
  return null;
}

function workflowSummary(
  type: HostBridgeNotificationType,
  status: Pick<
    HostBridgeWorkflowRunStatus,
    "workflowId" | "workflowLabel" | "workflowRunId"
  >,
) {
  const label =
    status.workflowLabel || status.workflowId || status.workflowRunId;
  switch (type) {
    case "workflow.run.completed":
      return `Workflow run completed: ${label}`;
    case "workflow.run.failed":
      return `Workflow run failed: ${label}`;
    case "workflow.run.canceled":
      return `Workflow run canceled: ${label}`;
    case "workflow.run.waiting":
      return `Workflow run is waiting: ${label}`;
    default:
      return `Workflow run started: ${label}`;
  }
}

function skillRunSummary(
  type: HostBridgeNotificationType,
  run: HostBridgeSkillRunDto,
) {
  const label =
    run.taskName || run.skillLabel || run.skillName || run.skillRunId;
  switch (type) {
    case "skill_run.completed":
      return `Skill run completed: ${label}`;
    case "skill_run.waiting_user":
      return `Skill run is waiting for user input: ${label}`;
    case "skill_run.waiting_auth":
      return `Skill run is waiting for authorization: ${label}`;
    case "skill_run.failed_retriable":
      return `Skill run failed and can be retried: ${label}`;
    default:
      return `Skill run started: ${label}`;
  }
}

export function projectWorkflowRunNotifications(
  status: HostBridgeWorkflowRunStatus,
) {
  if (!status.found) {
    return;
  }
  const workflowType = workflowEventType(status);
  if (workflowType) {
    insertNotification({
      eventKey: [
        "workflow",
        workflowType,
        status.workflowRunId,
        status.state,
        status.liveness,
      ].join("|"),
      type: workflowType,
      workflowRunId: status.workflowRunId,
      workflowId: status.workflowId,
      state: status.state,
      liveness: status.liveness,
      summary: workflowSummary(workflowType, status),
      createdAt: status.updatedAt,
    });
  }
  for (const skillRun of status.skillRuns) {
    projectSkillRunNotification(skillRun);
  }
}

export function projectSkillRunNotification(skillRun: HostBridgeSkillRunDto) {
  const type = skillRunEventType(skillRun);
  if (!type) {
    return;
  }
  insertNotification({
    eventKey: [
      "skill",
      type,
      skillRun.workflowRunId,
      skillRun.skillRunId,
      skillRun.state,
      skillRun.liveness,
    ].join("|"),
    type,
    workflowRunId: skillRun.workflowRunId,
    skillRunId: skillRun.skillRunId,
    workflowId: skillRun.workflowId,
    taskName: skillRun.taskName,
    state: skillRun.state,
    liveness: skillRun.liveness,
    sequenceStepId: skillRun.sequenceStepId,
    sequenceStepIndex: skillRun.sequenceStepIndex,
    actions: skillRun.actions,
    summary: skillRunSummary(type, skillRun),
    createdAt: skillRun.updatedAt,
  });
}

export function projectTaskNotifications(
  tasks: HostBridgeWorkflowTaskDto[],
  buildSkillRun: (
    task: HostBridgeWorkflowTaskDto,
  ) => HostBridgeSkillRunDto | null,
) {
  const workflowRunIds = new Set<string>();
  for (const task of tasks) {
    if (task.runId) {
      workflowRunIds.add(task.runId);
    }
    const skillRun = buildSkillRun(task);
    if (skillRun) {
      projectSkillRunNotification(skillRun);
    }
  }
  return workflowRunIds;
}

export function listHostBridgeNotificationEvents(
  filters: HostBridgeNotificationFilters = {},
): HostBridgeNotificationListResult {
  const limit = normalizeLimit(filters.limit);
  const sinceIndex = filters.sinceEventId
    ? events.findIndex((event) => event.eventId === filters.sinceEventId)
    : -1;
  const startIndex = sinceIndex >= 0 ? sinceIndex + 1 : 0;
  const matched = events
    .slice(startIndex)
    .filter((event) => eventMatches(event, filters))
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
  const notifications = matched.slice(0, limit);
  const last = notifications[notifications.length - 1];
  return {
    notifications,
    nextSinceEventId: last?.eventId || filters.sinceEventId,
    returned: notifications.length,
    hasMore: matched.length > notifications.length,
  };
}

export function acknowledgeHostBridgeNotificationEvents(
  eventIds: string[],
): HostBridgeNotificationAckResult {
  const acknowledgedAt = nowIso();
  const ids = Array.from(
    new Set(eventIds.map(normalizeString).filter(Boolean)),
  );
  const acknowledged: string[] = [];
  const missing: string[] = [];
  for (const eventId of ids) {
    const event = events.find((entry) => entry.eventId === eventId);
    if (!event) {
      missing.push(eventId);
      continue;
    }
    event.acknowledgedAt = acknowledgedAt;
    acknowledged.push(eventId);
  }
  return { acknowledged, missing, acknowledgedAt };
}

export function resetHostBridgeNotificationInboxForTests() {
  events.length = 0;
  eventIdByKey.clear();
  eventCounter = 0;
}
