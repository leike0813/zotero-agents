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
  | "scan_runtime_warning"
  | "skill_dependency_missing";

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
let validateWorkflowPackageManifestSchema: ValidateFunction<WorkflowPackageManifest> | null =
  null;

function getWorkflowManifestValidator() {
  if (!validateWorkflowManifestSchema) {
    const ajv = new Ajv({
      allErrors: true,
      strict: true,
      $data: true,
      logger: ajvLogger,
    });
    validateWorkflowManifestSchema = ajv.compile<WorkflowManifest>(
      workflowManifestSchema,
    );
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
  errors:
    | ErrorObject<string, Record<string, unknown>, unknown>[]
    | null
    | undefined,
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
  const hasBuildRequest = !!String(manifest.hooks?.buildRequest || "").trim();
  if (!Array.isArray(steps) || steps.length === 0) {
    if (hasBuildRequest) {
      return "";
    }
    return "/request/sequence/steps must be non-empty";
  }
  const finalStepId = String(manifest.result?.final_step_id || "").trim();
  if (!hasBuildRequest && !finalStepId) {
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

type CountRule = {
  min?: number;
  max?: number;
  exact?: number;
};

function countBounds(rule?: CountRule) {
  if (typeof rule?.exact === "number") {
    return { min: rule.exact, max: rule.exact };
  }
  return {
    min: typeof rule?.min === "number" ? rule.min : 0,
    max:
      typeof rule?.max === "number"
        ? rule.max
        : Number.POSITIVE_INFINITY,
  };
}

function validateCountRule(rule: CountRule | undefined, path: string) {
  if (!rule) {
    return "";
  }
  if (
    typeof rule.exact === "number" &&
    (typeof rule.min === "number" || typeof rule.max === "number")
  ) {
    return `${path}/exact is mutually exclusive with min and max`;
  }
  const bounds = countBounds(rule);
  if (bounds.min > bounds.max) {
    return `${path}/min must be less than or equal to max`;
  }
  return "";
}

function rangesOverlap(
  left: ReturnType<typeof countBounds>,
  right: ReturnType<typeof countBounds>,
) {
  return Math.max(left.min, right.min) <= Math.min(left.max, right.max);
}

function zeroAllowed(rule: CountRule | undefined) {
  const bounds = countBounds(rule);
  return bounds.min === 0;
}

function validateSelectionCountSemantics(manifest: WorkflowManifest) {
  const selection = manifest.validateSelection.require?.selection;
  const rules = selection?.counts || {};
  const entries = [
    ["parents", rules.parents],
    ["children", rules.children],
    ["attachments", rules.attachments],
    ["notes", rules.notes],
    ["total", rules.total],
  ] as const;
  for (const [name, rule] of entries) {
    const error = validateCountRule(
      rule,
      `/validateSelection/require/selection/counts/${name}`,
    );
    if (error) {
      return error;
    }
  }
  const candidateError = validateCountRule(
    manifest.validateSelection.require?.candidates,
    "/validateSelection/require/candidates",
  );
  if (candidateError) {
    return candidateError;
  }

  const itemRules = [
    rules.parents,
    rules.children,
    rules.attachments,
    rules.notes,
  ];
  const itemBounds = itemRules.map(countBounds);
  const totalBounds = countBounds(rules.total);
  const itemMin = itemBounds.reduce((sum, entry) => sum + entry.min, 0);
  const itemMax = itemBounds.reduce(
    (sum, entry) => sum + entry.max,
    0,
  );
  if (
    itemMin > totalBounds.max ||
    itemMax < totalBounds.min
  ) {
    return "/validateSelection/require/selection/counts has no satisfiable total";
  }

  if (selection?.allowMixed === false) {
    const requiredKinds = itemBounds.filter((entry) => entry.min > 0).length;
    if (requiredKinds > 1) {
      return "/validateSelection/require/selection disallows mixed input but requires multiple item kinds";
    }
    const hasSingleKindSolution = itemRules.some((rule, index) => {
      if (
        itemRules.some(
          (other, otherIndex) =>
            otherIndex !== index && !zeroAllowed(other),
        )
      ) {
        return false;
      }
      return rangesOverlap(countBounds(rule), totalBounds);
    });
    const hasEmptySolution =
      itemRules.every(zeroAllowed) && zeroAllowed(rules.total);
    if (!hasSingleKindSolution && !hasEmptySolution) {
      return "/validateSelection/require/selection has no satisfiable non-mixed solution";
    }
  }

  const emptySelectionAllowed =
    itemRules.every(zeroAllowed) && zeroAllowed(rules.total);
  if (
    manifest.trigger.requiresSelection === false &&
    !emptySelectionAllowed
  ) {
    return "/trigger/requiresSelection conflicts with positive selection lower bounds";
  }
  if (
    manifest.trigger.requiresSelection === true &&
    (totalBounds.max === 0 || itemMax === 0)
  ) {
    return "/trigger/requiresSelection conflicts with a zero-only selection total";
  }
  return "";
}

function validateInputPlanningSemantics(manifest: WorkflowManifest) {
  const countError = validateSelectionCountSemantics(manifest);
  if (countError) {
    return countError;
  }

  const memberKind = manifest.inputs.member.kind;
  const grouping = manifest.inputs.grouping.mode;
  const selector = manifest.validateSelection.select;
  const fixedSelectorKinds: Partial<
    Record<typeof selector.policy, typeof memberKind>
  > = {
    selection: "selection",
    "literature-source": "attachment",
    "generated-note-candidates": "generated-note",
    "digest-representative-image": "digest-image-target",
  };
  const selectorKind = fixedSelectorKinds[selector.policy] || memberKind;
  if (selectorKind !== memberKind) {
    return `/validateSelection/select policy ${selector.policy} produces ${selectorKind}, not ${memberKind}`;
  }
  if (
    selector.policy === "selection" &&
    (memberKind !== "selection" || grouping !== "all")
  ) {
    return "/validateSelection/select selection requires selection members grouped with all";
  }
  if (
    memberKind === "selection" &&
    selector.policy !== "selection"
  ) {
    return "/inputs/member selection requires the selection selector";
  }
  if (
    manifest.trigger.requiresSelection === false &&
    selector.policy !== "selection"
  ) {
    return "/trigger/requiresSelection false requires a selector that can produce an empty SelectionContext";
  }
  if (selector.policy === "selection") {
    const candidateBounds = countBounds(
      manifest.validateSelection.require?.candidates,
    );
    if (candidateBounds.min > 1 || candidateBounds.max < 1) {
      return "/validateSelection/require/candidates cannot accept the selection selector's single candidate";
    }
  }
  if (
    manifest.inputs.member.accepts?.mime &&
    memberKind !== "attachment"
  ) {
    return "/inputs/member/accepts/mime is only valid for attachment members";
  }

  for (let index = 0; index < manifest.validateSelection.filters.length; index++) {
    const filter = manifest.validateSelection.filters[index];
    const path = `/validateSelection/filters/${index}`;
    if (
      (filter.kind === "source-file-exists" ||
        filter.kind === "generated-note-kinds-absent" ||
        filter.kind === "generated-note-readiness" ||
        filter.kind === "artifact-absent") &&
      memberKind !== "attachment"
    ) {
      return `${path} requires attachment members`;
    }
    if (
      filter.kind === "candidates-per-parent" &&
      (memberKind === "selection" || memberKind === "digest-image-target")
    ) {
      return `${path} requires parent-addressable members`;
    }
    if (filter.kind === "artifact-absent" && filter.parameter) {
      if (filter.phase !== "execute") {
        return `${path}/parameter requires phase execute`;
      }
      if (!manifest.parameters?.[filter.parameter]) {
        return `${path}/parameter references an undeclared workflow parameter`;
      }
    }
  }
  return "";
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
  ) || validateInputPlanningSemantics(parsed as WorkflowManifest);
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
    manifest: normalizeManifestProvider(parsed),
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
