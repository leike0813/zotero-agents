(function () {
  "use strict";

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (typeof text !== "undefined") node.textContent = String(text || "");
    return node;
  }

  function clearNode(node) {
    if (!node) return;
    node.textContent = "";
  }

  function normalizeStatusToken(status) {
    return String(status || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
  }

  function isAssistantTranscriptNearBottom(element, threshold) {
    if (!element) return true;
    const gap = element.scrollHeight - element.scrollTop - element.clientHeight;
    return gap < (Number(threshold) || 80);
  }

  function isGenericToolText(value) {
    const text = String(value || "").trim();
    const normalized = text.toLowerCase().replace(/[\s_-]+/g, " ");
    return (
      !normalized ||
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
    const candidates = [tool && tool.toolName, tool && tool.toolKind, tool && tool.title];
    for (let index = 0; index < candidates.length; index += 1) {
      const value = String(candidates[index] || "").trim();
      if (!isGenericToolText(value)) return value;
    }
    return "Tool";
  }

  function transcriptLabels(options) {
    const labels = options && options.labels && typeof options.labels === "object" ? options.labels : {};
    return labels.transcript && typeof labels.transcript === "object" ? labels.transcript : labels;
  }

  function transcriptLabel(options, key, fallback) {
    const labels = transcriptLabels(options);
    return String((labels && labels[key]) || fallback || "");
  }

  function compactAssistantToolSummary(tool) {
    const candidates = [
      tool && tool.inputSummary,
      tool && tool.title,
      tool && tool.summary,
      tool && tool.resultSummary,
    ];
    for (let index = 0; index < candidates.length; index += 1) {
      const value = String(candidates[index] || "").replace(/\s+/g, " ").trim();
      if (!isGenericToolText(value)) return value;
    }
    return "";
  }

  function toolToneClass(status) {
    switch (normalizeStatusToken(status)) {
      case "completed":
      case "succeeded":
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

  function toolStateRank(state) {
    switch (normalizeStatusToken(state)) {
      case "failed":
        return 4;
      case "completed":
      case "succeeded":
        return 3;
      case "in_progress":
      case "running":
        return 2;
      case "pending":
      default:
        return 1;
    }
  }

  function toolEventTime(item) {
    const parsed = Date.parse(String(item && (item.updatedAt || item.createdAt) || ""));
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  function isPreferredToolEvent(candidate, current) {
    const candidateRank = toolStateRank(candidate && candidate.state);
    const currentRank = toolStateRank(current && current.state);
    if (candidateRank !== currentRank) return candidateRank > currentRank;
    return toolEventTime(candidate) >= toolEventTime(current);
  }

  function sanitizeToolGroupKey(key) {
    const text = String(key || "unknown");
    let hash = 0;
    for (let index = 0; index < text.length; index += 1) {
      hash = (hash * 31 + text.charCodeAt(index)) >>> 0;
    }
    const slug = text.replace(/[^A-Za-z0-9_-]+/g, "_").slice(0, 48) || "unknown";
    return slug + "-" + hash.toString(36);
  }

  function createCanonicalToolItem(key, group) {
    const items = group.items || [];
    const first = items[0] || {};
    const selected = items.reduce(function (current, candidate) {
      return isPreferredToolEvent(candidate, current) ? candidate : current;
    }, first);
    const latestSummary =
      items.slice().reverse().find(function (tool) {
        return String(tool.summary || "").trim();
      }) || {};
    const firstInputSummary =
      items.find(function (tool) {
        return !isGenericToolText(tool.inputSummary);
      }) || {};
    const latestResultSummary =
      items.slice().reverse().find(function (tool) {
        return !isGenericToolText(tool.resultSummary);
      }) || {};
    const latestToolName =
      items.slice().reverse().find(function (tool) {
        return !isGenericToolText(tool.toolName);
      }) || {};
    return {
      id: "assistant-tool-" + sanitizeToolGroupKey(key),
      kind: "tool",
      toolCallId: String(selected.toolCallId || first.toolCallId || key || ""),
      title: String(selected.title || first.title || "Tool"),
      toolKind: String(selected.toolKind || first.toolKind || "").trim() || undefined,
      toolName:
        String(latestToolName.toolName || selected.toolName || first.toolName || "").trim() ||
        undefined,
      inputSummary:
        String(firstInputSummary.inputSummary || selected.inputSummary || "").trim() ||
        undefined,
      resultSummary:
        String(latestResultSummary.resultSummary || selected.resultSummary || "").trim() ||
        undefined,
      state: selected.state || first.state || "pending",
      summary: String(selected.summary || latestSummary.summary || "").trim() || undefined,
      createdAt: first.createdAt,
      updatedAt: selected.updatedAt || selected.createdAt || first.updatedAt,
    };
  }

  function buildCanonicalTranscriptItems(items) {
    const entries = [];
    const toolGroups = new Map();
    (Array.isArray(items) ? items : []).forEach(function (item) {
      if (!item || item.kind === "plan") return;
      if (item.kind !== "tool_call" && item.kind !== "tool") {
        entries.push({ index: entries.length, item });
        return;
      }
      const key = String(item.toolCallId || item.id || "").trim();
      const groupKey = key || String(item.id || entries.length);
      let group = toolGroups.get(groupKey);
      if (!group) {
        group = { index: entries.length, items: [] };
        toolGroups.set(groupKey, group);
        entries.push({ index: group.index, toolGroupKey: groupKey });
      }
      group.items.push(item);
    });
    return entries
      .map(function (entry) {
        if (entry.toolGroupKey) {
          return createCanonicalToolItem(entry.toolGroupKey, toolGroups.get(entry.toolGroupKey) || {});
        }
        return entry.item;
      })
      .filter(Boolean);
  }

  function toolActivitySummaryState(items) {
    const tools = Array.isArray(items) ? items : [];
    const states = tools.map(function (tool) {
      return normalizeStatusToken(tool && tool.state);
    });
    const completedCount = states.filter(function (state) {
      return state === "completed" || state === "succeeded";
    }).length;
    const failedCount = states.filter(function (state) {
      return state === "failed" || state === "error";
    }).length;
    if (tools.length > 0 && completedCount === tools.length) return "completed";
    if (tools.length > 0 && failedCount === tools.length) return "failed";
    if (failedCount > 0) return "failed";
    if (states.indexOf("in_progress") >= 0 || states.indexOf("running") >= 0) {
      return "in_progress";
    }
    if (states.indexOf("pending") >= 0) return "pending";
    return "completed";
  }

  function createToolActivityGroup(run, expandedIds) {
    const first = run[0] || {};
    const last = run[run.length - 1] || first;
    const id =
      "assistant-tool-activity-" +
      sanitizeToolGroupKey([String(first.id || ""), String(last.id || ""), String(run.length)].join("-"));
    return {
      id,
      kind: "tool_activity_group",
      items: run,
      createdAt: first.createdAt,
      updatedAt: last.updatedAt || last.createdAt,
      state: last.state,
      expanded: expandedIds && typeof expandedIds.has === "function" && expandedIds.has(id),
    };
  }

  function buildTranscriptRenderItems(items, mode, expandedIds) {
    const canonicalItems = buildCanonicalTranscriptItems(items);
    if (mode !== "bubble") return canonicalItems;
    const entries = [];
    let toolRun = [];
    function flush() {
      if (toolRun.length === 1) entries.push(toolRun[0]);
      if (toolRun.length > 1) entries.push(createToolActivityGroup(toolRun, expandedIds));
      toolRun = [];
    }
    canonicalItems.forEach(function (item) {
      if (item.kind === "tool_call" || item.kind === "tool") {
        toolRun.push(item);
        return;
      }
      flush();
      entries.push(item);
    });
    flush();
    return entries;
  }

  function itemRole(item) {
    if (item.kind === "message") return String(item.role || "assistant");
    if (item.kind === "tool" || item.kind === "tool_call" || item.kind === "tool_activity_group") {
      return "tool";
    }
    if (item.kind === "permission") return "permission";
    if (item.kind === "process") return "process";
    return String(item.kind || "status");
  }

  function createTranscriptNode(item) {
    const row = el("article", "assistant-transcript-row");
    row.setAttribute("data-assistant-item-id", String(item.id || ""));
    const meta = el("div", "assistant-transcript-meta");
    const body = el("div", "assistant-transcript-body");
    body.setAttribute("data-assistant-transcript-body", "true");
    row.appendChild(meta);
    row.appendChild(body);
    return row;
  }

  function updateTranscriptClasses(row, item, options) {
    const kind = String(item.kind || "status");
    const role = itemRole(item);
    const variant = String((options && options.variant) || "acp-chat");
    row.className = "assistant-transcript-row";
    row.setAttribute("data-assistant-panel-kind", variant);
    row.setAttribute("data-assistant-item-kind", kind);
    row.setAttribute("data-assistant-role", role);
    row.classList.toggle("is-tool", role === "tool");
    row.classList.toggle("is-process", kind === "process");
    row.classList.toggle("is-permission", kind === "permission");
    row.classList.toggle("is-workspace-activity", kind === "status" && item.label === "workspace-activity");
    row.classList.toggle("is-status", kind !== "message" && kind !== "process" && role !== "tool");
    row.classList.toggle("level-warn", String(item.level || "").trim() === "warn");
    row.classList.toggle("level-error", String(item.level || "").trim() === "error");
    row.classList.toggle("is-streaming", String(item.state || "").trim() === "streaming");
    row.classList.toggle("is-error", String(item.state || "").trim() === "error");
    if (item.kind === "tool_activity_group") {
      row.classList.add("is-tool-activity-group");
      row.classList.toggle("is-expanded", item.expanded === true);
      row.classList.toggle("is-collapsed", item.expanded !== true);
    }
  }

  function appendToolDisplay(parent, tool) {
    parent.appendChild(el("span", "assistant-transcript-tool-badge", compactAssistantToolName(tool)));
    const summary = compactAssistantToolSummary(tool);
    if (summary) parent.appendChild(el("span", "assistant-transcript-tool-summary", summary));
  }

  function permissionToneClass(status) {
    switch (normalizeStatusToken(status)) {
      case "approved":
        return "is-completed";
      case "denied":
      case "cancelled":
      case "canceled":
        return "is-failed";
      case "pending":
      default:
        return "is-running";
    }
  }

  function permissionIcon(status) {
    switch (normalizeStatusToken(status)) {
      case "approved":
        return "✓";
      case "denied":
      case "cancelled":
      case "canceled":
        return "×";
      case "pending":
      default:
        return "!";
    }
  }

  function renderRevisionBadge(parent, revision, className, options) {
    if (!revision || Number(revision.count || 0) <= 0) return;
    const badge = el(
      "span",
      className || "assistant-transcript-revision-badge",
      transcriptLabel(options, "revised", "Revised") + " " + String(revision.count) + "x",
    );
    badge.title =
      transcriptLabel(options, "latestRevision", "Latest output revision") +
      ": " +
      String(revision.latestStatus || "") +
      ", repair round " +
      String(Number(revision.latestRepairRound || 0));
    parent.appendChild(badge);
  }

  function renderCanonicalItem(row, item, options) {
    const renderMarkdown = options.renderMarkdown || function (value) { return String(value || ""); };
    const formatTime =
      typeof options.formatTime === "function"
        ? options.formatTime
        : function (value) { return String(value || ""); };
    const meta = row.querySelector(".assistant-transcript-meta");
    const body = row.querySelector("[data-assistant-transcript-body]");
    updateTranscriptClasses(row, item, options);
    while (row.children.length > 2) row.removeChild(row.lastChild);
    clearNode(meta);
    clearNode(body);
    body.className = "assistant-transcript-body";
    row.onclick =
      item.kind === "tool_activity_group" && typeof options.onToggleExpanded === "function"
        ? function () { options.onToggleExpanded(item.id); }
        : null;
    if (item.kind === "message") {
      meta.appendChild(el("span", "assistant-transcript-role", String(item.role || "assistant")));
      renderRevisionBadge(meta, item.revision, undefined, options);
      meta.appendChild(el("span", "assistant-transcript-time", formatTime(item.createdAt)));
      body.classList.add("assistant-transcript-markdown-body");
      body.innerHTML = renderMarkdown(String(item.text || ""));
      return;
    }
    if (item.kind === "process") {
      meta.textContent = String(item.label || transcriptLabel(options, "thinking", "Thinking"));
      body.classList.add("assistant-transcript-markdown-body");
      body.innerHTML = renderMarkdown(String(item.text || ""));
      return;
    }
    if (item.kind === "permission") {
      meta.textContent = transcriptLabel(options, "permission", "Permission");
      const led = el("span", "assistant-transcript-tool-led " + permissionToneClass(item.status));
      led.setAttribute("aria-hidden", "true");
      const icon = el("span", "assistant-transcript-permission-icon", permissionIcon(item.status));
      icon.setAttribute("aria-hidden", "true");
      body.appendChild(led);
      body.appendChild(icon);
      body.appendChild(
        el(
          "span",
          "assistant-transcript-permission-summary",
          String(item.summary || item.title || "Permission request"),
        ),
      );
      return;
    }
    if (item.kind === "tool" || item.kind === "tool_call") {
      meta.textContent = transcriptLabel(options, "tool", "Tool");
      const led = el("span", "assistant-transcript-tool-led " + toolToneClass(item.state));
      led.setAttribute("aria-hidden", "true");
      body.appendChild(led);
      appendToolDisplay(body, item);
      return;
    }
    if (item.kind === "tool_activity_group") {
      const summaryState = toolActivitySummaryState(item.items);
      const summary = el("div", "assistant-transcript-tool-activity-summary");
      const led = el("span", "assistant-transcript-tool-led " + toolToneClass(summaryState));
      led.setAttribute("aria-hidden", "true");
      meta.appendChild(
        el(
          "span",
          "assistant-transcript-role",
          transcriptLabel(options, "toolActivity", "Tool activity") + " (" + String(item.items.length) + ")",
        ),
      );
      summary.appendChild(led);
      summary.appendChild(el("span", "assistant-transcript-tool-summary", toolGroupSummaryText(item.items, options)));
      body.appendChild(summary);
      if (item.expanded === true) {
        const list = el("div", "assistant-transcript-tool-activity-list");
        item.items.forEach(function (tool) {
          const entry = el("div", "assistant-transcript-tool-activity-item " + toolToneClass(tool.state));
          const toolLed = el("span", "assistant-transcript-tool-led " + toolToneClass(tool.state));
          toolLed.setAttribute("aria-hidden", "true");
          entry.appendChild(toolLed);
          appendToolDisplay(entry, tool);
          list.appendChild(entry);
        });
        row.appendChild(list);
      }
      return;
    }
    if (item.kind === "status" && item.label === "workspace-activity") {
      meta.textContent = transcriptLabel(options, "workspace", "Workspace");
      const relativePath =
        item.details && typeof item.details === "object" && item.details.relativePath
          ? item.details.relativePath
          : item.text;
      body.appendChild(el("span", "assistant-transcript-workspace-file-icon", "▣"));
      body.appendChild(
        el("span", "assistant-transcript-workspace-path", String(relativePath || "")),
      );
      return;
    }
    meta.textContent = String(item.label || transcriptLabel(options, "status", "Status"));
    body.textContent = String(item.text || "");
  }

  function toolGroupSummaryText(items, options) {
    const tools = Array.isArray(items) ? items : [];
    const failedCount = tools.filter(function (tool) {
      return normalizeStatusToken(tool.state) === "failed";
    }).length;
    const runningCount = tools.filter(function (tool) {
      const status = normalizeStatusToken(tool.state);
      return status === "in_progress" || status === "running";
    }).length;
    const pendingCount = tools.filter(function (tool) {
      return normalizeStatusToken(tool.state) === "pending";
    }).length;
    return [
      String(tools.length) + " " + transcriptLabel(options, "tools", "tools"),
      failedCount ? String(failedCount) + " " + transcriptLabel(options, "failed", "failed") : "",
      runningCount ? String(runningCount) + " " + transcriptLabel(options, "running", "running") : "",
      pendingCount ? String(pendingCount) + " " + transcriptLabel(options, "pending", "pending") : "",
    ].filter(Boolean).join(" • ");
  }

  function renderAssistantTranscriptItem(row, item, options) {
    renderCanonicalItem(row, item || {}, options || {});
  }

  function createRow(item, options) {
    return createTranscriptNode(item || {}, options || {});
  }

  function renderAssistantTranscript(options) {
    const opts = options || {};
    const container = opts.container;
    if (!container) return;
    const variant = opts.variant || "acp-chat";
    const mode = opts.mode === "bubble" ? "bubble" : "plain";
    const items = buildTranscriptRenderItems(opts.items || [], mode, opts.expandedIds);
    container.classList.add("assistant-transcript");
    container.classList.toggle("plain-mode", mode === "plain");
    container.classList.toggle("bubble-mode", mode === "bubble");
    container.setAttribute("data-assistant-panel-kind", variant);
    const shouldStick = isAssistantTranscriptNearBottom(container, opts.stickThreshold);
    if (items.length === 0) {
      clearNode(container);
      if (opts.nodeMap && typeof opts.nodeMap.clear === "function") opts.nodeMap.clear();
      container.appendChild(el("div", "assistant-transcript-empty", opts.emptyText || transcriptLabel(opts, "empty", "No messages yet.")));
      return;
    }
    const orderKey = items.map(function (item) {
      return String(item.kind || "") + ":" + String(item.id || "");
    }).join("|");
    const nodeMap = opts.nodeMap;
    const canDiff = nodeMap && typeof nodeMap.get === "function" && typeof nodeMap.set === "function";
    const needsFullRender = opts.orderKey !== orderKey || opts.modeKey !== mode || !canDiff;
    if (needsFullRender) {
      clearNode(container);
      if (canDiff) nodeMap.clear();
      items.forEach(function (item) {
        const row = createRow(item, { variant });
        if (canDiff) nodeMap.set(String(item.id || ""), row);
        renderAssistantTranscriptItem(row, item, opts);
        container.appendChild(row);
      });
    } else {
      items.forEach(function (item) {
        const id = String(item.id || "");
        let row = nodeMap.get(id);
        if (!row) {
          row = createRow(item, { variant });
          nodeMap.set(id, row);
          container.appendChild(row);
        }
        renderAssistantTranscriptItem(row, item, opts);
      });
    }
    if (shouldStick) container.scrollTop = container.scrollHeight;
    if (typeof opts.onRendered === "function") {
      opts.onRendered({ orderKey, modeKey: mode, items });
    }
  }

  window.AssistantTranscriptRenderer = {
    buildTranscriptRenderItems,
    compactAssistantToolName,
    compactAssistantToolSummary,
    isAssistantTranscriptNearBottom,
    renderAssistantTranscript,
    renderAssistantTranscriptItem,
  };
})();
