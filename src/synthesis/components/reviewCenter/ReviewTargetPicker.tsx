/** @jsxRuntime automatic */
/** @jsxImportSource preact */
import { useLayoutEffect, useRef } from "preact/hooks";

import type { SynthesisReviewCenterText } from "./reviewCenterText";
import type { SynthesisReviewCenterTargetCandidateView } from "./ReviewCenterRegion";
import { reviewCenterTargetGroup } from "./reviewCenterProjection";

// Manual target picker overlay of the review center (legacy
// renderReferenceManualTargetPicker / syncReferenceManualTargetOverlay /
// positionReferenceManualTargetPopover / scrollReferenceTargetListToGroup,
// src/synthesisWorkbenchApp.ts :10702-10961). Rendering is declarative;
// popover positioning, group scrolling and overlay focus stay imperative via
// refs + useLayoutEffect, mirroring the legacy imperative DOM island.

export type ReviewCenterManualTargetAnchorRect = {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
};

type ReviewTargetPickerOverlayProps = {
  proposalId: string;
  sourceTitle: string;
  anchorRect?: ReviewCenterManualTargetAnchorRect;
  candidates: SynthesisReviewCenterTargetCandidateView[];
  t: SynthesisReviewCenterText;
  onClose: () => void;
  onSelect: (candidate: SynthesisReviewCenterTargetCandidateView) => void;
};

const INDEX_GROUPS = ["#", ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"];

function scrollListToGroup(list: HTMLElement, group: string) {
  const target =
    list.querySelector<HTMLElement>(
      `[data-reference-target-group-start="${group}"]`,
    ) ||
    list.querySelector<HTMLElement>(`[data-reference-target-group="${group}"]`);
  if (!target) {
    return;
  }
  const heading = list.querySelector<HTMLElement>(
    `[data-reference-target-group="${group}"]`,
  );
  const top = Math.max(0, target.offsetTop - (heading?.offsetHeight || 0) - 4);
  if (typeof list.scrollTo === "function") {
    list.scrollTo({ top, behavior: "auto" });
    return;
  }
  list.scrollTop = top;
}

function positionPopover(
  popover: HTMLElement,
  anchorRect?: ReviewCenterManualTargetAnchorRect,
) {
  const margin = 16;
  const gap = 8;
  const documentElement = document.documentElement;
  const viewportWidth =
    window.innerWidth || documentElement?.clientWidth || 1024;
  const viewportHeight =
    window.innerHeight || documentElement?.clientHeight || 768;
  const width = popover.offsetWidth || 560;
  const height = popover.offsetHeight || 480;
  const fallbackLeft = Math.max(margin, (viewportWidth - width) / 2);
  const fallbackTop = Math.max(margin, (viewportHeight - height) / 2);
  const rawLeft = anchorRect ? anchorRect.left : fallbackLeft;
  const rawTop = anchorRect ? anchorRect.bottom + gap : fallbackTop;
  const clampedLeft = Math.max(
    margin,
    Math.min(rawLeft, viewportWidth - width - margin),
  );
  const top =
    anchorRect && rawTop + height > viewportHeight - margin
      ? Math.max(
          margin,
          Math.min(
            anchorRect.top - height - gap,
            viewportHeight - height - margin,
          ),
        )
      : rawTop;
  const clampedTop = Math.max(
    margin,
    Math.min(top, viewportHeight - height - margin),
  );
  popover.style.left = `${clampedLeft}px`;
  popover.style.top = `${clampedTop}px`;
}

function candidateTooltip(
  candidate: SynthesisReviewCenterTargetCandidateView,
): string {
  return [candidate.label, candidate.meta, candidate.bindingLabel]
    .filter(Boolean)
    .join("\n");
}

export function ReviewTargetPickerOverlay(
  props: ReviewTargetPickerOverlayProps,
) {
  const { candidates, t, onClose, onSelect } = props;
  const overlayRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const popover = popoverRef.current;
    if (popover) {
      positionPopover(popover, props.anchorRect);
    }
    overlayRef.current?.focus();
  }, [props.anchorRect]);

  const groups = new Map<string, SynthesisReviewCenterTargetCandidateView[]>();
  candidates.forEach((candidate) => {
    const rows = groups.get(candidate.group) || [];
    rows.push(candidate);
    groups.set(candidate.group, rows);
  });
  const sortedGroups = Array.from(groups.keys()).sort((left, right) =>
    left === "#" ? -1 : right === "#" ? 1 : left.localeCompare(right),
  );

  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const initialGroup = reviewCenterTargetGroup(props.sourceTitle);
    const group = groups.has(initialGroup) ? initialGroup : "#";
    const frame = window.requestAnimationFrame(() => {
      scrollListToGroup(list, group);
    });
    return () => {
      if (typeof window.cancelAnimationFrame === "function") {
        window.cancelAnimationFrame(frame);
      }
    };
    // groups is derived from candidates; re-run only when the candidate set
    // or the initial scroll target changes (legacy re-scrolls per refresh).
  }, [candidates, props.sourceTitle]);

  return (
    <div
      ref={overlayRef}
      class="reference-target-overlay"
      tabIndex={-1}
      onClick={onClose}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          onClose();
        }
      }}
    >
      <div
        ref={popoverRef}
        class="reference-target-popover"
        data-proposal-id={props.proposalId}
        onClick={(event) => event.stopPropagation()}
      >
        <div class="reference-target-popover-header">
          <strong>{t("synthesis-action-manual-target")}</strong>
          <button type="button" onClick={onClose}>
            {t("synthesis-action-close")}
          </button>
        </div>
        {candidates.length === 0 ? (
          <div class="empty-state empty-state-info">
            <strong class="empty-state-title">
              {t("synthesis-review-no-legal-targets")}
            </strong>
            <p class="empty-state-message">
              {t("synthesis-review-no-legal-targets-message")}
            </p>
          </div>
        ) : (
          <div class="reference-target-popover-body">
            <div class="reference-target-index">
              {INDEX_GROUPS.map((group) => (
                <button
                  key={group}
                  type="button"
                  disabled={!groups.has(group)}
                  onClick={() => {
                    const list = listRef.current;
                    if (list) scrollListToGroup(list, group);
                  }}
                >
                  {group}
                </button>
              ))}
            </div>
            <div class="reference-target-list" ref={listRef}>
              {sortedGroups.map((group) => (
                <div key={group}>
                  <div
                    class="reference-target-group-heading"
                    data-reference-target-group={group}
                  >
                    {group}
                  </div>
                  {(groups.get(group) || []).map((candidate, index) => {
                    const tooltip = candidateTooltip(candidate);
                    return (
                      <button
                        key={candidate.key}
                        type="button"
                        class={`reference-target-row ${
                          candidate.bindingStatus
                            ? `has-binding binding-${candidate.bindingStatus}`
                            : ""
                        }`.trim()}
                        data-reference-target-key={candidate.key}
                        {...(index === 0
                          ? { "data-reference-target-group-start": group }
                          : {})}
                        {...(tooltip
                          ? { title: tooltip, "aria-label": tooltip }
                          : {})}
                        onClick={() => onSelect(candidate)}
                      >
                        <span class="reference-target-title">
                          {candidate.label}
                        </span>
                        <span class="reference-target-meta">
                          {candidate.meta}
                          {candidate.bindingLabel ? (
                            <span
                              class={`reference-target-binding-pill ${candidate.bindingStatus}`}
                            >
                              {candidate.bindingLabel}
                            </span>
                          ) : null}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
