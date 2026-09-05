// Concept overlay machinery for the reader region: alias highlighting inside
// rendered markdown/sections, the hover bubble, and the report concept-nav
// projection. Imperative by nature (walks rendered DOM); only invoked from
// island effects, never during Preact render.

import type { ReaderConceptEntry, ReaderConceptsProjection } from "./narrowing";
import { toneFor } from "./values";
import type { ReaderText } from "./values";

const CONCEPT_OVERLAY_SKIP_SELECTOR = [
  "a",
  "button",
  "input",
  "select",
  "textarea",
  "code",
  "pre",
  "kbd",
  "samp",
  "script",
  "style",
  ".katex",
  ".math",
  ".badge",
  ".chip",
  ".toolbar",
  ".filters",
  ".topic-detail-tabs",
  ".topic-report-outline",
  ".topic-report-concept-nav",
  ".concept-mention",
  ".concept-bubble",
].join(", ");

let conceptBubbleCleanup: (() => void) | undefined;
let conceptBubbleCloseTimer: number | undefined;

function cancelConceptBubbleClose() {
  if (conceptBubbleCloseTimer !== undefined) {
    if (typeof window !== "undefined") {
      window.clearTimeout(conceptBubbleCloseTimer);
    }
    conceptBubbleCloseTimer = undefined;
  }
}

function scheduleConceptBubbleClose() {
  if (typeof window === "undefined") return;
  cancelConceptBubbleClose();
  conceptBubbleCloseTimer = window.setTimeout(() => {
    closeConceptBubble();
  }, 120);
}

export function closeConceptBubble() {
  cancelConceptBubbleClose();
  conceptBubbleCleanup?.();
  conceptBubbleCleanup = undefined;
  if (typeof document === "undefined") return;
  document
    .querySelectorAll(".concept-bubble")
    .forEach((node: Element) => node.remove());
}

function showConceptBubble(
  anchor: HTMLElement,
  entry: ReaderConceptEntry,
  t: ReaderText,
) {
  closeConceptBubble();
  const bubble = document.createElement("div");
  bubble.className = "concept-bubble";
  bubble.setAttribute("role", "dialog");
  bubble.setAttribute("aria-label", t("synthesis-concept-preview"));
  const title = document.createElement("strong");
  title.textContent = entry.label || entry.alias;
  bubble.appendChild(title);
  if (entry.alias || entry.confidence) {
    const meta = document.createElement("div");
    meta.className = "concept-bubble-meta";
    if (entry.alias) {
      const aliasBadge = document.createElement("span");
      aliasBadge.className = "badge blue";
      aliasBadge.textContent = entry.alias;
      meta.appendChild(aliasBadge);
    }
    if (entry.confidence) {
      const confidence = document.createElement("span");
      confidence.className = `badge ${toneFor(entry.confidence)}`;
      confidence.textContent = entry.confidence;
      meta.appendChild(confidence);
    }
    bubble.appendChild(meta);
  }
  const definition = document.createElement("p");
  definition.className = "muted";
  definition.textContent =
    entry.shortDefinition ||
    entry.definition ||
    t("synthesis-concept-no-definition");
  bubble.appendChild(definition);
  const rect = anchor.getBoundingClientRect();
  bubble.style.position = "fixed";
  bubble.style.left = `${Math.max(12, Math.min(rect.left, window.innerWidth - 260))}px`;
  bubble.style.top = `${Math.min(rect.bottom + 8, window.innerHeight - 160)}px`;
  document.body?.appendChild(bubble);
  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape") closeConceptBubble();
  };
  bubble.addEventListener("mouseenter", cancelConceptBubbleClose);
  bubble.addEventListener("mouseleave", scheduleConceptBubbleClose);
  document.addEventListener("keydown", handleKeyDown);
  conceptBubbleCleanup = () => {
    bubble.removeEventListener("mouseenter", cancelConceptBubbleClose);
    bubble.removeEventListener("mouseleave", scheduleConceptBubbleClose);
    document.removeEventListener("keydown", handleKeyDown);
  };
}

/** Wraps a concept mention span around the first occurrence of each alias. */
export function applyConceptOverlay(
  root: HTMLElement,
  concepts: ReaderConceptsProjection,
  t: ReaderText,
): HTMLElement {
  const entries = concepts.overlayEnabled ? concepts.overlayEntries : [];
  if (!entries.length) return root;
  const escaped = entries
    .map((entry) => entry.alias)
    .filter(Boolean)
    .sort((left, right) => right.length - left.length)
    .map((entry) => entry.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  if (!escaped.length) return root;
  const byAlias = new Map(
    entries.map((entry) => [entry.alias.toLowerCase(), entry]),
  );
  const pattern = new RegExp(`\\b(${escaped.join("|")})\\b`, "gi");
  const linkedSenseIds = new Set<string>();
  const showText = typeof NodeFilter === "undefined" ? 4 : NodeFilter.SHOW_TEXT;
  const walker = document.createTreeWalker(root, showText);
  const textNodes: Node[] = [];
  while (walker.nextNode()) {
    const node = walker.currentNode;
    if (node.nodeType !== 3) continue;
    const parent = node.parentElement;
    if (parent?.closest(CONCEPT_OVERLAY_SKIP_SELECTOR)) continue;
    if (node.nodeValue && pattern.test(node.nodeValue)) {
      textNodes.push(node);
    }
    pattern.lastIndex = 0;
  }
  for (const textNode of textNodes) {
    const text = textNode.nodeValue || "";
    const fragment = document.createDocumentFragment();
    let lastIndex = 0;
    text.replace(pattern, (match, _alias, offset: number) => {
      const entry = byAlias.get(match.toLowerCase());
      const senseKey = entry?.senseId || entry?.conceptId || "";
      if (!entry || linkedSenseIds.has(senseKey)) return match;
      fragment.appendChild(
        document.createTextNode(text.slice(lastIndex, offset)),
      );
      const link = document.createElement("span");
      link.className = "concept-mention";
      link.textContent = match;
      link.tabIndex = 0;
      link.setAttribute("data-concept-id", entry.conceptId);
      link.setAttribute(
        "aria-label",
        t("synthesis-concept-preview-label", {
          label: entry.label || entry.alias,
        }),
      );
      const openBubble = () => showConceptBubble(link, entry, t);
      link.addEventListener("mouseenter", openBubble);
      link.addEventListener("focus", openBubble);
      link.addEventListener("mouseleave", scheduleConceptBubbleClose);
      link.addEventListener("blur", scheduleConceptBubbleClose);
      fragment.appendChild(link);
      linkedSenseIds.add(senseKey);
      lastIndex = offset + match.length;
      return match;
    });
    fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
    textNode.parentNode?.replaceChild(fragment, textNode);
  }
  return root;
}

export type ReaderReportConceptEntry = {
  conceptId: string;
  label: string;
  preview: ReaderConceptEntry;
};

/**
 * Legacy topicReportConceptEntries: concepts whose senses cite this topic,
 * merged with overlay previews, deduped by concept id, sorted by label.
 */
export function projectReportConceptEntries(
  concepts: ReaderConceptsProjection,
  topicId: string,
): ReaderReportConceptEntry[] {
  if (!topicId) return [];
  const conceptsById = new Map(
    concepts.concepts.map((row) => [row.conceptId, row]),
  );
  const overlayBySenseId = new Map<string, ReaderConceptEntry>();
  const overlayByConceptId = new Map<string, ReaderConceptEntry>();
  concepts.overlayEntries.forEach((entry) => {
    if (entry.senseId && !overlayBySenseId.has(entry.senseId)) {
      overlayBySenseId.set(entry.senseId, entry);
    }
    if (entry.conceptId && !overlayByConceptId.has(entry.conceptId)) {
      overlayByConceptId.set(entry.conceptId, entry);
    }
  });
  const seen = new Set<string>();
  return concepts.senses
    .filter((sense) => sense.sourceTopicIds.includes(topicId))
    .map((sense): ReaderReportConceptEntry | undefined => {
      const conceptId = sense.conceptId;
      if (!conceptId || seen.has(conceptId)) return undefined;
      seen.add(conceptId);
      const concept = conceptsById.get(conceptId);
      const overlay =
        overlayBySenseId.get(sense.senseId) ||
        overlayByConceptId.get(conceptId);
      const label =
        overlay?.label || concept?.label || sense.label || conceptId;
      const alias =
        overlay?.alias || sense.aliases[0] || concept?.aliases[0] || label;
      const shortDefinition =
        overlay?.shortDefinition ||
        sense.shortDefinition ||
        concept?.shortDefinition ||
        overlay?.definition ||
        sense.definition ||
        concept?.definition ||
        "";
      return {
        conceptId,
        label,
        preview: {
          conceptId,
          senseId: sense.senseId,
          alias,
          label,
          shortDefinition,
          definition:
            overlay?.definition ||
            sense.definition ||
            concept?.definition ||
            "",
          confidence: overlay?.confidence || sense.confidence || "medium",
        },
      };
    })
    .filter((entry): entry is ReaderReportConceptEntry => !!entry)
    .sort((left, right) => left.label.localeCompare(right.label));
}

/** Opens the concept bubble anchored at an element (report concept nav). */
export function showReaderConceptBubble(
  anchor: HTMLElement,
  entry: ReaderConceptEntry,
  t: ReaderText,
) {
  showConceptBubble(anchor, entry, t);
}

/** Delayed bubble close for nav/mention mouseleave + blur. */
export function scheduleReaderConceptBubbleClose() {
  scheduleConceptBubbleClose();
}
