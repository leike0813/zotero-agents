import { parseNoteKind } from "./notePayloadCodec";
import {
  listNotePayloadBlocksForItemPage,
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
import { yieldToEventLoop } from "../utils/runtimeCompatibility";
import { queryZoteroChildItemPage } from "./zoteroLibraryPageQuery";

export type LibraryArtifactKind =
  | "source-markdown"
  | "digest"
  | "references"
  | "citation-analysis"
  | "literature-score";

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
  {
    kind: "literature-score",
    label: "Literature Score",
    icon: "icon_artifact_literature_score.svg",
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

export type LibraryArtifactReadOptions = {
  runNativeSlice?: <T>(run: () => Promise<T> | T) => Promise<T>;
  checkCanceled?: () => void;
};

const ARTIFACT_READ_PAGE_LIMIT = 100;

export type LibraryArtifactPayloadBlock = Awaited<
  ReturnType<typeof listNotePayloadBlocksForItemPage>
>["blocks"][number];

export type LibraryArtifactNoteFacts = {
  id: number;
  key: string;
  title: string;
  html: string;
  updatedAt: string;
  payloadBlocks: LibraryArtifactPayloadBlock[];
};

export type LibraryArtifactGeneratedNoteFacts = Omit<
  LibraryArtifactNoteFacts,
  "id"
> & { id?: number };

type LibraryArtifactAttachmentFacts = {
  id: number;
  key: string;
  filename: string;
  isPdf: boolean;
  isMarkdown: boolean;
};

function checkArtifactRead(options: LibraryArtifactReadOptions) {
  options.checkCanceled?.();
}

function runArtifactNative<T>(
  options: LibraryArtifactReadOptions,
  run: () => Promise<T> | T,
) {
  return options.runNativeSlice
    ? options.runNativeSlice(run)
    : Promise.resolve().then(run);
}

function requireArtifactNextCursor(
  currentCursor: string | undefined,
  nextCursor: unknown,
  resource: string,
) {
  const next = String(nextCursor || "").trim();
  if (!next || next === currentCursor) {
    throw new Error(`${resource} page cursor did not advance`);
  }
  return next;
}

async function forEachArtifactChildPage(
  item: LibraryArtifactItem,
  domain: "notes" | "attachments",
  options: LibraryArtifactReadOptions,
  onPage: (items: LibraryArtifactItem[]) => Promise<void>,
) {
  const libraryId = Number((item as any).libraryID);
  const parentItemId = Number((item as any).id);
  let cursor: string | undefined;
  for (;;) {
    checkArtifactRead(options);
    const page = await runArtifactNative(options, () =>
      queryZoteroChildItemPage({
        domain,
        libraryId,
        parentItemId,
        limit: ARTIFACT_READ_PAGE_LIMIT,
        ...(cursor ? { cursor } : {}),
      }),
    );
    checkArtifactRead(options);
    await onPage(page.items as LibraryArtifactItem[]);
    checkArtifactRead(options);
    if (!page.hasMore) {
      return;
    }
    cursor = requireArtifactNextCursor(cursor, page.nextCursor, domain);
  }
}

async function detachArtifactNote(
  note: LibraryArtifactItem,
  options: LibraryArtifactReadOptions,
): Promise<LibraryArtifactNoteFacts | null> {
  if (!(await runArtifactNative(options, () => note?.isNote?.()))) {
    return null;
  }
  const detached = await runArtifactNative(options, () => ({
    id: Number(note.id),
    key: String(note.key || ""),
    title: String(note.getField?.("title") || note.getDisplayTitle?.() || ""),
    html: String(note.getNote?.() || ""),
    updatedAt: String(note.dateModified || note.dateAdded || ""),
  }));
  const payloadBlocks = await listLibraryArtifactPayloadBlocks(note, options);
  return {
    ...detached,
    payloadBlocks,
  };
}

async function detachArtifactAttachment(
  attachment: LibraryArtifactItem,
  options: LibraryArtifactReadOptions,
): Promise<LibraryArtifactAttachmentFacts | null> {
  if (!(await runArtifactNative(options, () => attachment?.isAttachment?.()))) {
    return null;
  }
  const filename = await resolveAttachmentFilename(attachment, options);
  const isPdf = await runArtifactNative(options, () =>
    isPdfAttachment(attachment),
  );
  const identity = await runArtifactNative(options, () => ({
    id: Number(attachment.id),
    key: String(attachment.key || ""),
  }));
  return {
    ...identity,
    filename,
    isPdf,
    isMarkdown: MARKDOWN_EXTENSIONS.has(resolveExtension(filename)),
  };
}

async function resolveArtifactChildren(
  item: LibraryArtifactItem,
  options: LibraryArtifactReadOptions = {},
) {
  const notes: LibraryArtifactNoteFacts[] = [];
  const attachments: LibraryArtifactAttachmentFacts[] = [];
  const processPage = async <T>(
    items: LibraryArtifactItem[],
    process: (item: LibraryArtifactItem) => Promise<T | null>,
    output: T[],
  ) => {
    let startedAt = Date.now();
    let processed = 0;
    for (const child of items) {
      checkArtifactRead(options);
      const fact = await process(child);
      if (fact) {
        output.push(fact);
      }
      processed += 1;
      if (processed >= 100 || Date.now() - startedAt >= 50) {
        await yieldToEventLoop();
        checkArtifactRead(options);
        startedAt = Date.now();
        processed = 0;
      }
    }
  };
  await Promise.all([
    forEachArtifactChildPage(item, "notes", options, (page) =>
      processPage(page, (child) => detachArtifactNote(child, options), notes),
    ),
    forEachArtifactChildPage(item, "attachments", options, (page) =>
      processPage(
        page,
        (child) => detachArtifactAttachment(child, options),
        attachments,
      ),
    ),
  ]);
  return { notes, attachments };
}

export async function listLibraryArtifactPayloadBlocks(
  note: LibraryArtifactItem,
  options: LibraryArtifactReadOptions = {},
) {
  const blocks: Awaited<
    ReturnType<typeof listNotePayloadBlocksForItemPage>
  >["blocks"] = [];
  let cursor: string | undefined;
  for (;;) {
    checkArtifactRead(options);
    const page = await listNotePayloadBlocksForItemPage(
      note,
      {
        limit: ARTIFACT_READ_PAGE_LIMIT,
        ...(cursor ? { cursor } : {}),
      },
      {
        ...(options.runNativeSlice
          ? { runNativeSlice: options.runNativeSlice }
          : {}),
        ...(options.checkCanceled
          ? { checkCanceled: options.checkCanceled }
          : {}),
      },
    );
    checkArtifactRead(options);
    blocks.push(...page.blocks);
    if (!page.hasMore) {
      return blocks;
    }
    cursor = requireArtifactNextCursor(cursor, page.nextCursor, "payload");
  }
}

export async function resolveLibraryArtifactReadiness(
  item: LibraryArtifactItem,
  options: LibraryArtifactReadOptions = {},
): Promise<LibraryArtifactReadiness> {
  if (
    !(await runArtifactNative(options, () =>
      isTopLevelRegularArtifactItem(item),
    ))
  ) {
    return emptyLibraryArtifactReadiness();
  }
  const children = await resolveArtifactChildren(item, options);
  const artifacts = new Set<LibraryArtifactKind>();
  const pdfAttachment = await resolveBestPdfAttachmentFacts(
    item,
    children.attachments,
    options,
  );
  const pdfFilename = pdfAttachment?.filename || "";
  const pdfStem = pdfAttachment ? resolveStem(pdfFilename) : "";
  const markdownStems = resolveMarkdownAttachmentStems(children.attachments);
  const hasSourceMarkdown = !!pdfStem && markdownStems.has(pdfStem);
  if (hasSourceMarkdown) {
    artifacts.add("source-markdown");
  }
  const generatedNotes = await resolveGeneratedNoteArtifacts(
    children.notes,
    options,
  );
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
  options: LibraryArtifactReadOptions = {},
) {
  const best = await runArtifactNative(options, () =>
    item.getBestAttachment?.(),
  );
  if (
    best &&
    (await runArtifactNative(options, () =>
      isPdfAttachment(best as LibraryArtifactItem),
    ))
  ) {
    return best as LibraryArtifactItem;
  }
  if (resolvedAttachments) {
    for (const attachment of resolvedAttachments) {
      if (
        attachment &&
        (await runArtifactNative(options, () => isPdfAttachment(attachment)))
      ) {
        return attachment;
      }
    }
  }
  let cursor: string | undefined;
  for (;;) {
    const page = await runArtifactNative(options, () =>
      queryZoteroChildItemPage({
        domain: "attachments",
        libraryId: Number(item.libraryID),
        parentItemId: Number(item.id),
        limit: ARTIFACT_READ_PAGE_LIMIT,
        ...(cursor ? { cursor } : {}),
      }),
    );
    for (const attachment of page.items as LibraryArtifactItem[]) {
      if (await runArtifactNative(options, () => isPdfAttachment(attachment))) {
        return attachment;
      }
    }
    if (!page.hasMore) return null;
    cursor = requireArtifactNextCursor(cursor, page.nextCursor, "attachments");
  }
}

async function resolveBestPdfAttachmentFacts(
  item: LibraryArtifactItem,
  attachments: LibraryArtifactAttachmentFacts[],
  options: LibraryArtifactReadOptions,
) {
  checkArtifactRead(options);
  const best = await runArtifactNative(options, () =>
    item.getBestAttachment?.(),
  );
  checkArtifactRead(options);
  if (
    best &&
    (await runArtifactNative(options, () =>
      isPdfAttachment(best as LibraryArtifactItem),
    ))
  ) {
    const bestId = Number((best as LibraryArtifactItem).id);
    const detached = attachments.find((attachment) => attachment.id === bestId);
    if (detached) return detached;
    return detachArtifactAttachment(best as LibraryArtifactItem, options);
  }
  return attachments.find((attachment) => attachment.isPdf) || null;
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
  options: LibraryArtifactReadOptions = {},
): Promise<WorkflowGeneratedNoteReadinessResult> {
  const childNotes = (await resolveArtifactChildren(parentItem, options)).notes;
  return evaluateGeneratedNoteFactsReadiness(childNotes, spec, options);
}

export async function evaluateGeneratedNoteFactsReadiness(
  childNotes: ReadonlyArray<LibraryArtifactGeneratedNoteFacts>,
  spec: WorkflowGeneratedNoteReadinessFilter,
  options: LibraryArtifactReadOptions = {},
): Promise<WorkflowGeneratedNoteReadinessResult> {
  const notes: Array<{
    item: LibraryArtifactGeneratedNoteFacts;
    kind: string;
  }> = [];
  for (const note of childNotes) {
    notes.push({
      item: note,
      kind: await resolveGeneratedNoteKind(note, options),
    });
  }

  const artifacts: WorkflowGeneratedNoteReadinessResult["artifacts"] = {};
  for (const artifactSpec of spec.artifacts) {
    artifacts[artifactSpec.id] = await evaluateGeneratedNoteArtifact(
      notes,
      artifactSpec,
      options,
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
  notes: Array<{ item: LibraryArtifactGeneratedNoteFacts; kind: string }>,
  spec: WorkflowGeneratedNoteArtifactSpec,
  options: LibraryArtifactReadOptions,
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
        candidate.item.payloadBlocks,
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

async function resolveGeneratedNoteArtifacts(
  notes: LibraryArtifactNoteFacts[],
  options: LibraryArtifactReadOptions,
) {
  const artifacts = new Set<LibraryArtifactKind>();
  let score: LiteratureScoreSummary | null = null;
  let scoreStatus: "available" | "missing" | "invalid" = "missing";
  for (const note of notes) {
    checkArtifactRead(options);
    const noteKind = await resolveGeneratedNoteKind(note, options);
    if (noteKind === "digest") {
      artifacts.add("digest");
    } else if (noteKind === "references") {
      artifacts.add("references");
    } else if (noteKind === "citation-analysis") {
      artifacts.add("citation-analysis");
    } else if (noteKind === "literature-score") {
      const resolved = await resolveLiteratureScoreForNote(note, options);
      if (resolved) {
        artifacts.add("literature-score");
        score = resolved;
        scoreStatus = "available";
      } else if (scoreStatus !== "available") {
        scoreStatus = "invalid";
      }
    }
  }
  return { artifacts, score, scoreStatus };
}

export async function summarizeLibraryGeneratedArtifacts(
  notes: ReadonlyArray<LibraryArtifactGeneratedNoteFacts>,
  options: LibraryArtifactReadOptions = {},
) {
  const normalized = notes.map((note, index) => ({
    id: Number(note.id) || index + 1,
    key: String(note.key || ""),
    title: String(note.title || ""),
    html: String(note.html || ""),
    updatedAt: String(note.updatedAt || ""),
    payloadBlocks: note.payloadBlocks,
  }));
  return resolveGeneratedNoteArtifacts(normalized, options);
}

async function resolveLiteratureScoreForNote(
  note: LibraryArtifactGeneratedNoteFacts,
  options: LibraryArtifactReadOptions = {},
) {
  checkArtifactRead(options);
  const block = selectPreferredNotePayloadBlock(
    note.payloadBlocks,
    LITERATURE_SCORE_PAYLOAD_TYPE,
  );
  if (!block || block.errors?.length) {
    return null;
  }
  return parseLiteratureScore(block.payload);
}

async function resolveGeneratedNoteKind(
  note: LibraryArtifactGeneratedNoteFacts,
  options: LibraryArtifactReadOptions = {},
) {
  checkArtifactRead(options);
  const noteHtml = note.html;
  const markerKind = normalizeGeneratedNoteKindFromMarkers(noteHtml);
  if (markerKind) {
    return markerKind;
  }
  const headingKind = resolveGeneratedSchemaHeadingKind(noteHtml);
  if (!headingKind) {
    return "";
  }
  if (headingKind === "literature-score") {
    return (await resolveLiteratureScoreForNote(note, options))
      ? "literature-score"
      : "";
  }
  return resolveGeneratedNoteKindFromEmbeddedPayload(
    note,
    headingKind,
    options,
  );
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
  note: LibraryArtifactGeneratedNoteFacts,
  expectedKind: "digest" | "references" | "citation-analysis",
  options: LibraryArtifactReadOptions = {},
) {
  checkArtifactRead(options);
  for (const payloadType of PAYLOAD_TYPES_BY_NOTE_KIND[expectedKind]) {
    const block = selectPreferredNotePayloadBlock(
      note.payloadBlocks,
      payloadType,
    );
    if (block && !block.errors?.length) {
      return expectedKind;
    }
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

function resolveMarkdownAttachmentStems(
  attachments: LibraryArtifactAttachmentFacts[],
) {
  const stems = new Set<string>();
  for (const attachment of attachments) {
    if (!attachment.isMarkdown) {
      continue;
    }
    const stem = resolveStem(attachment.filename);
    if (stem) {
      stems.add(stem);
    }
  }
  return stems;
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

async function resolveAttachmentFilename(
  item: LibraryArtifactItem,
  options: LibraryArtifactReadOptions = {},
) {
  const syncFilename = await runArtifactNative(options, () =>
    resolveAttachmentFilenameSync(item),
  );
  if (syncFilename) {
    return syncFilename;
  }
  try {
    const filePath = await runArtifactNative(options, () =>
      item.getFilePathAsync?.(),
    );
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
