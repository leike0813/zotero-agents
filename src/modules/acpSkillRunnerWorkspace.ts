import { joinPath } from "../utils/path";
import {
  ensureRuntimeDirectory,
  getRuntimePersistencePaths,
  statRuntimePath,
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

export type AcpSkillRunnerWorkflowWorkspaceIntent = {
  mode: "new" | "reuse";
  workflowRunId: string;
};

const workflowWorkspacesByRunId = new Map<
  string,
  Pick<AcpSkillRunnerWorkspace, "workspaceDir" | "runtimeDir" | "resultDir" | "auditDir">
>();

function resolveWorkspacePaths(args: { workspaceDir: string; requestId: string }) {
  const runtimeDir = joinPath(args.workspaceDir, ".acp");
  const resultDir = joinPath(args.workspaceDir, "result");
  const auditDir = joinPath(args.workspaceDir, ".audit");
  return {
    workspaceDir: args.workspaceDir,
    runtimeDir,
    resultDir,
    resultJsonPath: joinPath(resultDir, "result.json"),
    auditDir,
    inputManifestPath: joinPath(auditDir, "input_manifest.json"),
  };
}

async function assertReusableWorkspace(args: {
  workflowRunId: string;
  workspaceDir: string;
}) {
  const stat = await statRuntimePath(args.workspaceDir);
  if (!stat.exists || !stat.isDir) {
    throw new Error(
      `ACP workflow workspace is not reusable: workflow_run_id=${args.workflowRunId}`,
    );
  }
}

export async function createAcpSkillRunnerWorkspace(args: {
  backendId: string;
  workflowId?: string;
  jobId?: string;
  rootDir?: string;
  workflowWorkspace?: AcpSkillRunnerWorkflowWorkspaceIntent;
}) {
  const requestId = `acp-skill-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
  const root =
    normalizeString(args.rootDir) || getRuntimePersistencePaths().acpSkillRunsDir;
  const workflowRunId = normalizeString(args.workflowWorkspace?.workflowRunId);
  if (args.workflowWorkspace?.mode === "reuse") {
    if (!workflowRunId) {
      throw new Error("ACP workflow workspace reuse requires workflow_run_id");
    }
    const existing = workflowWorkspacesByRunId.get(workflowRunId);
    if (!existing) {
      throw new Error(
        `ACP workflow workspace reuse target not found: workflow_run_id=${workflowRunId}`,
      );
    }
    await assertReusableWorkspace({
      workflowRunId,
      workspaceDir: existing.workspaceDir,
    });
    const paths = resolveWorkspacePaths({
      workspaceDir: existing.workspaceDir,
      requestId,
    });
    await ensureRuntimeDirectory(paths.resultDir);
    await ensureRuntimeDirectory(paths.auditDir);
    await ensureRuntimeDirectory(paths.runtimeDir);
    return {
      requestId,
      ...paths,
    } satisfies AcpSkillRunnerWorkspace;
  }
  const workspaceDir = joinPath(root, safeSegment(requestId, "run"));
  const paths = resolveWorkspacePaths({ workspaceDir, requestId });
  await ensureRuntimeDirectory(paths.resultDir);
  await ensureRuntimeDirectory(paths.auditDir);
  await ensureRuntimeDirectory(paths.runtimeDir);
  if (args.workflowWorkspace?.mode === "new" && workflowRunId) {
    workflowWorkspacesByRunId.set(workflowRunId, {
      workspaceDir: paths.workspaceDir,
      runtimeDir: paths.runtimeDir,
      resultDir: paths.resultDir,
      auditDir: paths.auditDir,
    });
  }
  return {
    requestId,
    ...paths,
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
