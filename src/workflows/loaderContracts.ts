import type { WorkflowManifest, WorkflowPackageManifest } from "./types";
import { PASS_THROUGH_BACKEND_TYPE } from "../config/defaults";
import Ajv, { type ErrorObject, type ValidateFunction } from "ajv/dist/2020";
import workflowManifestSchema from "../schemas/workflow.schema.json";
import workflowPackageManifestSchema from "../schemas/workflow-package.schema.json";

export type LoaderDiagnosticLevel = "warning" | "error";

export type LoaderDiagnosticCategory =
  | "manifest_parse_error"
  | "manifest_validation_error"
  | "hook_missing_error"
  | "hook_import_error"
  | "hook_export_error"
  | "scan_path_error"
  | "scan_runtime_warning";

export type LoaderDiagnostic = {
  level: LoaderDiagnosticLevel;
  category: LoaderDiagnosticCategory;
  message: string;
  entry?: string;
  workflowId?: string;
  path?: string;
  reason?: string;
};

export class WorkflowLoaderDiagnosticError extends Error {
  readonly category: LoaderDiagnosticCategory;

  readonly entry?: string;

  readonly workflowId?: string;

  readonly path?: string;

  readonly reason?: string;

  constructor(args: {
    category: LoaderDiagnosticCategory;
    message: string;
    entry?: string;
    workflowId?: string;
    path?: string;
    reason?: string;
  }) {
    super(args.message);
    this.name = "WorkflowLoaderDiagnosticError";
    this.category = args.category;
    this.entry = args.entry;
    this.workflowId = args.workflowId;
    this.path = args.path;
    this.reason = args.reason;
  }
}

const ajvLogger = {
  log: () => {},
  warn: () => {},
  error: () => {},
};
let validateWorkflowManifestSchema: ValidateFunction<WorkflowManifest> | null =
  null;
let validateWorkflowPackageManifestSchema:
  | ValidateFunction<WorkflowPackageManifest>
  | null = null;

function getWorkflowManifestValidator() {
  if (!validateWorkflowManifestSchema) {
    const ajv = new Ajv({
      allErrors: true,
      strict: true,
      $data: true,
      logger: ajvLogger,
    });
    validateWorkflowManifestSchema =
      ajv.compile<WorkflowManifest>(workflowManifestSchema);
  }
  return validateWorkflowManifestSchema;
}

function getWorkflowPackageManifestValidator() {
  if (!validateWorkflowPackageManifestSchema) {
    const ajv = new Ajv({
      allErrors: true,
      strict: true,
      $data: true,
      logger: ajvLogger,
    });
    validateWorkflowPackageManifestSchema =
      ajv.compile<WorkflowPackageManifest>(workflowPackageManifestSchema);
  }
  return validateWorkflowPackageManifestSchema;
}

function formatManifestValidationError(
  error: ErrorObject<string, Record<string, unknown>, unknown>,
) {
  const path = error.instancePath || "/";
  if (error.keyword === "required") {
    const missing = String(error.params?.missingProperty || "");
    return `${path} missing required property "${missing}"`;
  }
  if (error.keyword === "additionalProperties") {
    const additional = String(error.params?.additionalProperty || "");
    return `${path} unexpected property "${additional}"`;
  }
  if (error.keyword === "false schema") {
    return `${path} uses deprecated field`;
  }
  return `${path} ${error.message || "schema mismatch"}`;
}

function describeManifestValidationErrors(
  errors: ErrorObject<string, Record<string, unknown>, unknown>[] | null | undefined,
) {
  if (!errors || errors.length === 0) {
    return "manifest schema mismatch";
  }
  return errors.map(formatManifestValidationError).join("; ");
}

function validateSequenceManifestSemantics(manifest: WorkflowManifest) {
  if (
    String(manifest.request?.kind || "").trim() !== "skillrunner.sequence.v1"
  ) {
    return "";
  }
  const steps = manifest.request?.sequence?.steps || [];
  if (!Array.isArray(steps) || steps.length === 0) {
    return "/request/sequence/steps must be non-empty";
  }
  const finalStepId = String(manifest.result?.final_step_id || "").trim();
  if (!manifest.hooks.buildRequest && !finalStepId) {
    return "/result/final_step_id is required for skillrunner.sequence.v1";
  }
  const seen = new Set<string>();
  for (let index = 0; index < steps.length; index++) {
    const step = steps[index];
    const id = String(step?.id || "").trim();
    if (!id) {
      return `/request/sequence/steps/${index}/id must be non-empty`;
    }
    if (seen.has(id)) {
      return `/request/sequence/steps contains duplicated id: ${id}`;
    }
    seen.add(id);
  }
  if (finalStepId && !seen.has(finalStepId)) {
    return "/result/final_step_id must match a declared sequence step";
  }
  for (let index = 0; index < steps.length; index++) {
    const bindings = Array.isArray(steps[index]?.handoff?.bindings)
      ? steps[index]?.handoff?.bindings || []
      : [];
    for (let bindingIndex = 0; bindingIndex < bindings.length; bindingIndex++) {
      const fromStep = String(bindings[bindingIndex]?.step || "").trim();
      if (fromStep && !seen.has(fromStep)) {
        return `/request/sequence/steps/${index}/handoff/bindings/${bindingIndex}/step must match a declared sequence step`;
      }
    }
    const shortCircuit = steps[index]?.short_circuit;
    if (shortCircuit !== undefined) {
      const path = String(shortCircuit?.when?.path || "").trim();
      if (!path) {
        return `/request/sequence/steps/${index}/short_circuit/when/path must be non-empty`;
      }
      if (shortCircuit?.result !== "step_output") {
        return `/request/sequence/steps/${index}/short_circuit/result must be step_output`;
      }
    }
  }
  return "";
}

export function normalizeManifestProvider(manifest: WorkflowManifest) {
  const declared = String(manifest.provider || "").trim();
  if (declared) {
    manifest.provider = declared;
  }
  return manifest;
}

export function normalizeManifestInputTriggerDefaults(
  manifest: WorkflowManifest,
) {
  if (
    manifest.inputs?.unit === "workflow" &&
    manifest.trigger?.requiresSelection === undefined
  ) {
    manifest.trigger = {
      ...(manifest.trigger || {}),
      requiresSelection: false,
    };
  }
  if (manifest.trigger?.requiresSelection === false && !manifest.inputs) {
    manifest.inputs = { unit: "workflow" };
  }
  return manifest;
}

export function resolveBuildStrategy(manifest: WorkflowManifest) {
  if (manifest.hooks.buildRequest) {
    return "hook" as const;
  }
  if (manifest.request) {
    return "declarative" as const;
  }
  if (manifest.provider === PASS_THROUGH_BACKEND_TYPE) {
    return "declarative" as const;
  }
  return null;
}

export function parseWorkflowManifestFromText(args: {
  raw: string;
  manifestPath: string;
}) {
  let parsed: unknown;
  try {
    parsed = JSON.parse(args.raw);
  } catch (error) {
    return {
      manifest: null,
      diagnostic: createLoaderDiagnostic({
        level: "warning",
        category: "manifest_parse_error",
        message: `Invalid workflow manifest: ${args.manifestPath}`,
        path: args.manifestPath,
        reason: String(error),
      }),
    };
  }
  const validate = getWorkflowManifestValidator();
  if (!validate(parsed)) {
    return {
      manifest: null,
      diagnostic: createLoaderDiagnostic({
        level: "warning",
        category: "manifest_validation_error",
        message: `Invalid workflow manifest: ${args.manifestPath}`,
        path: args.manifestPath,
        reason: describeManifestValidationErrors(validate.errors),
      }),
    };
  }
  const semanticError = validateSequenceManifestSemantics(
    parsed as WorkflowManifest,
  );
  if (semanticError) {
    return {
      manifest: null,
      diagnostic: createLoaderDiagnostic({
        level: "warning",
        category: "manifest_validation_error",
        message: `Invalid workflow manifest: ${args.manifestPath}`,
        path: args.manifestPath,
        reason: semanticError,
      }),
    };
  }
  return {
    manifest: normalizeManifestInputTriggerDefaults(
      normalizeManifestProvider(parsed),
    ),
    diagnostic: null,
  };
}

export function parseWorkflowPackageManifestFromText(args: {
  raw: string;
  manifestPath: string;
}) {
  let parsed: unknown;
  try {
    parsed = JSON.parse(args.raw);
  } catch (error) {
    return {
      manifest: null,
      diagnostic: createLoaderDiagnostic({
        level: "warning",
        category: "manifest_parse_error",
        message: `Invalid workflow package manifest: ${args.manifestPath}`,
        path: args.manifestPath,
        reason: String(error),
      }),
    };
  }
  const validate = getWorkflowPackageManifestValidator();
  if (!validate(parsed)) {
    return {
      manifest: null,
      diagnostic: createLoaderDiagnostic({
        level: "warning",
        category: "manifest_validation_error",
        message: `Invalid workflow package manifest: ${args.manifestPath}`,
        path: args.manifestPath,
        reason: describeManifestValidationErrors(validate.errors),
      }),
    };
  }
  return {
    manifest: parsed,
    diagnostic: null,
  };
}

export function createLoaderDiagnostic(
  args: Omit<LoaderDiagnostic, "entry" | "workflowId" | "path" | "reason"> &
    Partial<Pick<LoaderDiagnostic, "entry" | "workflowId" | "path" | "reason">>,
): LoaderDiagnostic {
  return {
    level: args.level,
    category: args.category,
    message: args.message,
    entry: args.entry,
    workflowId: args.workflowId,
    path: args.path,
    reason: args.reason,
  };
}

function compareByString(a: string | undefined, b: string | undefined) {
  return String(a || "").localeCompare(String(b || ""));
}

export function sortLoaderDiagnostics(input: LoaderDiagnostic[]) {
  return [...input].sort((a, b) => {
    const byLevel = compareByString(a.level, b.level);
    if (byLevel !== 0) {
      return byLevel;
    }
    const byCategory = compareByString(a.category, b.category);
    if (byCategory !== 0) {
      return byCategory;
    }
    const byWorkflowId = compareByString(a.workflowId, b.workflowId);
    if (byWorkflowId !== 0) {
      return byWorkflowId;
    }
    const byEntry = compareByString(a.entry, b.entry);
    if (byEntry !== 0) {
      return byEntry;
    }
    const byPath = compareByString(a.path, b.path);
    if (byPath !== 0) {
      return byPath;
    }
    const byMessage = compareByString(a.message, b.message);
    if (byMessage !== 0) {
      return byMessage;
    }
    return compareByString(a.reason, b.reason);
  });
}

export function normalizeDirectoryEntries(entries: string[]) {
  return [...entries]
    .map((entry) => String(entry || "").trim())
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));
}

export function toDiagnosticFromUnknown(args: {
  error: unknown;
  fallback: LoaderDiagnostic;
}) {
  const typed = args.error as Partial<WorkflowLoaderDiagnosticError>;
  if (
    args.error instanceof Error &&
    typed.name === "WorkflowLoaderDiagnosticError" &&
    typeof typed.category === "string"
  ) {
    return createLoaderDiagnostic({
      level: "warning",
      category: typed.category as LoaderDiagnosticCategory,
      message: typed.message || args.fallback.message,
      entry: typed.entry || args.fallback.entry,
      workflowId: typed.workflowId || args.fallback.workflowId,
      path: typed.path || args.fallback.path,
      reason: typed.reason || args.fallback.reason,
    });
  }
  return createLoaderDiagnostic({
    ...args.fallback,
    reason: String(args.error),
  });
}
