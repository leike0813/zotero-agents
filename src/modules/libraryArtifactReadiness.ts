import { parseNoteKind } from "./notePayloadCodec";
import {
  listNotePayloadBlocksForItem,
  selectPreferredNotePayloadBlock,
} from "./zoteroNotePayloadResolver";
import {
  LITERATURE_SCORE_PAYLOAD_TYPE,
  parseLiteratureScore,
  type LiteratureScoreSummary,
} from "../shared/literatureScore";
import type {
  WorkflowGeneratedNoteArtifactSpec,
  WorkflowGeneratedNotePayloadRequirement,
  WorkflowGeneratedNoteReadinessFilter,
  WorkflowGeneratedNoteReadinessResult,
} from "../workflows/types";
import { hydrateZoteroItemsByIds } from "./zoteroLibraryPageQuery";

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
  literatureScore: {
    status: "available" | "missing" | "invalid";
    summary: LiteratureScoreSummary | null;
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

function childItemIds(value: unknown) {
  return (Array.isArray(value) ? value : [])
    .map(Number)
    .filter((id) => Number.isSafeInteger(id) && id > 0);
}

async function resolveArtifactChildren(item: LibraryArtifactItem) {
  const zotero = (globalThis as { Zotero?: any }).Zotero;
  if (typeof zotero?.Items?.loadDataTypes === "function") {
    await zotero.Items.loadDataTypes([item], ["childItems"]);
  }
  const noteIds = childItemIds(item.getNotes?.() || []);
  const attachmentIds = childItemIds(item.getAttachments?.() || []);
  const childIds = Array.from(new Set([...noteIds, ...attachmentIds]));
  const children = childIds.length
    ? ((await hydrateZoteroItemsByIds(
        childIds,
        zotero,
      )) as LibraryArtifactItem[])
    : [];
  const byId = new Map(children.map((child) => [Number(child.id), child]));
  return {
    notes: noteIds
      .map((id) => byId.get(id))
      .filter((child): child is LibraryArtifactItem => Boolean(child)),
    attachments: attachmentIds
      .map((id) => byId.get(id))
      .filter((child): child is LibraryArtifactItem => Boolean(child)),
  };
}

export async function resolveLibraryArtifactReadiness(
  item: LibraryArtifactItem,
): Promise<LibraryArtifactReadiness> {
  if (!isTopLevelRegularArtifactItem(item)) {
    return emptyLibraryArtifactReadiness();
  }
  const children = await resolveArtifactChildren(item);
  const artifacts = new Set<LibraryArtifactKind>();
  const pdfAttachment = await resolveBestPdfAttachment(
    item,
    children.attachments,
  );
  const pdfFilename = pdfAttachment
    ? await resolveAttachmentFilename(pdfAttachment)
    : "";
  const pdfStem = pdfAttachment ? resolveStem(pdfFilename) : "";
  const markdownStems = await resolveMarkdownAttachmentStems(
    children.attachments,
  );
  const hasSourceMarkdown = !!pdfStem && markdownStems.has(pdfStem);
  if (hasSourceMarkdown) {
    artifacts.add("source-markdown");
  }
  const generatedNotes = await resolveGeneratedNoteArtifacts(children.notes);
  for (const artifact of generatedNotes.artifacts) {
    artifacts.add(artifact);
  }
  const missingParts = REQUIRED_ANALYSIS_ARTIFACTS.filter(
    (artifact) => !artifacts.has(artifact),
  );
  const readiness: LibraryArtifactReadiness = {
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
    literatureScore: {
      status: generatedNotes.scoreStatus,
      summary: generatedNotes.score,
    },
  };
  return readiness;
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

export async function resolveBestPdfAttachment(
  item: LibraryArtifactItem,
  resolvedAttachments?: LibraryArtifactItem[],
) {
  const best = await item.getBestAttachment?.();
  if (best && isPdfAttachment(best as LibraryArtifactItem)) {
    return best as LibraryArtifactItem;
  }
  const attachments =
    resolvedAttachments || (await resolveArtifactChildren(item)).attachments;
  for (const attachment of attachments) {
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

export async function evaluateGeneratedNoteReadiness(
  parentItem: LibraryArtifactItem,
  spec: WorkflowGeneratedNoteReadinessFilter,
): Promise<WorkflowGeneratedNoteReadinessResult> {
  const childNotes = (await resolveArtifactChildren(parentItem)).notes;
  const notes: Array<{
    item: LibraryArtifactItem;
    kind: string;
  }> = [];
  for (const note of childNotes) {
    if (!note?.isNote?.()) {
      continue;
    }
    notes.push({ item: note, kind: await resolveGeneratedNoteKind(note) });
  }

  const artifacts: WorkflowGeneratedNoteReadinessResult["artifacts"] = {};
  for (const artifactSpec of spec.artifacts) {
    artifacts[artifactSpec.id] = await evaluateGeneratedNoteArtifact(
      notes,
      artifactSpec,
    );
  }
  const mode =
    spec.modes.find((candidate) => {
      if (candidate.default) {
        return false;
      }
      return (
        (candidate.allAvailable || []).every(
          (id) => artifacts[id]?.status === "available",
        ) &&
        (candidate.allUnavailable || []).every(
          (id) => artifacts[id]?.status !== "available",
        )
      );
    })?.id ||
    spec.modes.find((candidate) => candidate.default)?.id ||
    "";
  const evidenceHash = JSON.stringify(
    spec.artifacts.map((artifactSpec) => {
      const artifact = artifacts[artifactSpec.id];
      return [artifactSpec.id, artifact?.status, artifact?.noteIds || []];
    }),
  );
  return {
    mode,
    accepted: spec.acceptModes.includes(mode),
    evidenceHash,
    artifacts,
  };
}

async function evaluateGeneratedNoteArtifact(
  notes: Array<{ item: LibraryArtifactItem; kind: string }>,
  spec: WorkflowGeneratedNoteArtifactSpec,
): Promise<WorkflowGeneratedNoteReadinessResult["artifacts"][string]> {
  const candidates = notes.filter((note) => spec.noteKinds.includes(note.kind));
  const noteIds = candidates
    .map((candidate) => Number(candidate.item.id))
    .filter(Number.isFinite);
  if (!candidates.length) {
    return { status: "missing", noteIds, diagnostics: [] };
  }
  if (!spec.payload) {
    return { status: "available", noteIds, diagnostics: [] };
  }
  const diagnostics: string[] = [];
  for (const candidate of candidates) {
    try {
      const block = selectPreferredNotePayloadBlock(
        await listNotePayloadBlocksForItem(candidate.item),
        spec.payload.type,
      );
      if (!block || block.errors?.length) {
        diagnostics.push(...(block?.errors || ["payload missing"]));
        continue;
      }
      const failed = (spec.payload.requirements || []).find(
        (requirement) => !matchesPayloadRequirement(block.payload, requirement),
      );
      if (failed) {
        diagnostics.push(`payload requirement failed: ${failed.pointer}`);
        continue;
      }
      if (
        spec.payload.type === LITERATURE_SCORE_PAYLOAD_TYPE &&
        !parseLiteratureScore(block.payload)
      ) {
        diagnostics.push("literature score payload is invalid");
        continue;
      }
      return {
        status: "available",
        noteIds,
        payload: block.payload,
        diagnostics: [],
      };
    } catch (error) {
      diagnostics.push(error instanceof Error ? error.message : String(error));
    }
  }
  return { status: "invalid", noteIds, diagnostics };
}

function matchesPayloadRequirement(
  payload: unknown,
  requirement: WorkflowGeneratedNotePayloadRequirement,
) {
  const value = resolveJsonPointer(payload, requirement.pointer);
  if ("const" in requirement && value !== requirement.const) {
    return false;
  }
  if (requirement.type === "array") {
    if (!Array.isArray(value)) return false;
    if (
      typeof requirement.length === "number" &&
      value.length !== requirement.length
    ) {
      return false;
    }
  } else if (requirement.type === "object") {
    if (!value || typeof value !== "object" || Array.isArray(value))
      return false;
  } else if (requirement.type && typeof value !== requirement.type) {
    return false;
  }
  if (typeof value === "number") {
    if (
      typeof requirement.minimum === "number" &&
      value < requirement.minimum
    ) {
      return false;
    }
    if (
      typeof requirement.maximum === "number" &&
      value > requirement.maximum
    ) {
      return false;
    }
  }
  return true;
}

function resolveJsonPointer(payload: unknown, pointer: string): unknown {
  if (!pointer || pointer === "/") {
    return payload;
  }
  let current = payload;
  for (const token of pointer
    .replace(/^\//, "")
    .split("/")
    .map((entry) => entry.replace(/~1/g, "/").replace(/~0/g, "~"))) {
    if (!current || typeof current !== "object") {
      return undefined;
    }
    current = (current as Record<string, unknown>)[token];
  }
  return current;
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
    literatureScore: {
      status: "missing",
      summary: null,
    },
  };
}

async function resolveGeneratedNoteArtifacts(notes: LibraryArtifactItem[]) {
  const artifacts = new Set<LibraryArtifactKind>();
  let score: LiteratureScoreSummary | null = null;
  let scoreStatus: "available" | "missing" | "invalid" = "missing";
  for (const note of notes) {
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
    } else if (noteKind === "literature-score") {
      const resolved = await resolveLiteratureScoreForNote(note);
      if (resolved) {
        score = resolved;
        scoreStatus = "available";
      } else if (scoreStatus !== "available") {
        scoreStatus = "invalid";
      }
    }
  }
  return { artifacts, score, scoreStatus };
}

async function resolveLiteratureScoreForNote(note: LibraryArtifactItem) {
  try {
    const block = selectPreferredNotePayloadBlock(
      await listNotePayloadBlocksForItem(note),
      LITERATURE_SCORE_PAYLOAD_TYPE,
    );
    if (!block || block.errors?.length) {
      return null;
    }
    return parseLiteratureScore(block.payload);
  } catch {
    return null;
  }
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
  if (headingKind === "literature-score") {
    return (await resolveLiteratureScoreForNote(note))
      ? "literature-score"
      : "";
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
  if (payloadType === LITERATURE_SCORE_PAYLOAD_TYPE) {
    return "literature-score";
  }
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
  if (/^(?:literature )?(?:score|rating)$/i.test(heading)) {
    return "literature-score";
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
  if (normalized === "literature-score" || normalized === "literature_score") {
    return "literature-score";
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

async function resolveMarkdownAttachmentStems(
  attachments: LibraryArtifactItem[],
) {
  const stems = new Set<string>();
  for (const attachment of attachments) {
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
