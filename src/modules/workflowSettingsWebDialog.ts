import type { DialogHelper } from "zotero-plugin-toolkit";
import { config } from "../../package.json";
import { getString } from "../utils/locale";
import { resolveAddonRef } from "../utils/runtimeBridge";
import type { LoadedWorkflow } from "../workflows/types";
import type { WorkflowExecutionOptions } from "./workflowSettingsDomain";
import { buildWorkflowSettingsUiDescriptor } from "./workflowSettings";
import type { BackendInstance } from "../backends/types";
import { ACP_BACKEND_TYPE } from "../config/defaults";
import { loadBackendsRegistry } from "../backends/registry";
import { persistBackendsConfig } from "./backendManager";
import { probeAcpBackendRuntimeOptions } from "./acpBackendProbe";
import {
  AUTO_APPROVE_ZOTERO_WRITES_PARAM,
  normalizeWorkflowRunOptions,
  type WorkflowRunOptions,
} from "../workflows/zoteroHostAccessOptions";

type WorkflowSettingsDialogSnapshot = {
  title: string;
  labels: {
    workflowLabel: string;
    providerLabel: string;
    profileLabel: string;
    workflowParamsTitle: string;
    providerOptionsTitle: string;
    runOptionsTitle: string;
    persistLabel: string;
    confirmLabel: string;
    cancelLabel: string;
    noWorkflowParams: string;
    noProviderOptions: string;
    noRunOptions: string;
    noProfiles: string;
    blockedNoProfile: string;
    workflowSettingsNumberInvalid: string;
    workflowSettingsPositiveIntegerRequired: string;
    refreshAcpRuntimeCache: string;
  };
  workflow: {
    id: string;
    label: string;
    providerId: string;
  };
  form: {
    requiresBackendProfile: boolean;
    profileEditable: boolean;
    profileMissing: boolean;
    profiles: Array<{ id: string; label: string }>;
    selectedProfile: string;
    workflowSchemaEntries: Array<{
      key: string;
      type: "string" | "number" | "boolean";
      title?: string;
      description?: string;
      enumValues?: string[];
      options?: Array<{
        value: string;
        label: string;
        description?: string;
      }>;
      allowCustom?: boolean;
      defaultValue?: unknown;
      disabled?: boolean;
    }>;
    providerSchemaEntries: Array<{
      key: string;
      type: "string" | "number" | "boolean";
      title?: string;
      description?: string;
      enumValues?: string[];
      options?: Array<{
        value: string;
        label: string;
        description?: string;
      }>;
      allowCustom?: boolean;
      defaultValue?: unknown;
      disabled?: boolean;
    }>;
    runSchemaEntries: Array<{
      key: string;
      type: "string" | "number" | "boolean";
      title?: string;
      description?: string;
      enumValues?: string[];
      options?: Array<{
        value: string;
        label: string;
        description?: string;
      }>;
      allowCustom?: boolean;
      defaultValue?: unknown;
      disabled?: boolean;
    }>;
    workflowParams: Record<string, unknown>;
    providerOptions: Record<string, unknown>;
    runOptions: Record<string, unknown>;
    hasConfigurableSettings: boolean;
    canRefreshAcpRuntimeCache?: boolean;
  };
  persistChecked: boolean;
};

type WorkflowSettingsDialogActionEnvelope = {
  type: "workflow-settings-dialog:action";
  action: string;
  payload?: Record<string, unknown>;
};

type WorkflowSettingsDialogResult =
  | {
      status: "confirmed";
      executionOptions: WorkflowExecutionOptions;
      persist: boolean;
    }
  | {
      status: "canceled";
    }
  | {
      status: "error";
      stage: string;
      reason: string;
    };

function localize(
  key: string,
  fallback: string,
  options?: { args?: Record<string, unknown> },
) {
  try {
    const value = String(
      options ? getString(key as any, options) : getString(key as any),
    ).trim();
    return value || fallback;
  } catch {
    return fallback;
  }
}

function resolveDialogPageUrl() {
  const addonRef = String(config.addonRef || "").trim() || resolveAddonRef("");
  if (!addonRef) {
    return "about:blank";
  }
  return `chrome://${addonRef}/content/dashboard/workflow-settings-dialog.html?ui=20260521-submit-v1`;
}

function createDialogFrame(doc: Document, pageUrl: string) {
  const frame = doc.createElement("iframe");
  frame.setAttribute("type", "content");
  frame.setAttribute("data-zs-role", "workflow-settings-dialog-frame");
  frame.src = pageUrl;
  frame.style.width = "100%";
  frame.style.height = "100%";
  frame.style.minHeight = "420px";
  frame.style.border = "none";
  return frame;
}

function resolveFrameWindow(frame: Element | null) {
  if (!frame) {
    return null;
  }
  const candidate = frame as Element & { contentWindow?: Window | null };
  return candidate.contentWindow || null;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function normalizeExecutionOptions(raw: unknown): WorkflowExecutionOptions {
  if (!isObject(raw)) {
    return {};
  }
  return {
    backendId:
      typeof raw.backendId === "string" ? raw.backendId.trim() || undefined : undefined,
    workflowParams: isObject(raw.workflowParams) ? { ...raw.workflowParams } : {},
    providerOptions: isObject(raw.providerOptions) ? { ...raw.providerOptions } : {},
    runOptions: normalizeWorkflowRunOptions(raw.runOptions),
  };
}

function toRunOptionsFormValues(
  runOptions: WorkflowRunOptions | undefined,
): Record<string, unknown> {
  return {
    [AUTO_APPROVE_ZOTERO_WRITES_PARAM]:
      runOptions?.zoteroHostAccess?.autoApproveWrites === true,
  };
}

function normalizeDraftChangedSection(raw: unknown) {
  const section = String(raw || "").trim();
  if (
    section === "backend" ||
    section === "workflowParams" ||
    section === "providerOptions" ||
    section === "runOptions"
  ) {
    return section;
  }
  return "";
}

function normalizeDraftChangedKey(raw: unknown) {
  return String(raw || "").trim();
}

function isStructuralDraftChange(args: { changedSection: string; changedKey: string }) {
  if (args.changedSection === "backend" && args.changedKey === "backendId") {
    return true;
  }
  if (
    args.changedSection === "providerOptions" &&
    (
      args.changedKey === "engine" ||
      args.changedKey === "provider_id" ||
      args.changedKey === "model" ||
      args.changedKey === "acpModelId"
    )
  ) {
    return true;
  }
  return false;
}

function buildDialogErrorResult(args: {
  stage: string;
  error: unknown;
  fallback: string;
}): WorkflowSettingsDialogResult {
  const text =
    args.error instanceof Error
      ? String(args.error.message || args.error.name || "").trim()
      : String(args.error || "").trim();
  return {
    status: "error",
    stage: args.stage,
    reason: text || args.fallback,
  };
}

export async function openWorkflowSettingsWebDialog(args: {
  workflow: LoadedWorkflow;
  ownerWindow?: _ZoteroTypes.MainWindow;
  initialDraft?: WorkflowExecutionOptions;
  candidateBackends?: BackendInstance[];
}): Promise<WorkflowSettingsDialogResult> {
  let descriptor = await buildWorkflowSettingsUiDescriptor({
    workflow: args.workflow,
    draft: args.initialDraft,
    candidateBackends: args.candidateBackends,
    autoSelectFallbackProfile: true,
  });
  if (descriptor.blockedReason) {
    return {
      status: "error",
      stage: "descriptor",
      reason: descriptor.blockedReason,
    };
  }
  let draft: WorkflowExecutionOptions = {
    backendId: descriptor.selectedProfile || undefined,
    workflowParams: { ...descriptor.workflowParams },
    providerOptions: { ...descriptor.providerOptions },
    runOptions: normalizeWorkflowRunOptions(descriptor.runOptions),
  };
  let candidateBackends = args.candidateBackends;
  let persistChecked = true;
  let result: WorkflowSettingsDialogResult = { status: "canceled" };
  let dialog: DialogHelper | undefined;
  let frameWindow: Window | null = null;
  let removeMessageListener: (() => void) | undefined;

  const resolveSelectedBackendForSnapshot = () => {
    const selectedProfile = String(
      draft.backendId || descriptor.selectedProfile || "",
    ).trim();
    return (candidateBackends || []).find(
      (backend) => String(backend.id || "").trim() === selectedProfile,
    );
  };

  const pushSnapshot = (messageType: "workflow-settings-dialog:init" | "workflow-settings-dialog:snapshot") => {
    if (!frameWindow) {
      return;
    }
    const draftBackendId = String(draft.backendId || "").trim();
    const selectedProfile = descriptor.profiles.some(
      (profile) => profile.id === draftBackendId,
    )
      ? draftBackendId
      : descriptor.selectedProfile;
    const snapshot: WorkflowSettingsDialogSnapshot = {
      title: localize("workflow-settings-submit-title", "Workflow Settings"),
      labels: {
        workflowLabel: localize("workflow-settings-workflow-label", "Workflow"),
        providerLabel: localize("workflow-settings-provider-label", "Provider"),
        profileLabel: localize("workflow-settings-profile-label", "Profile"),
        workflowParamsTitle: localize(
          "workflow-settings-persisted-workflow-params-title",
          "Workflow Parameters",
        ),
        providerOptionsTitle: localize(
          "workflow-settings-persisted-provider-options-title",
          "Provider Runtime Options",
        ),
        runOptionsTitle: localize(
          "workflow-settings-run-options-title",
          "Run Options",
        ),
        persistLabel: localize(
          "workflow-settings-submit-persist-checkbox",
          "Save as default settings",
        ),
        confirmLabel: localize("workflow-settings-submit-confirm", "Confirm & Submit"),
        cancelLabel: localize("workflow-settings-cancel", "Cancel"),
        noWorkflowParams: localize(
          "workflow-settings-no-workflow-params",
          "This workflow has no configurable parameters.",
        ),
        noProviderOptions: localize(
          "workflow-settings-no-provider-options",
          "This provider has no configurable runtime options.",
        ),
        noRunOptions: localize(
          "workflow-settings-no-run-options",
          "This workflow has no configurable run options.",
        ),
        noProfiles: localize(
          "workflow-settings-no-profiles",
          "No backend profile available.",
        ),
        blockedNoProfile: localize(
          "workflow-settings-submit-blocked-no-profile",
          "No backend profile available. Please configure one first.",
        ),
        workflowSettingsNumberInvalid: localize(
          "workflow-settings-number-invalid",
          "Please enter a valid number.",
        ),
        workflowSettingsPositiveIntegerRequired: localize(
          "workflow-settings-positive-integer-required",
          "Please enter a positive integer.",
        ),
        refreshAcpRuntimeCache: localize(
          "workflow-settings-refresh-acp-runtime-cache",
          "Refresh ACP Config Cache",
        ),
      },
      workflow: {
        id: descriptor.workflowId,
        label: descriptor.workflowLabel,
        providerId: descriptor.providerId,
      },
      form: {
        requiresBackendProfile: descriptor.requiresBackendProfile,
        profileEditable: descriptor.profileEditable,
        profileMissing: descriptor.profileMissing,
        profiles: descriptor.profiles,
        selectedProfile,
        workflowSchemaEntries: descriptor.workflowSchemaEntries,
        providerSchemaEntries: descriptor.providerSchemaEntries,
        runSchemaEntries: descriptor.runSchemaEntries,
        workflowParams: { ...(draft.workflowParams || {}) },
        providerOptions: { ...(draft.providerOptions || {}) },
        runOptions: toRunOptionsFormValues(draft.runOptions),
        hasConfigurableSettings: descriptor.hasConfigurableSettings,
        canRefreshAcpRuntimeCache:
          resolveSelectedBackendForSnapshot()?.type === ACP_BACKEND_TYPE,
      },
      persistChecked,
    };
    frameWindow.postMessage(
      {
        type: messageType,
        payload: snapshot,
      },
      "*",
    );
  };

  const refreshDescriptor = async () => {
    descriptor = await buildWorkflowSettingsUiDescriptor({
      workflow: args.workflow,
      draft,
      candidateBackends,
      autoSelectFallbackProfile: true,
    });
    draft = {
      ...draft,
      providerOptions: { ...descriptor.providerOptions },
      runOptions: normalizeWorkflowRunOptions(draft.runOptions),
    };
    const draftBackendId = String(draft.backendId || "").trim();
    if (!draftBackendId) {
      if (descriptor.selectedProfile) {
        draft = {
          ...draft,
          backendId: descriptor.selectedProfile,
        };
      }
      return;
    }
    if (descriptor.profiles.some((profile) => profile.id === draftBackendId)) {
      return;
    }
    draft = {
      ...draft,
      backendId: descriptor.selectedProfile || undefined,
    };
  };

  const closeDialog = () => {
    dialog?.window?.close();
  };

  const handleAction = async (envelope: WorkflowSettingsDialogActionEnvelope) => {
    try {
      const action = String(envelope.action || "").trim();
      if (!action) {
        return;
      }
      if (action === "ready") {
        pushSnapshot("workflow-settings-dialog:init");
        return;
      }
      if (action === "update-draft") {
        const payload = envelope.payload || {};
        draft = normalizeExecutionOptions(payload.executionOptions);
        const changedSection = normalizeDraftChangedSection(payload.changedSection);
        const changedKey = normalizeDraftChangedKey(payload.changedKey);
        if (
          isStructuralDraftChange({
            changedSection,
            changedKey,
          })
        ) {
          await refreshDescriptor();
          pushSnapshot("workflow-settings-dialog:snapshot");
        }
        return;
      }
      if (action === "toggle-persist") {
        persistChecked = envelope.payload?.checked !== false;
        pushSnapshot("workflow-settings-dialog:snapshot");
        return;
      }
      if (action === "refresh-acp-runtime-cache") {
        const selectedBackendId = String(
          draft.backendId || descriptor.selectedProfile || "",
        ).trim();
        const loaded = await loadBackendsRegistry();
        const backends = [...loaded.backends];
        const index = backends.findIndex(
          (backend) => String(backend.id || "").trim() === selectedBackendId,
        );
        if (index < 0) {
          throw new Error(`ACP backend not found: ${selectedBackendId}`);
        }
        if (String(backends[index].type || "").trim() !== ACP_BACKEND_TYPE) {
          throw new Error(`Selected backend is not an ACP backend: ${selectedBackendId}`);
        }
        const result = await probeAcpBackendRuntimeOptions({
          backend: backends[index],
        });
        backends[index] = result.backend;
        persistBackendsConfig(backends);
        candidateBackends = backends;
        await refreshDescriptor();
        pushSnapshot("workflow-settings-dialog:snapshot");
        if (!result.ok) {
          throw new Error(result.error || "ACP config cache refresh failed");
        }
        return;
      }
      if (action === "confirm") {
        if (descriptor.profileMissing) {
          pushSnapshot("workflow-settings-dialog:snapshot");
          return;
        }
        const payloadExecutionOptions = normalizeExecutionOptions(
          isObject(envelope.payload)
            ? (envelope.payload.executionOptions as unknown)
            : undefined,
        );
        const finalExecutionOptions =
          isObject(envelope.payload) &&
          Object.prototype.hasOwnProperty.call(envelope.payload, "executionOptions")
            ? payloadExecutionOptions
            : normalizeExecutionOptions(draft);
        result = {
          status: "confirmed",
          executionOptions: finalExecutionOptions,
          persist: persistChecked,
        };
        closeDialog();
        return;
      }
      if (action === "cancel") {
        result = { status: "canceled" };
        closeDialog();
      }
    } catch (error) {
      result = buildDialogErrorResult({
        stage: "message-action",
        error,
        fallback: "workflow settings dialog action failed",
      });
      closeDialog();
    }
  };

  const dialogData: Record<string, unknown> = {
    loadCallback: () => {
      try {
        const doc = dialog?.window?.document;
        const dialogWindow = dialog?.window;
        if (!doc || !dialogWindow) {
          throw new Error("workflow settings dialog window is unavailable");
        }
        try {
          dialogWindow.resizeTo(760, 620);
        } catch {
          // ignore
        }
        const root = doc.getElementById("zs-workflow-settings-dialog-root") as
          | HTMLElement
          | null;
        if (!root) {
          throw new Error("workflow settings dialog root is unavailable");
        }
        root.innerHTML = "";
        const frame = createDialogFrame(doc, resolveDialogPageUrl());
        root.appendChild(frame);
        frameWindow = resolveFrameWindow(frame);
        frame.addEventListener("load", () => {
          frameWindow = resolveFrameWindow(frame);
          if (!frameWindow) {
            result = buildDialogErrorResult({
              stage: "iframe-load",
              error: new Error("workflow settings iframe window is unavailable"),
              fallback: "workflow settings dialog frame failed to initialize",
            });
            closeDialog();
            return;
          }
          pushSnapshot("workflow-settings-dialog:init");
        });
        const onMessage = (event: MessageEvent) => {
          const data = event.data as { type?: unknown };
          if (!data || data.type !== "workflow-settings-dialog:action") {
            return;
          }
          void handleAction(data as WorkflowSettingsDialogActionEnvelope);
        };
        dialogWindow.addEventListener("message", onMessage);
        removeMessageListener = () => {
          dialogWindow.removeEventListener("message", onMessage);
        };
        pushSnapshot("workflow-settings-dialog:snapshot");
      } catch (error) {
        result = buildDialogErrorResult({
          stage: "load-callback",
          error,
          fallback: "workflow settings dialog failed to initialize",
        });
        if (!dialog?.window?.closed) {
          closeDialog();
        }
      }
    },
    unloadCallback: () => {
      if (removeMessageListener) {
        removeMessageListener();
        removeMessageListener = undefined;
      }
      frameWindow = null;
    },
  };

  try {
    const dialogBuilder = new ztoolkit.Dialog(1, 1).addCell(0, 0, {
      tag: "div",
      namespace: "html",
      id: "zs-workflow-settings-dialog-root",
      styles: {
        width: "100%",
        height: "100%",
        minWidth: "640px",
        minHeight: "420px",
        padding: "0",
        margin: "0",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      },
    });
    dialogBuilder.setDialogData(dialogData);
    dialog = dialogBuilder.open(
      localize("workflow-settings-submit-title", "Workflow Settings"),
    );
  } catch (error) {
    return buildDialogErrorResult({
      stage: "dialog-open",
      error,
      fallback: "workflow settings dialog could not be opened",
    });
  }

  await (dialogData as { unloadLock?: { promise?: Promise<void> } }).unloadLock
    ?.promise;

  return result;
}
