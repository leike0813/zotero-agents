import { getBaseName } from "../utils/path";
import type {
  GenericHttpRequestV1,
  GenericHttpStepsRequestV1,
  PassThroughRunRequestV1,
  SkillRunnerJobRequestV1,
  SkillRunnerSequenceRequestV1,
} from "../providers/contracts";
import { PASS_THROUGH_REQUEST_KIND } from "../config/defaults";
import {
  assertRequestKindSupported,
  assertRequestPayloadContract,
} from "../providers/requestContracts";
import { canWorkflowRunWithoutSelection } from "./triggerPolicy";
import type { WorkflowManifest, WorkflowRequestSpec } from "./types";

type AttachmentLike = {
  filePath?: string | null;
  mimeType?: string | null;
  parent?: {
    id?: number | null;
    title?: string;
    data?: { title?: string };
  } | null;
  item?: {
    id?: number;
    key?: string;
    title?: string;
    parentItemID?: number | null;
    data?: {
      title?: string;
      contentType?: string;
    };
  };
};

type SelectionLike = {
  items?: {
    attachments?: AttachmentLike[];
    parents?: Array<{
      item?: { id?: number; title?: string; data?: { title?: string } };
    }>;
    children?: Array<{
      parent?: {
        id?: number | null;
        title?: string;
        data?: { title?: string };
      } | null;
      item?: { id?: number; title?: string; data?: { title?: string } };
    }>;
    notes?: Array<{
      parent?: {
        id?: number | null;
        title?: string;
        data?: { title?: string };
      } | null;
      item?: { id?: number; title?: string; data?: { title?: string } };
    }>;
  };
};

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function resolveDefaultWorkflowParams(manifest: WorkflowManifest) {
  const schemaMap = manifest.parameters || {};
  const defaults: Record<string, unknown> = {};
  for (const [key, schema] of Object.entries(schemaMap)) {
    if (typeof schema?.default === "undefined") {
      continue;
    }
    defaults[key] = schema.default;
  }
  return defaults;
}

function resolveWorkflowParams(args: {
  manifest: WorkflowManifest;
  executionOptions?: {
    workflowParams?: Record<string, unknown>;
  };
}) {
  return {
    ...resolveDefaultWorkflowParams(args.manifest),
    ...(args.executionOptions?.workflowParams &&
    isObject(args.executionOptions.workflowParams)
      ? args.executionOptions.workflowParams
      : {}),
  };
}

function getAttachmentMime(entry: AttachmentLike) {
  return (entry.mimeType || entry.item?.data?.contentType || "").toLowerCase();
}

function isMarkdownAttachment(entry: AttachmentLike) {
  const mime = getAttachmentMime(entry);
  if (mime === "text/markdown" || mime === "text/x-markdown") {
    return true;
  }
  const filePath = String(entry.filePath || "").toLowerCase();
  return filePath.endsWith(".md");
}

function isPdfAttachment(entry: AttachmentLike) {
  const mime = getAttachmentMime(entry);
  if (mime === "application/pdf") {
    return true;
  }
  const filePath = String(entry.filePath || "").toLowerCase();
  return filePath.endsWith(".pdf");
}

function resolveAttachmentBySelector(
  attachments: AttachmentLike[],
  selector: "selected.markdown" | "selected.pdf" | "selected.source",
) {
  const matched = attachments.filter((entry) => {
    if (selector === "selected.markdown") {
      return isMarkdownAttachment(entry);
    }
    if (selector === "selected.pdf") {
      return isPdfAttachment(entry);
    }
    return true;
  });
  if (matched.length !== 1) {
    throw new Error(
      `Selector ${selector} requires exactly 1 matched attachment, got ${matched.length}`,
    );
  }
  const path = String(matched[0].filePath || "").trim();
  if (!path) {
    throw new Error(
      `Selector ${selector} resolved attachment without filePath`,
    );
  }
  return path;
}

function resolveTargetParentID(selectionContext: unknown) {
  const selection = selectionContext as SelectionLike;
  const attachmentParentID = selection?.items?.attachments?.[0]?.parent?.id;
  if (attachmentParentID) {
    return attachmentParentID;
  }
  const selectedParentID = selection?.items?.parents?.[0]?.item?.id;
  if (selectedParentID) {
    return selectedParentID;
  }
  const childParentID = selection?.items?.children?.[0]?.parent?.id;
  if (childParentID) {
    return childParentID;
  }
  const childID = selection?.items?.children?.[0]?.item?.id;
  if (childID) {
    return childID;
  }
  const noteParentID = selection?.items?.notes?.[0]?.parent?.id;
  if (noteParentID) {
    return noteParentID;
  }
  const noteID = selection?.items?.notes?.[0]?.item?.id;
  if (noteID) {
    return noteID;
  }
  throw new Error("Cannot resolve target parent item from selection context");
}

function resolveOptionalTargetParentID(selectionContext: unknown) {
  try {
    return resolveTargetParentID(selectionContext);
  } catch {
    return null;
  }
}

function resolveDeclarativeTargetParentID(args: {
  selectionContext: unknown;
  manifest: WorkflowManifest;
}) {
  if (canWorkflowRunWithoutSelection(args.manifest)) {
    return resolveOptionalTargetParentID(args.selectionContext);
  }
  return resolveTargetParentID(args.selectionContext);
}

function resolveSelectionAttachments(selectionContext: unknown) {
  const selection = selectionContext as SelectionLike;
  return (selection?.items?.attachments || []).filter(Boolean);
}

function resolveSourceAttachmentPaths(attachments: AttachmentLike[]) {
  const paths = attachments
    .map((entry) => String(entry.filePath || "").trim())
    .filter(Boolean);
  return Array.from(new Set(paths));
}

function getFileStem(filePath: string) {
  const name = getBaseName(filePath);
  if (!name) {
    return "";
  }
  return name.replace(/\.[^.]+$/, "");
}

function normalizeTemplateKey(value: string) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "");
}

function compactRenderedTaskName(value: string) {
  return String(value || "")
    .replace(/\s+([:：])/g, "$1")
    .replace(/([:：])\s*$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function renderTaskNameTemplate(args: {
  manifest: WorkflowManifest;
  workflowParams: Record<string, unknown>;
  sourceAttachmentPaths: string[];
  targetParentID: number | null;
}) {
  const template = String(args.manifest.taskNameTemplate || "").trim();
  if (!template) {
    return "";
  }
  const sourceAttachmentPath = args.sourceAttachmentPaths[0] || "";
  const values: Record<string, unknown> = {
    workflowId: args.manifest.id,
    workflowLabel: args.manifest.label,
    targetParentID: args.targetParentID || "",
    sourceAttachmentPath,
    sourceAttachmentName: sourceAttachmentPath
      ? getBaseName(sourceAttachmentPath)
      : "",
    sourceAttachmentStem: sourceAttachmentPath
      ? getFileStem(sourceAttachmentPath)
      : "",
    ...args.workflowParams,
  };
  const normalizedValues = new Map<string, string>();
  for (const [key, value] of Object.entries(values)) {
    const normalizedKey = normalizeTemplateKey(key);
    if (!normalizedKey) {
      continue;
    }
    const renderedValue =
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
        ? String(value).trim()
        : "";
    normalizedValues.set(normalizedKey, renderedValue);
  }
  return compactRenderedTaskName(
    template.replace(/\{([^{}]+)\}/g, (_matched, rawKey) => {
      const key = String(rawKey || "").trim();
      if (Object.prototype.hasOwnProperty.call(values, key)) {
        const value = values[key];
        return typeof value === "string" ||
          typeof value === "number" ||
          typeof value === "boolean"
          ? String(value).trim()
          : "";
      }
      return normalizedValues.get(normalizeTemplateKey(key)) || "";
    }),
  );
}

function normalizeUploadRelativePath(value: string) {
  return String(value || "")
    .trim()
    .replace(/\\/g, "/")
    .replace(/^\.\/+/, "")
    .replace(/\/+/g, "/")
    .replace(/^\/+/, "");
}

function sanitizeUploadPathSegment(value: string) {
  const normalized = String(value || "")
    .trim()
    .replace(/[^A-Za-z0-9._-]+/g, "-");
  return normalized || "file";
}

function buildUploadRelativePath(fileKey: string, localPath: string) {
  const fileName = getBaseName(localPath) || "upload.bin";
  const keySegment = sanitizeUploadPathSegment(fileKey);
  return normalizeUploadRelativePath(`inputs/${keySegment}/${fileName}`);
}

function resolveSingleSourceAttachment(
  attachments: AttachmentLike[],
  sourceAttachmentPaths: string[],
) {
  const targetPath = sourceAttachmentPaths[0] || "";
  const matched = attachments.find(
    (entry) => String(entry.filePath || "").trim() === targetPath,
  );
  return matched || attachments[0] || null;
}

function resolveTaskName(args: {
  sourceAttachmentPaths: string[];
  selectionContext: unknown;
  targetParentID: number | null;
  manifest: WorkflowManifest;
  workflowParams: Record<string, unknown>;
}) {
  const templated = renderTaskNameTemplate(args);
  if (templated) {
    return templated;
  }
  if (args.sourceAttachmentPaths.length > 0) {
    return getBaseName(args.sourceAttachmentPaths[0]);
  }
  const selection = args.selectionContext as SelectionLike;
  const parentTitle =
    selection?.items?.attachments?.[0]?.parent?.title ||
    selection?.items?.attachments?.[0]?.parent?.data?.title ||
    selection?.items?.parents?.[0]?.item?.title ||
    selection?.items?.parents?.[0]?.item?.data?.title ||
    selection?.items?.children?.[0]?.parent?.title ||
    selection?.items?.children?.[0]?.parent?.data?.title ||
    selection?.items?.children?.[0]?.item?.title ||
    selection?.items?.children?.[0]?.item?.data?.title ||
    selection?.items?.notes?.[0]?.parent?.title ||
    selection?.items?.notes?.[0]?.parent?.data?.title ||
    selection?.items?.notes?.[0]?.item?.title ||
    selection?.items?.notes?.[0]?.item?.data?.title ||
    "";
  if (String(parentTitle || "").trim()) {
    return String(parentTitle).trim();
  }
  if (args.targetParentID) {
    return `item-${args.targetParentID}`;
  }
  return "task";
}

function buildSkillRunnerJobRequest(args: {
  selectionContext: unknown;
  manifest: WorkflowManifest;
  executionOptions?: {
    workflowParams?: Record<string, unknown>;
  };
}) {
  const request = args.manifest.request as WorkflowRequestSpec | undefined;
  if (!request) {
    throw new Error(`Workflow ${args.manifest.id} missing request declaration`);
  }
  const skillId = String(request.create?.skill_id || "").trim();
  if (!skillId) {
    throw new Error(
      `Workflow ${args.manifest.id} skillrunner.job.v1 requires request.create.skill_id`,
    );
  }
  const declaredSkillSource = String(request.create?.skill_source || "").trim();
  const skillSource =
    declaredSkillSource === "installed" ? "installed" : "local-package";
  const attachments = resolveSelectionAttachments(args.selectionContext);
  const targetParentID = resolveDeclarativeTargetParentID(args);
  const declaredFiles = request.input?.upload?.files || [];
  const declaredInput = isObject(request.input) ? request.input : null;
  const inlineInput = declaredInput
    ? Object.fromEntries(
        Object.entries(declaredInput).filter(([key]) => key !== "upload"),
      )
    : {};
  const keys = new Set<string>();
  const uploadFiles = declaredFiles.map((entry) => {
    if (!entry?.key || typeof entry.key !== "string") {
      throw new Error("request.input.upload.files[].key is required");
    }
    if (keys.has(entry.key)) {
      throw new Error(`Duplicated upload file key: ${entry.key}`);
    }
    keys.add(entry.key);
    if (Object.prototype.hasOwnProperty.call(inlineInput, entry.key)) {
      throw new Error(
        `request.input field conflict: ${entry.key} is declared by both inline input and upload selector`,
      );
    }
    const localPath = resolveAttachmentBySelector(
      attachments,
      entry.from as "selected.markdown" | "selected.pdf" | "selected.source",
    );
    inlineInput[entry.key] = buildUploadRelativePath(entry.key, localPath);
    return {
      key: entry.key,
      path: localPath,
    };
  });

  const sourceAttachmentPaths = resolveSourceAttachmentPaths(attachments);
  const workflowParams = resolveWorkflowParams({
    manifest: args.manifest,
    executionOptions: args.executionOptions,
  });
  const taskName = resolveTaskName({
    manifest: args.manifest,
    workflowParams,
    sourceAttachmentPaths,
    selectionContext: args.selectionContext,
    targetParentID,
  });
  const fetchType = args.manifest.result?.fetch?.type || "bundle";
  const requestPayload: SkillRunnerJobRequestV1 = {
    kind: "skillrunner.job.v1",
    taskName,
    sourceAttachmentPaths,
    skill_id: skillId,
    skill_source: skillSource,
    ...(uploadFiles.length > 0 ? { upload_files: uploadFiles } : {}),
    parameter: workflowParams,
    ...(Object.keys(inlineInput).length > 0 ? { input: inlineInput } : {}),
    poll: {
      interval_ms:
        request.poll?.interval_ms || args.manifest.execution?.poll_interval_ms,
      timeout_ms:
        request.poll?.timeout_ms || args.manifest.execution?.timeout_ms,
    },
    fetch_type: fetchType === "result" ? "result" : "bundle",
  };
  if (targetParentID) {
    requestPayload.targetParentID = targetParentID;
  }
  return requestPayload;
}

function cloneRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? { ...(value as Record<string, unknown>) }
    : {};
}

function buildSkillRunnerSequenceRequest(args: {
  selectionContext: unknown;
  manifest: WorkflowManifest;
  executionOptions?: {
    workflowParams?: Record<string, unknown>;
  };
}): SkillRunnerSequenceRequestV1 {
  const request = args.manifest.request as WorkflowRequestSpec | undefined;
  const steps = request?.sequence?.steps || [];
  if (!Array.isArray(steps) || steps.length === 0) {
    throw new Error(
      `Workflow ${args.manifest.id} skillrunner.sequence.v1 requires request.sequence.steps`,
    );
  }
  const provider = String(args.manifest.provider || "").trim();
  if (provider !== "acp" && provider !== "skillrunner") {
    throw new Error(
      `Workflow ${args.manifest.id} skillrunner.sequence.v1 requires provider=acp or provider=skillrunner`,
    );
  }
  const finalStepId = String(args.manifest.result?.final_step_id || "").trim();
  if (!finalStepId) {
    throw new Error(
      `Workflow ${args.manifest.id} skillrunner.sequence.v1 requires result.final_step_id`,
    );
  }
  const workflowParams = resolveWorkflowParams({
    manifest: args.manifest,
    executionOptions: args.executionOptions,
  });
  const targetParentID = resolveDeclarativeTargetParentID(args);
  const attachments = resolveSelectionAttachments(args.selectionContext);
  const sourceAttachmentPaths = resolveSourceAttachmentPaths(attachments);
  const taskName = resolveTaskName({
    manifest: args.manifest,
    workflowParams,
    sourceAttachmentPaths,
    selectionContext: args.selectionContext,
    targetParentID,
  });
  const payload: SkillRunnerSequenceRequestV1 = {
    kind: "skillrunner.sequence.v1",
    taskName,
    sourceAttachmentPaths,
    steps: steps.map((step) => ({
      id: String(step.id || "").trim(),
      skill_id: String(step.skill_id || "").trim(),
      ...(step.input ? { input: cloneRecord(step.input) } : {}),
      ...(step.parameter ? { parameter: cloneRecord(step.parameter) } : {}),
      ...(step.fetch_type ? { fetch_type: step.fetch_type } : {}),
      ...(step.workspace ? { workspace: step.workspace } : {}),
      ...(step.apply_result
        ? { apply_result: cloneRecord(step.apply_result) as any }
        : {}),
      ...(step.handoff ? { handoff: cloneRecord(step.handoff) as any } : {}),
      ...(step.short_circuit
        ? { short_circuit: cloneRecord(step.short_circuit) as any }
        : {}),
    })),
    final_step_id: finalStepId,
    parameter: workflowParams,
    poll: {
      interval_ms:
        request?.poll?.interval_ms || args.manifest.execution?.poll_interval_ms,
      timeout_ms:
        request?.poll?.timeout_ms || args.manifest.execution?.timeout_ms,
    },
  };
  if (targetParentID) {
    payload.targetParentID = targetParentID;
  }
  return payload;
}

function buildGenericHttpRequest(args: {
  selectionContext: unknown;
  manifest: WorkflowManifest;
  executionOptions?: {
    workflowParams?: Record<string, unknown>;
  };
}) {
  const requestSpec = args.manifest.request as {
    http?: {
      method?: string;
      path?: string;
      headers?: Record<string, string>;
      json?: unknown;
      timeout_ms?: number;
    };
  } | null;
  const http = requestSpec?.http || {};
  const method = String(http.method || "")
    .trim()
    .toUpperCase();
  const path = String(http.path || "").trim();
  if (!method || !path) {
    throw new Error(
      `Workflow ${args.manifest.id} generic-http.request.v1 requires request.http.method and request.http.path`,
    );
  }

  const attachments = resolveSelectionAttachments(args.selectionContext);
  const targetParentID = resolveDeclarativeTargetParentID(args);
  const sourceAttachmentPaths = resolveSourceAttachmentPaths(attachments);
  const workflowParams = resolveWorkflowParams({
    manifest: args.manifest,
    executionOptions: args.executionOptions,
  });
  const taskName = resolveTaskName({
    manifest: args.manifest,
    workflowParams,
    sourceAttachmentPaths,
    selectionContext: args.selectionContext,
    targetParentID,
  });
  const sharedPayload = {
    workflow_id: args.manifest.id,
    workflow_label: args.manifest.label,
    attachment_paths: sourceAttachmentPaths,
  };
  const targetParentPayload = targetParentID
    ? {
        target_parent_id: targetParentID,
      }
    : {};
  const payload = isObject(http.json)
    ? {
        ...sharedPayload,
        ...targetParentPayload,
        ...http.json,
      }
    : typeof http.json === "undefined"
      ? {
          ...sharedPayload,
          ...targetParentPayload,
        }
      : {
          ...sharedPayload,
          ...targetParentPayload,
          input: http.json,
        };

  const requestPayload: GenericHttpRequestV1 = {
    kind: "generic-http.request.v1",
    taskName,
    sourceAttachmentPaths,
    request: {
      method,
      path,
      ...(http.headers ? { headers: http.headers } : {}),
      json: payload,
    },
    timeout_ms:
      typeof http.timeout_ms === "number"
        ? http.timeout_ms
        : args.manifest.execution?.timeout_ms,
  };
  if (targetParentID) {
    requestPayload.targetParentID = targetParentID;
  }
  return requestPayload;
}

function buildPassThroughRequest(args: {
  selectionContext: unknown;
  manifest: WorkflowManifest;
  executionOptions?: {
    workflowParams?: Record<string, unknown>;
  };
}) {
  const attachments = resolveSelectionAttachments(args.selectionContext);
  const targetParentID = resolveOptionalTargetParentID(args.selectionContext);
  const sourceAttachmentPaths = resolveSourceAttachmentPaths(attachments);
  const workflowParams = resolveWorkflowParams({
    manifest: args.manifest,
    executionOptions: args.executionOptions,
  });
  const taskName = resolveTaskName({
    manifest: args.manifest,
    workflowParams,
    sourceAttachmentPaths,
    selectionContext: args.selectionContext,
    targetParentID,
  });

  const requestPayload: PassThroughRunRequestV1 = {
    kind: PASS_THROUGH_REQUEST_KIND,
    taskName,
    sourceAttachmentPaths,
    selectionContext: args.selectionContext,
    parameter: workflowParams,
  };
  if (targetParentID) {
    requestPayload.targetParentID = targetParentID;
  }
  return requestPayload;
}

function buildGenericHttpStepsRequest(args: {
  selectionContext: unknown;
  manifest: WorkflowManifest;
  executionOptions?: {
    workflowParams?: Record<string, unknown>;
  };
}) {
  const requestSpec = args.manifest.request as {
    steps?: unknown;
    poll?: {
      interval_ms?: number;
      timeout_ms?: number;
    };
    context?: Record<string, unknown>;
  } | null;
  const declaredSteps = Array.isArray(requestSpec?.steps)
    ? requestSpec?.steps || []
    : [];
  if (declaredSteps.length === 0) {
    throw new Error(
      `Workflow ${args.manifest.id} generic-http.steps.v1 requires request.steps[]`,
    );
  }

  const attachments = resolveSelectionAttachments(args.selectionContext);
  const targetParentID = resolveDeclarativeTargetParentID(args);
  const sourceAttachmentPaths = resolveSourceAttachmentPaths(attachments);
  const workflowParams = resolveWorkflowParams({
    manifest: args.manifest,
    executionOptions: args.executionOptions,
  });
  const taskName = resolveTaskName({
    manifest: args.manifest,
    workflowParams,
    sourceAttachmentPaths,
    selectionContext: args.selectionContext,
    targetParentID,
  });
  const sourceAttachment = resolveSingleSourceAttachment(
    attachments,
    sourceAttachmentPaths,
  );
  const sourceAttachmentPath = sourceAttachmentPaths[0] || "";

  const context: Record<string, unknown> = {
    ...workflowParams,
    workflow_id: args.manifest.id,
    workflow_label: args.manifest.label,
    source_attachment_path: sourceAttachmentPath,
    source_attachment_name: sourceAttachmentPath
      ? getBaseName(sourceAttachmentPath)
      : "",
    source_attachment_stem: sourceAttachmentPath
      ? getFileStem(sourceAttachmentPath)
      : "",
    source_attachment_item_id: sourceAttachment?.item?.id || null,
    source_attachment_item_key: sourceAttachment?.item?.key || "",
    ...(isObject(requestSpec?.context) ? requestSpec?.context || {} : {}),
  };
  if (targetParentID) {
    context.target_parent_id = targetParentID;
  }

  const requestPayload: GenericHttpStepsRequestV1 = {
    kind: "generic-http.steps.v1",
    taskName,
    sourceAttachmentPaths,
    context,
    steps: declaredSteps as GenericHttpStepsRequestV1["steps"],
    poll: {
      interval_ms:
        requestSpec?.poll?.interval_ms ||
        args.manifest.execution?.poll_interval_ms,
      timeout_ms:
        requestSpec?.poll?.timeout_ms || args.manifest.execution?.timeout_ms,
    },
  };
  if (targetParentID) {
    requestPayload.targetParentID = targetParentID;
  }
  return requestPayload;
}

export function compileDeclarativeRequest(args: {
  kind: string;
  selectionContext: unknown;
  manifest: WorkflowManifest;
  executionOptions?: {
    workflowParams?: Record<string, unknown>;
    providerOptions?: Record<string, unknown>;
  };
}) {
  const resolvedKind = assertRequestKindSupported(args.kind).requestKind;
  if (resolvedKind === "skillrunner.job.v1") {
    const request = buildSkillRunnerJobRequest(args);
    assertRequestPayloadContract({
      requestKind: resolvedKind,
      request,
    });
    return request;
  }
  if (resolvedKind === "skillrunner.sequence.v1") {
    const request = buildSkillRunnerSequenceRequest(args);
    assertRequestPayloadContract({
      requestKind: resolvedKind,
      request,
    });
    return request;
  }
  if (resolvedKind === "generic-http.request.v1") {
    const request = buildGenericHttpRequest(args);
    assertRequestPayloadContract({
      requestKind: resolvedKind,
      request,
    });
    return request;
  }
  if (resolvedKind === "generic-http.steps.v1") {
    const request = buildGenericHttpStepsRequest(args);
    assertRequestPayloadContract({
      requestKind: resolvedKind,
      request,
    });
    return request;
  }
  if (resolvedKind === PASS_THROUGH_REQUEST_KIND) {
    const request = buildPassThroughRequest(args);
    assertRequestPayloadContract({
      requestKind: resolvedKind,
      request,
    });
    return request;
  }
  throw new Error(`Unsupported declarative request kind: ${resolvedKind}`);
}
