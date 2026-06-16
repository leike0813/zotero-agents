(function () {
  const state = {
    snapshot: null,
    logsActiveReadingId: null,
    logsScrollTop: 0,
    logsDetailScrollTop: 0,
    homeDocScrollTop: 0,
    homeRunningScrollTop: 0,
    backendTaskScrollTopByTabKey: Object.create(null),
    homeDocWorkflowId: "",
    previousTabKey: null,
    lastChromeSignature: "",
    lastSurfaceSignature: "",
    lastSurfaceKey: "",
    productsListCollapsed: false,
    productExpandedTreePathsById: Object.create(null),
    productTreeInitializedById: Object.create(null),
  };

  function sendAction(action, payload) {
    const message = {
      type: "dashboard:action",
      action,
      payload: payload || {},
    };
    const rawTargets = [window.parent, window.top, window.opener];
    const dedup = new Set();
    rawTargets.forEach(function (target) {
      if (!target) {
        return;
      }
      if (dedup.has(target)) {
        return;
      }
      dedup.add(target);
      try {
        target.postMessage(message, "*");
      } catch {
        // ignore cross-window messaging failures
      }
    });
  }

  function clearNode(node) {
    while (node.firstChild) {
      node.removeChild(node.firstChild);
    }
  }

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) {
      node.className = className;
    }
    if (typeof text === "string") {
      node.textContent = text;
    }
    return node;
  }

  function icon(className) {
    const node = el("span", `zs-icon ${className}`);
    node.setAttribute("aria-hidden", "true");
    return node;
  }

  function dashboardTabIconClass(tabKey) {
    const icons = {
      home: "zs-icon-dashboard",
      "workflow-options": "zs-icon-settings-applications",
      products: "zs-icon-inventory-2",
      "runtime-logs": "zs-icon-terminal",
    };
    return icons[String(tabKey || "")] || "";
  }

  function createTabButton(tab, snapshot) {
    const btn = el("button", "tab-btn", "");
    const label = tab.label || tab.key;
    const iconClass = dashboardTabIconClass(tab.key);
    const content = el("span", "tab-btn-content");
    if (iconClass) {
      content.appendChild(icon(`zs-icon-sm tab-btn-icon ${iconClass}`));
    }
    content.appendChild(el("span", "tab-btn-label", label));
    btn.appendChild(content);
    if (tab.key === snapshot.selectedTabKey) {
      btn.classList.add("active");
    }
    return btn;
  }

  function snapshotSurfaceSignatures(snapshot) {
    return snapshot && snapshot.surfaceSignatures
      ? snapshot.surfaceSignatures
      : {};
  }

  function snapshotSurfaceKey(snapshot) {
    const signatures = snapshotSurfaceSignatures(snapshot);
    return String(
      signatures.selectedSurfaceKey ||
        (snapshot && snapshot.selectedTabKey) ||
        "",
    );
  }

  function snapshotSurfaceSignature(snapshot) {
    const signatures = snapshotSurfaceSignatures(snapshot);
    return String(signatures.selectedSurface || "");
  }

  function snapshotChromeSignature(snapshot) {
    const signatures = snapshotSurfaceSignatures(snapshot);
    return String(signatures.chrome || "");
  }

  function shouldSkipUnchangedSnapshotRender(nextSnapshot) {
    if (!state.snapshot || !nextSnapshot) {
      return false;
    }
    const nextSurfaceKey = snapshotSurfaceKey(nextSnapshot);
    const nextSurfaceSignature = snapshotSurfaceSignature(nextSnapshot);
    const nextChromeSignature = snapshotChromeSignature(nextSnapshot);
    return (
      nextSurfaceKey &&
      nextSurfaceSignature &&
      nextChromeSignature &&
      nextSurfaceKey === state.lastSurfaceKey &&
      nextSurfaceSignature === state.lastSurfaceSignature &&
      nextChromeSignature === state.lastChromeSignature
    );
  }

  function rememberSnapshotRenderSignature(snapshot) {
    if (!snapshot) {
      state.lastSurfaceKey = "";
      state.lastSurfaceSignature = "";
      state.lastChromeSignature = "";
      return;
    }
    state.lastSurfaceKey = snapshotSurfaceKey(snapshot);
    state.lastSurfaceSignature = snapshotSurfaceSignature(snapshot);
    state.lastChromeSignature = snapshotChromeSignature(snapshot);
  }

  function ensureDashboardShell(app) {
    let sidebar = app.querySelector("aside.sidebar");
    let main = app.querySelector("main.main");
    if (
      !sidebar ||
      !main ||
      sidebar.parentNode !== app ||
      main.parentNode !== app
    ) {
      clearNode(app);
      sidebar = el("aside", "sidebar");
      main = el("main", "main");
      app.appendChild(sidebar);
      app.appendChild(main);
    }
    return { sidebar, main };
  }

  function labelText(labels, key, fallback) {
    const text = String((labels && labels[key]) || "").trim();
    if (text && !/^task-dashboard-[a-z0-9-]+$/i.test(text)) {
      return text;
    }
    return typeof fallback === "string" ? fallback : key;
  }

  function formatTime(value) {
    const text = String(value || "").trim();
    if (!text) {
      return "-";
    }
    const parsed = new Date(text);
    if (Number.isNaN(parsed.getTime())) {
      return text;
    }
    return parsed.toLocaleString();
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function formatBytes(value) {
    const bytes = Number(value);
    if (!Number.isFinite(bytes) || bytes < 0) {
      return "";
    }
    if (bytes < 1024) {
      return bytes + " B";
    }
    if (bytes < 1024 * 1024) {
      return (bytes / 1024).toFixed(bytes >= 10 * 1024 ? 0 : 1) + " KB";
    }
    return (
      (bytes / (1024 * 1024)).toFixed(bytes >= 10 * 1024 * 1024 ? 0 : 1) +
      " MB"
    );
  }

  function normalizeProductAssetPath(asset) {
    return String(
      (asset &&
        (asset.relativePath || asset.path || asset.label || asset.assetId)) ||
        "",
    )
      .replace(/\\/g, "/")
      .split("/")
      .map(function (part) {
        return part.trim();
      })
      .filter(function (part) {
        return part && part !== "." && part !== "..";
      })
      .join("/");
  }

  function compareTreeNames(a, b) {
    if (a.kind !== b.kind) {
      return a.kind === "folder" ? -1 : 1;
    }
    return String(a.name || "").localeCompare(String(b.name || ""), undefined, {
      numeric: true,
      sensitivity: "base",
    });
  }

  function buildProductAssetTree(product) {
    const root = {
      kind: "folder",
      name: "",
      path: "",
      children: [],
      childByName: Object.create(null),
    };
    (product.assets || []).forEach(function (asset) {
      const normalizedPath =
        normalizeProductAssetPath(asset) || String(asset.assetId || "asset");
      const parts = normalizedPath.split("/").filter(Boolean);
      let parent = root;
      parts.slice(0, -1).forEach(function (part) {
        const key = part.toLowerCase();
        let child = parent.childByName[key];
        if (!child || child.kind !== "folder") {
          child = {
            kind: "folder",
            name: part,
            path: parent.path ? parent.path + "/" + part : part,
            children: [],
            childByName: Object.create(null),
          };
          parent.childByName[key] = child;
          parent.children.push(child);
        }
        parent = child;
      });
      const fileName = parts[parts.length - 1] || asset.label || asset.assetId;
      parent.children.push({
        kind: "file",
        name: fileName,
        path: normalizedPath,
        asset: asset,
      });
    });
    function sortChildren(node) {
      node.children.sort(compareTreeNames);
      node.children.forEach(function (child) {
        if (child.kind === "folder") {
          sortChildren(child);
        }
      });
    }
    sortChildren(root);
    return root;
  }

  function collectFolderPaths(node, output) {
    node.children.forEach(function (child) {
      if (child.kind !== "folder") {
        return;
      }
      output.push(child.path);
      collectFolderPaths(child, output);
    });
    return output;
  }

  function getProductExpandedTreePaths(product, tree) {
    const productId = String(product.productId || "");
    if (!state.productExpandedTreePathsById[productId]) {
      state.productExpandedTreePathsById[productId] = new Set();
    }
    const expanded = state.productExpandedTreePathsById[productId];
    if (!state.productTreeInitializedById[productId]) {
      collectFolderPaths(tree, []).forEach(function (path) {
        expanded.add(path);
      });
      state.productTreeInitializedById[productId] = true;
    }
    return expanded;
  }

  function productFileTypeIconClass(asset) {
    const path = normalizeProductAssetPath(asset).toLowerCase();
    const contentType = String((asset && asset.contentType) || "").toLowerCase();
    if (/\.(csv|tsv)$/.test(path) || contentType.includes("csv")) {
      return "zs-icon-product-table";
    }
    if (
      /(\.md|\.markdown|\.txt|\.text|\.tex|\.bib|\.log)$/.test(path) ||
      contentType.includes("markdown") ||
      contentType.includes("latex") ||
      contentType.startsWith("text/plain")
    ) {
      return "zs-icon-product-article";
    }
    if (
      /\.(json|yaml|yml|toml|xml)$/.test(path) ||
      contentType.includes("json") ||
      contentType.includes("yaml") ||
      contentType.includes("toml") ||
      contentType.includes("xml")
    ) {
      return "zs-icon-product-data";
    }
    if (
      /\.(html|htm|css|js|ts|mjs|tsx|jsx)$/.test(path) ||
      contentType.includes("html") ||
      contentType.includes("css") ||
      contentType.includes("javascript") ||
      contentType.includes("typescript")
    ) {
      return "zs-icon-product-code";
    }
    return "zs-icon-product-file";
  }

  function resolveHighlightLanguage(language) {
    const raw = String(language || "text").toLowerCase();
    const aliases = {
      js: "javascript",
      mjs: "javascript",
      jsx: "javascript",
      ts: "typescript",
      tsx: "typescript",
      md: "markdown",
      text: "plaintext",
      txt: "plaintext",
      log: "plaintext",
    };
    return aliases[raw] || raw;
  }

  function highlightCode(text, language) {
    const source = String(text || "");
    const runtime = window.hljs;
    const normalized = resolveHighlightLanguage(language);
    if (!runtime || typeof runtime.highlight !== "function") {
      return escapeHtml(source);
    }
    try {
      if (runtime.getLanguage && runtime.getLanguage(normalized)) {
        return runtime.highlight(source, {
          language: normalized,
          ignoreIllegals: true,
        }).value;
      }
      if (typeof runtime.highlightAuto === "function") {
        return runtime.highlightAuto(source).value;
      }
    } catch {
      // fall through to escaped text
    }
    return escapeHtml(source);
  }

  function copyTextToClipboard(text) {
    const source = String(text || "");
    if (
      navigator.clipboard &&
      typeof navigator.clipboard.writeText === "function"
    ) {
      return navigator.clipboard.writeText(source);
    }
    const textarea = document.createElement("textarea");
    textarea.value = source;
    textarea.setAttribute("readonly", "true");
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    textarea.style.top = "0";
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand("copy");
      return Promise.resolve();
    } finally {
      textarea.remove();
    }
  }

  function splitPreviewLines(text) {
    return String(text || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  }

  function ensureProductMarkdownParser() {
    if (typeof window.markdownit !== "function") {
      return null;
    }
    const parser = window.markdownit({
      html: false,
      linkify: true,
      breaks: false,
      langPrefix: "language-",
      highlight: function (source, language) {
        return highlightCode(source, language);
      },
    });
    if (window.texmath && window.katex) {
      try {
        parser.use(window.texmath, {
          engine: window.katex,
          delimiters: "dollars",
          katexOptions: { throwOnError: false, output: "htmlAndMathML" },
        });
      } catch {
        // Markdown rendering still works without math support.
      }
    }
    return parser;
  }

  function formatMillis(value) {
    const text = String(value || "").trim();
    if (!text) {
      return "-";
    }
    const parsed = new Date(text);
    if (Number.isNaN(parsed.getTime())) {
      return text;
    }
    const pad = function (n) {
      return (n < 10 ? "0" : "") + n;
    };
    const padMs = function (n) {
      return (n < 100 ? "0" : "") + (n < 10 ? "0" : "") + n;
    };
    return (
      parsed.getFullYear() +
      "-" +
      pad(parsed.getMonth() + 1) +
      "-" +
      pad(parsed.getDate()) +
      " " +
      pad(parsed.getHours()) +
      ":" +
      pad(parsed.getMinutes()) +
      ":" +
      pad(parsed.getSeconds()) +
      "." +
      padMs(parsed.getMilliseconds())
    );
  }

  function isTerminalStatus(status, semantics) {
    if (semantics && typeof semantics === "object") {
      if (typeof semantics.terminal === "boolean") {
        return semantics.terminal;
      }
    }
    const normalized = String(status || "")
      .trim()
      .toLowerCase();
    return (
      normalized === "succeeded" ||
      normalized === "failed" ||
      normalized === "canceled"
    );
  }

  let toastTimer;
  function showToast(msg) {
    let t = document.getElementById("zs-toast");
    if (!t) {
      t = document.createElement("div");
      t.id = "zs-toast";
      t.className = "zs-toast";
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.classList.add("show");
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      t.classList.remove("show");
    }, 3000);
  }

  function renderStatusBadge(stateValue, label) {
    const status = el(
      "span",
      `status ${String(stateValue || "").toLowerCase()}`,
      label,
    );
    return status;
  }

  function renderTaskTable(args) {
    const rows = Array.isArray(args.rows) ? args.rows : [];
    const labels = args.labels;
    const wrap = el("div", "panel");
    if (args.panelClassName) {
      wrap.classList.add(args.panelClassName);
    }
    if (rows.length === 0) {
      wrap.appendChild(el("div", "empty", args.emptyText));
      return wrap;
    }

    const tableWrap = el("div", "table-wrap");
    if (args.tableWrapClassName) {
      tableWrap.classList.add(args.tableWrapClassName);
    }
    if (typeof args.scrollKey === "string" && args.scrollKey.trim()) {
      const scrollKey = args.scrollKey.trim();
      tableWrap.addEventListener("scroll", function () {
        state.backendTaskScrollTopByTabKey[scrollKey] =
          tableWrap.scrollTop || 0;
      });
    }
    const table = document.createElement("table");
    if (args.tableClassName) {
      table.className = args.tableClassName;
    }
    const thead = document.createElement("thead");
    const headRow = document.createElement("tr");
    const columns = args.columns || [
      labels.colTask,
      labels.colWorkflow,
      labels.colStatus,
      labels.colRequestId,
      labels.colUpdatedAt,
      labelText(labels, "colActions"),
    ];
    columns.forEach((title) => {
      const th = document.createElement("th");
      th.textContent = title;
      headRow.appendChild(th);
    });
    thead.appendChild(headRow);
    table.appendChild(thead);

    const tbody = document.createElement("tbody");
    rows.forEach((row) => {
      const tr = document.createElement("tr");
      if (args.selectedId && args.selectedId === row.id) {
        tr.classList.add("selected");
      }
      if (typeof args.onRowClick === "function") {
        tr.classList.add("clickable");
        tr.addEventListener("click", function () {
          args.onRowClick(row);
        });
      }

      if (typeof args.renderRow === "function") {
        args.renderRow(tr, row);
      } else {
        const taskCell = document.createElement("td");
        taskCell.textContent = row.taskName;
        tr.appendChild(taskCell);

        const workflowCell = document.createElement("td");
        workflowCell.textContent = row.workflowLabel;
        tr.appendChild(workflowCell);

        const statusCell = document.createElement("td");
        statusCell.className = "center-cell";
        statusCell.appendChild(renderStatusBadge(row.state, row.stateLabel));
        tr.appendChild(statusCell);

        const requestCell = document.createElement("td");
        requestCell.className = "mono";
        requestCell.textContent = row.requestId || "-";
        tr.appendChild(requestCell);

        const updatedCell = document.createElement("td");
        updatedCell.className = "center-cell";
        updatedCell.textContent = formatTime(row.updatedAt);
        tr.appendChild(updatedCell);

        const actionCell = document.createElement("td");
        actionCell.className = "actions-cell";
        const actionsWrap = el("div", "actions-wrap");
        const actionButtons = args.buildActions ? args.buildActions(row) : [];
        if (actionButtons.length === 0) {
          actionsWrap.textContent = "-";
        } else {
          actionButtons.forEach((button) => actionsWrap.appendChild(button));
        }
        actionCell.appendChild(actionsWrap);
        tr.appendChild(actionCell);
      }

      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    tableWrap.appendChild(table);
    wrap.appendChild(tableWrap);
    return wrap;
  }

  function renderLogTable(main, snapshot) {
    const labels = snapshot.labels;
    const backend = snapshot.backendView;
    if (!backend) {
      return;
    }

    const section = el("section", "section");
    section.appendChild(el("h3", "section-title", labels.logsTitle));

    const bound = el("div", "bound-task");
    const boundTaskId = backend.selectedLogTaskId || "-";
    const boundRequestId = backend.selectedLogTaskRequestId || "-";
    const boundJobId = backend.selectedLogTaskJobId || "-";
    bound.appendChild(
      el(
        "div",
        "bound-task-item mono",
        `${labels.logsBoundTask}: ${boundTaskId}`,
      ),
    );
    bound.appendChild(
      el(
        "div",
        "bound-task-item mono",
        `${labels.logsBoundRequestId}: ${boundRequestId}`,
      ),
    );
    bound.appendChild(
      el(
        "div",
        "bound-task-item mono",
        `${labels.logsBoundJobId}: ${boundJobId}`,
      ),
    );
    section.appendChild(bound);

    section.appendChild(
      renderTaskTable({
        rows: backend.logRows || [],
        labels,
        selectedId: backend.selectedLogEntryId,
        emptyText: labels.logsEmpty,
        tableClassName: "logs-table",
        columns: [
          labels.colTime,
          labels.colLevel,
          labels.colStage,
          labels.colScope,
          labels.colMessage,
          labels.colRequestId,
          labels.colJobId,
        ],
        onRowClick: (row) => {
          sendAction("select-log-entry", {
            backendId: backend.backendId,
            logEntryId: row.id,
          });
        },
        renderRow: (tr, row) => {
          const timeCell = document.createElement("td");
          timeCell.textContent = formatTime(row.ts);
          tr.appendChild(timeCell);

          const levelCell = document.createElement("td");
          levelCell.appendChild(
            renderStatusBadge(row.level, String(row.level || "").toUpperCase()),
          );
          tr.appendChild(levelCell);

          const stageCell = document.createElement("td");
          stageCell.textContent = row.stage || "-";
          tr.appendChild(stageCell);

          const scopeCell = document.createElement("td");
          scopeCell.textContent = row.scope || "-";
          tr.appendChild(scopeCell);

          const messageCell = document.createElement("td");
          messageCell.textContent = row.message || "-";
          tr.appendChild(messageCell);

          const requestCell = document.createElement("td");
          requestCell.className = "mono";
          requestCell.textContent = row.requestId || "-";
          tr.appendChild(requestCell);

          const jobCell = document.createElement("td");
          jobCell.className = "mono";
          jobCell.textContent = row.jobId || "-";
          tr.appendChild(jobCell);
        },
      }),
    );

    const detailSection = el("div", "log-detail");
    detailSection.appendChild(
      el("h4", "section-title", labels.logsDetailTitle),
    );
    const detailPayload = backend.selectedLogEntryPayload || null;
    const detailText = detailPayload
      ? JSON.stringify(detailPayload, null, 2)
      : labels.logsEmpty;
    const detail = el("pre", "log-view mono");
    detail.textContent = detailText;
    detailSection.appendChild(detail);
    section.appendChild(detailSection);
    main.appendChild(section);
  }

  function renderSummary(main, snapshot) {
    const labels = snapshot.labels;
    const workflows = Array.isArray(snapshot.homeWorkflows)
      ? snapshot.homeWorkflows
      : [];
    if (workflows.length > 0) {
      const section = el("section", "section");
      section.classList.add("workflow-bubbles-section");
      section.appendChild(
        el("h3", "section-title", labelText(labels, "homeWorkflowTitle")),
      );
      const wrap = el("div", "workflow-bubbles-wrap");
      workflows.forEach(function (workflow) {
        const bubble = el("div", "workflow-bubble");
        const title = el("div", "workflow-bubble-title");
        title.appendChild(
          el(
            "span",
            "workflow-bubble-title-text",
            workflow.workflowLabel || workflow.workflowId || "-",
          ),
        );
        if (workflow.builtin === true) {
          title.appendChild(
            el(
              "span",
              "workflow-bubble-builtin-badge",
              labelText(labels, "homeWorkflowBuiltinBadge"),
            ),
          );
        }
        if (workflow.core === true) {
          title.appendChild(
            el(
              "span",
              "workflow-bubble-core-badge",
              labelText(labels, "homeWorkflowCoreBadge"),
            ),
          );
        }
        bubble.appendChild(title);
        const actions = el("div", "workflow-bubble-actions");
        const runButton = el(
          "button",
          "btn workflow-bubble-btn workflow-bubble-run-btn",
          "",
        );
        const runLabel = labelText(labels, "homeWorkflowRunButton");
        const runDisabledReason = workflow.quickRunDisabledReason || "";
        runButton.setAttribute(
          "title",
          workflow.quickRunEnabled === true
            ? runLabel
            : runDisabledReason || runLabel,
        );
        runButton.setAttribute("aria-label", runLabel);
        runButton.disabled = workflow.quickRunEnabled !== true;
        const runIcon = icon(
          "zs-icon-sm workflow-bubble-icon workflow-bubble-icon-run zs-icon-play-arrow",
        );
        runButton.appendChild(runIcon);
        runButton.addEventListener("click", function () {
          if (runButton.disabled) {
            return;
          }
          sendAction("run-home-workflow", {
            workflowId: workflow.workflowId || "",
          });
        });
        actions.appendChild(runButton);
        const docButton = el("button", "btn workflow-bubble-btn", "");
        docButton.setAttribute(
          "title",
          labelText(labels, "homeWorkflowDocButton"),
        );
        docButton.setAttribute(
          "aria-label",
          labelText(labels, "homeWorkflowDocButton"),
        );
        const docIcon = icon(
          "zs-icon-sm workflow-bubble-icon workflow-bubble-icon-doc zs-icon-description",
        );
        docButton.appendChild(docIcon);
        docButton.addEventListener("click", function () {
          sendAction("open-home-workflow-doc", {
            workflowId: workflow.workflowId || "",
          });
        });
        actions.appendChild(docButton);
        const settingsButton = el("button", "btn workflow-bubble-btn", "");
        settingsButton.setAttribute(
          "title",
          labelText(labels, "homeWorkflowSettingsButton"),
        );
        settingsButton.setAttribute(
          "aria-label",
          labelText(labels, "homeWorkflowSettingsButton"),
        );
        const settingsIcon = icon(
          "zs-icon-sm workflow-bubble-icon workflow-bubble-icon-settings zs-icon-settings",
        );
        settingsButton.appendChild(settingsIcon);
        settingsButton.disabled = workflow.configurable !== true;
        settingsButton.addEventListener("click", function () {
          if (settingsButton.disabled) {
            return;
          }
          sendAction("open-home-workflow-settings", {
            workflowId: workflow.workflowId || "",
          });
        });
        actions.appendChild(settingsButton);
        bubble.appendChild(actions);
        wrap.appendChild(bubble);
      });
      section.appendChild(wrap);
      main.appendChild(section);
    }

    main.appendChild(
      el("h3", "section-title", labelText(labels, "homeSummaryTitle")),
    );

    const cards = el("div", "cards");
    [
      { label: labels.summaryTotal, value: snapshot.summary.total },
      { label: labels.summaryRunning, value: snapshot.summary.running },
      { label: labels.summarySucceeded, value: snapshot.summary.succeeded },
      { label: labels.summaryFailed, value: snapshot.summary.failed },
      { label: labels.summaryCanceled, value: snapshot.summary.canceled },
    ].forEach((entry) => {
      const card = el("div", "card");
      card.appendChild(el("div", "card-label", String(entry.label)));
      card.appendChild(el("div", "card-value", String(entry.value)));
      cards.appendChild(card);
    });
    main.appendChild(cards);

    const section = el("section", "section");
    section.appendChild(el("h3", "section-title", labels.runningTitle));
    section.appendChild(
      renderTaskTable({
        rows: snapshot.runningRows || [],
        labels,
        tableWrapClassName: "home-running-table-wrap",
        emptyText: labels.noRunning,
        onRowClick: (row) => {
          sendAction("open-running-task", {
            taskId: row.id,
            backendId: row.backendId || "",
            backendType: row.backendType || "",
            requestId: row.requestId || "",
            requestKind: row.requestKind || "",
          });
        },
        columns: [
          labels.colTask,
          labels.colWorkflow,
          labelText(labels, "colBackend"),
          labels.colStatus,
          labels.colUpdatedAt,
        ],
        renderRow: (tr, row) => {
          const taskCell = document.createElement("td");
          taskCell.textContent = row.taskName || "-";
          tr.appendChild(taskCell);

          const workflowCell = document.createElement("td");
          workflowCell.textContent = row.workflowLabel || "-";
          tr.appendChild(workflowCell);

          const backendCell = document.createElement("td");
          backendCell.textContent = row.backendLabel || "-";
          tr.appendChild(backendCell);

          const statusCell = document.createElement("td");
          statusCell.className = "center-cell";
          statusCell.appendChild(renderStatusBadge(row.state, row.stateLabel));
          tr.appendChild(statusCell);

          const updatedCell = document.createElement("td");
          updatedCell.className = "center-cell";
          updatedCell.textContent = formatTime(row.updatedAt);
          tr.appendChild(updatedCell);
        },
      }),
    );
    main.appendChild(section);
  }

  function renderHomeWorkflowDoc(main, snapshot) {
    const labels = snapshot.labels || {};
    const view = snapshot.homeWorkflowDocView;
    if (!view) {
      renderSummary(main, snapshot);
      return;
    }
    const section = el("section", "section workflow-doc-section");
    section.appendChild(
      el("h3", "section-title", view.workflowLabel || view.workflowId || "-"),
    );
    const panel = el("div", "panel workflow-doc-panel");
    const content = el("div", "workflow-doc-content markdown-body");
    content.setAttribute("data-workflow-id", String(view.workflowId || ""));
    if (view.missingReadme) {
      content.appendChild(
        el("div", "empty", labelText(labels, "homeWorkflowDocMissingReadme")),
      );
    } else {
      content.innerHTML = String(view.html || "");
    }
    content.addEventListener("scroll", function () {
      state.homeDocScrollTop = content.scrollTop || 0;
      state.homeDocWorkflowId = String(view.workflowId || "");
    });
    panel.appendChild(content);
    section.appendChild(panel);
    const footer = el("div", "workflow-doc-footer");
    const backButton = el(
      "button",
      "btn",
      labelText(labels, "homeWorkflowDocBack"),
    );
    backButton.addEventListener("click", function () {
      sendAction("close-home-workflow-doc", {});
    });
    footer.appendChild(backButton);
    section.appendChild(footer);
    main.appendChild(section);
  }

  function renderGenericBackend(main, snapshot) {
    const labels = snapshot.labels;
    const backend = snapshot.backendView;
    if (!backend) {
      main.appendChild(el("div", "empty", labels.noHistory));
      return;
    }
    const toolbar = el("div", "toolbar");
    toolbar.appendChild(el("h2", "page-title", backend.title));
    const openDiagnostics = el(
      "button",
      "btn",
      labelText(labels, "logsOpenDiagnostics"),
    );
    openDiagnostics.disabled = !backend.selectedLogTaskId;
    openDiagnostics.addEventListener("click", function () {
      sendAction("open-log-diagnostics", {
        backendId: backend.backendId,
        taskId: backend.selectedLogTaskId || "",
      });
    });
    toolbar.appendChild(openDiagnostics);
    main.appendChild(toolbar);

    main.appendChild(
      renderTaskTable({
        rows: backend.rows || [],
        labels,
        tableWrapClassName: "backend-task-table-wrap",
        scrollKey: snapshot.selectedTabKey,
        selectedId: backend.selectedLogTaskId,
        emptyText:
          backend.emptyRowsText || labels.backendNoTasks || labels.noHistory,
        onRowClick: (row) => {
          sendAction("select-log-task", {
            backendId: backend.backendId,
            taskId: row.id,
          });
        },
        buildActions: (row) => {
          const view = el("button", "btn", labels.logsViewTask);
          view.addEventListener("click", function () {
            sendAction("select-log-task", {
              backendId: backend.backendId,
              taskId: row.id,
            });
          });
          const actions = [view];
          if (
            String(backend.backendType || "").trim() === "acp" &&
            String(row.requestKind || "").trim() === "skillrunner.job.v1" &&
            row.requestId
          ) {
            const openRun = el("button", "btn", labelText(labels, "openRun"));
            openRun.addEventListener("click", function () {
              sendAction("open-run", {
                backendId: backend.backendId,
                requestId: row.requestId,
              });
            });
            actions.push(openRun);
            const cancelRun = el(
              "button",
              "btn",
              labelText(labels, "cancelRun"),
            );
            cancelRun.disabled = isTerminalStatus(
              row.state,
              row.stateSemantics,
            );
            cancelRun.addEventListener("click", function () {
              sendAction("cancel-run", {
                backendId: backend.backendId,
                requestId: row.requestId,
              });
            });
            actions.push(cancelRun);
          }
          return actions;
        },
      }),
    );

    renderLogTable(main, snapshot);
  }

  function renderSkillRunnerBackend(main, snapshot) {
    const labels = snapshot.labels;
    const backend = snapshot.backendView;
    if (!backend) {
      main.appendChild(el("div", "empty", labels.noHistory));
      return;
    }
    const toolbar = el("div", "toolbar");
    toolbar.appendChild(el("h2", "page-title", backend.title));
    const actionWrap = el("div", "toolbar-actions");
    if (backend.selectedSubview === "management") {
      const showRuns = el(
        "button",
        "btn",
        labelText(labels, "closeManagement"),
      );
      showRuns.addEventListener("click", function () {
        sendAction("show-runs", {
          backendId: backend.backendId,
        });
      });
      actionWrap.appendChild(showRuns);
      const openExternal = el(
        "button",
        "btn",
        labelText(labels, "openManagementExternal"),
      );
      openExternal.addEventListener("click", function () {
        sendAction("open-management-external", {
          backendId: backend.backendId,
        });
      });
      actionWrap.appendChild(openExternal);
      toolbar.appendChild(actionWrap);
      main.appendChild(toolbar);
      renderSkillRunnerManagementSubview(main, snapshot);
      return;
    }
    const refreshModelCache = el(
      "button",
      "btn",
      labelText(labels, "refreshModelCache"),
    );
    refreshModelCache.addEventListener("click", function () {
      sendAction("refresh-model-cache", {
        backendId: backend.backendId,
      });
    });
    actionWrap.appendChild(refreshModelCache);
    const openManagement = el("button", "btn", labels.openManagement);
    openManagement.addEventListener("click", function () {
      sendAction("open-management", {
        backendId: backend.backendId,
      });
    });
    actionWrap.appendChild(openManagement);
    toolbar.appendChild(actionWrap);
    main.appendChild(toolbar);

    main.appendChild(
      renderTaskTable({
        rows: backend.rows || [],
        labels,
        panelClassName: "skillrunner-task-panel",
        tableWrapClassName: "backend-task-table-wrap",
        scrollKey: snapshot.selectedTabKey,
        emptyText:
          backend.emptyRowsText || labels.backendNoTasks || labels.noHistory,
        columns: [
          labels.colTask,
          labels.colWorkflow,
          labelText(labels, "colEngine"),
          labels.colStatus,
          labels.colRequestId,
          labels.colUpdatedAt,
          labelText(labels, "colActions"),
        ],
        renderRow: (tr, row) => {
          const taskCell = document.createElement("td");
          taskCell.textContent = row.taskName;
          tr.appendChild(taskCell);

          const workflowCell = document.createElement("td");
          workflowCell.textContent = row.workflowLabel;
          tr.appendChild(workflowCell);

          const engineCell = document.createElement("td");
          engineCell.textContent = row.engine || "-";
          tr.appendChild(engineCell);

          const statusCell = document.createElement("td");
          statusCell.className = "center-cell";
          statusCell.appendChild(renderStatusBadge(row.state, row.stateLabel));
          tr.appendChild(statusCell);

          const requestCell = document.createElement("td");
          requestCell.className = "mono";
          requestCell.textContent = row.requestId || "-";
          tr.appendChild(requestCell);

          const updatedCell = document.createElement("td");
          updatedCell.className = "center-cell";
          updatedCell.textContent = formatTime(row.updatedAt);
          tr.appendChild(updatedCell);

          const actionCell = document.createElement("td");
          actionCell.className = "actions-cell";
          const actionsWrap = el("div", "actions-wrap");
          const actionButtons = [];
          if (row.requestId) {
            const openRun = el("button", "btn", labels.openRun);
            openRun.addEventListener("click", function () {
              sendAction("open-run", {
                backendId: backend.backendId,
                requestId: row.requestId,
              });
            });
            actionButtons.push(openRun);
            const cancelRun = el("button", "btn", labels.cancelRun);
            cancelRun.disabled = isTerminalStatus(
              row.state,
              row.stateSemantics,
            );
            cancelRun.addEventListener("click", function () {
              sendAction("cancel-run", {
                backendId: backend.backendId,
                requestId: row.requestId,
              });
            });
            actionButtons.push(cancelRun);
          }
          if (actionButtons.length === 0) {
            actionsWrap.textContent = "-";
          } else {
            actionButtons.forEach((button) => actionsWrap.appendChild(button));
          }
          actionCell.appendChild(actionsWrap);
          tr.appendChild(actionCell);
        },
      }),
    );
  }

  function renderSkillRunnerManagementSubview(main, snapshot) {
    const labels = snapshot.labels || {};
    const backend = snapshot.backendView;
    const managementUrl = String((backend && backend.managementUiUrl) || "");
    const panel = el("section", "management-host-panel");
    if (!managementUrl) {
      panel.appendChild(
        el("div", "error-banner", labelText(labels, "managementLoadFailed")),
      );
      main.appendChild(panel);
      return;
    }
    const mount = el("div", "management-host-mount");
    mount.setAttribute("data-zs-role", "skillrunner-management-dashboard-host");
    mount.dataset.backendId = backend.backendId || "";
    mount.dataset.managementUiUrl = managementUrl;
    mount.appendChild(
      el(
        "div",
        "management-host-loading",
        labelText(labels, "managementLoading"),
      ),
    );
    panel.appendChild(mount);
    main.appendChild(panel);
    window.setTimeout(function () {
      sendAction("mount-management-host", {
        backendId: backend.backendId,
        managementUiUrl: managementUrl,
      });
    }, 0);
  }

  function renderAcpSkillRunnerBackend(main, snapshot) {
    const labels = snapshot.labels;
    const backend = snapshot.backendView;
    if (!backend) {
      main.appendChild(el("div", "empty", labels.noHistory));
      return;
    }
    const toolbar = el("div", "toolbar");
    toolbar.appendChild(el("h2", "page-title", backend.title));
    const openRuns = el("button", "btn", labelText(labels, "openRun"));
    openRuns.addEventListener("click", function () {
      sendAction("open-acp-skill-runs", {});
    });
    toolbar.appendChild(openRuns);
    main.appendChild(toolbar);

    main.appendChild(
      renderTaskTable({
        rows: backend.rows || [],
        labels,
        panelClassName: "skillrunner-task-panel",
        tableWrapClassName: "backend-task-table-wrap",
        scrollKey: snapshot.selectedTabKey,
        emptyText:
          backend.emptyRowsText || labels.backendNoTasks || labels.noHistory,
        columns: [
          labels.colTask,
          labels.colWorkflow,
          labelText(labels, "colEngine"),
          labels.colStatus,
          labels.colRequestId,
          labels.colUpdatedAt,
          labelText(labels, "colActions"),
        ],
        renderRow: (tr, row) => {
          const taskCell = document.createElement("td");
          taskCell.textContent = row.taskName;
          tr.appendChild(taskCell);

          const workflowCell = document.createElement("td");
          workflowCell.textContent = row.workflowLabel;
          tr.appendChild(workflowCell);

          const engineCell = document.createElement("td");
          engineCell.textContent = row.engine || "ACP";
          tr.appendChild(engineCell);

          const statusCell = document.createElement("td");
          statusCell.className = "center-cell";
          statusCell.appendChild(renderStatusBadge(row.state, row.stateLabel));
          tr.appendChild(statusCell);

          const requestCell = document.createElement("td");
          requestCell.className = "mono";
          requestCell.textContent = row.requestId || "-";
          tr.appendChild(requestCell);

          const updatedCell = document.createElement("td");
          updatedCell.className = "center-cell";
          updatedCell.textContent = formatTime(row.updatedAt);
          tr.appendChild(updatedCell);

          const actionCell = document.createElement("td");
          actionCell.className = "actions-cell";
          const actionsWrap = el("div", "actions-wrap");
          if (row.requestId) {
            const openRun = el("button", "btn", labelText(labels, "openRun"));
            openRun.addEventListener("click", function () {
              sendAction("open-run", {
                backendId: backend.backendId,
                requestId: row.requestId,
              });
            });
            actionsWrap.appendChild(openRun);
            const cancelRun = el(
              "button",
              "btn",
              labelText(labels, "cancelRun"),
            );
            cancelRun.disabled = isTerminalStatus(
              row.state,
              row.stateSemantics,
            );
            cancelRun.addEventListener("click", function () {
              sendAction("cancel-run", {
                backendId: backend.backendId,
                requestId: row.requestId,
              });
            });
            actionsWrap.appendChild(cancelRun);
          } else {
            actionsWrap.textContent = "-";
          }
          actionCell.appendChild(actionsWrap);
          tr.appendChild(actionCell);
        },
      }),
    );
  }

  function cloneRecord(raw) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      return {};
    }
    return JSON.parse(JSON.stringify(raw));
  }

  function isPositiveIntegerField(entry) {
    if (!entry || typeof entry !== "object") {
      return false;
    }
    const key = String(entry.key || "")
      .trim()
      .toLowerCase();
    if (!key) {
      return false;
    }
    if (key === "hard_timeout_seconds") {
      return true;
    }
    return key.includes("timeout");
  }

  function validateNumberFieldValue(args) {
    const raw = String(args.rawValue == null ? "" : args.rawValue).trim();
    if (!raw) {
      return { ok: true, remove: true };
    }
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) {
      return {
        ok: false,
        message: labelText(args.labels, "workflowSettingsNumberInvalid"),
      };
    }
    if (isPositiveIntegerField(args.entry)) {
      if (!Number.isInteger(parsed) || parsed <= 0) {
        return {
          ok: false,
          message: labelText(
            args.labels,
            "workflowSettingsPositiveIntegerRequired",
          ),
        };
      }
    }
    return { ok: true, value: parsed };
  }

  function renderWorkflowField(args) {
    function isWarningProviderOptionKey(key) {
      return key === "autoApproveAcpPermissions";
    }

    const row = el("div", "workflow-settings-field");
    const label = el(
      "label",
      isWarningProviderOptionKey(args.entry.key)
        ? "workflow-settings-field-label workflow-settings-field-label-warning"
        : "workflow-settings-field-label",
      args.entry.title || args.entry.key,
    );
    row.appendChild(label);
    if (args.entry.disabled === true) {
      const message =
        Array.isArray(args.entry.diagnostics) &&
        args.entry.diagnostics.length > 0
          ? String(
              args.entry.diagnostics[0].message ||
                args.entry.diagnostics[0].code ||
                "",
            )
          : "No selectable options are available.";
      row.appendChild(el("div", "workflow-settings-field-desc", message));
      const disabledControl = document.createElement("input");
      disabledControl.type = "text";
      disabledControl.disabled = true;
      disabledControl.value = "";
      disabledControl.className = "workflow-settings-field-control";
      row.appendChild(disabledControl);
      return row;
    }
    if (args.entry.description) {
      row.appendChild(
        el("div", "workflow-settings-field-desc", args.entry.description),
      );
    }
    const currentValue = Object.prototype.hasOwnProperty.call(
      args.values,
      args.entry.key,
    )
      ? args.values[args.entry.key]
      : args.entry.defaultValue;
    let control;
    let controlNode;
    const enumValues = Array.isArray(args.entry.enumValues)
      ? args.entry.enumValues
      : [];
    const structuredOptions = Array.isArray(args.entry.options)
      ? args.entry.options
          .filter(function (entry) {
            return entry && typeof entry === "object";
          })
          .map(function (entry) {
            return {
              value: String(entry.value == null ? "" : entry.value),
              label: String(entry.label || entry.value || ""),
              description: String(entry.description || ""),
            };
          })
      : [];
    const optionEntries =
      structuredOptions.length > 0
        ? structuredOptions
        : enumValues.map(function (val) {
            return { value: String(val), label: String(val) };
          });
    if (args.entry.type === "boolean") {
      const line = el("label", "workflow-settings-field-checkbox");
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = currentValue === true;
      checkbox.addEventListener("change", function () {
        args.values[args.entry.key] = checkbox.checked;
        args.onChange({
          changedKey: args.entry.key,
        });
      });
      line.appendChild(checkbox);
      line.appendChild(
        el(
          "span",
          isWarningProviderOptionKey(args.entry.key)
            ? "workflow-settings-field-label-warning"
            : "",
          args.entry.title || args.entry.key,
        ),
      );
      row.appendChild(line);
      return row;
    }
    if (optionEntries.length > 0 && args.entry.allowCustom !== true) {
      const currentValueStr = String(
        currentValue == null ? optionEntries[0].value || "" : currentValue,
      );
      const customSelect = window.createCustomSelect(
        optionEntries,
        currentValueStr,
        function (newValue) {
          args.values[args.entry.key] = newValue;
          args.onChange({
            changedKey: args.entry.key,
          });
        },
      );
      control = customSelect.element;
      control.classList.add("workflow-settings-field-control");
    } else if (optionEntries.length > 0 && args.entry.allowCustom === true) {
      const combo = document.createElement("div");
      combo.className = "workflow-settings-field-combo";
      combo.style.display = "flex";
      combo.style.gap = "8px";
      combo.style.alignItems = "center";
      const currentValueStr = String(currentValue == null ? "" : currentValue);
      const customSelect = window.createCustomSelect(
        optionEntries,
        currentValueStr,
        function (newValue) {
          control.value = String(newValue == null ? "" : newValue);
          args.values[args.entry.key] = control.value;
          args.onChange({
            changedKey: args.entry.key,
          });
        },
      );
      customSelect.element.classList.add("workflow-settings-field-control");
      customSelect.element.style.flex = "1 1 55%";
      combo.appendChild(customSelect.element);
      control = document.createElement("input");
      control.type = "text";
      control.value = currentValueStr;
      control.className = "workflow-settings-field-control";
      control.style.flex = "1 1 45%";
      combo.appendChild(control);
      controlNode = combo;
    } else {
      control = document.createElement("input");
      control.type = "text";
      if (args.entry.type === "number") {
        control.setAttribute(
          "inputmode",
          isPositiveIntegerField(args.entry) ? "numeric" : "decimal",
        );
      }
      control.value = String(currentValue == null ? "" : currentValue);
      control.className = "workflow-settings-field-control";
      if (args.entry.type === "number") {
        control.classList.add("numeric");
      }
    }
    const errorNode = el("div", "workflow-settings-field-error");
    let lastCommittedRaw = String(control.value == null ? "" : control.value);
    const setFieldError = function (message) {
      if (message) {
        control.classList.add("invalid");
        errorNode.textContent = message;
        if (!errorNode.parentNode) {
          row.appendChild(errorNode);
        }
      } else {
        control.classList.remove("invalid");
        if (errorNode.parentNode) {
          errorNode.parentNode.removeChild(errorNode);
        }
      }
    };
    const commitControlValue = function (emitChange) {
      const rawValue = String(control.value == null ? "" : control.value);
      let changed = false;
      if (args.entry.type === "number") {
        const validation = validateNumberFieldValue({
          entry: args.entry,
          rawValue,
          labels: args.labels || {},
        });
        if (!validation.ok) {
          setFieldError(validation.message);
          return false;
        }
        setFieldError("");
        if (validation.remove) {
          changed = Object.prototype.hasOwnProperty.call(
            args.values,
            args.entry.key,
          );
          delete args.values[args.entry.key];
        } else {
          changed = args.values[args.entry.key] !== validation.value;
          args.values[args.entry.key] = validation.value;
        }
      } else {
        setFieldError("");
        changed = args.values[args.entry.key] !== rawValue;
        args.values[args.entry.key] = rawValue;
      }
      if (emitChange && (changed || rawValue !== lastCommittedRaw)) {
        args.onChange({
          changedKey: args.entry.key,
        });
      }
      lastCommittedRaw = rawValue;
      return true;
    };
    control.addEventListener("input", function () {
      if (args.entry.type === "number") {
        setFieldError("");
      }
      args.values[args.entry.key] = control.value;
    });
    control.addEventListener("change", function () {
      commitControlValue(true);
    });
    control.addEventListener("blur", function () {
      commitControlValue(true);
    });
    row.appendChild(controlNode || control);
    return row;
  }

  function renderWorkflowSettingsSection(args) {
    const card = el("section", "workflow-settings-card");
    card.appendChild(el("h3", "workflow-settings-card-title", args.title));
    if (!Array.isArray(args.entries) || args.entries.length === 0) {
      card.appendChild(el("div", "workflow-settings-empty", args.emptyText));
      return card;
    }
    args.entries.forEach(function (entry) {
      card.appendChild(
        renderWorkflowField({
          entry,
          values: args.values,
          onChange: function (changeMeta) {
            args.onChange({
              changedSection: args.changedSection,
              changedKey:
                changeMeta && typeof changeMeta.changedKey === "string"
                  ? changeMeta.changedKey
                  : "",
            });
          },
          labels: args.labels,
        }),
      );
    });
    return card;
  }

  function renderWorkflowOptions(main, snapshot) {
    const labels = snapshot.labels || {};
    const view = snapshot.workflowOptionsView || {};
    main.appendChild(
      el("h2", "page-title", labelText(labels, "tabWorkflowOptions")),
    );
    const workflows = Array.isArray(view.workflows) ? view.workflows : [];
    if (workflows.length === 0) {
      main.appendChild(
        el("div", "empty", labelText(labels, "workflowSettingsNoConfigurable")),
      );
      return;
    }
    const tabs = el("div", "workflow-subtabs");
    workflows.forEach(function (workflow) {
      const btn = el(
        "button",
        "workflow-subtab-btn",
        workflow.workflowLabel || workflow.workflowId,
      );
      if (workflow.workflowId === view.selectedWorkflowId) {
        btn.classList.add("active");
      }
      btn.addEventListener("click", function () {
        sendAction("select-workflow-settings-workflow", {
          workflowId: workflow.workflowId,
        });
      });
      tabs.appendChild(btn);
    });
    main.appendChild(tabs);

    const descriptor = view.selectedDescriptor;
    if (!descriptor) {
      return;
    }
    const shell = el("div", "workflow-settings-shell");
    const banner = el("div", "workflow-settings-banner");
    const meta = el("div", "workflow-settings-meta");
    meta.appendChild(
      el(
        "div",
        "",
        `${labelText(labels, "workflowSettingsWorkflowLabel")}: ${descriptor.workflowLabel}`,
      ),
    );
    meta.appendChild(
      el(
        "div",
        "",
        `${labelText(labels, "workflowSettingsProviderLabel")}: ${descriptor.providerId}`,
      ),
    );

    const draft = {
      backendId: String(descriptor.selectedProfile || "").trim(),
      workflowParams: cloneRecord(descriptor.workflowParams),
      providerOptions: cloneRecord(descriptor.providerOptions),
    };
    const emitDraft = function (changeMeta) {
      const meta =
        changeMeta && typeof changeMeta === "object" ? changeMeta : {};
      sendAction("workflow-settings-draft", {
        workflowId: view.selectedWorkflowId,
        executionOptions: draft,
        changedSection:
          typeof meta.changedSection === "string" ? meta.changedSection : "",
        changedKey: typeof meta.changedKey === "string" ? meta.changedKey : "",
      });
    };

    if (descriptor.requiresBackendProfile) {
      const profileWrap = el("div", "workflow-settings-banner-profile");
      profileWrap.appendChild(
        el(
          "div",
          "workflow-settings-banner-profile-label",
          labelText(labels, "workflowSettingsProfileLabel"),
        ),
      );
      if (descriptor.profileEditable) {
        const options = (descriptor.profiles || []).map(function (entry) {
          return { value: entry.id, label: entry.label };
        });
        const customSelect = window.createCustomSelect(
          options,
          String(draft.backendId || ""),
          function (newValue) {
            draft.backendId = String(newValue || "").trim();
            emitDraft({
              changedSection: "backend",
              changedKey: "backendId",
            });
          },
        );
        const selectWrap = customSelect.element;
        selectWrap.classList.add("workflow-settings-banner-profile-select");
        profileWrap.appendChild(selectWrap);
      } else if (descriptor.profileMissing) {
        profileWrap.appendChild(
          el(
            "div",
            "workflow-settings-error",
            labelText(labels, "workflowSettingsBlockedNoProfile"),
          ),
        );
      } else {
        const fixed = (descriptor.profiles || []).find(function (entry) {
          return (
            String(entry.id || "").trim() ===
            String(descriptor.selectedProfile || "").trim()
          );
        });
        profileWrap.appendChild(
          el("div", "workflow-settings-empty", fixed ? fixed.label : "-"),
        );
      }
      banner.appendChild(profileWrap);
    }
    banner.appendChild(meta);
    shell.appendChild(banner);

    const sectionsGrid = el("div", "workflow-settings-sections-grid");
    sectionsGrid.appendChild(
      renderWorkflowSettingsSection({
        title: labelText(labels, "workflowSettingsWorkflowParamsTitle"),
        emptyText: labelText(labels, "workflowSettingsNoWorkflowParams"),
        entries: descriptor.workflowSchemaEntries || [],
        values: draft.workflowParams,
        onChange: emitDraft,
        changedSection: "workflowParams",
        labels: labels,
      }),
    );
    sectionsGrid.appendChild(
      renderWorkflowSettingsSection({
        title: labelText(labels, "workflowSettingsProviderOptionsTitle"),
        emptyText: labelText(labels, "workflowSettingsNoProviderOptions"),
        entries: descriptor.providerSchemaEntries || [],
        values: draft.providerOptions,
        onChange: emitDraft,
        changedSection: "providerOptions",
        labels: labels,
      }),
    );
    shell.appendChild(sectionsGrid);
    main.appendChild(shell);
  }

  function renderProductTreeNode(args) {
    const node = args.node;
    const product = args.product;
    const selectedAssetId = args.selectedAssetId;
    const labels = args.labels;
    const expandedPaths = args.expandedPaths;
    const level = args.level || 0;
    const wrap = el("div", "product-tree-row-wrap");
    if (node.kind === "folder") {
      const expanded = expandedPaths.has(node.path);
      const btn = el("button", "product-tree-node product-tree-folder");
      btn.type = "button";
      btn.style.setProperty("--product-tree-level", String(level));
      btn.setAttribute("aria-expanded", expanded ? "true" : "false");
      btn.title = node.path;
      btn.appendChild(
        icon(
          `zs-icon-sm product-tree-folder-icon ${
            expanded ? "zs-icon-product-folder-open" : "zs-icon-product-folder"
          }`,
        ),
      );
      btn.appendChild(el("span", "product-tree-name", node.name));
      btn.addEventListener("click", function () {
        if (expanded) {
          expandedPaths.delete(node.path);
        } else {
          expandedPaths.add(node.path);
        }
        render();
      });
      wrap.appendChild(btn);
      if (expanded) {
        node.children.forEach(function (child) {
          wrap.appendChild(
            renderProductTreeNode({
              node: child,
              product: product,
              selectedAssetId: selectedAssetId,
              labels: labels,
              expandedPaths: expandedPaths,
              level: level + 1,
            }),
          );
        });
      }
      return wrap;
    }

    const asset = node.asset || {};
    const btn = el("button", "product-tree-node product-tree-file");
    btn.type = "button";
    btn.style.setProperty("--product-tree-level", String(level));
    if (asset.assetId === selectedAssetId) {
      btn.classList.add("active");
    }
    btn.title = normalizeProductAssetPath(asset);
    btn.appendChild(
      icon(
        `zs-icon-sm product-tree-file-icon ${productFileTypeIconClass(asset)}`,
      ),
    );
    const text = el("span", "product-tree-file-text");
    text.appendChild(
      el("span", "product-tree-name", asset.label || node.name || asset.assetId),
    );
    const details = [
      normalizeProductAssetPath(asset),
      formatBytes(asset.size),
    ].filter(Boolean);
    if (details.length) {
      text.appendChild(el("span", "product-tree-meta", details.join(" · ")));
    }
    btn.appendChild(text);
    btn.addEventListener("click", function () {
      sendAction("select-product-asset", {
        productId: product.productId,
        assetId: asset.assetId,
      });
    });
    wrap.appendChild(btn);
    return wrap;
  }

  function renderProductFileTree(product, selectedAssetId, labels) {
    const wrap = el("div", "product-file-tree");
    if (!product.assets || product.assets.length === 0) {
      wrap.appendChild(
        el("div", "empty", labelText(labels, "productsNoFiles")),
      );
      return wrap;
    }
    const tree = buildProductAssetTree(product);
    const expandedPaths = getProductExpandedTreePaths(product, tree);
    tree.children.forEach(function (child) {
      wrap.appendChild(
        renderProductTreeNode({
          node: child,
          product: product,
          selectedAssetId: selectedAssetId,
          labels: labels,
          expandedPaths: expandedPaths,
          level: 0,
        }),
      );
    });
    return wrap;
  }

  function renderProductCode(text, language, labels) {
    const source = String(text || "");
    const viewer = el("div", "product-code-viewer wrap-lines");
    const resolvedLanguage = resolveHighlightLanguage(language);
    const safeLanguage = String(resolvedLanguage || "plaintext").replace(
      /[^a-z0-9_-]/gi,
      "",
    );
    viewer.classList.add("language-" + safeLanguage);

    const toolbar = el("div", "product-code-toolbar");
    const summary = el("div", "product-code-summary");
    summary.textContent = [
      safeLanguage,
      splitPreviewLines(source).length + " lines",
    ]
      .filter(Boolean)
      .join(" · ");
    toolbar.appendChild(summary);

    const actions = el("div", "product-code-actions");
    const wrapButton = el(
      "button",
      "product-code-tool active",
      labelText(labels, "productsViewerWrap", "Wrap"),
    );
    wrapButton.type = "button";
    wrapButton.setAttribute("aria-pressed", "true");
    wrapButton.addEventListener("click", function () {
      const enabled = !viewer.classList.contains("wrap-lines");
      viewer.classList.toggle("wrap-lines", enabled);
      wrapButton.classList.toggle("active", enabled);
      wrapButton.setAttribute("aria-pressed", enabled ? "true" : "false");
    });
    actions.appendChild(wrapButton);

    const copyButton = el(
      "button",
      "product-code-tool",
      labelText(labels, "productsViewerCopy", "Copy"),
    );
    copyButton.type = "button";
    copyButton.addEventListener("click", function () {
      copyTextToClipboard(source).then(
        function () {
          copyButton.textContent = labelText(
            labels,
            "productsViewerCopied",
            "Copied",
          );
          window.setTimeout(function () {
            copyButton.textContent = labelText(
              labels,
              "productsViewerCopy",
              "Copy",
            );
          }, 900);
        },
        function () {
          copyButton.textContent = labelText(
            labels,
            "productsViewerCopyFailed",
            "Copy failed",
          );
        },
      );
    });
    actions.appendChild(copyButton);
    toolbar.appendChild(actions);
    viewer.appendChild(toolbar);

    const scroller = el("div", "product-code-scroller");
    const lines = el("div", "product-code-lines");
    splitPreviewLines(source).forEach(function (line, index) {
      const row = el("div", "product-code-line");
      const number = el("span", "product-code-line-number", String(index + 1));
      const code = el("code", "product-code-line-text hljs language-" + safeLanguage);
      if (line) {
        code.innerHTML = highlightCode(line, resolvedLanguage);
      } else {
        code.appendChild(document.createElement("br"));
      }
      row.appendChild(number);
      row.appendChild(code);
      lines.appendChild(row);
    });
    scroller.appendChild(lines);
    viewer.appendChild(scroller);
    return viewer;
  }

  function renderProductMarkdown(text, labels) {
    const wrap = el("div", "product-preview-markdown");
    const parser = ensureProductMarkdownParser();
    if (parser) {
      wrap.innerHTML = parser.render(text || "");
    } else {
      wrap.appendChild(renderProductCode(text || "", "markdown", labels));
    }
    return wrap;
  }

  function renderProductPreview(preview, labels) {
    const wrap = el("div", "product-preview");
    if (!preview) {
      wrap.appendChild(
        el("div", "empty", labelText(labels, "productsSelectFile")),
      );
      return wrap;
    }
    const meta = el("div", "product-preview-meta");
    meta.textContent = [
      preview.path || "",
      preview.kind || "text",
      typeof preview.size === "number" ? preview.size + " bytes" : "",
    ]
      .filter(Boolean)
      .join(" · ");
    wrap.appendChild(meta);
    if (!preview.previewable) {
      wrap.appendChild(
        el(
          "div",
          "empty",
          preview.error || labelText(labels, "productsPreviewUnavailable"),
        ),
      );
      return wrap;
    }
    if (preview.kind === "markdown") {
      wrap.appendChild(renderProductMarkdown(preview.text || "", labels));
      const raw = el("details", "product-preview-raw");
      raw.appendChild(
        el("summary", "", labelText(labels, "productsRawMarkdown")),
      );
      raw.appendChild(renderProductCode(preview.text || "", "markdown", labels));
      wrap.appendChild(raw);
      return wrap;
    }
    wrap.appendChild(
      renderProductCode(
        preview.formattedText || preview.text || "",
        preview.language || preview.kind,
        labels,
      ),
    );
    return wrap;
  }

  function renderProducts(main, snapshot) {
    const labels = snapshot.labels || {};
    const view = snapshot.productStorageView || {};
    const section = view.section === "feedback" ? "feedback" : "products";
    const products = Array.isArray(view.products) ? view.products : [];
    const feedbackProducts = Array.isArray(view.feedbackProducts)
      ? view.feedbackProducts
      : [];
    const selectedFeedbackIds = new Set(view.selectedFeedbackProductIds || []);
    const selected = view.selectedProduct;
    const toolbar = el("div", "toolbar");
    toolbar.appendChild(
      el("h2", "page-title", labelText(labels, "tabProducts")),
    );
    const sectionTabs = el("div", "toolbar-actions product-section-tabs");
    [
      ["products", labelText(labels, "productsSectionFiles")],
      ["feedback", labelText(labels, "productsSectionFeedback")],
    ].forEach(function (entry) {
      const btn = el(
        "button",
        section === entry[0] ? "btn active" : "btn",
        entry[1],
      );
      btn.addEventListener("click", function () {
        sendAction("select-product-section", { section: entry[0] });
      });
      sectionTabs.appendChild(btn);
    });
    toolbar.appendChild(sectionTabs);
    if (section === "products" && selected) {
      const actions = el("div", "toolbar-actions");
      const openFolder = el(
        "button",
        "btn",
        labelText(labels, "productsOpenWorkspace"),
      );
      openFolder.addEventListener("click", function () {
        sendAction("open-product-folder", { productId: selected.productId });
      });
      actions.appendChild(openFolder);
      if (selected.requestId && selected.backendId) {
        const openRun = el(
          "button",
          "btn",
          labelText(labels, "productsOpenRun"),
        );
        openRun.addEventListener("click", function () {
          sendAction("open-run", {
            backendId: selected.backendId,
            requestId: selected.requestId,
          });
        });
        actions.appendChild(openRun);
      }
      const remove = el(
        "button",
        "btn danger",
        labelText(labels, "productsRemove"),
      );
      remove.addEventListener("click", function () {
        sendAction("remove-product", { productId: selected.productId });
      });
      actions.appendChild(remove);
      toolbar.appendChild(actions);
    } else if (section === "feedback") {
      const actions = el("div", "toolbar-actions");
      const filter = el("select", "input feedback-skill-filter");
      const all = el("option", "", labelText(labels, "feedbackFilterAllSkills"));
      all.value = "";
      filter.appendChild(all);
      (view.feedbackSkillOptions || []).forEach(function (skillId) {
        const option = el("option", "", skillId);
        option.value = skillId;
        filter.appendChild(option);
      });
      filter.value = view.feedbackSkillFilter || "";
      filter.setAttribute("aria-label", labelText(labels, "feedbackFilterSkill"));
      filter.addEventListener("change", function () {
        sendAction("select-feedback-skill-filter", { skillId: filter.value });
      });
      actions.appendChild(filter);
      const exportBtn = el(
        "button",
        "btn",
        labelText(labels, "feedbackExportSelected"),
      );
      exportBtn.disabled = selectedFeedbackIds.size === 0;
      exportBtn.addEventListener("click", function () {
        sendAction("export-selected-feedback");
      });
      actions.appendChild(exportBtn);
      toolbar.appendChild(actions);
    }
    main.appendChild(toolbar);
    if (section === "feedback") {
      if (feedbackProducts.length === 0) {
        main.appendChild(el("div", "empty", labelText(labels, "feedbackEmpty")));
        return;
      }
      const selectedFeedback = view.selectedFeedbackProduct;
      const visibleFeedbackIds = feedbackProducts
        .map(function (product) {
          return String(product.productId || "").trim();
        })
        .filter(Boolean);
      const selectedVisibleFeedbackCount = visibleFeedbackIds.filter(function (
        productId,
      ) {
        return selectedFeedbackIds.has(productId);
      }).length;
      const layout = el("div", "products-layout");
      const list = el("div", "product-list");
      const listHeader = el("div", "product-list-header");
      const title = el(
        "div",
        "product-list-title",
        labelText(labels, "productsSectionFeedback"),
      );
      title.appendChild(
        el("span", "product-list-count", String(feedbackProducts.length)),
      );
      listHeader.appendChild(title);
      const selectAllLabelText = labelText(labels, "feedbackSelectAll");
      const selectAll = el("label", "feedback-select-all");
      const selectAllCheckbox = el("input", "feedback-select-all-checkbox");
      selectAllCheckbox.type = "checkbox";
      selectAllCheckbox.checked =
        visibleFeedbackIds.length > 0 &&
        selectedVisibleFeedbackCount === visibleFeedbackIds.length;
      selectAllCheckbox.indeterminate =
        selectedVisibleFeedbackCount > 0 &&
        selectedVisibleFeedbackCount < visibleFeedbackIds.length;
      selectAllCheckbox.setAttribute("aria-label", selectAllLabelText);
      selectAllCheckbox.addEventListener("change", function () {
        sendAction("toggle-all-feedback-products-selected", {
          selected: selectAllCheckbox.checked,
        });
      });
      selectAll.appendChild(selectAllCheckbox);
      selectAll.appendChild(el("span", "", selectAllLabelText));
      listHeader.appendChild(selectAll);
      list.appendChild(listHeader);
      feedbackProducts.forEach(function (product) {
        const row = el("div", "product-card feedback-product-card");
        if (selectedFeedback && product.productId === selectedFeedback.productId) {
          row.classList.add("active");
        }
        const checkbox = el("input", "feedback-product-checkbox");
        checkbox.type = "checkbox";
        checkbox.checked = selectedFeedbackIds.has(product.productId);
        checkbox.addEventListener("change", function (event) {
          event.stopPropagation();
          sendAction("toggle-feedback-product-selected", {
            productId: product.productId,
            selected: checkbox.checked,
          });
        });
        row.appendChild(checkbox);
        const body = el("button", "feedback-product-body");
        body.appendChild(el("strong", "", product.title || product.productId));
        body.appendChild(
          el(
            "span",
            "product-card-meta",
            [
              product.metadata && product.metadata.skillId,
              product.workflowLabel || product.workflowId,
              formatTime(product.updatedAt),
            ]
              .filter(Boolean)
              .join(" · "),
          ),
        );
        body.addEventListener("click", function () {
          sendAction("select-feedback-product", {
            productId: product.productId,
          });
        });
        row.appendChild(body);
        list.appendChild(row);
      });
      layout.appendChild(list);
      const detail = el("div", "product-detail");
      if (selectedFeedback) {
        detail.appendChild(
          el("h3", "panel-title", selectedFeedback.title || selectedFeedback.productId),
        );
        const meta = el("div", "product-meta");
        meta.textContent = [
          selectedFeedback.metadata && selectedFeedback.metadata.skillId,
          selectedFeedback.workflowLabel || selectedFeedback.workflowId,
          selectedFeedback.backendType,
          selectedFeedback.requestId,
        ]
          .filter(Boolean)
          .join(" · ");
        detail.appendChild(meta);
        detail.appendChild(renderProductPreview(view.selectedFeedbackPreview, labels));
      }
      layout.appendChild(detail);
      main.appendChild(layout);
      return;
    }
    if (products.length === 0) {
      main.appendChild(el("div", "empty", labelText(labels, "productsEmpty")));
      return;
    }
    const layout = el("div", "products-layout");
    if (state.productsListCollapsed) {
      layout.classList.add("products-layout-collapsed");
    }
    const list = el("div", "product-list");
    const listHeader = el("div", "product-list-header");
    const listTitle = el(
      "div",
      "product-list-title",
      labelText(labels, "productsListTitle"),
    );
    listTitle.appendChild(
      el("span", "product-list-count", String(products.length)),
    );
    listHeader.appendChild(listTitle);
    const toggleList = el("button", "product-list-toggle");
    toggleList.type = "button";
    toggleList.title = state.productsListCollapsed
      ? labelText(labels, "productsListExpand")
      : labelText(labels, "productsListCollapse");
    toggleList.setAttribute("aria-label", toggleList.title);
    toggleList.appendChild(
      icon(
        `zs-icon-sm ${
          state.productsListCollapsed
            ? "zs-icon-right-panel-open"
            : "zs-icon-right-panel-close"
        }`,
      ),
    );
    toggleList.addEventListener("click", function () {
      state.productsListCollapsed = !state.productsListCollapsed;
      render();
    });
    listHeader.appendChild(toggleList);
    list.appendChild(listHeader);
    if (state.productsListCollapsed) {
      const rail = el("div", "product-list-rail");
      rail.appendChild(
        el(
          "span",
          "product-list-rail-count",
          String(products.length),
        ),
      );
      rail.appendChild(
        el(
          "span",
          "product-list-rail-label",
          labelText(labels, "productsListRail"),
        ),
      );
      if (selected) {
        rail.appendChild(
          el(
            "span",
            "product-list-rail-current",
            selected.title || selected.productId,
          ),
        );
      }
      list.appendChild(rail);
    } else {
      products.forEach(function (product) {
        const btn = el("button", "product-card");
        if (selected && product.productId === selected.productId) {
          btn.classList.add("active");
        }
        btn.appendChild(el("strong", "", product.title || product.productId));
        btn.appendChild(
          el(
            "span",
            "product-card-meta",
            [
              product.workflowLabel || product.workflowId,
              product.storageMode,
              formatTime(product.updatedAt),
            ]
              .filter(Boolean)
              .join(" · "),
          ),
        );
        btn.addEventListener("click", function () {
          sendAction("select-product", { productId: product.productId });
        });
        list.appendChild(btn);
      });
    }
    layout.appendChild(list);
    const detail = el("div", "product-detail");
    if (selected) {
      detail.appendChild(
        el("h3", "panel-title", selected.title || selected.productId),
      );
      const meta = el("div", "product-meta");
      meta.textContent = [
        selected.kind,
        selected.workflowLabel || selected.workflowId,
        selected.backendType,
        selected.storageMode,
      ]
        .filter(Boolean)
        .join(" · ");
      detail.appendChild(meta);
      const body = el("div", "product-detail-body");
      body.appendChild(
        renderProductFileTree(selected, view.selectedAssetId, labels),
      );
      body.appendChild(renderProductPreview(view.selectedPreview, labels));
      detail.appendChild(body);
    }
    layout.appendChild(detail);
    main.appendChild(layout);
  }

  function renderRuntimeLogs(main, snapshot) {
    const labels = snapshot.labels || {};
    const view = snapshot.runtimeLogsView;
    if (!view) {
      return;
    }

    const filters = view.filters || {};
    const selectedIds = new Set(view.selectedEntryIds || []);

    main.appendChild(
      el("h2", "page-title", labelText(labels, "runtimeLogsTabTitle")),
    );

    const toolbar = el("div", "toolbar logs-toolbar");

    // Filter Controls
    const filterWrap = el("div", "logs-filter-wrap");

    // Level Filters
    const levelWrap = el("div", "logs-filter-levels");
    const levels = ["Debug", "Info", "Warn", "Error"];
    const currentLevels = filters.levels || ["debug", "info", "warn", "error"];
    levels.forEach(function (levelTitle) {
      const level = String(levelTitle).toLowerCase();
      const labelNode = el("label", "logs-filter-checkbox-label");
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = currentLevels.indexOf(level) !== -1;
      checkbox.addEventListener("change", function () {
        const nextLevels = levels
          .map(function (l) {
            return String(l).toLowerCase();
          })
          .filter(function (l) {
            if (l === level) {
              return checkbox.checked;
            }
            return currentLevels.indexOf(l) !== -1;
          });
        sendAction("runtime-logs-set-filters", {
          filters: { levels: nextLevels },
        });
      });
      labelNode.appendChild(checkbox);
      labelNode.appendChild(el("span", "logs-filter-text", levelTitle));
      levelWrap.appendChild(labelNode);
    });
    filterWrap.appendChild(levelWrap);

    // Backend/Workflow Dropdown Filters
    const backendOptions = view.filterOptions?.backends || [];
    if (backendOptions.length > 0) {
      const bWrap = el("div", "logs-filter-dropdown-wrap");
      bWrap.appendChild(
        el(
          "span",
          "logs-filter-label",
          labelText(labels, "runtimeLogsFilterBackend"),
        ),
      );
      const defaultBackends = backendOptions.map(function (o) {
        return o.value;
      });
      let currentBackends = defaultBackends;
      if (filters.backendId !== undefined && filters.backendId !== null) {
        currentBackends = Array.isArray(filters.backendId)
          ? filters.backendId
          : [filters.backendId];
      }
      const bSelect = window.createMultiSelect(
        backendOptions,
        currentBackends,
        function (nextVals) {
          const payloadIds =
            nextVals.length >= backendOptions.length ? undefined : nextVals;
          sendAction("runtime-logs-set-filters", {
            filters: { backendId: payloadIds },
          });
        },
        labelText(labels, "runtimeLogsFilterAll"),
      );
      bWrap.appendChild(bSelect.element);
      filterWrap.appendChild(bWrap);
    }

    const workflowOptions = view.filterOptions?.workflows || [];
    if (workflowOptions.length > 0) {
      const wWrap = el("div", "logs-filter-dropdown-wrap");
      wWrap.appendChild(
        el(
          "span",
          "logs-filter-label",
          labelText(labels, "runtimeLogsFilterWorkflow"),
        ),
      );
      const defaultWorkflows = workflowOptions.map(function (o) {
        return o.value;
      });
      let currentWorkflows = defaultWorkflows;
      if (filters.workflowId !== undefined && filters.workflowId !== null) {
        currentWorkflows = Array.isArray(filters.workflowId)
          ? filters.workflowId
          : [filters.workflowId];
      }
      const wSelect = window.createMultiSelect(
        workflowOptions,
        currentWorkflows,
        function (nextVals) {
          const payloadIds =
            nextVals.length >= workflowOptions.length ? undefined : nextVals;
          sendAction("runtime-logs-set-filters", {
            filters: { workflowId: payloadIds },
          });
        },
        labelText(labels, "runtimeLogsFilterAll"),
      );
      wWrap.appendChild(wSelect.element);
      filterWrap.appendChild(wWrap);
    }

    // Diagnostic Toggle
    const diagWrap = el("div", "logs-filter-diagnostic");
    const diagLabelNode = el("label", "logs-filter-checkbox-label");
    const diagCheckbox = document.createElement("input");
    diagCheckbox.type = "checkbox";
    diagCheckbox.checked = view.diagnosticMode === true;
    diagCheckbox.addEventListener("change", function () {
      sendAction("runtime-logs-toggle-diagnostic", {
        enabled: diagCheckbox.checked,
      });
    });
    diagLabelNode.appendChild(diagCheckbox);
    diagLabelNode.appendChild(
      el(
        "span",
        "logs-filter-text",
        labelText(labels, "runtimeLogsDiagnosticMode"),
      ),
    );
    diagWrap.appendChild(diagLabelNode);
    filterWrap.appendChild(diagWrap);

    toolbar.appendChild(filterWrap);

    // Context Filters Display
    const contextKeys = [
      "workflowId",
      "requestId",
      "jobId",
      "backendId",
      "runId",
    ];
    const activeContextAttrs = contextKeys.filter(function (k) {
      return typeof filters[k] === "string" && filters[k];
    });

    const contextWrap = el("div", "logs-context-wrap");
    if (activeContextAttrs.length > 0) {
      contextWrap.appendChild(
        el(
          "span",
          "logs-context-label",
          labelText(labels, "runtimeLogsContextScope"),
        ),
      );
      activeContextAttrs.forEach(function (k) {
        contextWrap.appendChild(
          el("span", "logs-context-badge mono", k + "=" + filters[k]),
        );
      });
      const clearCtxBtn = el(
        "button",
        "btn clear",
        labelText(labels, "runtimeLogsClearContext"),
      );
      clearCtxBtn.addEventListener("click", function () {
        sendAction("runtime-logs-clear-context");
      });
      contextWrap.appendChild(clearCtxBtn);
    }
    toolbar.appendChild(contextWrap);

    // Action Buttons
    const actionWrap = el("div", "logs-action-wrap");

    const copyGroup = el("div", "logs-copy-group");
    const copySelectedBtn = el(
      "button",
      "btn",
      labelText(labels, "runtimeLogsCopySelected"),
    );
    copySelectedBtn.disabled = selectedIds.size === 0;
    copySelectedBtn.addEventListener("click", function () {
      sendAction("runtime-logs-copy-selected", { format: "pretty-json" });
      const msg = labels.runtimeLogsCopySuccess
        ? labels.runtimeLogsCopySuccess.replace("{ $count }", selectedIds.size)
        : "Copied " + selectedIds.size + " entries!";
      showToast(msg);
    });
    copyGroup.appendChild(copySelectedBtn);

    const copyNdjsonBtn = el(
      "button",
      "btn",
      labelText(labels, "runtimeLogsCopyVisibleNDJSON"),
    );
    copyNdjsonBtn.disabled = view.logs.length === 0;
    copyNdjsonBtn.addEventListener("click", function () {
      const ids = view.logs.map(function (l) {
        return l.id;
      });
      sendAction("runtime-logs-select-entries", { entryIds: ids });
      setTimeout(function () {
        sendAction("runtime-logs-copy-selected", { format: "ndjson" });
        const msg = labels.runtimeLogsCopySuccess
          ? labels.runtimeLogsCopySuccess.replace("{ $count }", ids.length)
          : "Copied " + ids.length + " entries!";
        showToast(msg);
      }, 50);
    });
    copyGroup.appendChild(copyNdjsonBtn);

    const copySystemDiagBtn = el(
      "button",
      "btn",
      labelText(labels, "runtimeLogsCopyDiagnosticBundle"),
    );
    copySystemDiagBtn.disabled = view.logs.length === 0;
    copySystemDiagBtn.addEventListener("click", function () {
      sendAction("runtime-logs-copy-diagnostic-bundle");
      showToast(labelText(labels, "runtimeLogsCopySuccessBundle"));
    });
    copyGroup.appendChild(copySystemDiagBtn);

    const copyIssueBtn = el(
      "button",
      "btn",
      labelText(labels, "runtimeLogsCopyIssueSummary"),
    );
    copyIssueBtn.disabled = view.logs.length === 0;
    copyIssueBtn.addEventListener("click", function () {
      sendAction("runtime-logs-copy-issue-summary");
      showToast(labelText(labels, "runtimeLogsCopySuccessIssue"));
    });
    copyGroup.appendChild(copyIssueBtn);

    actionWrap.appendChild(copyGroup);

    const clearLogsBtn = el(
      "button",
      "btn clear",
      labelText(labels, "runtimeLogsClear"),
    );
    clearLogsBtn.addEventListener("click", function () {
      if (confirm("Are you sure you want to clear all runtime logs?")) {
        sendAction("runtime-logs-clear");
      }
    });
    actionWrap.appendChild(clearLogsBtn);
    toolbar.appendChild(actionWrap);
    main.appendChild(toolbar);

    // Split View layout
    const splitView = el("div", "logs-split-view");

    // Left: List
    const listPane = el("div", "logs-list-pane");

    // Table rendering for Logs
    const isAllSelected =
      view.logs.length > 0 &&
      view.logs.every(function (l) {
        return selectedIds.has(l.id);
      });
    const selectAllObj = { checked: isAllSelected };

    const tableWrap = el("div", "table-wrap logs-table-wrap");
    tableWrap.addEventListener("scroll", function () {
      state.logsScrollTop = tableWrap.scrollTop || 0;
    });

    const table = document.createElement("table");
    table.className = "logs-table";

    const thead = document.createElement("thead");
    const headRow = document.createElement("tr");

    const thCheck = document.createElement("th");
    thCheck.className = "col-check";
    const selectAllCb = document.createElement("input");
    selectAllCb.type = "checkbox";
    selectAllCb.checked = selectAllObj.checked;
    selectAllCb.addEventListener("change", function () {
      const isChecked = selectAllCb.checked;
      const nextIds = isChecked
        ? view.logs.map(function (l) {
            return l.id;
          })
        : [];
      sendAction("runtime-logs-select-entries", { entryIds: nextIds });
    });
    thCheck.appendChild(selectAllCb);
    headRow.appendChild(thCheck);

    const columns = [
      labelText(labels, "colTime"),
      labelText(labels, "colLevel"),
      labelText(labels, "colStage"),
      labelText(labels, "colScope"),
      labelText(labels, "colMessage"),
    ];
    columns.forEach(function (title) {
      const th = document.createElement("th");
      th.textContent = title;
      headRow.appendChild(th);
    });
    thead.appendChild(headRow);
    table.appendChild(thead);

    const tbody = document.createElement("tbody");
    if (view.logs.length === 0) {
      const emptyTr = document.createElement("tr");
      const emptyTd = document.createElement("td");
      emptyTd.colSpan = columns.length + 1;
      emptyTd.className = "empty";
      emptyTd.textContent = labelText(labels, "logsEmpty");
      emptyTr.appendChild(emptyTd);
      tbody.appendChild(emptyTr);
    }

    let rowToAutoSelectDetails = null;

    view.logs.forEach(function (row) {
      const tr = document.createElement("tr");
      tr.className = "log-row";
      if (selectedIds.has(row.id)) {
        tr.classList.add("selected");
      }
      if (state.logsActiveReadingId === row.id) {
        tr.classList.add("reading");
        rowToAutoSelectDetails = row;
      }

      const checkCell = document.createElement("td");
      checkCell.className = "col-check";
      checkCell.addEventListener("click", function (e) {
        e.stopPropagation(); // prevent row click
      });
      const rowCb = document.createElement("input");
      rowCb.type = "checkbox";
      rowCb.checked = selectedIds.has(row.id);
      rowCb.addEventListener("change", function (e) {
        e.stopPropagation();
        const nextIds = new Set(selectedIds);
        if (rowCb.checked) {
          nextIds.add(row.id);
        } else {
          nextIds.delete(row.id);
        }
        sendAction("runtime-logs-select-entries", {
          entryIds: Array.from(nextIds),
        });
      });
      checkCell.appendChild(rowCb);
      tr.appendChild(checkCell);

      [
        { node: el("td", "mono", formatMillis(row.ts)) },
        {
          node: el("td", "", "").appendChild(
            renderStatusBadge(row.level, String(row.level || "").toUpperCase()),
          ).parentNode,
        },
        { node: el("td", "", row.stage || "-") },
        { node: el("td", "", row.scope || "-") },
        { node: el("td", "log-message-cell", row.message || "-") },
      ].forEach(function (item) {
        tr.appendChild(item.node);
      });

      tr.addEventListener("click", function () {
        // Toggle reading panel
        const siblings = tbody.querySelectorAll("tr");
        siblings.forEach(function (sib) {
          sib.classList.remove("reading");
        });
        tr.classList.add("reading");
        if (state.logsActiveReadingId !== row.id) {
          state.logsDetailScrollTop = 0;
        }
        state.logsActiveReadingId = row.id;

        // Render detail panel
        renderDetailPanel(row);
      });

      tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    tableWrap.appendChild(table);
    listPane.appendChild(tableWrap);
    splitView.appendChild(listPane);

    // Right: Detail Panel
    const detailPane = el("div", "logs-detail-pane");

    function renderDetailPanel(rowEntry) {
      clearNode(detailPane);
      if (!rowEntry) {
        detailPane.appendChild(
          el(
            "div",
            "logs-detail-empty",
            labelText(labels, "runtimeLogsSelectToView"),
          ),
        );
        return;
      }
      detailPane.classList.add("visible");

      const header = el("div", "logs-detail-header");
      header.appendChild(
        el("h3", "", `${labelText(labels, "logsDetailTitle")} `),
      );
      const closeBtn = el(
        "button",
        "btn clear logs-detail-close",
        labelText(labels, "logsDetailClose"),
      );
      closeBtn.addEventListener("click", function () {
        clearNode(detailPane);
        detailPane.classList.remove("visible");
        const actNode = tbody.querySelector("tr.reading");
        if (actNode) actNode.classList.remove("reading");
        state.logsActiveReadingId = null;
        state.logsDetailScrollTop = 0;
      });
      header.appendChild(closeBtn);
      detailPane.appendChild(header);

      const contentWrap = el("div", "logs-detail-content");

      if (rowEntry.error && rowEntry.error.message) {
        contentWrap.appendChild(
          el("h4", "error-title", labelText(labels, "logsException")),
        );
        contentWrap.appendChild(
          el("pre", "log-error mono", rowEntry.error.message),
        );
        if (rowEntry.error.stack) {
          contentWrap.appendChild(
            el("pre", "log-stack mono", rowEntry.error.stack),
          );
        }
      }

      const preObj = el("pre", "log-view mono");
      preObj.className = "log-view mono payload-view";
      preObj.textContent = JSON.stringify(rowEntry.detailPayload, null, 2);
      contentWrap.appendChild(preObj);

      preObj.addEventListener("scroll", function () {
        state.logsDetailScrollTop = preObj.scrollTop || 0;
      });

      detailPane.appendChild(contentWrap);

      if (state.logsDetailScrollTop > 0) {
        setTimeout(function () {
          preObj.scrollTop = state.logsDetailScrollTop;
        }, 0);
      }
    }

    renderDetailPanel(rowToAutoSelectDetails); // initial empty state or restored state
    splitView.appendChild(detailPane);

    main.appendChild(splitView);
  }

  function render() {
    const app = document.getElementById("app");
    if (!app) {
      return;
    }
    const snapshot = state.snapshot;

    // Fast path: Incremental DOM replacement for logs to prevent scroll flicker
    if (
      snapshot &&
      snapshot.selectedTabKey === "runtime-logs" &&
      state.previousTabKey === "runtime-logs"
    ) {
      const main = app.querySelector("main");
      const tableWrap = main ? main.querySelector(".logs-table-wrap") : null;
      if (main && tableWrap) {
        const currentScroll = tableWrap.scrollTop;

        const tempMain = document.createElement("main");
        renderRuntimeLogs(tempMain, snapshot);

        const oldToolbar = main.querySelector(".logs-toolbar");
        const newToolbar = tempMain.querySelector(".logs-toolbar");
        if (oldToolbar && newToolbar) {
          // Replace specific sub-sections instead of wiping the entire logs-toolbar. This retains .logs-filter-wrap DOM so custom-select isn't closed aggressively.
          const oldContextWrap = oldToolbar.querySelector(".logs-context-wrap");
          const newContextWrap = newToolbar.querySelector(".logs-context-wrap");
          if (oldContextWrap && newContextWrap)
            oldToolbar.replaceChild(newContextWrap, oldContextWrap);
          else if (!oldContextWrap && newContextWrap)
            oldToolbar.appendChild(newContextWrap);
          else if (oldContextWrap && !newContextWrap) oldContextWrap.remove();

          const oldActionWrap = oldToolbar.querySelector(".logs-action-wrap");
          const newActionWrap = newToolbar.querySelector(".logs-action-wrap");
          if (oldActionWrap && newActionWrap)
            oldToolbar.replaceChild(newActionWrap, oldActionWrap);
          else if (!oldActionWrap && newActionWrap)
            oldToolbar.appendChild(newActionWrap);
          else if (oldActionWrap && !newActionWrap) oldActionWrap.remove();
        }

        const oldTable = main.querySelector(".logs-table");
        const newTable = tempMain.querySelector(".logs-table");
        if (oldTable && newTable) {
          const oldThead = oldTable.querySelector("thead");
          const newThead = newTable.querySelector("thead");
          if (oldThead && newThead) oldTable.replaceChild(newThead, oldThead);

          const oldTbody = oldTable.querySelector("tbody");
          const newTbody = newTable.querySelector("tbody");
          if (oldTbody && newTbody) oldTable.replaceChild(newTbody, oldTbody);
        }

        const oldDetail = main.querySelector(".logs-detail-pane");
        const newDetail = tempMain.querySelector(".logs-detail-pane");
        if (oldDetail && newDetail) {
          const oldPayloadView = oldDetail.querySelector(".payload-view");
          const detailScroll = oldPayloadView ? oldPayloadView.scrollTop : 0;
          oldDetail.parentNode.replaceChild(newDetail, oldDetail);
          const newPayloadView = newDetail.querySelector(".payload-view");
          if (newPayloadView) {
            newPayloadView.scrollTop = detailScroll;
            state.logsDetailScrollTop = detailScroll;
          }
        }

        tableWrap.scrollTop = currentScroll;
        state.logsScrollTop = currentScroll;
        rememberSnapshotRenderSignature(snapshot);
        return;
      }
    }

    state.previousTabKey = snapshot ? snapshot.selectedTabKey : null;

    const shouldRestoreWorkflowOptionsScroll = Boolean(
      snapshot && snapshot.selectedTabKey === "workflow-options",
    );
    let previousMainScrollTop = 0;
    if (shouldRestoreWorkflowOptionsScroll) {
      const existingMain = app.querySelector(".main");
      if (
        existingMain &&
        typeof existingMain.scrollTop === "number" &&
        Number.isFinite(existingMain.scrollTop)
      ) {
        previousMainScrollTop = existingMain.scrollTop;
      }
    }
    const shouldRestoreHomeDocScroll = Boolean(
      snapshot &&
      snapshot.selectedTabKey === "home" &&
      snapshot.homeWorkflowDocView,
    );
    const shouldRestoreHomeRunningScroll = Boolean(
      snapshot &&
      snapshot.selectedTabKey === "home" &&
      !snapshot.homeWorkflowDocView,
    );
    const shouldRestoreBackendTaskScroll = Boolean(
      snapshot &&
      typeof snapshot.selectedTabKey === "string" &&
      snapshot.selectedTabKey.indexOf("backend:") === 0,
    );
    let previousHomeDocScrollTop = 0;
    let previousHomeRunningScrollTop = 0;
    let previousBackendTaskScrollTop = 0;
    if (shouldRestoreHomeDocScroll) {
      const existingDoc = app.querySelector(".workflow-doc-content");
      const requestedWorkflowId = String(
        (snapshot.homeWorkflowDocView &&
          snapshot.homeWorkflowDocView.workflowId) ||
          "",
      );
      if (
        existingDoc &&
        typeof existingDoc.scrollTop === "number" &&
        Number.isFinite(existingDoc.scrollTop)
      ) {
        const existingWorkflowId = String(
          existingDoc.getAttribute("data-workflow-id") || "",
        ).trim();
        if (existingWorkflowId === requestedWorkflowId) {
          previousHomeDocScrollTop = existingDoc.scrollTop;
        }
      } else if (
        state.homeDocWorkflowId &&
        state.homeDocWorkflowId === requestedWorkflowId &&
        Number.isFinite(state.homeDocScrollTop)
      ) {
        previousHomeDocScrollTop = state.homeDocScrollTop;
      }
    }
    if (shouldRestoreHomeRunningScroll) {
      const existingRunningWrap = app.querySelector(".home-running-table-wrap");
      if (
        existingRunningWrap &&
        typeof existingRunningWrap.scrollTop === "number" &&
        Number.isFinite(existingRunningWrap.scrollTop)
      ) {
        previousHomeRunningScrollTop = existingRunningWrap.scrollTop;
      } else if (Number.isFinite(state.homeRunningScrollTop)) {
        previousHomeRunningScrollTop = state.homeRunningScrollTop;
      }
    }
    if (shouldRestoreBackendTaskScroll) {
      const existingBackendWrap = app.querySelector(".backend-task-table-wrap");
      const currentTabKey = String(snapshot.selectedTabKey || "").trim();
      if (
        existingBackendWrap &&
        typeof existingBackendWrap.scrollTop === "number" &&
        Number.isFinite(existingBackendWrap.scrollTop)
      ) {
        previousBackendTaskScrollTop = existingBackendWrap.scrollTop;
      } else if (
        Number.isFinite(state.backendTaskScrollTopByTabKey[currentTabKey])
      ) {
        previousBackendTaskScrollTop =
          state.backendTaskScrollTopByTabKey[currentTabKey];
      }
    }
    const shell = ensureDashboardShell(app);
    const sidebar = shell.sidebar;
    const main = shell.main;
    clearNode(sidebar);
    clearNode(main);
    main.className = "main";
    if (!snapshot) {
      main.appendChild(
        el(
          "div",
          "empty",
          labelText(
            state.snapshot && state.snapshot.labels,
            "loadingDashboard",
          ),
        ),
      );
      rememberSnapshotRenderSignature(snapshot);
      return;
    }

    document.title = snapshot.title || labelText(snapshot.labels, "tabHome");

    sidebar.appendChild(
      el("h3", "sidebar-title", labelText(snapshot.labels, "tabHome")),
    );
    const tabs = Array.isArray(snapshot.tabs) ? snapshot.tabs : [];
    if (tabs.length === 0) {
      sidebar.appendChild(el("div", "empty", snapshot.labels.noBackends));
    } else {
      const homeTab = tabs.find((tab) => tab.key === "home");
      if (homeTab) {
        const btn = createTabButton(homeTab, snapshot);
        btn.addEventListener("click", function () {
          sendAction("select-tab", {
            tabKey: homeTab.key,
          });
        });
        sidebar.appendChild(btn);
      }
      const workflowOptionsTab = tabs.find(
        (tab) => tab.key === "workflow-options",
      );
      if (workflowOptionsTab) {
        const btn = createTabButton(workflowOptionsTab, snapshot);
        btn.addEventListener("click", function () {
          sendAction("select-tab", {
            tabKey: workflowOptionsTab.key,
          });
        });
        sidebar.appendChild(btn);
      }
      const productsTab = tabs.find((tab) => tab.key === "products");
      if (productsTab) {
        const btn = createTabButton(productsTab, snapshot);
        btn.addEventListener("click", function () {
          sendAction("select-tab", {
            tabKey: productsTab.key,
          });
        });
        sidebar.appendChild(btn);
      }
      const runtimeLogsTab = tabs.find((tab) => tab.key === "runtime-logs");
      if (runtimeLogsTab) {
        const btn = createTabButton(runtimeLogsTab, snapshot);
        btn.addEventListener("click", function () {
          sendAction("select-tab", {
            tabKey: runtimeLogsTab.key,
          });
        });
        sidebar.appendChild(btn);
      }
      const divider = el("div", "tab-divider");
      sidebar.appendChild(divider);
      sidebar.appendChild(
        el("h3", "sidebar-title", labelText(snapshot.labels, "tabBackends")),
      );
      tabs
        .filter(
          (tab) =>
            tab.key !== "home" &&
            tab.key !== "workflow-options" &&
            tab.key !== "products" &&
            tab.key !== "runtime-logs",
        )
        .forEach(function (tab) {
          const isDisabled = tab.disabled === true;
          const btn = createTabButton(tab, snapshot);
          if (isDisabled) {
            btn.classList.add("disabled");
            btn.disabled = true;
            const unavailableTag = document.createElement("span");
            unavailableTag.className = "tab-disabled-tag";
            unavailableTag.textContent =
              (snapshot.labels && snapshot.labels.backendUnavailableTag) ||
              "Unavailable";
            btn.appendChild(unavailableTag);
            if (
              typeof tab.disabledReason === "string" &&
              tab.disabledReason.trim()
            ) {
              btn.title = tab.disabledReason.trim();
            }
          } else {
            btn.addEventListener("click", function () {
              sendAction("select-tab", {
                tabKey: tab.key,
              });
            });
          }
          sidebar.appendChild(btn);
        });
    }
    if (snapshot.backendLoadError) {
      main.appendChild(el("div", "error-banner", snapshot.backendLoadError));
    }
    if (snapshot.selectedTabKey === "home") {
      main.appendChild(el("h2", "page-title", snapshot.title));
      if (snapshot.homeWorkflowDocView) {
        main.classList.add("skillrunner-fill");
        renderHomeWorkflowDoc(main, snapshot);
      } else {
        renderSummary(main, snapshot);
      }
    } else if (snapshot.selectedTabKey === "workflow-options") {
      renderWorkflowOptions(main, snapshot);
    } else if (snapshot.selectedTabKey === "products") {
      main.classList.add("skillrunner-fill");
      renderProducts(main, snapshot);
    } else if (snapshot.selectedTabKey === "runtime-logs") {
      main.classList.add("skillrunner-fill"); // reuse the full-height flex config
      renderRuntimeLogs(main, snapshot);
    } else if (
      snapshot.backendView &&
      snapshot.backendView.backendType === "skillrunner"
    ) {
      main.classList.add("skillrunner-fill");
      renderSkillRunnerBackend(main, snapshot);
    } else if (
      snapshot.backendView &&
      snapshot.backendView.backendType === "acp"
    ) {
      main.classList.add("skillrunner-fill");
      renderAcpSkillRunnerBackend(main, snapshot);
    } else {
      renderGenericBackend(main, snapshot);
    }
    if (shouldRestoreWorkflowOptionsScroll && previousMainScrollTop > 0) {
      main.scrollTop = previousMainScrollTop;
    }
    if (shouldRestoreHomeDocScroll && previousHomeDocScrollTop > 0) {
      const nextDoc = main.querySelector(".workflow-doc-content");
      if (nextDoc) {
        nextDoc.scrollTop = previousHomeDocScrollTop;
      }
    }
    if (shouldRestoreHomeRunningScroll && previousHomeRunningScrollTop > 0) {
      const nextRunningWrap = main.querySelector(".home-running-table-wrap");
      if (nextRunningWrap) {
        nextRunningWrap.scrollTop = previousHomeRunningScrollTop;
        state.homeRunningScrollTop = previousHomeRunningScrollTop;
      }
    } else if (
      snapshot.selectedTabKey !== "home" ||
      snapshot.homeWorkflowDocView
    ) {
      state.homeRunningScrollTop = 0;
    }
    if (shouldRestoreBackendTaskScroll && previousBackendTaskScrollTop > 0) {
      const nextBackendWrap = main.querySelector(".backend-task-table-wrap");
      if (nextBackendWrap) {
        nextBackendWrap.scrollTop = previousBackendTaskScrollTop;
        state.backendTaskScrollTopByTabKey[
          String(snapshot.selectedTabKey || "")
        ] = previousBackendTaskScrollTop;
      }
    }
    rememberSnapshotRenderSignature(snapshot);

    // Synchronously restore scroll layout in the same frame for runtime logs
    if (snapshot.selectedTabKey === "runtime-logs" && state.logsScrollTop > 0) {
      const logsTableWrap = main.querySelector(".logs-table-wrap");
      if (logsTableWrap) {
        logsTableWrap.scrollTop = state.logsScrollTop;
      }
    }
  }

  window.addEventListener("message", function (event) {
    const data = event.data;
    if (!data || typeof data !== "object") {
      return;
    }
    if (data.type === "dashboard:init" || data.type === "dashboard:snapshot") {
      const nextSnapshot = data.payload || null;
      if (
        data.type === "dashboard:snapshot" &&
        shouldSkipUnchangedSnapshotRender(nextSnapshot)
      ) {
        state.snapshot = nextSnapshot;
        return;
      }
      state.snapshot = nextSnapshot;
      render();
    }
  });

  sendAction("ready", {});
  render();
})();
