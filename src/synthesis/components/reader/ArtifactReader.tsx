/** @jsxRuntime automatic */
/** @jsxImportSource preact */
import { useEffect, useLayoutEffect, useRef } from "preact/hooks";

import { stableRegionSignature } from "../../../shared/regionEquality";
import { renderMarkdownIsland } from "./markdownIsland";
import type { ArtifactReaderView, ReaderConceptsProjection } from "./narrowing";
import type { ReaderText } from "./values";
import { closeConceptBubble } from "./conceptOverlay";

// Artifact reader panel (legacy renderArtifactReader): raw topic artifact
// markdown with a copy action. Reached through the reader tab when the host
// delivered an artifact payload instead of a topic detail.

export function ArtifactReaderPanel(props: {
  t: ReaderText;
  concepts: ReaderConceptsProjection;
  artifact?: ArtifactReaderView;
  topicId: string;
  onAction: (action: string, payload?: Record<string, unknown>) => void;
}) {
  const { t, artifact } = props;
  const bodyHostRef = useRef<HTMLDivElement | null>(null);
  const markdown = artifact?.markdown || "";
  const islandSignature = stableRegionSignature([markdown, props.concepts]);
  const hooksRef = useRef({ t: props.t, concepts: props.concepts });
  hooksRef.current = { t: props.t, concepts: props.concepts };

  useEffect(() => () => closeConceptBubble(), []);

  useLayoutEffect(() => {
    const host = bodyHostRef.current;
    if (!host || !markdown) return;
    host.textContent = "";
    const island = renderMarkdownIsland(markdown, {
      variant: "artifact",
      t: hooksRef.current.t,
      concepts: hooksRef.current.concepts,
    });
    host.appendChild(island.body);
  }, [islandSignature, markdown]);

  const metaLine = [
    artifact?.updated_at
      ? `${t("synthesis-column-updated")} ${artifact.updated_at}`
      : "",
    artifact?.hash || "",
  ]
    .filter(Boolean)
    .join(" | ");

  return (
    <div class="reader-panel immersive-reader">
      <div class="reader-header">
        <div class="reader-title">
          <strong>
            {artifact?.title || props.topicId || t("synthesis-tab-reader")}
          </strong>
          {metaLine ? <span class="muted">{metaLine}</span> : null}
        </div>
        <div class="toolbar">
          <button
            type="button"
            onClick={() => props.onAction("closeArtifactReader")}
          >
            {t("synthesis-action-back-to-artifacts")}
          </button>
          <button
            type="button"
            onClick={() => {
              void navigator.clipboard?.writeText(markdown);
            }}
          >
            {t("synthesis-action-copy-markdown")}
          </button>
        </div>
      </div>
      {artifact ? (
        <div ref={bodyHostRef} data-reader-artifact-island="" />
      ) : (
        <div class="empty-state empty-state-info">
          <strong class="empty-state-title">
            {t("synthesis-topic-no-selection")}
          </strong>
          <p class="empty-state-message">
            {t("synthesis-topic-open-from-topics")}
          </p>
        </div>
      )}
    </div>
  );
}
