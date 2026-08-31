import { portableItemRef, requireHostApi } from "./runtime.mjs";
import { resolveDigestMarkdownForParent } from "./digestPayload.mjs";

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
    typeof synthesis.tags?.exportVocabularyForRegulator !== "function"
  ) {
    throw new Error("tag-regulator synthesis vocabulary export is unavailable");
  }
  try {
    const exported = await synthesis.tags.exportVocabularyForRegulator();
    return normalizeVocabularyTags(exported?.allowedTags || []);
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

function resolveWorkflowInputMaterializer(runtime) {
  const materialize =
    requireHostApi(runtime).file?.materializeWorkflowInputFile;
  if (typeof materialize !== "function") {
    throw new Error("hostApi.file.materializeWorkflowInputFile is required");
  }
  return materialize;
}

export async function materializeValidTagsYaml(
  tags,
  parentId,
  runtime,
) {
  const result = await resolveWorkflowInputMaterializer(runtime)({
    key: "valid_tags",
    fileName: `valid_tags-parent-${String(parentId || "unknown")}.yaml`,
    content: { kind: "text", text: renderYamlTagList(tags) },
  });
  const filePath = String(result?.path || "").trim();
  if (!filePath) {
    throw new Error(
      "hostApi.file.materializeWorkflowInputFile returned empty path",
    );
  }
  return toNativePath(filePath);
}

export function buildValidTagsUploadRelativePath() {
  return "inputs/valid_tags/valid_tags.yaml";
}

export async function materializeDigestMarkdown(
  markdown,
  parentId,
  runtime,
) {
  const content = String(markdown || "");
  if (!content.trim()) {
    return null;
  }
  const result = await resolveWorkflowInputMaterializer(runtime)({
    key: "digest_markdown",
    fileName: `digest-markdown-parent-${String(parentId || "unknown")}.md`,
    content: { kind: "text", text: content },
  });
  const filePath = String(result?.path || "").trim();
  if (!filePath) {
    throw new Error(
      "hostApi.file.materializeWorkflowInputFile returned empty path",
    );
  }
  return toNativePath(filePath);
}

export function buildDigestMarkdownUploadRelativePath() {
  return "inputs/digest_markdown/digest.md";
}

export function resolveParentItemFromSelection(selectionContext, runtime) {
  void runtime;
  const parent = selectionContext?.items?.parents?.[0]?.item ||
    selectionContext?.items?.attachments?.[0]?.parent ||
    selectionContext?.items?.notes?.[0]?.parent;
  if (parent) return parent;
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
    : Array.isArray(item.creators)
      ? item.creators
      : [];
  const creatorNames = creators
    .map((entry) => normalizeCreatorName(entry))
    .filter(Boolean);
  return {
    id: item.id,
    key: item.key,
    itemType: String(item.itemType || "").trim(),
    libraryID: item.libraryID,
    title: String(item.getField?.("title") || item.fields?.title || item.title || "").trim(),
    abstract: String(item.getField?.("abstractNote") || item.fields?.abstractNote || "").trim(),
    publication_title: String(item.getField?.("publicationTitle") || item.fields?.publicationTitle || item.publicationTitle || "").trim(),
    conference_name: String(item.getField?.("conferenceName") || item.fields?.conferenceName || "").trim(),
    university: String(item.getField?.("university") || item.fields?.university || "").trim(),
    date: String(item.getField?.("date") || item.fields?.date || item.date || "").trim(),
    creators: creatorNames,
  };
}

export function collectInputTagsFromParent(item) {
  const tags = Array.isArray(item.getTags?.())
    ? item.getTags()
    : Array.isArray(item.tags)
      ? item.tags
      : [];
  const seen = new Set();
  const normalized = [];
  for (const entry of tags) {
    const text = String(typeof entry === "string" ? entry : entry?.tag || "").trim();
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
  const selectedParent = args.parentItem || resolveParentItemFromSelection(
    args.selectionContext,
    args.runtime,
  );
  const detail = await requireHostApi(args.runtime).library.getItemDetail(
    portableItemRef(selectedParent),
  );
  if (detail?.kind !== "regular") {
    throw new Error("tag-regulator requires one regular parent item");
  }
  const parentItem = {
    ...detail.item,
    key: detail.item.ref.key,
    libraryID: detail.item.ref.libraryId,
  };
  const metadata = collectMetadataFromParent(parentItem);
  const inputTags = collectInputTagsFromParent(parentItem);
  const controlledTags = await loadSynthesisVocabularyTagsOrThrow(args.runtime);
  const validTagsPath =
    controlledTags.length > 0
      ? await materializeValidTagsYaml(
          controlledTags,
          parentItem.ref.key,
          args.runtime,
          args.workflowId || "tag-regulator",
        )
      : "";
  const input = {
    metadata,
    input_tags: inputTags,
  };
  if (validTagsPath) {
    input.valid_tags = args.useAbsoluteValidTagsPath
      ? validTagsPath
      : buildValidTagsUploadRelativePath();
  }
  return {
    parentItem,
    input,
    validTagsPath,
  };
}

export async function buildTagRegulatorStandaloneRequest(args) {
  const { parentItem, input, validTagsPath } =
    await buildTagRegulatorInputFromParent({
      selectionContext: args.selectionContext,
      runtime: args.runtime,
      useAbsoluteValidTagsPath: false,
      workflowId: args?.manifest?.id || "tag-regulator",
    });
  const uploadFiles = validTagsPath
    ? [
        {
          key: "valid_tags",
          path: validTagsPath,
        },
      ]
    : [];
  const digestMarkdown = await resolveDigestMarkdownForParent(
    parentItem,
    args.runtime,
  );
  const digestMarkdownPath = await materializeDigestMarkdown(
    digestMarkdown,
    parentItem.ref.key,
    args.runtime,
    args?.manifest?.id || "tag-regulator",
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
    mode: "auto",
    targetParentID: parentItem.id,
    input,
    parameter: resolveRequestParameters(args.executionOptions),
    ...(uploadFiles.length > 0 ? { upload_files: uploadFiles } : {}),
    fetch_type: "result",
  };
}

export const __tagRegulatorRequestTestOnly = {
  normalizePath,
  normalizeVocabularyTags,
  loadSynthesisVocabularyTagsOrThrow,
};
