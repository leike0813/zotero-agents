(function () {
  const state = {
    snapshot: null,
  };

  function sendAction(action, payload) {
    const message = {
      type: "synthesis:action",
      action,
      payload: payload || {},
    };
    const targets = [window.parent, window.top, window.opener];
    const seen = new Set();
    targets.forEach(function (target) {
      if (!target || seen.has(target)) {
        return;
      }
      seen.add(target);
      try {
        target.postMessage(message, "*");
      } catch {
        // ignore bridge target failures
      }
    });
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

  function clear(node) {
    while (node.firstChild) {
      node.removeChild(node.firstChild);
    }
  }

  function badge(text, tone) {
    return el("span", "badge " + (tone || ""), text || "-");
  }

  function toneFor(value) {
    if (value === "ready" || value === "fresh" || value === "complete") {
      return "ok";
    }
    if (value === "missing" || value === "stale") {
      return "danger";
    }
    return "warn";
  }

  function makeButton(label, action, payload, active) {
    const button = el("button", active ? "active" : "", label);
    button.type = "button";
    button.addEventListener("click", function () {
      sendAction(action, payload);
    });
    return button;
  }

  function renderShell(root, snapshot) {
    clear(root);
    const sidebar = el("aside", "sidebar");
    sidebar.appendChild(el("div", "brand", "Synthesis"));
    sidebar.appendChild(el("div", "muted", "Library " + snapshot.libraryId));
    const nav = el("div", "nav");
    [
      ["overview", "Overview"],
      ["artifacts", "Artifacts"],
      ["registry", "Registry"],
      ["graph", "Citation Graph"],
    ].forEach(function (entry) {
      nav.appendChild(
        makeButton(
          entry[1],
          "selectTab",
          { tab: entry[0] },
          snapshot.selectedTab === entry[0],
        ),
      );
    });
    sidebar.appendChild(nav);
    root.appendChild(sidebar);

    const content = el("main", "content");
    const topbar = el("div", "topbar");
    topbar.appendChild(el("h1", "", titleForTab(snapshot.selectedTab)));
    const toolbar = el("div", "toolbar");
    toolbar.appendChild(makeButton("Refresh", "refresh", {}));
    toolbar.appendChild(
      makeButton("Preferences", "hostCommand", { command: "openPreferences" }),
    );
    topbar.appendChild(toolbar);
    content.appendChild(topbar);
    const main = el("section", "main");
    renderCurrentView(main, snapshot);
    content.appendChild(main);
    root.appendChild(content);
  }

  function titleForTab(tab) {
    if (tab === "artifacts") return "Synthesis Artifacts";
    if (tab === "registry") return "Paper Registry";
    if (tab === "graph") return "Citation Graph";
    return "Synthesis Overview";
  }

  function renderCurrentView(main, snapshot) {
    if (snapshot.selectedTab === "artifacts") {
      renderArtifacts(main, snapshot);
    } else if (snapshot.selectedTab === "registry") {
      renderRegistry(main, snapshot);
    } else if (snapshot.selectedTab === "graph") {
      renderGraph(main, snapshot);
    } else {
      renderOverview(main, snapshot);
    }
  }

  function renderOverview(main, snapshot) {
    const grid = el("div", "status-grid");
    [
      ["Storage root", snapshot.storage.rootState],
      ["Zotero anchor", snapshot.storage.anchorState],
      ["Mirror shards", snapshot.storage.mirrorState],
      ["Artifacts", String(snapshot.artifacts.rows.length)],
      ["Registry rows", String(snapshot.registry.rows.length)],
      ["Graph nodes", String(snapshot.graph.nodes.length)],
      ["Sync status", snapshot.sync ? snapshot.sync.status : "ready"],
      [
        "Conflict candidates",
        snapshot.conflicts && snapshot.conflicts.candidates
          ? String(snapshot.conflicts.candidates.length)
          : "0",
      ],
      ["Graph rebuild", snapshot.preferences.graphRebuildMode],
      ["Staleness scan", snapshot.preferences.stalenessScanEnabled ? "on" : "off"],
    ].forEach(function (entry) {
      const box = el("div", "status-box");
      box.appendChild(el("strong", "", entry[0]));
      box.appendChild(el("span", "muted", entry[1]));
      grid.appendChild(box);
    });
    main.appendChild(grid);
    if (snapshot.sync && snapshot.sync.diagnostics && snapshot.sync.diagnostics.length) {
      const panel = el("div", "panel");
      panel.style.marginTop = "12px";
      const header = el("div", "panel-header");
      header.appendChild(el("strong", "", "Sync Diagnostics"));
      panel.appendChild(header);
      panel.appendChild(
        tableView(["Severity", "Code", "Message"], snapshot.sync.diagnostics, function (row) {
          return [badge(row.severity, row.severity === "error" ? "danger" : "warn"), row.code, row.message];
        }),
      );
      main.appendChild(panel);
    }
    if (
      snapshot.conflicts &&
      snapshot.conflicts.candidates &&
      snapshot.conflicts.candidates.length
    ) {
      const panel = el("div", "panel");
      panel.style.marginTop = "12px";
      const header = el("div", "panel-header");
      header.appendChild(el("strong", "", "Local Conflict Candidates"));
      panel.appendChild(header);
      panel.appendChild(
        tableView(["Topic", "Reason", "Created", "Action"], snapshot.conflicts.candidates, function (row) {
          return [
            row.topic_id || row.id,
            row.reason || "-",
            row.created_at || "-",
            makeButton("Retry", "hostCommand", {
              command: "runSynthesizeTopic",
              args: { conflictCandidateId: row.id },
            }),
          ];
        }),
      );
      main.appendChild(panel);
    }
  }

  function renderArtifacts(main, snapshot) {
    const panel = el("div", "panel");
    const header = el("div", "panel-header");
    header.appendChild(el("strong", "", "Artifacts"));
    const filters = el("div", "filters");
    const search = el("input");
    search.placeholder = "Search";
    search.value = snapshot.artifacts.filters.search || "";
    search.addEventListener("input", function () {
      sendAction("setFilters", {
        artifacts: { search: search.value },
      });
    });
    const coverage = selectControl(["all", "complete", "partial", "missing"], snapshot.artifacts.filters.coverage, function (value) {
      sendAction("setFilters", { artifacts: { coverage: value } });
    });
    filters.appendChild(search);
    filters.appendChild(coverage);
    filters.appendChild(
      makeButton("Run synthesis", "hostCommand", { command: "runSynthesizeTopic" }, false),
    );
    header.appendChild(filters);
    panel.appendChild(header);
    panel.appendChild(tableView(["Title", "Coverage", "Freshness", "Updated", "Action"], snapshot.artifacts.visibleRows, function (row) {
      return [
        row.title,
        badge(row.coverage, toneFor(row.coverage)),
        badge(row.freshness, toneFor(row.freshness)),
        row.updated_at || "-",
        makeButton("Open", "hostCommand", {
          command: "openCanonicalMarkdown",
          args: { topicId: row.id },
        }),
      ];
    }));
    main.appendChild(panel);
  }

  function renderRegistry(main, snapshot) {
    const panel = el("div", "panel");
    const header = el("div", "panel-header");
    header.appendChild(el("strong", "", "Registry"));
    const filters = el("div", "filters");
    const search = el("input");
    search.placeholder = "Search";
    search.value = snapshot.registry.filters.search || "";
    search.addEventListener("input", function () {
      sendAction("setFilters", { registry: { search: search.value } });
    });
    const readiness = selectControl(["all", "ready", "partial"], snapshot.registry.filters.readiness, function (value) {
      sendAction("setFilters", { registry: { readiness: value } });
    });
    const missing = selectControl(["all", "digest", "references", "citation_analysis"], snapshot.registry.filters.missingArtifact, function (value) {
      sendAction("setFilters", { registry: { missingArtifact: value } });
    });
    filters.appendChild(search);
    filters.appendChild(readiness);
    filters.appendChild(missing);
    header.appendChild(filters);
    panel.appendChild(header);
    panel.appendChild(tableView(["Title", "Year", "Readiness", "Coverage", "Missing"], snapshot.registry.visibleRows, function (row) {
      return [
        row.title,
        row.year || "-",
        badge(row.readiness, toneFor(row.readiness)),
        badge(row.coverage, toneFor(row.coverage)),
        row.missing_artifacts.length ? row.missing_artifacts.join(", ") : "-",
      ];
    }));
    main.appendChild(panel);
  }

  function renderGraph(main, snapshot) {
    const shell = el("div", "graph-shell");
    const stage = el("div", "graph-stage");
    stage.appendChild(renderGraphSvg(snapshot));
    shell.appendChild(stage);

    const detail = el("aside", "panel details");
    const header = el("div", "panel-header");
    header.appendChild(el("strong", "", "Graph Controls"));
    detail.appendChild(header);
    const controls = el("div", "details");
    const filters = el("div", "filters");
    const search = el("input");
    search.placeholder = "Search node";
    search.value = snapshot.graph.filters.search || "";
    search.addEventListener("input", function () {
      sendAction("setFilters", { graph: { search: search.value } });
    });
    filters.appendChild(search);
    ["compact", "balanced", "expanded"].forEach(function (preset) {
      filters.appendChild(
        makeButton(
          preset,
          "setGraphView",
          { layoutPreset: preset },
          snapshot.graph.layoutPreset === preset,
        ),
      );
    });
    controls.appendChild(filters);
    controls.appendChild(el("p", "muted", snapshot.graph.visibleNodes.length + " nodes, " + snapshot.graph.visibleEdges.length + " edges"));
    const selected = snapshot.graph.selectedElement;
    controls.appendChild(el("h3", "", "Selection"));
    controls.appendChild(el("pre", "", selected ? JSON.stringify(selected, null, 2) : "No selection"));
    detail.appendChild(controls);
    shell.appendChild(detail);
    main.appendChild(shell);
  }

  function renderGraphSvg(snapshot) {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "-320 -220 640 440");
    const nodeMap = new Map();
    snapshot.graph.visibleNodes.forEach(function (node, index) {
      const angle = (Math.PI * 2 * index) / Math.max(1, snapshot.graph.visibleNodes.length);
      nodeMap.set(node.id, {
        node,
        x: typeof node.x === "number" ? node.x : Math.cos(angle) * 180,
        y: typeof node.y === "number" ? node.y : Math.sin(angle) * 140,
      });
    });
    snapshot.graph.visibleEdges.forEach(function (edge) {
      const source = nodeMap.get(edge.source);
      const target = nodeMap.get(edge.target);
      if (!source || !target) return;
      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("class", "graph-edge");
      line.setAttribute("x1", String(source.x));
      line.setAttribute("y1", String(source.y));
      line.setAttribute("x2", String(target.x));
      line.setAttribute("y2", String(target.y));
      svg.appendChild(line);
    });
    Array.from(nodeMap.values()).forEach(function (entry) {
      const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
      const selected = snapshot.graph.selectedElement &&
        snapshot.graph.selectedElement.kind === "node" &&
        snapshot.graph.selectedElement.id === entry.node.id;
      group.setAttribute("class", "graph-node " + entry.node.kind.replace("_reference", "") + (selected ? " selected" : ""));
      group.setAttribute("transform", "translate(" + entry.x + " " + entry.y + ")");
      group.addEventListener("click", function () {
        sendAction("setGraphView", {
          selectedElement: { kind: "node", id: entry.node.id },
        });
      });
      const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      circle.setAttribute("r", "7");
      group.appendChild(circle);
      const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
      text.setAttribute("class", "graph-label");
      text.setAttribute("x", "10");
      text.setAttribute("y", "4");
      text.textContent = entry.node.label;
      group.appendChild(text);
      svg.appendChild(group);
    });
    return svg;
  }

  function tableView(headers, rows, mapRow) {
    if (!rows.length) {
      return el("div", "empty", "No rows.");
    }
    const wrap = el("div", "table-wrap");
    const table = el("table");
    const thead = el("thead");
    const tr = el("tr");
    headers.forEach(function (header) {
      tr.appendChild(el("th", "", header));
    });
    thead.appendChild(tr);
    table.appendChild(thead);
    const tbody = el("tbody");
    rows.forEach(function (row) {
      const rowNode = el("tr");
      mapRow(row).forEach(function (cell) {
        const td = el("td");
        if (cell instanceof Node) {
          td.appendChild(cell);
        } else {
          td.textContent = String(cell);
        }
        rowNode.appendChild(td);
      });
      tbody.appendChild(rowNode);
    });
    table.appendChild(tbody);
    wrap.appendChild(table);
    return wrap;
  }

  function selectControl(options, value, onChange) {
    const select = el("select");
    options.forEach(function (option) {
      const node = el("option", "", option);
      node.value = option;
      if (option === value) {
        node.selected = true;
      }
      select.appendChild(node);
    });
    select.addEventListener("change", function () {
      onChange(select.value);
    });
    return select;
  }

  function render() {
    const root = document.getElementById("app");
    if (!root) return;
    if (!state.snapshot) {
      clear(root);
      root.appendChild(el("div", "empty", "Loading Synthesis Workbench..."));
      return;
    }
    renderShell(root, state.snapshot);
  }

  window.addEventListener("message", function (event) {
    const data = event.data;
    if (!data || typeof data !== "object") {
      return;
    }
    if (data.type === "synthesis:init" || data.type === "synthesis:snapshot") {
      state.snapshot = data.payload || null;
      render();
    }
  });

  sendAction("ready", {});
  render();
})();
