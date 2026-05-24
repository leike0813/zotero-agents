import { getBaseName } from "../utils/path";
import type { AcpSkillOutputValidationResult } from "./acpSkillOutputValidator";
import {
  collectRuntimeFiles,
  readRuntimeTextFile,
  runtimeRelativePath,
  statRuntimePath,
} from "./runtimePersistence";

export type AcpSkillResultFileFallbackWarning = {
  code:
    | "OUTPUT_RECOVERED_FROM_RESULT_FILE"
    | "OUTPUT_RESULT_FILE_MULTIPLE_CANDIDATES"
    | "OUTPUT_RESULT_FILE_INVALID_JSON"
    | "OUTPUT_RESULT_FILE_SCHEMA_INVALID"
    | "OUTPUT_RESULT_FILE_DECLARED_NOT_FOUND";
  detail?: string;
};

export type AcpSkillResultFileFallbackResolution = {
  payload?: Record<string, unknown>;
  selectedPath?: string;
  warnings: AcpSkillResultFileFallbackWarning[];
};

function normalizeString(value: unknown) {
  return String(value || "").trim();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function resolveResultJsonFilename(args: {
  skillId: string;
  runnerJson: Record<string, unknown>;
}) {
  const entrypoint = isRecord(args.runnerJson.entrypoint)
    ? args.runnerJson.entrypoint
    : {};
  const declared = normalizeString(entrypoint.result_json_filename);
  if (declared) {
    return getBaseName(declared) || `${args.skillId}.result.json`;
  }
  return `${args.skillId}.result.json`;
}

async function collectCandidatePaths(args: {
  workspaceDir: string;
  filename: string;
}) {
  const candidates: Array<{ path: string; relpath: string; mtime: number }> = [];
  for (const path of await collectRuntimeFiles(args.workspaceDir)) {
    if (getBaseName(path) !== args.filename) {
      continue;
    }
    const relpath = runtimeRelativePath(args.workspaceDir, path).replace(/\\/g, "/");
    if (relpath.startsWith("result/") || relpath.startsWith(".audit/")) {
      continue;
    }
    const stat = await statRuntimePath(path);
    candidates.push({
      path,
      relpath,
      mtime: Number(stat.lastModified || 0) || 0,
    });
  }
  return candidates.sort((left, right) => {
    if (right.mtime !== left.mtime) {
      return right.mtime - left.mtime;
    }
    const depth = left.relpath.split("/").length - right.relpath.split("/").length;
    if (depth !== 0) {
      return depth;
    }
    return left.relpath.localeCompare(right.relpath);
  });
}

export async function resolveAcpSkillResultFileFallback(args: {
  skillId: string;
  runnerJson: Record<string, unknown>;
  workspaceDir: string;
  validator: (payload: unknown) => Promise<AcpSkillOutputValidationResult>;
}): Promise<AcpSkillResultFileFallbackResolution> {
  const filename = resolveResultJsonFilename({
    skillId: args.skillId,
    runnerJson: args.runnerJson,
  });
  const candidates = await collectCandidatePaths({
    workspaceDir: args.workspaceDir,
    filename,
  });
  if (!candidates.length) {
    return {
      warnings: [
        {
          code: "OUTPUT_RESULT_FILE_DECLARED_NOT_FOUND",
          detail: `expected=${filename}`,
        },
      ],
    };
  }
  const warnings: AcpSkillResultFileFallbackWarning[] = [];
  const selected = candidates[0];
  if (candidates.length > 1) {
    warnings.push({
      code: "OUTPUT_RESULT_FILE_MULTIPLE_CANDIDATES",
      detail: `expected=${filename} selected=${selected.relpath} candidates=${candidates.length}`,
    });
  }
  let payload: unknown;
  try {
    payload = JSON.parse(await readRuntimeTextFile(selected.path));
  } catch {
    warnings.push({
      code: "OUTPUT_RESULT_FILE_INVALID_JSON",
      detail: `path=${selected.relpath}`,
    });
    return {
      selectedPath: selected.relpath,
      warnings,
    };
  }
  if (!isRecord(payload)) {
    warnings.push({
      code: "OUTPUT_RESULT_FILE_INVALID_JSON",
      detail: `path=${selected.relpath}`,
    });
    return {
      selectedPath: selected.relpath,
      warnings,
    };
  }
  const validation = await args.validator(payload);
  if (!validation.ok || !isRecord(validation.resultJson)) {
    warnings.push({
      code: "OUTPUT_RESULT_FILE_SCHEMA_INVALID",
      detail: `path=${selected.relpath} errors=${validation.errors.join(" | ")}`,
    });
    return {
      selectedPath: selected.relpath,
      warnings,
    };
  }
  warnings.push({
    code: "OUTPUT_RECOVERED_FROM_RESULT_FILE",
    detail: `path=${selected.relpath}`,
  });
  return {
    payload: { ...validation.resultJson },
    selectedPath: selected.relpath,
    warnings,
  };
}

