import { writeRuntimeTextFile } from "./runtimePersistence";
import { validateAcpSkillFinalPayload } from "./acpSkillOutputValidator";

function normalizeString(value: unknown) {
  return String(value || "").trim();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function normalizeExecutionMode(
  value: unknown,
  runnerJson: Record<string, unknown>,
) {
  const explicit = normalizeString(value).toLowerCase();
  if (explicit === "interactive" || explicit === "auto") {
    return explicit;
  }
  const modes = Array.isArray(runnerJson.execution_modes)
    ? runnerJson.execution_modes.map((entry) =>
        normalizeString(entry).toLowerCase(),
      )
    : [];
  if (modes.includes("auto")) {
    return "auto";
  }
  if (modes.includes("interactive")) {
    return "interactive";
  }
  return "auto";
}

function extractFencedJson(text: string) {
  const match = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return match?.[1]?.trim() || "";
}

function extractBalancedJsonObject(text: string) {
  const start = text.indexOf("{");
  if (start < 0) {
    return "";
  }
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = start; index < text.length; index += 1) {
    const char = text[index];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }
    if (char === '"') {
      inString = true;
    } else if (char === "{") {
      depth += 1;
    } else if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        return text.slice(start, index + 1);
      }
    }
  }
  return "";
}

export function extractAcpSkillTurnJsonCandidate(textRaw: string) {
  const text = normalizeString(textRaw);
  const candidates = [
    text,
    extractFencedJson(text),
    extractBalancedJsonObject(text),
  ].filter(Boolean);
  const errors: string[] = [];
  for (const candidate of candidates) {
    try {
      const payload = JSON.parse(candidate);
      if (isRecord(payload)) {
        return { payload, candidateText: candidate, errors: [] };
      }
      errors.push("candidate JSON is not an object");
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }
  return {
    payload: undefined,
    candidateText: candidates[0] || "",
    errors: errors.length ? errors : ["no JSON object found in assistant turn"],
  };
}

export type AcpSkillOutputConvergenceResult =
  | {
      kind: "final";
      resultJson: Record<string, unknown>;
      candidateText: string;
      warnings: string[];
    }
  | {
      kind: "pending";
      message: string;
      uiHints: Record<string, unknown>;
      candidateText: string;
      warnings: string[];
    }
  | {
      kind: "invalid";
      candidateText: string;
      errors: string[];
    };

export async function convergeAcpSkillTurnOutput(args: {
  assistantText: string;
  executionMode?: string;
  runnerJson: Record<string, unknown>;
  primarySkillDir: string;
  workspaceDir?: string;
  readArtifactText?: (path: string) => Promise<string> | string;
}): Promise<AcpSkillOutputConvergenceResult> {
  const executionMode = normalizeExecutionMode(
    args.executionMode,
    args.runnerJson,
  );
  const extracted = extractAcpSkillTurnJsonCandidate(args.assistantText);
  if (!extracted.payload) {
    return {
      kind: "invalid",
      candidateText: extracted.candidateText,
      errors: extracted.errors,
    };
  }
  const marker = extracted.payload.__SKILL_DONE__;
  if (executionMode === "interactive" && marker === false) {
    const message = normalizeString(extracted.payload.message);
    const uiHints = isRecord(extracted.payload.ui_hints)
      ? { ...extracted.payload.ui_hints }
      : {};
    const errors: string[] = [];
    if (!message) {
      errors.push("pending output requires non-empty message");
    }
    if (!isRecord(extracted.payload.ui_hints)) {
      errors.push("pending output requires ui_hints object");
    }
    if (errors.length) {
      return {
        kind: "invalid",
        candidateText: extracted.candidateText,
        errors,
      };
    }
    return {
      kind: "pending",
      message,
      uiHints,
      candidateText: extracted.candidateText,
      warnings: [],
    };
  }
  if (marker !== true) {
    return {
      kind: "invalid",
      candidateText: extracted.candidateText,
      errors: [
        executionMode === "interactive"
          ? "interactive output requires __SKILL_DONE__ true for final or false for pending"
          : "auto output requires __SKILL_DONE__ true",
      ],
    };
  }
  const finalPayload = { ...extracted.payload };
  delete finalPayload.__SKILL_DONE__;
  const validation = await validateAcpSkillFinalPayload({
    payload: finalPayload,
    runnerJson: args.runnerJson,
    primarySkillDir: args.primarySkillDir,
    workspaceDir: args.workspaceDir,
    readArtifactText: args.readArtifactText,
  });
  if (!validation.ok || !isRecord(validation.resultJson)) {
    return {
      kind: "invalid",
      candidateText: extracted.candidateText,
      errors: validation.errors,
    };
  }
  return {
    kind: "final",
    resultJson: { ...validation.resultJson },
    candidateText: extracted.candidateText,
    warnings: [],
  };
}

export async function writeAcpSkillRunnerResultEnvelope(args: {
  resultJsonPath: string;
  resultJson: Record<string, unknown>;
}) {
  await writeRuntimeTextFile(
    args.resultJsonPath,
    `${JSON.stringify(args.resultJson, null, 2)}\n`,
  );
}
