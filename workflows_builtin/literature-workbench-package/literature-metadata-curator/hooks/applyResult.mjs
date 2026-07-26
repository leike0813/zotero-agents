import {
  METADATA_CURATION_KIND,
  isObject,
  normalizeCreators,
  normalizeMetadataFields,
  normalizeString,
  protectOriginalScriptMetadata,
  resolveCanonicalResult,
} from "../../lib/metadataCurator.mjs";
import { requireHostApi, withPackageRuntimeScope } from "../../lib/runtime.mjs";

const BLOCKED_FIELD_KEYS = new Set([
  "itemType",
  "attachments",
  "notes",
  "tags",
  "collections",
  "seeAlso",
  "relatedItems",
]);

function normalizeApplyPayload(output, parent) {
  if (!isObject(output) || output.kind !== METADATA_CURATION_KIND) {
    return {
      ok: false,
      reason: "metadata curator output malformed: missing canonical result",
      fields: {},
      creators: [],
      warnings: [],
    };
  }
  const status = normalizeString(output.status);
  if (status !== "succeeded" && status !== "verified_no_change") {
    return {
      ok: false,
      status,
      reason: `metadata curator output status is ${status || "missing"}`,
      fields: {},
      creators: [],
      warnings: Array.isArray(output.warnings) ? output.warnings : [],
    };
  }
  if (status === "verified_no_change") {
    return {
      ok: true,
      status,
      verifiedNoChange: true,
      itemType: "",
      fields: {},
      creators: [],
      warnings: Array.isArray(output.warnings) ? output.warnings : [],
    };
  }
  const metadata = isObject(output.metadata) ? output.metadata : {};
  const rawFields = isObject(metadata.fields) ? metadata.fields : metadata;
  const fields = normalizeMetadataFields(rawFields);
  for (const key of BLOCKED_FIELD_KEYS) {
    delete fields[key];
  }
  const protectedResult = protectOriginalScriptMetadata({
    parent,
    metadata: { ...metadata, fields },
    warnings: output.warnings,
  });
  const protectedFields = normalizeMetadataFields(protectedResult.metadata.fields);
  const creatorCompleteness = normalizeString(
    protectedResult.metadata.creatorCompleteness,
  );
  const candidateCreators = normalizeCreators(protectedResult.metadata.creators);
  const creators =
    creatorCompleteness && creatorCompleteness !== "complete"
      ? []
      : candidateCreators;
  if (
    candidateCreators.length > 0 &&
    creatorCompleteness &&
    creatorCompleteness !== "complete" &&
    !protectedResult.warnings.some(
      (entry) => entry?.code === "incomplete_creator_list_not_applied",
    )
  ) {
    protectedResult.warnings.push({
      code: "incomplete_creator_list_not_applied",
      message: "The candidate creator list is not verified complete.",
    });
  }
  const itemType = normalizeString(metadata.itemType);
  return {
    ok:
      !!itemType || Object.keys(protectedFields).length > 0 || creators.length > 0,
    status,
    reason: "metadata curator output contains no applicable metadata",
    itemType,
    fields: protectedFields,
    creators,
    warnings: protectedResult.warnings,
  };
}

async function removeCurationTag(runtime, parent) {
  const transition = requireHostApi(runtime)?.statusTags?.transition;
  if (typeof transition !== "function") {
    throw new Error("statusTags.transition is unavailable");
  }
  const itemRef = Number(parent?.id || 0) || parent;
  return transition({
    item: itemRef,
    remove: ["need-metadata-curation"],
  });
}

async function cleanupResult(runtime, parent) {
  try {
    const transition = await removeCurationTag(runtime, parent);
    const cleanupWarnings = (transition?.warnings || []).map((warning) => ({
      code: "metadata_curation_tag_cleanup_failed",
      ...warning,
    }));
    return {
      curationTagRemoved: cleanupWarnings.length === 0,
      partial: cleanupWarnings.length > 0,
      cleanupWarnings,
      statusTransition: transition,
    };
  } catch (error) {
    return {
      curationTagRemoved: false,
      partial: true,
      cleanupWarnings: [
        {
          code: "metadata_curation_tag_cleanup_failed",
          message: error instanceof Error ? error.message : String(error),
        },
      ],
    };
  }
}

async function applyResultImpl({ parent, resultContext, runResult, runtime }) {
  const output = resolveCanonicalResult({ resultContext, runResult });
  const normalized = normalizeApplyPayload(output, parent);
  if (!normalized.ok) {
    return {
      applied: false,
      skipped: true,
      reason: normalized.reason,
      warnings: normalized.warnings,
    };
  }
  if (normalized.verifiedNoChange) {
    const cleanup = await cleanupResult(runtime, parent);
    return {
      applied: false,
      skipped: false,
      verifiedNoChange: true,
      warnings: normalized.warnings,
      ...cleanup,
    };
  }
  if (!runtime?.handlers?.parent?.updateMetadata) {
    throw new Error("handlers.parent.updateMetadata is unavailable");
  }
  const originalItemType = normalizeString(parent?.itemType);
  const updated = await runtime.handlers.parent.updateMetadata(parent, {
    itemType: normalized.itemType,
    fields: normalized.fields,
    creators: normalized.creators,
  });
  const cleanup = await cleanupResult(runtime, parent);
  return {
    applied: true,
    skipped: false,
    item: {
      id: updated?.id || null,
      key: updated?.key || "",
      libraryID: updated?.libraryID || null,
    },
    itemTypeChanged:
      !!normalized.itemType &&
      originalItemType !== normalizeString(updated?.itemType) &&
      normalizeString(updated?.itemType) === normalized.itemType,
    fieldCount: Object.keys(normalized.fields).length,
    creatorCount: normalized.creators.length,
    warnings: normalized.warnings,
    ...cleanup,
  };
}

export async function applyResult(args) {
  return withPackageRuntimeScope(args?.runtime, () => applyResultImpl(args || {}));
}

export const __metadataCuratorApplyResultTestOnly = {
  normalizeApplyPayload,
  applyResultImpl,
};
