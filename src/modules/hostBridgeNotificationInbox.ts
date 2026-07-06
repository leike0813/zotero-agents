import {
  acknowledgeNotificationHubEvents,
  appendNotificationHubEvent,
  listNotificationHubEvents,
  NOTIFICATION_HUB_MAX_EVENTS,
  resetNotificationHubForTests,
  type NotificationHubEvent,
  type NotificationHubSeverity,
} from "./notificationHub";
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
  | "skill_run.completed"
  | (string & {});

export type HostBridgeNotificationEvent = {
  eventId: string;
  type: HostBridgeNotificationType;
  severity?: NotificationHubSeverity;
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
  text?: string;
  source?: string;
  owner?: string;
  scope?: string;
  semantic?: string;
  displayGroupKey?: string;
  dedupKey?: string;
  metadata?: Record<string, unknown>;
  suppressed?: boolean;
  relatedHandles: {
    workflowRunId?: string;
    skillRunId?: string;
    [key: string]: string | undefined;
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
  clientId?: string;
  includeSuppressed?: boolean;
};

export type HostBridgeNotificationListResult = {
  notifications: HostBridgeNotificationEvent[];
  nextSinceEventId?: string;
  returned: number;
  hasMore: boolean;
  truncated: boolean;
};

export type HostBridgeNotificationAckResult = {
  acknowledged: string[];
  missing: string[];
  acknowledgedAt: string;
  clientId?: string;
};

type NotificationInput = Omit<
  HostBridgeNotificationEvent,
  "eventId" | "createdAt" | "relatedHandles" | "acknowledgedAt"
> & {
  eventKey: string;
  createdAt?: string;
};

export const HOST_BRIDGE_NOTIFICATION_MAX_EVENTS = NOTIFICATION_HUB_MAX_EVENTS;

function normalizeString(value: unknown) {
  return String(value || "").trim();
}

function hostBridgeEventFromHub(
  event: NotificationHubEvent,
): HostBridgeNotificationEvent {
  return {
    eventId: event.eventId,
    type: event.type,
    severity: event.severity,
    createdAt: event.createdAt,
    workflowRunId: event.relatedHandles.workflowRunId,
    skillRunId: event.relatedHandles.skillRunId,
    workflowId: event.relatedHandles.workflowId,
    taskName: event.relatedHandles.taskName,
    state: event.relatedHandles.state,
    liveness: event.relatedHandles.liveness as HostBridgeRunLiveness,
    sequenceStepId: event.relatedHandles.sequenceStepId,
    sequenceStepIndex: Number.isFinite(
      Number(event.relatedHandles.sequenceStepIndex),
    )
      ? Number(event.relatedHandles.sequenceStepIndex)
      : undefined,
    actions: event.metadata?.actions as HostBridgeSkillRunActions | undefined,
    summary: event.summary,
    text: event.text,
    source: event.source,
    owner: event.owner,
    scope: event.scope,
    semantic: event.semantic,
    displayGroupKey: event.displayGroupKey,
    dedupKey: event.dedupKey,
    metadata: event.metadata,
    suppressed: event.suppressed || undefined,
    relatedHandles: {
      ...event.relatedHandles,
      workflowRunId: event.relatedHandles.workflowRunId,
      skillRunId: event.relatedHandles.skillRunId,
    },
    acknowledgedAt: event.acknowledgedAt,
  };
}

function insertNotification(input: NotificationInput) {
  const relatedHandles = {
    workflowRunId: input.workflowRunId,
    skillRunId: input.skillRunId,
    workflowId: input.workflowId,
    taskName: input.taskName,
    state: input.state,
    liveness: input.liveness,
    sequenceStepId: input.sequenceStepId,
    sequenceStepIndex:
      typeof input.sequenceStepIndex === "number"
        ? String(input.sequenceStepIndex)
        : undefined,
  };
  appendNotificationHubEvent({
    eventKey: input.eventKey,
    type: input.type,
    severity: input.severity || severityFromNotificationType(input.type),
    summary: input.summary,
    text: input.text,
    source: input.source || "host-bridge-projection",
    owner: input.owner || "workflow",
    scope: input.scope || "host-bridge-notification",
    semantic: input.semantic,
    displayGroupKey: input.displayGroupKey,
    dedupKey: input.dedupKey,
    relatedHandles,
    metadata: {
      ...(input.metadata || {}),
      ...(input.actions ? { actions: input.actions } : {}),
    },
    createdAt: input.createdAt,
    displayRequested: false,
  });
}

function severityFromNotificationType(
  type: HostBridgeNotificationType | string,
): NotificationHubSeverity {
  if (String(type).includes("failed")) {
    return "error";
  }
  if (String(type).includes("completed")) {
    return "success";
  }
  if (String(type).includes("waiting")) {
    return "warning";
  }
  return "info";
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
      owner: "workflow",
      scope: "workflow-run",
      semantic: workflowType.split(".").pop(),
      displayGroupKey: `workflow:${status.workflowRunId}:${workflowType}`,
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
    owner: type.includes("waiting") ? "acp-sidebar" : "workflow",
    scope: "skill-run",
    semantic: type.includes("waiting")
      ? "waiting"
      : type.includes("completed")
        ? "success"
        : type.includes("failed")
          ? "error"
          : "start",
    displayGroupKey: `skill-run:${skillRun.skillRunId}:${type}`,
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
  const workflowRunId = normalizeString(filters.workflowRunId);
  const skillRunId = normalizeString(filters.skillRunId);
  const result = listNotificationHubEvents({
    type: filters.type,
    sinceEventId: filters.sinceEventId,
    acknowledged: filters.acknowledged,
    limit: filters.limit,
    clientId: filters.clientId,
    includeSuppressed: filters.includeSuppressed,
    matches: (event) => {
      if (
        workflowRunId &&
        event.relatedHandles.workflowRunId !== workflowRunId
      ) {
        return false;
      }
      if (skillRunId && event.relatedHandles.skillRunId !== skillRunId) {
        return false;
      }
      return true;
    },
  });
  return {
    ...result,
    notifications: result.notifications.map(hostBridgeEventFromHub),
  };
}

export function acknowledgeHostBridgeNotificationEvents(
  eventIds: string[],
  clientId?: string,
): HostBridgeNotificationAckResult {
  return acknowledgeNotificationHubEvents(eventIds, clientId);
}

export function pruneHostBridgeNotificationInbox() {
  return undefined;
}

export function resetHostBridgeNotificationInboxForTests() {
  resetNotificationHubForTests();
}
