import {
  copyRuntimeFile,
  ensureRuntimeDirectory,
  getRuntimePersistencePaths,
  removeRuntimePath,
} from "./runtimePersistence";
import {
  digestRuntimeFileSource,
  inspectRuntimeFileSource,
} from "./runtimeFileTransfer";
import {
  registerHostBridgeWorkflowArtifactFile,
  resolveHostBridgeUploadedFile,
  type HostBridgeFileDescriptor,
  type HostBridgeResolvedFileDownload,
} from "./hostBridgeFileRegistry";
import { getBaseName, joinPath } from "../utils/path";
import type {
  WorkflowManifest,
  WorkflowResourceApi,
  WorkflowResourceBindings,
  WorkflowResourceFile,
  WorkflowResourceOutputDescriptor,
  WorkflowResourceRequirement,
  WorkflowHostApi,
  ResourceRef,
  WorkflowResourceMaterializeFileRequestDto,
} from "../workflows/types";

const RESOURCE_SCHEMA = "zotero-bridge.workflow-resources.v1" as const;
let resourceApiSequence = 0;

export function createWorkflowRunResourceStore(args: {
  runId: string;
  rootPath?: string;
}) {
  const runId = safeName(args.runId, "run");
  const rootPath =
    args.rootPath ||
    joinPath(getRuntimePersistencePaths().tmpDir, "workflow-resources", runId);
  const resources = new Map<
    string,
    WorkflowResourceFile & { sizeBytes: number; sha256: string }
  >();
  let sequence = 0;
  let active = true;
  const requireActive = () => {
    if (!active) {
      throw new HostBridgeWorkflowResourceError(
        "workflow_resource_missing",
        "workflow resource run has ended",
      );
    }
  };
  return {
    async stageFile(stageArgs: {
      slotId: string;
      sourcePath: string;
      displayName: string;
      contentType?: string;
      kind?: "file" | "archive";
    }) {
      requireActive();
      const source = await inspectRuntimeFileSource(stageArgs.sourcePath);
      const sourceDigest = await digestRuntimeFileSource(source);
      sequence += 1;
      const targetPath = joinPath(
        rootPath,
        `${String(sequence).padStart(4, "0")}-${safeName(
          stageArgs.displayName,
          "resource.bin",
        )}`,
      );
      await ensureRuntimeDirectory(rootPath);
      await copyRuntimeFile({
        sourcePath: source.path,
        targetPath,
      });
      const stagedSource = await inspectRuntimeFileSource(targetPath);
      const stagedDigest = await digestRuntimeFileSource(stagedSource);
      if (
        source.size !== stagedSource.size ||
        sourceDigest.sha256 !== stagedDigest.sha256
      ) {
        await removeRuntimePath(targetPath).catch(() => false);
        throw new HostBridgeWorkflowResourceError(
          "workflow_resource_mismatch",
          "source changed during resource materialization",
          { reason: "concurrent_modification" },
        );
      }
      const ref: ResourceRef = {
        kind: "workflow_resource",
        id: `${runId}:materialized:${sequence}`,
      };
      const resource = Object.freeze({
        ref,
        slotId: stageArgs.slotId,
        fileId: ref.id,
        path: targetPath,
        displayName: safeName(stageArgs.displayName, "resource.bin"),
        contentType:
          normalizeText(stageArgs.contentType) || "application/octet-stream",
        kind: stageArgs.kind || "file",
        size: stagedSource.size,
        sizeBytes: stagedSource.size,
        sha256: stagedDigest.sha256,
      });
      resources.set(ref.id, resource);
      return resource;
    },
    async resolveResource(ref: ResourceRef) {
      requireActive();
      if (
        ref?.kind !== "workflow_resource" ||
        !ref.id.startsWith(`${runId}:`)
      ) {
        throw new HostBridgeWorkflowResourceError(
          "workflow_resource_mismatch",
          "resource reference does not belong to this run",
        );
      }
      const resource = resources.get(ref.id);
      if (!resource) {
        throw new HostBridgeWorkflowResourceError(
          "workflow_resource_missing",
          "workflow resource is unavailable",
        );
      }
      const current = await inspectRuntimeFileSource(resource.path);
      const currentDigest = await digestRuntimeFileSource(current);
      if (
        current.size !== resource.sizeBytes ||
        currentDigest.sha256 !== resource.sha256
      ) {
        throw new HostBridgeWorkflowResourceError(
          "workflow_resource_mismatch",
          "workflow resource bytes changed after materialization",
        );
      }
      return { ...resource };
    },
    async releaseResources(refs: ResourceRef[]) {
      requireActive();
      for (const ref of refs) {
        if (
          ref?.kind !== "workflow_resource" ||
          !ref.id.startsWith(`${runId}:materialized:`)
        ) {
          throw new HostBridgeWorkflowResourceError(
            "workflow_resource_mismatch",
            "materialized resource does not belong to this run",
          );
        }
        const resource = resources.get(ref.id);
        if (!resource) continue;
        await removeRuntimePath(resource.path);
        resources.delete(ref.id);
      }
    },
    async cleanup() {
      if (!active) return;
      active = false;
      resources.clear();
      await removeRuntimePath(rootPath).catch(() => false);
    },
  };
}

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

function parseInputSlot(slotId: string, value: unknown): { fileIds: string[] } {
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
  descriptor: Pick<
    HostBridgeFileDescriptor,
    "displayName" | "contentType" | "size"
  >,
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
  resolveInput?: (fileId: string) => Promise<HostBridgeResolvedFileDownload>;
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
  if (
    !bindings &&
    [...requirements.values()].every((requirement) => !requirement.required)
  ) {
    return {
      bindings: undefined,
      inputs: {} as Record<string, WorkflowResourceFile[]>,
    };
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
        ...(file.descriptor.sha256 ? { sha256: file.descriptor.sha256 } : {}),
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
  runId?: string;
  manifest: WorkflowManifest;
  inputs: Record<string, WorkflowResourceFile[]>;
  outputBindings: WorkflowResourceBindings["outputs"];
}) {
  const runId = safeName(
    args.runId ||
      `${args.workflowId}-${Date.now().toString(36)}-${(++resourceApiSequence).toString(36)}`,
    "run",
  );
  const outputRoot = joinPath(
    getRuntimePersistencePaths().tmpDir,
    "host-bridge-workflow-outputs",
    runId,
  );
  await ensureRuntimeDirectory(outputRoot);
  const requirements = requirementMap(args.manifest);
  const materializedResources = createWorkflowRunResourceStore({
    runId,
    rootPath: joinPath(
      getRuntimePersistencePaths().tmpDir,
      "host-bridge-workflow-resources",
      runId,
    ),
  });
  const resourceFiles = new Map<string, WorkflowResourceFile>();
  const inputs = Object.fromEntries(
    Object.entries(args.inputs).map(([slotId, files]) => [
      slotId,
      Object.freeze(
        files.map((file, index) => {
          const ref: ResourceRef = {
            kind: "workflow_resource",
            id: `${runId}:input:${safeName(slotId, "slot")}:${index + 1}`,
          };
          const owned = Object.freeze({
            ...file,
            ref,
            slotId,
            kind: "file" as const,
            sizeBytes: file.size,
          });
          resourceFiles.set(ref.id, owned);
          return owned;
        }),
      ),
    ]),
  );
  const allocations = new Map<
    string,
    { allocationId: string; slotId: string; path: string }
  >();
  const allocationByPath = new Map<string, string>();
  const allocationCountBySlot = new Map<string, number>();
  const materializedCountBySlot = new Map<string, number>();
  let materializedBytes = 0;
  const outputs: WorkflowResourceOutputDescriptor[] = [];
  const resolveOwnedResource = async (ref: ResourceRef) => {
    if (ref?.kind !== "workflow_resource" || !ref.id.startsWith(`${runId}:`)) {
      throw new HostBridgeWorkflowResourceError(
        "workflow_resource_mismatch",
        "resource reference does not belong to this run",
      );
    }
    const resource = resourceFiles.get(ref.id);
    if (!resource) {
      throw new HostBridgeWorkflowResourceError(
        "workflow_resource_missing",
        "resource reference is unavailable",
      );
    }
    if (ref.id.includes(":materialized:")) {
      return materializedResources.resolveResource(ref);
    }
    const source = await inspectRuntimeFileSource(resource.path);
    const digest = await digestRuntimeFileSource(source);
    if (
      (resource.sizeBytes !== undefined &&
        source.size !== resource.sizeBytes) ||
      (resource.sha256 &&
        digest.sha256.replace(/^sha256:/, "") !==
          resource.sha256.replace(/^sha256:/, ""))
    ) {
      throw new HostBridgeWorkflowResourceError(
        "workflow_resource_mismatch",
        "workflow resource bytes changed after binding",
      );
    }
    return { ...resource };
  };
  const api: WorkflowResourceApi & {
    get(ref: ResourceRef): Promise<WorkflowResourceFile>;
    materializeFile(
      input: WorkflowResourceMaterializeFileRequestDto,
    ): Promise<WorkflowResourceFile>;
    resolveResource(ref: ResourceRef): Promise<WorkflowResourceFile>;
    releaseResources(refs: ResourceRef[]): Promise<void>;
    cleanup(): Promise<void>;
  } = {
    mode: "non-interactive",
    getInput(slotId) {
      return inputs[slotId]?.[0] || null;
    },
    getInputs(slotId) {
      return [...(inputs[slotId] || [])];
    },
    get: resolveOwnedResource,
    async materializeFile(materializeArgs) {
      const requirement = requirements.get(materializeArgs.slotId);
      if (!requirement || requirement.direction !== "input") {
        throw new HostBridgeWorkflowResourceError(
          "workflow_resource_mismatch",
          "materialization slot is not declared as a workflow input",
          { slotId: materializeArgs.slotId },
        );
      }
      const kind = materializeArgs.kind || requirement.kind;
      if (kind !== requirement.kind) {
        throw new HostBridgeWorkflowResourceError(
          "workflow_resource_mismatch",
          "materialized resource kind does not match its requirement",
          { slotId: materializeArgs.slotId },
        );
      }
      const displayName = safeName(
        materializeArgs.displayName ||
          getBaseName(materializeArgs.sourcePath) ||
          "resource.bin",
        "resource.bin",
      );
      const contentType =
        normalizeText(materializeArgs.contentType) ||
        "application/octet-stream";
      const source = await inspectRuntimeFileSource(materializeArgs.sourcePath);
      assertAccepts(requirement, {
        displayName,
        contentType,
        size: source.size,
      });
      const existingCount = inputs[materializeArgs.slotId]?.length || 0;
      const materializedCount =
        materializedCountBySlot.get(materializeArgs.slotId) || 0;
      const nextCount = existingCount + materializedCount + 1;
      const maxCount = Math.min(requirement.accept?.maxCount ?? 1_000, 1_000);
      if (
        nextCount > maxCount ||
        (requirement.cardinality === "one" && nextCount > 1)
      ) {
        throw new HostBridgeWorkflowResourceError(
          "workflow_resource_mismatch",
          "materialized resource exceeds the declared cardinality",
          { slotId: materializeArgs.slotId },
        );
      }
      if (materializedBytes + source.size > 32 * 1024 * 1024 * 1024) {
        throw new HostBridgeWorkflowResourceError(
          "workflow_resource_mismatch",
          "materialized resources exceed the run byte limit",
          { slotId: materializeArgs.slotId },
        );
      }
      const resource = await materializedResources.stageFile({
        slotId: materializeArgs.slotId,
        sourcePath: source.path,
        displayName,
        contentType,
        kind,
      });
      materializedCountBySlot.set(
        materializeArgs.slotId,
        materializedCount + 1,
      );
      materializedBytes += resource.sizeBytes;
      resourceFiles.set(resource.ref.id, resource);
      return { ...resource };
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
      const maxCount = requirement.accept?.maxCount;
      if ((maxCount !== undefined && ordinal > maxCount) || ordinal > 1_000) {
        throw new HostBridgeWorkflowResourceError(
          "workflow_resource_output_invalid",
          "output allocation exceeds the declared cardinality",
          { slotId: outputArgs.slotId },
        );
      }
      allocationCountBySlot.set(outputArgs.slotId, ordinal);
      const path = joinPath(outputRoot, numberedName(suggestedName, ordinal));
      const allocationId = `${runId}:allocation:${safeName(
        outputArgs.slotId,
        "slot",
      )}:${ordinal}`;
      const allocation = { allocationId, slotId: outputArgs.slotId, path };
      allocations.set(allocationId, allocation);
      allocationByPath.set(path, allocationId);
      return allocation;
    },
    async publishOutput(outputArgs) {
      const allocationId =
        normalizeText(outputArgs.allocationId) ||
        allocationByPath.get(outputArgs.path) ||
        "";
      const allocation = allocations.get(allocationId);
      if (
        !allocation ||
        allocation.slotId !== outputArgs.slotId ||
        allocation.path !== outputArgs.path
      ) {
        throw new HostBridgeWorkflowResourceError(
          "workflow_resource_output_invalid",
          "output path was not allocated by the workflow resource API",
          { slotId: outputArgs.slotId },
        );
      }
      const requirement = requirements.get(outputArgs.slotId)!;
      if (
        requirement.cardinality === "one" &&
        outputs.some((output) => output.slotId === outputArgs.slotId)
      ) {
        throw new HostBridgeWorkflowResourceError(
          "workflow_resource_output_invalid",
          "output slot has already been published",
          { slotId: outputArgs.slotId },
        );
      }
      const source = await inspectRuntimeFileSource(allocation.path);
      const maxBytes = Math.min(
        requirement.accept?.maxBytes ?? 16 * 1024 * 1024 * 1024,
        16 * 1024 * 1024 * 1024,
      );
      if (source.size > maxBytes) {
        throw new HostBridgeWorkflowResourceError(
          "workflow_resource_output_invalid",
          "output exceeds the declared size limit",
          { slotId: outputArgs.slotId },
        );
      }
      const displayName = safeName(
        outputArgs.displayName || getBaseName(allocation.path) || "output.bin",
        "output.bin",
      );
      if (
        requirement.accept?.extensions?.length &&
        !requirement.accept.extensions.some((extension) =>
          displayName.toLowerCase().endsWith(extension.toLowerCase()),
        )
      ) {
        throw new HostBridgeWorkflowResourceError(
          "workflow_resource_output_invalid",
          "output extension is not accepted",
          { slotId: outputArgs.slotId },
        );
      }
      if (
        requirement.accept?.contentTypes?.length &&
        !requirement.accept.contentTypes.includes(
          outputArgs.contentType || "application/octet-stream",
        )
      ) {
        throw new HostBridgeWorkflowResourceError(
          "workflow_resource_output_invalid",
          "output content type is not accepted",
          { slotId: outputArgs.slotId },
        );
      }
      const digest = await digestRuntimeFileSource(source);
      const descriptor = await registerHostBridgeWorkflowArtifactFile({
        localPath: allocation.path,
        workflowId: args.workflowId,
        displayName,
        contentType: outputArgs.contentType,
      });
      const ref: ResourceRef = {
        kind: "workflow_resource",
        id: `${runId}:output:${safeName(outputArgs.slotId, "slot")}:${outputs.length + 1}`,
      };
      const result: WorkflowResourceOutputDescriptor = {
        ref,
        slotId: outputArgs.slotId,
        ...descriptor,
        sizeBytes: source.size,
        sha256: digest.sha256,
        sourceKind: "workflow-artifact",
        downloadCommand: `zotero-bridge file download ${descriptor.fileId} --output ${descriptor.displayName}`,
      };
      const immutableResult = Object.freeze(result);
      outputs.push(immutableResult);
      allocations.delete(allocationId);
      allocationByPath.delete(allocation.path);
      return immutableResult;
    },
    listOutputs() {
      return outputs.map((output) => ({ ...output }));
    },
    resolveResource: resolveOwnedResource,
    async releaseResources(refs) {
      const released = refs
        .map((ref) => resourceFiles.get(ref.id))
        .filter((resource): resource is WorkflowResourceFile =>
          Boolean(resource?.ref?.id.includes(":materialized:")),
        );
      await materializedResources.releaseResources(refs);
      for (const resource of released) {
        if (resource.ref) resourceFiles.delete(resource.ref.id);
        materializedBytes = Math.max(
          0,
          materializedBytes - Number(resource.sizeBytes || 0),
        );
        const slotId = String(resource.slotId || "");
        materializedCountBySlot.set(
          slotId,
          Math.max(0, (materializedCountBySlot.get(slotId) || 0) - 1),
        );
      }
    },
    async cleanup() {
      for (const allocation of allocations.values()) {
        await removeRuntimePath(allocation.path).catch(() => false);
      }
      allocations.clear();
      allocationByPath.clear();
      if (outputs.length === 0) {
        await removeRuntimePath(outputRoot).catch(() => false);
      }
      await materializedResources.cleanup();
      materializedCountBySlot.clear();
      materializedBytes = 0;
      resourceFiles.clear();
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
