export type TopicTimelineTone =
  | "paper"
  | "milestone"
  | "frontier"
  | "foundation"
  | "external"
  | "warning";

export type TopicTimelinePaper = {
  key: string;
  year: number;
  label: string;
  title: string;
  order?: number;
  weight?: number;
  tone?: TopicTimelineTone;
  evidence?: Record<string, unknown>;
  evidenceId?: string;
  paperRef?: string;
  itemKey?: string;
  digestReferenceId?: string;
  sortKey?: string;
};

export type TopicTimelineEvent = {
  key: string;
  year: number;
  label: string;
  title: string;
  order?: number;
  weight?: number;
  tone?: TopicTimelineTone;
  event?: Record<string, unknown>;
  descriptions?: string[];
  sortKey?: string;
};

export type TopicTimelineData = {
  summary?: string;
  papers: TopicTimelinePaper[];
  events?: TopicTimelineEvent[];
};

export type TopicTimelineLabels = {
  title: string;
  milestones: string;
  papers: string;
  empty: string;
  currentPaper?: string;
};

export type TopicTimelineRenderOptions = {
  labels: TopicTimelineLabels;
  className?: string;
  selectedEvidenceId?: string;
  currentPaperRef?: string;
  currentItemKey?: string;
  currentPaperClass?: string;
  currentPaperPinScale?: number;
  currentPaperPinColor?: "red";
  renderSummary?: (summary: string) => Node;
  renderEmpty?: (message: string) => Node;
  onPaperClick?: (paper: TopicTimelinePaper, marker: HTMLButtonElement) => void;
  canClickPaper?: (paper: TopicTimelinePaper) => boolean;
  disableUnclickablePapers?: boolean;
};

type TimelineItem = {
  key: string;
  kind: "paper" | "event";
  year: number;
  label: string;
  title: string;
  order: number;
  weight: number;
  tone: TopicTimelineTone;
  paper?: TopicTimelinePaper;
  event?: TopicTimelineEvent;
  descriptions?: string[];
  sortKey?: string;
};

type TimelineInterval = {
  year: number;
  count: number;
  start: number;
  end: number;
};

type TimelineLayout = {
  minYear: number;
  maxYear: number;
  endYear: number;
  widthPx: number;
  intervals: TimelineInterval[];
};

type PlacedTimelineItem = {
  item: TimelineItem;
  left: number;
};

const TIMELINE_LABEL_COLLISION_GAP_PERCENT = 7;
const TIMELINE_BASE_WIDTH_PX = 1080;
const TIMELINE_YEAR_MIN_WIDTH_PX = 80;
const TIMELINE_MARKER_MIN_WIDTH_PX = 34;
const TIMELINE_RAIL_PADDING_PX = 80;
const TIMELINE_EDGE_TOOLTIP_PERCENT = 7;

let activeTimelinePopover: HTMLElement | undefined;

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className = "",
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function numericYear(value: unknown) {
  const direct = Number(value);
  if (Number.isFinite(direct) && direct > 1000 && direct < 3000) {
    return Math.floor(direct);
  }
  const match = String(value || "").match(/\b(1[5-9]\d{2}|20\d{2})\b/);
  return match ? Number(match[1]) : NaN;
}

function timelineYearCounts(items: TimelineItem[]): Map<number, number> {
  const counts = new Map<number, number>();
  items.forEach((item) => {
    const year = numericYear(item.year);
    if (!Number.isFinite(year)) return;
    counts.set(year, (counts.get(year) || 0) + 1);
  });
  return counts;
}

function timelineLayoutFromItems(
  items: TimelineItem[],
): TimelineLayout | undefined {
  const counts = timelineYearCounts(items);
  const years = Array.from(counts.keys()).sort((left, right) => left - right);
  if (!years.length) return undefined;
  const minYear = years[0];
  const maxYear = years[years.length - 1];
  const intervalYears: number[] = [];
  for (let year = minYear; year <= maxYear; year += 1) {
    intervalYears.push(year);
  }
  const weights = intervalYears.map((year) =>
    Math.max(
      TIMELINE_YEAR_MIN_WIDTH_PX,
      Math.max(1, counts.get(year) || 0) * TIMELINE_MARKER_MIN_WIDTH_PX,
    ),
  );
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  const widthPx = Math.max(
    TIMELINE_BASE_WIDTH_PX,
    totalWeight + TIMELINE_RAIL_PADDING_PX,
  );
  let cursor = 0;
  const intervals = intervalYears.map((year, index) => {
    const start = cursor;
    const width = (weights[index] / totalWeight) * 100;
    cursor += width;
    return {
      year,
      count: counts.get(year) || 0,
      start,
      end: index === intervalYears.length - 1 ? 100 : cursor,
    };
  });
  return { minYear, maxYear, endYear: maxYear + 1, widthPx, intervals };
}

function timelineAxisTicks(
  layout: TimelineLayout | undefined,
): { label: string; left: number }[] {
  if (!layout) return [];
  const ticks = layout.intervals.map((interval) => ({
    label: String(interval.year),
    left: interval.start,
  }));
  ticks.push({ label: String(layout.endYear), left: 100 });
  return ticks;
}

function timelineIntervalForYear(
  layout: TimelineLayout,
  year: number,
): TimelineInterval | undefined {
  return layout.intervals.find(
    (interval) => interval.year === Math.floor(year),
  );
}

function timelinePaperLeft(
  interval: TimelineInterval,
  itemIndex: number,
  total: number,
) {
  const count = Math.max(1, total);
  return (
    interval.start +
    ((itemIndex + 1) * (interval.end - interval.start)) / (count + 1)
  );
}

function timelineItemSortKey(item: TimelineItem) {
  if (item.sortKey) return item.sortKey;
  const paper = item.paper;
  const ref = paper?.paperRef || paper?.itemKey || item.key;
  const itemKey = ref.includes(":") ? ref.split(":").pop() : ref;
  const semanticKey = (
    itemKey ||
    item.key ||
    item.label ||
    item.title ||
    ""
  ).toLowerCase();
  return `${semanticKey}:${String(item.order).padStart(6, "0")}`;
}

function timelineDenseMarkerKeys(items: PlacedTimelineItem[]) {
  const dense = new Set<string>();
  const sorted = [...items]
    .filter((item) => Number.isFinite(item.left))
    .sort((left, right) => left.left - right.left);
  sorted.forEach((item, index) => {
    const prev = sorted[index - 1];
    const next = sorted[index + 1];
    if (
      (prev && item.left - prev.left < TIMELINE_LABEL_COLLISION_GAP_PERCENT) ||
      (next && next.left - item.left < TIMELINE_LABEL_COLLISION_GAP_PERCENT)
    ) {
      dense.add(item.item.key);
    }
  });
  return dense;
}

function timelineTooltipLines(item: TimelineItem) {
  if (item.kind !== "event") {
    return [item.title].filter(Boolean);
  }
  return item.descriptions?.length ? item.descriptions : [item.title];
}

function timelineTooltipText(item: TimelineItem) {
  return timelineTooltipLines(item).join("\n") || item.title;
}

function renderTimelineEventPopover(item: TimelineItem) {
  const popover = el(
    "div",
    "timeline-hover-popover timeline-milestone-popover",
  );
  const lines = timelineTooltipLines(item);
  lines.forEach((line) => {
    popover.appendChild(el("span", "timeline-milestone-row", line));
  });
  popover.title = lines.join("\n");
  return popover;
}

function renderTimelinePaperPopover(item: TimelineItem) {
  const popover = el("div", "timeline-hover-popover timeline-paper-popover");
  popover.appendChild(el("span", "timeline-milestone-row", item.title));
  popover.title = item.title;
  return popover;
}

export function hideTopicTimelineTooltip() {
  activeTimelinePopover?.remove();
  activeTimelinePopover = undefined;
}

function showTimelineTooltip(anchor: HTMLElement, item: TimelineItem) {
  hideTopicTimelineTooltip();
  const popover =
    item.kind === "event"
      ? renderTimelineEventPopover(item)
      : renderTimelinePaperPopover(item);
  const overlayRoot = document.body || document.documentElement;
  if (!overlayRoot) return;
  overlayRoot.appendChild(popover);
  const anchorRect = anchor.getBoundingClientRect();
  const popoverRect = popover.getBoundingClientRect();
  const margin = 8;
  const centeredLeft =
    anchorRect.left + anchorRect.width / 2 - popoverRect.width / 2;
  const maxLeft = Math.max(
    margin,
    window.innerWidth - popoverRect.width - margin,
  );
  const left = Math.min(Math.max(margin, centeredLeft), maxLeft);
  let top = anchorRect.top - popoverRect.height - 10;
  if (top < margin) top = anchorRect.bottom + 10;
  popover.style.left = `${left}px`;
  popover.style.top = `${Math.max(margin, top)}px`;
  activeTimelinePopover = popover;
}

function normalizePaper(
  paper: TopicTimelinePaper,
  index: number,
): TimelineItem {
  return {
    key: paper.key || `paper:${index}`,
    kind: "paper",
    year: numericYear(paper.year),
    label: paper.label || `P${index + 1}`,
    title: paper.title || paper.paperRef || `Paper ${index + 1}`,
    order: paper.order ?? index,
    paper,
    weight: Math.max(0.1, Number(paper.weight || 1)),
    tone: paper.tone || "paper",
    sortKey: paper.sortKey,
  };
}

function normalizeEvent(
  event: TopicTimelineEvent,
  index: number,
): TimelineItem {
  return {
    key: event.key || `event:${event.year}:${index}`,
    kind: "event",
    year: numericYear(event.year),
    label: event.label || String(event.year),
    title: event.title || `Milestone ${index + 1}`,
    order: event.order ?? index,
    event,
    descriptions: event.descriptions,
    weight: Math.max(0.1, Number(event.weight || 1.24)),
    tone: event.tone || "milestone",
    sortKey: event.sortKey,
  };
}

function defaultSummary(summary: string) {
  const fragment = document.createDocumentFragment();
  summary
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean)
    .forEach((part) => fragment.appendChild(el("p", "", part)));
  return fragment;
}

function defaultEmpty(message: string) {
  return el("div", "empty", message);
}

function currentPaperMatches(
  paper: TopicTimelinePaper | undefined,
  options: TopicTimelineRenderOptions,
) {
  if (!paper) return false;
  return Boolean(
    (options.currentPaperRef && paper.paperRef === options.currentPaperRef) ||
    (options.currentItemKey && paper.itemKey === options.currentItemKey),
  );
}

function renderTimelineClusters(
  items: TimelineItem[],
  layout: TimelineLayout,
  options: TopicTimelineRenderOptions,
) {
  const byYear = new Map<string, TimelineItem[]>();
  items.forEach((item) => {
    const key = String(Math.floor(item.year));
    const list = byYear.get(key) || [];
    list.push(item);
    byYear.set(key, list);
  });
  const placedItems: PlacedTimelineItem[] = [];
  Array.from(byYear.entries()).forEach(([key, clusterItems]) => {
    const year = Number(key);
    const sortedItems = [...clusterItems].sort((left, right) =>
      timelineItemSortKey(left).localeCompare(timelineItemSortKey(right)),
    );
    const interval = timelineIntervalForYear(layout, year);
    if (!interval) return;
    const paperItems = sortedItems.filter((item) => item.kind === "paper");
    const eventItems = sortedItems.filter((item) => item.kind === "event");
    paperItems.forEach((item, itemIndex) => {
      placedItems.push({
        item,
        left: timelinePaperLeft(interval, itemIndex, paperItems.length),
      });
    });
    eventItems.forEach((item) => {
      placedItems.push({ item, left: interval.end });
    });
  });
  const fragment = document.createDocumentFragment();
  const denseTimelineMarkerKeys = timelineDenseMarkerKeys(placedItems);
  placedItems.forEach(({ item, left }) => {
    const phase = el("section", "timeline-phase");
    phase.style.left = `${left}%`;
    phase.appendChild(el("div", "phase-title"));
    const markerList = el("div", "marker-list");
    const markerClasses = [
      "timeline-marker",
      `timeline-${item.kind}`,
      `timeline-tone-${item.tone}`,
    ];
    if (left <= TIMELINE_EDGE_TOOLTIP_PERCENT) markerClasses.push("near-left");
    if (left >= 100 - TIMELINE_EDGE_TOOLTIP_PERCENT)
      markerClasses.push("near-right");
    if (denseTimelineMarkerKeys.has(item.key)) markerClasses.push("too-dense");
    if (
      item.kind === "paper" &&
      options.selectedEvidenceId &&
      item.paper?.evidenceId === options.selectedEvidenceId
    ) {
      markerClasses.push("selected");
    }
    if (item.kind === "paper" && currentPaperMatches(item.paper, options)) {
      markerClasses.push(options.currentPaperClass || "timeline-current-paper");
    }
    const marker = el("button", markerClasses.join(" "));
    marker.type = "button";
    marker.style.left = "0";
    marker.dataset.topicTimelineKind = item.kind;
    marker.dataset.topicTimelineKey = item.key;
    if (item.kind === "paper") {
      if (item.paper?.paperRef)
        marker.dataset.topicPaperRef = item.paper.paperRef;
      if (item.paper?.itemKey) marker.dataset.topicItemKey = item.paper.itemKey;
      if (item.paper?.digestReferenceId)
        marker.dataset.digestRef = item.paper.digestReferenceId;
    }
    const pinScale =
      item.kind === "paper" && currentPaperMatches(item.paper, options)
        ? options.currentPaperPinScale || item.weight
        : item.weight;
    marker.style.setProperty("--pin-scale", String(pinScale));
    marker.title = timelineTooltipText(item);
    marker.setAttribute("aria-label", marker.title);
    marker.appendChild(el("span", "timeline-code", item.label));
    const pin = el("span", "timeline-pin");
    pin.appendChild(el("span", "timeline-pin-body"));
    pin.appendChild(el("span", "timeline-pin-dot"));
    marker.appendChild(pin);
    marker.addEventListener("mouseenter", () =>
      showTimelineTooltip(marker, item),
    );
    marker.addEventListener("focus", () => showTimelineTooltip(marker, item));
    marker.addEventListener("mouseleave", hideTopicTimelineTooltip);
    marker.addEventListener("blur", hideTopicTimelineTooltip);
    if (item.kind === "paper") {
      const canClick = options.canClickPaper
        ? options.canClickPaper(item.paper as TopicTimelinePaper)
        : Boolean(options.onPaperClick);
      if (canClick && options.onPaperClick) {
        marker.addEventListener("click", () =>
          options.onPaperClick?.(item.paper as TopicTimelinePaper, marker),
        );
      } else if (options.disableUnclickablePapers !== false) {
        marker.disabled = true;
      }
    }
    markerList.appendChild(marker);
    phase.appendChild(markerList);
    fragment.appendChild(phase);
  });
  return fragment;
}

export function renderTopicTimeline(
  data: TopicTimelineData,
  options: TopicTimelineRenderOptions,
) {
  const paperItems = (data.papers || [])
    .map(normalizePaper)
    .filter((item) => Number.isFinite(item.year));
  const eventItems = (data.events || [])
    .map(normalizeEvent)
    .filter((item) => Number.isFinite(item.year));
  const layout = timelineLayoutFromItems(paperItems);
  const items = [...paperItems, ...eventItems].filter((item) => {
    if (!layout) return false;
    return !!timelineIntervalForYear(layout, item.year);
  });
  items.sort((left, right) => left.year - right.year);
  const rail = el(
    "section",
    ["topic-timeline", options.className || ""].filter(Boolean).join(" "),
  );
  const head = el("div", "timeline-head");
  head.appendChild(el("strong", "", options.labels.title));
  const legend = el("div", "timeline-legend");
  const legEvent = el("div", "legend-item");
  legEvent.appendChild(el("span", "legend-icon legend-icon-event"));
  legEvent.appendChild(el("span", "legend-label", options.labels.milestones));
  legend.appendChild(legEvent);
  const legPaper = el("div", "legend-item");
  legPaper.appendChild(el("span", "legend-icon legend-icon-paper"));
  legPaper.appendChild(el("span", "legend-label", options.labels.papers));
  legend.appendChild(legPaper);
  if (options.labels.currentPaper) {
    const legCurrent = el("div", "legend-item");
    legCurrent.appendChild(el("span", "legend-icon legend-icon-current"));
    legCurrent.appendChild(
      el("span", "legend-label", options.labels.currentPaper),
    );
    legend.appendChild(legCurrent);
  }
  head.appendChild(legend);
  rail.appendChild(head);
  if (data.summary) {
    const summaryBlock = el("div", "timeline-summary");
    summaryBlock.appendChild(
      options.renderSummary
        ? options.renderSummary(data.summary)
        : defaultSummary(data.summary),
    );
    rail.appendChild(summaryBlock);
  }
  if (!layout || !paperItems.length) {
    rail.appendChild(
      options.renderEmpty
        ? options.renderEmpty(options.labels.empty)
        : defaultEmpty(options.labels.empty),
    );
    return rail;
  }
  const scroll = el("div", "timeline-scroll");
  scroll.addEventListener("scroll", hideTopicTimelineTooltip);
  const timeline = el("div", "horizontal-timeline");
  timeline.style.width = `${layout.widthPx}px`;
  const trackInner = el("div", "timeline-inner-rail");
  const axis = el("div", "time-axis");
  timelineAxisTicks(layout).forEach((tick) => {
    const stepEl = el("span", "", tick.label);
    stepEl.style.position = "absolute";
    stepEl.style.left = `${tick.left}%`;
    stepEl.style.transform = "translateX(-50%)";
    axis.appendChild(stepEl);
  });
  trackInner.appendChild(axis);
  trackInner.appendChild(renderTimelineClusters(items, layout, options));
  timeline.appendChild(trackInner);
  scroll.appendChild(timeline);
  rail.appendChild(scroll);
  return rail;
}

export const topicTimelineRendererInternals = {
  TIMELINE_LABEL_COLLISION_GAP_PERCENT,
  TIMELINE_BASE_WIDTH_PX,
  TIMELINE_YEAR_MIN_WIDTH_PX,
  TIMELINE_MARKER_MIN_WIDTH_PX,
  TIMELINE_RAIL_PADDING_PX,
  TIMELINE_EDGE_TOOLTIP_PERCENT,
  timelineYearCounts,
  timelineLayoutFromItems,
  timelinePaperLeft,
  timelineDenseMarkerKeys,
};
