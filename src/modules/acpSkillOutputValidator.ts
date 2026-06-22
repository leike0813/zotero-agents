import Ajv from "ajv";
import { joinPath, normalizeNativeLocalPath } from "../utils/path";
import {
  loadResolvedAcpSkillJson,
  resolveAcpSkillSchemaAsset,
} from "./acpSkillSchemaAssets";
import { readRuntimeTextFile } from "./runtimePersistence";
import { collectOutputBundleArtifactPaths } from "./workflowExecution/artifactManifest";

function normalizeString(value: unknown) {
  return String(value || "").trim();
}

function normalizeSlashes(value: string) {
  return normalizeString(value).replace(/\\/g, "/");
}

function isAbsolutePath(value: string) {
  const normalized = normalizeSlashes(value);
  return /^[A-Za-z]:\//.test(normalized) || normalized.startsWith("/");
}

function normalizeRelativeArtifactPath(value: string) {
  return normalizeSlashes(value)
    .replace(/^\.\/+/, "")
    .split("/")
    .filter((segment) => segment && segment !== ".")
    .join("/");
}

async function readWorkspaceArtifactText(args: {
  workspaceDir?: string;
  rawPath: string;
}) {
  const rawPath = normalizeString(args.rawPath);
  if (isAbsolutePath(rawPath)) {
    return readRuntimeTextFile(normalizeNativeLocalPath(rawPath));
  }
  const workspaceDir = normalizeString(args.workspaceDir);
  if (!workspaceDir) {
    throw new Error(`workspaceDir is required to read ${rawPath}`);
  }
  return readRuntimeTextFile(
    joinPath(workspaceDir, normalizeRelativeArtifactPath(rawPath)),
  );
}

export type AcpSkillOutputValidationResult = {
  ok: boolean;
  resultJson?: unknown;
  errors: string[];
  schemaPath?: string;
};

export async function validateAcpSkillFinalPayload(args: {
  payload: unknown;
  runnerJson: Record<string, unknown>;
  primarySkillDir: string;
  workspaceDir?: string;
  readArtifactText?: (path: string) => Promise<string> | string;
}): Promise<AcpSkillOutputValidationResult> {
  const resultJson = args.payload;
  if (!resultJson || typeof resultJson !== "object" || Array.isArray(resultJson)) {
    return {
      ok: false,
      resultJson,
      errors: ["final output must be a JSON object"],
    };
  }
  const resolution = await resolveAcpSkillSchemaAsset({
    runnerJson: args.runnerJson,
    skillDir: args.primarySkillDir,
    schemaKey: "output",
  });
  const schemaPath = resolution.path || "";
  if (!schemaPath) {
    return {
      ok: false,
      resultJson,
      errors: [
        `output schema is missing: ${
          resolution.fallbackRelpath ||
          resolution.declaredRelpath ||
          "assets/output.schema.json"
        }`,
      ],
    };
  }
  let schema: unknown;
  try {
    schema = await loadResolvedAcpSkillJson(resolution);
    if (!schema || typeof schema !== "object" || Array.isArray(schema)) {
      throw new Error("output schema must be a JSON object");
    }
  } catch (error) {
    return {
      ok: false,
      resultJson,
      schemaPath,
      errors: [
        `output schema is missing or invalid JSON: ${
          error instanceof Error ? error.message : String(error)
        }`,
      ],
    };
  }
  const ajv = new Ajv({ allErrors: true, strict: false, logger: false });
  const validate = ajv.compile(schema as Parameters<typeof ajv.compile>[0]);
  if (validate(resultJson)) {
    const artifactValidation = await collectOutputBundleArtifactPaths({
      output: resultJson,
      outputSchema: schema,
      allowAbsolutePaths: true,
      readArtifactText:
        args.readArtifactText ||
        ((path) =>
          readWorkspaceArtifactText({
            workspaceDir: args.workspaceDir,
            rawPath: path,
          })),
    });
    if (!artifactValidation.ok) {
      return {
        ok: false,
        resultJson,
        schemaPath,
        errors: artifactValidation.diagnostics.map((entry) =>
          [
            entry.path ? `${entry.path}:` : "",
            entry.message || entry.code,
          ]
            .filter(Boolean)
            .join(" "),
        ),
      };
    }
    return {
      ok: true,
      resultJson,
      schemaPath,
      errors: [],
    };
  }
  return {
    ok: false,
    resultJson,
    schemaPath,
    errors: (validate.errors || []).map((entry) => {
      const path = entry.instancePath || "/";
      return `${path} ${entry.message || "is invalid"}`;
    }),
  };
}

export function buildAcpSkillOutputRepairPrompt(args: {
  executionMode: string;
  previousCandidate?: string;
  errors: string[];
  repairRound: number;
  maxRepairRounds: number;
  outputContractDetails?: string;
}) {
  const isInteractive = String(args.executionMode || "").trim().toLowerCase() === "interactive";
  const lines = [
    "Your previous output did not satisfy the Skill Runner output contract.",
    "",
    "Previous candidate:",
    args.previousCandidate || "No valid JSON object was extracted from the previous assistant turn.",
    "",
    "Validation errors:",
    ...(args.errors.length > 0 ? args.errors : ["Unknown validation error"]).map(
      (entry) => `- ${entry}`,
    ),
    "",
    isInteractive
      ? "Return exactly one JSON object matching either the pending branch (`__SKILL_DONE__ = false` with `message` and `ui_hints`) or the final branch (`__SKILL_DONE__ = true` plus the final output fields)."
      : "Return exactly one final JSON object with `__SKILL_DONE__ = true` plus the final output fields.",
    "Do not hand-write the runner-owned result JSON path. If the active SKILL.md explicitly requires a package-local runtime render action to create its own result file, that runtime-generated file is allowed; otherwise the runner creates the result envelope after final payload validation succeeds.",
    "Do not output explanations.",
    "Do not output Markdown fences.",
  ];
  const outputContractDetails = String(args.outputContractDetails || "").trim();
  if (outputContractDetails) {
    lines.push("", "Target output contract details:", outputContractDetails);
  }
  return lines.join("\n");
}
