function normalizeIdentity(value) {
    return String(value || "")
        .trim()
        .toLowerCase();
}
function isFinitePositiveInt(value) {
    return typeof value === "number" && Number.isFinite(value) && value > 0;
}
function normalizeParentItemIds(values) {
    const seen = new Set();
    const ids = [];
    for (const value of values) {
        if (!isFinitePositiveInt(value)) {
            continue;
        }
        const normalized = Math.floor(value);
        if (seen.has(normalized)) {
            continue;
        }
        seen.add(normalized);
        ids.push(normalized);
    }
    return ids;
}
function resolveRelatedParentItemIds(context) {
    return normalizeParentItemIds(context?.relatedParentItemIds || []);
}
function isDeferredApplyVisibleRunning(task) {
    const state = normalizeIdentity(task.applyState);
    return state === "pending" || state === "running";
}
function isVisibleSidebarRunningTask(task) {
    return (task.selectable && (!task.terminal || isDeferredApplyVisibleRunning(task)));
}
function isVisibleSidebarCompletedTask(task) {
    return (task.selectable && task.terminal && !isDeferredApplyVisibleRunning(task));
}
function cloneGroup(group) {
    return {
        ...group,
        activeTasks: [...group.activeTasks],
        finishedTasks: [...group.finishedTasks],
    };
}
export function isSkillRunnerTaskRelatedToContext(args) {
    const relatedParentItemIds = resolveRelatedParentItemIds(args.context);
    if (relatedParentItemIds.length === 0) {
        return false;
    }
    const rawTargetParentId = args.targetParentID;
    if (!isFinitePositiveInt(rawTargetParentId)) {
        return false;
    }
    return relatedParentItemIds.includes(Math.floor(rawTargetParentId));
}
export function pickSkillRunnerSidebarFocusedTaskKey(args) {
    const currentTaskKey = String(args.currentTaskKey || "").trim();
    const relatedParentItemIds = resolveRelatedParentItemIds(args.context);
    if (relatedParentItemIds.length === 0) {
        return currentTaskKey;
    }
    const primaryParentItemId = isFinitePositiveInt(args.context?.primaryParentItemId)
        ? Math.floor(args.context?.primaryParentItemId)
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
            if (!isSkillRunnerTaskRelatedToContext({
                targetParentID: task.targetParentID,
                context: args.context,
            })) {
                continue;
            }
            if (task.key === currentTaskKey) {
                currentStillRelated = true;
            }
            if (!primaryRelatedTaskKey &&
                primaryParentItemId &&
                Math.floor(Number(task.targetParentID || 0)) === primaryParentItemId) {
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
export function buildSkillRunnerSidebarSections(args) {
    const selectedTaskKey = String(args.selectedTaskKey || "").trim();
    const runningGroups = [];
    const completedGroups = [];
    const queuedGroupsByBackend = new Map();
    for (const group of args.groups) {
        if (group.disabled) {
            continue;
        }
        const allTasks = [...group.activeTasks, ...group.finishedTasks];
        const runningTasks = allTasks
            .filter((task) => isVisibleSidebarRunningTask(task))
            .map((task) => ({
            ...task,
            attention: normalizeIdentity(task.status) === "waiting_user" ||
                normalizeIdentity(task.status) === "waiting_auth"
                ? "warning"
                : task.attention,
            attentionLabel: normalizeIdentity(task.status) === "waiting_user" ||
                normalizeIdentity(task.status) === "waiting_auth"
                ? "Needs user interaction"
                : task.attentionLabel,
            relationState: task.key === selectedTaskKey
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
                activeTasks: runningTasks,
                finishedTasks: [],
                finishedCollapsed: false,
            });
        }
        const completedTasks = allTasks.filter((task) => isVisibleSidebarCompletedTask(task));
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
        const catalogGroup = args.groups.find((group) => group.backendId === backendId);
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
        });
    }
    const sections = [
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
export function countWaitingSkillRunnerTasks(groups) {
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
