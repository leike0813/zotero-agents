export type WorkflowSettingsDraftChangeOrigin = "choice" | "text";

export function normalizeWorkflowSettingsDraftChangeOrigin(
  value: unknown,
): WorkflowSettingsDraftChangeOrigin {
  return value === "text" ? "text" : "choice";
}

export function isWorkflowSettingsStructuralRefreshChange(args: {
  changedSection: string;
  changedKey: string;
  origin: WorkflowSettingsDraftChangeOrigin;
}) {
  if (args.origin === "text") {
    return false;
  }
  if (args.changedSection === "backend" && args.changedKey === "backendId") {
    return true;
  }
  return (
    args.changedSection === "providerOptions" &&
    (args.changedKey === "engine" ||
      args.changedKey === "provider_id" ||
      args.changedKey === "model" ||
      args.changedKey === "acpModelProvider" ||
      args.changedKey === "acpModelId" ||
      args.changedKey === "acpModeId" ||
      args.changedKey === "acpReasoningEffort")
  );
}

export type WorkflowExecutionUnitPreview = Readonly<{
  unitId: string;
  taskName: string;
  inputUnitIdentity?: string;
  memberCount: number;
}>;

export type WorkflowExecutionUnitPreviewState =
  | Readonly<{ status: "loading" }>
  | Readonly<{
      status: "success";
      units: ReadonlyArray<WorkflowExecutionUnitPreview>;
    }>
  | Readonly<{
      status: "empty";
      units: ReadonlyArray<WorkflowExecutionUnitPreview>;
    }>
  | Readonly<{ status: "failure"; reasonCode: string }>;

export type WorkflowSettingsDialogLayout = Readonly<{
  mode: "single-region" | "multi-unit";
  showExecutionUnitPreview: boolean;
  showHostMaximumConcurrency: boolean;
}>;

export function resolveWorkflowSettingsDialogLayout(args: {
  hostQueueSupported: boolean;
  executionUnitPreview?: WorkflowExecutionUnitPreviewState;
}): WorkflowSettingsDialogLayout {
  const units =
    args.executionUnitPreview?.status === "success"
      ? args.executionUnitPreview.units
      : [];
  const showMultiUnitRegion =
    args.hostQueueSupported === true && units.length > 1;
  return Object.freeze({
    mode: showMultiUnitRegion ? "multi-unit" : "single-region",
    showExecutionUnitPreview: showMultiUnitRegion,
    showHostMaximumConcurrency: showMultiUnitRegion,
  });
}
