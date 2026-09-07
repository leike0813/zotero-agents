// Text, enum and tone helpers for the review center region, ported from the
// legacy page (src/synthesisWorkbenchApp.ts): textValue, enumKeyPart,
// humanizeEnumValue, enumMessageKey, enumLabel, filterOptionLabel, uiText,
// maybeLocalizedValue, registryStatusTone/toneFor, humanizeReviewLabel,
// operationLabel and referenceProposalActionLabel. All localization flows
// through the injected `t` resolver; key membership is checked against the
// shared default messages, exactly like the legacy page.
//
// Literals without any i18n key ("Unknown target", "Untitled target",
// "merge target", "(fallback id)", ...) keep the legacy uiText passthrough:
// the reverse map below reproduces uiText verbatim, so unmatched literals
// render as-is, matching the legacy page byte for byte.

import {
  SYNTHESIS_WORKBENCH_DEFAULT_MESSAGES,
  type SynthesisWorkbenchMessageKey,
} from "../../../shared/synthesisWorkbenchI18nContract";

export type SynthesisReviewCenterText = (
  key: SynthesisWorkbenchMessageKey,
  args?: Record<string, unknown>,
) => string;

export function reviewCenterTextValue(value: unknown, fallback = ""): string {
  return String(value ?? fallback).trim();
}

/** Legacy keyPart: whitespace-normalized id fragment used in decision keys. */
export function reviewCenterKeyPart(value: unknown, fallback = "all"): string {
  return (
    reviewCenterTextValue(value, fallback).replace(/\s+/g, "_") || fallback
  );
}

const CONTROLLED_ENUM_DOMAINS = [
  "status",
  "kind",
  "reason",
  "relation",
  "action",
  "confidence",
  "coverage",
  "coverage-caveat",
  "freshness",
  "binding-status",
  "priority",
  "graph-node-kind",
  "graph-edge-role",
  "graph-layout",
  "tag-status",
  "tag-density",
  "concept-type",
  "review-tab",
  "sync-status",
  "scope",
] as const;

export type ReviewCenterEnumDomain = (typeof CONTROLLED_ENUM_DOMAINS)[number];

function enumKeyPart(value: unknown): string {
  return reviewCenterTextValue(value)
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/[_\s/]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

export function humanizeReviewCenterEnumValue(value: unknown): string {
  const text = reviewCenterTextValue(value);
  if (!text) return "";
  return text
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function hasMessage(key: string): key is SynthesisWorkbenchMessageKey {
  return key in SYNTHESIS_WORKBENCH_DEFAULT_MESSAGES;
}

function enumMessageKey(
  domain: ReviewCenterEnumDomain,
  value: unknown,
): SynthesisWorkbenchMessageKey | undefined {
  const keyPart = enumKeyPart(value);
  if (!keyPart) return undefined;
  const key = `synthesis-enum-${domain}-${keyPart}`;
  return hasMessage(key) ? key : undefined;
}

// Legacy SYNTHESIS_DEFAULT_TEXT_TO_KEY: reverse lookup from the default
// English message to its key; on duplicate messages the later key wins.
const DEFAULT_TEXT_TO_KEY = new Map<string, SynthesisWorkbenchMessageKey>(
  (
    Object.entries(SYNTHESIS_WORKBENCH_DEFAULT_MESSAGES) as Array<
      [SynthesisWorkbenchMessageKey, string]
    >
  ).map(([key, value]) => [value, key]),
);

/** Legacy uiText: resolve a literal through the default-message reverse map. */
export function reviewCenterUiText(
  t: SynthesisReviewCenterText,
  value: string,
): string {
  const key = DEFAULT_TEXT_TO_KEY.get(value);
  return key ? t(key) : value;
}

export function reviewCenterEnumLabel(
  t: SynthesisReviewCenterText,
  domain: ReviewCenterEnumDomain,
  value: unknown,
  fallback?: string,
): string {
  const key = enumMessageKey(domain, value);
  if (key) return t(key);
  const fallbackText = reviewCenterTextValue(fallback);
  if (fallbackText) return reviewCenterUiText(t, fallbackText);
  return humanizeReviewCenterEnumValue(value);
}

export function reviewCenterFilterOptionLabel(
  t: SynthesisReviewCenterText,
  filterKey: SynthesisWorkbenchMessageKey,
  domain: ReviewCenterEnumDomain,
  value: unknown,
): string {
  return `${t(filterKey)}: ${reviewCenterEnumLabel(t, domain, value)}`;
}

/** Legacy maybeLocalizedValue: status/relation/enum key lookup, then uiText. */
export function reviewCenterMaybeLocalized(
  t: SynthesisReviewCenterText,
  value: unknown,
): string {
  const text = reviewCenterTextValue(value);
  if (!text) return "";
  const normalized = text.replace(/_/g, "-").toLowerCase();
  const statusKey = `synthesis-status-${normalized}`;
  if (hasMessage(statusKey)) {
    return t(statusKey);
  }
  const relationKey = `synthesis-relation-${normalized}`;
  if (hasMessage(relationKey)) {
    return t(relationKey);
  }
  for (const domain of CONTROLLED_ENUM_DOMAINS) {
    const enumKey = enumMessageKey(domain, text);
    if (enumKey) {
      return t(enumKey);
    }
  }
  return reviewCenterUiText(t, text);
}

/** Legacy appendReviewTableCell text channel: localized value or raw text. */
export function reviewCenterCellText(
  t: SynthesisReviewCenterText,
  value: unknown,
): string {
  return (
    reviewCenterMaybeLocalized(t, value) || reviewCenterTextValue(value, "-")
  );
}

function toneFor(value: unknown): string {
  if (value === "ready" || value === "fresh" || value === "complete") {
    return "ok";
  }
  if (value === "missing" || value === "failed") {
    return "danger";
  }
  return "warn";
}

/** Legacy registryStatusTone. */
export function reviewCenterStatusTone(value: unknown): string {
  const status = reviewCenterTextValue(value);
  if (
    status === "accepted" ||
    status === "approved" ||
    status === "confirmed"
  ) {
    return "blue";
  }
  if (status === "candidate" || status === "stale_target") {
    return "warn";
  }
  if (status === "unbound" || status === "rejected") {
    return "danger";
  }
  return toneFor(status);
}

/** Legacy humanizeReviewLabel. */
export function reviewCenterHumanizeLabel(
  t: SynthesisReviewCenterText,
  value: unknown,
  fallback = "-",
): string {
  const normalized = reviewCenterTextValue(value, fallback);
  return (
    reviewCenterMaybeLocalized(t, normalized) ||
    humanizeReviewCenterEnumValue(normalized)
  );
}

/** Legacy operationLabel for the busy-button title. */
export function reviewCenterOperationLabel(
  t: SynthesisReviewCenterText,
  command: string,
): string {
  const key = `synthesis-operation-${command}`;
  return hasMessage(key) ? t(key) : command;
}

export type SynthesisReviewCenterProposalAction =
  | "accept"
  | "reverse_accept"
  | "reject"
  | "reopen"
  | "delete"
  | "manual_target";

const PROPOSAL_ACTION_LABEL_KEYS: Record<
  SynthesisReviewCenterProposalAction,
  SynthesisWorkbenchMessageKey
> = {
  accept: "synthesis-action-accept",
  reverse_accept: "synthesis-action-reverse-accept",
  reject: "synthesis-action-reject",
  reopen: "synthesis-action-reopen",
  delete: "synthesis-action-delete",
  manual_target: "synthesis-action-manual-target",
};

/** Legacy referenceProposalActionLabel. */
export function reviewCenterProposalActionLabel(
  t: SynthesisReviewCenterText,
  action: SynthesisReviewCenterProposalAction,
): string {
  return t(PROPOSAL_ACTION_LABEL_KEYS[action] || "synthesis-action-delete");
}
