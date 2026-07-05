import { parseNoteKind } from "./notePayloadCodec";

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
  for (const artifact of resolveGeneratedNoteArtifacts(item)) {
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

function resolveGeneratedNoteArtifacts(item: LibraryArtifactItem) {
  const artifacts = new Set<LibraryArtifactKind>();
  for (const id of item.getNotes?.() || []) {
    const note = Zotero.Items.get(id) as LibraryArtifactItem | undefined;
    if (!note?.isNote?.()) {
      continue;
    }
    const noteKind = normalizeGeneratedNoteKind(note.getNote?.() || "");
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

function normalizeGeneratedNoteKind(noteHtml: unknown) {
  const html = String(noteHtml || "");
  const parsed = parseNoteKind(html);
  if (parsed === "citation_analysis") {
    return "citation-analysis";
  }
  if (parsed) {
    return parsed;
  }
  const anchorMatch = html.match(
    /data-zs-payload-anchor\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))/i,
  );
  const anchor = String(
    anchorMatch?.[1] || anchorMatch?.[2] || anchorMatch?.[3] || "",
  );
  if (anchor === "digest-markdown") {
    return "digest";
  }
  if (anchor === "references-json") {
    return "references";
  }
  if (anchor === "citation-analysis-json") {
    return "citation-analysis";
  }
  return "";
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
