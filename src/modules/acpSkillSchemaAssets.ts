import Ajv, { type ErrorObject } from "ajv";
import Ajv2020 from "ajv/dist/2020";
import { getBaseName, joinPath, normalizeNativeLocalPath } from "../utils/path";
import type { AcpSkillRunRequestV1 } from "../providers/contracts";
import skillInputSchemaMetaSchema from "../schemas/skill/skill_input_schema.schema.json";
import skillOutputSchemaMetaSchema from "../schemas/skill/skill_output_schema.schema.json";
import skillParameterSchemaMetaSchema from "../schemas/skill/skill_parameter_schema.schema.json";
import skillRunnerManifestMetaSchema from "../schemas/skill/skill_runner_manifest.schema.json";
import {
  readRuntimeTextFile,
  runtimePathExists,
  statRuntimePath,
} from "./runtimePersistence";

export type AcpSkillSchemaKey = "input" | "parameter" | "output";

export type AcpSkillAssetResolutionIssueCode =
  | "missing_declaration"
  | "empty_declaration"
  | "invalid_declaration_type"
  | "absolute_path"
  | "path_escape"
  | "target_not_found";

export type AcpSkillAssetResolution = {
  path?: string;
  declaredRelpath?: string;
  fallbackRelpath?: string;
  usedFallback: boolean;
  issueCode?: AcpSkillAssetResolutionIssueCode;
  issueSource: "declared" | "fallback" | "none";
};

export type AcpSkillRunSchemaValidationResult = {
  ok: boolean;
  errors: string[];
  inputContext: Record<string, unknown>;
  parameterContext: Record<string, unknown>;
  inputSchemaPath?: string;
  parameterSchemaPath?: string;
};

function normalizeString(value: unknown) {
  return String(value || "").trim();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function normalizeSlashes(value: string) {
  return normalizeString(value).replace(/\\/g, "/");
}

function isAbsolutePath(value: string) {
  const normalized = normalizeSlashes(value);
  return /^[A-Za-z]:\//.test(normalized) || normalized.startsWith("/");
}

function isUploadRelativePath(value: string) {
  const normalized = normalizeSlashes(value).replace(/^\.\/+/, "");
  return (
    normalized === "inputs" ||
    normalized.startsWith("inputs/") ||
    normalized === "uploads" ||
    normalized.startsWith("uploads/")
  );
}

function splitSafeRelativePath(value: string) {
  const normalized = normalizeSlashes(value);
  const parts = normalized.split("/").filter((part) => part && part !== ".");
  if (parts.some((part) => part === "..")) {
    return null;
  }
  return parts;
}

async function resolveRelativeFile(args: {
  skillDir: string;
  relpath: string;
}): Promise<{
  path?: string;
  issueCode?: AcpSkillAssetResolutionIssueCode;
}> {
  const relpath = normalizeString(args.relpath);
  if (!relpath) {
    return { issueCode: "empty_declaration" };
  }
  if (isAbsolutePath(relpath)) {
    return { issueCode: "absolute_path" };
  }
  const parts = splitSafeRelativePath(relpath);
  if (!parts) {
    return { issueCode: "path_escape" };
  }
  const path = joinPath(args.skillDir, ...parts);
  const stat = await statRuntimePath(path);
  if (!stat.exists || stat.isDir) {
    return { issueCode: "target_not_found" };
  }
  return { path };
}

export async function resolveAcpSkillSchemaAsset(args: {
  skillDir: string;
  runnerJson: Record<string, unknown>;
  schemaKey: AcpSkillSchemaKey;
}): Promise<AcpSkillAssetResolution> {
  const fallbackRelpath = `assets/${args.schemaKey}.schema.json`;
  let declaredRelpath: string | undefined;
  let declaredIssue: AcpSkillAssetResolutionIssueCode | undefined;
  const schemas = args.runnerJson.schemas;
  if (isRecord(schemas) && Object.prototype.hasOwnProperty.call(schemas, args.schemaKey)) {
    const raw = schemas[args.schemaKey];
    if (typeof raw === "string") {
      declaredRelpath = raw;
    } else {
      declaredRelpath = "";
      declaredIssue = "invalid_declaration_type";
    }
  }

  if (typeof declaredRelpath !== "undefined") {
    const declared =
      declaredIssue === "invalid_declaration_type"
        ? { issueCode: declaredIssue }
        : await resolveRelativeFile({
            skillDir: args.skillDir,
            relpath: declaredRelpath,
          });
    if (declared.path) {
      return {
        path: declared.path,
        declaredRelpath,
        fallbackRelpath,
        usedFallback: false,
        issueSource: "none",
      };
    }
    const fallback = await resolveRelativeFile({
      skillDir: args.skillDir,
      relpath: fallbackRelpath,
    });
    return {
      ...(fallback.path ? { path: fallback.path } : {}),
      declaredRelpath,
      fallbackRelpath,
      usedFallback: !!fallback.path,
      issueCode: declared.issueCode,
      issueSource: "declared",
    };
  }

  const fallback = await resolveRelativeFile({
    skillDir: args.skillDir,
    relpath: fallbackRelpath,
  });
  return {
    ...(fallback.path ? { path: fallback.path } : {}),
    fallbackRelpath,
    usedFallback: !!fallback.path,
    issueCode: fallback.path ? undefined : fallback.issueCode || "missing_declaration",
    issueSource: fallback.path ? "none" : "fallback",
  };
}

export async function loadResolvedAcpSkillJson(
  resolution: AcpSkillAssetResolution,
) {
  if (!resolution.path) {
    return undefined;
  }
  const text = await readRuntimeTextFile(resolution.path);
  const payload = JSON.parse(text);
  return isRecord(payload) ? payload : undefined;
}

function schemaProperties(schema: Record<string, unknown>) {
  return isRecord(schema.properties) ? schema.properties : {};
}

function schemaRequired(schema: Record<string, unknown>) {
  return Array.isArray(schema.required)
    ? schema.required.map((entry) => normalizeString(entry)).filter(Boolean)
    : [];
}

function inputSourceForProperty(schema: unknown) {
  if (!isRecord(schema)) {
    return "file";
  }
  return schema["x-input-source"] === "inline" ? "inline" : "file";
}

function formatAjvErrors(prefix: string, errors: ErrorObject[] | null | undefined) {
  return (errors || []).map((entry) => {
    const path = entry.instancePath || "/";
    return `${prefix}: ${path} ${entry.message || "is invalid"}`;
  });
}

const skillRunnerMetaAjv = new Ajv2020({
  allErrors: true,
  strict: false,
  logger: false,
});

const skillRunnerManifestMetaValidator = skillRunnerMetaAjv.compile(
  skillRunnerManifestMetaSchema,
);

const skillSchemaMetaValidators: Record<
  AcpSkillSchemaKey,
  ReturnType<typeof skillRunnerMetaAjv.compile>
> = {
  input: skillRunnerMetaAjv.compile(skillInputSchemaMetaSchema),
  parameter: skillRunnerMetaAjv.compile(skillParameterSchemaMetaSchema),
  output: skillRunnerMetaAjv.compile(skillOutputSchemaMetaSchema),
};

function formatMetaSchemaErrors(args: {
  prefix: string;
  errors: ErrorObject[] | null | undefined;
}) {
  return formatAjvErrors(args.prefix, args.errors).map((entry) =>
    entry.replace(`${args.prefix}: `, ""),
  );
}

function compileAndValidate(args: {
  schema: Record<string, unknown>;
  payload: Record<string, unknown>;
  prefix: string;
}) {
  try {
    const ajv = new Ajv({ allErrors: true, strict: false, logger: false });
    const validate = ajv.compile(args.schema as Parameters<typeof ajv.compile>[0]);
    if (validate(args.payload)) {
      return [] as string[];
    }
    return formatAjvErrors(args.prefix, validate.errors);
  } catch (error) {
    return [
      `${args.prefix}: schema validation failed: ${
        error instanceof Error ? error.message : String(error)
      }`,
    ];
  }
}

async function validateFileInput(args: {
  key: string;
  value: unknown;
}) {
  const path = normalizeNativeLocalPath(normalizeString(args.value));
  if (!path) {
    return `input validation error: key '${args.key}' must be a non-empty absolute local path`;
  }
  if (isUploadRelativePath(path) || !isAbsolutePath(path)) {
    return `input validation error: key '${args.key}' must be an absolute local path`;
  }
  if (!(await runtimePathExists(path))) {
    return `input validation error: uploaded file not found for key '${args.key}' at '${path}'`;
  }
  const stat = await statRuntimePath(path);
  if (stat.isDir) {
    return `input validation error: key '${args.key}' must point to a file`;
  }
  return "";
}

export async function validateAcpSkillRunRequestAgainstSchemas(args: {
  request: AcpSkillRunRequestV1;
  runnerJson: Record<string, unknown>;
  skillDir: string;
  workspaceDir: string;
}): Promise<AcpSkillRunSchemaValidationResult> {
  void args.workspaceDir;
  const requestInput = isRecord(args.request.input) ? args.request.input : {};
  const requestParameter = isRecord(args.request.parameter)
    ? args.request.parameter
    : {};
  const errors: string[] = [];
  let inputContext: Record<string, unknown> = { ...requestInput };
  let parameterContext: Record<string, unknown> = { ...requestParameter };
  let inputSchemaPath = "";
  let parameterSchemaPath = "";

  const inputResolution = await resolveAcpSkillSchemaAsset({
    skillDir: args.skillDir,
    runnerJson: args.runnerJson,
    schemaKey: "input",
  });
  if (inputResolution.path) {
    inputSchemaPath = inputResolution.path;
    try {
      const schema = await loadResolvedAcpSkillJson(inputResolution);
      if (!schema) {
        errors.push("input validation error: input schema is not a JSON object");
      } else {
        const properties = schemaProperties(schema);
        const required = new Set(schemaRequired(schema));
        inputContext = {};
        for (const key of Object.keys(requestInput)) {
          if (!Object.prototype.hasOwnProperty.call(properties, key)) {
            errors.push(`input validation error: unknown input key '${key}'`);
          }
        }
        for (const [key, propertySchema] of Object.entries(properties)) {
          const hasValue = Object.prototype.hasOwnProperty.call(requestInput, key);
          const source = inputSourceForProperty(propertySchema);
          if (source === "file") {
            if (!hasValue) {
              if (required.has(key)) {
                errors.push(`Missing required input files: ${key}`);
              }
              continue;
            }
            const fileError = await validateFileInput({
              key,
              value: requestInput[key],
            });
            if (fileError) {
              errors.push(fileError);
              continue;
            }
            inputContext[key] = normalizeNativeLocalPath(
              normalizeString(requestInput[key]),
            );
            continue;
          }
          if (hasValue) {
            inputContext[key] = requestInput[key];
          }
        }
        errors.push(
          ...compileAndValidate({
            schema,
            payload: inputContext,
            prefix: "input validation error",
          }),
        );
      }
    } catch (error) {
      errors.push(
        `input validation error: input schema is missing or invalid JSON: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  const parameterResolution = await resolveAcpSkillSchemaAsset({
    skillDir: args.skillDir,
    runnerJson: args.runnerJson,
    schemaKey: "parameter",
  });
  if (parameterResolution.path) {
    parameterSchemaPath = parameterResolution.path;
    try {
      const schema = await loadResolvedAcpSkillJson(parameterResolution);
      if (!schema) {
        errors.push("parameter validation error: parameter schema is not a JSON object");
      } else {
        parameterContext = {};
        const properties = schemaProperties(schema);
        for (const key of Object.keys(properties)) {
          if (Object.prototype.hasOwnProperty.call(requestParameter, key)) {
            parameterContext[key] = requestParameter[key];
          }
        }
        errors.push(
          ...compileAndValidate({
            schema,
            payload: requestParameter,
            prefix: "parameter validation error",
          }),
        );
      }
    } catch (error) {
      errors.push(
        `parameter validation error: parameter schema is missing or invalid JSON: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    inputContext,
    parameterContext,
    ...(inputSchemaPath ? { inputSchemaPath } : {}),
    ...(parameterSchemaPath ? { parameterSchemaPath } : {}),
  };
}

export function validateRunnerManifestShape(args: {
  runnerJson: Record<string, unknown>;
  skillDirName: string;
  skillFrontmatterName: string;
}) {
  const errors: string[] = [];
  if (!skillRunnerManifestMetaValidator(args.runnerJson)) {
    errors.push(
      ...formatMetaSchemaErrors({
        prefix: "runner manifest meta-schema",
        errors: skillRunnerManifestMetaValidator.errors,
      }).map((entry) => `meta_schema: ${entry}`),
    );
  }
  const runnerId = normalizeString(args.runnerJson.id);
  if (!runnerId) {
    errors.push("missing_id");
  }
  if (runnerId && normalizeString(args.skillDirName) !== runnerId) {
    errors.push("identity_mismatch_directory");
  }
  if (runnerId && normalizeString(args.skillFrontmatterName) !== runnerId) {
    errors.push("identity_mismatch_frontmatter");
  }
  const modes = args.runnerJson.execution_modes;
  if (
    !Array.isArray(modes) ||
    modes.length === 0 ||
    modes.some((entry) => entry !== "auto" && entry !== "interactive")
  ) {
    errors.push("invalid_execution_modes");
  }
  if (
    typeof args.runnerJson.max_attempt !== "undefined" &&
    (!Number.isInteger(args.runnerJson.max_attempt) ||
      Number(args.runnerJson.max_attempt) < 1)
  ) {
    errors.push("invalid_max_attempt");
  }
  const schemas = args.runnerJson.schemas;
  if (
    typeof schemas !== "undefined" &&
    (!isRecord(schemas) ||
      Object.values(schemas).some((entry) => typeof entry !== "string"))
  ) {
    errors.push("invalid_schemas");
  }
  const entrypoint = args.runnerJson.entrypoint;
  if (typeof entrypoint !== "undefined" && !isRecord(entrypoint)) {
    errors.push("invalid_entrypoint");
  }
  if (isRecord(entrypoint)) {
    const filename = normalizeString(entrypoint.result_json_filename);
    if (
      filename &&
      (getBaseName(filename) !== filename || filename.includes("/") || filename.includes("\\"))
    ) {
      errors.push("invalid_result_json_filename");
    }
    const prompts = entrypoint.prompts;
    if (
      typeof prompts !== "undefined" &&
      (!isRecord(prompts) ||
        Object.values(prompts).some((entry) => typeof entry !== "string"))
    ) {
      errors.push("invalid_entrypoint_prompts");
    }
  }
  const runtime = args.runnerJson.runtime;
  if (typeof runtime !== "undefined" && !isRecord(runtime)) {
    errors.push("invalid_runtime");
  }
  if (isRecord(runtime) && typeof runtime.default_options !== "undefined") {
    if (!isRecord(runtime.default_options)) {
      errors.push("invalid_runtime_default_options");
    } else {
      const hardTimeout = runtime.default_options.hard_timeout_seconds;
      if (
        typeof hardTimeout !== "undefined" &&
        (!Number.isInteger(hardTimeout) || Number(hardTimeout) < 1)
      ) {
        errors.push("invalid_hard_timeout_seconds");
      }
    }
  }
  return errors;
}

export function validateSkillSchemaAnnotations(args: {
  schema: Record<string, unknown>;
  schemaKey: AcpSkillSchemaKey;
}) {
  const errors: string[] = [];
  const visit = (value: unknown, path: string) => {
    if (!isRecord(value)) {
      return;
    }
    const inputSource = value["x-input-source"];
    if (
      typeof inputSource !== "undefined" &&
      inputSource !== "file" &&
      inputSource !== "inline"
    ) {
      errors.push(`${path}/x-input-source must be file or inline`);
    }
    const xType = value["x-type"];
    if (
      typeof xType !== "undefined" &&
      xType !== "artifact" &&
      xType !== "file"
    ) {
      errors.push(`${path}/x-type must be artifact or file`);
    }
    for (const [key, child] of Object.entries(value)) {
      if (isRecord(child) || Array.isArray(child)) {
        visit(child, `${path}/${key}`);
      }
    }
  };
  visit(args.schema, args.schemaKey);
  return errors;
}

export function compileSkillJsonSchema(args: {
  schema: Record<string, unknown>;
  schemaKey: AcpSkillSchemaKey;
}) {
  const metaValidator = skillSchemaMetaValidators[args.schemaKey];
  if (!metaValidator(args.schema)) {
    return formatMetaSchemaErrors({
      prefix: `${args.schemaKey} schema meta-schema`,
      errors: metaValidator.errors,
    }).map(
      (entry) =>
        `${args.schemaKey} schema violates Skill Runner meta-schema: ${entry}`,
    );
  }
  try {
    const ajv = new Ajv({ allErrors: true, strict: false, logger: false });
    ajv.compile(args.schema as Parameters<typeof ajv.compile>[0]);
    return [] as string[];
  } catch (error) {
    return [
      `${args.schemaKey} schema is invalid JSON Schema: ${
        error instanceof Error ? error.message : String(error)
      }`,
    ];
  }
}
