/** @jsxRuntime automatic */
/** @jsxImportSource preact */
import { memo } from "preact/compat";
import { useEffect, useLayoutEffect, useState } from "preact/hooks";

import {
  equalBySignature,
  stableRegionSignature,
} from "../../../shared/regionEquality";
import type { SynthesisWorkbenchMessageKey } from "../../../shared/synthesisWorkbenchWireContract";
import { ArtifactReaderPanel } from "./ArtifactReader";
import { DigestModal, type DigestModalState } from "./DigestModal";
import { EvidenceDrawer } from "./EvidenceDrawer";
import { TopicTimelineIsland } from "./TimelineIsland";
import { closeConceptBubble } from "./conceptOverlay";
import type { ReaderEvidenceRow, ReaderRegionSelection } from "./narrowing";
import { evidenceForRef } from "./narrowing";
import {
  Badge,
  LocalizedBadge,
  TOPIC_DETAIL_SECTION_TABS,
  TopicSectionSwitch,
  type ReaderSectionContext,
  type TopicDetailSectionId,
} from "./sections";
import { operationLabel, toneFor } from "./values";
import type { ReaderText } from "./values";

// Reader surface region: topic detail (8 section tabs + citation graph export
// section), evidence explorer drawer, topic timeline island, digest modal,
// and the artifact reader. All wire payloads arrive narrowed through the
// selection; interactions leave through onAction.

export type ReaderRegionProps = {
  selection: ReaderRegionSelection;
  t: ReaderText;
  onAction: (action: string, payload?: Record<string, unknown>) => void;
  /** Standalone citation_graph section host: mounts the graph island. */
  renderGraphIsland?: (container: HTMLElement) => void | (() => void);
};

const CITATION_GRAPH_TAB: {
  id: TopicDetailSectionId;
  labelKey: SynthesisWorkbenchMessageKey;
} = { id: "citation_graph", labelKey: "synthesis-topic-tab-citation-graph" };

function TopicDetailToolbar(props: {
  ctx: ReaderSectionContext;
  selection: ReaderRegionSelection;
  onOpenCitationGraph: () => void;
}) {
  const { ctx, selection, onOpenCitationGraph } = props;
  const { t, detail } = ctx;
  const topicId = detail.topicId || selection.topicId || "";
  const updatePending = ctx.pendingCommands.includes(
    "submitTopicSynthesisUpdate",
  );
  const exportPending = ctx.pendingCommands.includes("exportTopicDetailHtml");
  const busyTitle = (command: string) =>
    t("synthesis-operation-in-progress", {
      operation: operationLabel(t, command),
    });
  return (
    <div class="toolbar topic-detail-toolbar">
      <div class="topic-detail-toolbar-meta">
        <Badge text={detail.language || "auto"} tone="blue" />
        <Badge
          text={t("synthesis-topic-paper-count", { count: detail.paperCount })}
          tone="green"
        />
        {detail.coverageVerdict ? (
          <LocalizedBadge
            text={detail.coverageVerdict}
            tone={toneFor(detail.coverageVerdict)}
            t={t}
          />
        ) : null}
      </div>
      <div class="topic-detail-toolbar-actions">
        {!selection.standalone ? (
          <button
            type="button"
            onClick={() => ctx.onAction("selectTab", { tab: "artifacts" })}
          >
            {t("synthesis-action-back-to-topics")}
          </button>
        ) : null}
        <button
          type="button"
          class={updatePending ? "is-busy" : ""}
          disabled={
            selection.standalone ||
            !selection.updateIntentAvailable ||
            updatePending
          }
          aria-busy={updatePending ? "true" : undefined}
          title={
            updatePending ? busyTitle("submitTopicSynthesisUpdate") : undefined
          }
          onClick={() =>
            ctx.onAction("hostCommand", {
              command: "submitTopicSynthesisUpdate",
              args: { topicId },
            })
          }
        >
          {updatePending ? (
            <span class="button-spinner" aria-hidden="true" />
          ) : null}
          {t("synthesis-action-update")}
        </button>
        <button
          type="button"
          onClick={() =>
            selection.standalone
              ? onOpenCitationGraph()
              : ctx.onAction("openTopicCitationSubgraph", { topicId })
          }
        >
          {t("synthesis-action-open-citation-subgraph")}
        </button>
        <button
          type="button"
          class={`topic-detail-export-button ${
            exportPending ? "is-busy" : ""
          }`.trim()}
          disabled={selection.standalone || exportPending}
          aria-busy={exportPending ? "true" : undefined}
          title={exportPending ? busyTitle("exportTopicDetailHtml") : undefined}
          onClick={() =>
            ctx.onAction("hostCommand", {
              command: "exportTopicDetailHtml",
              args: { topicId, title: detail.title },
            })
          }
        >
          {exportPending ? (
            <span class="button-spinner" aria-hidden="true" />
          ) : null}
          {t("synthesis-action-export-topic-html")}
        </button>
      </div>
    </div>
  );
}

function TopicDetailView(props: ReaderRegionProps) {
  const { selection, t, onAction } = props;
  const detail = selection.detail!;
  const [section, setSection] = useState<TopicDetailSectionId>("overview");
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [selectedEvidenceId, setSelectedEvidenceId] = useState<
    string | undefined
  >(undefined);
  const [digest, setDigest] = useState<DigestModalState | null>(null);

  const openEvidence = (evidenceId?: string) => {
    if (evidenceId) setSelectedEvidenceId(evidenceId);
    setEvidenceOpen(true);
  };
  const selectEvidenceRef = (ref: string) => {
    const match = evidenceForRef(detail.evidence, ref);
    setSelectedEvidenceId(match ? match.id : ref || undefined);
    setEvidenceOpen(true);
  };
  const openDigest = (row: ReaderEvidenceRow) => {
    setSelectedEvidenceId(row.id || undefined);
    if (selection.standalone) {
      const found = row.standaloneDigestKeys
        .map((key) => selection.standaloneDigests?.[key])
        .find(Boolean);
      setDigest({
        evidence: row,
        loading: false,
        result:
          found ||
          ({
            ok: false,
            status: t("synthesis-standalone-digest-unavailable"),
            markdown: "",
            sourceChanged: false,
          } as const),
      });
      return;
    }
    setDigest({ evidence: row, loading: true });
    onAction("hostCommand", {
      command: "resolveTopicPaperDigest",
      args: {
        topicId: detail.topicId || selection.topicId,
        paper_ref: row.paperRefArg,
        digest_ref: row.digestRefArg,
        include_representative_image: true,
      },
    });
  };

  // The host digest reply resolves the pending modal; result identity changes
  // per synthesis:digest message.
  const digestResult = selection.digestResult;
  const digestResultSignature = stableRegionSignature(digestResult);
  useLayoutEffect(() => {
    const result = digestResult;
    if (!result) return;
    setDigest((current) =>
      current?.loading ? { ...current, loading: false, result } : current,
    );
  }, [digestResultSignature, digestResult]);

  // Escape closes the digest modal first, then the evidence drawer.
  useEffect(() => {
    const ownerDocument =
      typeof document === "undefined" ? undefined : document;
    if (!ownerDocument) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (digest) {
        setDigest(null);
        return;
      }
      if (evidenceOpen) setEvidenceOpen(false);
    };
    ownerDocument.addEventListener("keydown", onKeyDown);
    return () => ownerDocument.removeEventListener("keydown", onKeyDown);
  }, [digest, evidenceOpen]);

  useEffect(() => () => closeConceptBubble(), []);

  const ctx: ReaderSectionContext = {
    t,
    detail,
    concepts: selection.concepts,
    standalone: selection.standalone,
    pendingCommands: selection.pendingCommands,
    onAction,
    onSelectEvidenceRef: selectEvidenceRef,
    onOpenEvidence: openEvidence,
    onOpenDigest: openDigest,
  };
  const tabs = selection.standalone
    ? [...TOPIC_DETAIL_SECTION_TABS, CITATION_GRAPH_TAB]
    : TOPIC_DETAIL_SECTION_TABS;
  const activeSection = tabs.some((tab) => tab.id === section)
    ? section
    : "overview";
  const readerClass =
    activeSection === "report"
      ? "topic-reading-surface topic-report-reading-surface"
      : activeSection === "citation_graph"
        ? "topic-reading-surface topic-graph-reading-surface"
        : "topic-reading-surface";

  return (
    <div class="topic-detail-shell detail-shell-in-workbench">
      <TopicDetailToolbar
        ctx={ctx}
        selection={selection}
        onOpenCitationGraph={() => setSection("citation_graph")}
      />
      <section class="topic-detail">
        <div class="topic-detail-layout">
          <nav class="topic-detail-tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                class={activeSection === tab.id ? "active" : ""}
                onClick={() => setSection(tab.id)}
              >
                {t(tab.labelKey)}
              </button>
            ))}
          </nav>
          <main class={readerClass}>
            <TopicSectionSwitch
              ctx={ctx}
              section={activeSection}
              selectedEvidenceId={selectedEvidenceId}
              graphIslandHost={props.renderGraphIsland}
            />
          </main>
        </div>
        <EvidenceDrawer
          t={t}
          detail={detail}
          open={evidenceOpen}
          selectedEvidenceId={selectedEvidenceId}
          onClose={() => setEvidenceOpen(false)}
          onOpenDigest={openDigest}
        />
        <TopicTimelineIsland
          detail={detail}
          t={t}
          selectedEvidenceId={selectedEvidenceId}
          onOpenEvidence={openEvidence}
        />
      </section>
      {digest ? (
        <DigestModal
          t={t}
          concepts={selection.concepts}
          state={digest}
          onClose={() => setDigest(null)}
        />
      ) : null}
    </div>
  );
}

function ReaderRegionBody(props: ReaderRegionProps) {
  const { selection, t, onAction } = props;
  if (selection.kind === "artifact") {
    return (
      <ArtifactReaderPanel
        t={t}
        concepts={selection.concepts}
        artifact={selection.artifact}
        topicId={selection.topicId}
        onAction={onAction}
      />
    );
  }
  if (selection.kind !== "topicDetail" || !selection.detail) {
    return (
      <div class="topic-detail-shell detail-shell-in-workbench">
        <div class="empty-state empty-state-info">
          <strong class="empty-state-title">
            {t("synthesis-empty-no-topics")}
          </strong>
          <p class="empty-state-message">
            {t("synthesis-topic-open-from-topics")}
          </p>
        </div>
      </div>
    );
  }
  return <TopicDetailView {...props} />;
}

export const ReaderRegion = memo(
  function ReaderRegion(props: ReaderRegionProps) {
    const detailKey = props.selection.detail?.topicId ?? "";
    // Keyed by topic identity so section/drawer/digest local state resets when
    // the reader switches topics (legacy reset on synthesis:topic-detail).
    return (
      <div
        class="synthesis-reader-region"
        data-region-content="synthesis-reader"
      >
        <ReaderRegionBody
          key={`${props.selection.kind}:${detailKey}`}
          {...props}
        />
      </div>
    );
  },
  (prev, next) =>
    prev.t === next.t &&
    prev.onAction === next.onAction &&
    prev.renderGraphIsland === next.renderGraphIsland &&
    equalBySignature(prev.selection, next.selection),
);
