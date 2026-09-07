/** @jsxRuntime automatic */
/** @jsxImportSource preact */
import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "preact/hooks";

export type WindowedRow<T> = {
  item: T;
  index: number;
  key: string;
};

export type WindowedRows<T> = {
  visibleRows: WindowedRow<T>[];
  startIndex: number;
  endIndex: number;
  topSpacerHeight: number;
  middleSpacerHeight: number;
  middleSpacerAfter: number | null;
  bottomSpacerHeight: number;
  totalHeight: number;
  scrollRef: (node: HTMLElement | null) => void;
  onScroll: (event: Event) => void;
  onFocusIn: (event: FocusEvent) => void;
  measureRow: (key: string, node: HTMLElement | null) => void;
  scrollToIndex: (index: number) => void;
};

export type WindowedGridRows<T> = WindowedRows<readonly T[]> & {
  columnCount: number;
  containerRef: (node: HTMLElement | null) => void;
};

export type WindowedRowsOptions<T> = {
  getKey: (item: T, index: number) => string;
  resetKey: string;
  estimatedRowHeight: number;
  overscanPx?: number;
};

const DEFAULT_OVERSCAN_PX = 480;

function positiveHeight(value: number, fallback: number): number {
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function offsetForIndex(index: number, offsets: readonly number[]): number {
  const end = Math.max(0, Math.min(offsets.length - 1, Math.floor(index)));
  return offsets[end] || 0;
}

function indexAtOffset(offset: number, offsets: readonly number[]): number {
  const itemCount = Math.max(0, offsets.length - 1);
  if (!itemCount) return 0;
  const target = Math.max(0, offset);
  let low = 0;
  let high = itemCount;
  while (low < high) {
    const middle = Math.ceil((low + high) / 2);
    if (offsets[middle] <= target) {
      low = middle;
    } else {
      high = middle - 1;
    }
  }
  return Math.max(0, Math.min(itemCount - 1, low));
}

/**
 * Keeps only the rows around the scroll viewport in the DOM. Row heights are
 * learned from rendered rows and retained by stable row key, so a measured
 * row can leave and re-enter the window without changing the scroll model.
 */
export function useWindowedRows<T>(
  items: readonly T[],
  options: WindowedRowsOptions<T>,
): WindowedRows<T> {
  const estimatedRowHeight = positiveHeight(options.estimatedRowHeight, 48);
  const overscanPx = positiveHeight(
    options.overscanPx || DEFAULT_OVERSCAN_PX,
    DEFAULT_OVERSCAN_PX,
  );
  const keys = useMemo(
    () =>
      items.map((item, index) => options.getKey(item, index) || String(index)),
    [items],
  );
  const heightsRef = useRef(new Map<string, number>());
  const nodesRef = useRef(new Map<string, HTMLElement>());
  const observerRef = useRef<ResizeObserver | null>(null);
  const scrollNodeRef = useRef<HTMLElement | null>(null);
  const focusedKeyRef = useRef<string | null>(null);
  const [revision, setRevision] = useState(0);
  const [viewport, setViewport] = useState({ top: 0, height: 720 });

  useLayoutEffect(() => {
    const staleKeys = new Set(keys);
    for (const key of heightsRef.current.keys()) {
      if (!staleKeys.has(key)) heightsRef.current.delete(key);
    }
    for (const key of nodesRef.current.keys()) {
      if (!staleKeys.has(key)) nodesRef.current.delete(key);
    }
    if (focusedKeyRef.current && !staleKeys.has(focusedKeyRef.current)) {
      focusedKeyRef.current = null;
    }
  }, [options.resetKey, keys]);

  useLayoutEffect(() => {
    focusedKeyRef.current = null;
    const node = scrollNodeRef.current;
    if (!node || node.scrollTop === 0) return;
    node.scrollTop = 0;
    setViewport({
      top: 0,
      height: Math.max(1, node.clientHeight || 720),
    });
  }, [options.resetKey]);

  useLayoutEffect(() => {
    if (typeof ResizeObserver !== "function") return;
    const observer = new ResizeObserver((entries) => {
      let changed = false;
      for (const entry of entries) {
        const key = entry.target.getAttribute("data-windowed-row-key") || "";
        if (!key) continue;
        const height = positiveHeight(
          entry.contentRect?.height ||
            entry.target.getBoundingClientRect().height,
          estimatedRowHeight,
        );
        const previous = heightsRef.current.get(key);
        if (!previous || Math.abs(previous - height) > 1) {
          heightsRef.current.set(key, height);
          changed = true;
        }
      }
      if (changed) setRevision((value) => value + 1);
    });
    observerRef.current = observer;
    for (const node of nodesRef.current.values()) observer.observe(node);
    return () => {
      observer.disconnect();
      observerRef.current = null;
    };
  }, [estimatedRowHeight, options.resetKey]);

  const scrollRef = useCallback((node: HTMLElement | null) => {
    scrollNodeRef.current = node;
    if (node) {
      setViewport({
        top: node.scrollTop,
        height: Math.max(1, node.clientHeight || 720),
      });
    }
  }, []);

  const onScroll = useCallback((event: Event) => {
    const node = event.currentTarget as HTMLElement | null;
    if (!node) return;
    setViewport({
      top: Math.max(0, node.scrollTop),
      height: Math.max(1, node.clientHeight || 720),
    });
  }, []);

  const onFocusIn = useCallback((event: FocusEvent) => {
    const target = event.target as HTMLElement | null;
    const row = target?.closest<HTMLElement>("[data-windowed-row-key]");
    if (row) focusedKeyRef.current = row.dataset.windowedRowKey || null;
  }, []);

  const measureRow = useCallback(
    (key: string, node: HTMLElement | null) => {
      const normalizedKey = key || "";
      if (!normalizedKey) return;
      const previousNode = nodesRef.current.get(normalizedKey);
      if (previousNode && previousNode !== node) {
        observerRef.current?.unobserve(previousNode);
      }
      if (!node) {
        nodesRef.current.delete(normalizedKey);
        return;
      }
      nodesRef.current.set(normalizedKey, node);
      const height = positiveHeight(
        node.getBoundingClientRect().height || node.offsetHeight,
        estimatedRowHeight,
      );
      const previousHeight = heightsRef.current.get(normalizedKey);
      if (!previousHeight || Math.abs(previousHeight - height) > 1) {
        heightsRef.current.set(normalizedKey, height);
        setRevision((value) => value + 1);
      }
      observerRef.current?.observe(node);
    },
    [estimatedRowHeight],
  );

  const offsets = useMemo(() => {
    const next = new Array<number>(keys.length + 1);
    next[0] = 0;
    for (let index = 0; index < keys.length; index += 1) {
      next[index + 1] =
        next[index] +
        positiveHeight(
          heightsRef.current.get(keys[index]) || 0,
          estimatedRowHeight,
        );
    }
    return next;
  }, [keys, estimatedRowHeight, revision]);
  const totalHeight = offsets[offsets.length - 1] || 0;
  const startIndex = items.length
    ? indexAtOffset(Math.max(0, viewport.top - overscanPx), offsets)
    : 0;
  const endIndex = items.length
    ? Math.min(
        items.length,
        indexAtOffset(viewport.top + viewport.height + overscanPx, offsets) + 1,
      )
    : 0;
  const focusedIndex = focusedKeyRef.current
    ? keys.indexOf(focusedKeyRef.current)
    : -1;
  const normalRows = items.slice(startIndex, endIndex).map((item, offset) => ({
    item,
    index: startIndex + offset,
    key: keys[startIndex + offset],
  }));
  let visibleRows = normalRows;
  let windowStart = startIndex;
  let windowEnd = endIndex;
  let middleSpacerHeight = 0;
  let middleSpacerAfter: number | null = null;
  if (focusedIndex >= 0 && focusedIndex < startIndex) {
    visibleRows = [
      {
        item: items[focusedIndex],
        index: focusedIndex,
        key: keys[focusedIndex],
      },
      ...normalRows,
    ];
    windowStart = focusedIndex;
    middleSpacerHeight = Math.max(
      0,
      offsetForIndex(startIndex, offsets) -
        offsetForIndex(focusedIndex + 1, offsets),
    );
    middleSpacerAfter = 0;
  } else if (focusedIndex >= endIndex) {
    visibleRows = [
      ...normalRows,
      {
        item: items[focusedIndex],
        index: focusedIndex,
        key: keys[focusedIndex],
      },
    ];
    windowEnd = focusedIndex + 1;
    middleSpacerHeight = Math.max(
      0,
      offsetForIndex(focusedIndex, offsets) - offsetForIndex(endIndex, offsets),
    );
    middleSpacerAfter = normalRows.length - 1;
  }
  const topSpacerHeight = offsetForIndex(windowStart, offsets);
  const renderedHeight = offsetForIndex(windowEnd, offsets);
  const bottomSpacerHeight = Math.max(0, totalHeight - renderedHeight);

  const scrollToIndex = useCallback(
    (index: number) => {
      const node = scrollNodeRef.current;
      if (!node) return;
      const top = offsetForIndex(index, offsets);
      node.scrollTo?.({ top, behavior: "auto" });
      if (typeof node.scrollTo !== "function") node.scrollTop = top;
      setViewport({
        top,
        height: Math.max(1, node.clientHeight || 720),
      });
    },
    [offsets],
  );

  return {
    visibleRows,
    startIndex: windowStart,
    endIndex: windowEnd,
    topSpacerHeight,
    middleSpacerHeight,
    middleSpacerAfter,
    bottomSpacerHeight,
    totalHeight,
    scrollRef,
    onScroll,
    onFocusIn,
    measureRow,
    scrollToIndex,
  };
}

export function useWindowedGridRows<T>(
  items: readonly T[],
  options: WindowedRowsOptions<T> & {
    columnWidth?: number;
    gap?: number;
  },
): WindowedGridRows<T> {
  const containerRefObject = useRef<HTMLElement | null>(null);
  const [columnCount, setColumnCount] = useState(1);
  const columnWidth = positiveHeight(options.columnWidth || 220, 220);
  const gap = Math.max(0, options.gap || 12);
  const updateColumnCount = useCallback(() => {
    const width = containerRefObject.current?.clientWidth || 0;
    const next = width
      ? Math.max(1, Math.floor((width + gap) / (columnWidth + gap)))
      : 1;
    setColumnCount((current) => (current === next ? current : next));
  }, [columnWidth, gap]);
  useLayoutEffect(() => {
    updateColumnCount();
    const node = containerRefObject.current;
    if (!node || typeof ResizeObserver !== "function") return;
    const observer = new ResizeObserver(updateColumnCount);
    observer.observe(node);
    return () => observer.disconnect();
  }, [updateColumnCount]);
  const groups = useMemo(() => {
    const result: T[][] = [];
    for (let index = 0; index < items.length; index += columnCount) {
      result.push(items.slice(index, index + columnCount) as T[]);
    }
    return result;
  }, [items, columnCount]);
  const grouped = useWindowedRows(groups, {
    getKey: (group, index) =>
      group
        .map((item, offset) =>
          options.getKey(item, index * columnCount + offset),
        )
        .join("\u0001") || String(index),
    resetKey: `${options.resetKey}|columns:${columnCount}`,
    estimatedRowHeight: options.estimatedRowHeight,
    overscanPx: options.overscanPx,
  });
  const containerRef = useCallback(
    (node: HTMLElement | null) => {
      containerRefObject.current = node;
      grouped.scrollRef(node);
      updateColumnCount();
    },
    [grouped.scrollRef, updateColumnCount],
  );
  return { ...grouped, columnCount, containerRef };
}

export function WindowedTableSpacer(props: {
  height: number;
  colSpan: number;
}) {
  if (props.height <= 0) return null;
  return (
    <tr class="synthesis-window-spacer" aria-hidden="true">
      <td
        colSpan={props.colSpan}
        style={{ height: `${props.height}px`, padding: 0, border: 0 }}
      />
    </tr>
  );
}

export function WindowedGridSpacer(props: { height: number }) {
  if (props.height <= 0) return null;
  return (
    <div
      class="synthesis-window-spacer"
      aria-hidden="true"
      style={{ height: `${props.height}px` }}
    />
  );
}
