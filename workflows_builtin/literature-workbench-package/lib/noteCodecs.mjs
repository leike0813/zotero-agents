import {
  decodeBase64Utf8,
  decodeHtmlEntities,
  encodeBase64Utf8,
  escapeAttribute,
  escapeHtml,
  readTagAttribute,
} from "./htmlCodec.mjs";
import { attachWorkbenchPayloadToNote } from "./embeddedPayloadAttachments.mjs";
import { requireHostApi } from "./runtime.mjs";

function renderInlineMarkdown(text) {
  let html = escapeHtml(text);
  html = html.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
    (_, label, url) =>
      `<a href="${escapeAttribute(url)}">${escapeHtml(label)}</a>`,
  );
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  return html;
}

function closeLists(state, blocks) {
  if (state.inUl) {
    blocks.push("</ul>");
    state.inUl = false;
  }
  if (state.inOl) {
    blocks.push("</ol>");
    state.inOl = false;
  }
}

export function renderMarkdownToHtml(markdown) {
  const lines = String(markdown || "")
    .replace(/\r\n?/g, "\n")
    .split("\n");
  const blocks = [];
  const state = {
    inCodeBlock: false,
    codeLines: [],
    inUl: false,
    inOl: false,
  };

  for (const line of lines) {
    const fenceMatch = line.match(/^```(\w+)?\s*$/);
    if (fenceMatch) {
      closeLists(state, blocks);
      if (!state.inCodeBlock) {
        state.inCodeBlock = true;
        state.codeLines = [];
      } else {
        blocks.push(
          `<pre><code>${escapeHtml(state.codeLines.join("\n"))}</code></pre>`,
        );
        state.inCodeBlock = false;
        state.codeLines = [];
      }
      continue;
    }

    if (state.inCodeBlock) {
      state.codeLines.push(line);
      continue;
    }

    if (/^\s*$/.test(line)) {
      closeLists(state, blocks);
      continue;
    }

    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      closeLists(state, blocks);
      const level = headingMatch[1].length;
      blocks.push(
        `<h${level}>${renderInlineMarkdown(headingMatch[2])}</h${level}>`,
      );
      continue;
    }

    const unorderedMatch = line.match(/^\s*[-*+]\s+(.+)$/);
    if (unorderedMatch) {
      if (!state.inUl) {
        closeLists(state, blocks);
        blocks.push("<ul>");
        state.inUl = true;
      }
      blocks.push(`<li>${renderInlineMarkdown(unorderedMatch[1])}</li>`);
      continue;
    }

    const orderedMatch = line.match(/^\s*\d+\.\s+(.+)$/);
    if (orderedMatch) {
      if (!state.inOl) {
        closeLists(state, blocks);
        blocks.push("<ol>");
        state.inOl = true;
      }
      blocks.push(`<li>${renderInlineMarkdown(orderedMatch[1])}</li>`);
      continue;
    }

    closeLists(state, blocks);
    blocks.push(`<p>${renderInlineMarkdown(line)}</p>`);
  }

  closeLists(state, blocks);
  if (state.inCodeBlock && state.codeLines.length > 0) {
    blocks.push(
      `<pre><code>${escapeHtml(state.codeLines.join("\n"))}</code></pre>`,
    );
  }
  return blocks.join("\n");
}

function encodePayloadValue(payload, runtime, payloadFormat = "json") {
  if (payloadFormat === "text") {
    return encodeBase64Utf8(String(payload || ""), runtime);
  }
  return encodeBase64Utf8(JSON.stringify(payload), runtime);
}

function decodePayloadValue(encoded, runtime, payloadFormat = "json") {
  const decoded = decodeBase64Utf8(encoded, runtime);
  if (payloadFormat === "text") {
    return decoded;
  }
  return JSON.parse(decoded);
}

export function renderPayloadBlock(payloadType, payload, runtime, args = {}) {
  const payloadFormat = args.payloadFormat === "text" ? "text" : "json";
  const encoded = encodePayloadValue(payload, runtime, payloadFormat);
  return `<span data-zs-block="payload" data-zs-payload="${escapeAttribute(payloadType)}" data-zs-version="1" data-zs-encoding="base64" data-zs-value="${escapeAttribute(encoded)}"></span>`;
}

export function parsePayloadBlock(
  noteContent,
  payloadType,
  runtime,
  args = {},
) {
  const payloadFormat = args.payloadFormat === "text" ? "text" : "json";
  const payloadTagMatch = String(noteContent || "").match(
    new RegExp(`<span[^>]*data-zs-payload=(["'])${payloadType}\\1[^>]*>`, "i"),
  );
  if (!payloadTagMatch) {
    throw new Error(`${payloadType} payload block not found in note`);
  }
  const payloadTag = payloadTagMatch[0];
  const encoding = (
    readTagAttribute(payloadTag, "data-zs-encoding") || "base64"
  ).toLowerCase();
  const encodedValue = decodeHtmlEntities(
    readTagAttribute(payloadTag, "data-zs-value"),
  );
  let payload = null;
  if (encoding === "base64") {
    payload = decodePayloadValue(encodedValue, runtime, payloadFormat);
  } else if (encoding === "plain" || encoding === "utf8") {
    payload =
      payloadFormat === "text" ? encodedValue : JSON.parse(encodedValue);
  } else {
    throw new Error(`Unsupported ${payloadType} payload encoding: ${encoding}`);
  }
  return {
    payload,
    payloadTag,
  };
}

export function parseWorkbenchNoteKind(noteContent) {
  const text = String(noteContent || "");
  if (/data-zs-payload=(["'])digest-markdown\1/i.test(text)) {
    return "digest";
  }
  if (/data-zs-payload=(["'])references-json\1/i.test(text)) {
    return "references";
  }
  if (/data-zs-payload=(["'])citation-analysis-json\1/i.test(text)) {
    return "citation-analysis";
  }
  if (/data-zs-payload=(["'])citation-analysis-markdown\1/i.test(text)) {
    return "citation-analysis";
  }
  if (/data-zs-payload=(["'])conversation-note-markdown\1/i.test(text)) {
    return "conversation-note";
  }
  if (/data-zs-payload=(["'])custom-markdown\1/i.test(text)) {
    return "custom";
  }

  const kindMatch = text.match(
    /data-zs-note-kind\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))/i,
  );
  const kind = kindMatch
    ? String(kindMatch[1] || kindMatch[2] || kindMatch[3] || "")
    : "";
  if (
    kind === "digest" ||
    kind === "references" ||
    kind === "citation-analysis" ||
    kind === "citation_analysis" ||
    kind === "conversation-note" ||
    kind === "custom"
  ) {
    return kind === "citation_analysis" ? "citation-analysis" : kind;
  }
  if (kind === "literature-digest" || kind === "literature-analysis") {
    return "digest";
  }
  return "";
}

export function buildStructuredNoteContent(args) {
  const parts = [`<div data-zs-note-kind="${escapeAttribute(args.noteKind)}">`];
  for (const block of args.metadataBlocks || []) {
    if (String(block || "").trim()) {
      parts.push(String(block));
    }
  }
  parts.push(`<h1>${escapeHtml(String(args.title || ""))}</h1>`);
  for (const block of args.afterTitleBlocks || []) {
    if (String(block || "").trim()) {
      parts.push(String(block));
    }
  }
  parts.push(`<div data-zs-view="${escapeAttribute(args.viewName)}">`);
  parts.push(String(args.bodyHtml || ""));
  parts.push("</div>");
  parts.push(
    renderPayloadBlock(args.payloadType, args.payload, args.runtime, {
      payloadFormat: args.payloadFormat,
    }),
  );
  parts.push("</div>");
  return parts.join("\n");
}

export function buildMarkdownBackedNoteContent(args) {
  return buildStructuredNoteContent({
    ...args,
    bodyHtml: renderMarkdownToHtml(args.markdown),
  });
}

export function buildLegalGeneratedNoteContent(args) {
  const parts = ['<div data-schema-version="9">'];
  parts.push(`<h1>${escapeHtml(String(args.title || ""))}</h1>`);
  for (const block of args.afterTitleBlocks || []) {
    if (String(block || "").trim()) {
      parts.push(String(block));
    }
  }
  if (String(args.bodyHtml || "").trim()) {
    parts.push(String(args.bodyHtml || ""));
  }
  parts.push("</div>");
  return parts.join("\n");
}

export function buildLegalGeneratedMarkdownNoteContent(args) {
  return buildLegalGeneratedNoteContent({
    ...args,
    bodyHtml: renderMarkdownToHtml(args.markdown),
  });
}

export function buildCustomNoteContent(args) {
  return buildMarkdownBackedNoteContent({
    noteKind: "custom",
    title: args.title,
    viewName: "custom-html",
    payloadType: "custom-markdown",
    payload: String(args.markdown || ""),
    payloadFormat: "text",
    markdown: String(args.markdown || ""),
    runtime: args.runtime,
  });
}

export function buildConversationNotePayload(args) {
  return {
    version: 1,
    path: args.noteEntry,
    format: "markdown",
    content: String(args.markdown || ""),
  };
}

export function buildConversationNoteContent(args) {
  return [
    '<div data-zs-note-kind="conversation-note">',
    `<h1>${escapeHtml(String(args.title || ""))}</h1>`,
    '<div data-zs-view="conversation-note-html">',
    renderMarkdownToHtml(args.markdown),
    "</div>",
    "</div>",
  ].join("\n");
}

export async function createConversationNote(args) {
  const note = await requireHostApi(args.runtime).parents.addNote(
    args.parentItem,
    {
      content: buildConversationNoteContent(args),
    },
  );
  await attachWorkbenchPayloadToNote({
    runtime: args.runtime,
    note,
    noteKind: "conversation-note",
    payloadType: "conversation-note-markdown",
    payload: buildConversationNotePayload(args),
  });
  return note;
}
