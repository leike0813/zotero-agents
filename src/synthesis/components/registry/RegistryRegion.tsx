/** @jsxRuntime automatic */
/** @jsxImportSource preact */
import { memo } from "preact/compat";
import { useState } from "preact/hooks";

import { equalBySignature } from "../../../shared/regionEquality";
import { CanonicalRevisionWorkbench } from "./CanonicalRevisionWorkbench";
import {
  RegistryActionButton,
  RegistryBadge,
  RegistryFilterInput,
  RegistryPanelToolbar,
  RegistrySelect,
} from "./controls";
import { IndexReviewDrawer } from "./IndexReviewDrawer";
import type { SynthesisRegistryReviewHandlers } from "./IndexReviewDrawer";
import {
  RegistryIndexTable,
  RegistryReferencedOnlyTable,
} from "./RegistryTables";
import {
  isRegistryOperationPending,
  registryFilterOptionLabel,
  registryLocalizedValue,
  registryToneFor,
  type SynthesisRegistryActionSender,
  type SynthesisRegistryRowView,
  type SynthesisRegistrySelection,
  type SynthesisRegistryText,
} from "./registryTypes";

// Top-level composition of the index/registry surface (legacy renderIndex,
// src/synthesisWorkbenchApp.ts :8570-8792): the filter toolbar with the
// reference-sidecar cache badge and host commands, the index or
// referenced-only table, the canonical revision workbench when the
// revise_canonicals tool is active, and the index review drawer.
//
// Expanded registry rows are local UI state lifted here so scope/filter
// changes that rebuild the tables never lose expansion (legacy
// state.expandedRegistrySourceRefs); expanding a row with no embedded
// references also echoes the key through setFilters so the host can hydrate.

function RegistryCacheBadge(props: {
  selection: SynthesisRegistrySelection;
  t: SynthesisRegistryText;
}) {
  const { selection, t } = props;
  return (
    <RegistryBadge
      t={t}
      text={t("synthesis-index-reference-sidecar", {
        status: registryLocalizedValue(t, selection.cacheStatus || "missing"),
      })}
      tone={registryToneFor(selection.cacheStatus)}
    />
  );
}

function RegistrySidecarCommands(props: {
  selection: SynthesisRegistrySelection;
  t: SynthesisRegistryText;
  onAction: SynthesisRegistryActionSender;
}) {
  const { selection, t, onAction } = props;
  return (
    <>
      <RegistryActionButton
        t={t}
        label={t("synthesis-action-refresh")}
        pending={isRegistryOperationPending(
          selection,
          "refreshReferenceSidecarNow",
        )}
        pendingCommand="refreshReferenceSidecarNow"
        onClick={() =>
          onAction("hostCommand", { command: "refreshReferenceSidecarNow" })
        }
      />
      <RegistryActionButton
        t={t}
        label={t("synthesis-action-advanced-matching")}
        pending={isRegistryOperationPending(
          selection,
          "runAdvancedReferenceMatchingNow",
        )}
        pendingCommand="runAdvancedReferenceMatchingNow"
        onClick={() =>
          onAction("hostCommand", {
            command: "runAdvancedReferenceMatchingNow",
          })
        }
      />
    </>
  );
}

function RegistryIndexFilters(props: {
  selection: SynthesisRegistrySelection;
  t: SynthesisRegistryText;
  onAction: SynthesisRegistryActionSender;
}) {
  const { selection, t, onAction } = props;
  const scope = selection.filters.scope || "library";
  return (
    <div class="filters">
      <RegistryFilterInput
        value={selection.filters.search}
        placeholder={t("synthesis-search")}
        onValue={(search) => onAction("setFilters", { registry: { search } })}
      />
      <RegistrySelect
        options={[
          [
            "library",
            registryFilterOptionLabel(
              t,
              "synthesis-filter-scope",
              "scope",
              "library",
            ),
          ],
          [
            "referenced",
            registryFilterOptionLabel(
              t,
              "synthesis-filter-scope",
              "scope",
              "referenced",
            ),
          ],
          [
            "all",
            registryFilterOptionLabel(
              t,
              "synthesis-filter-scope",
              "scope",
              "all",
            ),
          ],
        ]}
        value={scope}
        onChange={(value) =>
          onAction("setFilters", {
            registry: {
              scope: value as SynthesisRegistrySelection["filters"]["scope"],
            },
          })
        }
      />
      {scope !== "referenced" ? (
        <RegistrySelect
          options={[
            [
              "all",
              registryFilterOptionLabel(
                t,
                "synthesis-filter-coverage",
                "coverage",
                "all",
              ),
            ],
            [
              "complete",
              registryFilterOptionLabel(
                t,
                "synthesis-filter-coverage",
                "coverage",
                "complete",
              ),
            ],
            [
              "partial",
              registryFilterOptionLabel(
                t,
                "synthesis-filter-coverage",
                "coverage",
                "partial",
              ),
            ],
            [
              "missing",
              registryFilterOptionLabel(
                t,
                "synthesis-filter-coverage",
                "coverage",
                "missing",
              ),
            ],
          ]}
          value={selection.filters.artifactCoverage || "all"}
          onChange={(value) =>
            onAction("setFilters", {
              registry: {
                artifactCoverage:
                  value as SynthesisRegistrySelection["filters"]["artifactCoverage"],
              },
            })
          }
        />
      ) : (
        <RegistrySelect
          options={[
            [
              "all",
              registryFilterOptionLabel(
                t,
                "synthesis-filter-binding",
                "status",
                "all",
              ),
            ],
            [
              "unbound",
              registryFilterOptionLabel(
                t,
                "synthesis-filter-binding",
                "status",
                "unbound",
              ),
            ],
            [
              "candidate",
              registryFilterOptionLabel(
                t,
                "synthesis-filter-binding",
                "binding-status",
                "candidate",
              ),
            ],
            [
              "accepted",
              registryFilterOptionLabel(
                t,
                "synthesis-filter-binding",
                "binding-status",
                "accepted",
              ),
            ],
            [
              "rejected",
              registryFilterOptionLabel(
                t,
                "synthesis-filter-binding",
                "binding-status",
                "rejected",
              ),
            ],
            [
              "stale_target",
              registryFilterOptionLabel(
                t,
                "synthesis-filter-binding",
                "binding-status",
                "stale_target",
              ),
            ],
          ]}
          value={selection.filters.bindingStatus || "all"}
          onChange={(value) =>
            onAction("setFilters", {
              registry: {
                bindingStatus:
                  value as SynthesisRegistrySelection["filters"]["bindingStatus"],
              },
            })
          }
        />
      )}
      <RegistryCacheBadge selection={selection} t={t} />
      <RegistrySidecarCommands
        selection={selection}
        t={t}
        onAction={onAction}
      />
      <RegistryActionButton
        t={t}
        label={t("synthesis-canonical-revise-title")}
        onClick={() =>
          onAction("setFilters", {
            registry: { activeIndexTool: "revise_canonicals" },
          })
        }
      />
      {selection.cacheStatus === "failed" ? (
        <RegistryActionButton
          t={t}
          label={t("synthesis-action-retry")}
          onClick={() =>
            onAction("hostCommand", { command: "retryReferenceSidecarRefresh" })
          }
        />
      ) : null}
    </div>
  );
}

function RegistryCanonicalToolFilters(props: {
  selection: SynthesisRegistrySelection;
  t: SynthesisRegistryText;
  onAction: SynthesisRegistryActionSender;
}) {
  const { selection, t, onAction } = props;
  return (
    <div class="filters">
      <RegistryActionButton
        t={t}
        label={t("synthesis-action-back-to-index")}
        onClick={() =>
          onAction("setFilters", {
            registry: { activeIndexTool: "none", selectedCanonicalRowId: "" },
          })
        }
      />
      <RegistryCacheBadge selection={selection} t={t} />
      <RegistrySidecarCommands
        selection={selection}
        t={t}
        onAction={onAction}
      />
    </div>
  );
}

type RegistryRegionProps = {
  selection: SynthesisRegistrySelection;
  t: SynthesisRegistryText;
  onAction: SynthesisRegistryActionSender;
  reviewHandlers: SynthesisRegistryReviewHandlers;
};

export const RegistryRegion = memo(
  function RegistryRegion(props: RegistryRegionProps) {
    const { selection, t, onAction, reviewHandlers } = props;
    const [expandedRowKeys, setExpandedRowKeys] = useState<ReadonlySet<string>>(
      new Set(),
    );

    const toggleRow = (row: SynthesisRegistryRowView) => {
      const key = row.key;
      if (!key) return;
      const next = new Set(expandedRowKeys);
      if (next.has(key)) {
        next.delete(key);
        setExpandedRowKeys(next);
        return;
      }
      next.add(key);
      setExpandedRowKeys(next);
      if (!row.references.length) {
        onAction("setFilters", {
          registry: { expandedSourceRefs: Array.from(next) },
        });
      }
    };

    const canonicalToolActive =
      selection.activeIndexTool === "revise_canonicals";
    return (
      <div class="panel" data-region-content="synthesis-registry">
        <RegistryPanelToolbar>
          {canonicalToolActive ? (
            <RegistryCanonicalToolFilters
              selection={selection}
              t={t}
              onAction={onAction}
            />
          ) : (
            <RegistryIndexFilters
              selection={selection}
              t={t}
              onAction={onAction}
            />
          )}
        </RegistryPanelToolbar>
        {canonicalToolActive ? (
          <CanonicalRevisionWorkbench
            selection={selection}
            t={t}
            onAction={onAction}
          />
        ) : selection.filters.scope === "referenced" ? (
          <RegistryReferencedOnlyTable
            selection={selection}
            t={t}
            onAction={onAction}
          />
        ) : (
          <RegistryIndexTable
            selection={selection}
            t={t}
            expandedRowKeys={expandedRowKeys}
            onToggleRow={toggleRow}
            onAction={onAction}
          />
        )}
        {canonicalToolActive ? null : (
          <IndexReviewDrawer
            selection={selection}
            t={t}
            onAction={onAction}
            handlers={reviewHandlers}
          />
        )}
      </div>
    );
  },
  (prev, next) =>
    prev.t === next.t &&
    prev.onAction === next.onAction &&
    prev.reviewHandlers.onQueueReferenceDecision ===
      next.reviewHandlers.onQueueReferenceDecision &&
    prev.reviewHandlers.onCancelReferenceDecision ===
      next.reviewHandlers.onCancelReferenceDecision &&
    prev.reviewHandlers.onApplyPendingReferenceDecisions ===
      next.reviewHandlers.onApplyPendingReferenceDecisions &&
    prev.reviewHandlers.onClearPendingReferenceDecisions ===
      next.reviewHandlers.onClearPendingReferenceDecisions &&
    prev.reviewHandlers.onOpenManualTargetPicker ===
      next.reviewHandlers.onOpenManualTargetPicker &&
    equalBySignature(prev.selection, next.selection),
);

export type {
  SynthesisRegistryActionSender,
  SynthesisRegistryReviewState,
  SynthesisRegistrySelection,
  SynthesisRegistryStrings,
  SynthesisRegistryText,
} from "./registryTypes";
export type { SynthesisRegistryReviewHandlers } from "./IndexReviewDrawer";
