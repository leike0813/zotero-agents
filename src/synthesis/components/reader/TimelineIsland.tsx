/** @jsxRuntime automatic */
/** @jsxImportSource preact */
import { useLayoutEffect, useRef } from "preact/hooks";

import { stableRegionSignature } from "../../../shared/regionEquality";
import {
  renderTopicTimeline,
  type TopicTimelineData,
} from "../../../shared/topicTimelineRenderer";
import type { TopicDetailProjection } from "./narrowing";
import type { ReaderText } from "./values";

// Topic timeline island (legacy renderTopicTimeline): the shared imperative
// renderer owns the produced DOM; the island rebuilds only when the timeline
// data signature or the selected evidence changes.

function paragraphsNode(value: string): Node {
  const box = document.createElement("div");
  box.className = "topic-prose";
  value
    .split(/\n{2,}/)
    .map((entry) => entry.trim())
    .filter(Boolean)
    .forEach((entry) => {
      const paragraph = document.createElement("p");
      paragraph.textContent = entry;
      box.appendChild(paragraph);
    });
  return box;
}

function emptyStructuredNode(message: string): Node {
  const empty = document.createElement("div");
  empty.className = "structured-empty";
  const strong = document.createElement("strong");
  strong.textContent = message;
  empty.appendChild(strong);
  return empty;
}

function buildTimelineData(detail: TopicDetailProjection): TopicTimelineData {
  const papers = detail.evidence
    .filter((row) => Number.isFinite(row.year))
    .map((row) => ({
      key: `paper:${row.id || row.index}`,
      year: row.year as number,
      label: row.code,
      title: row.title,
      order: row.index,
      weight: row.timelineWeight,
      tone: row.timelineTone,
      evidenceId: row.id,
      paperRef: row.refKey,
      sortKey: row.timelineSortKey,
    }));
  const groups = new Map<number, typeof detail.timeline.events>();
  detail.timeline.events.forEach((event) => {
    const year = Math.floor(event.year);
    const list = groups.get(year) || [];
    list.push(event);
    groups.set(year, list);
  });
  const events = Array.from(groups.entries())
    .sort(([left], [right]) => left - right)
    .map(([year, group], index) => {
      const first = group[0];
      return {
        key: `event:${year}`,
        year,
        label: String(year),
        title:
          group.length === 1
            ? first.title || `Milestone ${index + 1}`
            : `${year} milestones (${group.length})`,
        order: index,
        weight: 1.24,
        tone: first.tone,
        descriptions: group.map((event) => event.description).filter(Boolean),
        sortKey: `${`event:${year}`.toLowerCase()}:${String(index).padStart(6, "0")}`,
      };
    });
  return { summary: detail.timeline.summaryText || undefined, papers, events };
}

export function TopicTimelineIsland(props: {
  detail: TopicDetailProjection;
  t: ReaderText;
  selectedEvidenceId?: string;
  onOpenEvidence: (evidenceId: string) => void;
}) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const dataSignature = stableRegionSignature(buildTimelineData(props.detail));
  const hooksRef = useRef(props);
  hooksRef.current = props;

  useLayoutEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    host.textContent = "";
    const current = hooksRef.current;
    const node = renderTopicTimeline(buildTimelineData(current.detail), {
      labels: {
        title: current.t("synthesis-timeline"),
        milestones: current.t("synthesis-timeline-key-milestones"),
        papers: current.t("synthesis-timeline-literature-papers"),
        empty: current.t("synthesis-timeline-empty-dated-papers"),
      },
      selectedEvidenceId: current.selectedEvidenceId,
      renderSummary: paragraphsNode,
      renderEmpty: emptyStructuredNode,
      onPaperClick: (paper) => {
        if (paper.evidenceId) current.onOpenEvidence(paper.evidenceId);
      },
      canClickPaper: (paper) => Boolean(paper.evidenceId),
      disableUnclickablePapers: true,
    });
    host.appendChild(node);
  }, [dataSignature, props.selectedEvidenceId]);

  return <div ref={hostRef} data-reader-timeline-island="" />;
}
