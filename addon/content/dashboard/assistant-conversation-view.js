(function () {
  "use strict";

  function safeText(value) {
    return String(value || "").trim();
  }

  function normalizeStatusToken(status) {
    return safeText(status).toLowerCase().replace(/[\s-]+/g, "_");
  }

  function isTerminalPlanStatus(status) {
    return (
      [
        "complete",
        "completed",
        "done",
        "succeeded",
        "success",
        "skipped",
        "cancelled",
        "canceled",
        "failed",
        "error",
      ].indexOf(normalizeStatusToken(status)) >= 0
    );
  }

  function planStatusToneClass(status) {
    switch (normalizeStatusToken(status)) {
      case "complete":
      case "completed":
      case "done":
      case "succeeded":
      case "success":
        return "is-completed";
      case "in_progress":
      case "running":
        return "is-running";
      case "failed":
      case "error":
        return "is-failed";
      case "cancelled":
      case "canceled":
        return "is-cancelled";
      case "skipped":
        return "is-skipped";
      case "pending":
      case "todo":
      default:
        return "is-pending";
    }
  }

  function planStatusIcon(status) {
    switch (planStatusToneClass(status)) {
      case "is-completed":
        return "✓";
      case "is-failed":
        return "×";
      case "is-cancelled":
        return "−";
      case "is-skipped":
        return "↷";
      default:
        return "";
    }
  }

  function normalizeAssistantPlanEntry(entry) {
    const source = entry && typeof entry === "object" ? entry : {};
    const status = safeText(source.status) || "pending";
    return {
      id: safeText(source.id) || safeText(source.stepId) || safeText(source.content),
      content: safeText(source.content || source.text || source.title),
      status,
      toneClass: planStatusToneClass(status),
      icon: planStatusIcon(status),
      terminal: isTerminalPlanStatus(status),
    };
  }

  function isGenericToolText(value) {
    const text = safeText(value);
    const normalized = text.toLowerCase().replace(/[\s_-]+/g, " ");
    return (
      !text ||
      normalized === "tool" ||
      normalized === "tool call" ||
      normalized === "other" ||
      text === "[]" ||
      text === "{}" ||
      /^call[_-]?[a-z0-9_-]+$/i.test(text) ||
      /^toolu_[a-z0-9_-]+$/i.test(text)
    );
  }

  function compactAssistantToolName(tool) {
    const source = tool && typeof tool === "object" ? tool : {};
    const candidates = [source.toolName, source.toolKind, source.title, source.name];
    for (let index = 0; index < candidates.length; index += 1) {
      const value = safeText(candidates[index]);
      if (!isGenericToolText(value)) {
        return value;
      }
    }
    return "Tool";
  }

  function compactAssistantToolSummary(tool) {
    const source = tool && typeof tool === "object" ? tool : {};
    const candidates = [
      source.inputSummary,
      source.title,
      source.summary,
      source.resultSummary,
    ];
    for (let index = 0; index < candidates.length; index += 1) {
      const value = safeText(candidates[index]).replace(/\s+/g, " ").trim();
      if (!isGenericToolText(value)) {
        return value;
      }
    }
    return "";
  }

  function normalizeToolTone(status) {
    switch (normalizeStatusToken(status)) {
      case "complete":
      case "completed":
      case "done":
      case "succeeded":
      case "success":
        return "is-completed";
      case "failed":
      case "error":
        return "is-failed";
      case "in_progress":
      case "running":
        return "is-running";
      case "pending":
      default:
        return "is-pending";
    }
  }

  function normalizeAssistantToolItem(tool) {
    const source = tool && typeof tool === "object" ? tool : {};
    const state = safeText(source.state || source.status) || "pending";
    return {
      ...source,
      kind: "tool",
      state,
      toneClass: normalizeToolTone(state),
      toolName: compactAssistantToolName(source),
      summary: compactAssistantToolSummary(source),
    };
  }

  function normalizeAssistantItem(item) {
    const source = item && typeof item === "object" ? item : {};
    const kind = safeText(source.kind);
    if (kind === "thought" || kind === "process") {
      return {
        ...source,
        kind: "process",
        label: safeText(source.label) || "Thinking",
        text: safeText(source.text || source.content),
      };
    }
    if (kind === "tool_call" || kind === "tool") {
      return normalizeAssistantToolItem(source);
    }
    if (kind === "status") {
      return {
        ...source,
        kind: "status",
        label: safeText(source.label) || "Status",
        text: safeText(source.text || source.message),
      };
    }
    if (kind === "permission") {
      return {
        ...source,
        kind: "permission",
        permissionRequestId: safeText(source.permissionRequestId || source.id),
        status: safeText(source.status) || "pending",
        title: safeText(source.title) || "Permission request",
        summary: safeText(source.summary || source.text || source.message),
        source: safeText(source.source) || undefined,
      };
    }
    if (kind === "message") {
      return {
        ...source,
        kind: "message",
        role: safeText(source.role) || "assistant",
        text: String(source.text || ""),
      };
    }
    return {
      ...source,
      kind: kind || "status",
      text: safeText(source.text || source.message),
    };
  }

  function normalizePlan(entries) {
    const normalized = (Array.isArray(entries) ? entries : [])
      .map(normalizeAssistantPlanEntry)
      .filter(function (entry) {
        return entry.content;
      });
    const activeEntries = normalized.filter(function (entry) {
      return !entry.terminal;
    });
    return {
      entries: normalized,
      activeEntries,
      active: normalized.length > 0 && activeEntries.length > 0,
      completedCount: normalized.length - activeEntries.length,
      totalCount: normalized.length,
    };
  }

  function resolveAssistantInteraction(source) {
    const state = source && typeof source === "object" ? source : {};
    if (state.pendingPermission) {
      return { kind: "permission", permission: state.pendingPermission };
    }
    if (state.disconnected || state.errorText) {
      return {
        kind: "disconnected",
        message: safeText(state.errorText) || "ACP connection interrupted.",
      };
    }
    if (state.waitingUser) {
      return {
        kind: "waiting_user",
        pendingInteraction: state.pendingInteraction || null,
      };
    }
    if (state.running) {
      return {
        kind: "running",
        message: safeText(state.runningLabel) || "Agent is working...",
      };
    }
    if (state.completed) {
      return {
        kind: "completed",
        message: safeText(state.completedMessage),
      };
    }
    if (state.notice) {
      return {
        kind: "notice",
        message: safeText(state.notice),
      };
    }
    return { kind: "hidden" };
  }

  function findActiveChatPlan(items) {
    const plans = (Array.isArray(items) ? items : []).filter(function (item) {
      return item && item.kind === "plan" && Array.isArray(item.entries);
    });
    for (let index = plans.length - 1; index >= 0; index -= 1) {
      const plan = plans[index];
      const normalized = normalizePlan(plan.entries);
      if (normalized.active) {
        return normalized;
      }
    }
    return normalizePlan([]);
  }

  function projectAcpChatConversationView(snapshot) {
    const source = snapshot && typeof snapshot === "object" ? snapshot : {};
    const items = (Array.isArray(source.items) ? source.items : [])
      .filter(function (item) {
        return item && item.kind !== "plan";
      })
      .map(normalizeAssistantItem);
    const status = safeText(source.status);
    const running = source.busy === true || status === "prompting";
    const errorText =
      status === "error"
        ? safeText(source.lastError || source.prerequisiteError)
        : "";
    return {
      items,
      plan: findActiveChatPlan(source.items),
      interaction: resolveAssistantInteraction({
        pendingPermission: source.pendingPermissionRequest,
        errorText,
        running,
        runningLabel: source.labels && (source.labels.running || source.labels.working),
        notice: safeText(source.lastStopReason),
      }),
      usage: source.usage || null,
    };
  }

  function projectAcpSkillRunConversationView(run) {
    const source = run && typeof run === "object" ? run : {};
    const status = safeText(source.status);
    const recovery = safeText(source.conversationRecoveryState);
    const succeeded = status === "succeeded";
    const failed = status === "failed";
    const canceled = ["canceled", "cancelled"].indexOf(status) >= 0;
    const activeContinuation =
      source.activePrompt === true ||
      ["submitted", "accepted", "sending"].indexOf(safeText(source.replyState)) >= 0;
    const errorText = failed
      ? safeText(
          source.error ||
            source.replyError ||
            source.lastRecoveryError ||
            source.conversationError,
        ) || status
      : "";
    const disconnected =
      !activeContinuation &&
      (failed ||
      recovery === "failed" ||
      recovery === "unsupported" ||
      (recovery === "unavailable" &&
        safeText(source.conversationState) === "error"));
    return {
      items: (Array.isArray(source.transcriptItems) ? source.transcriptItems : [])
        .map(normalizeAssistantItem),
      plan: normalizePlan(source.planEntries),
      interaction: resolveAssistantInteraction({
        pendingPermission: source.pendingPermission,
        disconnected,
        errorText: disconnected
          ? errorText || source.lastRecoveryError || source.error
          : "",
        waitingUser: status === "waiting_user",
        pendingInteraction: source.pendingInteraction || null,
        running:
          ["queued", "running", "repairing"].indexOf(status) >= 0 ||
          activeContinuation,
        runningLabel:
          status === "repairing"
            ? "Agent is repairing output..."
            : "Agent is working...",
        completed: succeeded && !activeContinuation,
        completedMessage:
          status === "succeeded"
            ? "Run completed. Workflow result is ready."
            : safeText(source.error),
        notice:
          canceled && !activeContinuation
            ? "Run canceled. You can send a new instruction to continue this conversation."
            : "",
      }),
      usage: source.usage || null,
    };
  }

  window.AssistantConversationView = {
    normalizeStatusToken,
    isTerminalPlanStatus,
    planStatusToneClass,
    planStatusIcon,
    normalizeAssistantPlanEntry,
    normalizeAssistantToolItem,
    compactAssistantToolName,
    compactAssistantToolSummary,
    resolveAssistantInteraction,
    projectAcpChatConversationView,
    projectAcpSkillRunConversationView,
  };
})();
