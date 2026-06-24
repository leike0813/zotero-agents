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

  function setCodeCopyButtonState(button, state, labels) {
    if (!button) return;
    const copyLabels =
      labels && typeof labels === "object"
        ? labels
        : button.__assistantTranscriptLabels || {};
    const normalized =
      state === "copied" ? "copied" : state === "failed" ? "failed" : "idle";
    if (button.__assistantCodeCopyResetTimer) {
      clearTimeout(button.__assistantCodeCopyResetTimer);
      button.__assistantCodeCopyResetTimer = null;
    }
    button.setAttribute("data-assistant-copy-state", normalized);
    if (normalized === "copied") {
      button.textContent = transcriptText(copyLabels, "copied");
      button.title = transcriptText(copyLabels, "copied");
    } else if (normalized === "failed") {
      button.textContent = transcriptText(copyLabels, "copyFailed");
      button.title = transcriptText(copyLabels, "copyFailed");
    } else {
      button.textContent = transcriptText(copyLabels, "copy");
      button.title = transcriptText(copyLabels, "copyCode");
    }
    if (normalized !== "idle") {
      button.__assistantCodeCopyResetTimer = setTimeout(function () {
        setCodeCopyButtonState(button, "idle", copyLabels);
      }, 1400);
    }
  }

  function copyTextToClipboard(text) {
    const value = String(text || "");
    if (
      typeof navigator !== "undefined" &&
      navigator.clipboard &&
      typeof navigator.clipboard.writeText === "function"
    ) {
      return navigator.clipboard.writeText(value);
    }
    return new Promise(function (resolve, reject) {
      if (
        typeof document === "undefined" ||
        !document.body ||
        typeof document.execCommand !== "function"
      ) {
        reject(new Error("Clipboard API unavailable"));
        return;
      }
      const textarea = document.createElement("textarea");
      textarea.value = value;
      textarea.setAttribute("readonly", "true");
      textarea.style.position = "fixed";
      textarea.style.left = "-9999px";
      textarea.style.top = "0";
      document.body.appendChild(textarea);
      textarea.select();
      try {
        const copied = document.execCommand("copy");
        document.body.removeChild(textarea);
        if (copied) resolve();
        else reject(new Error("Copy command rejected"));
      } catch (error) {
        document.body.removeChild(textarea);
        reject(error);
      }
    });
  }

  function decorateMarkdownCodeBlocks(body, options) {
    if (!body || typeof body.querySelectorAll !== "function") return;
    const labels = transcriptLabels(options);
    const codeBlocks = Array.prototype.slice.call(
      body.querySelectorAll("pre > code"),
    );
    codeBlocks.forEach(function (code) {
      const pre = code && (code.parentElement || code.parentNode);
      if (!pre || typeof pre.getAttribute !== "function") return;
      if (pre.getAttribute("data-assistant-code-copy") === "true") return;
      pre.setAttribute("data-assistant-code-copy", "true");
      if (pre.classList && typeof pre.classList.add === "function") {
        pre.classList.add("assistant-code-block-with-copy");
      }
      const button = el(
        "button",
        "assistant-code-copy-button",
        transcriptText(labels, "copy"),
      );
      button.type = "button";
      button.__assistantTranscriptLabels = labels;
      button.setAttribute(
        "aria-label",
        transcriptText(labels, "copyCodeBlock"),
      );
      button.setAttribute("data-assistant-copy-state", "idle");
      button.title = transcriptText(labels, "copyCode");
      button.addEventListener("click", function (event) {
        event.preventDefault();
        event.stopPropagation();
        copyTextToClipboard(code.textContent || "").then(
          function () {
            setCodeCopyButtonState(button, "copied", labels);
          },
          function () {
            setCodeCopyButtonState(button, "failed", labels);
          },
        );
      });
      pre.appendChild(button);
    });
  }

  function normalizeStatusToken(status) {
    return String(status || "")
      .trim()
      .toLowerCase()
      .replace(/[\s-]+/g, "_");
  }

  function isAssistantTranscriptNearBottom(element, threshold) {
    if (!element) return true;
    const gap = element.scrollHeight - element.scrollTop - element.clientHeight;
    return gap < (Number(threshold) || 80);
  }

  function installAssistantTranscriptStickiness(container, threshold) {
    if (
      !container ||
      container.getAttribute("data-assistant-transcript-stick-installed") ===
        "true"
    ) {
      return;
    }
    container.setAttribute("data-assistant-transcript-stick-installed", "true");
    container.setAttribute(
      "data-assistant-transcript-stick",
      isAssistantTranscriptNearBottom(container, threshold) ? "true" : "false",
    );
    container.addEventListener("scroll", function () {
      if (
        container.getAttribute(
          "data-assistant-transcript-programmatic-scroll",
        ) === "true"
      ) {
        return;
      }
      container.setAttribute(
        "data-assistant-transcript-stick",
        isAssistantTranscriptNearBottom(container, threshold)
          ? "true"
          : "false",
      );
    });
  }

  function shouldStickAssistantTranscript(container, threshold) {
    if (!container) return true;
    if (isAssistantTranscriptNearBottom(container, threshold)) {
      container.setAttribute("data-assistant-transcript-stick", "true");
      return true;
    }
    return container.getAttribute("data-assistant-transcript-stick") === "true";
  }

  function stickAssistantTranscriptToBottom(container) {
    if (!container) return;
    const finish = function () {
      container.scrollTop = container.scrollHeight;
    };
    container.setAttribute(
      "data-assistant-transcript-programmatic-scroll",
      "true",
    );
    container.scrollTop = container.scrollHeight;
    const raf =
      typeof window !== "undefined" &&
      typeof window.requestAnimationFrame === "function"
        ? window.requestAnimationFrame.bind(window)
        : function (callback) {
            return setTimeout(callback, 0);
          };
    raf(function () {
      finish();
      raf(function () {
        container.removeAttribute(
          "data-assistant-transcript-programmatic-scroll",
        );
        container.setAttribute("data-assistant-transcript-stick", "true");
      });
    });
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
    const candidates = [
      tool && tool.toolName,
      tool && tool.toolKind,
      tool && tool.title,
    ];
    for (let index = 0; index < candidates.length; index += 1) {
      const value = String(candidates[index] || "").trim();
      if (!isGenericToolText(value)) return value;
    }
    return "Tool";
  }

  function transcriptLabels(options) {
    const labels =
      options && options.labels && typeof options.labels === "object"
        ? options.labels
        : {};
    return labels.transcript && typeof labels.transcript === "object"
      ? labels.transcript
      : labels;
  }

  function transcriptLabel(options, key, fallback) {
    const labels = transcriptLabels(options);
    return String((labels && labels[key]) || fallback || "");
  }

  function transcriptText(labels, key) {
    return String((labels && labels[key]) || key);
  }

  function compactAssistantToolSummary(tool) {
    const candidates = [
      tool && tool.inputSummary,
      tool && tool.title,
      tool && tool.summary,
      tool && tool.resultSummary,
    ];
    for (let index = 0; index < candidates.length; index += 1) {
      const value = String(candidates[index] || "")
        .replace(/\s+/g, " ")
        .trim();
      if (!isGenericToolText(value)) return value;
    }
    return "";
  }

  function assistantTooltipText(value) {
    return String(value || "")
      .replace(/\r\n?/g, "\n")
      .split("\n")
      .map(function (line) {
        return line.replace(/[ \t]+/g, " ").trim();
      })
      .filter(Boolean)
      .join("\n")
      .trim();
  }

  function assistantToolCommandTooltip(tool) {
    const name = compactAssistantToolName(tool);
    const candidates = [
      tool && tool.inputSummary,
      tool && tool.summary,
      tool && tool.resultSummary,
      tool && tool.title,
      tool && tool.toolName,
      tool && tool.toolKind,
    ];
    for (let index = 0; index < candidates.length; index += 1) {
      const value = assistantTooltipText(candidates[index]);
      if (!isGenericToolText(value)) {
        return value === name ? value : name + ": " + value;
      }
    }
    return name;
  }

  function setAssistantTooltip(node, text) {
    const value = assistantTooltipText(text);
    if (!node || !value) return;
    node.title = value;
    node.setAttribute("aria-label", value);
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
    const parsed = Date.parse(
      String((item && (item.updatedAt || item.createdAt)) || ""),
    );
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
    const slug =
      text.replace(/[^A-Za-z0-9_-]+/g, "_").slice(0, 48) || "unknown";
    return slug + "-" + hash.toString(36);
  }

  function createCanonicalToolItem(key, group) {
    const items = group.items || [];
    const first = items[0] || {};
    const selected = items.reduce(function (current, candidate) {
      return isPreferredToolEvent(candidate, current) ? candidate : current;
    }, first);
    const latestSummary =
      items
        .slice()
        .reverse()
        .find(function (tool) {
          return String(tool.summary || "").trim();
        }) || {};
    const firstInputSummary =
      items.find(function (tool) {
        return !isGenericToolText(tool.inputSummary);
      }) || {};
    const latestResultSummary =
      items
        .slice()
        .reverse()
        .find(function (tool) {
          return !isGenericToolText(tool.resultSummary);
        }) || {};
    const latestToolName =
      items
        .slice()
        .reverse()
        .find(function (tool) {
          return !isGenericToolText(tool.toolName);
        }) || {};
    return {
      id: "assistant-tool-" + sanitizeToolGroupKey(key),
      kind: "tool",
      toolCallId: String(selected.toolCallId || first.toolCallId || key || ""),
      title: String(selected.title || first.title || "Tool"),
      toolKind:
        String(selected.toolKind || first.toolKind || "").trim() || undefined,
      toolName:
        String(
          latestToolName.toolName || selected.toolName || first.toolName || "",
        ).trim() || undefined,
      inputSummary:
        String(
          firstInputSummary.inputSummary || selected.inputSummary || "",
        ).trim() || undefined,
      resultSummary:
        String(
          latestResultSummary.resultSummary || selected.resultSummary || "",
        ).trim() || undefined,
      state: selected.state || first.state || "pending",
      summary:
        String(selected.summary || latestSummary.summary || "").trim() ||
        undefined,
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
          return createCanonicalToolItem(
            entry.toolGroupKey,
            toolGroups.get(entry.toolGroupKey) || {},
          );
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

  function stableToolActivityGroupKey(run, fallbackIndex) {
    const first = run[0] || {};
    const key =
      String(first.toolCallId || "").trim() ||
      String(first.id || "").trim() ||
      String(first.createdAt || "").trim() ||
      "run-" + String(fallbackIndex || 0);
    return sanitizeToolGroupKey(key);
  }

  function createToolActivityGroup(run, expandedIds, fallbackIndex) {
    const first = run[0] || {};
    const last = run[run.length - 1] || first;
    const id =
      "assistant-tool-activity-" +
      stableToolActivityGroupKey(run, fallbackIndex);
    return {
      id,
      kind: "tool_activity_group",
      items: run,
      createdAt: first.createdAt,
      updatedAt: last.updatedAt || last.createdAt,
      state: last.state,
      expanded:
        expandedIds &&
        typeof expandedIds.has === "function" &&
        expandedIds.has(id),
    };
  }

  function buildTranscriptRenderItems(items, mode, expandedIds) {
    const canonicalItems = buildCanonicalTranscriptItems(items);
    if (mode !== "bubble") return canonicalItems;
    const entries = [];
    let toolRun = [];
    function flush() {
      if (toolRun.length === 1) entries.push(toolRun[0]);
      if (toolRun.length > 1)
        entries.push(
          createToolActivityGroup(toolRun, expandedIds, entries.length),
        );
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
    if (
      item.kind === "tool" ||
      item.kind === "tool_call" ||
      item.kind === "tool_activity_group"
    ) {
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
    row.classList.toggle(
      "is-workspace-activity",
      kind === "status" && item.label === "workspace-activity",
    );
    row.classList.toggle(
      "is-status",
      kind !== "message" && kind !== "process" && role !== "tool",
    );
    row.classList.toggle(
      "level-warn",
      String(item.level || "").trim() === "warn",
    );
    row.classList.toggle(
      "level-error",
      String(item.level || "").trim() === "error",
    );
    row.classList.toggle(
      "is-streaming",
      String(item.state || "").trim() === "streaming",
    );
    row.classList.toggle(
      "is-error",
      String(item.state || "").trim() === "error",
    );
    if (item.kind === "tool_activity_group") {
      row.classList.add("is-tool-activity-group");
      row.classList.toggle("is-expanded", item.expanded === true);
      row.classList.toggle("is-collapsed", item.expanded !== true);
    }
  }

  function appendToolDisplay(parent, tool) {
    const tooltip = assistantToolCommandTooltip(tool);
    const badge = el(
      "span",
      "assistant-transcript-tool-badge",
      compactAssistantToolName(tool),
    );
    setAssistantTooltip(badge, tooltip);
    parent.appendChild(badge);
    const summary = compactAssistantToolSummary(tool);
    if (summary) {
      const summaryNode = el(
        "span",
        "assistant-transcript-tool-summary",
        summary,
      );
      setAssistantTooltip(summaryNode, tooltip);
      parent.appendChild(summaryNode);
    }
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
      transcriptLabel(options, "revised") + " " + String(revision.count) + "x",
    );
    badge.title =
      transcriptLabel(options, "latestRevision") +
      ": " +
      String(revision.latestStatus || "") +
      ", repair round " +
      String(Number(revision.latestRepairRound || 0));
    parent.appendChild(badge);
  }

  function renderCanonicalItem(row, item, options) {
    const renderMarkdown =
      options.renderMarkdown ||
      function (value) {
        return String(value || "");
      };
    const formatTime =
      typeof options.formatTime === "function"
        ? options.formatTime
        : function (value) {
            return String(value || "");
          };
    const meta = row.querySelector(".assistant-transcript-meta");
    const body = row.querySelector("[data-assistant-transcript-body]");
    updateTranscriptClasses(row, item, options);
    while (row.children.length > 2) row.removeChild(row.lastChild);
    clearNode(meta);
    clearNode(body);
    body.className = "assistant-transcript-body";
    row.onclick = null;
    row.onkeydown = null;
    if (item.kind === "message") {
      meta.appendChild(
        el(
          "span",
          "assistant-transcript-role",
          String(item.role || "assistant"),
        ),
      );
      renderRevisionBadge(meta, item.revision, undefined, options);
      meta.appendChild(
        el("span", "assistant-transcript-time", formatTime(item.createdAt)),
      );
      if (String(item.state || "").trim() === "streaming") {
        body.textContent = String(item.text || "");
        return;
      }
      body.classList.add("assistant-transcript-markdown-body");
      body.innerHTML = renderMarkdown(String(item.text || ""));
      decorateMarkdownCodeBlocks(body, options);
      return;
    }
    if (item.kind === "process") {
      meta.textContent = String(
        item.label || transcriptLabel(options, "thinking"),
      );
      if (String(item.state || "").trim() === "streaming") {
        body.textContent = String(item.text || "");
        return;
      }
      body.classList.add("assistant-transcript-markdown-body");
      body.innerHTML = renderMarkdown(String(item.text || ""));
      decorateMarkdownCodeBlocks(body, options);
      return;
    }
    if (item.kind === "permission") {
      meta.textContent = transcriptLabel(options, "permission");
      const led = el(
        "span",
        "assistant-transcript-tool-led " + permissionToneClass(item.status),
      );
      led.setAttribute("aria-hidden", "true");
      const icon = el(
        "span",
        "assistant-transcript-permission-icon",
        permissionIcon(item.status),
      );
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
      meta.textContent = transcriptLabel(options, "tool");
      const led = el(
        "span",
        "assistant-transcript-tool-led " + toolToneClass(item.state),
      );
      led.setAttribute("aria-hidden", "true");
      body.appendChild(led);
      appendToolDisplay(body, item);
      return;
    }
    if (item.kind === "tool_activity_group") {
      const summaryState = toolActivitySummaryState(item.items);
      const summary = el(
        "button",
        "assistant-transcript-tool-activity-summary",
      );
      summary.type = "button";
      summary.setAttribute(
        "aria-expanded",
        item.expanded === true ? "true" : "false",
      );
      summary.setAttribute(
        "aria-label",
        (item.expanded === true
          ? transcriptLabel(options, "collapse")
          : transcriptLabel(options, "expand")) +
          " " +
          transcriptLabel(options, "toolActivity"),
      );
      const led = el(
        "span",
        "assistant-transcript-tool-led " + toolToneClass(summaryState),
      );
      led.setAttribute("aria-hidden", "true");
      const chevron = el(
        "span",
        "assistant-transcript-tool-activity-chevron",
        item.expanded === true ? "−" : "+",
      );
      chevron.setAttribute("aria-hidden", "true");
      meta.appendChild(
        el(
          "span",
          "assistant-transcript-role",
          transcriptLabel(options, "toolActivity") +
            " (" +
            String(item.items.length) +
            ")",
        ),
      );
      summary.appendChild(chevron);
      summary.appendChild(led);
      const activityTooltip = toolActivityTooltipText(item.items);
      setAssistantTooltip(summary, activityTooltip);
      const summaryText = el(
        "span",
        "assistant-transcript-tool-summary",
        toolGroupSummaryText(item.items, options),
      );
      setAssistantTooltip(summaryText, activityTooltip);
      summary.appendChild(summaryText);
      if (typeof options.onToggleExpanded === "function") {
        summary.addEventListener("click", function (event) {
          event.stopPropagation();
          options.onToggleExpanded(item.id);
        });
      }
      body.appendChild(summary);
      if (item.expanded === true) {
        const list = el("div", "assistant-transcript-tool-activity-list");
        item.items.forEach(function (tool) {
          const entry = el(
            "div",
            "assistant-transcript-tool-activity-item " +
              toolToneClass(tool.state),
          );
          setAssistantTooltip(entry, assistantToolCommandTooltip(tool));
          const toolLed = el(
            "span",
            "assistant-transcript-tool-led " + toolToneClass(tool.state),
          );
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
      meta.textContent = transcriptLabel(options, "workspace");
      const relativePath =
        item.details &&
        typeof item.details === "object" &&
        item.details.relativePath
          ? item.details.relativePath
          : item.text;
      const fileIcon = el("span", "assistant-transcript-workspace-file-icon");
      fileIcon.setAttribute("aria-hidden", "true");
      body.appendChild(fileIcon);
      body.appendChild(
        el(
          "span",
          "assistant-transcript-tool-badge assistant-transcript-workspace-badge",
          transcriptLabel(options, "workspaceActivity"),
        ),
      );
      body.appendChild(
        el(
          "span",
          "assistant-transcript-workspace-path",
          String(relativePath || ""),
        ),
      );
      return;
    }
    meta.textContent = String(item.label || transcriptLabel(options, "status"));
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
      String(tools.length) + " " + transcriptLabel(options, "tools"),
      failedCount
        ? String(failedCount) + " " + transcriptLabel(options, "failed")
        : "",
      runningCount
        ? String(runningCount) + " " + transcriptLabel(options, "running")
        : "",
      pendingCount
        ? String(pendingCount) + " " + transcriptLabel(options, "pending")
        : "",
    ]
      .filter(Boolean)
      .join(" • ");
  }

  function toolActivityTooltipText(items) {
    return (Array.isArray(items) ? items : [])
      .map(assistantToolCommandTooltip)
      .filter(Boolean)
      .join("\n");
  }

  function renderAssistantTranscriptItem(row, item, options) {
    renderCanonicalItem(row, item || {}, options || {});
  }

  function createRow(item, options) {
    return createTranscriptNode(item || {}, options || {});
  }

  function transcriptItemSignature(item, options) {
    const source = item || {};
    const expanded =
      source.kind === "tool_activity_group" && source.expanded === true
        ? "expanded"
        : "collapsed";
    return [
      options && options.variant,
      options && options.mode,
      source.id,
      source.kind,
      source.role,
      source.state,
      source.status,
      source.label,
      source.text,
      source.summary,
      source.title,
      source.createdAt,
      source.updatedAt,
      source.toolName,
      source.toolKind,
      source.inputSummary,
      source.resultSummary,
      expanded,
      source.revision && source.revision.count,
      source.revision && source.revision.latestStatus,
      Array.isArray(source.items)
        ? source.items
            .map(function (entry) {
              return [
                entry && entry.id,
                entry && entry.state,
                entry && entry.toolName,
                entry && entry.summary,
                entry && entry.resultSummary,
              ].join(":");
            })
            .join("|")
        : "",
    ].join("\u001f");
  }

  function renderAssistantTranscriptItemIfChanged(row, item, options) {
    const signature = transcriptItemSignature(item || {}, options || {});
    if (row.getAttribute("data-assistant-render-signature") === signature) {
      return false;
    }
    renderAssistantTranscriptItem(row, item, options);
    row.setAttribute("data-assistant-render-signature", signature);
    return true;
  }

  function renderAssistantTranscript(options) {
    const opts = options || {};
    const container = opts.container;
    if (!container) return;
    const variant = opts.variant || "acp-chat";
    const mode = opts.mode === "bubble" ? "bubble" : "plain";
    const items = buildTranscriptRenderItems(
      opts.items || [],
      mode,
      opts.expandedIds,
    );
    container.classList.add("assistant-transcript");
    container.classList.toggle("plain-mode", mode === "plain");
    container.classList.toggle("bubble-mode", mode === "bubble");
    container.setAttribute("data-assistant-panel-kind", variant);
    installAssistantTranscriptStickiness(container, opts.stickThreshold);
    const shouldStick = shouldStickAssistantTranscript(
      container,
      opts.stickThreshold,
    );
    if (items.length === 0) {
      clearNode(container);
      if (opts.nodeMap && typeof opts.nodeMap.clear === "function")
        opts.nodeMap.clear();
      container.appendChild(
        el(
          "div",
          "assistant-transcript-empty",
          opts.emptyText || transcriptLabel(opts, "empty"),
        ),
      );
      return;
    }
    const orderKey = items
      .map(function (item) {
        return String(item.kind || "") + ":" + String(item.id || "");
      })
      .join("|");
    const nodeMap = opts.nodeMap;
    const canDiff =
      nodeMap &&
      typeof nodeMap.get === "function" &&
      typeof nodeMap.set === "function";
    const needsFullRender =
      opts.orderKey !== orderKey || opts.modeKey !== mode || !canDiff;
    if (needsFullRender) {
      clearNode(container);
      if (canDiff) nodeMap.clear();
      items.forEach(function (item) {
        const row = createRow(item, { variant });
        if (canDiff) nodeMap.set(String(item.id || ""), row);
        renderAssistantTranscriptItemIfChanged(row, item, opts);
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
        renderAssistantTranscriptItemIfChanged(row, item, opts);
      });
    }
    if (shouldStick) stickAssistantTranscriptToBottom(container);
    if (typeof opts.onRendered === "function") {
      opts.onRendered({ orderKey, modeKey: mode, items });
    }
  }

  window.AssistantTranscriptRenderer = {
    buildTranscriptRenderItems,
    compactAssistantToolName,
    compactAssistantToolSummary,
    copyTextToClipboard,
    decorateMarkdownCodeBlocks,
    installAssistantTranscriptStickiness,
    isAssistantTranscriptNearBottom,
    renderAssistantTranscript,
    renderAssistantTranscriptItem,
    renderAssistantTranscriptItemIfChanged,
    shouldStickAssistantTranscript,
    stickAssistantTranscriptToBottom,
  };
})();
