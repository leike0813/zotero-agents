import { joinPath } from "../utils/path";
import {
  ensureRuntimeDirectory,
  getRuntimePersistencePaths,
  writeRuntimeTextFile,
} from "./runtimePersistence";

function normalizeString(value: unknown) {
  return String(value || "").trim();
}

function safeSegment(value: unknown, fallback: string) {
  const normalized = normalizeString(value)
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || fallback;
}

export type AcpSkillRunnerWorkspace = {
  requestId: string;
  workspaceDir: string;
  runtimeDir: string;
  resultDir: string;
  resultJsonPath: string;
  auditDir: string;
  inputManifestPath: string;
};

export async function createAcpSkillRunnerWorkspace(args: {
  backendId: string;
  workflowId?: string;
  jobId?: string;
  rootDir?: string;
}) {
  const requestId = `acp-skill-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
  const root =
    normalizeString(args.rootDir) || getRuntimePersistencePaths().acpSkillRunsDir;
  const workspaceDir = joinPath(root, safeSegment(requestId, "run"));
  const runtimeDir = joinPath(workspaceDir, ".acp");
  const resultDir = joinPath(workspaceDir, "result");
  const auditDir = joinPath(workspaceDir, ".audit");
  await ensureRuntimeDirectory(resultDir);
  await ensureRuntimeDirectory(auditDir);
  await ensureRuntimeDirectory(runtimeDir);
  return {
    requestId,
    workspaceDir,
    runtimeDir,
    resultDir,
    resultJsonPath: joinPath(resultDir, "result.json"),
    auditDir,
    inputManifestPath: joinPath(auditDir, "input_manifest.json"),
  } satisfies AcpSkillRunnerWorkspace;
}

export async function writeAcpSkillRunnerInputManifest(args: {
  workspace: AcpSkillRunnerWorkspace;
  request: unknown;
}) {
  await writeRuntimeTextFile(
    args.workspace.inputManifestPath,
    JSON.stringify(args.request, null, 2),
  );
}
