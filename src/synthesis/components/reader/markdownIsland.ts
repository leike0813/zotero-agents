// Imperative markdown island for the reader region: shared renderer-backed
// markdown with the synthesis profile, text-only fallback, bounded concept /
// shortcode / digest-link enrichment, and outline navigation. Only invoked
// from useLayoutEffect refs in the region components, never during Preact
// render.

import { applyConceptOverlay } from "./conceptOverlay";
import type { ReaderConceptsProjection, ReaderEvidenceRow } from "./narrowing";
import type { ReaderText } from "./values";

type SharedMarkdownRenderer = {
  renderInto?: (
    container: HTMLElement,
    markdown: string,
    options?: Record<string, unknown>,
  ) => HTMLElement | null;
  buildOutline?: (
    root: HTMLElement,
    options?: Record<string, unknown>,
  ) => HTMLElement | null;
};

declare const window: Window &
  typeof globalThis & {
    ZoteroSkillsMarkdownRenderer?: SharedMarkdownRenderer;
  };

export type MarkdownIslandVariant = "report" | "digest" | "artifact";

export type MarkdownIslandOptions = {
  variant: MarkdownIslandVariant;
  t: ReaderText;
  concepts: ReaderConceptsProjection;
  /** Report variant: evidence rows used to enhance digest links. */
  digestRows?: ReaderEvidenceRow[];
  onOpenDigest?: (row: ReaderEvidenceRow) => void;
  /** Report variant: report title for duplicate-heading stripping. */
  reportTitle?: string;
};

export type MarkdownIslandResult = {
  body: HTMLElement;
  outline?: HTMLElement;
};

// ---------------------------------------------------------------------------
// Circle shortcodes (legacy renderMarkdownCircleShortcodes)
// ---------------------------------------------------------------------------

const MARKDOWN_CIRCLE_SHORTCUT_COLORS: Record<string, string> = {
  red: "red",
  orange: "orange",
  yellow: "yellow",
  green: "green",
  blue: "blue",
  purple: "purple",
  brown: "brown",
  black: "black",
  white: "white",
};

function replaceCircleShortcodesInTextNode(node: Text) {
  const text = node.nodeValue || "";
  const pattern = /:([a-z]+)_circle:/g;
  let cursor = 0;
  let match: RegExpExecArray | null;
  const fragment = document.createDocumentFragment();
  while ((match = pattern.exec(text))) {
    const color = MARKDOWN_CIRCLE_SHORTCUT_COLORS[match[1]];
    if (!color) continue;
    if (match.index > cursor) {
      fragment.appendChild(
        document.createTextNode(text.slice(cursor, match.index)),
      );
    }
    const icon = document.createElement("span");
    icon.className = `markdown-circle-icon markdown-circle-${color}`;
    icon.setAttribute("role", "img");
    icon.setAttribute("aria-label", `${color} circle`);
    icon.title = `${color}_circle`;
    fragment.appendChild(icon);
    cursor = match.index + match[0].length;
  }
  if (cursor === 0) return;
  if (cursor < text.length) {
    fragment.appendChild(document.createTextNode(text.slice(cursor)));
  }
  node.parentNode?.replaceChild(fragment, node);
}

function renderMarkdownCircleShortcodes(root: HTMLElement) {
  const showText = typeof NodeFilter === "undefined" ? 4 : NodeFilter.SHOW_TEXT;
  const walker = document.createTreeWalker(root, showText);
  const textNodes: Node[] = [];
  while (walker.nextNode()) {
    const node = walker.currentNode;
    if (node.nodeType !== 3) continue;
    const parent = node.parentElement;
    if (
      parent?.closest("code, pre, kbd, samp, script, style") ||
      !/:([a-z]+)_circle:/.test(node.nodeValue || "")
    ) {
      continue;
    }
    textNodes.push(node);
  }
  for (const node of textNodes) {
    replaceCircleShortcodesInTextNode(node as Text);
  }
}

// ---------------------------------------------------------------------------
// Report digest links (legacy enhanceReportLiteratureDigestLinks)
// ---------------------------------------------------------------------------

function enhanceReportLiteratureDigestLinks(
  root: HTMLElement,
  rows: ReaderEvidenceRow[],
  t: ReaderText,
  onOpenDigest: (row: ReaderEvidenceRow) => void,
) {
  const byCandidate = new Map<string, ReaderEvidenceRow>();
  rows.forEach((row) => {
    row.digestCandidates.forEach((candidate) => {
      if (!byCandidate.has(candidate)) byCandidate.set(candidate, row);
    });
  });
  const candidates = Array.from(byCandidate.keys()).sort(
    (left, right) => right.length - left.length,
  );
  if (!candidates.length) return;
  const escaped = candidates.map((candidate) =>
    candidate.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
  );
  const pattern = new RegExp(
    `(^|[^A-Za-z0-9_:-])(${escaped.join("|")})(?=$|[^A-Za-z0-9_:-])`,
    "g",
  );
  const showText = typeof NodeFilter === "undefined" ? 4 : NodeFilter.SHOW_TEXT;
  const walker = document.createTreeWalker(root, showText);
  const textNodes: Node[] = [];
  while (walker.nextNode()) {
    const node = walker.currentNode;
    if (node.nodeType !== 3) continue;
    const parent = node.parentElement;
    if (
      !parent?.closest("li, td, th") ||
      parent.closest("a, button, code, pre, kbd, samp, script, style") ||
      !pattern.test(node.nodeValue || "")
    ) {
      pattern.lastIndex = 0;
      continue;
    }
    pattern.lastIndex = 0;
    textNodes.push(node);
  }
  textNodes.forEach((node) => {
    const textNode = node as Text;
    const text = textNode.nodeValue || "";
    pattern.lastIndex = 0;
    let cursor = 0;
    let match: RegExpExecArray | null;
    const fragment = document.createDocumentFragment();
    while ((match = pattern.exec(text))) {
      const prefix = match[1] || "";
      const id = match[2] || "";
      const idStart = match.index + prefix.length;
      const row = byCandidate.get(id);
      if (!row) continue;
      if (idStart > cursor) {
        fragment.appendChild(
          document.createTextNode(text.slice(cursor, idStart)),
        );
      }
      const button = document.createElement("button");
      button.className = "topic-report-digest-link";
      button.textContent = id;
      button.type = "button";
      button.title = t("synthesis-action-open-digest-artifact");
      button.setAttribute(
        "aria-label",
        `${t("synthesis-action-open-digest-artifact")}: ${id}`,
      );
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        onOpenDigest(row);
      });
      fragment.appendChild(button);
      cursor = idStart + id.length;
    }
    if (cursor === 0) return;
    if (cursor < text.length) {
      fragment.appendChild(document.createTextNode(text.slice(cursor)));
    }
    textNode.parentNode?.replaceChild(fragment, textNode);
  });
}

// ---------------------------------------------------------------------------
// Outline builders (legacy buildMarkdownOutline + variants)
// ---------------------------------------------------------------------------

function outlineForVariant(
  variant: MarkdownIslandVariant,
  markdownNode: HTMLElement,
  t: ReaderText,
  sharedRenderer: SharedMarkdownRenderer | undefined,
): HTMLElement | undefined {
  if (typeof sharedRenderer?.buildOutline !== "function") return undefined;
  if (variant === "report") {
    return (
      sharedRenderer.buildOutline(markdownNode, {
        ariaLabel: t("synthesis-report-outline"),
        headingIdPrefix: "topic-report-heading",
        linkClassName: "topic-report-outline-link",
        navClassName: "topic-report-outline",
        title: t("synthesis-topic-tab-report"),
      }) || undefined
    );
  }
  if (variant === "digest") {
    return (
      sharedRenderer.buildOutline(markdownNode, {
        ariaLabel: t("synthesis-digest-outline"),
        headingIdPrefix: "digest-heading",
        linkClassName: "digest-outline-link",
        navClassName: "digest-outline",
        title: t("synthesis-outline"),
      }) || undefined
    );
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// Renderer plumbing
// ---------------------------------------------------------------------------

function stripDuplicateReportHeadings(markdown: string, reportTitle = "") {
  let body = markdown.trim();
  const escapedTitle = reportTitle
    ? reportTitle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    : "";
  const headingPatterns = [
    /^#{1,3}\s*Synthesis Report\s*\n+/i,
    /^#{1,3}\s*Report Body\s*\n+/i,
    escapedTitle ? new RegExp(`^#{1,3}\\s*${escapedTitle}\\s*\\n+`, "i") : null,
  ].filter(Boolean) as RegExp[];
  let changed = true;
  while (changed) {
    changed = false;
    for (const pattern of headingPatterns) {
      const next = body.replace(pattern, "").trimStart();
      if (next !== body) {
        body = next;
        changed = true;
      }
    }
  }
  return body;
}

/**
 * Renders markdown into a fresh article element, applies the concept overlay
 * and (for reports) digest-link enhancement, and returns the body plus the
 * variant outline nav. The caller owns inserting the nodes into the island
 * host; the island host is cleared by the caller before invocation.
 */
export function renderMarkdownIsland(
  markdown: string,
  options: MarkdownIslandOptions,
): MarkdownIslandResult {
  const source =
    options.variant === "report"
      ? stripDuplicateReportHeadings(markdown, options.reportTitle || "")
      : markdown;
  const sharedRenderer =
    typeof window === "undefined"
      ? undefined
      : window.ZoteroSkillsMarkdownRenderer;
  let body: HTMLElement;
  if (typeof sharedRenderer?.renderInto === "function") {
    body = document.createElement("article");
    body.className = "reader-body markdown-body";
    sharedRenderer.renderInto(body, source, {
      profile: "synthesis",
      headingIdPrefix: "synthesis-markdown-heading",
      afterRender: (root: HTMLElement) => {
        renderMarkdownCircleShortcodes(root);
      },
    });
  } else {
    body = document.createElement("pre");
    body.className = "markdown-fallback";
    body.textContent = source;
  }
  applyConceptOverlay(body, options.concepts, options.t);
  if (
    options.variant === "report" &&
    options.digestRows?.length &&
    options.onOpenDigest
  ) {
    enhanceReportLiteratureDigestLinks(
      body,
      options.digestRows,
      options.t,
      options.onOpenDigest,
    );
  }
  const outline = outlineForVariant(
    options.variant,
    body,
    options.t,
    sharedRenderer,
  );
  return { body, outline };
}
