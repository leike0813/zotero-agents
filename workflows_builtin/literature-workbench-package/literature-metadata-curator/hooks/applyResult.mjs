import {
  METADATA_CURATION_KIND,
  isObject,
  normalizeCreators,
  normalizeMetadataFields,
  resolveCanonicalResult,
} from "../../lib/metadataCurator.mjs";
import { withPackageRuntimeScope } from "../../lib/runtime.mjs";

const BLOCKED_FIELD_KEYS = new Set([
  "itemType",
  "attachments",
  "notes",
  "tags",
  "collections",
  "seeAlso",
  "relatedItems",
]);

function normalizeApplyPayload(output) {
  if (!isObject(output) || output.kind !== METADATA_CURATION_KIND) {
    return {
      ok: false,
      reason: "metadata curator output malformed: missing canonical result",
      fields: {},
      creators: [],
      warnings: [],
    };
  }
  const metadata = isObject(output.metadata) ? output.metadata : {};
  const rawFields = isObject(metadata.fields) ? metadata.fields : metadata;
  const fields = normalizeMetadataFields(rawFields);
  for (const key of BLOCKED_FIELD_KEYS) {
    delete fields[key];
  }
  const creators = normalizeCreators(metadata.creators);
  return {
    ok: Object.keys(fields).length > 0 || creators.length > 0,
    reason: "metadata curator output contains no applicable metadata",
    fields,
    creators,
    warnings: Array.isArray(output.warnings) ? output.warnings : [],
  };
}

async function applyResultImpl({ parent, resultContext, runResult, runtime }) {
  const output = resolveCanonicalResult({ resultContext, runResult });
  const normalized = normalizeApplyPayload(output);
  if (!normalized.ok) {
    return {
      applied: false,
      skipped: true,
      reason: normalized.reason,
      warnings: normalized.warnings,
    };
  }
  if (!runtime?.handlers?.parent?.updateMetadata) {
    throw new Error("handlers.parent.updateMetadata is unavailable");
  }
  const updated = await runtime.handlers.parent.updateMetadata(parent, {
    fields: normalized.fields,
    creators: normalized.creators,
  });
  return {
    applied: true,
    skipped: false,
    item: {
      id: updated?.id || null,
      key: updated?.key || "",
      libraryID: updated?.libraryID || null,
    },
    fieldCount: Object.keys(normalized.fields).length,
    creatorCount: normalized.creators.length,
    warnings: normalized.warnings,
  };
}

export async function applyResult(args) {
  return withPackageRuntimeScope(args?.runtime, () => applyResultImpl(args || {}));
}

export const __metadataCuratorApplyResultTestOnly = {
  normalizeApplyPayload,
  applyResultImpl,
};
