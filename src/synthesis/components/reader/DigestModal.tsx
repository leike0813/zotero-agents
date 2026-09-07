/** @jsxRuntime automatic */
/** @jsxImportSource preact */
import { useEffect, useLayoutEffect, useRef } from "preact/hooks";

import { stableRegionSignature } from "../../../shared/regionEquality";
import { renderMarkdownIsland } from "./markdownIsland";
import { closeConceptBubble } from "./conceptOverlay";
import type {
  ReaderConceptsProjection,
  ReaderDigestResultView,
  ReaderEvidenceRow,
} from "./narrowing";
import type { ReaderText } from "./values";

// Paper digest modal (legacy renderDigestModal/syncDigestModal). The modal
// state (open evidence, loading vs resolved) is ReaderRegion-local; the
// resolved digest result arrives through the region selection. The digest
// body, its outline, and the intro block (source-changed warning +
// representative image) form one imperative island so Preact never shares DOM
// ownership with the markdown renderer.

export type DigestModalState = {
  evidence: ReaderEvidenceRow;
  loading: boolean;
  result?: ReaderDigestResultView;
};

function buildIntroNode(
  result: ReaderDigestResultView,
  t: ReaderText,
): HTMLElement {
  const intro = document.createElement("div");
  intro.className = "digest-modal-intro";
  if (result.sourceChanged) {
    const warning = document.createElement("div");
    warning.className = "digest-warning";
    warning.textContent = t("synthesis-paper-digest-source-changed");
    intro.appendChild(warning);
  }
  const image = result.representativeImage;
  if (image) {
    const figure = document.createElement("figure");
    figure.className = "digest-representative-image";
    const img = document.createElement("img");
    img.src = image.dataUrl;
    img.alt = image.alt || t("synthesis-image-alt-representative");
    img.loading = "lazy";
    if (image.width > 0) img.width = image.width;
    if (image.height > 0) img.height = image.height;
    figure.appendChild(img);
    if (image.caption) {
      const caption = document.createElement("figcaption");
      caption.textContent = image.caption;
      figure.appendChild(caption);
    }
    intro.appendChild(figure);
  }
  return intro;
}

export function DigestModal(props: {
  t: ReaderText;
  concepts: ReaderConceptsProjection;
  state: DigestModalState;
  onClose: () => void;
}) {
  const { t, state } = props;
  const result = state.result;
  const markdown = result?.markdown || "";
  const contentRef = useRef<HTMLDivElement | null>(null);
  const islandSignature = stableRegionSignature([
    markdown,
    result?.sourceChanged,
    result?.representativeImage,
    props.concepts,
  ]);
  const hooksRef = useRef({ t: props.t, concepts: props.concepts });
  hooksRef.current = { t: props.t, concepts: props.concepts };

  useEffect(() => () => closeConceptBubble(), []);

  useLayoutEffect(() => {
    const content = contentRef.current;
    if (!content || state.loading) return;
    content.textContent = "";
    if (!markdown || !result) {
      const intro = result ? buildIntroNode(result, hooksRef.current.t) : null;
      if (intro && intro.childNodes.length) content.appendChild(intro);
      const empty = document.createElement("div");
      empty.className = "empty";
      empty.textContent =
        result?.status ||
        hooksRef.current.t("synthesis-paper-digest-unavailable");
      content.appendChild(empty);
      return;
    }
    const island = renderMarkdownIsland(markdown, {
      variant: "digest",
      t: hooksRef.current.t,
      concepts: hooksRef.current.concepts,
    });
    const intro = buildIntroNode(result, hooksRef.current.t);
    if (intro.childNodes.length) island.body.prepend(intro);
    const digestBody = document.createElement("div");
    digestBody.className = "paper-digest-body";
    if (island.outline) {
      digestBody.appendChild(island.outline);
    } else {
      digestBody.classList.add("no-outline");
    }
    const scrollBody = document.createElement("div");
    scrollBody.className = "digest-scroll-body";
    scrollBody.appendChild(island.body);
    digestBody.appendChild(scrollBody);
    content.appendChild(digestBody);
  }, [islandSignature, state.loading, markdown, result]);

  return (
    <div class="paper-digest-modal">
      <section class="paper-digest-dialog">
        <div class="paper-digest-header">
          <strong>{state.evidence.title || t("synthesis-paper-digest")}</strong>
          <button type="button" onClick={props.onClose}>
            {t("synthesis-action-close")}
          </button>
        </div>
        {state.loading ? (
          <div class="empty">{t("synthesis-paper-digest-loading")}</div>
        ) : (
          <div class="paper-digest-content" ref={contentRef} />
        )}
      </section>
    </div>
  );
}
