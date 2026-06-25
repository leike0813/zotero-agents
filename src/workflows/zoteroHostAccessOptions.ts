import type { WorkflowManifest } from "./types";

export const AUTO_APPROVE_ZOTERO_WRITES_PARAM = "autoApproveZoteroWrites";
export const SKILLRUNNER_ZOTERO_HOST_ACCESS_STRIPPED_WARNING_CODE =
  "skillrunner_zotero_host_access_runtime_option_stripped";
export const SKILLRUNNER_ZOTERO_HOST_ACCESS_ENV_INJECTION_CODE =
  "skillrunner_zotero_host_access_env_injected";

// Temporary compatibility switch: current SkillRunner backend rejects
// runtime_options.zotero_host_access. Flip/remove this when SkillRunner gains
// native ZoteroHostAccess runtime option support.
export const SKILLRUNNER_SUPPORTS_ZOTERO_HOST_ACCESS_RUNTIME_OPTIONS = false;

export type WorkflowRunOptions = {
  zoteroHostAccess?: {
    autoApproveWrites?: boolean;
  };
};

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

export function workflowAllowsWriteApprovalBypass(
  manifest: WorkflowManifest | null | undefined,
) {
  const declaration = manifest?.execution?.zoteroHostAccess;
  return (
    isObject(declaration) && declaration.allowWriteApprovalBypass === true
  );
}

export function normalizeAutoApproveZoteroWrites(value: unknown) {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["1", "true", "yes", "on"].includes(normalized)) {
      return true;
    }
    if (["0", "false", "no", "off", ""].includes(normalized)) {
      return false;
    }
  }
  return false;
}

export function extractAutoApproveZoteroWrites(args: {
  manifest: WorkflowManifest;
  runOptions?: WorkflowRunOptions;
}) {
  if (!workflowAllowsWriteApprovalBypass(args.manifest)) {
    return false;
  }
  const runOptions = normalizeWorkflowRunOptions(args.runOptions);
  return normalizeAutoApproveZoteroWrites(
    runOptions.zoteroHostAccess?.autoApproveWrites,
  );
}

export function workflowDeclaresRequiredZoteroHostAccess(
  manifest: WorkflowManifest | null | undefined,
) {
  const declaration = manifest?.execution?.zoteroHostAccess;
  return isObject(declaration) && declaration.required === true;
}

export function resolveWorkflowZoteroHostAccessRequired(
  manifest: WorkflowManifest | null | undefined,
) {
  const declaration = manifest?.execution?.zoteroHostAccess;
  if (isObject(declaration) && typeof declaration.required === "boolean") {
    return declaration.required;
  }
  return true;
}

export function normalizeWorkflowRunOptions(value: unknown): WorkflowRunOptions {
  if (!isObject(value)) {
    return {};
  }
  const rawZoteroHostAccess = isObject(value.zoteroHostAccess)
    ? value.zoteroHostAccess
    : {};
  const autoApproveWrites = normalizeAutoApproveZoteroWrites(
    rawZoteroHostAccess.autoApproveWrites ??
      value.autoApproveWrites ??
      value[AUTO_APPROVE_ZOTERO_WRITES_PARAM],
  );
  return autoApproveWrites
    ? {
        zoteroHostAccess: {
          autoApproveWrites: true,
        },
      }
    : {};
}

export function buildWorkflowRunOptionsForUi(args: {
  manifest: WorkflowManifest;
  source?: WorkflowRunOptions;
}): WorkflowRunOptions {
  if (!workflowAllowsWriteApprovalBypass(args.manifest)) {
    return {};
  }
  return {
    zoteroHostAccess: {
      autoApproveWrites: normalizeAutoApproveZoteroWrites(
        args.source?.zoteroHostAccess?.autoApproveWrites,
      ),
    },
  };
}

export function stripZoteroHostAccessRuntimeParams(
  params: Record<string, unknown> | undefined,
) {
  if (!params || typeof params !== "object") {
    return params;
  }
  if (
    !Object.prototype.hasOwnProperty.call(
      params,
      AUTO_APPROVE_ZOTERO_WRITES_PARAM,
    )
  ) {
    return params;
  }
  const next = { ...params };
  delete next[AUTO_APPROVE_ZOTERO_WRITES_PARAM];
  return next;
}

export function buildZoteroHostAccessRuntimeOptions(args: {
  manifest: WorkflowManifest;
  runOptions?: WorkflowRunOptions;
}) {
  const required = resolveWorkflowZoteroHostAccessRequired(args.manifest);
  const autoApproveWrites = extractAutoApproveZoteroWrites({
    manifest: args.manifest,
    runOptions: args.runOptions,
  });
  return {
    required,
    ...(autoApproveWrites ? { auto_approve_writes: true } : {}),
  };
}

export function stripZoteroHostAccessRuntimeOptionFromRequest<T>(request: T): T {
  if (!isObject(request)) {
    return request;
  }
  const runtimeOptions = isObject(request.runtime_options)
    ? { ...request.runtime_options }
    : null;
  if (
    !runtimeOptions ||
    !Object.prototype.hasOwnProperty.call(runtimeOptions, "zotero_host_access")
  ) {
    return request;
  }
  delete runtimeOptions.zotero_host_access;
  const next = { ...request } as Record<string, unknown>;
  if (Object.keys(runtimeOptions).length > 0) {
    next.runtime_options = runtimeOptions;
  } else {
    delete next.runtime_options;
  }
  return next as T;
}
