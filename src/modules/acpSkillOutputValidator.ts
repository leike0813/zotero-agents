import Ajv from "ajv";
import { joinPath } from "../utils/path";
import { readRuntimeTextFile } from "./runtimePersistence";

function normalizeString(value: unknown) {
  return String(value || "").trim();
}

function resolveSchemaPath(args: {
  runnerJson: Record<string, unknown>;
  skillDir: string;
}) {
  const schemas = args.runnerJson.schemas;
  if (!schemas || typeof schemas !== "object" || Array.isArray(schemas)) {
    return "";
  }
  const output = normalizeString((schemas as Record<string, unknown>).output);
  if (!output) {
    return "";
  }
  return /^[A-Za-z]:[\\/]|^\//.test(output)
    ? output
    : joinPath(args.skillDir, output);
}

async function tryReadJson(filePath: string) {
  const text = await readRuntimeTextFile(filePath);
  return JSON.parse(text);
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
}): Promise<AcpSkillOutputValidationResult> {
  const resultJson = args.payload;
  if (!resultJson || typeof resultJson !== "object" || Array.isArray(resultJson)) {
    return {
      ok: false,
      resultJson,
      errors: ["final output must be a JSON object"],
    };
  }
  const schemaPath = resolveSchemaPath({
    runnerJson: args.runnerJson,
    skillDir: args.primarySkillDir,
  });
  if (!schemaPath) {
    return {
      ok: true,
      resultJson,
      errors: [],
    };
  }
  let schema: unknown;
  try {
    schema = await tryReadJson(schemaPath);
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
}) {
  const isInteractive = String(args.executionMode || "").trim().toLowerCase() === "interactive";
  return [
    "Your previous assistant turn did not satisfy the Skill Runner output contract.",
    `Repair round ${args.repairRound} of ${args.maxRepairRounds}.`,
    isInteractive
      ? "Return exactly one JSON object matching either the pending branch (`__SKILL_DONE__ = false` with `message` and `ui_hints`) or the final branch (`__SKILL_DONE__ = true` plus the final output fields)."
      : "Return exactly one final JSON object with `__SKILL_DONE__ = true` plus the final output fields.",
    "Do not write result/result.json. The runner will create that file after a final payload validates.",
    "Do not use tool calls for this repair unless absolutely required; this is a response-format repair.",
    "",
    "Previous candidate:",
    args.previousCandidate || "No valid JSON object was extracted from the previous assistant turn.",
    "",
    "Validation errors:",
    ...args.errors.map((entry) => `- ${entry}`),
  ].join("\n");
}
