export type SkillRunnerSidebarContext = {
  primaryParentItemId?: number;
  relatedParentItemIds: number[];
  itemLabel?: string;
};

export type SkillRunnerSidebarRelationState = "focused" | "related" | "default";

export type SkillRunnerSidebarTaskItem = {
  key: string;
  backendId: string;
  backendDisplayName: string;
  requestId?: string;
  workflowLabel?: string;
  status: string;
  stateLabel: string;
  updatedAt: string;
  title: string;
  selectable: boolean;
  terminal: boolean;
  attention?: "warning" | "";
  attentionLabel?: string;
  inputUnitIdentity?: string;
  targetParentID?: number;
  relationState?: SkillRunnerSidebarRelationState;
};

export type SkillRunnerSidebarGroup<TTask extends SkillRunnerSidebarTaskItem = SkillRunnerSidebarTaskItem> = {
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

export type SkillRunnerSidebarSection<TTask extends SkillRunnerSidebarTaskItem = SkillRunnerSidebarTaskItem> = {
  id: "running" | "completed";
  title: string;
  collapsed: boolean;
  groups: Array<SkillRunnerSidebarGroup<TTask>>;
};

function normalizeIdentity(value: unknown) {
  return String(value || "").trim().toLowerCase();
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

function hasSelectableRequestId(task: SkillRunnerSidebarTaskItem) {
  return task.selectable && String(task.requestId || "").trim().length > 0;
}

function isVisibleSidebarRunningTask(task: SkillRunnerSidebarTaskItem) {
  return hasSelectableRequestId(task) && !task.terminal;
}

function isVisibleSidebarCompletedTask(task: SkillRunnerSidebarTaskItem) {
  return (
    hasSelectableRequestId(task) &&
    task.terminal &&
    normalizeIdentity(task.status) === "succeeded"
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
  const primaryParentItemId = isFinitePositiveInt(args.context?.primaryParentItemId)
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
  completedCollapsed?: boolean;
}) {
  const selectedTaskKey = String(args.selectedTaskKey || "").trim();
  const runningGroups: Array<SkillRunnerSidebarGroup<TTask>> = [];
  const completedGroups: Array<SkillRunnerSidebarGroup<TTask>> = [];

  for (const group of args.groups) {
    if (group.disabled) {
      continue;
    }
    const runningTasks = group.activeTasks
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

    const completedTasks = group.finishedTasks.filter((task) =>
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

  return [
    {
      id: "running",
      title: "Running",
      collapsed: false,
      groups: runningGroups,
    },
    {
      id: "completed",
      title: "Completed",
      collapsed: args.completedCollapsed !== false,
      groups: completedGroups,
    },
  ] satisfies Array<SkillRunnerSidebarSection<TTask>>;
}

export function countWaitingSkillRunnerTasks<
  TTask extends SkillRunnerSidebarTaskItem,
>(groups: Array<SkillRunnerSidebarGroup<TTask>>) {
  let total = 0;
  for (const group of groups) {
    for (const task of group.activeTasks) {
      const normalized = normalizeIdentity(task.status);
      if (
        normalized === "waiting_user" ||
        normalized === "waiting_auth"
      ) {
        total += 1;
      }
    }
  }
  return total;
}
