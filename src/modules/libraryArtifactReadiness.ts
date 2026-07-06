import { parseNoteKind } from "./notePayloadCodec";
import {
  listNotePayloadBlocksForItem,
  selectPreferredNotePayloadBlock,
} from "./zoteroNotePayloadResolver";

export type LibraryArtifactKind =
  | "source-markdown"
  | "digest"
  | "references"
  | "citation-analysis";

export type LibraryArtifactItem = Zotero.Item & {
  attachmentFilename?: string;
  attachmentContentType?: string;
  getFilePath?: () => string | false | null | undefined;
  getFilePathAsync?: () => Promise<string | false | null | undefined>;
  getBestAttachment?: () => Promise<Zotero.Item | false>;
  isPDFAttachment?: () => boolean;
  isRegularItem?: () => boolean;
  isTopLevelItem?: () => boolean;
};

export type LibraryArtifactDefinition = {
  kind: LibraryArtifactKind;
  label: string;
  icon: string;
};

export type LibraryArtifactReadiness = {
  state: string;
  artifacts: LibraryArtifactKind[];
  pdf: {
    present: boolean;
    filename: string;
    stem: string;
  };
  sourceMarkdown: {
    present: boolean;
    matchingStem: string;
    markdownStems: string[];
  };
  generated: {
    digest: boolean;
    references: boolean;
    citationAnalysis: boolean;
    missingParts: Array<"digest" | "references" | "citation-analysis">;
    complete: boolean;
  };
};

export const LIBRARY_ARTIFACT_DEFINITIONS: LibraryArtifactDefinition[] = [
  {
    kind: "source-markdown",
    label: "Source Markdown",
    icon: "icon_artifact_markdown.svg",
  },
  {
    kind: "digest",
    label: "Digest",
    icon: "icon_artifact_digest.svg",
  },
  {
    kind: "references",
    label: "References",
    icon: "icon_artifact_references.svg",
  },
  {
    kind: "citation-analysis",
    label: "Citation Analysis",
    icon: "icon_artifact_citation_analysis.svg",
  },
];

const MARKDOWN_EXTENSIONS = new Set(["md", "markdown"]);
const REQUIRED_ANALYSIS_ARTIFACTS: Array<
  "digest" | "references" | "citation-analysis"
> = ["digest", "references", "citation-analysis"];
const NOTE_PAYLOAD_KIND_BY_TYPE = new Map<string, LibraryArtifactKind>([
  ["digest-markdown", "digest"],
  ["references-json", "references"],
  ["citation-analysis-json", "citation-analysis"],
  ["citation-analysis-markdown", "citation-analysis"],
]);
const PAYLOAD_TYPES_BY_NOTE_KIND: Record<
  "digest" | "references" | "citation-analysis",
  string[]
> = {
  digest: ["digest-markdown"],
  references: ["references-json"],
  "citation-analysis": ["citation-analysis-json", "citation-analysis-markdown"],
};

export async function resolveLibraryArtifactReadiness(
  item: LibraryArtifactItem,
): Promise<LibraryArtifactReadiness> {
  if (!isTopLevelRegularArtifactItem(item)) {
    return emptyLibraryArtifactReadiness();
  }
  const artifacts = new Set<LibraryArtifactKind>();
  const pdfAttachment = await resolveBestPdfAttachment(item);
  const pdfFilename = pdfAttachment
    ? await resolveAttachmentFilename(pdfAttachment)
    : "";
  const pdfStem = pdfAttachment ? resolveStem(pdfFilename) : "";
  const markdownStems = await resolveMarkdownAttachmentStems(item);
  const hasSourceMarkdown = !!pdfStem && markdownStems.has(pdfStem);
  if (hasSourceMarkdown) {
    artifacts.add("source-markdown");
  }
  for (const artifact of await resolveGeneratedNoteArtifacts(item)) {
    artifacts.add(artifact);
  }
  const missingParts = REQUIRED_ANALYSIS_ARTIFACTS.filter(
    (artifact) => !artifacts.has(artifact),
  );
  return {
    state: serializeLibraryArtifactState(artifacts),
    artifacts: Array.from(artifacts),
    pdf: {
      present: !!pdfAttachment,
      filename: pdfFilename,
      stem: pdfStem,
    },
    sourceMarkdown: {
      present: hasSourceMarkdown,
      matchingStem: hasSourceMarkdown ? pdfStem : "",
      markdownStems: Array.from(markdownStems).sort(),
    },
    generated: {
      digest: artifacts.has("digest"),
      references: artifacts.has("references"),
      citationAnalysis: artifacts.has("citation-analysis"),
      missingParts,
      complete: missingParts.length === 0,
    },
  };
}

export function serializeLibraryArtifactState(
  artifacts: Set<LibraryArtifactKind>,
) {
  return LIBRARY_ARTIFACT_DEFINITIONS.map(({ kind }) => kind)
    .filter((kind) => artifacts.has(kind))
    .join("|");
}

export function parseLibraryArtifactState(data: string) {
  const requested = new Set(
    String(data || "")
      .split("|")
      .filter(Boolean),
  );
  return LIBRARY_ARTIFACT_DEFINITIONS.filter(({ kind }) => requested.has(kind));
}

export async function resolveBestPdfAttachment(item: LibraryArtifactItem) {
  const best = await item.getBestAttachment?.();
  if (best && isPdfAttachment(best as LibraryArtifactItem)) {
    return best as LibraryArtifactItem;
  }
  for (const id of item.getAttachments?.() || []) {
    const attachment = Zotero.Items.get(id) as LibraryArtifactItem | undefined;
    if (attachment && isPdfAttachment(attachment)) {
      return attachment;
    }
  }
  return null;
}

export function isTopLevelRegularArtifactItem(item: LibraryArtifactItem) {
  if (item.isNote?.() || item.isAttachment?.()) {
    return false;
  }
  if (typeof item.isRegularItem === "function" && !item.isRegularItem()) {
    return false;
  }
  if (typeof item.isTopLevelItem === "function") {
    return item.isTopLevelItem();
  }
  return !item.parentID;
}

function emptyLibraryArtifactReadiness(): LibraryArtifactReadiness {
  return {
    state: "",
    artifacts: [],
    pdf: {
      present: false,
      filename: "",
      stem: "",
    },
    sourceMarkdown: {
      present: false,
      matchingStem: "",
      markdownStems: [],
    },
    generated: {
      digest: false,
      references: false,
      citationAnalysis: false,
      missingParts: [...REQUIRED_ANALYSIS_ARTIFACTS],
      complete: false,
    },
  };
}

async function resolveGeneratedNoteArtifacts(item: LibraryArtifactItem) {
  const artifacts = new Set<LibraryArtifactKind>();
  for (const id of item.getNotes?.() || []) {
    const note = Zotero.Items.get(id) as LibraryArtifactItem | undefined;
    if (!note?.isNote?.()) {
      continue;
    }
    const noteKind = await resolveGeneratedNoteKind(note);
    if (noteKind === "digest") {
      artifacts.add("digest");
    } else if (noteKind === "references") {
      artifacts.add("references");
    } else if (noteKind === "citation-analysis") {
      artifacts.add("citation-analysis");
    }
  }
  return artifacts;
}

async function resolveGeneratedNoteKind(note: LibraryArtifactItem) {
  const noteHtml = note.getNote?.() || "";
  const markerKind = normalizeGeneratedNoteKindFromMarkers(noteHtml);
  if (markerKind) {
    return markerKind;
  }
  const headingKind = resolveGeneratedSchemaHeadingKind(noteHtml);
  if (!headingKind) {
    return "";
  }
  return resolveGeneratedNoteKindFromEmbeddedPayload(note, headingKind);
}

function normalizeGeneratedNoteKindFromMarkers(noteHtml: unknown) {
  const html = String(noteHtml || "");
  const parsed = normalizeKnownGeneratedNoteKind(parseNoteKind(html));
  if (parsed) {
    return parsed;
  }
  const payloadType =
    readHtmlDataAttribute(html, "data-zs-payload") ||
    readHtmlDataAttribute(html, "data-zs-payload-anchor");
  return NOTE_PAYLOAD_KIND_BY_TYPE.get(payloadType) || "";
}

function resolveGeneratedSchemaHeadingKind(noteHtml: unknown) {
  const html = String(noteHtml || "");
  if (!/<(?:div|section)\b[^>]*data-schema-version\s*=/i.test(html)) {
    return "";
  }
  const heading = cleanHtmlText(
    html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || "",
  );
  if (/^digest$/i.test(heading)) {
    return "digest";
  }
  if (/^references$/i.test(heading)) {
    return "references";
  }
  if (/^citation analysis$/i.test(heading)) {
    return "citation-analysis";
  }
  return "";
}

function normalizeKnownGeneratedNoteKind(value: unknown) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();
  if (normalized === "digest" || normalized === "references") {
    return normalized;
  }
  if (
    normalized === "citation-analysis" ||
    normalized === "citation_analysis"
  ) {
    return "citation-analysis";
  }
  return "";
}

function readHtmlDataAttribute(html: string, name: string) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = html.match(
    new RegExp(`${escaped}\\s*=\\s*(?:"([^"]+)"|'([^']+)'|([^\\s>]+))`, "i"),
  );
  return String(match?.[1] || match?.[2] || match?.[3] || "").trim();
}

async function resolveGeneratedNoteKindFromEmbeddedPayload(
  note: LibraryArtifactItem,
  expectedKind: "digest" | "references" | "citation-analysis",
) {
  try {
    const blocks = await listNotePayloadBlocksForItem(note);
    for (const payloadType of PAYLOAD_TYPES_BY_NOTE_KIND[expectedKind]) {
      if (selectPreferredNotePayloadBlock(blocks, payloadType)) {
        return expectedKind;
      }
    }
  } catch {
    return "";
  }
  return "";
}

function cleanHtmlText(value: unknown) {
  return String(value || "")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function isPdfAttachment(item: LibraryArtifactItem) {
  try {
    if (item.isPDFAttachment?.()) {
      return true;
    }
  } catch {
    return false;
  }
  if (normalizeContentType(item.attachmentContentType) === "application/pdf") {
    return true;
  }
  const filename = resolveAttachmentFilenameSync(item).toLowerCase();
  return filename.endsWith(".pdf");
}

async function resolveMarkdownAttachmentStems(item: LibraryArtifactItem) {
  const stems = new Set<string>();
  for (const id of item.getAttachments?.() || []) {
    const attachment = Zotero.Items.get(id) as LibraryArtifactItem | undefined;
    if (!attachment || !(await isMarkdownAttachment(attachment))) {
      continue;
    }
    const stem = await resolveAttachmentStem(attachment);
    if (stem) {
      stems.add(stem);
    }
  }
  return stems;
}

async function isMarkdownAttachment(item: LibraryArtifactItem) {
  const filename = await resolveAttachmentFilename(item);
  return MARKDOWN_EXTENSIONS.has(resolveExtension(filename));
}

async function resolveAttachmentStem(item: LibraryArtifactItem) {
  const filename = await resolveAttachmentFilename(item);
  return resolveStem(filename);
}

function resolveStem(filename: string) {
  const extension = resolveExtension(filename);
  if (!extension) {
    return "";
  }
  return filename
    .slice(0, Math.max(0, filename.length - extension.length - 1))
    .trim()
    .toLowerCase();
}

async function resolveAttachmentFilename(item: LibraryArtifactItem) {
  const syncFilename = resolveAttachmentFilenameSync(item);
  if (syncFilename) {
    return syncFilename;
  }
  try {
    const filePath = await item.getFilePathAsync?.();
    return basename(String(filePath || ""));
  } catch {
    return "";
  }
}

function resolveAttachmentFilenameSync(item: LibraryArtifactItem) {
  const attachmentFilename = String(item.attachmentFilename || "").trim();
  if (attachmentFilename) {
    return attachmentFilename;
  }
  try {
    const filePath = item.getFilePath?.();
    return basename(String(filePath || ""));
  } catch {
    return "";
  }
}

function basename(value: string) {
  const normalized = String(value || "").trim();
  if (!normalized) {
    return "";
  }
  const parts = normalized.split(/[\\/]+/);
  return parts[parts.length - 1] || "";
}

function resolveExtension(filename: string) {
  const index = filename.lastIndexOf(".");
  if (index <= 0 || index === filename.length - 1) {
    return "";
  }
  return filename.slice(index + 1).toLowerCase();
}

function normalizeContentType(value: unknown) {
  return String(value || "")
    .split(";")[0]
    .trim()
    .toLowerCase();
}
