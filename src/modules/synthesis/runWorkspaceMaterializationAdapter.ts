import {
  SynthesisClientError,
  rebuildSynthesisHostRunWorkspaceMaterializationRequest,
  rebuildSynthesisHostRunWorkspaceMaterializationResult,
  type SynthesisHostRunWorkspaceMaterializationPort,
} from "../../../packages/synthesis-contracts/src/index";
import {
  getBaseName,
  joinPath,
  normalizeNativeLocalPath,
} from "../../utils/path";
import {
  getRuntimePersistencePaths,
  writeRuntimeTextFile,
} from "../runtimePersistence";

const ACP_SKILL_RUN_ID_RE = /^acp-skill-[A-Za-z0-9._-]+$/;
const EXPORT_MANIFEST_PATH =
  "runtime/payloads/paper-artifacts-manifest.json" as const;

type SynthesisHostRunWorkspaceMaterializationAdapterOptions = {
  runtimeRoot?: string;
  writeText?: typeof writeRuntimeTextFile;
};

function invalidRunRoot(message: string): never {
  throw new SynthesisClientError("invalid_request", message, {
    reason: "acp_skill_run_root_invalid",
  });
}

function pathContains(parent: string, child: string) {
  const base = normalizeNativeLocalPath(parent)
    .replace(/\\/g, "/")
    .toLowerCase();
  const target = normalizeNativeLocalPath(child)
    .replace(/\\/g, "/")
    .toLowerCase();
  return target === base || target.startsWith(`${base}/`);
}

export function validateAcpSkillRunRoot(runRoot: string, runtimeRoot?: string) {
  const root = String(runRoot || "").trim();
  if (!root) {
    return invalidRunRoot("run_root is required");
  }
  const acpSkillRunsDir =
    getRuntimePersistencePaths(runtimeRoot).acpSkillRunsDir;
  if (!pathContains(acpSkillRunsDir, root)) {
    return invalidRunRoot(
      "run_root must be inside the ACP skill-runs directory",
    );
  }
  if (!ACP_SKILL_RUN_ID_RE.test(getBaseName(root))) {
    return invalidRunRoot("run_root must point to an ACP skill run directory");
  }
  return root;
}

export function createSynthesisHostRunWorkspaceMaterializationPort(
  options: SynthesisHostRunWorkspaceMaterializationAdapterOptions = {},
): SynthesisHostRunWorkspaceMaterializationPort {
  const writeText = options.writeText || writeRuntimeTextFile;
  return {
    async materialize(rawRequest) {
      const request =
        rebuildSynthesisHostRunWorkspaceMaterializationRequest(rawRequest);
      const runRoot = validateAcpSkillRunRoot(
        request.runRoot,
        options.runtimeRoot,
      );
      const manifest = request.entries.find(
        (entry) => entry.path === EXPORT_MANIFEST_PATH,
      )!;
      const entries = request.entries.filter(
        (entry) => entry.path !== EXPORT_MANIFEST_PATH,
      );
      try {
        for (const entry of [...entries, manifest]) {
          await writeText(joinPath(runRoot, entry.path), entry.text);
        }
      } catch {
        throw new SynthesisClientError(
          "unavailable",
          "Run workspace materialization failed",
          { reason: "run_workspace_materialization_failed" },
        );
      }
      return rebuildSynthesisHostRunWorkspaceMaterializationResult({
        status: "materialized",
        capability: request.capability,
        entryCount: request.entries.length,
      });
    },
  };
}
