import { requireHostApi, withPackageRuntimeScope } from "../../lib/runtime.mjs";

const DEFAULT_TAG_NOTE_LANGUAGE = "zh-CN";

function asString(value) {
  return String(value || "").trim();
}

function resolveTagNoteLanguage(executionOptions) {
  const workflowParams = executionOptions?.workflowParams || {};
  return (
    asString(workflowParams.tag_note_language || workflowParams.language) ||
    DEFAULT_TAG_NOTE_LANGUAGE
  );
}

async function loadTagVocabulary(runtime) {
  const synthesis = requireHostApi(runtime)?.synthesis;
  if (!synthesis || typeof synthesis.loadTagVocabulary !== "function") {
    throw new Error("tag-bootstrapper synthesis vocabulary API is unavailable");
  }
  return synthesis.loadTagVocabulary();
}

function normalizeEntries(entries) {
  return (Array.isArray(entries) ? entries : [])
    .map((entry) => {
      if (typeof entry === "string") {
        const tag = asString(entry);
        return tag ? { tag, facet: tag.split(":")[0] || "" } : null;
      }
      if (!entry || typeof entry !== "object") {
        return null;
      }
      const tag = asString(entry.tag);
      if (!tag || entry.deprecated === true) {
        return null;
      }
      return {
        tag,
        facet: asString(entry.facet) || tag.split(":")[0] || "",
        note: asString(entry.note) || undefined,
      };
    })
    .filter(Boolean)
    .sort((left, right) =>
      left.tag.localeCompare(right.tag, "en", { sensitivity: "base" }),
    );
}

async function buildRequestImpl(args) {
  const snapshot = await loadTagVocabulary(args.runtime);
  return {
    kind: "skillrunner.job.v1",
    skill_id: "tag-bootstrapper",
    mode: "interactive",
    input: {
      existing_tags: normalizeEntries(snapshot?.entries),
      protocol: {
        facets: Array.isArray(snapshot?.protocol?.facets)
          ? snapshot.protocol.facets
          : [],
        tag_pattern: asString(snapshot?.protocol?.tag_pattern),
        max_tag_length: Number(snapshot?.protocol?.max_tag_length || 0) || 120,
      },
    },
    parameter: {
      tag_note_language: resolveTagNoteLanguage(args.executionOptions),
    },
    fetch_type: "result",
  };
}

export async function buildRequest(args) {
  return withPackageRuntimeScope(args?.runtime, () => buildRequestImpl(args));
}

export const __tagBootstrapperBuildRequestTestOnly = {
  buildRequestImpl,
  normalizeEntries,
  resolveTagNoteLanguage,
};
