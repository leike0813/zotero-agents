/** @jsxRuntime automatic */
/** @jsxImportSource preact */
import { memo } from "preact/compat";
import { useLayoutEffect, useRef } from "preact/hooks";

import {
  equalBySignature,
  safeText,
  stableRegionSignature,
} from "./regionEquality";

// Preact port of the imperative renderAssistantPlan region
// (src/sidebar/assistantPanelRenderer.js). The equality boundary is exactly
// the legacy plan signature { plan, interactionKind }; planTitle is rendered
// but intentionally outside the boundary, matching the old guard. Like the
// original, a hidden plan keeps its last visible DOM untouched.

type PlanSnapshot = {
  plan: Record<string, unknown> | null;
  planWorking: boolean;
  planTitle: string;
};

function planEntries(plan: Record<string, unknown>) {
  const entries = Array.isArray(plan.entries)
    ? (plan.entries as Array<Record<string, unknown>>)
    : [];
  const active = Array.isArray(plan.activeEntries)
    ? (plan.activeEntries as Array<Record<string, unknown>>)
    : [];
  return { entries, active };
}

function planVisible(plan: Record<string, unknown>): boolean {
  const { entries, active } = planEntries(plan);
  return active.length > 0 || (plan.active === true && entries.length > 0);
}

function PlanContent(props: PlanSnapshot) {
  const plan = props.plan || {};
  const { entries, active } = planEntries(plan);
  const totalCount =
    Number(plan.totalCount || 0) || entries.length || active.length || 0;
  const completedCount =
    typeof plan.completedCount === "number"
      ? Math.max(0, Math.min(totalCount, Math.floor(plan.completedCount)))
      : Math.max(0, entries.filter((entry) => entry && entry.terminal).length);
  const rows = active.length > 0 ? active : entries;
  return (
    <>
      <div class="assistant-panel-plan-header">
        <strong>{props.planTitle}</strong>
        <span class="assistant-panel-plan-summary">
          {totalCount > 0 ? `${completedCount}/${totalCount}` : "0/0"}
        </span>
      </div>
      <div class="assistant-panel-plan-list">
        {rows.map((entry, index) => {
          const toneClass = safeText(entry.toneClass) || "is-pending";
          const iconText = safeText(entry.icon);
          return (
            <div class={"assistant-panel-plan-entry " + toneClass} key={index}>
              <span class={"assistant-panel-plan-icon " + toneClass}>
                {toneClass === "is-running" && props.planWorking ? (
                  <span class="asst-spinner assistant-panel-plan-spinner" />
                ) : (
                  iconText || (toneClass === "is-completed" ? "✓" : "•")
                )}
              </span>
              <span>
                {safeText(
                  entry.title || entry.text || entry.label || entry.content,
                ) || "-"}
              </span>
            </div>
          );
        })}
      </div>
    </>
  );
}

export const PlanRegion = memo(
  function PlanRegion(props: {
    container: HTMLElement;
    plan: Record<string, unknown> | null;
    interactionKind: unknown;
    planTitle: string;
  }) {
    const { container } = props;
    const plan = props.plan || {};
    const visible = planVisible(plan);
    const planWorking =
      safeText(props.interactionKind || "hidden") === "running";
    const signature = stableRegionSignature({
      plan: props.plan,
      interactionKind: props.interactionKind,
    });
    useLayoutEffect(() => {
      container.setAttribute(
        "data-assistant-plan-active",
        visible ? "true" : "false",
      );
      container.setAttribute(
        "data-assistant-plan-working",
        planWorking ? "true" : "false",
      );
      container.classList.toggle("hidden", !visible);
    }, [container, signature]);
    const lastVisible = useRef<PlanSnapshot | null>(null);
    if (visible) {
      lastVisible.current = {
        plan: props.plan,
        planWorking,
        planTitle: props.planTitle,
      };
    }
    const effective = visible
      ? { plan: props.plan, planWorking, planTitle: props.planTitle }
      : lastVisible.current;
    if (!effective) {
      return null;
    }
    return <PlanContent {...effective} />;
  },
  (prev, next) =>
    prev.container === next.container &&
    equalBySignature(
      { plan: prev.plan, interactionKind: prev.interactionKind },
      { plan: next.plan, interactionKind: next.interactionKind },
    ),
);
