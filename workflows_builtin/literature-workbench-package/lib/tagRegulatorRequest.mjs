import { requireHostApi } from "./runtime.mjs";
import { resolveDigestMarkdownForParent } from "./digestPayload.mjs";

const dynamicImport = new Function("specifier", "return import(specifier)");

export const DEFAULT_TAG_NOTE_LANGUAGE = "zh-CN";

export function normalizePath(value) {
  return String(value || "")
    .replace(/[\\/]+/g, "/")
    .trim();
}

export function toNativePath(value) {
  const text = String(value || "").trim();
  if (!text) {
    return "";
  }
  if (/^[A-Za-z]:\//.test(text)) {
    return text.replace(/\//g, "\\");
  }
  return text;
}

export function joinPath(...segments) {
  const clean = segments
    .map((entry) => String(entry || ""))
    .filter(Boolean)
    .flatMap((entry) => entry.split(/[\\/]+/))
    .filter(Boolean);
  if (clean.length === 0) {
    return "";
  }
  const first = String(segments[0] || "");
  const hasDrive = /^[A-Za-z]:/.test(first);
  const isPosixAbs = first.startsWith("/");
  const separator = hasDrive || first.includes("\\") ? "\\" : "/";
  if (hasDrive) {
    const drive = first.slice(0, 2);
    const withoutDrive =
      clean.length > 0 && clean[0].toLowerCase() === drive.toLowerCase()
        ? clean.slice(1)
        : clean;
    return toNativePath(`${drive}${separator}${withoutDrive.join(separator)}`);
  }
  const body = clean.join(separator);
  if (isPosixAbs) {
    return `${separator}${body}`;
  }
  return toNativePath(body);
}

function resolveIOUtils() {
  const runtime = globalThis;
  const io = runtime.IOUtils;
  if (!io || typeof io !== "object") {
    return null;
  }
  return io;
}

async function ensureDirectory(targetPath) {
  const nativePath = toNativePath(targetPath);
  const io = resolveIOUtils();
  if (io?.makeDirectory) {
    await io.makeDirectory(nativePath, { createAncestors: true });
    return;
  }
  const fs = await dynamicImport("fs/promises");
  await fs.mkdir(nativePath, { recursive: true });
}

async function writeText(targetPath, content) {
  const nativePath = toNativePath(targetPath);
  const dirPath = nativePath.replace(/[\\/][^\\/]+$/, "");
  if (dirPath) {
    await ensureDirectory(dirPath);
  }
  const io = resolveIOUtils();
  if (io?.writeUTF8) {
    await io.writeUTF8(nativePath, String(content || ""));
    return;
  }
  const fs = await dynamicImport("fs/promises");
  await fs.writeFile(nativePath, String(content || ""), "utf8");
}

export function normalizeVocabularyTags(entries) {
  const normalized = [];
  const seen = new Set();
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    if (typeof entry === "string") {
      const tag = entry.trim();
      if (!tag) {
        throw new Error(`tag-regulator vocabulary entry[${i}] is empty`);
      }
      if (!seen.has(tag)) {
        seen.add(tag);
        normalized.push(tag);
      }
      continue;
    }
    if (!entry || typeof entry !== "object") {
      throw new Error(`tag-regulator vocabulary entry[${i}] is invalid object`);
    }
    const tag = String(entry.tag || "").trim();
    if (!tag) {
      throw new Error(
        `tag-regulator vocabulary entry[${i}] missing field 'tag'`,
      );
    }
    if (Boolean(entry.deprecated)) {
      continue;
    }
    if (!seen.has(tag)) {
      seen.add(tag);
      normalized.push(tag);
    }
  }
  return normalized.sort((left, right) =>
    left.localeCompare(right, "en", { sensitivity: "base" }),
  );
}

export async function loadSynthesisVocabularyTagsOrThrow(runtime) {
  const synthesis = requireHostApi(runtime)?.synthesis;
  if (
    !synthesis ||
    typeof synthesis.exportTagVocabularyForRegulator !== "function"
  ) {
    throw new Error("tag-regulator synthesis vocabulary export is unavailable");
  }
  try {
    const exported = await synthesis.exportTagVocabularyForRegulator();
    let tags = [];
    if (Array.isArray(exported)) {
      tags = normalizeVocabularyTags(exported);
    } else if (exported && typeof exported === "object") {
      tags = normalizeVocabularyTags(exported.entries || exported.tags || []);
    }
    if (tags.length === 0) {
      throw new Error("tag-regulator synthesis vocabulary missing usable tags");
    }
    return tags;
  } catch (error) {
    throw new Error(
      `tag-regulator synthesis vocabulary export failed: ${String(
        error?.message || error,
      )}`,
    );
  }
}

function renderYamlTagList(tags) {
  return `${tags.map((tag) => `- ${tag}`).join("\n")}\n`;
}

async function resolveTempDirectoryPath(runtime) {
  const tempPath = requireHostApi(runtime).file?.getTempDirectoryPath?.();
  if (typeof tempPath === "string" && tempPath.trim()) {
    return joinPath(tempPath, "zotero-skills", "tag-regulator");
  }
  const os = await dynamicImport("os");
  return joinPath(os.tmpdir(), "zotero-skills", "tag-regulator");
}

export async function materializeValidTagsYaml(tags, parentId, runtime) {
  const tempDir = await resolveTempDirectoryPath(runtime);
  await ensureDirectory(tempDir);
  const nonce = Math.random().toString(36).slice(2, 10);
  const fileName = `valid_tags-parent-${String(parentId || "unknown")}-${Date.now()}-${nonce}.yaml`;
  const filePath = joinPath(tempDir, fileName);
  await writeText(filePath, renderYamlTagList(tags));
  try {
    requireHostApi(runtime).logging?.recordLeakProbeTempArtifactForTests?.({
      kind: "tag-regulator-valid-tags-yaml",
      path: toNativePath(filePath),
    });
  } catch {
    // keep probe registration best-effort
  }
  return toNativePath(filePath);
}

export function buildValidTagsUploadRelativePath() {
  return "inputs/valid_tags/valid_tags.yaml";
}

export async function materializeDigestMarkdown(markdown, parentId, runtime) {
  const content = String(markdown || "");
  if (!content.trim()) {
    return null;
  }
  const tempDir = await resolveTempDirectoryPath(runtime);
  await ensureDirectory(tempDir);
  const nonce = Math.random().toString(36).slice(2, 10);
  const fileName =
    [
      "digest-markdown-parent",
      String(parentId || "unknown"),
      String(Date.now()),
      nonce,
    ].join("-") + ".md";
  const filePath = joinPath(tempDir, fileName);
  await writeText(filePath, content);
  return toNativePath(filePath);
}

export function buildDigestMarkdownUploadRelativePath() {
  return "inputs/digest_markdown/digest.md";
}

export function resolveParentItemFromSelection(selectionContext, runtime) {
  const parentFromSelection = Number(
    selectionContext?.items?.parents?.[0]?.item?.id || 0,
  );
  if (Number.isFinite(parentFromSelection) && parentFromSelection > 0) {
    return runtime.helpers.resolveItemRef(parentFromSelection);
  }
  const parentFromAttachment = Number(
    selectionContext?.items?.attachments?.[0]?.parent?.id || 0,
  );
  if (Number.isFinite(parentFromAttachment) && parentFromAttachment > 0) {
    return runtime.helpers.resolveItemRef(parentFromAttachment);
  }
  const parentFromNote = Number(
    selectionContext?.items?.notes?.[0]?.parent?.id || 0,
  );
  if (Number.isFinite(parentFromNote) && parentFromNote > 0) {
    return runtime.helpers.resolveItemRef(parentFromNote);
  }
  throw new Error("tag-regulator buildRequest cannot resolve parent item");
}

function normalizeCreatorName(entry) {
  const raw = entry && typeof entry === "object" ? entry : {};
  const first = String(raw.firstName || "").trim();
  const last = String(raw.lastName || "").trim();
  const name = String(raw.name || "").trim();
  if (name) {
    return name;
  }
  return [first, last].filter(Boolean).join(" ").trim();
}

export function collectMetadataFromParent(item) {
  const creators = Array.isArray(item.getCreators?.())
    ? item.getCreators()
    : [];
  const creatorNames = creators
    .map((entry) => normalizeCreatorName(entry))
    .filter(Boolean);
  return {
    id: item.id,
    key: item.key,
    itemType: String(item.itemType || "").trim(),
    libraryID: item.libraryID,
    title: String(item.getField?.("title") || "").trim(),
    abstract: String(item.getField?.("abstractNote") || "").trim(),
    publication_title: String(item.getField?.("publicationTitle") || "").trim(),
    conference_name: String(item.getField?.("conferenceName") || "").trim(),
    university: String(item.getField?.("university") || "").trim(),
    date: String(item.getField?.("date") || "").trim(),
    creators: creatorNames,
  };
}

export function collectInputTagsFromParent(item) {
  const tags = Array.isArray(item.getTags?.()) ? item.getTags() : [];
  const seen = new Set();
  const normalized = [];
  for (const entry of tags) {
    const text = String(entry?.tag || "").trim();
    if (!text || seen.has(text)) {
      continue;
    }
    seen.add(text);
    normalized.push(text);
  }
  return normalized;
}

function parseBooleanLike(value, fallbackValue) {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number") {
    return value !== 0;
  }
  const lowered = String(value || "")
    .trim()
    .toLowerCase();
  if (lowered === "true" || lowered === "1" || lowered === "yes") {
    return true;
  }
  if (lowered === "false" || lowered === "0" || lowered === "no") {
    return false;
  }
  return fallbackValue;
}

export function resolveRequestParameters(executionOptions, options = {}) {
  const workflowParams = executionOptions?.workflowParams || {};
  const tagNoteLanguage = String(
    options.tagNoteLanguage ||
      workflowParams.tag_note_language ||
      workflowParams.language ||
      DEFAULT_TAG_NOTE_LANGUAGE,
  ).trim();
  return {
    infer_tag: parseBooleanLike(
      options.inferTag ?? workflowParams.infer_tag,
      true,
    ),
    valid_tags_format: "yaml",
    tag_note_language: tagNoteLanguage || DEFAULT_TAG_NOTE_LANGUAGE,
  };
}

export async function buildTagRegulatorInputFromParent(args) {
  const parentItem = args.parentItem || resolveParentItemFromSelection(
    args.selectionContext,
    args.runtime,
  );
  const metadata = collectMetadataFromParent(parentItem);
  const inputTags = collectInputTagsFromParent(parentItem);
  const controlledTags = await loadSynthesisVocabularyTagsOrThrow(args.runtime);
  const validTagsPath = await materializeValidTagsYaml(
    controlledTags,
    parentItem.id,
    args.runtime,
  );
  return {
    parentItem,
    input: {
      metadata,
      input_tags: inputTags,
      valid_tags: args.useAbsoluteValidTagsPath
        ? validTagsPath
        : buildValidTagsUploadRelativePath(),
    },
    validTagsPath,
  };
}

export async function buildTagRegulatorStandaloneRequest(args) {
  const { parentItem, input, validTagsPath } =
    await buildTagRegulatorInputFromParent({
      selectionContext: args.selectionContext,
      runtime: args.runtime,
      useAbsoluteValidTagsPath: false,
    });
  const uploadFiles = [
    {
      key: "valid_tags",
      path: validTagsPath,
    },
  ];
  const digestMarkdown = await resolveDigestMarkdownForParent(
    parentItem,
    args.runtime,
  );
  const digestMarkdownPath = await materializeDigestMarkdown(
    digestMarkdown,
    parentItem.id,
    args.runtime,
  );
  if (digestMarkdownPath) {
    input.digest_markdown = buildDigestMarkdownUploadRelativePath();
    uploadFiles.push({
      key: "digest_markdown",
      path: digestMarkdownPath,
    });
  }
  return {
    kind: "skillrunner.job.v1",
    skill_id: "tag-regulator",
    targetParentID: parentItem.id,
    input,
    parameter: resolveRequestParameters(args.executionOptions),
    upload_files: uploadFiles,
    fetch_type: "result",
  };
}

export const __tagRegulatorRequestTestOnly = {
  normalizePath,
  normalizeVocabularyTags,
  loadSynthesisVocabularyTagsOrThrow,
};
