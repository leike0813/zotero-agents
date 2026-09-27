import {
  METADATA_CURATION_KIND,
  isObject,
  normalizeCreators,
  normalizeMetadataFields,
  normalizeString,
  protectOriginalScriptMetadata,
  resolveCanonicalResult,
} from "../../lib/metadataCurator.mjs";
import {
  portableItemRef,
  requireHostApi,
  withPackageRuntimeScope,
} from "../../lib/runtime.mjs";
import { collectStatusTransitionDiagnostics } from "../../lib/statusTransition.mjs";

const BLOCKED_FIELD_KEYS = new Set([
  "itemType",
  "attachments",
  "notes",
  "tags",
  "collections",
  "seeAlso",
  "relatedItems",
]);

function portableRef(item) {
  return portableItemRef(item);
}

function operationId(member, ref) {
  return `metadata-curator:${member}:${ref.libraryId}:${ref.key}:${Date.now().toString(36)}`;
}

function confirmed(result) {
  if (result?.outcome === "committed" || result?.outcome === "unchanged") {
    return result.result;
  }
  const error = new Error(
    result?.attempt?.error?.message || "metadata mutation failed",
  );
  error.attempt = result?.attempt;
  throw error;
}

async function updateMetadata(host, itemRef, fields, creators) {
  const remaining = { ...fields };
  let attempt = 0;
  for (;;) {
    if (!Object.keys(remaining).length && !creators.length) {
      return { ref: itemRef };
    }
    const execution = await host.mutations.execute({
      operation: "item.updateMetadata",
      operationId: operationId(`update-${++attempt}`, itemRef),
      itemRef,
      patch: {
        fields: remaining,
        ...(creators.length ? { creators } : {}),
      },
    });
    if (
      execution?.outcome === "committed" ||
      execution?.outcome === "unchanged"
    ) {
      return execution.result.item;
    }
    const field = normalizeString(execution?.attempt?.error?.details?.field);
    const name = field.startsWith("patch.fields.")
      ? field.slice("patch.fields.".length)
      : "";
    if (
      execution?.attempt?.error?.code !== "invalid_request" ||
      !(name in remaining)
    ) {
      confirmed(execution);
    }
    delete remaining[name];
  }
}

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
  const protectedFields = normalizeMetadataFields(
    protectedResult.metadata.fields,
  );
  const creatorCompleteness = normalizeString(
    protectedResult.metadata.creatorCompleteness,
  );
  const candidateCreators = normalizeCreators(
    protectedResult.metadata.creators,
  );
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
      !!itemType ||
      Object.keys(protectedFields).length > 0 ||
      creators.length > 0,
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
  const itemRef = portableRef(parent);
  return transition({
    operationId: operationId("status", itemRef),
    itemRef,
    remove: ["need-metadata-curation"],
  });
}

async function cleanupResult(runtime, parent) {
  try {
    const transition = await removeCurationTag(runtime, parent);
    const cleanupWarnings = collectStatusTransitionDiagnostics(
      transition,
      "metadata_curation_tag_cleanup_failed",
    );
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
  const host = requireHostApi(runtime);
  const itemRef = portableRef(parent);
  const parentDetail = await host.library.getItemDetail(itemRef);
  if (parentDetail?.kind !== "regular") {
    throw new Error("metadata curator parent is unavailable");
  }
  const parentItem = parentDetail.item;
  const output = resolveCanonicalResult({ resultContext, runResult });
  const normalized = normalizeApplyPayload(output, parentItem);
  if (!normalized.ok) {
    return {
      applied: false,
      skipped: true,
      reason: normalized.reason,
      warnings: normalized.warnings,
    };
  }
  if (normalized.verifiedNoChange) {
    const cleanup = await cleanupResult(runtime, parentItem);
    return {
      applied: false,
      skipped: false,
      verifiedNoChange: true,
      warnings: normalized.warnings,
      ...cleanup,
    };
  }
  const originalItemType = normalizeString(parentItem?.itemType);
  let itemTypeChanged = false;
  if (normalized.itemType && normalized.itemType !== originalItemType) {
    try {
      await host.mutations.preview({
        operation: "item.changeType",
        itemRef,
        targetItemType: normalized.itemType,
        incompatibleData: "move_to_extra",
      });
      confirmed(
        await host.mutations.execute({
          operation: "item.changeType",
          operationId: operationId("change-type", itemRef),
          itemRef,
          targetItemType: normalized.itemType,
          incompatibleData: "move_to_extra",
        }),
      );
      itemTypeChanged = true;
    } catch (error) {
      if (error?.code !== "invalid_request") throw error;
    }
  }
  const updated = await updateMetadata(
    host,
    itemRef,
    normalized.fields,
    normalized.creators,
  );
  const cleanup = await cleanupResult(runtime, parentItem);
  return {
    applied: true,
    skipped: false,
    item: {
      ref: updated?.ref || itemRef,
    },
    itemTypeChanged,
    fieldCount: Object.keys(normalized.fields).length,
    creatorCount: normalized.creators.length,
    warnings: normalized.warnings,
    ...cleanup,
  };
}

export async function applyResult(args) {
  return withPackageRuntimeScope(args?.runtime, () =>
    applyResultImpl(args || {}),
  );
}

export const __metadataCuratorApplyResultTestOnly = {
  normalizeApplyPayload,
  applyResultImpl,
};
