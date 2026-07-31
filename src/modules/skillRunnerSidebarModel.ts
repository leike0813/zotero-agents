import type { WorkflowSubmissionDisplayIdentity } from "../jobQueue/workflowSubmissionQueueContracts";

export type SkillRunnerSidebarContext = {
  primaryParentItemId?: number;
  relatedParentItemIds: number[];
  itemLabel?: string;
};

export type SkillRunnerSidebarRelationState = "focused" | "related" | "default";

export type SkillRunnerSidebarTaskItem = {
  key: string;
  queueId?: string;
  backendId: string;
  backendDisplayName: string;
  requestId?: string;
  skillName?: string;
  skillLabel?: string;
  skillId?: string;
  workflowLabel?: string;
  status: string;
  stateLabel: string;
  applyState?: string;
  applyAttempt?: number;
  applyMaxAttempt?: number;
  applyNextRetryAt?: string;
  applyError?: string;
  applyUpdatedAt?: string;
  updatedAt: string;
  title: string;
  selectable: boolean;
  requestAssigned?: boolean;
  backendInteractive?: boolean;
  canOpenStream?: boolean;
  canCancelBackendRun?: boolean;
  canReply?: boolean;
  canArchiveLocalRun?: boolean;
  skillRunnerLifecycleState?: string;
  terminal: boolean;
  attention?: "warning" | "";
  attentionLabel?: string;
  inputUnitIdentity?: string;
  targetParentID?: number;
  relationState?: SkillRunnerSidebarRelationState;
  submission?: WorkflowSubmissionDisplayIdentity | null;
  resumptionPending?: boolean;
};

export type SkillRunnerSidebarGroup<
  TTask extends SkillRunnerSidebarTaskItem = SkillRunnerSidebarTaskItem,
> = {
  backendId: string;
  backendDisplayName: string;
  disabled: boolean;
  disabledReason?: string;
  collapsed: boolean;
  finishedCollapsed: boolean;
  activeTasks: TTask[];
  finishedTasks: TTask[];
  latestUpdatedAt: string;
};

export type SkillRunnerSidebarSection<
  TTask extends SkillRunnerSidebarTaskItem = SkillRunnerSidebarTaskItem,
> = {
  id: "running" | "queued" | "completed";
  title: string;
  collapsible?: boolean;
  collapsed: boolean;
  groups: Array<SkillRunnerSidebarGroup<TTask>>;
};

function normalizeIdentity(value: unknown) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function isFinitePositiveInt(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function normalizeParentItemIds(values: unknown[]) {
  const seen = new Set<number>();
  const ids: number[] = [];
  for (const value of values) {
    if (!isFinitePositiveInt(value)) {
      continue;
    }
    const normalized = Math.floor(value as number);
    if (seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    ids.push(normalized);
  }
  return ids;
}

function resolveRelatedParentItemIds(
  context?: SkillRunnerSidebarContext | null,
) {
  return normalizeParentItemIds(context?.relatedParentItemIds || []);
}

function isDeferredApplyVisibleRunning(task: SkillRunnerSidebarTaskItem) {
  const state = normalizeIdentity(task.applyState);
  return state === "pending" || state === "running";
}

function isVisibleSidebarRunningTask(task: SkillRunnerSidebarTaskItem) {
  return (
    task.selectable && (!task.terminal || isDeferredApplyVisibleRunning(task))
  );
}

function isVisibleSidebarCompletedTask(task: SkillRunnerSidebarTaskItem) {
  return (
    task.selectable && task.terminal && !isDeferredApplyVisibleRunning(task)
  );
}

function cloneGroup<TTask extends SkillRunnerSidebarTaskItem>(
  group: SkillRunnerSidebarGroup<TTask>,
): SkillRunnerSidebarGroup<TTask> {
  return {
    ...group,
    activeTasks: [...group.activeTasks],
    finishedTasks: [...group.finishedTasks],
  };
}

export function isSkillRunnerTaskRelatedToContext(args: {
  inputUnitIdentity?: string;
  targetParentID?: number;
  context?: SkillRunnerSidebarContext | null;
}) {
  const relatedParentItemIds = resolveRelatedParentItemIds(args.context);
  if (relatedParentItemIds.length === 0) {
    return false;
  }
  const rawTargetParentId = args.targetParentID;
  if (!isFinitePositiveInt(rawTargetParentId)) {
    return false;
  }
  return relatedParentItemIds.includes(Math.floor(rawTargetParentId as number));
}

export function pickSkillRunnerSidebarFocusedTaskKey<
  TTask extends SkillRunnerSidebarTaskItem,
>(args: {
  groups: Array<SkillRunnerSidebarGroup<TTask>>;
  currentTaskKey?: string;
  context?: SkillRunnerSidebarContext | null;
}) {
  const currentTaskKey = String(args.currentTaskKey || "").trim();
  const relatedParentItemIds = resolveRelatedParentItemIds(args.context);
  if (relatedParentItemIds.length === 0) {
    return currentTaskKey;
  }
  const primaryParentItemId = isFinitePositiveInt(
    args.context?.primaryParentItemId,
  )
    ? Math.floor(args.context?.primaryParentItemId as number)
    : undefined;

  let currentStillRelated = false;
  let primaryRelatedTaskKey = "";
  for (const group of args.groups) {
    if (group.disabled) {
      continue;
    }
    for (const task of group.activeTasks) {
      if (!isVisibleSidebarRunningTask(task)) {
        continue;
      }
      if (
        !isSkillRunnerTaskRelatedToContext({
          targetParentID: task.targetParentID,
          context: args.context,
        })
      ) {
        continue;
      }
      if (task.key === currentTaskKey) {
        currentStillRelated = true;
      }
      if (
        !primaryRelatedTaskKey &&
        primaryParentItemId &&
        Math.floor(Number(task.targetParentID || 0)) === primaryParentItemId
      ) {
        primaryRelatedTaskKey = task.key;
      }
    }
  }

  if (currentStillRelated) {
    return currentTaskKey;
  }
  if (primaryRelatedTaskKey) {
    return primaryRelatedTaskKey;
  }
  return currentTaskKey;
}

export function buildSkillRunnerSidebarSections<
  TTask extends SkillRunnerSidebarTaskItem,
>(args: {
  groups: Array<SkillRunnerSidebarGroup<TTask>>;
  context?: SkillRunnerSidebarContext | null;
  selectedTaskKey?: string;
  runningCollapsed?: boolean;
  completedCollapsed?: boolean;
  queuedCollapsed?: boolean;
  queuedEntries?: ReadonlyArray<{
    queueId: string;
    backendId: string;
    workflowId: string;
    workflowLabel: string;
    taskName: string;
    createdAt: string;
    canCancel: boolean;
    submission?: WorkflowSubmissionDisplayIdentity;
  }>;
}) {
  const selectedTaskKey = String(args.selectedTaskKey || "").trim();
  const runningGroups: Array<SkillRunnerSidebarGroup<TTask>> = [];
  const completedGroups: Array<SkillRunnerSidebarGroup<TTask>> = [];
  const queuedGroupsByBackend = new Map<
    string,
    SkillRunnerSidebarGroup<TTask>
  >();

  for (const group of args.groups) {
    if (group.disabled) {
      continue;
    }
    const allTasks = [...group.activeTasks, ...group.finishedTasks];
    const runningTasks = allTasks
      .filter((task) => isVisibleSidebarRunningTask(task))
      .map((task) => ({
        ...task,
        attention:
          normalizeIdentity(task.status) === "waiting_user" ||
          normalizeIdentity(task.status) === "waiting_auth"
            ? "warning"
            : task.attention,
        attentionLabel:
          normalizeIdentity(task.status) === "waiting_user" ||
          normalizeIdentity(task.status) === "waiting_auth"
            ? "Needs user interaction"
            : task.attentionLabel,
        relationState:
          task.key === selectedTaskKey
            ? "focused"
            : isSkillRunnerTaskRelatedToContext({
                  targetParentID: task.targetParentID,
                  context: args.context,
                })
              ? "related"
              : "default",
      }));
    if (runningTasks.length > 0) {
      runningGroups.push({
        ...cloneGroup(group),
        activeTasks: runningTasks as TTask[],
        finishedTasks: [],
        finishedCollapsed: false,
      });
    }

    const completedTasks = allTasks.filter((task) =>
      isVisibleSidebarCompletedTask(task),
    );
    if (completedTasks.length > 0) {
      completedGroups.push({
        ...cloneGroup(group),
        activeTasks: [],
        finishedTasks: completedTasks,
        finishedCollapsed: false,
      });
    }
  }

  for (const entry of args.queuedEntries || []) {
    const backendId = String(entry.backendId || "").trim();
    if (!backendId) {
      continue;
    }
    const catalogGroup = args.groups.find(
      (group) => group.backendId === backendId,
    );
    let group = queuedGroupsByBackend.get(backendId);
    if (!group) {
      group = {
        backendId,
        backendDisplayName: catalogGroup?.backendDisplayName || backendId,
        disabled: false,
        collapsed: false,
        finishedCollapsed: false,
        activeTasks: [],
        finishedTasks: [],
        latestUpdatedAt: entry.createdAt,
      };
      queuedGroupsByBackend.set(backendId, group);
    }
    group.latestUpdatedAt =
      group.latestUpdatedAt > entry.createdAt
        ? group.latestUpdatedAt
        : entry.createdAt;
    group.activeTasks.push({
      key: `host-queue:${entry.queueId}`,
      queueId: entry.queueId,
      backendId,
      backendDisplayName: group.backendDisplayName,
      workflowLabel: entry.workflowLabel || entry.workflowId,
      status: "queued",
      stateLabel: "Queued",
      updatedAt: entry.createdAt,
      title: entry.taskName || entry.workflowLabel || entry.workflowId,
      selectable: false,
      terminal: false,
      submission: entry.submission,
      resumptionPending: false,
    } as TTask);
  }

  const sections: Array<SkillRunnerSidebarSection<TTask>> = [
    {
      id: "running",
      title: "Running",
      collapsible: true,
      collapsed: args.runningCollapsed === true,
      groups: runningGroups,
    },
  ];
  if (queuedGroupsByBackend.size > 0) {
    sections.push({
      id: "queued",
      title: "Queued",
      collapsible: true,
      collapsed: args.queuedCollapsed !== false,
      groups: [...queuedGroupsByBackend.values()],
    });
  }
  sections.push({
    id: "completed",
    title: "Completed",
    collapsible: true,
    collapsed: args.completedCollapsed !== false,
    groups: completedGroups,
  });
  return sections;
}

export function countWaitingSkillRunnerTasks<
  TTask extends SkillRunnerSidebarTaskItem,
>(groups: Array<SkillRunnerSidebarGroup<TTask>>) {
  let total = 0;
  for (const group of groups) {
    for (const task of group.activeTasks) {
      const normalized = normalizeIdentity(task.status);
      if (normalized === "waiting_user" || normalized === "waiting_auth") {
        total += 1;
      }
    }
  }
  return total;
}
