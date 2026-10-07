/** @jsxRuntime automatic */
/** @jsxImportSource preact */
import type {
  ReaderEvidenceRow,
  ReaderSimilarityResultView,
  TopicDetailProjection,
} from "./narrowing";
import { evidenceForRef } from "./narrowing";
import { textValue, toneFor } from "./values";
import type { ReaderText } from "./values";
import { Badge, LocalizedBadge, Paragraphs } from "./sections";

// Evidence explorer + slide-over drawer (legacy renderEvidenceExplorer /
// renderEvidenceDrawer / renderSelectedEvidenceCard). Open state and selection
// are component-local UI state owned by ReaderRegion.

type DerivedLinks = {
  claims: string[];
  timeline: string[];
  taxonomy: string[];
};

function evidenceMatchesRef(
  detail: TopicDetailProjection,
  row: ReaderEvidenceRow,
  ref: unknown,
): boolean {
  const match = evidenceForRef(detail.evidence, ref);
  return !!match && match.id === row.id;
}

function derivedEvidenceLinks(
  detail: TopicDetailProjection,
  row: ReaderEvidenceRow,
): DerivedLinks {
  const matches: DerivedLinks = { claims: [], timeline: [], taxonomy: [] };
  detail.claims.forEach((claim, index) => {
    if (claim.sourceRefs.some((ref) => evidenceMatchesRef(detail, row, ref))) {
      matches.claims.push(claim.id || `C${index + 1}`);
    }
  });
  detail.timeline.events.forEach((event, index) => {
    const primaryRef = event.sourceRefs[0];
    if (primaryRef && evidenceMatchesRef(detail, row, primaryRef)) {
      matches.timeline.push(event.title || `T${index + 1}`);
    }
  });
  detail.taxonomy.nodes.forEach((node, index) => {
    if (node.sourceRefs.some((ref) => evidenceMatchesRef(detail, row, ref))) {
      matches.taxonomy.push(node.title || `N${index + 1}`);
    }
  });
  return matches;
}

const DERIVED_LINK_LABEL_KEYS = {
  claims: "synthesis-topic-tab-claims",
  timeline: "synthesis-timeline",
  taxonomy: "synthesis-topic-tab-taxonomy",
} as const;

/** Seed identifier: the raw evidence ref the Host resolves to a portable ref. */
function similaritySeedRef(row: ReaderEvidenceRow): string {
  return textValue(row.paperRefArg) || row.refKey || row.id;
}

function similarityMaterialLabel(
  t: ReaderText,
  kind: ReaderSimilarityResultView["materialKind"],
): string {
  if (kind === "generated") {
    return t("synthesis-similarity-material-generated");
  }
  if (kind === "weak") {
    return t("synthesis-similarity-material-weak");
  }
  return t("synthesis-similarity-material-metadata");
}

function SelectedEvidenceSimilarity(props: {
  t: ReaderText;
  row: ReaderEvidenceRow;
  similarity?: ReaderSimilarityResultView;
  pendingCommands: string[];
  onAction: (action: string, payload?: Record<string, unknown>) => void;
}) {
  const { t } = props;
  const seedRef = similaritySeedRef(props.row);
  const similarity = props.similarity;
  // Owner isolation: only the selected paper's own seed result is rendered.
  const own =
    similarity && similarity.seedRef === seedRef ? similarity : undefined;
  const pending = props.pendingCommands.includes("retrievalRecommendSimilar");
  return (
    <div class="evidence-similarity">
      <h3>{t("synthesis-similarity-title")}</h3>
      <button
        type="button"
        class={pending ? "is-busy" : ""}
        disabled={pending}
        aria-busy={pending ? "true" : undefined}
        onClick={() =>
          props.onAction("hostCommand", {
            command: "retrievalRecommendSimilar",
            args: { paper_ref: seedRef },
          })
        }
      >
        {pending ? <span class="button-spinner" aria-hidden="true" /> : null}
        {t("synthesis-similarity-action")}
      </button>
      {pending && !own ? (
        <p class="muted">{t("synthesis-similarity-loading")}</p>
      ) : null}
      {own ? (
        own.status === "unavailable" ? (
          <p class="muted">{t("synthesis-similarity-unavailable")}</p>
        ) : own.results.length === 0 ? (
          <p class="muted">{t("synthesis-similarity-empty")}</p>
        ) : (
          <div class="similarity-panel">
            {own.status === "limited" ? (
              <span class="badge warn">
                {t("synthesis-similarity-limited")}
              </span>
            ) : null}
            <ul class="similarity-results">
              {own.results.map((result, index) => (
                <li
                  class="similarity-card"
                  key={String(result.paperRefKey) + ":" + index}
                >
                  <div class="similarity-card-head">
                    <strong>{result.title || result.paperRefKey}</strong>
                    <span class="badge info">
                      {similarityMaterialLabel(t, result.materialKind)}
                    </span>
                  </div>
                  {result.excerpt ? (
                    <p class="muted">{result.excerpt}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        )
      ) : null}
    </div>
  );
}

function SelectedEvidenceCard(props: {
  t: ReaderText;
  detail: TopicDetailProjection;
  row: ReaderEvidenceRow;
  similarity?: ReaderSimilarityResultView;
  pendingCommands: string[];
  onAction: (action: string, payload?: Record<string, unknown>) => void;
  onOpenDigest: (row: ReaderEvidenceRow) => void;
}) {
  const { t, detail, row } = props;
  const links = derivedEvidenceLinks(detail, row);
  const linkEntries = (
    Object.entries(links) as Array<[keyof DerivedLinks, string[]]>
  ).filter(([, refs]) => refs.length);
  const meta = [row.yearText, row.refKey].filter(Boolean).join(" | ");
  return (
    <div class="selected-evidence-card">
      <div class="chip-row">
        <Badge text={t("synthesis-evidence-selected")} tone="blue" />
        {row.status ? (
          <LocalizedBadge text={row.status} tone={toneFor(row.status)} t={t} />
        ) : null}
      </div>
      <span class="evidence-code">{row.code}</span>
      <h2>{row.title}</h2>
      {meta ? <p class="muted">{meta}</p> : null}
      {row.summary ? <Paragraphs value={row.summary} /> : null}
      {linkEntries.length ? (
        <div class="evidence-stack">
          {linkEntries.map(([kind, refs]) => (
            <div class="evidence-row" key={kind}>
              <strong>{t(DERIVED_LINK_LABEL_KEYS[kind])}</strong>
              <span class="muted">{refs.join(", ")}</span>
            </div>
          ))}
        </div>
      ) : null}
      <button
        type="button"
        class="primary"
        onClick={() => props.onOpenDigest(row)}
      >
        {t("synthesis-action-open-digest-artifact")}
      </button>
      <SelectedEvidenceSimilarity
        t={t}
        row={row}
        similarity={props.similarity}
        pendingCommands={props.pendingCommands}
        onAction={props.onAction}
      />
    </div>
  );
}

export function EvidenceExplorer(props: {
  t: ReaderText;
  detail: TopicDetailProjection;
  selectedEvidenceId?: string;
  similarity?: ReaderSimilarityResultView;
  pendingCommands: string[];
  onAction: (action: string, payload?: Record<string, unknown>) => void;
  onClose: () => void;
  onOpenDigest: (row: ReaderEvidenceRow) => void;
}) {
  const { t, detail, selectedEvidenceId } = props;
  const rows = detail.evidence;
  const selected = selectedEvidenceId
    ? evidenceForRef(rows, selectedEvidenceId)
    : undefined;
  return (
    <aside class="evidence-explorer">
      <div class="explorer-head">
        <h2>{t("synthesis-evidence-explorer")}</h2>
        <button
          type="button"
          class="icon-button evidence-drawer-close"
          title={t("synthesis-evidence-explorer")}
          onClick={props.onClose}
        >
          {t("synthesis-action-close")}
        </button>
      </div>
      {!rows.length ? (
        <div class="empty">{t("synthesis-evidence-none-linked")}</div>
      ) : !selected ? (
        <div class="explorer-empty">
          <strong>{t("synthesis-evidence-none-selected")}</strong>
          <p class="muted">{t("synthesis-evidence-select-hint")}</p>
        </div>
      ) : (
        <SelectedEvidenceCard
          t={t}
          detail={detail}
          row={selected}
          similarity={props.similarity}
          pendingCommands={props.pendingCommands}
          onAction={props.onAction}
          onOpenDigest={props.onOpenDigest}
        />
      )}
    </aside>
  );
}

export function EvidenceDrawer(props: {
  t: ReaderText;
  detail: TopicDetailProjection;
  open: boolean;
  selectedEvidenceId?: string;
  similarity?: ReaderSimilarityResultView;
  pendingCommands: string[];
  onAction: (action: string, payload?: Record<string, unknown>) => void;
  onClose: () => void;
  onOpenDigest: (row: ReaderEvidenceRow) => void;
}) {
  const { t, detail, open } = props;
  return (
    <div
      class={`evidence-drawer${open ? " open" : ""}`}
      aria-hidden={open ? "false" : "true"}
      onClick={(event) => {
        if (event.target === event.currentTarget) props.onClose();
      }}
    >
      <div
        class="evidence-drawer-panel"
        role="complementary"
        aria-label={t("synthesis-evidence-explorer")}
      >
        <EvidenceExplorer
          t={t}
          detail={detail}
          selectedEvidenceId={props.selectedEvidenceId}
          similarity={props.similarity}
          pendingCommands={props.pendingCommands}
          onAction={props.onAction}
          onClose={props.onClose}
          onOpenDigest={props.onOpenDigest}
        />
      </div>
    </div>
  );
}
