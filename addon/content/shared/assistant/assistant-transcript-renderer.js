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
        ownerKey: "",
        pages: new Map(),
        loadingCursors: new Set(),
        renderScheduled: false,
        scrollInstalled: false,
        latestOptions: null,
        lastVirtual: null,
        lastAnchor: null,
        pendingMeasureRender: false,
        rowHeights: new Map(),
        itemLocations: new Map(),
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

  function resetVirtualTranscriptState(state, ownerKey) {
    state.ownerKey = ownerKey || "";
    state.pages = new Map();
    state.loadingCursors = new Set();
    state.renderScheduled = false;
    state.pendingMeasureRender = false;
    state.latestOptions = null;
    state.lastVirtual = null;
    state.lastAnchor = null;
    state.rowHeights = new Map();
    state.itemLocations = new Map();
    state.virtualSourceMode = "page";
  }

  function resetAssistantTranscriptVirtualState(container, ownerKey) {
    if (!container) return;
    const state = getVirtualTranscriptState(container);
    const normalizedOwnerKey = String(ownerKey || "").trim();
    resetVirtualTranscriptState(state, normalizedOwnerKey);
    resetTranscriptScrollState(container);
    container.setAttribute(
      "data-assistant-transcript-owner-key",
      normalizedOwnerKey,
    );
  }

  function normalizeVirtualTranscriptPage(page, ownerKey, fallbackLimit) {
    if (!page || typeof page !== "object" || !Array.isArray(page.items)) {
      return null;
    }
    const pageOwnerKey = String(page.ownerKey || "").trim();
    if (pageOwnerKey && ownerKey && pageOwnerKey !== ownerKey) {
      return null;
    }
    const pageKey = String(page.pageKey || "").trim();
    if (!pageOwnerKey || !pageKey.startsWith(pageOwnerKey + "\n")) {
      return null;
    }
    const startCursor = nonNegativeInteger(page.startCursor, 0);
    return {
      ownerKey: pageOwnerKey,
      pageKey,
      startCursor,
      items: page.items.slice(),
      previousCursor:
        typeof page.previousCursor === "number"
          ? nonNegativeInteger(page.previousCursor, 0)
          : null,
      nextCursor:
        typeof page.nextCursor === "number"
          ? nonNegativeInteger(page.nextCursor, 0)
          : null,
      totalVisibleItemCount: nonNegativeInteger(
        page.totalVisibleItemCount,
        page.items.length,
      ),
      sourceEventSeq: nonNegativeInteger(page.sourceEventSeq, 0),
      transcriptRevision: nonNegativeInteger(page.transcriptRevision, 0),
      limit: positiveInteger(page.limit, fallbackLimit),
    };
  }

  function mergeVirtualTranscriptPage(state, page, options) {
    const ownerKey =
      String(options.ownerKey || "").trim() ||
      String(page && page.ownerKey ? page.ownerKey : "").trim();
    if (state.ownerKey !== ownerKey || state.virtualSourceMode !== "page") {
      resetVirtualTranscriptState(state, ownerKey);
    }
    state.virtualSourceMode = "page";
    const normalized = normalizeVirtualTranscriptPage(
      page,
      state.ownerKey,
      positiveInteger(options.pageSize, VIRTUAL_PAGE_SIZE),
    );
    if (!normalized) return null;
    state.loadingCursors.delete(normalized.startCursor);
    if (/\ntail:\d+$/.test(normalized.pageKey)) {
      state.pages.clear();
      state.itemLocations.clear();
    }
    const previousPage = state.pages.get(normalized.startCursor);
    if (previousPage) {
      previousPage.items.forEach(function (item) {
        const itemId = String(item && item.itemId ? item.itemId : "").trim();
        const location = itemId ? state.itemLocations.get(itemId) : null;
        if (location && location.page === previousPage) {
          state.itemLocations.delete(itemId);
        }
      });
    }
    state.pages.set(normalized.startCursor, normalized);
    normalized.items.forEach(function (item, index) {
      const itemId = String(item && item.itemId ? item.itemId : "").trim();
      if (itemId) {
        state.itemLocations.set(itemId, { page: normalized, index });
      }
    });
    trimVirtualTranscriptPages(state, options);
    if (/\ntail:\d+$/.test(normalized.pageKey)) {
      pruneVirtualTranscriptRowHeights(state);
    }
    return normalized;
  }

  function setVirtualTranscriptItemsSource(state, items, options) {
    const ownerKey = String(options.ownerKey || "").trim();
    if (state.ownerKey !== ownerKey || state.virtualSourceMode !== "items") {
      resetVirtualTranscriptState(state, ownerKey);
    }
    state.virtualSourceMode = "items";
    const sourceItems = Array.isArray(items) ? items.slice() : [];
    state.loadingCursors.clear();
    state.pages.set(0, {
      ownerKey,
      pageKey: ownerKey ? ownerKey + "\ntail:" + sourceItems.length : "",
      startCursor: 0,
      items: sourceItems,
      totalVisibleItemCount: sourceItems.length,
      sourceEventSeq: nonNegativeInteger(options.transcriptRevision, 0),
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
    const itemId = String(source.itemId || "").trim();
    if (itemId) return "item:" + itemId;
    return [
      "index",
      String(nonNegativeInteger(entry && entry.index, 0)),
      String(source.itemKind || ""),
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
    const rowKey = String(source.rowKey || "").trim();
    if (rowKey) return rowKey;
    return [
      "rendered",
      String(nonNegativeInteger(index, 0)),
      String(source.rowKind || ""),
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

  function buildVirtualTranscriptLoadingGap(args) {
    const container = args && args.container;
    const state = args && args.state;
    const options = args && args.options;
    const layout = args && args.layout;
    const cache = args && args.cache;
    const firstPosition = args && args.firstPosition;
    const lastPosition = args && args.lastPosition;
    if (
      !container ||
      !state ||
      !options ||
      !layout ||
      !cache ||
      !firstPosition ||
      !lastPosition
    ) {
      return null;
    }
    const viewportTop = finiteNumber(container.scrollTop, 0);
    const viewportBottom =
      viewportTop + Math.max(1, finiteNumber(container.clientHeight, 0));
    const estimatedHeight = positiveInteger(
      options.estimatedRowHeight,
      VIRTUAL_ESTIMATED_ROW_HEIGHT,
    );
    const sentinelHeight = Math.min(estimatedHeight, 96);
    const topGapHeight = Math.max(0, finiteNumber(firstPosition.top, 0));
    if (
      typeof cache.previousCursor === "number" &&
      topGapHeight > 0 &&
      viewportTop < topGapHeight &&
      viewportBottom > 0
    ) {
      requestVirtualTranscriptPage(state, options, cache.previousCursor);
      const height = Math.min(sentinelHeight, topGapHeight);
      const top = Math.max(
        0,
        Math.min(viewportTop, Math.max(0, topGapHeight - height)),
      );
      return {
        placement: "top",
        cursor: cache.previousCursor,
        before: top,
        height,
        after: Math.max(0, topGapHeight - top - height),
      };
    }
    const bottomGapStart = Math.max(0, finiteNumber(lastPosition.bottom, 0));
    const bottomGapHeight = Math.max(0, layout.totalHeight - bottomGapStart);
    if (
      typeof cache.nextCursor === "number" &&
      bottomGapHeight > 0 &&
      viewportBottom > bottomGapStart &&
      viewportTop < layout.totalHeight
    ) {
      requestVirtualTranscriptPage(state, options, cache.nextCursor);
      const height = Math.min(sentinelHeight, bottomGapHeight);
      const top = Math.max(
        bottomGapStart,
        Math.min(
          viewportTop,
          Math.max(bottomGapStart, layout.totalHeight - height),
        ),
      );
      return {
        placement: "bottom",
        cursor: cache.nextCursor,
        before: Math.max(0, top - bottomGapStart),
        height,
        after: Math.max(0, layout.totalHeight - top - height),
      };
    }
    return null;
  }

  function findVirtualPositionForScroll(positions, scrollTop) {
    if (!positions.length) return null;
    const top = finiteNumber(scrollTop, 0);
    for (let index = 0; index < positions.length; index += 1) {
      if (positions[index].bottom > top) return positions[index];
    }
    return positions[positions.length - 1];
  }

  function findVirtualAnchorForScroll(positions, scrollTop) {
    if (!positions.length) return null;
    const top = finiteNumber(scrollTop, 0);
    for (let index = 0; index < positions.length; index += 1) {
      const position = positions[index];
      if (top < position.top) {
        return {
          type: "spacer",
          scrollTop: Math.max(0, top),
        };
      }
      if (top < position.bottom) {
        return {
          type: "row",
          position,
        };
      }
    }
    return {
      type: "spacer",
      scrollTop: Math.max(0, top),
    };
  }

  function captureVirtualScrollAnchor(container, virtual) {
    if (!container || !virtual || !Array.isArray(virtual.positions)) {
      return null;
    }
    const scrollTop = finiteNumber(container.scrollTop, 0);
    const anchor = findVirtualAnchorForScroll(virtual.positions, scrollTop);
    if (!anchor) return null;
    if (anchor.type === "spacer") {
      return {
        type: "spacer",
        scrollTop: Math.max(0, scrollTop),
      };
    }
    const position = anchor.position;
    return {
      type: "row",
      key: position.key,
      index: position.index,
      offset: Math.max(0, scrollTop - position.top),
    };
  }

  function isVirtualSpacerAnchor(anchor) {
    return anchor && anchor.type === "spacer";
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
    if (isVirtualSpacerAnchor(anchor)) {
      container.scrollTop = Math.max(
        0,
        Math.floor(finiteNumber(anchor.scrollTop, container.scrollTop || 0)),
      );
      return true;
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
      return a.startCursor - b.startCursor;
    });
    const byIndex = new Map();
    let totalVisibleItemCount = 0;
    let revision = 0;
    pages.forEach(function (page) {
      totalVisibleItemCount = Math.max(
        totalVisibleItemCount,
        nonNegativeInteger(page.totalVisibleItemCount, 0),
      );
      revision = Math.max(
        revision,
        nonNegativeInteger(page.transcriptRevision || page.sourceEventSeq, 0),
      );
      page.items.forEach(function (item, offset) {
        byIndex.set(page.startCursor + offset, item);
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
      totalVisibleItemCount: Math.max(totalVisibleItemCount, entries.length),
      revision,
      previousCursor:
        firstPage && typeof firstPage.previousCursor === "number"
          ? firstPage.previousCursor
          : null,
      nextCursor:
        lastPage && typeof lastPage.nextCursor === "number"
          ? lastPage.nextCursor
          : null,
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
        totalRowCount: 0,
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
      Math.max(
        cache.totalVisibleItemCount,
        entries[entries.length - 1].index + 1,
      ),
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
    const loadingGap = buildVirtualTranscriptLoadingGap({
      container,
      state,
      options,
      layout,
      cache,
      firstPosition,
      lastPosition,
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
      totalRowCount: layout.rowCount,
      totalHeight: layout.totalHeight,
      topSpacerHeight: firstPosition.top,
      bottomSpacerHeight: Math.max(0, layout.totalHeight - lastPosition.bottom),
      cachedTopBoundary: layout.positions[0].top,
      cachedBottomBoundary:
        layout.positions[layout.positions.length - 1].bottom,
      positions: layout.positions,
      revision: cache.revision,
      previousCursor: cache.previousCursor,
      nextCursor: cache.nextCursor,
      loadingGap,
      signature: [
        startIndex,
        endIndex,
        cache.totalVisibleItemCount,
        Math.round(firstPosition.top),
        Math.round(layout.totalHeight - lastPosition.bottom),
        loadingGap
          ? [
              "gap",
              loadingGap.placement,
              loadingGap.cursor,
              Math.round(loadingGap.before),
              Math.round(loadingGap.height),
              Math.round(loadingGap.after),
            ].join(":")
          : "",
        windowPositions
          .map(function (position) {
            return [
              position.key,
              Math.round(position.height),
              String(
                position.entry.item && position.entry.item.itemId
                  ? position.entry.item.itemId
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
    if (!state.ownerKey || isVirtualPageCachedOrLoading(state, cursorKey)) {
      return;
    }
    if (typeof options.onRequestPage !== "function") {
      return;
    }
    state.loadingCursors.add(cursorKey);
    options.onRequestPage({
      ownerKey: state.ownerKey,
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
      typeof virtual.previousCursor === "number" &&
      finiteNumber(container.scrollTop, 0) - topBoundary < threshold
    ) {
      requestVirtualTranscriptPage(state, options, virtual.previousCursor);
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

  function createVirtualTranscriptLoadingGap(gap, options) {
    const loading = el(
      "div",
      "assistant-transcript-virtual-loading",
      transcriptLabel(options, "loading", "Loading transcript..."),
    );
    loading.style.height =
      Math.max(24, Math.floor(Number(gap && gap.height) || 0)) + "px";
    loading.setAttribute("role", "status");
    loading.setAttribute("aria-live", "polite");
    loading.setAttribute(
      "data-assistant-virtual-loading-cursor",
      String(nonNegativeInteger(gap && gap.cursor, 0)),
    );
    loading.setAttribute(
      "data-assistant-virtual-loading-placement",
      String((gap && gap.placement) || ""),
    );
    return loading;
  }

  function appendVirtualTranscriptTopSpacer(container, virtual, options) {
    if (
      !virtual ||
      !virtual.loadingGap ||
      virtual.loadingGap.placement !== "top"
    ) {
      container.appendChild(
        createVirtualTranscriptSpacer(virtual.topSpacerHeight),
      );
      return;
    }
    container.appendChild(
      createVirtualTranscriptSpacer(virtual.loadingGap.before),
    );
    container.appendChild(
      createVirtualTranscriptLoadingGap(virtual.loadingGap, options),
    );
    container.appendChild(
      createVirtualTranscriptSpacer(virtual.loadingGap.after),
    );
  }

  function appendVirtualTranscriptBottomSpacer(container, virtual, options) {
    if (
      !virtual ||
      !virtual.loadingGap ||
      virtual.loadingGap.placement !== "bottom"
    ) {
      container.appendChild(
        createVirtualTranscriptSpacer(virtual.bottomSpacerHeight),
      );
      return;
    }
    container.appendChild(
      createVirtualTranscriptSpacer(virtual.loadingGap.before),
    );
    container.appendChild(
      createVirtualTranscriptLoadingGap(virtual.loadingGap, options),
    );
    container.appendChild(
      createVirtualTranscriptSpacer(virtual.loadingGap.after),
    );
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

  function measureVirtualTranscriptRows(
    container,
    state,
    options,
    dirtyRowKeys,
  ) {
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
      if (dirtyRowKeys && !dirtyRowKeys.has(key)) return;
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
    const scheduledOwnerKey = state.ownerKey;
    transcriptAnimationFrame(function () {
      state.renderScheduled = false;
      state.pendingMeasureRender = false;
      if (!state.latestOptions) return;
      if (scheduledOwnerKey !== state.ownerKey) return;
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

  function adaptLegacyTranscriptItem(item) {
    const source = item && typeof item === "object" ? item : {};
    if (source.itemId && source.itemKind) return source;
    const itemId = String(source.id || "").trim();
    const legacyKind = String(source.kind || "").trim();
    const itemKind =
      legacyKind === "tool" || legacyKind === "tool_call"
        ? "tool-call"
        : legacyKind === "process"
          ? "thought"
          : legacyKind;
    if (!itemId || !itemKind) return null;
    const adapted = {};
    Object.keys(source).forEach(function (key) {
      if (key !== "id" && key !== "kind" && key !== "state") {
        adapted[key] = source[key];
      }
    });
    adapted.itemId = itemId;
    adapted.itemKind = itemKind;
    adapted.status =
      source.state === "in_progress" ? "in-progress" : source.state;
    if (source.revision && typeof source.revision === "object") {
      adapted.revision = {
        count: Number(source.revision.count) || 0,
        status: source.revision.status || source.revision.latestStatus || "",
        repairRound:
          Number(
            source.revision.repairRound || source.revision.latestRepairRound,
          ) || 0,
      };
    }
    return adapted;
  }

  function createItemPresentationRow(item) {
    if (!item || !item.itemId || !item.itemKind) return null;
    return Object.assign({}, item, {
      rowKey: "item:" + String(item.itemId),
      itemIds: [String(item.itemId)],
      rowKind: String(item.itemKind),
    });
  }

  function buildPresentationItemRows(items) {
    return (Array.isArray(items) ? items : [])
      .filter(function (item) {
        return item && item.itemKind !== "plan";
      })
      .map(createItemPresentationRow)
      .filter(Boolean);
  }

  function toolActivitySummaryState(items) {
    const tools = Array.isArray(items) ? items : [];
    const states = tools.map(function (tool) {
      return normalizeStatusToken(tool && tool.status);
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
    return (
      String(first.itemId || "").trim() ||
      "unknown-" + String(fallbackIndex || 0)
    );
  }

  function createToolActivityGroup(run, expandedIds, fallbackIndex) {
    const first = run[0] || {};
    const last = run[run.length - 1] || first;
    const rowKey = "tool-run:" + stableToolActivityGroupKey(run, fallbackIndex);
    return {
      rowKey,
      itemIds: run.map(function (item) {
        return String(item.itemId);
      }),
      rowKind: "tool-activity-group",
      items: run,
      createdAt: first.createdAt,
      updatedAt: last.updatedAt || last.createdAt,
      status: last.status,
      expanded:
        expandedIds &&
        typeof expandedIds.has === "function" &&
        expandedIds.has(rowKey),
    };
  }

  function buildTranscriptRenderItems(items, mode, expandedIds) {
    const presentationRows = buildPresentationItemRows(items);
    if (mode !== "bubble") return presentationRows;
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
    presentationRows.forEach(function (item) {
      if (item.rowKind === "tool-call") {
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
    if (item.rowKind === "message") return String(item.role || "assistant");
    if (
      item.rowKind === "tool-call" ||
      item.rowKind === "tool-activity-group"
    ) {
      return "tool";
    }
    if (item.rowKind === "permission") return "permission";
    if (item.rowKind === "thought") return "process";
    return String(item.rowKind || "status");
  }

  function createTranscriptNode(item) {
    const row = el("article", "assistant-transcript-row");
    row.setAttribute("data-assistant-row-key", String(item.rowKey || ""));
    row.setAttribute(
      "data-assistant-item-ids",
      (Array.isArray(item.itemIds) ? item.itemIds : []).join("\u001f"),
    );
    if (item.itemIds && item.itemIds.length === 1) {
      row.setAttribute("data-assistant-item-id", String(item.itemIds[0]));
    }
    const meta = el("div", "assistant-transcript-meta");
    const body = el("div", "assistant-transcript-body");
    body.setAttribute("data-assistant-transcript-body", "true");
    row.appendChild(meta);
    row.appendChild(body);
    return row;
  }

  function updateTranscriptClasses(row, item, options) {
    const kind = String(item.rowKind || "status");
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
      String(item.status || "").trim() === "streaming",
    );
    row.classList.toggle(
      "is-error",
      String(item.status || "").trim() === "error",
    );
    if (item.rowKind === "tool-activity-group") {
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
      String(revision.status || "") +
      ", repair round " +
      String(Number(revision.repairRound || 0));
    parent.appendChild(badge);
  }

  function renderPresentationRow(row, item, options) {
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
    const formattedTime = function (value) {
      try {
        return formatTime(value);
      } catch (_error) {
        return String(value || "");
      }
    };
    const renderMarkdownBody = function (target, value) {
      try {
        target.innerHTML = renderMarkdown(String(value || ""));
        decorateMarkdownCodeBlocks(target, options);
      } catch (_error) {
        target.textContent = String(value || "");
      }
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
    if (item.rowKind === "message") {
      meta.appendChild(
        el(
          "span",
          "assistant-transcript-role",
          transcriptLabel(
            options,
            String(item.role || "assistant"),
            String(item.role || "assistant"),
          ),
        ),
      );
      renderRevisionBadge(meta, item.revision, undefined, options);
      meta.appendChild(
        el("span", "assistant-transcript-time", formattedTime(item.createdAt)),
      );
      if (String(item.status || "").trim() === "streaming") {
        body.textContent = String(item.text || "");
        return;
      }
      body.classList.add("assistant-transcript-markdown-body");
      renderMarkdownBody(body, item.text);
      return;
    }
    if (item.rowKind === "thought") {
      meta.textContent = String(
        item.label || transcriptLabel(options, "thinking"),
      );
      if (String(item.status || "").trim() === "streaming") {
        body.textContent = String(item.text || "");
        return;
      }
      body.classList.add("assistant-transcript-markdown-body");
      renderMarkdownBody(body, item.text);
      return;
    }
    if (item.rowKind === "permission") {
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
    if (item.rowKind === "tool-call") {
      meta.textContent = transcriptLabel(options, "tool");
      const led = el(
        "span",
        "assistant-transcript-tool-led " + toolToneClass(item.status),
      );
      led.setAttribute("aria-hidden", "true");
      body.appendChild(led);
      appendToolDisplay(body, item);
      return;
    }
    if (item.rowKind === "tool-activity-group") {
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
          options.onToggleExpanded(item.rowKey);
        });
      }
      body.appendChild(summary);
      if (item.expanded === true) {
        const list = el("div", "assistant-transcript-tool-activity-list");
        item.items.forEach(function (tool) {
          const entry = el(
            "div",
            "assistant-transcript-tool-activity-item " +
              toolToneClass(tool.status),
          );
          setAssistantTooltip(entry, assistantToolCommandTooltip(tool));
          const toolLed = el(
            "span",
            "assistant-transcript-tool-led " + toolToneClass(tool.status),
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
    if (item.rowKind === "status" && item.label === "workspace-activity") {
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
      return normalizeStatusToken(tool.status) === "failed";
    }).length;
    const runningCount = tools.filter(function (tool) {
      const status = normalizeStatusToken(tool.status);
      return status === "in_progress" || status === "running";
    }).length;
    const pendingCount = tools.filter(function (tool) {
      return normalizeStatusToken(tool.status) === "pending";
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
    renderPresentationRow(row, item || {}, options || {});
  }

  function createRow(item, options) {
    return createTranscriptNode(item || {}, options || {});
  }

  function transcriptItemSignature(item, options) {
    const source = item || {};
    const expanded =
      source.rowKind === "tool-activity-group" && source.expanded === true
        ? "expanded"
        : "collapsed";
    return [
      options && options.variant,
      options && options.mode,
      source.rowKey,
      source.itemIds && source.itemIds.join(","),
      source.rowKind,
      source.role,
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
      source.revision && source.revision.status,
      Array.isArray(source.items)
        ? source.items
            .map(function (entry) {
              return [
                entry && entry.itemId,
                entry && entry.status,
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
    const kind = String((item && item.rowKind) || "");
    const state = String((item && item.status) || "");
    const nextText = String((item && item.text) || "");
    const previousText = row.getAttribute("data-assistant-stream-text");
    const body = row.querySelector("[data-assistant-transcript-body]");
    if (
      (kind === "message" || kind === "thought") &&
      state === "streaming" &&
      previousText !== null &&
      nextText.startsWith(previousText) &&
      body
    ) {
      const suffix = nextText.slice(previousText.length);
      const textNode = body.firstChild;
      if (
        suffix &&
        textNode &&
        textNode === body.lastChild &&
        typeof textNode.appendData === "function"
      ) {
        textNode.appendData(suffix);
      } else if (suffix) {
        body.textContent = nextText;
      }
      updateTranscriptClasses(row, item, options || {});
      row.setAttribute("data-assistant-stream-text", nextText);
      row.setAttribute("data-assistant-render-signature", signature);
      return true;
    }
    renderAssistantTranscriptItem(row, item, options);
    if (state === "streaming" && (kind === "message" || kind === "thought")) {
      row.setAttribute("data-assistant-stream-text", nextText);
    } else {
      row.removeAttribute("data-assistant-stream-text");
    }
    row.setAttribute("data-assistant-render-signature", signature);
    return true;
  }

  function applyAssistantTranscriptEffects(options) {
    const opts = options || {};
    const effect = opts.effect || {};
    const container = opts.container;
    const nodeMap = opts.nodeMap;
    if (
      effect.kind !== "mutations" ||
      effect.onSelectedPage !== true ||
      !container ||
      !nodeMap
    ) {
      return effect.kind === "mutations" && effect.onSelectedPage !== true;
    }
    const affected = new Map();
    (Array.isArray(opts.affectedItems) ? opts.affectedItems : []).forEach(
      function (item) {
        const itemId = String(item && item.itemId ? item.itemId : "").trim();
        if (itemId) affected.set(itemId, item);
      },
    );
    const operations = new Map();
    (Array.isArray(effect.mutations) ? effect.mutations : []).forEach(
      function (mutation) {
        const id = String(
          mutation && mutation.op === "upsert_item"
            ? mutation.item && mutation.item.itemId
            : mutation && mutation.itemId,
        ).trim();
        if (id) operations.set(id, mutation.op);
      },
    );
    const structural = Array.from(operations.values()).some(function (op) {
      return op === "upsert_item" || op === "delete_item";
    });
    const pageItems = Array.isArray(effect.pageItems) ? effect.pageItems : null;
    if (structural && !pageItems) return false;
    let virtualState = null;
    let virtual = null;
    let rawItems = pageItems;
    if (opts.virtualized) {
      if (!opts.page || !Array.isArray(opts.page.items)) return false;
      virtualState = getVirtualTranscriptState(container);
      const merged = mergeVirtualTranscriptPage(virtualState, opts.page, opts);
      if (!merged) return false;
      const latestOptions = Object.assign({}, opts);
      virtualState.latestOptions = latestOptions;
      virtual = buildVirtualTranscriptWindow(container, virtualState, opts);
      rawItems = virtual.items;
    }
    if (!rawItems) {
      operations.forEach(function (operation, itemId) {
        if (operation === "delete_item") return;
        const item = affected.get(itemId);
        const row = nodeMap.get("item:" + itemId);
        const presentation = createItemPresentationRow(item);
        if (!row || !presentation) return;
        renderAssistantTranscriptItemIfChanged(row, presentation, opts);
      });
      return true;
    }
    const rows = buildTranscriptRenderItems(
      rawItems,
      opts.mode === "bubble" ? "bubble" : "plain",
      opts.expandedIds,
    );
    const desiredKeys = new Set(
      rows.map(function (row) {
        return row.rowKey;
      }),
    );
    const changedItemIds = new Set(operations.keys());
    (Array.isArray(effect.evictedItemIds) ? effect.evictedItemIds : []).forEach(
      function (itemId) {
        changedItemIds.add(String(itemId));
      },
    );
    const dirtyRowKeys = new Set();
    let removedRows = 0;
    nodeMap.forEach(function (row, rowKey) {
      if (desiredKeys.has(String(rowKey))) return;
      if (row && row.parentNode === container) container.removeChild(row);
      nodeMap.delete(rowKey);
      dirtyRowKeys.add(String(rowKey));
      removedRows += 1;
    });
    let insertedRows = 0;
    let updatedRows = 0;
    rows.forEach(function (presentation, index) {
      const rowKey = String(presentation.rowKey);
      let row = nodeMap.get(rowKey);
      const representedItemIds = presentation.itemIds.join("\u001f");
      const membershipChanged =
        !!row &&
        row.getAttribute("data-assistant-item-ids") !== representedItemIds;
      const touchesChangedItem = presentation.itemIds.some(function (itemId) {
        return changedItemIds.has(itemId);
      });
      if (!row) {
        row = createRow(presentation, { variant: opts.variant });
        nodeMap.set(rowKey, row);
        dirtyRowKeys.add(rowKey);
        insertedRows += 1;
      } else if (membershipChanged || touchesChangedItem) {
        dirtyRowKeys.add(rowKey);
      }
      row.setAttribute("data-assistant-item-ids", representedItemIds);
      applyVirtualTranscriptRowMetadata(row, presentation, index, virtual);
      if (
        dirtyRowKeys.has(rowKey) &&
        renderAssistantTranscriptItemIfChanged(row, presentation, opts)
      ) {
        updatedRows += 1;
      }
    });
    const children = Array.from(container.children || []);
    let anchor =
      children.length &&
      children[children.length - 1].classList &&
      children[children.length - 1].classList.contains(
        "assistant-transcript-virtual-spacer",
      )
        ? children[children.length - 1]
        : null;
    for (let index = rows.length - 1; index >= 0; index -= 1) {
      const row = nodeMap.get(rows[index].rowKey);
      if (!row) return false;
      const currentChildren = Array.from(container.children || []);
      const rowIndex = currentChildren.indexOf(row);
      const next = rowIndex >= 0 ? currentChildren[rowIndex + 1] || null : null;
      if (next !== anchor) container.insertBefore(row, anchor);
      anchor = row;
    }
    const measuredChanged =
      virtualState && opts.virtualized
        ? measureVirtualTranscriptRows(
            container,
            virtualState,
            opts,
            dirtyRowKeys,
          )
        : false;
    if (measuredChanged && virtualState.lastVirtual) {
      virtualState.lastAnchor = captureVirtualScrollAnchor(
        container,
        virtualState.lastVirtual,
      );
    }
    if (virtualState && virtual) virtualState.lastVirtual = virtual;
    if (shouldStickAssistantTranscript(container, opts.stickThreshold)) {
      stickAssistantTranscriptToBottom(container);
    }
    if (typeof opts.onEffectRendered === "function") {
      opts.onEffectRendered({
        renderPath: "incremental",
        insertedRows,
        updatedRows,
        removedRows,
        measuredRows: dirtyRowKeys.size,
      });
    }
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
      const nextOwnerKey =
        String(opts.ownerKey || "").trim() ||
        String(
          opts.page && opts.page.ownerKey ? opts.page.ownerKey : "",
        ).trim();
      virtualState = getVirtualTranscriptState(container);
      if (virtualState.ownerKey !== nextOwnerKey) {
        resetAssistantTranscriptVirtualState(container, nextOwnerKey);
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
        resetAssistantTranscriptVirtualState(container, opts.ownerKey);
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
        return String(item.rowKind || "") + ":" + String(item.rowKey || "");
      })
      .join("|");
    const contextKey = [
      virtualized ? "virtual" : "items",
      variant,
      mode,
      virtualized ? String(opts.ownerKey || "") : "",
    ].join("|");
    const orderKey = contextKey + "\u001e" + itemOrderKey;
    const nodeMap = opts.nodeMap;
    const canDiff =
      nodeMap &&
      typeof nodeMap.get === "function" &&
      typeof nodeMap.set === "function";
    const previousOrder = String(opts.orderKey || "");
    const previousSeparator = previousOrder.indexOf("\u001e");
    const previousContext =
      previousSeparator >= 0 ? previousOrder.slice(0, previousSeparator) : "";
    const previousItemOrder =
      previousSeparator >= 0 ? previousOrder.slice(previousSeparator + 1) : "";
    const needsFullRender =
      previousContext !== contextKey || opts.modeKey !== mode || !canDiff;
    if (needsFullRender) {
      clearNode(container);
      if (canDiff) nodeMap.clear();
      if (virtualized && virtual) {
        appendVirtualTranscriptTopSpacer(container, virtual, opts);
      }
      items.forEach(function (item, index) {
        const row = createRow(item, { variant });
        applyVirtualTranscriptRowMetadata(row, item, index, virtual);
        if (canDiff) nodeMap.set(String(item.rowKey || ""), row);
        renderAssistantTranscriptItemIfChanged(row, item, opts);
        container.appendChild(row);
      });
      if (virtualized && virtual) {
        appendVirtualTranscriptBottomSpacer(container, virtual, opts);
      }
    } else {
      const desiredIds = new Set(
        items.map(function (item) {
          return String(item.rowKey || "");
        }),
      );
      nodeMap.forEach(function (row, id) {
        if (desiredIds.has(String(id))) return;
        if (row && row.parentNode === container) container.removeChild(row);
        nodeMap.delete(id);
      });
      items.forEach(function (item, index) {
        const rowKey = String(item.rowKey || "");
        let row = nodeMap.get(rowKey);
        if (!row) {
          row = createRow(item, { variant });
          nodeMap.set(rowKey, row);
          container.appendChild(row);
        }
        applyVirtualTranscriptRowMetadata(row, item, index, virtual);
        renderAssistantTranscriptItemIfChanged(row, item, opts);
      });
      if (previousItemOrder !== itemOrderKey) {
        let anchor = null;
        for (let index = items.length - 1; index >= 0; index -= 1) {
          const row = nodeMap.get(String(items[index].rowKey || ""));
          if (!row) continue;
          const children = Array.from(container.children || []);
          const rowIndex = children.indexOf(row);
          const next = rowIndex >= 0 ? children[rowIndex + 1] || null : null;
          if (next !== anchor) container.insertBefore(row, anchor);
          anchor = row;
        }
      }
    }
    const measuredChanged =
      virtualized && virtualState && virtual
        ? measureVirtualTranscriptRows(container, virtualState, opts)
        : false;
    if (shouldStick) stickAssistantTranscriptToBottom(container);
    else if (virtualized) {
      const hasSpacerScrollAnchor = isVirtualSpacerAnchor(scrollAnchor);
      if (
        !restoreVirtualScrollAnchor(container, virtual, scrollAnchor) &&
        !hasSpacerScrollAnchor &&
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
    adaptLegacyTranscriptItem,
    applyAssistantTranscriptEffects,
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
