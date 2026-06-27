import {
  appendSkillDiagnosticsToResult,
  collectSkillOutputDiagnostics,
} from "../../lib/resultOutput.mjs";
import { requireHostApi, withPackageRuntimeScope } from "../../lib/runtime.mjs";

const SOURCE = "tag-bootstrapper";

function isObject(value) {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function asString(value) {
  return String(value || "").trim();
}

function facetFromTag(tag) {
  return tag.includes(":") ? tag.split(":")[0] : "";
}

function resolveTagBootstrapperOutput(args) {
  const runResult = args?.runResult;
  const candidates = [
    args?.resultContext?.resultJson?.data?.data,
    args?.resultContext?.resultJson?.data,
    args?.resultContext?.resultJson,
    runResult?.resultJson?.data?.data,
    runResult?.resultJson?.data,
    runResult?.resultJson,
  ];
  for (const candidate of candidates) {
    if (!isObject(candidate)) {
      continue;
    }
    if (
      Object.prototype.hasOwnProperty.call(candidate, "add_tags") ||
      (Object.prototype.hasOwnProperty.call(candidate, "error") &&
        candidate.error !== null)
    ) {
      return candidate;
    }
  }
  return null;
}

function normalizeAddTagEntries(value) {
  if (!Array.isArray(value)) {
    return {
      ok: false,
      reason: "add_tags must be an array",
      entries: [],
    };
  }
  const byLower = new Map();
  for (let index = 0; index < value.length; index++) {
    const raw = value[index];
    if (!isObject(raw)) {
      return {
        ok: false,
        reason: `add_tags[${index}] must be an object`,
        entries: [],
      };
    }
    const tag = asString(raw.tag);
    if (!tag) {
      return {
        ok: false,
        reason: `add_tags[${index}] missing tag`,
        entries: [],
      };
    }
    const lowered = tag.toLowerCase();
    if (byLower.has(lowered)) {
      continue;
    }
    byLower.set(lowered, {
      tag,
      facet: asString(raw.facet) || facetFromTag(tag),
      note: asString(raw.note) || undefined,
      source: asString(raw.source) || SOURCE,
      deprecated: false,
    });
  }
  return {
    ok: true,
    reason: "",
    entries: Array.from(byLower.values()).sort((left, right) =>
      left.tag.localeCompare(right.tag, "en", { sensitivity: "base" }),
    ),
  };
}

function resolveSynthesisVocabularyApi(runtime) {
  const synthesis = requireHostApi(runtime)?.synthesis;
  if (!synthesis || typeof synthesis.loadTagVocabulary !== "function") {
    throw new Error(
      "tag-bootstrapper synthesis vocabulary load API is unavailable",
    );
  }
  if (typeof synthesis.saveTagVocabulary !== "function") {
    throw new Error(
      "tag-bootstrapper synthesis vocabulary save API is unavailable",
    );
  }
  return synthesis;
}

async function loadStagedTagSuggestions(synthesis) {
  if (typeof synthesis?.listStagedTagSuggestions !== "function") {
    return [];
  }
  return synthesis.listStagedTagSuggestions();
}

async function applyResultImpl({ resultContext, runResult, runtime }) {
  const output = resolveTagBootstrapperOutput({ resultContext, runResult });
  if (!output) {
    return {
      applied: false,
      skipped: true,
      reason: "tag-bootstrapper output malformed: missing result payload",
      added: [],
      skipped_existing: [],
      skipped_staged: [],
      warnings: [],
    };
  }
  const skillOutputDiagnostics = collectSkillOutputDiagnostics(output);
  const normalized = normalizeAddTagEntries(output.add_tags);
  if (!normalized.ok) {
    throw new Error(`tag-bootstrapper output malformed: ${normalized.reason}`);
  }
  const synthesis = resolveSynthesisVocabularyApi(runtime);
  const current = await synthesis.loadTagVocabulary();
  const staged = await loadStagedTagSuggestions(synthesis);
  const existingLower = new Set(
    (Array.isArray(current?.entries) ? current.entries : []).map((entry) =>
      asString(entry?.tag).toLowerCase(),
    ),
  );
  const stagedLower = new Set(
    (Array.isArray(staged) ? staged : []).map((entry) =>
      asString(entry?.tag).toLowerCase(),
    ),
  );
  const additions = [];
  const skippedExisting = [];
  const skippedStaged = [];
  for (const entry of normalized.entries) {
    const lowered = entry.tag.toLowerCase();
    if (existingLower.has(lowered)) {
      skippedExisting.push(entry.tag);
      continue;
    }
    if (stagedLower.has(lowered)) {
      skippedStaged.push(entry.tag);
      continue;
    }
    additions.push(entry);
    existingLower.add(lowered);
  }
  if (additions.length) {
    await synthesis.saveTagVocabulary({
      entries: [
        ...(Array.isArray(current?.entries) ? current.entries : []),
        ...additions,
      ],
      aliases: current?.aliases || {},
      abbrev: current?.abbrev || {},
      protocol: current?.protocol,
      transactionId: `tag-bootstrapper-${Date.now()}`,
    });
  }
  return appendSkillDiagnosticsToResult(
    {
      applied: additions.length > 0,
      skipped: additions.length === 0,
      added: additions.map((entry) => entry.tag),
      skipped_existing: skippedExisting,
      skipped_staged: skippedStaged,
    },
    skillOutputDiagnostics,
  );
}

export async function applyResult(args) {
  return withPackageRuntimeScope(args?.runtime, () =>
    applyResultImpl(args || {}),
  );
}

export const __tagBootstrapperApplyResultTestOnly = {
  applyResultImpl,
  normalizeAddTagEntries,
  resolveTagBootstrapperOutput,
};
