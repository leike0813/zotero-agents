import {
  runtimeCatalogForRun,
  upsertAcpSkillRun,
  type AcpSkillRunEvent,
  type AcpSkillRunRuntimeCatalog,
} from "./acpSkillRunStore";
import {
  ensureAcpSkillRunStoreHydrated,
  normalizeSelectableOptions,
} from "./acpSkillRunPersistence";
import {
  acpSkillRunWorkspaceChange,
  scheduleWorkspaceChangedEmit,
} from "./acpSkillRunWorkspaceDataPlane";
import {
  acpSkillRunRecords as runRecords,
  acpSkillRunRuntimeCatalogByRequestId as runtimeCatalogByRequestId,
  normalizeString,
} from "./acpSkillRunState";

export function setAcpSkillRunRuntimeCatalog(
  requestIdRaw: string,
  options: Partial<AcpSkillRunRuntimeCatalog> | null | undefined,
) {
  const requestId = normalizeString(requestIdRaw);
  if (!requestId) {
    return;
  }
  if (!options) {
    runtimeCatalogByRequestId.delete(requestId);
    scheduleWorkspaceChangedEmit(
      acpSkillRunWorkspaceChange(requestId, ["runtime-options"]),
    );
    return;
  }
  const normalized: AcpSkillRunRuntimeCatalog = {
    modeOptions: normalizeSelectableOptions(options.modeOptions),
    modelOptions: normalizeSelectableOptions(options.modelOptions),
    displayModelOptions: normalizeSelectableOptions(
      options.displayModelOptions,
    ),
    reasoningEffortOptions: normalizeSelectableOptions(
      options.reasoningEffortOptions,
    ),
    reasoningSource:
      options.reasoningSource === "explicit" ||
      options.reasoningSource === "model-derived"
        ? options.reasoningSource
        : "none",
  };
  runtimeCatalogByRequestId.set(requestId, normalized);
  scheduleWorkspaceChangedEmit(
    acpSkillRunWorkspaceChange(requestId, ["runtime-options"]),
  );
}

export function getAcpSkillRunRuntimeCatalog(
  requestIdRaw: string,
): AcpSkillRunRuntimeCatalog | null {
  ensureAcpSkillRunStoreHydrated();
  const requestId = normalizeString(requestIdRaw);
  const run = requestId ? runRecords.get(requestId) : undefined;
  return run ? runtimeCatalogForRun(run) : null;
}

export function updateAcpSkillRunRuntimeSelection(args: {
  requestId: string;
  selection: {
    modeId?: string;
    modelId?: string;
    rawModelId?: string;
    reasoningEffort?: string | null;
  };
  event?: Omit<AcpSkillRunEvent, "ts"> & { ts?: string };
}) {
  return upsertAcpSkillRun({
    requestId: args.requestId,
    acpModeId: args.selection.modeId,
    acpModelId: args.selection.modelId,
    acpRawModelId: args.selection.rawModelId,
    ...(Object.prototype.hasOwnProperty.call(args.selection, "reasoningEffort")
      ? { acpReasoningEffort: args.selection.reasoningEffort }
      : {}),
    event: args.event,
  });
}
