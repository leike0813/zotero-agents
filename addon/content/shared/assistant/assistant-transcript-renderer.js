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
    while (node.firstChild && typeof node.removeChild === "function") {
      node.removeChild(node.firstChild);
    }
    node.textContent = "";
  }

  const VIRTUAL_PAGE_SIZE = 80;
  const VIRTUAL_PAGE_CACHE_LIMIT = 5;
  const VIRTUAL_RENDER_WINDOW_LIMIT = 120;
  const VIRTUAL_RENDER_BUFFER = 20;
  const VIRTUAL_ESTIMATED_ROW_HEIGHT = 88;
  const VIRTUAL_PAGE_LOAD_THRESHOLD_PX = 320;
  const VIRTUAL_ROW_HEIGHT_CHANGE_THRESHOLD = 1;
  const virtualTranscriptStates = new WeakMap();

  function finiteNumber(value, fallback) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  }

  function positiveInteger(value, fallback) {
    return Math.max(1, Math.floor(finiteNumber(value, fallback)));
  }

  function nonNegativeInteger(value, fallback) {
    return Math.max(0, Math.floor(finiteNumber(value, fallback)));
  }

  function transcriptAnimationFrame(callback) {
    const raf =
      typeof window !== "undefined" &&
      typeof window.requestAnimationFrame === "function"
        ? window.requestAnimationFrame.bind(window)
        : function (handler) {
            return setTimeout(handler, 0);
          };
    return raf(callback);
  }

  function getVirtualTranscriptState(container) {
    let state = virtualTranscriptStates.get(container);
    if (!state) {
      state = {
        pageKey: "",
        pages: new Map(),
        loadingCursors: new Set(),
        renderScheduled: false,
        scrollInstalled: false,
        latestOptions: null,
        lastVirtual: null,
        lastAnchor: null,
        pendingMeasureRender: false,
        rowHeights: new Map(),
        virtualSourceMode: "page",
      };
      virtualTranscriptStates.set(container, state);
    }
    return state;
  }

  function resetTranscriptScrollState(container) {
    if (!container) return;
    container.removeAttribute("data-assistant-transcript-programmatic-scroll");
    container.removeAttribute("data-assistant-transcript-scroll-render");
    container.setAttribute("data-assistant-transcript-stick", "true");
    container.setAttribute("data-assistant-transcript-last-scroll-top", "0");
  }

  function resetVirtualTranscriptState(state, pageKey) {
    state.pageKey = pageKey || "";
    state.pages = new Map();
    state.loadingCursors = new Set();
    state.renderScheduled = false;
    state.pendingMeasureRender = false;
    state.latestOptions = null;
    state.lastVirtual = null;
    state.lastAnchor = null;
    state.rowHeights = new Map();
    state.virtualSourceMode = "page";
  }

  function resetAssistantTranscriptVirtualState(container, pageKey) {
    if (!container) return;
    const state = getVirtualTranscriptState(container);
    const normalizedPageKey = String(pageKey || "").trim();
    resetVirtualTranscriptState(state, normalizedPageKey);
    resetTranscriptScrollState(container);
    container.setAttribute(
      "data-assistant-transcript-page-key",
      normalizedPageKey,
    );
  }

  function normalizeVirtualTranscriptPage(page, pageKey, fallbackLimit) {
    if (!page || typeof page !== "object" || !Array.isArray(page.items)) {
      return null;
    }
    const requestId = String(page.requestId || "").trim();
    if (requestId && pageKey && requestId !== pageKey) {
      return null;
    }
    const cursor = nonNegativeInteger(page.cursor, 0);
    return {
      requestId,
      cursor,
      items: page.items.slice(),
      prevCursor:
        typeof page.prevCursor === "number"
          ? nonNegativeInteger(page.prevCursor, 0)
          : undefined,
      nextCursor:
        typeof page.nextCursor === "number"
          ? nonNegativeInteger(page.nextCursor, 0)
          : undefined,
      total: nonNegativeInteger(page.total, page.items.length),
      eventSeq: nonNegativeInteger(page.eventSeq, 0),
      transcriptRevision: nonNegativeInteger(page.transcriptRevision, 0),
      limit: positiveInteger(page.limit, fallbackLimit),
    };
  }

  function mergeVirtualTranscriptPage(state, page, options) {
    const pageKey =
      String(options.pageKey || "").trim() ||
      String(page && page.requestId ? page.requestId : "").trim();
    if (state.pageKey !== pageKey || state.virtualSourceMode !== "page") {
      resetVirtualTranscriptState(state, pageKey);
    }
    state.virtualSourceMode = "page";
    const normalized = normalizeVirtualTranscriptPage(
      page,
      state.pageKey,
      positiveInteger(options.pageSize, VIRTUAL_PAGE_SIZE),
    );
    if (!normalized) return null;
    state.loadingCursors.delete(normalized.cursor);
    state.pages.set(normalized.cursor, normalized);
    trimVirtualTranscriptPages(state, options);
    return normalized;
  }

  function setVirtualTranscriptItemsSource(state, items, options) {
    const pageKey = String(options.pageKey || "").trim();
    if (state.pageKey !== pageKey || state.virtualSourceMode !== "items") {
      resetVirtualTranscriptState(state, pageKey);
    }
    state.virtualSourceMode = "items";
    const sourceItems = Array.isArray(items) ? items.slice() : [];
    state.loadingCursors.clear();
    state.pages.set(0, {
      requestId: pageKey,
      cursor: 0,
      items: sourceItems,
      total: sourceItems.length,
      eventSeq: nonNegativeInteger(options.transcriptRevision, 0),
      transcriptRevision: nonNegativeInteger(options.transcriptRevision, 0),
      limit: Math.max(1, sourceItems.length || 1),
    });
    pruneVirtualTranscriptRowHeights(state);
  }

  function trimVirtualTranscriptPages(state, options) {
    const limit = positiveInteger(
      options.pageCacheLimit,
      VIRTUAL_PAGE_CACHE_LIMIT,
    );
    if (state.pages.size <= limit) return;
    const anchor = state.lastVirtual
      ? nonNegativeInteger(
          state.lastVirtual.startIndex,
          Number.MAX_SAFE_INTEGER,
        )
      : Number.MAX_SAFE_INTEGER;
    while (state.pages.size > limit) {
      let removeCursor = Array.from(state.pages.keys())[0];
      let removeDistance = -1;
      state.pages.forEach(function (_page, cursor) {
        const distance = Math.abs(Number(cursor) - anchor);
        if (distance > removeDistance) {
          removeDistance = distance;
          removeCursor = cursor;
        }
      });
      state.pages.delete(removeCursor);
    }
    pruneVirtualTranscriptRowHeights(state);
  }

  function virtualTranscriptEntryKey(entry) {
    const source = (entry && entry.item) || {};
    const id = String(source.id || "").trim();
    if (id) return "id:" + id;
    return [
      "index",
      String(nonNegativeInteger(entry && entry.index, 0)),
      String(source.kind || ""),
      String(source.role || ""),
    ].join(":");
  }

  function virtualTranscriptRenderedRowKey(item, index, virtual) {
    const source = item || {};
    if (
      virtual &&
      Array.isArray(virtual.rowKeys) &&
      Array.isArray(virtual.items) &&
      virtual.rowKeys.length === virtual.items.length &&
      index < virtual.rowKeys.length
    ) {
      return virtual.rowKeys[index];
    }
    const id = String(source.id || "").trim();
    if (id) return "id:" + id;
    return [
      "rendered",
      String(nonNegativeInteger(index, 0)),
      String(source.kind || ""),
      String(source.role || ""),
    ].join(":");
  }

  function applyVirtualTranscriptRowMetadata(row, item, index, virtual) {
    if (!row || !virtual) return;
    const rowKey = virtualTranscriptRenderedRowKey(item, index, virtual);
    row.setAttribute("data-assistant-virtual-row-key", rowKey);
    row.setAttribute(
      "data-assistant-virtual-row-index",
      String(nonNegativeInteger(virtual.startIndex, 0) + index),
    );
  }

  function pruneVirtualTranscriptRowHeights(state) {
    if (
      !state ||
      !state.rowHeights ||
      typeof state.rowHeights.forEach !== "function"
    ) {
      return;
    }
    const keep = new Set();
    virtualTranscriptCacheEntries(state).entries.forEach(function (entry) {
      keep.add(virtualTranscriptEntryKey(entry));
    });
    Array.from(state.rowHeights.keys()).forEach(function (key) {
      if (!keep.has(key)) state.rowHeights.delete(key);
    });
  }

  function virtualTranscriptEstimatedText(item) {
    const source = item || {};
    return [
      source.text,
      source.summary,
      source.resultSummary,
      source.inputSummary,
      source.title,
      Array.isArray(source.items)
        ? source.items
            .map(function (entry) {
              return virtualTranscriptEstimatedText(entry);
            })
            .join(" ")
        : "",
    ]
      .filter(Boolean)
      .join(" ");
  }

  function estimatedVirtualRowHeight(entry, estimatedHeight) {
    const textLength = virtualTranscriptEstimatedText(
      entry && entry.item,
    ).length;
    if (textLength <= 160) return estimatedHeight;
    const estimatedLines = Math.ceil(textLength / 80);
    return Math.max(estimatedHeight, Math.min(4096, 44 + estimatedLines * 22));
  }

  function measuredVirtualRowHeight(state, entry, key, estimatedHeight) {
    if (state && state.rowHeights && state.rowHeights.has(key)) {
      return positiveInteger(state.rowHeights.get(key), estimatedHeight);
    }
    return estimatedVirtualRowHeight(entry, estimatedHeight);
  }

  function buildVirtualTranscriptLayout(entries, state, options, totalRows) {
    const estimatedHeight = positiveInteger(
      options.estimatedRowHeight,
      VIRTUAL_ESTIMATED_ROW_HEIGHT,
    );
    const positions = [];
    let currentIndex = 0;
    let currentTop = 0;
    entries.forEach(function (entry) {
      const index = nonNegativeInteger(entry.index, 0);
      if (index > currentIndex) {
        currentTop += (index - currentIndex) * estimatedHeight;
      }
      const key = virtualTranscriptEntryKey(entry);
      const height = measuredVirtualRowHeight(
        state,
        entry,
        key,
        estimatedHeight,
      );
      positions.push({
        entry,
        key,
        index,
        top: currentTop,
        bottom: currentTop + height,
        height,
      });
      currentTop += height;
      currentIndex = index + 1;
    });
    const rowCount = Math.max(nonNegativeInteger(totalRows, 0), currentIndex);
    const totalHeight =
      currentTop + Math.max(0, rowCount - currentIndex) * estimatedHeight;
    return {
      estimatedHeight,
      positions,
      rowCount,
      totalHeight,
    };
  }

  function findVirtualPositionForScroll(positions, scrollTop) {
    if (!positions.length) return null;
    const top = finiteNumber(scrollTop, 0);
    for (let index = 0; index < positions.length; index += 1) {
      if (positions[index].bottom > top) return positions[index];
    }
    return positions[positions.length - 1];
  }

  function captureVirtualScrollAnchor(container, virtual) {
    if (!container || !virtual || !Array.isArray(virtual.positions)) {
      return null;
    }
    const scrollTop = finiteNumber(container.scrollTop, 0);
    const position = findVirtualPositionForScroll(virtual.positions, scrollTop);
    if (!position) return null;
    return {
      key: position.key,
      index: position.index,
      offset: Math.max(0, scrollTop - position.top),
    };
  }

  function restoreVirtualScrollAnchor(container, virtual, anchor) {
    if (
      !container ||
      !virtual ||
      !anchor ||
      !Array.isArray(virtual.positions)
    ) {
      return false;
    }
    const position =
      virtual.positions.find(function (entry) {
        return entry.key === anchor.key;
      }) ||
      virtual.positions.find(function (entry) {
        return entry.index === anchor.index;
      });
    if (!position) return false;
    const offset = Math.max(
      0,
      Math.min(
        finiteNumber(anchor.offset, 0),
        Math.max(0, position.height - 1),
      ),
    );
    container.scrollTop = Math.max(0, Math.floor(position.top + offset));
    return true;
  }

  function virtualTranscriptCacheEntries(state) {
    const pages = Array.from(state.pages.values()).sort(function (a, b) {
      return a.cursor - b.cursor;
    });
    const byIndex = new Map();
    let total = 0;
    let revision = 0;
    pages.forEach(function (page) {
      total = Math.max(total, nonNegativeInteger(page.total, 0));
      revision = Math.max(
        revision,
        nonNegativeInteger(page.transcriptRevision || page.eventSeq, 0),
      );
      page.items.forEach(function (item, offset) {
        byIndex.set(page.cursor + offset, item);
      });
    });
    const entries = Array.from(byIndex.entries())
      .sort(function (a, b) {
        return a[0] - b[0];
      })
      .map(function (entry) {
        return { index: entry[0], item: entry[1] };
      });
    const firstPage = pages[0] || null;
    const lastPage = pages[pages.length - 1] || null;
    return {
      entries,
      total: Math.max(total, entries.length),
      revision,
      prevCursor:
        firstPage && typeof firstPage.prevCursor === "number"
          ? firstPage.prevCursor
          : undefined,
      nextCursor:
        lastPage && typeof lastPage.nextCursor === "number"
          ? lastPage.nextCursor
          : undefined,
    };
  }

  function buildVirtualTranscriptWindow(container, state, options) {
    const cache = virtualTranscriptCacheEntries(state);
    const entries = cache.entries;
    if (entries.length === 0) {
      return {
        items: [],
        startIndex: 0,
        endIndex: 0,
        cachedStartIndex: 0,
        cachedEndIndex: 0,
        total: 0,
        totalHeight: 0,
        topSpacerHeight: 0,
        bottomSpacerHeight: 0,
        cachedTopBoundary: 0,
        cachedBottomBoundary: 0,
        positions: [],
        rowKeys: [],
        revision: 0,
        signature: "empty",
      };
    }
    const renderBuffer = nonNegativeInteger(
      options.renderBuffer,
      VIRTUAL_RENDER_BUFFER,
    );
    const renderLimit = positiveInteger(
      options.renderWindowLimit,
      VIRTUAL_RENDER_WINDOW_LIMIT,
    );
    const layout = buildVirtualTranscriptLayout(
      entries,
      state,
      options,
      Math.max(cache.total, entries[entries.length - 1].index + 1),
    );
    const scrollTop = finiteNumber(container.scrollTop, 0);
    const viewportHeight = Math.max(1, finiteNumber(container.clientHeight, 0));
    const overscanPx = Math.max(
      layout.estimatedHeight,
      renderBuffer * layout.estimatedHeight,
    );
    const windowTop = Math.max(0, scrollTop - overscanPx);
    const windowBottom = scrollTop + viewportHeight + overscanPx;
    let windowPositions = layout.positions.filter(function (position) {
      return position.bottom >= windowTop && position.top <= windowBottom;
    });
    if (windowPositions.length > 0 && renderBuffer > 0) {
      const firstWindowIndex = layout.positions.indexOf(windowPositions[0]);
      const lastWindowIndex = layout.positions.indexOf(
        windowPositions[windowPositions.length - 1],
      );
      const start = Math.max(0, firstWindowIndex - renderBuffer);
      const end = Math.min(
        layout.positions.length,
        lastWindowIndex + renderBuffer + 1,
      );
      windowPositions = layout.positions.slice(start, end);
    }
    if (windowPositions.length === 0) {
      const firstVisibleIndex = layout.positions.indexOf(
        findVirtualPositionForScroll(layout.positions, scrollTop),
      );
      const start = Math.max(
        0,
        (firstVisibleIndex >= 0 ? firstVisibleIndex : layout.positions.length) -
          renderBuffer,
      );
      windowPositions = layout.positions.slice(start, start + renderLimit);
    }
    if (windowPositions.length > renderLimit) {
      const firstVisibleIndex = Math.max(
        0,
        layout.positions.indexOf(
          findVirtualPositionForScroll(layout.positions, scrollTop),
        ),
      );
      const start = Math.max(0, firstVisibleIndex - renderBuffer);
      windowPositions = layout.positions.slice(start, start + renderLimit);
    }
    if (windowPositions.length === 0) {
      windowPositions = layout.positions.slice(
        0,
        Math.min(layout.positions.length, renderLimit),
      );
    }
    const firstPosition = windowPositions[0];
    const lastPosition = windowPositions[windowPositions.length - 1];
    const startIndex = firstPosition.index;
    const endIndex = lastPosition.index + 1;
    const rowKeys = windowPositions.map(function (position) {
      return position.key;
    });
    return {
      items: windowPositions.map(function (position) {
        return position.entry.item;
      }),
      rowKeys,
      startIndex,
      endIndex,
      cachedStartIndex: entries[0].index,
      cachedEndIndex: entries[entries.length - 1].index + 1,
      total: layout.rowCount,
      totalHeight: layout.totalHeight,
      topSpacerHeight: firstPosition.top,
      bottomSpacerHeight: Math.max(0, layout.totalHeight - lastPosition.bottom),
      cachedTopBoundary: layout.positions[0].top,
      cachedBottomBoundary:
        layout.positions[layout.positions.length - 1].bottom,
      positions: layout.positions,
      revision: cache.revision,
      prevCursor: cache.prevCursor,
      nextCursor: cache.nextCursor,
      signature: [
        startIndex,
        endIndex,
        cache.total,
        cache.revision,
        Math.round(firstPosition.top),
        Math.round(layout.totalHeight - lastPosition.bottom),
        windowPositions
          .map(function (position) {
            return [
              position.key,
              Math.round(position.height),
              String(
                position.entry.item && position.entry.item.id
                  ? position.entry.item.id
                  : "",
              ),
            ].join(":");
          })
          .join(","),
      ].join("|"),
    };
  }

  function isVirtualPageCachedOrLoading(state, cursor) {
    const cursorKey = nonNegativeInteger(cursor, 0);
    return state.pages.has(cursorKey) || state.loadingCursors.has(cursorKey);
  }

  function requestVirtualTranscriptPage(state, options, cursor) {
    if (state.virtualSourceMode === "items") {
      return;
    }
    const cursorKey = nonNegativeInteger(cursor, 0);
    if (!state.pageKey || isVirtualPageCachedOrLoading(state, cursorKey)) {
      return;
    }
    if (typeof options.onRequestPage !== "function") {
      return;
    }
    state.loadingCursors.add(cursorKey);
    options.onRequestPage({
      pageKey: state.pageKey,
      cursor: cursorKey,
      limit: positiveInteger(options.pageSize, VIRTUAL_PAGE_SIZE),
    });
    setTimeout(function () {
      state.loadingCursors.delete(cursorKey);
    }, 5000);
  }

  function maybeRequestVirtualTranscriptPages(
    container,
    state,
    virtual,
    options,
  ) {
    if (!container || !virtual) return;
    const threshold = positiveInteger(
      options.pageLoadThreshold,
      VIRTUAL_PAGE_LOAD_THRESHOLD_PX,
    );
    const topBoundary = finiteNumber(virtual.cachedTopBoundary, 0);
    const bottomBoundary = finiteNumber(virtual.cachedBottomBoundary, 0);
    if (
      typeof virtual.prevCursor === "number" &&
      finiteNumber(container.scrollTop, 0) - topBoundary < threshold
    ) {
      requestVirtualTranscriptPage(state, options, virtual.prevCursor);
    }
    if (
      typeof virtual.nextCursor === "number" &&
      bottomBoundary -
        (finiteNumber(container.scrollTop, 0) +
          finiteNumber(container.clientHeight, 0)) <
        threshold
    ) {
      requestVirtualTranscriptPage(state, options, virtual.nextCursor);
    }
  }

  function createVirtualTranscriptSpacer(height) {
    const spacer = el("div", "assistant-transcript-virtual-spacer");
    spacer.style.height = Math.max(0, Math.floor(Number(height) || 0)) + "px";
    spacer.setAttribute("aria-hidden", "true");
    return spacer;
  }

  function measuredElementHeight(node, fallback) {
    if (node && typeof node.getBoundingClientRect === "function") {
      const rect = node.getBoundingClientRect();
      const height = rect && finiteNumber(rect.height, 0);
      if (height > 0) return height;
    }
    if (node && finiteNumber(node.offsetHeight, 0) > 0) {
      return finiteNumber(node.offsetHeight, fallback);
    }
    return fallback;
  }

  function measureVirtualTranscriptRows(container, state, options) {
    if (!container || !state || !state.rowHeights) return false;
    const estimatedHeight = positiveInteger(
      options.estimatedRowHeight,
      VIRTUAL_ESTIMATED_ROW_HEIGHT,
    );
    const rows =
      typeof container.querySelectorAll === "function"
        ? container.querySelectorAll(":scope > .assistant-transcript-row")
        : [];
    let changed = false;
    Array.from(rows || []).forEach(function (row) {
      const key = String(
        row && typeof row.getAttribute === "function"
          ? row.getAttribute("data-assistant-virtual-row-key") || ""
          : "",
      ).trim();
      if (!key) return;
      const height = positiveInteger(
        measuredElementHeight(row, estimatedHeight),
        estimatedHeight,
      );
      const previous = state.rowHeights.has(key)
        ? positiveInteger(state.rowHeights.get(key), estimatedHeight)
        : 0;
      if (Math.abs(previous - height) > VIRTUAL_ROW_HEIGHT_CHANGE_THRESHOLD) {
        state.rowHeights.set(key, height);
        changed = true;
      }
    });
    return changed;
  }

  function scheduleVirtualTranscriptRender(container, state, reason) {
    if (state.renderScheduled || !state.latestOptions) return;
    state.renderScheduled = true;
    if (reason === "measure") state.pendingMeasureRender = true;
    const scheduledPageKey = state.pageKey;
    transcriptAnimationFrame(function () {
      state.renderScheduled = false;
      state.pendingMeasureRender = false;
      if (!state.latestOptions) return;
      if (scheduledPageKey !== state.pageKey) return;
      renderAssistantTranscript(
        Object.assign({}, state.latestOptions, {
          _virtualScrollRender: true,
        }),
      );
    });
  }

  function installVirtualTranscriptScrollHandler(container, state) {
    if (!container || state.scrollInstalled) return;
    state.scrollInstalled = true;
    container.addEventListener("scroll", function () {
      if (
        container.getAttribute(
          "data-assistant-transcript-programmatic-scroll",
        ) === "true"
      ) {
        return;
      }
      if (state.lastVirtual && state.latestOptions) {
        maybeRequestVirtualTranscriptPages(
          container,
          state,
          state.lastVirtual,
          state.latestOptions,
        );
      }
      scheduleVirtualTranscriptRender(container, state);
    });
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
    container.setAttribute(
      "data-assistant-transcript-last-scroll-top",
      String(finiteNumber(container.scrollTop, 0)),
    );
    container.addEventListener("scroll", function () {
      if (
        container.getAttribute(
          "data-assistant-transcript-programmatic-scroll",
        ) === "true"
      ) {
        return;
      }
      const previousScrollTop = finiteNumber(
        container.getAttribute("data-assistant-transcript-last-scroll-top"),
        finiteNumber(container.scrollTop, 0),
      );
      const currentScrollTop = finiteNumber(container.scrollTop, 0);
      container.setAttribute(
        "data-assistant-transcript-last-scroll-top",
        String(currentScrollTop),
      );
      if (currentScrollTop < previousScrollTop) {
        container.setAttribute("data-assistant-transcript-stick", "false");
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
    if (
      container.getAttribute("data-assistant-transcript-scroll-render") ===
      "true"
    ) {
      return (
        container.getAttribute("data-assistant-transcript-stick") === "true"
      );
    }
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
      container.setAttribute(
        "data-assistant-transcript-last-scroll-top",
        String(finiteNumber(container.scrollTop, 0)),
      );
    };
    container.setAttribute(
      "data-assistant-transcript-programmatic-scroll",
      "true",
    );
    container.scrollTop = container.scrollHeight;
    container.setAttribute(
      "data-assistant-transcript-last-scroll-top",
      String(finiteNumber(container.scrollTop, 0)),
    );
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
    if (item.kind === "process" || item.kind === "thought") return "process";
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
    row.classList.toggle(
      "is-process",
      kind === "process" || kind === "thought",
    );
    row.classList.toggle("is-permission", kind === "permission");
    row.classList.toggle(
      "is-workspace-activity",
      kind === "status" && item.label === "workspace-activity",
    );
    row.classList.toggle(
      "is-status",
      kind !== "message" &&
        kind !== "process" &&
        kind !== "thought" &&
        role !== "tool",
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
    if (item.kind === "process" || item.kind === "thought") {
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
      const fileIcon = el(
        "span",
        "assistant-transcript-workspace-file-icon zs-icon zs-icon-sm zs-icon-edit-document",
      );
      fileIcon.setAttribute("aria-hidden", "true");
      body.appendChild(fileIcon);
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
    const virtualized = opts.virtualized === true;
    let virtualState = null;
    let virtual = null;
    let previousVirtual = null;
    let rawItems = opts.items || [];
    if (virtualized) {
      const nextPageKey =
        String(opts.pageKey || "").trim() ||
        String(
          opts.page && opts.page.requestId ? opts.page.requestId : "",
        ).trim();
      virtualState = getVirtualTranscriptState(container);
      if (virtualState.pageKey !== nextPageKey) {
        resetAssistantTranscriptVirtualState(container, nextPageKey);
        virtualState = getVirtualTranscriptState(container);
      }
      previousVirtual = virtualState.lastVirtual;
    }
    installAssistantTranscriptStickiness(container, opts.stickThreshold);
    if (virtualized) {
      const hasIncomingPage =
        opts.page &&
        typeof opts.page === "object" &&
        Array.isArray(opts.page.items);
      const hadCachedPages = virtualState.pages.size > 0;
      const mergedPage = hasIncomingPage
        ? mergeVirtualTranscriptPage(virtualState, opts.page, opts)
        : null;
      const pageRejected = hasIncomingPage && !mergedPage;
      if (pageRejected) {
        resetAssistantTranscriptVirtualState(container, opts.pageKey);
        virtualState = getVirtualTranscriptState(container);
        rawItems = [];
      } else {
        if (!hasIncomingPage) {
          setVirtualTranscriptItemsSource(virtualState, rawItems, opts);
        }
        if (
          mergedPage &&
          !hadCachedPages &&
          opts._virtualScrollRender !== true
        ) {
          resetTranscriptScrollState(container);
        }
        const latestOptions = Object.assign({}, opts);
        delete latestOptions._virtualScrollRender;
        virtualState.latestOptions = latestOptions;
        installVirtualTranscriptScrollHandler(container, virtualState);
        virtual = buildVirtualTranscriptWindow(container, virtualState, opts);
        rawItems = virtual.items.length ? virtual.items : rawItems;
      }
    }
    const items = buildTranscriptRenderItems(rawItems, mode, opts.expandedIds);
    container.classList.add("assistant-transcript");
    container.classList.toggle("plain-mode", mode === "plain");
    container.classList.toggle("bubble-mode", mode === "bubble");
    container.setAttribute("data-assistant-panel-kind", variant);
    if (virtualized && opts._virtualScrollRender === true) {
      container.setAttribute("data-assistant-transcript-scroll-render", "true");
    } else {
      container.removeAttribute("data-assistant-transcript-scroll-render");
    }
    const shouldStick = shouldStickAssistantTranscript(
      container,
      opts.stickThreshold,
    );
    container.removeAttribute("data-assistant-transcript-scroll-render");
    const preservedScrollTop = finiteNumber(container.scrollTop, 0);
    const scrollAnchor =
      virtualized && virtualState && !shouldStick
        ? virtualState.lastAnchor ||
          captureVirtualScrollAnchor(container, previousVirtual || virtual)
        : null;
    if (shouldStick && virtualState) {
      virtualState.lastAnchor = null;
    }
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
    const itemOrderKey = items
      .map(function (item) {
        return String(item.kind || "") + ":" + String(item.id || "");
      })
      .join("|");
    const orderKey =
      virtualized && virtual
        ? ["virtual", virtual.signature, itemOrderKey].join("|")
        : itemOrderKey;
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
      if (virtualized && virtual) {
        container.appendChild(
          createVirtualTranscriptSpacer(virtual.topSpacerHeight),
        );
      }
      items.forEach(function (item, index) {
        const row = createRow(item, { variant });
        applyVirtualTranscriptRowMetadata(row, item, index, virtual);
        if (canDiff) nodeMap.set(String(item.id || ""), row);
        renderAssistantTranscriptItemIfChanged(row, item, opts);
        container.appendChild(row);
      });
      if (virtualized && virtual) {
        container.appendChild(
          createVirtualTranscriptSpacer(virtual.bottomSpacerHeight),
        );
      }
    } else {
      items.forEach(function (item, index) {
        const id = String(item.id || "");
        let row = nodeMap.get(id);
        if (!row) {
          row = createRow(item, { variant });
          nodeMap.set(id, row);
          container.appendChild(row);
        }
        applyVirtualTranscriptRowMetadata(row, item, index, virtual);
        renderAssistantTranscriptItemIfChanged(row, item, opts);
      });
    }
    const measuredChanged =
      virtualized && virtualState && virtual
        ? measureVirtualTranscriptRows(container, virtualState, opts)
        : false;
    if (shouldStick) stickAssistantTranscriptToBottom(container);
    else if (virtualized) {
      if (
        !restoreVirtualScrollAnchor(container, virtual, scrollAnchor) &&
        !restoreVirtualScrollAnchor(container, virtual, virtualState.lastAnchor)
      ) {
        container.scrollTop = preservedScrollTop;
      }
      container.setAttribute(
        "data-assistant-transcript-last-scroll-top",
        String(finiteNumber(container.scrollTop, 0)),
      );
    }
    if (virtualized && virtualState && virtual) {
      virtualState.lastVirtual = virtual;
      if (measuredChanged) {
        virtualState.lastAnchor =
          scrollAnchor || captureVirtualScrollAnchor(container, virtual);
        scheduleVirtualTranscriptRender(container, virtualState, "measure");
      } else {
        virtualState.lastAnchor = null;
      }
    }
    if (virtualized && virtualState && virtual) {
      maybeRequestVirtualTranscriptPages(
        container,
        virtualState,
        virtual,
        opts,
      );
    }
    if (typeof opts.onRendered === "function") {
      opts.onRendered({ orderKey, modeKey: mode, items, virtual });
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
    resetAssistantTranscriptVirtualState,
    shouldStickAssistantTranscript,
    stickAssistantTranscriptToBottom,
  };
})();
