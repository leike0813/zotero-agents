import { joinPath } from "../../../utils/path";
import { ensureRuntimeDirectory, getRuntimePersistencePaths, listRuntimeChildren, statRuntimePath, writeRuntimeTextFile, } from "../../runtimePersistence";
function normalizeString(value) {
    return String(value || "").trim();
}
function safeSegment(value, fallback) {
    const normalized = normalizeString(value)
        .replace(/[^A-Za-z0-9._-]+/g, "-")
        .replace(/^-+|-+$/g, "");
    return normalized || fallback;
}
function baseName(value) {
    return (normalizeString(value)
        .replace(/\\/g, "/")
        .split("/")
        .filter(Boolean)
        .pop() || "");
}
const workflowWorkspacesByRunId = new Map();
function allocateRunnerFileNamespace(args) {
    const skillSegment = safeSegment(args.skillId, "skill");
    const index = (args.namespaceCountsBySkillId.get(skillSegment) || 0) + 1;
    args.namespaceCountsBySkillId.set(skillSegment, index);
    return `${skillSegment}.${index}`;
}
function recordExistingNamespace(args) {
    const match = /^(.+)\.(\d+)$/.exec(baseName(args.name));
    if (!match) {
        return;
    }
    const skillSegment = safeSegment(match[1], "skill");
    const index = Math.floor(Number(match[2]));
    if (!Number.isFinite(index) || index <= 0) {
        return;
    }
    const current = args.namespaceCountsBySkillId.get(skillSegment) || 0;
    if (index > current) {
        args.namespaceCountsBySkillId.set(skillSegment, index);
    }
}
async function scanRunnerFileNamespaces(args) {
    const namespaceCountsBySkillId = new Map();
    for (const parent of [
        joinPath(args.workspaceDir, "result"),
        joinPath(args.workspaceDir, ".acp"),
    ]) {
        const parentStat = await statRuntimePath(parent);
        if (!parentStat.exists || !parentStat.isDir) {
            continue;
        }
        for (const child of await listRuntimeChildren(parent)) {
            const childStat = await statRuntimePath(child);
            if (!childStat.exists || !childStat.isDir) {
                continue;
            }
            recordExistingNamespace({
                name: child,
                namespaceCountsBySkillId,
            });
        }
    }
    return namespaceCountsBySkillId;
}
function resolveWorkspacePaths(args) {
    const runtimeDir = joinPath(args.workspaceDir, ".acp", args.fileNamespace);
    const resultDir = joinPath(args.workspaceDir, "result", args.fileNamespace);
    return {
        workspaceDir: args.workspaceDir,
        runtimeDir,
        resultDir,
        resultJsonPath: joinPath(resultDir, "result.json"),
        inputManifestPath: joinPath(runtimeDir, "input_manifest.json"),
    };
}
async function assertReusableWorkspace(args) {
    const stat = await statRuntimePath(args.workspaceDir);
    if (!stat.exists || !stat.isDir) {
        throw new Error(`ACP workflow workspace is not reusable: workflow_run_id=${args.workflowRunId}`);
    }
}
export async function registerAcpWorkflowWorkspaceForReuse(args) {
    const workflowRunId = normalizeString(args.workflowRunId);
    const workspaceDir = normalizeString(args.workspaceDir);
    if (!workflowRunId) {
        throw new Error("ACP workflow workspace restore requires workflow_run_id");
    }
    if (!workspaceDir) {
        throw new Error(`ACP workflow workspace restore requires workspaceDir: workflow_run_id=${workflowRunId}`);
    }
    await assertReusableWorkspace({ workflowRunId, workspaceDir });
    workflowWorkspacesByRunId.set(workflowRunId, {
        workspaceDir,
        runtimeDir: joinPath(workspaceDir, ".acp"),
        namespaceCountsBySkillId: await scanRunnerFileNamespaces({ workspaceDir }),
    });
}
export function resetAcpWorkflowWorkspaceRegistryForTests() {
    workflowWorkspacesByRunId.clear();
}
export async function createAcpSkillRunnerWorkspace(args) {
    const requestId = normalizeString(args.requestId) ||
        `acp-skill-${Date.now().toString(36)}-${Math.random()
            .toString(36)
            .slice(2, 8)}`;
    const root = normalizeString(args.rootDir) ||
        getRuntimePersistencePaths().acpSkillRunsDir;
    const workflowRunId = normalizeString(args.workflowWorkspace?.workflowRunId);
    if (args.workflowWorkspace?.mode === "reuse") {
        if (!workflowRunId) {
            throw new Error("ACP workflow workspace reuse requires workflow_run_id");
        }
        const existing = workflowWorkspacesByRunId.get(workflowRunId);
        if (!existing) {
            throw new Error(`ACP workflow workspace reuse target not found: workflow_run_id=${workflowRunId}`);
        }
        await assertReusableWorkspace({
            workflowRunId,
            workspaceDir: existing.workspaceDir,
        });
        const fileNamespace = allocateRunnerFileNamespace({
            skillId: args.skillId,
            namespaceCountsBySkillId: existing.namespaceCountsBySkillId,
        });
        const paths = resolveWorkspacePaths({
            workspaceDir: existing.workspaceDir,
            fileNamespace,
        });
        await ensureRuntimeDirectory(paths.resultDir);
        await ensureRuntimeDirectory(paths.runtimeDir);
        return {
            requestId,
            ...paths,
        };
    }
    const workspaceDir = joinPath(root, safeSegment(requestId, "run"));
    const namespaceCountsBySkillId = new Map();
    const fileNamespace = allocateRunnerFileNamespace({
        skillId: args.skillId,
        namespaceCountsBySkillId,
    });
    const paths = resolveWorkspacePaths({ workspaceDir, fileNamespace });
    await ensureRuntimeDirectory(paths.resultDir);
    await ensureRuntimeDirectory(paths.runtimeDir);
    if (args.workflowWorkspace?.mode === "new" && workflowRunId) {
        workflowWorkspacesByRunId.set(workflowRunId, {
            workspaceDir: paths.workspaceDir,
            runtimeDir: paths.runtimeDir,
            namespaceCountsBySkillId,
        });
    }
    return {
        requestId,
        ...paths,
    };
}
export async function writeAcpSkillRunnerInputManifest(args) {
    await writeRuntimeTextFile(args.workspace.inputManifestPath, JSON.stringify(args.request, null, 2));
}
