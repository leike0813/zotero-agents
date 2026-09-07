/** @jsxRuntime automatic */
/** @jsxImportSource preact */
import type { ComponentChildren } from "preact";
import { useEffect, useLayoutEffect, useRef, useState } from "preact/hooks";

import { stableRegionSignature } from "../../../shared/regionEquality";
import type { SynthesisWorkbenchMessageKey } from "../../../shared/synthesisWorkbenchWireContract";
import {
  closeConceptBubble,
  projectReportConceptEntries,
  scheduleReaderConceptBubbleClose,
  showReaderConceptBubble,
} from "./conceptOverlay";
import { renderMarkdownIsland } from "./markdownIsland";
import type {
  ReaderConceptsProjection,
  ReaderCoverageCard,
  ReaderEvidenceRow,
  ReaderMethodRow,
  ReaderTaxonomyAxis,
  ReaderTaxonomyNode,
  TopicDetailProjection,
} from "./narrowing";
import {
  enumLabel,
  enumKeyPart,
  maybeLocalizedValue,
  operationLabel,
  toneFor,
} from "./values";
import type { ReaderText } from "./values";

// The eight topic detail sections (legacy renderTopic*Section functions).
// Declarative Preact everywhere except the report body, which is an imperative
// markdown island mounted through a ref.

export type ReaderSectionContext = {
  t: ReaderText;
  detail: TopicDetailProjection;
  concepts: ReaderConceptsProjection;
  standalone: boolean;
  pendingCommands: string[];
  onAction: (action: string, payload?: Record<string, unknown>) => void;
  onSelectEvidenceRef: (ref: string) => void;
  onOpenEvidence: (evidenceId: string) => void;
  onOpenDigest: (row: ReaderEvidenceRow) => void;
};

// ---------------------------------------------------------------------------
// Shared building blocks
// ---------------------------------------------------------------------------

export function Badge(props: {
  text: unknown;
  tone?: string;
  className?: string;
}) {
  const label = String(props.text ?? "").trim();
  return (
    <span class={`badge ${props.tone || ""} ${props.className || ""}`.trim()}>
      {label || "-"}
    </span>
  );
}

/** Legacy badge(): localizes known enums, falls back to the raw text. */
export function LocalizedBadge(props: {
  text: unknown;
  tone?: string;
  className?: string;
  t: ReaderText;
}) {
  return (
    <Badge
      text={maybeLocalizedValue(props.t, props.text) || "-"}
      tone={props.tone}
      className={props.className}
    />
  );
}

export function Paragraphs(props: { value: unknown }) {
  const blocks = Array.isArray(props.value)
    ? props.value.map((entry) => String(entry ?? "").trim()).filter(Boolean)
    : String(props.value ?? "")
        .split(/\n{2,}/)
        .map((entry) => entry.trim())
        .filter(Boolean);
  return (
    <div class="topic-prose">
      {blocks.map((entry, index) => (
        <p key={index}>{entry}</p>
      ))}
    </div>
  );
}

export function ContentCard(props: {
  title: string;
  className?: string;
  children?: ComponentChildren;
}) {
  return (
    <section class={props.className || "content-card"}>
      <h3>{props.title}</h3>
      {props.children}
    </section>
  );
}

export function EmptyStructured(props: { label: string; t: ReaderText }) {
  return (
    <div class="structured-empty">
      <strong>{props.label}</strong>
      <p class="muted">{props.t("synthesis-structured-empty-message")}</p>
    </div>
  );
}

function KeyValueValue(props: { value: unknown; t: ReaderText }) {
  const raw = props.value;
  if (raw === null || raw === undefined) {
    return <strong>-</strong>;
  }
  if (
    typeof raw === "string" ||
    typeof raw === "number" ||
    typeof raw === "boolean"
  ) {
    return <strong>{String(raw)}</strong>;
  }
  if (Array.isArray(raw)) {
    return (
      <div class="kv-array-wrap">
        {raw.map((item, index) => (
          <Badge
            key={index}
            text={
              typeof item === "object" ? JSON.stringify(item) : String(item)
            }
          />
        ))}
      </div>
    );
  }
  return (
    <div class="kv-sub-list">
      {Object.entries(raw as Record<string, unknown>).map(
        ([subKey, subValue]) => (
          <div class="kv-sub-row" key={subKey}>
            <span class="muted">{`${subKey.replace(/_/g, " ")}: `}</span>
            <span>
              {typeof subValue === "object"
                ? JSON.stringify(subValue)
                : String(subValue)}
            </span>
          </div>
        ),
      )}
    </div>
  );
}

export function KeyValueList(props: {
  value: Record<string, unknown>;
  t: ReaderText;
}) {
  return (
    <div class="topic-kv-list">
      {Object.entries(props.value).map(([key, raw]) => (
        <div class="topic-kv-row" key={key}>
          <span class="muted">{key.replace(/_/g, " ")}</span>
          <KeyValueValue value={raw} t={props.t} />
        </div>
      ))}
    </div>
  );
}

function EvidenceRefChips(props: {
  ctx: ReaderSectionContext;
  refs: string[];
  tone?: string;
}) {
  if (!props.refs.length) return null;
  return (
    <div class="evidence-chips">
      {props.refs.map((ref) => (
        <button
          key={ref}
          type="button"
          class={`chip ${props.tone || "blue"}`}
          title={props.ctx.t("synthesis-action-view-evidence")}
          onClick={() => props.ctx.onSelectEvidenceRef(ref)}
        >
          {ref}
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Overview
// ---------------------------------------------------------------------------

function ScopeBoundaryValue(props: { value: unknown; t: ReaderText }) {
  const raw = props.value;
  if (Array.isArray(raw)) {
    return (
      <div class="kv-array-wrap">
        {raw.map((item, index) => (
          <Badge
            key={index}
            text={
              typeof item === "object" ? JSON.stringify(item) : String(item)
            }
          />
        ))}
      </div>
    );
  }
  if (raw && typeof raw === "object") {
    return <KeyValueList value={raw as Record<string, unknown>} t={props.t} />;
  }
  return (
    <strong>{raw === null || raw === undefined ? "-" : String(raw)}</strong>
  );
}

export function TopicOverviewSection({ ctx }: { ctx: ReaderSectionContext }) {
  const { t, detail } = ctx;
  const overview = detail.overview;
  const boundary = overview.scopeBoundary;
  const boundaryRows: Array<[string, unknown]> = [];
  if (boundary?.researchArea) {
    boundaryRows.push([
      t("synthesis-topic-research-area"),
      boundary.researchArea,
    ]);
  }
  if (boundary?.include !== undefined) {
    boundaryRows.push([t("synthesis-scope-include"), boundary.include]);
  }
  if (boundary?.exclude !== undefined) {
    boundaryRows.push([t("synthesis-scope-exclude"), boundary.exclude]);
  }
  const hasOutline =
    !!overview.outlineImportance || overview.outlineStrategies.length > 0;
  const hasContent =
    overview.summaryBlocks.length > 0 ||
    overview.takeaways.length > 0 ||
    boundaryRows.length > 0 ||
    hasOutline;
  return (
    <div class="topic-section">
      <h2>{t("synthesis-topic-tab-overview")}</h2>
      {overview.summaryBlocks.length ? (
        <div class="overview-summary-hero">
          <h3 class="hero-title">{t("synthesis-synthesis-summary")}</h3>
          {overview.summaryBlocks.map((block, index) => (
            <Paragraphs key={index} value={block} />
          ))}
        </div>
      ) : null}
      {overview.takeaways.length ? (
        <ContentCard title={t("synthesis-key-takeaways")}>
          <ul class="outline-key-point-list">
            {overview.takeaways.map((takeaway, index) => (
              <li key={index}>{takeaway}</li>
            ))}
          </ul>
        </ContentCard>
      ) : null}
      {boundaryRows.length ? (
        <ContentCard title={t("synthesis-scope-boundary")}>
          <div class="topic-kv-list">
            {boundaryRows.map(([label, raw]) => (
              <div class="topic-kv-row" key={label}>
                <span class="muted">{label}</span>
                <ScopeBoundaryValue value={raw} t={t} />
              </div>
            ))}
          </div>
        </ContentCard>
      ) : null}
      {hasOutline ? (
        <div class="overview-outline-section">
          <h3>{t("synthesis-review-blueprint")}</h3>
          {overview.outlineImportance ? (
            <ContentCard title={t("synthesis-topic-importance")}>
              <Paragraphs value={overview.outlineImportance} />
            </ContentCard>
          ) : null}
          <div class="outline-group-grid">
            {overview.outlineStrategies.map((strategy, index) => (
              <article class="outline-blueprint-card" key={index}>
                <div class="claim-header">
                  <strong>
                    {strategy.title ||
                      t("synthesis-writing-strategy", { count: index + 1 })}
                  </strong>
                  {strategy.recommended ? (
                    <Badge text={t("synthesis-recommended")} tone="green" />
                  ) : null}
                </div>
                {strategy.thesis ? (
                  <ContentCard
                    title={t("synthesis-thesis")}
                    className="outline-strategy-field"
                  >
                    <Paragraphs value={strategy.thesis} />
                  </ContentCard>
                ) : null}
                {strategy.writing ? (
                  <ContentCard
                    title={t("synthesis-strategy")}
                    className="outline-strategy-field"
                  >
                    <Paragraphs value={strategy.writing} />
                  </ContentCard>
                ) : null}
                {strategy.sectionPlan.length ? (
                  <ContentCard
                    title={t("synthesis-section-plan")}
                    className="outline-strategy-field"
                  >
                    <ul class="outline-key-point-list">
                      {strategy.sectionPlan.map((point, pointIndex) => (
                        <li key={pointIndex}>{point}</li>
                      ))}
                    </ul>
                  </ContentCard>
                ) : null}
                {strategy.bestFor ? (
                  <ContentCard
                    title={t("synthesis-best-for")}
                    className="outline-strategy-field"
                  >
                    <Paragraphs value={strategy.bestFor} />
                  </ContentCard>
                ) : null}
                {strategy.risks ? (
                  <ContentCard
                    title={t("synthesis-risks")}
                    className="outline-strategy-field"
                  >
                    <Paragraphs value={strategy.risks} />
                  </ContentCard>
                ) : null}
                <EvidenceRefChips ctx={ctx} refs={strategy.sourceRefs} />
              </article>
            ))}
          </div>
        </div>
      ) : null}
      {!hasContent ? (
        <EmptyStructured label={t("synthesis-empty-overview")} t={t} />
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Taxonomy
// ---------------------------------------------------------------------------

const TAXONOMY_AXIS_MESSAGE_KEYS: Record<string, SynthesisWorkbenchMessageKey> =
  {
    problem_formulation: "synthesis-taxonomy-axis-problem-formulation",
    technical_mechanism: "synthesis-taxonomy-axis-technical-mechanism",
    evidence_scope: "synthesis-taxonomy-axis-evidence-scope",
    research_route: "synthesis-taxonomy-axis-research-route",
    application_context: "synthesis-taxonomy-axis-application-context",
  };

const TAXONOMY_AXIS_TONE_CLASSES = [
  "axis-tone-blue",
  "axis-tone-green",
  "axis-tone-purple",
  "axis-tone-orange",
  "axis-tone-teal",
];

function taxonomyAxisLabel(t: ReaderText, axisType: string): string {
  const key = TAXONOMY_AXIS_MESSAGE_KEYS[axisType];
  return key ? t(key) : axisType.replace(/_/g, " ");
}

function TaxonomyNodeCard(props: {
  ctx: ReaderSectionContext;
  node: ReaderTaxonomyNode;
  index: number;
}) {
  const { ctx, node, index } = props;
  const { t } = ctx;
  return (
    <article class="taxonomy-list-item">
      <header class="taxonomy-item-header">
        <div class="taxonomy-item-title">
          <span class="claim-index">{`T${index + 1}`}</span>
          <h3>
            {node.title || t("synthesis-taxonomy-node", { count: index + 1 })}
          </h3>
        </div>
        {node.maturity ? <Badge text={node.maturity} tone="purple" /> : null}
      </header>
      {node.description ? (
        <p class="taxonomy-item-desc">{node.description}</p>
      ) : null}
      {node.problem ||
      node.mechanism ||
      node.strengths.length ||
      node.limitations.length ? (
        <div class="taxonomy-item-details">
          {node.problem || node.mechanism ? (
            <div class="taxonomy-detail-group">
              {node.problem ? (
                <div class="taxonomy-detail-row">
                  <span class="muted">{t("synthesis-detail-problem")}</span>
                  <strong>{node.problem}</strong>
                </div>
              ) : null}
              {node.mechanism ? (
                <div class="taxonomy-detail-row">
                  <span class="muted">{t("synthesis-detail-mechanism")}</span>
                  <strong>{node.mechanism}</strong>
                </div>
              ) : null}
            </div>
          ) : null}
          {node.strengths.length || node.limitations.length ? (
            <div class="taxonomy-detail-group pros-cons">
              {node.strengths.length ? (
                <div class="taxonomy-detail-row">
                  <span class="muted">{t("synthesis-detail-strengths")}</span>
                  <ul class="taxonomy-bullet-list">
                    {node.strengths.map((strength, strengthIndex) => (
                      <li class="pro-item" key={strengthIndex}>
                        {strength}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {node.limitations.length ? (
                <div class="taxonomy-detail-row">
                  <span class="muted">{t("synthesis-detail-limitations")}</span>
                  <ul class="taxonomy-bullet-list">
                    {node.limitations.map((limitation, limitationIndex) => (
                      <li class="con-item" key={limitationIndex}>
                        {limitation}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
      {node.sourceRefs.length ? (
        <footer class="taxonomy-item-footer">
          <EvidenceRefChips ctx={ctx} refs={node.sourceRefs} tone="blue" />
        </footer>
      ) : null}
    </article>
  );
}

function TaxonomyAxisGroup(props: {
  ctx: ReaderSectionContext;
  axis: ReaderTaxonomyAxis;
  axisIndex: number;
}) {
  const { ctx, axis, axisIndex } = props;
  const { t } = ctx;
  return (
    <section
      class={`taxonomy-axis-group ${
        TAXONOMY_AXIS_TONE_CLASSES[
          axisIndex % TAXONOMY_AXIS_TONE_CLASSES.length
        ]
      }`}
    >
      <header class="taxonomy-axis-header">
        <span class="taxonomy-axis-index">
          {String(axisIndex + 1).padStart(2, "0")}
        </span>
        <div class="taxonomy-axis-heading">
          <span class="taxonomy-axis-kicker">
            {t("synthesis-classification-axis")}
          </span>
          <h3 class="taxonomy-axis-title">
            {axis.axisType
              ? taxonomyAxisLabel(t, axis.axisType)
              : `${t("synthesis-classification-axis")} ${axisIndex + 1}`}
          </h3>
          {axis.rationale ? (
            <p class="taxonomy-axis-rationale">{axis.rationale}</p>
          ) : null}
        </div>
      </header>
      {axis.nodes.length ? (
        <div class="taxonomy-axis-body">
          <div class="taxonomy-list">
            {axis.nodes.map((node, index) => (
              <TaxonomyNodeCard
                ctx={ctx}
                node={node}
                index={index}
                key={index}
              />
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

export function TopicTaxonomySection({ ctx }: { ctx: ReaderSectionContext }) {
  const { t, detail } = ctx;
  const taxonomy = detail.taxonomy;
  const hasContent =
    !!taxonomy.summaryText ||
    taxonomy.axes.length > 0 ||
    !!taxonomy.fallbackAxis ||
    !!taxonomy.fallbackRationale ||
    taxonomy.nodes.length > 0;
  return (
    <div class="topic-section">
      <h2>{t("synthesis-topic-tab-taxonomy")}</h2>
      {taxonomy.summaryText ? (
        <ContentCard title={t("synthesis-route-synthesis")}>
          <Paragraphs value={taxonomy.summaryText} />
        </ContentCard>
      ) : null}
      {taxonomy.axes.length ? (
        taxonomy.axes.map((axis, axisIndex) => (
          <TaxonomyAxisGroup
            ctx={ctx}
            axis={axis}
            axisIndex={axisIndex}
            key={axisIndex}
          />
        ))
      ) : (
        <>
          {taxonomy.fallbackAxis || taxonomy.fallbackRationale ? (
            <ContentCard title={t("synthesis-classification-axis")}>
              <div class="taxonomy-head">
                {taxonomy.fallbackAxis ? (
                  <Badge text={taxonomy.fallbackAxis} tone="blue" />
                ) : null}
                {taxonomy.fallbackRationale ? (
                  <Paragraphs value={taxonomy.fallbackRationale} />
                ) : null}
              </div>
            </ContentCard>
          ) : null}
          {taxonomy.nodes.length ? (
            <div class="taxonomy-list">
              {taxonomy.nodes.map((node, index) => (
                <TaxonomyNodeCard
                  ctx={ctx}
                  node={node}
                  index={index}
                  key={index}
                />
              ))}
            </div>
          ) : null}
        </>
      )}
      {!hasContent ? (
        <EmptyStructured label={t("synthesis-empty-taxonomy")} t={t} />
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Claims
// ---------------------------------------------------------------------------

function claimStrengthTone(strength: string): string {
  const normalized = strength.toLowerCase();
  if (normalized === "strong") return "ok";
  if (normalized === "weak") return "warn";
  return "";
}

export function TopicClaimsSection({ ctx }: { ctx: ReaderSectionContext }) {
  const { t, detail } = ctx;
  return (
    <div class="topic-section">
      <h2>{t("synthesis-topic-tab-claims")}</h2>
      {!detail.claims.length ? (
        <EmptyStructured label={t("synthesis-empty-claim")} t={t} />
      ) : (
        <div class="claims-list">
          {detail.claims.map((claim, index) => (
            <article class="claim-row" key={index}>
              <div class="claim-content">
                <div class="claim-header">
                  <span class="claim-index">{claim.id || `C${index + 1}`}</span>
                  {claim.strength ? (
                    <LocalizedBadge
                      text={claim.strength}
                      tone={claimStrengthTone(claim.strength)}
                      t={t}
                    />
                  ) : null}
                </div>
                <h3>
                  {claim.text ||
                    t("synthesis-claim-title", { count: index + 1 })}
                </h3>
                {claim.rationale ? <p>{claim.rationale}</p> : null}
              </div>
              <div class="claim-evidence">
                {claim.sourceRefs.length ? (
                  <>
                    <h4 class="evidence-group-title">
                      {t("synthesis-source-papers")}
                    </h4>
                    <div class="claim-evidence-list">
                      {claim.sourceRefs.map((ref) => {
                        const row = detail.evidence.find((evidence) =>
                          evidence.refKeys.includes(ref),
                        );
                        if (!row) {
                          return (
                            <LocalizedBadge
                              key={ref}
                              text={ref}
                              tone="green"
                              t={t}
                            />
                          );
                        }
                        return (
                          <button
                            key={ref}
                            type="button"
                            class="mini-evidence-card"
                            title={t("synthesis-action-view-evidence")}
                            onClick={() =>
                              row.id ? ctx.onOpenEvidence(row.id) : undefined
                            }
                          >
                            <span class="evidence-code">{row.code}</span>
                            <span class="evidence-title">{row.title}</span>
                          </button>
                        );
                      })}
                    </div>
                  </>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Compare
// ---------------------------------------------------------------------------

function MethodComparisonTable(props: {
  methods: ReaderMethodRow[];
  t: ReaderText;
}) {
  if (!props.methods.length) return null;
  const { t } = props;
  const headers = [
    t("synthesis-column-method"),
    t("synthesis-column-ap"),
    t("synthesis-column-fps"),
    t("synthesis-column-epochs"),
    t("synthesis-column-backbone"),
  ];
  return (
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            {headers.map((header) => (
              <th key={header}>{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {props.methods.map((method, index) => (
            <tr key={index}>
              <td>{method.method}</td>
              <td>{method.ap}</td>
              <td>{method.fps}</td>
              <td>{method.epochs}</td>
              <td>{method.backbone}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function matrixValueTone(value: string): string {
  const lower = value.toLowerCase();
  if (
    lower.includes("high") ||
    lower.includes("strong") ||
    lower.includes("good") ||
    lower.includes("better")
  ) {
    return "highlight-positive";
  }
  if (
    lower.includes("low") ||
    lower.includes("weak") ||
    lower.includes("poor") ||
    lower.includes("worse") ||
    lower.includes("limited") ||
    lower.includes("high cost")
  ) {
    return "highlight-negative";
  }
  return "";
}

export function TopicCompareSection({ ctx }: { ctx: ReaderSectionContext }) {
  const { t, detail } = ctx;
  const compare = detail.compare;
  const hasDimensions = compare.improvementDimensions.length > 0;
  const routes: string[] = [];
  if (!hasDimensions) {
    const seen = new Set<string>();
    compare.matrixRows.forEach((row) => {
      row.comparisons.forEach((comparison) => {
        if (
          comparison.route &&
          comparison.route !== "-" &&
          !seen.has(comparison.route)
        ) {
          seen.add(comparison.route);
          routes.push(comparison.route);
        }
      });
    });
  }
  return (
    <div class="topic-section">
      <h2>
        {hasDimensions
          ? t("synthesis-improvement-dimensions")
          : t("synthesis-topic-tab-compare")}
      </h2>
      {hasDimensions && compare.improvementSummary ? (
        <Paragraphs value={compare.improvementSummary} />
      ) : null}
      {compare.improvementDimensions.map((dimension, index) => (
        <article class="debate-card" key={`dim-${index}`}>
          <span class="claim-index">{`I${index + 1}`}</span>
          <h3>
            {dimension.title ||
              t("synthesis-dimension-title", { count: index + 1 })}
          </h3>
          {dimension.analysis ? (
            <Paragraphs value={dimension.analysis} />
          ) : null}
          {dimension.trajectory ? (
            <p class="muted">{dimension.trajectory}</p>
          ) : null}
          <EvidenceRefChips ctx={ctx} refs={dimension.sourceRefs} />
        </article>
      ))}
      {!hasDimensions && compare.matrixRows.length ? (
        <div class="matrix-table-wrap">
          <table class="matrix-table">
            <thead>
              <tr>
                <th class="matrix-th matrix-dim-col">
                  {t("synthesis-column-dimension")}
                </th>
                {routes.map((route) => (
                  <th class="matrix-th" key={route}>
                    {route}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {compare.matrixRows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  <td class="matrix-td matrix-dim-col">
                    <div class="matrix-dim-title">
                      <span class="claim-index">{`M${rowIndex + 1}`}</span>
                      <strong>
                        {row.name ||
                          t("synthesis-dimension-title", {
                            count: rowIndex + 1,
                          })}
                      </strong>
                    </div>
                    {row.description ? (
                      <p class="matrix-dim-desc">{row.description}</p>
                    ) : null}
                    <MethodComparisonTable methods={row.methods} t={t} />
                  </td>
                  {routes.map((route) => {
                    const match = row.comparisons.find(
                      (comparison) => comparison.route === route,
                    );
                    if (!match) {
                      return (
                        <td class="matrix-td" key={route}>
                          <span class="muted">-</span>
                        </td>
                      );
                    }
                    const tone = matrixValueTone(match.value);
                    return (
                      <td
                        class={`matrix-td${tone ? ` ${tone}` : ""}`}
                        key={route}
                      >
                        <Paragraphs value={match.value} />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      {!hasDimensions && !compare.matrixRows.length ? (
        <EmptyStructured label={t("synthesis-empty-comparison")} t={t} />
      ) : null}
      {compare.debates.length ? (
        <>
          <h3>{t("synthesis-debates")}</h3>
          {compare.debates.map((debate, index) => (
            <article class="debate-card" key={`debate-${index}`}>
              <span class="claim-index">{`D${index + 1}`}</span>
              <h3>
                {debate.title ||
                  t("synthesis-debate-title", { count: index + 1 })}
              </h3>
              {debate.type ? <Badge text={debate.type} tone="orange" /> : null}
              {debate.text ? <p>{debate.text}</p> : null}
              <EvidenceRefChips
                ctx={ctx}
                refs={debate.sourceRefs}
                tone="orange"
              />
            </article>
          ))}
        </>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Future directions
// ---------------------------------------------------------------------------

export function TopicFutureDirectionsSection({
  ctx,
}: {
  ctx: ReaderSectionContext;
}) {
  const { t, detail } = ctx;
  return (
    <div class="topic-section">
      <h2>{t("synthesis-topic-tab-future-directions")}</h2>
      {detail.futureDirections.length ? (
        <div class="claims-list">
          {detail.futureDirections.map((direction, index) => (
            <article class="claim-row future-direction-row" key={index}>
              <div class="claim-content">
                <div class="claim-header">
                  <span class="claim-index">{`F${index + 1}`}</span>
                  {direction.directionType ? (
                    <Badge text={direction.directionType} tone="blue" />
                  ) : null}
                </div>
                <h3>
                  {direction.title ||
                    t("synthesis-future-direction-title", { count: index + 1 })}
                </h3>
                {direction.limitation ? (
                  <div class="future-direction-field">
                    <strong>{t("synthesis-current-limitation")}</strong>
                    <Paragraphs value={direction.limitation} />
                  </div>
                ) : null}
                {direction.future ? (
                  <div class="future-direction-field">
                    <strong>{t("synthesis-future-direction")}</strong>
                    <Paragraphs value={direction.future} />
                  </div>
                ) : null}
                {direction.rationale ? (
                  <div class="future-direction-field">
                    <strong>{t("synthesis-rationale")}</strong>
                    <Paragraphs value={direction.rationale} />
                  </div>
                ) : null}
                <EvidenceRefChips
                  ctx={ctx}
                  refs={direction.sourceRefs}
                  tone="blue"
                />
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyStructured label={t("synthesis-empty-future-directions")} t={t} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Coverage
// ---------------------------------------------------------------------------

function priorityTone(value: string): string {
  const normalized = enumKeyPart(value);
  if (normalized === "high" || normalized === "urgent") return "danger";
  if (normalized === "low") return "ok";
  return "warn";
}

function CoverageCardGrid(props: {
  ctx: ReaderSectionContext;
  title: string;
  rows: ReaderCoverageCard[];
  className: string;
  titleFallbackPrefix?: string;
  localizeTitles?: "coverage-caveat" | "priority" | "none";
}) {
  const { ctx, title, rows } = props;
  const { t } = ctx;
  if (!rows.length) return null;
  return (
    <div class="coverage-structured-block">
      <h3>{title}</h3>
      <div class="topic-card-grid">
        {rows.map((row, index) => {
          const fallback = `${title} ${index + 1}`;
          const resolvedTitle =
            props.localizeTitles === "coverage-caveat" && row.type
              ? enumLabel(t, "coverage-caveat", row.type, row.title || fallback)
              : row.title || fallback;
          return (
            <article class={props.className} key={index}>
              <strong>{resolvedTitle}</strong>
              {row.body ? <p>{row.body}</p> : null}
              {row.priority ? (
                <Badge
                  text={enumLabel(t, "priority", row.priority, row.priority)}
                  tone={priorityTone(row.priority)}
                  className="coverage-priority-badge"
                />
              ) : null}
              {row.examples.length ? (
                <div class="coverage-examples">
                  {row.examples.map((example, exampleIndex) => (
                    <Badge
                      key={exampleIndex}
                      text={example}
                      className="coverage-example-pill"
                    />
                  ))}
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </div>
  );
}

export function TopicCoverageSection({ ctx }: { ctx: ReaderSectionContext }) {
  const { t, detail } = ctx;
  const coverage = detail.coverage;
  const metrics: Array<[string, string]> = (
    [
      [t("synthesis-stat-papers"), coverage.statPapers],
      [t("synthesis-stat-time-span"), coverage.statTimeSpan],
      [t("synthesis-coverage-verdict"), coverage.statVerdict],
      [t("synthesis-stat-routes"), coverage.statRoutes],
    ] as Array<[string, string]>
  ).filter(([, value]) => value);
  const hasVerdictCard = !!coverage.verdict || !!coverage.reason;
  const hasContent =
    metrics.length > 0 ||
    hasVerdictCard ||
    coverage.caveats.length > 0 ||
    !!coverage.externalContextSummary ||
    coverage.directions.length > 0 ||
    !!coverage.diagnostics;
  return (
    <div class="topic-section">
      <h2>{t("synthesis-topic-tab-coverage")}</h2>
      {metrics.length ? (
        <div class="overview-dashboard coverage-statistics-dashboard">
          {metrics.map(([label, value]) => (
            <div class="dashboard-metric" key={label}>
              <div class="metric-label">{label}</div>
              <div class="metric-value">{value}</div>
            </div>
          ))}
        </div>
      ) : null}
      {hasVerdictCard || coverage.caveats.length ? (
        <div class="coverage-summary-block">
          {hasVerdictCard ? (
            <div class="coverage-verdict-card">
              {coverage.verdict ? (
                <div class="verdict-line">
                  <strong>{`${t("synthesis-coverage-verdict")}:`}</strong>
                  <LocalizedBadge
                    text={coverage.verdict}
                    tone={toneFor(coverage.verdict)}
                    t={t}
                  />
                </div>
              ) : null}
              {coverage.reason ? <Paragraphs value={coverage.reason} /> : null}
            </div>
          ) : null}
          <CoverageCardGrid
            ctx={ctx}
            title={t("synthesis-coverage-caveats")}
            rows={coverage.caveats}
            className="coverage-caveat-card"
            localizeTitles="coverage-caveat"
          />
        </div>
      ) : null}
      {coverage.externalContextSummary ? (
        <div class="external-coverage-section">
          <div class="overview-summary-hero">
            <h3 class="hero-title">
              {t("synthesis-external-literature-context")}
            </h3>
            <Paragraphs value={coverage.externalContextSummary} />
          </div>
        </div>
      ) : null}
      <CoverageCardGrid
        ctx={ctx}
        title={t("synthesis-suggested-collection-directions")}
        rows={coverage.directions}
        className="coverage-direction-card"
      />
      {coverage.diagnostics ? (
        <ContentCard title={t("synthesis-diagnostics")}>
          <KeyValueList value={coverage.diagnostics} t={t} />
        </ContentCard>
      ) : null}
      {!hasContent ? (
        <EmptyStructured label={t("synthesis-empty-coverage")} t={t} />
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// References
// ---------------------------------------------------------------------------

export function TopicReferencesSection(props: {
  ctx: ReaderSectionContext;
  selectedEvidenceId?: string;
}) {
  const { ctx, selectedEvidenceId } = props;
  const { t, detail } = ctx;
  const [query, setQuery] = useState("");
  const normalizedQuery = query.toLowerCase();
  const rows = detail.evidence.filter((row) => {
    if (!normalizedQuery) return true;
    return [row.title, row.yearText, row.refKey, row.summary, row.code].some(
      (field) => field.toLowerCase().includes(normalizedQuery),
    );
  });
  return (
    <div class="references-section">
      <div class="references-header">
        <div class="references-title-row">
          <h3>
            {t("synthesis-associated-literature-references", {
              count: detail.evidence.length,
            })}
          </h3>
        </div>
        <div class="references-search-bar">
          <input
            type="text"
            class="references-search-input"
            placeholder={t("synthesis-search-references")}
            value={query}
            onInput={(event) =>
              setQuery((event.target as HTMLInputElement).value)
            }
          />
        </div>
      </div>
      <div class="references-grid">
        {rows.map((row) => {
          const summary =
            row.summary.length > 130
              ? `${row.summary.substring(0, 127)}...`
              : row.summary;
          return (
            <div
              key={row.id || row.index}
              class={`reference-card${
                selectedEvidenceId && selectedEvidenceId === row.id
                  ? " active"
                  : ""
              }`}
              onClick={() => ctx.onOpenEvidence(row.id || String(row.index))}
            >
              <div class="ref-card-head">
                <div class="ref-badge-container">
                  <span class="ref-code-badge">{row.code}</span>
                  {row.status ? (
                    <LocalizedBadge
                      text={row.status}
                      tone={toneFor(row.status)}
                      t={t}
                    />
                  ) : null}
                </div>
                {row.yearText ? (
                  <span class="ref-year-label">{row.yearText}</span>
                ) : null}
              </div>
              <h4 class="ref-title">{row.title}</h4>
              {row.refKey ? (
                <div class="ref-key-badge">{row.refKey}</div>
              ) : null}
              {summary ? <p class="ref-summary">{summary}</p> : null}
            </div>
          );
        })}
        {!rows.length ? (
          <EmptyStructured
            label={t("synthesis-empty-matching-references")}
            t={t}
          />
        ) : null}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Report (markdown island + outline + concept nav)
// ---------------------------------------------------------------------------

function ReportConceptNav(props: { ctx: ReaderSectionContext }) {
  const { ctx } = props;
  const { t, detail, concepts } = ctx;
  const entries = projectReportConceptEntries(concepts, detail.topicId);
  if (!entries.length) return null;
  return (
    <aside
      class="topic-report-concept-nav"
      aria-label={t("synthesis-topic-concepts")}
    >
      <div class="topic-report-concept-nav-header">
        <strong>{t("synthesis-tab-concepts")}</strong>
        <span class="muted">{String(entries.length)}</span>
      </div>
      <div class="topic-report-concept-nav-list" role="list">
        {entries.map((entry) => (
          <div
            key={entry.conceptId}
            class="topic-report-concept-nav-item"
            tabIndex={0}
            role="listitem"
            data-concept-id={entry.conceptId}
            aria-label={t("synthesis-concept-preview-label", {
              label: entry.label,
            })}
            onMouseEnter={(event) =>
              showReaderConceptBubble(
                event.currentTarget as HTMLElement,
                entry.preview,
                t,
              )
            }
            onFocus={(event) =>
              showReaderConceptBubble(
                event.currentTarget as HTMLElement,
                entry.preview,
                t,
              )
            }
            onMouseLeave={scheduleReaderConceptBubbleClose}
            onBlur={scheduleReaderConceptBubbleClose}
          >
            <strong>{entry.label}</strong>
          </div>
        ))}
      </div>
    </aside>
  );
}

export function TopicReportSection({ ctx }: { ctx: ReaderSectionContext }) {
  const { t, detail } = ctx;
  const report = detail.report;
  const [copyState, setCopyState] = useState<"" | "is-confirmed" | "is-error">(
    "",
  );
  const copyTimerRef = useRef<number | undefined>(undefined);
  const frameRef = useRef<HTMLDivElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const islandSignature = stableRegionSignature([
    report.body,
    report.title,
    detail.evidence.map((row) => row.id),
    ctx.concepts,
  ]);
  const hooksRef = useRef({
    t: ctx.t,
    concepts: ctx.concepts,
    evidence: detail.evidence,
    onOpenDigest: ctx.onOpenDigest,
  });
  hooksRef.current = {
    t: ctx.t,
    concepts: ctx.concepts,
    evidence: detail.evidence,
    onOpenDigest: ctx.onOpenDigest,
  };

  useLayoutEffect(() => {
    const scrollBody = scrollRef.current;
    const frame = frameRef.current;
    if (!scrollBody || !frame) return;
    scrollBody.textContent = "";
    frame
      .querySelectorAll(":scope > .topic-report-outline")
      .forEach((node) => node.remove());
    if (!report.body) return;
    const { body, outline } = renderMarkdownIsland(report.body, {
      variant: "report",
      t: hooksRef.current.t,
      concepts: hooksRef.current.concepts,
      digestRows: hooksRef.current.evidence,
      onOpenDigest: (row) => hooksRef.current.onOpenDigest(row),
      reportTitle: report.title,
    });
    body.classList.add("report-card");
    if (outline) {
      frame.classList.remove("no-outline");
      frame.insertBefore(outline, scrollBody);
    } else {
      frame.classList.add("no-outline");
    }
    scrollBody.appendChild(body);
  }, [islandSignature, report.body, report.title]);

  useEffect(
    () => () => {
      closeConceptBubble();
      if (copyTimerRef.current === undefined) return;
      if (typeof window !== "undefined") {
        window.clearTimeout(copyTimerRef.current);
      }
      copyTimerRef.current = undefined;
    },
    [],
  );

  const copyReport = () => {
    const writeText = navigator.clipboard?.writeText?.bind(navigator.clipboard);
    const setFeedback = (className: "" | "is-confirmed" | "is-error") => {
      setCopyState(className);
      if (copyTimerRef.current) window.clearTimeout(copyTimerRef.current);
      copyTimerRef.current = window.setTimeout(() => setCopyState(""), 1400);
    };
    if (!writeText) {
      setFeedback("is-error");
      return;
    }
    void writeText(report.body)
      .then(() => setFeedback("is-confirmed"))
      .catch(() => setFeedback("is-error"));
  };

  const copyLabel =
    copyState === "is-confirmed"
      ? t("synthesis-action-copied")
      : copyState === "is-error"
        ? t("synthesis-action-copy-failed")
        : t("synthesis-action-copy");
  const exportPending = ctx.pendingCommands.includes(
    "exportTopicSynthesisReport",
  );

  return (
    <div class="topic-section topic-report-section">
      {report.body ? (
        (() => {
          const panel = (
            <div class="topic-report-panel">
              <div class="topic-report-header">
                <h2>{t("synthesis-report-title")}</h2>
                <div class="topic-report-actions">
                  <button type="button" class={copyState} onClick={copyReport}>
                    {copyLabel}
                  </button>
                  <button
                    type="button"
                    class={exportPending ? "is-busy" : ""}
                    disabled={exportPending || ctx.standalone}
                    aria-busy={exportPending ? "true" : undefined}
                    title={
                      exportPending
                        ? t("synthesis-operation-in-progress", {
                            operation: operationLabel(
                              t,
                              "exportTopicSynthesisReport",
                            ),
                          })
                        : undefined
                    }
                    onClick={() =>
                      ctx.onAction("hostCommand", {
                        command: "exportTopicSynthesisReport",
                        args: { topicId: detail.topicId },
                      })
                    }
                  >
                    {exportPending ? (
                      <span class="button-spinner" aria-hidden="true" />
                    ) : null}
                    {t("synthesis-action-export")}
                  </button>
                </div>
              </div>
              <div class="topic-report-reader-frame" ref={frameRef}>
                <div class="topic-report-scroll-body" ref={scrollRef} />
              </div>
            </div>
          );
          const conceptNav = <ReportConceptNav ctx={ctx} />;
          return conceptNav ? (
            <div class="topic-report-workspace">
              {conceptNav}
              {panel}
            </div>
          ) : (
            panel
          );
        })()
      ) : (
        <>
          <div class="topic-report-header">
            <h2>{t("synthesis-report-title")}</h2>
          </div>
          <EmptyStructured label={t("synthesis-report-empty")} t={t} />
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section dispatch
// ---------------------------------------------------------------------------

export type TopicDetailSectionId =
  | "overview"
  | "taxonomy"
  | "claims"
  | "compare"
  | "future_directions"
  | "coverage"
  | "references"
  | "report"
  | "citation_graph";

export const TOPIC_DETAIL_SECTION_TABS: ReadonlyArray<{
  id: TopicDetailSectionId;
  labelKey: SynthesisWorkbenchMessageKey;
}> = [
  { id: "overview", labelKey: "synthesis-topic-tab-overview" },
  { id: "taxonomy", labelKey: "synthesis-topic-tab-taxonomy" },
  { id: "claims", labelKey: "synthesis-topic-tab-claims" },
  { id: "compare", labelKey: "synthesis-topic-tab-compare" },
  {
    id: "future_directions",
    labelKey: "synthesis-topic-tab-future-directions",
  },
  { id: "coverage", labelKey: "synthesis-topic-tab-coverage" },
  { id: "references", labelKey: "synthesis-topic-tab-references" },
  { id: "report", labelKey: "synthesis-topic-tab-report" },
];

export function TopicSectionSwitch(props: {
  ctx: ReaderSectionContext;
  section: TopicDetailSectionId;
  selectedEvidenceId?: string;
  graphIslandHost?: (container: HTMLElement) => void | (() => void);
}) {
  const { ctx, section } = props;
  switch (section) {
    case "taxonomy":
      return <TopicTaxonomySection ctx={ctx} />;
    case "claims":
      return <TopicClaimsSection ctx={ctx} />;
    case "references":
      return (
        <TopicReferencesSection
          ctx={ctx}
          selectedEvidenceId={props.selectedEvidenceId}
        />
      );
    case "compare":
      return <TopicCompareSection ctx={ctx} />;
    case "coverage":
      return <TopicCoverageSection ctx={ctx} />;
    case "future_directions":
      return <TopicFutureDirectionsSection ctx={ctx} />;
    case "report":
      return <TopicReportSection ctx={ctx} />;
    case "citation_graph":
      return <CitationGraphSection host={props.graphIslandHost} />;
    default:
      return <TopicOverviewSection ctx={ctx} />;
  }
}

function CitationGraphSection(props: {
  host?: (container: HTMLElement) => void | (() => void);
}) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  useLayoutEffect(() => {
    const container = hostRef.current;
    if (!container || !props.host) return;
    return props.host(container);
  }, [props.host]);
  return (
    <div class="topic-section topic-citation-graph-section">
      <div ref={hostRef} data-reader-graph-island="" />
    </div>
  );
}
