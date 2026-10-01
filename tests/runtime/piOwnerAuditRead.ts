import { flushOwner } from "../../src/modules/piRuntimeAudit";
import {
  piOwnerPaths,
  type PiOwnerRef,
} from "../../src/modules/piTranscriptStore";
import { readRuntimeTextFileStrict } from "../../src/modules/runtimePersistence";
import { joinPath } from "../../src/utils/path";

/**
 * Owner evidence lives in the owner's managed workspace, never in the global
 * runtime log. Read it the way an export would: flush pending writes first.
 */
export async function readOwnerAudit(root: string, owner: PiOwnerRef) {
  await flushOwner(owner, root);
  const file =
    owner.kind === "conversation"
      ? joinPath(
          piOwnerPaths(owner, root).dir,
          "workspace",
          "runtime-audit",
          "audit.ndjson",
        )
      : await resolveSkillRunAuditFile(owner, root);
  const text = await readRuntimeTextFileStrict(file).catch(() => "");
  return text
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

async function resolveSkillRunAuditFile(owner: PiOwnerRef, root: string) {
  const { inspectPiTranscript } =
    await import("../../src/modules/piTranscriptStore");
  const inspection = await inspectPiTranscript(owner, root);
  const stored = inspection.entries.findLast(
    (entry) =>
      entry.kind === "skill_run_workspace" ||
      entry.kind === "skill_run_prepared",
  )?.payload as { workspaceDir?: string; runtimeDir?: string } | undefined;
  const workspace =
    stored?.workspaceDir ||
    (stored?.runtimeDir ? stored.runtimeDir.replace(/[\\/]\.acp$/, "") : "");
  return joinPath(workspace, "runtime-audit", "audit.ndjson");
}
