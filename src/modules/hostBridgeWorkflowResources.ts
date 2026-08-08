import { ensureRuntimeDirectory, getRuntimePersistencePaths } from "./runtimePersistence";
import {
  registerHostBridgeWorkflowArtifactFile,
  resolveHostBridgeUploadedFile,
  type HostBridgeFileDescriptor,
  type HostBridgeResolvedFileDownload,
} from "./hostBridgeFileRegistry";
import { joinPath } from "../utils/path";
import type {
  WorkflowManifest,
  WorkflowResourceApi,
  WorkflowResourceBindings,
  WorkflowResourceFile,
  WorkflowResourceOutputDescriptor,
  WorkflowResourceRequirement,
  WorkflowHostApi,
} from "../workflows/types";

const RESOURCE_SCHEMA = "zotero-bridge.workflow-resources.v1" as const;
let resourceApiSequence = 0;

export class HostBridgeWorkflowResourceError extends Error {
  readonly code:
    | "invalid_workflow_resource_bindings"
    | "workflow_resource_missing"
    | "workflow_resource_ineligible"
    | "workflow_resource_mismatch"
    | "workflow_resource_output_invalid";
  readonly details?: Record<string, unknown>;

  constructor(
    code: HostBridgeWorkflowResourceError["code"],
    message: string,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "HostBridgeWorkflowResourceError";
    this.code = code;
    this.details = details;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function normalizeText(value: unknown) {
  return String(value || "").trim();
}

function isPathLike(value: string) {
  return (
    value.startsWith("/") ||
    value.startsWith("\\") ||
    /^[A-Za-z]:[\\/]/.test(value) ||
    value.includes("/") ||
    value.includes("\\")
  );
}

function requirementMap(manifest: WorkflowManifest) {
  return new Map(
    (manifest.resourceRequirements || []).map((requirement) => [
      requirement.id,
      requirement,
    ]),
  );
}

export function supportsHostBridgeNonInteractive(manifest: WorkflowManifest) {
  return manifest.supportedInvocationModes === undefined
    ? true
    : manifest.supportedInvocationModes.includes("non-interactive");
}

function parseInputSlot(
  slotId: string,
  value: unknown,
): { fileIds: string[] } {
  if (!isRecord(value) || !Array.isArray(value.fileIds)) {
    throw new HostBridgeWorkflowResourceError(
      "invalid_workflow_resource_bindings",
      "resource input slots must contain fileIds",
      { slotId },
    );
  }
  const fileIds = value.fileIds.map((fileId) => normalizeText(fileId));
  if (
    fileIds.length === 0 ||
    fileIds.some((fileId) => !/^file-[A-Za-z0-9-]+$/.test(fileId)) ||
    fileIds.some(isPathLike)
  ) {
    throw new HostBridgeWorkflowResourceError(
      "invalid_workflow_resource_bindings",
      "resource input slots must contain opaque file handles",
      { slotId },
    );
  }
  return { fileIds };
}

function parseOutputSlot(
  slotId: string,
  value: unknown,
): { delivery: "bridge-download" } {
  if (!isRecord(value) || value.delivery !== "bridge-download") {
    throw new HostBridgeWorkflowResourceError(
      "invalid_workflow_resource_bindings",
      "resource output slots must request bridge-download delivery",
      { slotId },
    );
  }
  return { delivery: "bridge-download" };
}

export function parseWorkflowResourceBindings(
  raw: unknown,
): WorkflowResourceBindings | undefined {
  if (typeof raw === "undefined" || raw === null) {
    return undefined;
  }
  if (!isRecord(raw)) {
    throw new HostBridgeWorkflowResourceError(
      "invalid_workflow_resource_bindings",
      "resourceBindings must be a JSON object",
    );
  }
  if (
    normalizeText(raw.schema) &&
    normalizeText(raw.schema) !== RESOURCE_SCHEMA
  ) {
    throw new HostBridgeWorkflowResourceError(
      "invalid_workflow_resource_bindings",
      `resourceBindings.schema must be ${RESOURCE_SCHEMA}`,
    );
  }
  const inputsRaw = raw.inputs;
  const outputsRaw = raw.outputs;
  if (
    typeof inputsRaw !== "undefined" &&
    (!isRecord(inputsRaw) || Array.isArray(inputsRaw))
  ) {
    throw new HostBridgeWorkflowResourceError(
      "invalid_workflow_resource_bindings",
      "resourceBindings.inputs must be an object",
    );
  }
  if (
    typeof outputsRaw !== "undefined" &&
    (!isRecord(outputsRaw) || Array.isArray(outputsRaw))
  ) {
    throw new HostBridgeWorkflowResourceError(
      "invalid_workflow_resource_bindings",
      "resourceBindings.outputs must be an object",
    );
  }
  const inputs: Record<string, { fileIds: string[] }> = {};
  for (const [slotId, value] of Object.entries(inputsRaw || {})) {
    inputs[slotId] = parseInputSlot(slotId, value);
  }
  const outputs: Record<string, { delivery: "bridge-download" }> = {};
  for (const [slotId, value] of Object.entries(outputsRaw || {})) {
    outputs[slotId] = parseOutputSlot(slotId, value);
  }
  return {
    schema: RESOURCE_SCHEMA,
    inputs,
    outputs,
  };
}

function assertRequirementShape(
  requirement: WorkflowResourceRequirement,
  value: { fileIds: string[] } | { delivery: "bridge-download" } | undefined,
) {
  if (!value && requirement.required) {
    throw new HostBridgeWorkflowResourceError(
      "workflow_resource_missing",
      "required workflow resource is not bound",
      { slotId: requirement.id, direction: requirement.direction },
    );
  }
  if (!value) return;
  if (requirement.direction === "input") {
    const input = value as { fileIds: string[] };
    if (
      (requirement.cardinality === "one" && input.fileIds.length !== 1) ||
      (requirement.accept?.maxCount !== undefined &&
        input.fileIds.length > requirement.accept.maxCount)
    ) {
      throw new HostBridgeWorkflowResourceError(
        "workflow_resource_mismatch",
        "workflow resource cardinality does not match its requirement",
        { slotId: requirement.id },
      );
    }
  }
}

function assertAccepts(
  requirement: WorkflowResourceRequirement,
  descriptor: HostBridgeFileDescriptor,
) {
  const accept = requirement.accept;
  if (!accept) return;
  if (
    accept.maxBytes !== undefined &&
    descriptor.size !== undefined &&
    descriptor.size > accept.maxBytes
  ) {
    throw new HostBridgeWorkflowResourceError(
      "workflow_resource_mismatch",
      "workflow resource exceeds the declared size limit",
      { slotId: requirement.id },
    );
  }
  if (
    accept.contentTypes?.length &&
    !accept.contentTypes.includes(descriptor.contentType)
  ) {
    throw new HostBridgeWorkflowResourceError(
      "workflow_resource_mismatch",
      "workflow resource content type is not accepted",
      { slotId: requirement.id },
    );
  }
  if (
    accept.extensions?.length &&
    !accept.extensions.some((extension) =>
      descriptor.displayName.toLowerCase().endsWith(extension.toLowerCase()),
    )
  ) {
    throw new HostBridgeWorkflowResourceError(
      "workflow_resource_mismatch",
      "workflow resource extension is not accepted",
      { slotId: requirement.id },
    );
  }
}

export async function validateWorkflowResourceBindings(args: {
  manifest: WorkflowManifest;
  raw: unknown;
  resolveInput?: (
    fileId: string,
  ) => Promise<HostBridgeResolvedFileDownload>;
}) {
  const bindings = parseWorkflowResourceBindings(args.raw);
  const requirements = requirementMap(args.manifest);
  if (!supportsHostBridgeNonInteractive(args.manifest)) {
    throw new HostBridgeWorkflowResourceError(
      "workflow_resource_ineligible",
      "workflow does not support non-interactive Host Bridge execution",
      { workflowId: args.manifest.id },
    );
  }
  if (!bindings && requirements.size === 0) {
    return { bindings: undefined, inputs: {} as Record<string, WorkflowResourceFile[]> };
  }
  if (!bindings) {
    throw new HostBridgeWorkflowResourceError(
      "workflow_resource_missing",
      "resourceBindings are required for this workflow",
      { workflowId: args.manifest.id },
    );
  }
  for (const slotId of [
    ...Object.keys(bindings.inputs),
    ...Object.keys(bindings.outputs),
  ]) {
    if (!requirements.has(slotId)) {
      throw new HostBridgeWorkflowResourceError(
        "invalid_workflow_resource_bindings",
        "resource binding references an unknown slot",
        { slotId },
      );
    }
  }
  const inputFiles: Record<string, WorkflowResourceFile[]> = {};
  for (const requirement of requirements.values()) {
    const value =
      requirement.direction === "input"
        ? bindings.inputs[requirement.id]
        : bindings.outputs[requirement.id];
    assertRequirementShape(requirement, value);
    if (requirement.direction !== "input" || !value) continue;
    const resolveInput = args.resolveInput || resolveHostBridgeUploadedFile;
    const resolved = [];
    for (const fileId of (value as { fileIds: string[] }).fileIds) {
      const file = await resolveInput(fileId);
      assertAccepts(requirement, file.descriptor);
      resolved.push({
        fileId: file.descriptor.fileId,
        path: file.source.path,
        displayName: file.descriptor.displayName,
        contentType: file.descriptor.contentType,
        ...(file.descriptor.size !== undefined
          ? { size: file.descriptor.size }
          : {}),
        ...(file.descriptor.sha256
          ? { sha256: file.descriptor.sha256 }
          : {}),
      });
    }
    inputFiles[requirement.id] = resolved;
  }
  return { bindings, inputs: inputFiles };
}

function safeName(value: string, fallback: string) {
  const name = value
    .split(/[\\/]/)
    .pop()
    ?.replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return name || fallback;
}

function numberedName(name: string, ordinal: number) {
  if (ordinal <= 1) return name;
  const extensionIndex = name.lastIndexOf(".");
  return extensionIndex > 0
    ? `${name.slice(0, extensionIndex)}-${ordinal}${name.slice(extensionIndex)}`
    : `${name}-${ordinal}`;
}

export async function createHostBridgeWorkflowResourceApi(args: {
  workflowId: string;
  manifest: WorkflowManifest;
  inputs: Record<string, WorkflowResourceFile[]>;
  outputBindings: WorkflowResourceBindings["outputs"];
}): Promise<WorkflowResourceApi> {
  const outputRoot = joinPath(
    getRuntimePersistencePaths().tmpDir,
    "host-bridge-workflow-outputs",
    `${safeName(args.workflowId, "workflow")}-${Date.now().toString(36)}-${(++resourceApiSequence).toString(36)}`,
  );
  await ensureRuntimeDirectory(outputRoot);
  const requirements = requirementMap(args.manifest);
  const inputs = Object.fromEntries(
    Object.entries(args.inputs).map(([slotId, files]) => [
      slotId,
      Object.freeze(files.map((file) => Object.freeze({ ...file }))),
    ]),
  );
  const allocations = new Map<string, string>();
  const allocationCountBySlot = new Map<string, number>();
  const outputs: WorkflowResourceOutputDescriptor[] = [];
  const api: WorkflowResourceApi = {
    mode: "non-interactive",
    getInput(slotId) {
      return inputs[slotId]?.[0] || null;
    },
    getInputs(slotId) {
      return [...(inputs[slotId] || [])];
    },
    async allocateOutput(outputArgs) {
      const requirement = requirements.get(outputArgs.slotId);
      if (
        !requirement ||
        requirement.direction !== "output" ||
        args.outputBindings[outputArgs.slotId]?.delivery !== "bridge-download"
      ) {
        throw new HostBridgeWorkflowResourceError(
          "workflow_resource_output_invalid",
          "output slot is not declared and bound for bridge download",
          { slotId: outputArgs.slotId },
        );
      }
      const suggestedName = safeName(
        outputArgs.suggestedName || requirement.suggestedName || "output.bin",
        "output.bin",
      );
      const ordinal = (allocationCountBySlot.get(outputArgs.slotId) || 0) + 1;
      allocationCountBySlot.set(outputArgs.slotId, ordinal);
      const path = joinPath(outputRoot, numberedName(suggestedName, ordinal));
      allocations.set(path, outputArgs.slotId);
      return { path };
    },
    async publishOutput(outputArgs) {
      const allocatedSlot = allocations.get(outputArgs.path);
      if (allocatedSlot !== outputArgs.slotId) {
        throw new HostBridgeWorkflowResourceError(
          "workflow_resource_output_invalid",
          "output path was not allocated by the workflow resource API",
          { slotId: outputArgs.slotId },
        );
      }
      const descriptor = await registerHostBridgeWorkflowArtifactFile({
        localPath: outputArgs.path,
        workflowId: args.workflowId,
        displayName: outputArgs.displayName,
        contentType: outputArgs.contentType,
      });
      const result: WorkflowResourceOutputDescriptor = {
        slotId: outputArgs.slotId,
        ...descriptor,
        sourceKind: "workflow-artifact",
        downloadCommand: `zotero-bridge file download ${descriptor.fileId} --output ${descriptor.displayName}`,
      };
      const immutableResult = Object.freeze(result);
      outputs.push(immutableResult);
      allocations.delete(outputArgs.path);
      return immutableResult;
    },
    listOutputs() {
      return outputs.map((output) => ({ ...output }));
    },
  };
  return api;
}

export function createWorkflowInteractionRequiredError(operation: string) {
  const error = new Error(
    `Workflow interaction is unavailable during Host Bridge execution: ${operation}`,
  ) as Error & { code?: string; details?: Record<string, unknown> };
  error.code = "workflow_interaction_required";
  error.details = { operation };
  return error;
}

export function createNonInteractiveWorkflowHostApi(args: {
  base: WorkflowHostApi;
  resources: WorkflowResourceApi;
}): WorkflowHostApi {
  return {
    ...args.base,
    resources: args.resources,
    editor: {
      ...args.base.editor,
      openSession() {
        throw createWorkflowInteractionRequiredError("editor.openSession");
      },
    },
    file: {
      ...args.base.file,
      async pickDirectory() {
        throw createWorkflowInteractionRequiredError("file.pickDirectory");
      },
      async pickFile() {
        throw createWorkflowInteractionRequiredError("file.pickFile");
      },
      async pickSaveFile() {
        throw createWorkflowInteractionRequiredError("file.pickSaveFile");
      },
      async pickFiles() {
        throw createWorkflowInteractionRequiredError("file.pickFiles");
      },
    },
  };
}
