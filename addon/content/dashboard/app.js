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

  function labelText(labels, key, fallback) {
    const text = String((labels && labels[key]) || "").trim();
    if (text && !/^task-dashboard-[a-z0-9-]+$/i.test(text)) {
      return text;
    }
    return fallback;
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
      labels.colActions || "Actions",
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
        el("h3", "section-title", labels.homeWorkflowTitle || "Workflows"),
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
              labels.homeWorkflowBuiltinBadge || "Builtin",
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
        const runLabel = labels.homeWorkflowRunButton || "Run workflow";
        const runDisabledReason = workflow.quickRunDisabledReason || "";
        runButton.setAttribute(
          "title",
          workflow.quickRunEnabled === true
            ? runLabel
            : runDisabledReason || runLabel,
        );
        runButton.setAttribute("aria-label", runLabel);
        runButton.disabled = workflow.quickRunEnabled !== true;
        const runIcon = el(
          "span",
          "workflow-bubble-icon workflow-bubble-icon-run",
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
          labels.homeWorkflowDocButton || "Description",
        );
        docButton.setAttribute(
          "aria-label",
          labels.homeWorkflowDocButton || "Description",
        );
        const docIcon = el(
          "span",
          "workflow-bubble-icon workflow-bubble-icon-doc",
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
          labels.homeWorkflowSettingsButton || "Settings",
        );
        settingsButton.setAttribute(
          "aria-label",
          labels.homeWorkflowSettingsButton || "Settings",
        );
        const settingsIcon = el(
          "span",
          "workflow-bubble-icon workflow-bubble-icon-settings",
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
      el("h3", "section-title", labels.homeSummaryTitle || "Task Summary"),
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
          labels.colBackend || "Backend",
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
        el(
          "div",
          "empty",
          labels.homeWorkflowDocMissingReadme ||
            "README.md was not found for this workflow.",
        ),
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
      labels.homeWorkflowDocBack || "Back to Dashboard",
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
      labels.logsOpenDiagnostics || "Diagnostic Export",
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
            const openRun = el("button", "btn", labels.openRun || "Open Run");
            openRun.addEventListener("click", function () {
              sendAction("open-run", {
                backendId: backend.backendId,
                requestId: row.requestId,
              });
            });
            actions.push(openRun);
            const cancelRun = el("button", "btn", labels.cancelRun || "Cancel");
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
        labels.closeManagement || "Back to Runs",
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
        labels.openManagementExternal || "Open in Browser",
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
      labels.refreshModelCache || "Refresh Model Cache",
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
          labels.colEngine || "Engine",
          labels.colStatus,
          labels.colRequestId,
          labels.colUpdatedAt,
          labels.colActions || "Actions",
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
        el(
          "div",
          "error-banner",
          labels.managementLoadFailed || "Management UI failed to load.",
        ),
      );
      main.appendChild(panel);
      return;
    }
    const mount = el("div", "management-host-mount");
    mount.setAttribute("data-zs-role", "skillrunner-management-dashboard-host");
    mount.dataset.backendId = backend.backendId || "";
    mount.dataset.managementUiUrl = managementUrl;
    mount.appendChild(
      el("div", "management-host-loading", "Loading management UI..."),
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
    const openRuns = el("button", "btn", labels.openRun || "Open Runs");
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
          labels.colEngine || "Engine",
          labels.colStatus,
          labels.colRequestId,
          labels.colUpdatedAt,
          labels.colActions || "Actions",
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
            const openRun = el("button", "btn", labels.openRun || "Open Run");
            openRun.addEventListener("click", function () {
              sendAction("open-run", {
                backendId: backend.backendId,
                requestId: row.requestId,
              });
            });
            actionsWrap.appendChild(openRun);
            const cancelRun = el("button", "btn", labels.cancelRun || "Cancel");
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
        message:
          args.labels.workflowSettingsNumberInvalid ||
          "Please enter a valid number.",
      };
    }
    if (isPositiveIntegerField(args.entry)) {
      if (!Number.isInteger(parsed) || parsed <= 0) {
        return {
          ok: false,
          message:
            args.labels.workflowSettingsPositiveIntegerRequired ||
            "Please enter a positive integer.",
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
      el("h2", "page-title", labels.tabWorkflowOptions || "Workflow Options"),
    );
    const workflows = Array.isArray(view.workflows) ? view.workflows : [];
    if (workflows.length === 0) {
      main.appendChild(
        el(
          "div",
          "empty",
          labels.workflowSettingsNoConfigurable || "No configurable workflows.",
        ),
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
        `${labels.workflowSettingsWorkflowLabel || "Workflow"}: ${descriptor.workflowLabel}`,
      ),
    );
    meta.appendChild(
      el(
        "div",
        "",
        `${labels.workflowSettingsProviderLabel || "Provider"}: ${descriptor.providerId}`,
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
          labels.workflowSettingsProfileLabel || "Profile",
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
            labels.workflowSettingsBlockedNoProfile ||
              "No backend profile available. Please configure one first.",
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
        title:
          labels.workflowSettingsWorkflowParamsTitle || "Workflow Parameters",
        emptyText:
          labels.workflowSettingsNoWorkflowParams ||
          "This workflow has no configurable parameters.",
        entries: descriptor.workflowSchemaEntries || [],
        values: draft.workflowParams,
        onChange: emitDraft,
        changedSection: "workflowParams",
        labels: labels,
      }),
    );
    sectionsGrid.appendChild(
      renderWorkflowSettingsSection({
        title:
          labels.workflowSettingsProviderOptionsTitle ||
          "Provider Runtime Options",
        emptyText:
          labels.workflowSettingsNoProviderOptions ||
          "This provider has no configurable runtime options.",
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

  function renderProductFileTree(product, selectedAssetId) {
    const wrap = el("div", "product-file-tree");
    (product.assets || []).forEach(function (asset) {
      const btn = el(
        "button",
        "product-file-node",
        asset.label || asset.path || asset.assetId,
      );
      if (asset.assetId === selectedAssetId) {
        btn.classList.add("active");
      }
      btn.appendChild(
        el("span", "product-file-path", asset.path || asset.relativePath || ""),
      );
      btn.addEventListener("click", function () {
        sendAction("select-product-asset", {
          productId: product.productId,
          assetId: asset.assetId,
        });
      });
      wrap.appendChild(btn);
    });
    if (!product.assets || product.assets.length === 0) {
      wrap.appendChild(el("div", "empty", "No product files."));
    }
    return wrap;
  }

  function renderProductCode(text, language) {
    const pre = el("pre", "product-preview-code");
    pre.classList.add(
      "lang-" + String(language || "text").replace(/[^a-z0-9_-]/gi, ""),
    );
    pre.textContent = text || "";
    return pre;
  }

  function renderProductMarkdown(text) {
    const wrap = el("div", "product-preview-markdown");
    if (typeof window.markdownit === "function") {
      const parser = window.markdownit({
        html: false,
        linkify: true,
        breaks: false,
      });
      wrap.innerHTML = parser.render(text || "");
    } else {
      wrap.appendChild(renderProductCode(text || "", "markdown"));
    }
    return wrap;
  }

  function renderProductPreview(preview, labels) {
    const wrap = el("div", "product-preview");
    if (!preview) {
      wrap.appendChild(
        el(
          "div",
          "empty",
          labelText(labels, "productsSelectFile", "Select a file to preview."),
        ),
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
          preview.error ||
            labelText(
              labels,
              "productsPreviewUnavailable",
              "Preview unavailable.",
            ),
        ),
      );
      return wrap;
    }
    if (preview.kind === "markdown") {
      wrap.appendChild(renderProductMarkdown(preview.text || ""));
      const raw = el("details", "product-preview-raw");
      raw.appendChild(el("summary", "", "Raw Markdown"));
      raw.appendChild(renderProductCode(preview.text || "", "markdown"));
      wrap.appendChild(raw);
      return wrap;
    }
    wrap.appendChild(
      renderProductCode(
        preview.formattedText || preview.text || "",
        preview.language || preview.kind,
      ),
    );
    return wrap;
  }

  function renderProducts(main, snapshot) {
    const labels = snapshot.labels || {};
    const view = snapshot.productStorageView || {};
    const products = Array.isArray(view.products) ? view.products : [];
    const selected = view.selectedProduct;
    const toolbar = el("div", "toolbar");
    toolbar.appendChild(
      el("h2", "page-title", labelText(labels, "tabProducts", "Products")),
    );
    if (selected) {
      const actions = el("div", "toolbar-actions");
      const openFolder = el(
        "button",
        "btn",
        labelText(labels, "productsOpenWorkspace", "Open Folder"),
      );
      openFolder.addEventListener("click", function () {
        sendAction("open-product-folder", { productId: selected.productId });
      });
      actions.appendChild(openFolder);
      if (selected.requestId && selected.backendId) {
        const openRun = el(
          "button",
          "btn",
          labelText(labels, "productsOpenRun", "Open Run"),
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
        labelText(labels, "productsRemove", "Remove"),
      );
      remove.addEventListener("click", function () {
        sendAction("remove-product", { productId: selected.productId });
      });
      actions.appendChild(remove);
      toolbar.appendChild(actions);
    }
    main.appendChild(toolbar);
    if (products.length === 0) {
      main.appendChild(
        el(
          "div",
          "empty",
          labelText(
            labels,
            "productsEmpty",
            "No workflow products have been registered yet.",
          ),
        ),
      );
      return;
    }
    const layout = el("div", "products-layout");
    const list = el("div", "product-list");
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
      body.appendChild(renderProductFileTree(selected, view.selectedAssetId));
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
      el("h2", "page-title", labels.runtimeLogsTabTitle || "Runtime Logs"),
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
          labels.runtimeLogsFilterBackend || "Backend",
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
        labels.runtimeLogsFilterAll || "All",
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
          labels.runtimeLogsFilterWorkflow || "Workflow",
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
        labels.runtimeLogsFilterAll || "All",
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
        labels.runtimeLogsDiagnosticMode || "Diagnostic Mode",
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
          labels.runtimeLogsContextScope || "Active Context Filters: ",
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
        labels.runtimeLogsClearContext || "Clear Context",
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
      labels.runtimeLogsCopySelected || "Copy Selected",
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
      labels.runtimeLogsCopyVisibleNDJSON || "Copy Visible (NDJSON)",
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
      labels.runtimeLogsCopyDiagnosticBundle || "Copy Diagnostic Bundle",
    );
    copySystemDiagBtn.disabled = view.logs.length === 0;
    copySystemDiagBtn.addEventListener("click", function () {
      sendAction("runtime-logs-copy-diagnostic-bundle");
      showToast(
        labels.runtimeLogsCopySuccessBundle || "Diagnostic bundle copied!",
      );
    });
    copyGroup.appendChild(copySystemDiagBtn);

    const copyIssueBtn = el(
      "button",
      "btn",
      labels.runtimeLogsCopyIssueSummary || "Copy Issue Summary",
    );
    copyIssueBtn.disabled = view.logs.length === 0;
    copyIssueBtn.addEventListener("click", function () {
      sendAction("runtime-logs-copy-issue-summary");
      showToast(labels.runtimeLogsCopySuccessIssue || "Issue summary copied!");
    });
    copyGroup.appendChild(copyIssueBtn);

    actionWrap.appendChild(copyGroup);

    const clearLogsBtn = el(
      "button",
      "btn clear",
      labels.runtimeLogsClear || "Clear Logs",
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
      labels.colTime || "Time",
      labels.colLevel || "Level",
      labels.colStage || "Stage",
      labels.colScope || "Scope",
      labels.colMessage || "Message",
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
      emptyTd.textContent = labels.logsEmpty || "No runtime logs captured.";
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
            labels.runtimeLogsSelectToView ||
              "Select a log entry to view details.",
          ),
        );
        return;
      }
      detailPane.classList.add("visible");

      const header = el("div", "logs-detail-header");
      header.appendChild(
        el("h3", "", `${labels.logsDetailTitle || "Log Details"} `),
      );
      const closeBtn = el("button", "btn clear logs-detail-close", "Close");
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
        contentWrap.appendChild(el("h4", "error-title", "Exception"));
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
    clearNode(app);
    if (!snapshot) {
      const loading = el("div", "main");
      loading.appendChild(el("div", "empty", "Loading dashboard..."));
      app.appendChild(el("aside", "sidebar"));
      app.appendChild(loading);
      return;
    }

    document.title = snapshot.title || "Task Dashboard";

    const sidebar = el("aside", "sidebar");
    sidebar.appendChild(
      el("h3", "sidebar-title", snapshot.labels.tabHome || "Home"),
    );
    const tabs = Array.isArray(snapshot.tabs) ? snapshot.tabs : [];
    if (tabs.length === 0) {
      sidebar.appendChild(el("div", "empty", snapshot.labels.noBackends));
    } else {
      const homeTab = tabs.find((tab) => tab.key === "home");
      if (homeTab) {
        const btn = el("button", "tab-btn", homeTab.label || homeTab.key);
        if (homeTab.key === snapshot.selectedTabKey) {
          btn.classList.add("active");
        }
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
        const btn = el(
          "button",
          "tab-btn",
          workflowOptionsTab.label || workflowOptionsTab.key,
        );
        if (workflowOptionsTab.key === snapshot.selectedTabKey) {
          btn.classList.add("active");
        }
        btn.addEventListener("click", function () {
          sendAction("select-tab", {
            tabKey: workflowOptionsTab.key,
          });
        });
        sidebar.appendChild(btn);
      }
      const productsTab = tabs.find((tab) => tab.key === "products");
      if (productsTab) {
        const btn = el(
          "button",
          "tab-btn",
          productsTab.label || productsTab.key,
        );
        if (productsTab.key === snapshot.selectedTabKey) {
          btn.classList.add("active");
        }
        btn.addEventListener("click", function () {
          sendAction("select-tab", {
            tabKey: productsTab.key,
          });
        });
        sidebar.appendChild(btn);
      }
      const runtimeLogsTab = tabs.find((tab) => tab.key === "runtime-logs");
      if (runtimeLogsTab) {
        const btn = el(
          "button",
          "tab-btn",
          runtimeLogsTab.label || runtimeLogsTab.key,
        );
        if (runtimeLogsTab.key === snapshot.selectedTabKey) {
          btn.classList.add("active");
        }
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
        el("h3", "sidebar-title", snapshot.labels.tabBackends || "Backends"),
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
          const btn = el("button", "tab-btn", tab.label || tab.key);
          if (tab.key === snapshot.selectedTabKey) {
            btn.classList.add("active");
          }
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
    app.appendChild(sidebar);

    const main = el("main", "main");
    main.classList.remove("skillrunner-fill");
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
    app.appendChild(main);
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
      state.snapshot = data.payload || null;
      render();
    }
  });

  sendAction("ready", {});
  render();
})();
