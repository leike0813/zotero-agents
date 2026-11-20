/** @jsxRuntime automatic */
/** @jsxImportSource preact */

import type {
  SynthesisEncodingIdentity,
  SynthesisRetrievalScope,
  SynthesisWorkbenchSnapshot,
} from "../../shared/synthesisWorkbenchWireContract";
import {
  narrowSynthesisWorkbenchHomeRetrieval,
  type SynthesisWorkbenchHomeAction,
  type SynthesisWorkbenchHomeText,
} from "./HomeRegion";
import { RetrievalPanel } from "./RetrievalPanel";

type Retrieval = SynthesisWorkbenchSnapshot["retrieval"];

type ChangeRow = {
  key: string;
  label: string;
  published?: string;
  pending?: string;
  hideValues?: boolean;
};

function sortedLibraryIds(scope?: SynthesisRetrievalScope): number[] {
  return Array.from(new Set(scope?.libraryIds ?? [])).sort(
    (left, right) => left - right,
  );
}

function sortedSourceKinds(scope?: SynthesisRetrievalScope): string[] {
  return Array.from(new Set(scope?.sourceKinds ?? [])).sort();
}

function sourceKindLabel(kind: string, t: SynthesisWorkbenchHomeText): string {
  const key = {
    metadata: "synthesis-retrieval-source-metadata",
    fulltext: "synthesis-retrieval-source-fulltext",
    analysis: "synthesis-retrieval-source-analysis",
  } as const;
  return kind in key ? t(key[kind as keyof typeof key]) : kind;
}

function libraryLabels(
  scope: SynthesisRetrievalScope | undefined,
  libraryNames: Record<string, string> | undefined,
  t: SynthesisWorkbenchHomeText,
): string[] {
  return sortedLibraryIds(scope).map((libraryId) => {
    const name = libraryNames?.[String(libraryId)];
    return name && name.trim()
      ? name
      : t("synthesis-library-label", { libraryId });
  });
}

function scopeText(
  scope: SynthesisRetrievalScope | undefined,
  libraryNames: Record<string, string> | undefined,
  t: SynthesisWorkbenchHomeText,
): string {
  if (!scope) return t("synthesis-retrieval-none");
  const parts = [
    ...libraryLabels(scope, libraryNames, t),
    ...(scope.libraryIds.length
      ? sortedSourceKinds(scope).map((kind) => sourceKindLabel(kind, t))
      : []),
    ...(scope.includeTopics ? [t("synthesis-explorer-topic")] : []),
  ];
  return parts.length ? parts.join(" · ") : t("synthesis-retrieval-none");
}

function scopeChangeRows(
  active: SynthesisRetrievalScope | undefined,
  pending: SynthesisRetrievalScope | undefined,
  libraryNames: Record<string, string> | undefined,
  t: SynthesisWorkbenchHomeText,
): ChangeRow[] {
  if (!pending) return [];
  const rows: ChangeRow[] = [];
  const activeLibraries = sortedLibraryIds(active).join(",");
  const pendingLibraries = sortedLibraryIds(pending).join(",");
  if (activeLibraries !== pendingLibraries) {
    rows.push({
      key: "libraries",
      label: t("synthesis-explorer-library"),
      pending:
        libraryLabels(pending, libraryNames, t).join(", ") ||
        t("synthesis-retrieval-none"),
    });
  }
  const activeKinds = sortedSourceKinds(active).join(",");
  const pendingKinds = sortedSourceKinds(pending).join(",");
  if (activeKinds !== pendingKinds) {
    rows.push({
      key: "sourceKinds",
      label: t("synthesis-retrieval-field-sources"),
      pending:
        sortedSourceKinds(pending)
          .map((kind) => sourceKindLabel(kind, t))
          .join(", ") || t("synthesis-retrieval-none"),
    });
  }
  if ((active?.includeTopics ?? false) !== pending.includeTopics) {
    rows.push({
      key: "includeTopics",
      label: t("synthesis-retrieval-field-include-topics"),
      pending: pending.includeTopics
        ? t("synthesis-retrieval-enabled")
        : t("synthesis-retrieval-disabled"),
    });
  }
  return rows;
}

function encodingChangeRows(
  active: SynthesisEncodingIdentity | undefined,
  pending: SynthesisEncodingIdentity | undefined,
  t: SynthesisWorkbenchHomeText,
): ChangeRow[] {
  if (!pending) return [];
  const rows: ChangeRow[] = [];
  if (active?.modelId !== pending.modelId) {
    rows.push({
      key: "modelId",
      label: t("synthesis-retrieval-field-model"),
      published: active?.modelId ?? "",
      pending: pending.modelId,
    });
  }
  if (active?.dimensions !== pending.dimensions) {
    rows.push({
      key: "dimensions",
      label: t("synthesis-column-dimension"),
      published: String(active?.dimensions ?? ""),
      pending: String(pending.dimensions),
    });
  }
  if ((active?.queryPrefix ?? "") !== pending.queryPrefix) {
    rows.push({
      key: "queryPrefix",
      label: t("synthesis-retrieval-field-query-prefix"),
      published: JSON.stringify(active?.queryPrefix ?? ""),
      pending: JSON.stringify(pending.queryPrefix),
    });
  }
  if ((active?.documentPrefix ?? "") !== pending.documentPrefix) {
    rows.push({
      key: "documentPrefix",
      label: t("synthesis-retrieval-field-document-prefix"),
      published: JSON.stringify(active?.documentPrefix ?? ""),
      pending: JSON.stringify(pending.documentPrefix),
    });
  }
  if (
    (active?.encodingOptionsKey ?? "") !== (pending.encodingOptionsKey ?? "")
  ) {
    rows.push({
      key: "encodingOptionsKey",
      label: t("synthesis-retrieval-encoding-options-changed"),
      hideValues: true,
    });
  }
  return rows;
}

function identityText(
  identity: SynthesisEncodingIdentity,
  t: SynthesisWorkbenchHomeText,
): string {
  return t("synthesis-retrieval-identity", {
    model: identity.modelId,
    dimensions: identity.dimensions,
  });
}

export function RetrievalMaintenance(props: {
  retrieval: Retrieval;
  pending: string[];
  t: SynthesisWorkbenchHomeText;
  onAction: SynthesisWorkbenchHomeAction;
}) {
  const { retrieval, t } = props;
  const published = Boolean(retrieval?.publication);
  const activeScope = retrieval?.activeScope ?? undefined;
  const pendingScope = retrieval?.pendingScope ?? undefined;
  const activeIdentity = retrieval?.activeIdentity ?? undefined;
  const pendingIdentity = retrieval?.pendingIdentity ?? undefined;
  const libraryNames = retrieval?.libraryNames;
  const scopeRows = published
    ? scopeChangeRows(activeScope, pendingScope, libraryNames, t)
    : [];
  const encodingRows = published
    ? encodingChangeRows(activeIdentity, pendingIdentity, t)
    : [];
  const targetChanged = scopeRows.length > 0 || encodingRows.length > 0;

  return (
    <RetrievalPanel
      selection={narrowSynthesisWorkbenchHomeRetrieval(retrieval)}
      pendingOperationKeys={props.pending}
      t={t}
      onAction={props.onAction}
      targetChanged={targetChanged}
    >
      <div class="retrieval-maintenance">
        <div class="retrieval-maintenance-scope">
          {published ? (
            <p
              class="retrieval-maintenance-published"
              data-retrieval-scope="published"
            >
              <span class="retrieval-maintenance-label">
                {t("synthesis-explorer-scope")}
              </span>
              <span class="retrieval-maintenance-value">
                {scopeText(activeScope, libraryNames, t)}
              </span>
            </p>
          ) : (
            <p
              class="retrieval-maintenance-planned"
              data-retrieval-scope="planned"
            >
              <span class="retrieval-maintenance-label">
                {t("synthesis-explorer-pending")}
              </span>
              <span class="retrieval-maintenance-value">
                {scopeText(pendingScope, libraryNames, t)}
              </span>
            </p>
          )}
          {published && activeIdentity ? (
            <p class="retrieval-maintenance-published-index">
              <span class="retrieval-maintenance-label">
                {t("synthesis-retrieval-active-index")}
              </span>
              <span class="retrieval-maintenance-value">
                {identityText(activeIdentity, t)}
              </span>
            </p>
          ) : null}
          {published && retrieval?.updatedAt ? (
            <p class="retrieval-maintenance-updated">
              <span class="retrieval-maintenance-label">
                {t("synthesis-explorer-update")}
              </span>
              <span class="retrieval-maintenance-value">
                {retrieval.updatedAt}
              </span>
            </p>
          ) : null}
          {scopeRows.length || encodingRows.length ? (
            <div
              class="retrieval-maintenance-changes"
              data-retrieval-scope="changes"
            >
              <p class="retrieval-maintenance-changes-heading">
                {t("synthesis-retrieval-effective-after-rebuild")}
              </p>
              {scopeRows.map((row) => (
                <p
                  key={row.key}
                  class="retrieval-maintenance-scope-change"
                  data-retrieval-change={row.key}
                >
                  <span class="retrieval-maintenance-label">{row.label}</span>
                  <span class="retrieval-maintenance-value">{row.pending}</span>
                </p>
              ))}
              {encodingRows.map((row) => (
                <p
                  key={row.key}
                  class="retrieval-maintenance-encoding-change"
                  data-retrieval-change={row.key}
                >
                  <span class="retrieval-maintenance-label">{row.label}</span>
                  {row.hideValues ? null : (
                    <span class="retrieval-maintenance-value">
                      {row.published} → {row.pending}
                    </span>
                  )}
                </p>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </RetrievalPanel>
  );
}
