import type {
  ProviderExecutionResult,
  SkillRunnerHttpStepDefinition,
  SkillRunnerHttpStepsRequest,
  SkillRunnerJobRequestV1,
} from "../contracts";
import type { ProviderProgressEvent } from "../types";
import { appendRuntimeLog } from "../../modules/runtimeLogManager";
import { buildSkillRunnerSkillPackageBundle } from "./skillPackageBundler";
import {
  SkillRunnerHttpError,
  SkillRunnerTerminalRunError,
} from "./errors";
import {
  createMultipartZipPayload,
  createZipFromNamedFiles,
  type MultipartZipPart,
  type ZipFileEntry,
} from "./zipTransport";
import {
  buildTempBundlePath,
  removeFileIfExists,
  writeBytes,
} from "../../modules/workflowExecution/bundleIO";
import { ZipBundleReader } from "../../workflows/zipBundleReader";
import {
  isWaiting,
  normalizeStatus,
  normalizeStatusWithGuard,
} from "../../modules/skillRunnerProviderStateMachine";
import { delay } from "../../utils/runtimeCompatibility";

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;
type DynamicImport = (specifier: string) => Promise<any>;

const dynamicImport: DynamicImport = new Function(
  "specifier",
  "return import(specifier)",
) as DynamicImport;

function ensureLeadingSlash(input: string) {
  return input.startsWith("/") ? input : `/${input}`;
}

function interpolatePath(template: string, values: Record<string, string>) {
  return template.replace(
    /\{([^}]+)\}/g,
    (_, key: string) => values[key] || "",
  );
}

function resolveJsonPath(root: unknown, pathExpr: string) {
  if (!pathExpr.startsWith("$.")) {
    throw new Error(`Unsupported json path expression: ${pathExpr}`);
  }
  const parts = pathExpr.slice(2).split(".").filter(Boolean);
  let cursor: unknown = root;
  for (const part of parts) {
    if (!cursor || typeof cursor !== "object" || !(part in cursor)) {
      return undefined;
    }
    cursor = (cursor as Record<string, unknown>)[part];
  }
  return cursor;
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function toBooleanOption(value: unknown) {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["1", "true", "yes", "on"].includes(normalized)) {
      return true;
    }
    if (["0", "false", "no", "off"].includes(normalized)) {
      return false;
    }
  }
  return undefined;
}

function toPositiveIntegerOption(value: unknown) {
  const text = String(value ?? "").trim();
  if (!text) {
    return undefined;
  }
  const parsed = Number(text);
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed <= 0) {
    return undefined;
  }
  return parsed;
}

function normalizeExecutionMode(value: unknown): "auto" | "interactive" {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();
  return normalized === "interactive" ? "interactive" : "auto";
}

function normalizeString(value: unknown) {
  return String(value || "").trim();
}

function normalizeUploadRelativePath(value: unknown) {
  return String(value || "")
    .trim()
    .replace(/\\/g, "/")
    .replace(/^\.\/+/, "")
    .replace(/\/+/g, "/")
    .replace(/^\/+/, "");
}

function sanitizeResultNamespaceSegment(value: unknown) {
  return (
    normalizeString(value)
      .replace(/[^A-Za-z0-9._-]+/g, "-")
      .replace(/^-+|-+$/g, "") || "skill"
  );
}

function normalizeBundleEntryPath(value: unknown) {
  return normalizeString(value)
    .replace(/^file:\/\/+/, "")
    .replace(/\\/g, "/")
    .replace(/\/+/g, "/")
    .replace(/^\/+/, "")
    .split("/")
    .filter((segment) => segment && segment !== "." && segment !== "..")
    .join("/");
}

function parentBundleEntryPath(value: string) {
  const normalized = normalizeBundleEntryPath(value);
  if (!normalized) {
    return "";
  }
  const segments = normalized.split("/");
  segments.pop();
  return segments.join("/");
}

function collectResultJsonPathCandidates(args: {
  skillId?: string;
  responseJson?: unknown;
}) {
  const candidates: string[] = [];
  const seen = new Set<string>();
  const add = (value: unknown) => {
    const normalized = normalizeBundleEntryPath(value);
    if (!normalized || seen.has(normalized)) {
      return;
    }
    seen.add(normalized);
    candidates.push(normalized);
  };
  if (isObjectRecord(args.responseJson)) {
    add(args.responseJson.resultJsonPath);
    add(args.responseJson.result_json_path);
    for (const key of ["resultJsonPath", "result_json_path"]) {
      const raw = normalizeString(args.responseJson[key]);
      const lowered = raw.replace(/\\/g, "/").toLowerCase();
      const markerIndex = lowered.lastIndexOf("/result/");
      if (markerIndex >= 0) {
        add(raw.slice(markerIndex + 1));
      }
    }
  }
  const skillSegment = sanitizeResultNamespaceSegment(args.skillId);
  if (skillSegment) {
    for (let index = 1; index <= 20; index += 1) {
      add(`result/${skillSegment}.${index}/result.json`);
    }
  }
  add("result/result.json");
  return candidates;
}

function resolveWorkspaceDir(responseJson: unknown) {
  if (!isObjectRecord(responseJson)) {
    return "";
  }
  return (
    normalizeString(responseJson.workspaceDir) ||
    normalizeString(responseJson.workspace_dir)
  );
}

function ensureUploadRelativePath(args: { value: unknown; field: string }) {
  const normalized = normalizeUploadRelativePath(args.value);
  if (!normalized) {
    throw new Error(
      `SkillRunner upload mapping missing relative path for input field '${args.field}'`,
    );
  }
  if (/^[A-Za-z]:\//.test(normalized) || normalized.startsWith("/")) {
    throw new Error(
      `SkillRunner upload mapping for '${args.field}' must be relative path under uploads root`,
    );
  }
  if (normalized.startsWith("uploads/")) {
    throw new Error(
      `SkillRunner upload mapping for '${args.field}' must not include uploads/ prefix`,
    );
  }
  const segments = normalized.split("/").filter(Boolean);
  if (
    segments.length === 0 ||
    segments.some((segment) => segment === "." || segment === "..")
  ) {
    throw new Error(
      `SkillRunner upload mapping for '${args.field}' contains invalid path segments`,
    );
  }
  return segments.join("/");
}

function basename(filePath: string) {
  const normalized = filePath.replace(/\\/g, "/");
  const parts = normalized.split("/").filter(Boolean);
  return parts.length ? parts[parts.length - 1] : "upload.bin";
}

function resolveUploadEntriesFromRequest(request: SkillRunnerJobRequestV1) {
  const declaredFiles = Array.isArray(request.upload_files)
    ? request.upload_files
    : [];
  if (declaredFiles.length === 0) {
    return [] as Array<{ key: string; path: string }>;
  }
  if (!isObjectRecord(request.input)) {
    throw new Error(
      "SkillRunner request with upload_files requires input object mapping",
    );
  }
  const input = request.input as Record<string, unknown>;
  const seenTargets = new Set<string>();
  return declaredFiles.map((file, index) => {
    const fieldKey = String(file?.key || "").trim();
    const localPath = String(file?.path || "").trim();
    if (!fieldKey) {
      throw new Error(
        `SkillRunner upload_files[${index}].key must be non-empty string`,
      );
    }
    if (!localPath) {
      throw new Error(
        `SkillRunner upload_files[${index}].path must be non-empty string`,
      );
    }
    const targetPath = ensureUploadRelativePath({
      value: input[fieldKey],
      field: fieldKey,
    });
    if (seenTargets.has(targetPath)) {
      throw new Error(
        `SkillRunner upload target path duplicated for input mapping: ${targetPath}`,
      );
    }
    seenTargets.add(targetPath);
    return {
      key: targetPath,
      path: localPath,
    };
  });
}

async function readFileBytes(filePath: string) {
  const runtime = globalThis as {
    IOUtils?: { read: (targetPath: string) => Promise<Uint8Array> };
  };
  if (runtime.IOUtils && typeof runtime.IOUtils.read === "function") {
    return runtime.IOUtils.read(filePath);
  }
  const fs = await dynamicImport("fs/promises");
  const bytes = await fs.readFile(filePath);
  return new Uint8Array(bytes);
}

async function sleep(ms: number) {
  await delay(ms);
}

async function readJsonOrThrow(
  response: Response,
  args?: {
    path?: string;
    url?: string;
    prefix?: string;
  },
) {
  const text = await response.text();
  let body: unknown = {};
  if (text.length > 0) {
    try {
      body = JSON.parse(text);
    } catch {
      body = { raw: text };
    }
  }
  if (!response.ok) {
    throw new SkillRunnerHttpError({
      message: `${args?.prefix || "SkillRunner request failed"}: path=${args?.path || ""}, status=${response.status}, body=${JSON.stringify(body)}`,
      status: response.status,
      statusText: response.statusText,
      path: args?.path,
      url: args?.url,
      body,
    });
  }
  return body;
}

export class SkillRunnerClient {
  private readonly baseUrl: string;

  private readonly fetchImpl: FetchLike;

  constructor(args: { baseUrl: string; fetchImpl?: FetchLike }) {
    this.baseUrl = args.baseUrl.replace(/\/+$/, "");
    const globalFetch = (globalThis as { fetch?: FetchLike }).fetch;
    if (typeof args.fetchImpl === "function") {
      this.fetchImpl = args.fetchImpl;
    } else if (typeof globalFetch === "function") {
      this.fetchImpl = globalFetch.bind(globalThis);
    } else {
      throw new Error("fetch() is unavailable in current runtime");
    }
  }

  private appendTransportLog(args: {
    level: "debug" | "info" | "warn" | "error";
    stage: string;
    message: string;
    method?: string;
    path?: string;
    url?: string;
    status?: number;
    duration?: number;
    retry?: number;
    stepId?: string;
    requestId?: string;
    phase?: string;
    details?: unknown;
    error?: unknown;
  }) {
    appendRuntimeLog({
      level: args.level,
      scope: "provider",
      providerId: "skillrunner",
      requestId: args.requestId,
      component: "skillrunner-client",
      operation: "http",
      phase: args.phase || "running",
      stage: args.stage,
      message: args.message,
      transport: {
        method: args.method,
        path: args.path,
        url: args.url,
        status: args.status,
        duration: args.duration,
        retry: args.retry,
        stepId: args.stepId,
      },
      details: args.details,
      error: args.error,
    });
  }

  private buildUrl(path: string) {
    return `${this.baseUrl}${ensureLeadingSlash(path)}`;
  }

  private findStep(request: SkillRunnerHttpStepsRequest, stepId: string) {
    return request.steps.find((step) => step.id === stepId);
  }

  private async executeCreateStep(step: SkillRunnerHttpStepDefinition) {
    const url = this.buildUrl(step.request.path);
    const startedAt = Date.now();
    const response = await this.fetchImpl(url, {
      method: step.request.method,
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(step.request.json || {}),
    });
    this.appendTransportLog({
      level: response.ok ? "debug" : "error",
      stage: "provider-http-create-response",
      message: "skillrunner create step responded",
      method: step.request.method,
      path: step.request.path,
      url,
      status: response.status,
      duration: Date.now() - startedAt,
      stepId: step.id,
    });
    const body = await readJsonOrThrow(response, {
      path: step.request.path,
      url,
      prefix: "SkillRunner create step failed",
    });
    const pathExpr = step.extract?.request_id || "$.request_id";
    const requestId = resolveJsonPath(body, pathExpr);
    if (typeof requestId !== "string" || requestId.length === 0) {
      throw new Error(`request_id not found from create step by ${pathExpr}`);
    }
    return requestId;
  }

  private async executeUploadStep(
    step: SkillRunnerHttpStepDefinition,
    requestId: string,
  ) {
    const files = step.files || [];
    const zipParts: MultipartZipPart[] = [];
    if (step.skillPackage) {
      zipParts.push({
        fieldName: "skill_package",
        filename: step.skillPackage.filename || "skill_package.zip",
        zipBytes: step.skillPackage.zipBytes,
      });
    }
    const zipEntries: ZipFileEntry[] = [];
    for (const file of files) {
      const bytes = await readFileBytes(file.path);
      zipEntries.push({
        name: file.key,
        data: bytes,
      });
    }
    if (zipEntries.length > 0) {
      zipParts.push({
        fieldName: "file",
        filename: "inputs.zip",
        zipBytes: createZipFromNamedFiles(zipEntries),
      });
    }
    if (zipParts.length === 0) {
      throw new Error("SkillRunner upload step requires at least one zip part");
    }
    const runtime = globalThis as {
      FormData?: new () => {
        append: (name: string, value: unknown, filename?: string) => void;
      };
      Blob?: new (
        blobParts?: Array<BlobPart>,
        options?: BlobPropertyBag,
      ) => Blob;
    };
    const canUseNativeFormData =
      typeof runtime.FormData === "function" &&
      typeof runtime.Blob === "function";

    let body: BodyInit;
    let headers: Record<string, string> | undefined;
    if (canUseNativeFormData) {
      const form = new runtime.FormData!();
      for (const part of zipParts) {
        form.append(
          part.fieldName,
          new runtime.Blob!([part.zipBytes]),
          part.filename,
        );
      }
      body = form as unknown as BodyInit;
    } else {
      const multipart = createMultipartZipPayload(zipParts);
      headers = {
        "content-type": multipart.contentType,
      };
      body = multipart.body;
    }

    const path = interpolatePath(step.request.path, { request_id: requestId });
    const url = this.buildUrl(path);
    const startedAt = Date.now();
    const response = await this.fetchImpl(url, {
      method: step.request.method,
      headers,
      body,
    });
    this.appendTransportLog({
      level: response.ok ? "debug" : "error",
      stage: "provider-http-upload-response",
      message: "skillrunner upload step responded",
      method: step.request.method,
      path,
      url,
      status: response.status,
      duration: Date.now() - startedAt,
      stepId: step.id,
      requestId,
      details: {
        multipart: true,
        fields: zipParts.map((part) => part.fieldName),
      },
    });
    await readJsonOrThrow(response, {
      path,
      url,
      prefix: "SkillRunner upload step failed",
    });
  }

  private async executePollStep(
    request: SkillRunnerHttpStepsRequest,
    step: SkillRunnerHttpStepDefinition,
    requestId: string,
  ) {
    const timeoutAnchorAt = Date.now();
    const intervalMs = Math.max(0, request.poll?.interval_ms ?? 2000);
    const timeoutRaw = request.poll?.timeout_ms;
    const timeoutMs =
      typeof timeoutRaw === "number" && Number.isFinite(timeoutRaw)
        ? timeoutRaw
        : 600000;
    const timeoutEnabled = timeoutMs > 0;
    let pollRetry = 0;
    while (true) {
      const pollStartedAt = Date.now();
      const body = await this.getJobState({
        requestPath: step.request.path,
        requestMethod: step.request.method,
        requestId,
      });
      const status = normalizeStatus(body.status, "running");
      if (status === "succeeded") {
        return body;
      }
      if (status === "failed" || status === "canceled") {
        const normalizedRequestId = String(
          body.request_id || requestId || "",
        ).trim();
        const terminalStatus = String(status || "unknown").trim() || "unknown";
        const terminalError =
          String(body.error || "").trim() || "unknown error";
        throw new SkillRunnerTerminalRunError({
          requestId: normalizedRequestId,
          status,
          error: terminalError,
        });
      }
      if (timeoutEnabled && Date.now() - timeoutAnchorAt > timeoutMs) {
        throw new Error(`SkillRunner polling timeout after ${timeoutMs}ms`);
      }
      if (isWaiting(status)) {
        this.appendTransportLog({
          level: "debug",
          stage: "provider-http-poll-waiting",
          message: `skillrunner poll waiting: ${status}`,
          method: step.request.method,
          path: step.request.path,
          requestId,
          duration: Date.now() - pollStartedAt,
          retry: pollRetry,
          stepId: step.id,
          details: {
            status,
          },
        });
        pollRetry += 1;
        await sleep(intervalMs);
        continue;
      }
      pollRetry += 1;
      await sleep(intervalMs);
    }
  }

  private async getJobState(args: {
    requestPath: string;
    requestMethod: string;
    requestId: string;
  }) {
    const path = interpolatePath(args.requestPath, {
      request_id: args.requestId,
    });
    const url = this.buildUrl(path);
    const startedAt = Date.now();
    const response = await this.fetchImpl(url, {
      method: args.requestMethod,
    });
    this.appendTransportLog({
      level: response.ok ? "debug" : "error",
      stage: "provider-http-get-state-response",
      message: "skillrunner get-state responded",
      method: args.requestMethod,
      path,
      url,
      status: response.status,
      duration: Date.now() - startedAt,
      requestId: args.requestId,
      stepId: "poll",
    });
    return (await readJsonOrThrow(response, {
      path,
      url,
      prefix: "SkillRunner get-state failed",
    })) as {
      request_id?: string;
      status?: string;
      error?: string;
      [key: string]: unknown;
    };
  }

  private async executeBundleStep(
    step: SkillRunnerHttpStepDefinition,
    requestId: string,
  ) {
    const path = interpolatePath(step.request.path, { request_id: requestId });
    const url = this.buildUrl(path);
    const startedAt = Date.now();
    const response = await this.fetchImpl(url, {
      method: step.request.method,
    });
    this.appendTransportLog({
      level: response.ok ? "debug" : "error",
      stage: "provider-http-bundle-response",
      message: "skillrunner bundle fetch responded",
      method: step.request.method,
      path,
      url,
      status: response.status,
      duration: Date.now() - startedAt,
      requestId,
      stepId: step.id,
    });
    if (!response.ok) {
      const text = await response.text();
      throw new SkillRunnerHttpError({
        message: `Bundle fetch failed: path=${path}, status=${response.status}, body=${text}`,
        status: response.status,
        statusText: response.statusText,
        path,
        url,
        body: text,
      });
    }
    const data = await response.arrayBuffer();
    return new Uint8Array(data);
  }

  private async normalizeBundleTerminalResult(args: {
    requestId: string;
    skillId?: string;
    bundleBytes: Uint8Array;
    responseJson?: unknown;
  }) {
    const bundlePath = buildTempBundlePath(args.requestId);
    await writeBytes(bundlePath, args.bundleBytes);
    const bundleReader = new ZipBundleReader(bundlePath);
    const candidates = collectResultJsonPathCandidates({
      skillId: args.skillId,
      responseJson: args.responseJson,
    });
    try {
      const errors: string[] = [];
      for (const candidate of candidates) {
        try {
          const text = await bundleReader.readText(candidate);
          return {
            resultJson: JSON.parse(text),
            resultJsonPath: candidate,
            resultArtifactBasePath: parentBundleEntryPath(candidate),
            workspaceDir: resolveWorkspaceDir(args.responseJson) || undefined,
          };
        } catch (error) {
          errors.push(
            `${candidate}: ${
              error instanceof Error ? error.message : String(error)
            }`,
          );
        }
      }
      throw new Error(
        `SkillRunner bundle result JSON not found for request ${args.requestId}; candidates=${JSON.stringify(candidates)}; errors=${JSON.stringify(errors.slice(0, 5))}`,
      );
    } finally {
      await removeFileIfExists(bundlePath);
    }
  }

  private async executeResultStep(
    step: SkillRunnerHttpStepDefinition,
    requestId: string,
  ) {
    const path = interpolatePath(step.request.path, { request_id: requestId });
    const url = this.buildUrl(path);
    const startedAt = Date.now();
    const response = await this.fetchImpl(url, {
      method: step.request.method,
    });
    this.appendTransportLog({
      level: response.ok ? "debug" : "error",
      stage: "provider-http-result-response",
      message: "skillrunner result fetch responded",
      method: step.request.method,
      path,
      url,
      status: response.status,
      duration: Date.now() - startedAt,
      requestId,
      stepId: step.id,
    });
    return readJsonOrThrow(response, {
      path,
      url,
      prefix: "SkillRunner result fetch failed",
    });
  }

  async getRunState(args: { requestId: string }) {
    const requestId = String(args.requestId || "").trim();
    if (!requestId) {
      throw new Error("requestId is required");
    }
    return this.getJobState({
      requestPath: "/v1/jobs/{request_id}",
      requestMethod: "GET",
      requestId,
    });
  }

  async getRunPending(args: { requestId: string }) {
    const requestId = String(args.requestId || "").trim();
    if (!requestId) {
      throw new Error("requestId is required");
    }
    return this.getJobState({
      requestPath: "/v1/jobs/{request_id}/interaction/pending",
      requestMethod: "GET",
      requestId,
    });
  }

  async fetchRunBundle(args: { requestId: string }) {
    const requestId = String(args.requestId || "").trim();
    if (!requestId) {
      throw new Error("requestId is required");
    }
    return this.executeBundleStep(
      {
        id: "bundle",
        request: {
          method: "GET",
          path: "/v1/jobs/{request_id}/bundle",
        },
      },
      requestId,
    );
  }

  async fetchRunResult(args: { requestId: string }) {
    const requestId = String(args.requestId || "").trim();
    if (!requestId) {
      throw new Error("requestId is required");
    }
    return this.executeResultStep(
      {
        id: "result",
        request: {
          method: "GET",
          path: "/v1/jobs/{request_id}/result",
        },
      },
      requestId,
    );
  }

  private async toHttpStepsRequest(
    request: SkillRunnerJobRequestV1,
    providerOptions: Record<string, unknown>,
  ): Promise<SkillRunnerHttpStepsRequest> {
    const engine = String(providerOptions.engine || "").trim();
    const providerId = String(
      providerOptions.provider_id || providerOptions.model_provider || "",
    ).trim();
    const model = String(providerOptions.model || "").trim();
    const effort = String(providerOptions.effort || "").trim() || "default";
    const runtimeOptions: Record<string, unknown> = isObjectRecord(
      request.runtime_options,
    )
      ? { ...request.runtime_options }
      : {};
    const executionMode = normalizeExecutionMode(runtimeOptions.execution_mode);
    runtimeOptions.execution_mode = executionMode;
    if (executionMode === "interactive") {
      delete runtimeOptions.no_cache;
    } else {
      delete runtimeOptions.interactive_auto_reply;
    }
    if (
      executionMode === "auto" &&
      (providerOptions.no_cache === true ||
        String(providerOptions.no_cache || "").toLowerCase() === "true")
    ) {
      runtimeOptions.no_cache = true;
    }
    if (executionMode === "interactive") {
      const interactiveAutoReply = toBooleanOption(
        providerOptions.interactive_auto_reply,
      );
      if (typeof interactiveAutoReply === "boolean") {
        runtimeOptions.interactive_auto_reply = interactiveAutoReply;
      }
    }
    const hardTimeoutSeconds = toPositiveIntegerOption(
      providerOptions.hard_timeout_seconds,
    );
    if (typeof hardTimeoutSeconds === "number") {
      runtimeOptions.hard_timeout_seconds = hardTimeoutSeconds;
    } else {
      delete runtimeOptions.hard_timeout_seconds;
    }
    const fetchType = request.fetch_type === "result" ? "result" : "bundle";
    const uploadFiles = resolveUploadEntriesFromRequest(request);
    const skillSource =
      request.skill_source === "installed" ? "installed" : "local-package";
    const skillPackage =
      skillSource === "local-package"
        ? await buildSkillRunnerSkillPackageBundle({
            skillId: request.skill_id,
          })
        : null;
    const createJson = {
      ...(skillSource === "installed"
        ? { skill_id: request.skill_id }
        : { skill_source: "temp_upload" }),
      ...(engine ? { engine } : {}),
      ...(providerId ? { provider_id: providerId } : {}),
      ...(model ? { model } : {}),
      effort,
      ...(request.input ? { input: request.input } : {}),
      parameter: request.parameter || {},
      ...(Object.keys(runtimeOptions).length > 0
        ? { runtime_options: runtimeOptions }
        : {}),
    };
    const steps: SkillRunnerHttpStepDefinition[] = [
      {
        id: "create",
        request: {
          method: "POST",
          path: "/v1/jobs",
          json: createJson,
        },
        extract: {
          request_id: "$.request_id",
        },
      },
    ];
    if (skillPackage || uploadFiles.length > 0) {
      steps.push({
        id: "upload",
        request: {
          method: "POST",
          path: "/v1/jobs/{request_id}/upload",
          multipart: true,
        },
        ...(skillPackage
          ? {
              skillPackage: {
                filename: "skill_package.zip",
                zipBytes: skillPackage.zipBytes,
              },
            }
          : {}),
        files: uploadFiles,
      });
    }
    steps.push(
      {
        id: "poll",
        request: {
          method: "GET",
          path: "/v1/jobs/{request_id}",
        },
        repeat_until: "status in ['succeeded','failed','canceled']",
      },
      {
        id: fetchType,
        request: {
          method: "GET",
          path:
            fetchType === "result"
              ? "/v1/jobs/{request_id}/result"
              : "/v1/jobs/{request_id}/bundle",
        },
      },
    );
    return {
      kind: "http.steps",
      targetParentID: request.targetParentID,
      taskName: request.taskName,
      sourceAttachmentPaths: request.sourceAttachmentPaths,
      steps,
      poll: {
        interval_ms: request.poll?.interval_ms,
        timeout_ms: request.poll?.timeout_ms,
      },
    };
  }

  async executeHttpSteps(
    request: SkillRunnerHttpStepsRequest,
    options?: {
      onProgress?: (event: ProviderProgressEvent) => void;
      skillId?: string;
    },
  ): Promise<ProviderExecutionResult> {
    if (request.kind !== "http.steps") {
      throw new Error(`Unsupported transport request kind: ${request.kind}`);
    }

    const createStep = this.findStep(request, "create");
    const uploadStep = this.findStep(request, "upload");
    const pollStep = this.findStep(request, "poll");
    const bundleStep = this.findStep(request, "bundle");
    const resultStep = this.findStep(request, "result");
    if (!createStep || !pollStep) {
      throw new Error("http.steps request missing create/poll step");
    }
    if (!bundleStep && !resultStep) {
      throw new Error(
        "http.steps request missing terminal fetch step (bundle or result)",
      );
    }

    const requestId = await this.executeCreateStep(createStep);
    options?.onProgress?.({
      type: "request-created",
      requestId,
    });
    if (uploadStep) {
      await this.executeUploadStep(uploadStep, requestId);
    }
    options?.onProgress?.({
      type: "request-ready",
      requestId,
    });
    const pollResult = await this.executePollStep(request, pollStep, requestId);
    if (bundleStep) {
      const bundleBytes = await this.executeBundleStep(bundleStep, requestId);
      const normalized = await this.normalizeBundleTerminalResult({
        requestId,
        skillId: options?.skillId,
        bundleBytes,
        responseJson: pollResult,
      });
      return {
        status: "succeeded",
        requestId,
        fetchType: "bundle",
        bundleBytes,
        resultJson: normalized.resultJson,
        resultJsonPath: normalized.resultJsonPath,
        workspaceDir: normalized.workspaceDir,
        resultArtifactBasePath: normalized.resultArtifactBasePath,
        responseJson: pollResult,
      };
    }
    const resultJson = await this.executeResultStep(resultStep!, requestId);
    return {
      status: "succeeded",
      requestId,
      fetchType: "result",
      resultJson,
      responseJson: pollResult,
    };
  }

  async executeSkillRunnerJob(
    request: SkillRunnerJobRequestV1,
    providerOptions: Record<string, unknown>,
    options?: {
      onProgress?: (event: ProviderProgressEvent) => void;
    },
  ): Promise<ProviderExecutionResult> {
    const httpStepsRequest = await this.toHttpStepsRequest(
      request,
      providerOptions,
    );
    const executionMode = String(
      request.runtime_options?.execution_mode || "",
    ).trim();
    if (executionMode !== "interactive") {
      return this.executeHttpSteps(httpStepsRequest, {
        ...options,
        skillId: request.skill_id,
      });
    }

    const createStep = this.findStep(httpStepsRequest, "create");
    const uploadStep = this.findStep(httpStepsRequest, "upload");
    const pollStep = this.findStep(httpStepsRequest, "poll");
    const bundleStep = this.findStep(httpStepsRequest, "bundle");
    const resultStep = this.findStep(httpStepsRequest, "result");
    if (!createStep || !pollStep) {
      throw new Error("http.steps request missing create/poll step");
    }
    if (!bundleStep && !resultStep) {
      throw new Error(
        "http.steps request missing terminal fetch step (bundle or result)",
      );
    }

    const requestId = await this.executeCreateStep(createStep);
    options?.onProgress?.({
      type: "request-created",
      requestId,
    });
    if (uploadStep) {
      await this.executeUploadStep(uploadStep, requestId);
    }
    options?.onProgress?.({
      type: "request-ready",
      requestId,
    });

    const runState = await this.getJobState({
      requestPath: pollStep.request.path,
      requestMethod: pollStep.request.method,
      requestId,
    });
    const backendStatus = normalizeStatusWithGuard({
      value: runState.status,
      fallback: "running",
      requestId,
    }).status;
    if (backendStatus === "failed" || backendStatus === "canceled") {
      const terminalError =
        String(runState.error || "").trim() || "unknown error";
      throw new SkillRunnerTerminalRunError({
        requestId,
        status: backendStatus,
        error: terminalError,
      });
    }
    if (backendStatus === "succeeded") {
      if (bundleStep) {
        const bundleBytes = await this.executeBundleStep(bundleStep, requestId);
        const normalized = await this.normalizeBundleTerminalResult({
          requestId,
          skillId: request.skill_id,
          bundleBytes,
          responseJson: runState,
        });
        return {
          status: "succeeded" as const,
          requestId,
          fetchType: "bundle" as const,
          bundleBytes,
          resultJson: normalized.resultJson,
          resultJsonPath: normalized.resultJsonPath,
          workspaceDir: normalized.workspaceDir,
          resultArtifactBasePath: normalized.resultArtifactBasePath,
          responseJson: runState,
        };
      }
      const resultJson = await this.executeResultStep(resultStep!, requestId);
      return {
        status: "succeeded" as const,
        requestId,
        fetchType: "result" as const,
        resultJson,
        responseJson: runState,
      };
    }

    return {
      status: "deferred" as const,
      requestId,
      fetchType: (bundleStep ? "bundle" : "result") as "bundle" | "result",
      backendStatus: isWaiting(backendStatus)
        ? backendStatus
        : backendStatus === "queued"
          ? "queued"
          : "running",
      responseJson: runState,
    };
  }
}
