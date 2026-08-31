import {
  decodeBase64Utf8,
  decodeHtmlEntities,
  encodeBase64Utf8,
  readTagAttribute,
  setTagAttribute,
} from "./htmlCodec.mjs";
import {
  attachWorkbenchPayloadToNote,
  resolveWorkbenchEmbeddedPayloadBlock,
} from "./embeddedPayloadAttachments.mjs";
import { parseWorkbenchNoteKind } from "./noteCodecs.mjs";
import { normalizeReferencesPayload } from "./referenceModel.mjs";

export function cloneSelectionContext(selectionContext) {
  return JSON.parse(JSON.stringify(selectionContext || {}));
}

export function parseNoteKind(noteContent) {
  const text = String(noteContent || "");
  const payloadKind = text.match(
    /data-zs-payload\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))/i,
  );
  const payloadType = payloadKind
    ? String(payloadKind[1] || payloadKind[2] || payloadKind[3] || "")
    : "";
  if (payloadType === "references-json") {
    return "references";
  }
  const kindMatch = text.match(
    /data-zs-note-kind\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))/i,
  );
  const kind = kindMatch
    ? String(kindMatch[1] || kindMatch[2] || kindMatch[3] || "")
    : "";
  if (kind === "references") {
    return "references";
  }
  const isZoteroNormalizedGeneratedNote =
    /<div\b[^>]*data-schema-version\s*=/i.test(text) ||
    /<section\b[^>]*data-schema-version\s*=/i.test(text);
  return isZoteroNormalizedGeneratedNote &&
    parseGeneratedNoteKind(text) === "references"
    ? "references"
    : "";
}

export function parseGeneratedNoteKind(noteContent) {
  const text = String(noteContent || "");
  const directMatch = parseWorkbenchNoteKind(text);
  if (directMatch) {
    return directMatch;
  }

  const hasDigestHeading =
    /<h1[^>]*>\s*Digest\s*<\/h1>/i.test(text) ||
    /<p[^>]*>\s*(?:<strong>)?\s*Digest\s*(?:<\/strong>)?\s*<\/p>/i.test(text) ||
    /(^|\n)\s*#\s*Digest\s*($|\n)/i.test(text) ||
    /<h1[^>]*>\s*Literature Digest\s*<\/h1>/i.test(text) ||
    /<p[^>]*>\s*(?:<strong>)?\s*Literature Digest\s*(?:<\/strong>)?\s*<\/p>/i.test(
      text,
    ) ||
    /(^|\n)\s*#\s*Literature Digest\s*($|\n)/i.test(text);
  const hasReferencesHeading =
    /<h1[^>]*>\s*References(?:\s+JSON)?\s*<\/h1>/i.test(text) ||
    /<p[^>]*>\s*(?:<strong>)?\s*References(?:\s+JSON)?\s*(?:<\/strong>)?\s*<\/p>/i.test(
      text,
    ) ||
    /(^|\n)\s*#\s*References(?:\s+JSON)?\s*($|\n)/i.test(text);
  const hasCitationHeading =
    /<h1[^>]*>\s*Citation Analysis\s*<\/h1>/i.test(text) ||
    /<p[^>]*>\s*(?:<strong>)?\s*Citation Analysis\s*(?:<\/strong>)?\s*<\/p>/i.test(
      text,
    ) ||
    /(^|\n)\s*#\s*Citation Analysis\s*($|\n)/i.test(text);

  if (hasDigestHeading) {
    return "digest";
  }
  if (hasReferencesHeading) {
    return "references";
  }
  if (hasCitationHeading) {
    return "citation-analysis";
  }

  return "";
}

export function collectCandidateNotesFromParents(selectionContext) {
  const parents = Array.isArray(selectionContext?.items?.parents)
    ? selectionContext.items.parents
    : [];
  const notes = [];
  for (const parentEntry of parents) {
    const parentNotes = Array.isArray(parentEntry?.notes) ? parentEntry.notes : [];
    for (const noteEntry of parentNotes) {
      notes.push(noteEntry);
    }
  }
  return notes;
}

export function collectCandidateNotes(selectionContext) {
  const directNotes = Array.isArray(selectionContext?.items?.notes)
    ? selectionContext.items.notes
    : [];
  return [...directNotes, ...collectCandidateNotesFromParents(selectionContext)];
}

export function parseReferencesPayload(noteContent, runtime) {
  const payloadTagMatch = String(noteContent || "").match(
    /<span[^>]*data-zs-payload=(["'])references-json\1[^>]*>/i,
  );
  if (!payloadTagMatch) {
    throw new Error("references payload block not found in note");
  }
  const payloadTag = payloadTagMatch[0];
  const encoding = (
    readTagAttribute(payloadTag, "data-zs-encoding") || "base64"
  ).toLowerCase();
  const encodedValue = decodeHtmlEntities(
    readTagAttribute(payloadTag, "data-zs-value"),
  );
  let jsonText = "";
  if (encoding === "base64") {
    jsonText = decodeBase64Utf8(encodedValue, runtime);
  } else if (encoding === "plain" || encoding === "utf8") {
    jsonText = encodedValue;
  } else {
    throw new Error(`Unsupported references payload encoding: ${encoding}`);
  }

  let payload = null;
  try {
    payload = JSON.parse(jsonText);
  } catch {
    throw new Error("references payload JSON is malformed");
  }
  const references = normalizeReferencesPayload(payload);
  return {
    payload,
    references,
    payloadTag,
    source: "html-payload-block",
  };
}

function normalizeReferencesFromPayload(payload, runtime) {
  void runtime;
  return normalizeReferencesPayload(payload);
}

export async function resolveReferencesPayloadForNote(args) {
  const noteContent = String(args?.noteContent || "");
  const runtime = args?.runtime;
  const block = await resolveWorkbenchEmbeddedPayloadBlock({
    runtime,
    noteItem: args?.noteItem,
    payloadType: "references-json",
  });
  if (block && !block.errors?.length) {
    const payload = block.payload;
    return {
      payload,
      references: normalizeReferencesFromPayload(payload, runtime),
      payloadTag: "",
      source: "embedded-image-attachment",
      sourceStorage: block.sourceStorage,
      payloadStorageVersion: block.payloadStorageVersion,
      anchorStatus: block.anchorStatus,
    };
  }
  try {
    return parseReferencesPayload(noteContent, runtime);
  } catch {
    // New generated notes persist payloads in note-child embedded-image
    // attachments so Zotero's note editor can normalize the visible HTML.
  }
  throw new Error("references payload block not found in note");
}

export function replaceReferencesTable(noteContent, tableHtml) {
  const pattern =
    /<table[^>]*data-zs-view=(["'])references-table\1[^>]*>[\s\S]*?<\/table>/i;
  if (pattern.test(noteContent)) {
    return String(noteContent).replace(pattern, tableHtml);
  }
  const payloadTagPattern =
    /<span[^>]*data-zs-payload=(["'])references-json\1[^>]*>/i;
  if (payloadTagPattern.test(noteContent)) {
    return String(noteContent).replace(payloadTagPattern, `${tableHtml}$&`);
  }
  return `${String(noteContent || "")}\n${tableHtml}`;
}

export function updatePayloadBlock(noteContent, payloadTag, nextPayload, runtime) {
  const nextEncoded = encodeBase64Utf8(JSON.stringify(nextPayload), runtime);
  let nextTag = setTagAttribute(payloadTag, "data-zs-encoding", "base64");
  nextTag = setTagAttribute(nextTag, "data-zs-value", nextEncoded);
  return String(noteContent).replace(payloadTag, nextTag);
}

export async function persistReferencesPayloadForNote(args) {
  const source = String(args?.source || "");
  if (source !== "embedded-image-attachment") {
    return updatePayloadBlock(
      args?.noteContent,
      args?.payloadTag,
      args?.nextPayload,
      args?.runtime,
    );
  }
  await attachWorkbenchPayloadToNote({
    runtime: args?.runtime,
    note: args?.noteItem,
    noteKind: "references",
    payloadType: "references-json",
    payload: args?.nextPayload,
  });
  return String(args?.noteContent || "");
}

export function parseReferencesNoteKind(noteContent) {
  return parseNoteKind(noteContent);
}
