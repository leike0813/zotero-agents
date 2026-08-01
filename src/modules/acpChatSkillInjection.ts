import type { BackendInstance } from "../backends/types";
import { joinPath } from "../utils/path";
import { describeAcpError } from "./acpDiagnostics";
import {
  buildAcpChatSkillInjectionPlan,
  normalizeAcpProjectSkillRoot,
} from "./acpAgentFamilyResolver";
import { scanPluginSkillRegistry } from "./pluginSkillRegistry";
import {
  ACP_RUNTIME_PROMPT_TEMPLATES_BY_ID,
  loadAcpRuntimePromptTemplate,
} from "./acpRuntimePromptTemplates";
import {
  copyRuntimeDirectory,
  getRuntimePersistencePaths,
  readRuntimeTextFile,
  removeRuntimePath,
  replaceRuntimeTextFileAtomically,
  runtimePathExists,
} from "./runtimePersistence";
import type { AcpDiagnosticsEntry } from "./acpTypes";
import type { AcpChatSessionRuntime } from "./acpSessionManager";

// Diagnostics are owned by the acpSessionManager domain core (snapshot
// diagnostics lane + diagnostic audit routing). Injected once at module load
// so this subdomain never imports the session-manager runtime code (the same
// host-registration pattern as acpChatTranscriptMirror).
export type AcpChatSkillInjectionHost = {
  appendDiagnostic(
    sessionRuntime: AcpChatSessionRuntime,
    entry: AcpDiagnosticsEntry,
  ): void;
};

let host: AcpChatSkillInjectionHost;

export function configureAcpChatSkillInjectionHost(
  nextHost: AcpChatSkillInjectionHost,
) {
  host = nextHost;
}

export function resetAcpChatWorkspacePreparationState() {
  acpChatWorkspacePreparationTail = Promise.resolve();
}

function nowIso() {
  return new Date().toISOString();
}

function nextOpaqueId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

function normalizeString(value: unknown) {
  return String(value || "").trim();
}

function compactError(error: unknown) {
  return describeAcpError(error, "unknown error").replace(/\s+/g, " ").trim();
}

const ACP_CHAT_INJECTED_SKILL_IDS = [
  "zotero-bridge-cli",
  "literature-search-ingest",
  "literature-metadata-search",
  "zotero-library-agent",
  "zotero-library-curation",
  "zotero-library-query",
  "zotero-literature-acquisition",
  "zotero-literature-analysis",
  "zotero-research-synthesis",
] as const;
const ACP_CHAT_INJECTED_SKILLS_MANIFEST_SCHEMA =
  "zotero-agents.acp-chat-injected-skills.v1";
const ACP_CHAT_INJECTED_SKILLS_MANIFEST_FILENAME =
  "injected-skills-manifest.json";
const ACP_CHAT_WORKSPACE_AGENTS_FILENAME = "AGENTS.md";
const ACP_CHAT_WORKSPACE_AGENTS_START =
  "<!-- zotero-agents:acp-chat-workspace:start -->";
const ACP_CHAT_WORKSPACE_AGENTS_END =
  "<!-- zotero-agents:acp-chat-workspace:end -->";
const LEGACY_ACP_CHAT_SKILL_ROOTS = [
  ".agents/skills",
  ".codex/skills",
  ".claude/skills",
  ".gemini/skills",
  ".qwen/skills",
  ".kilo/skills",
] as const;

type AcpChatInjectedSkillTarget = {
  relativeRoot: string;
  skillId: string;
};

type AcpChatInjectedSkillsManifest = {
  schema: typeof ACP_CHAT_INJECTED_SKILLS_MANIFEST_SCHEMA;
  targets: AcpChatInjectedSkillTarget[];
};

let acpChatWorkspacePreparationTail: Promise<void> = Promise.resolve();

export function withAcpChatWorkspacePreparationLock<T>(
  operation: () => Promise<T>,
): Promise<T> {
  const run = acpChatWorkspacePreparationTail
    .catch(() => undefined)
    .then(operation);
  acpChatWorkspacePreparationTail = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

function appendAcpChatPreparationDiagnostic(
  sessionRuntime: AcpChatSessionRuntime,
  entry: {
    kind: string;
    level: "info" | "warn" | "error";
    message: string;
    detail?: string;
    raw?: unknown;
  },
) {
  host.appendDiagnostic(sessionRuntime, {
    id: nextOpaqueId("acp-diag"),
    ts: nowIso(),
    ...entry,
    detail: entry.detail || "",
  });
}

function managedAcpChatWorkspaceAgentsBlock(template: string) {
  return [
    ACP_CHAT_WORKSPACE_AGENTS_START,
    template.trim(),
    ACP_CHAT_WORKSPACE_AGENTS_END,
  ].join("\n");
}

function countTextOccurrences(content: string, marker: string) {
  return content.split(marker).length - 1;
}

export async function materializeAcpChatWorkspaceInstructions(args: {
  sessionRuntime: AcpChatSessionRuntime;
  workspaceDir: string;
}) {
  const targetPath = joinPath(
    args.workspaceDir,
    ACP_CHAT_WORKSPACE_AGENTS_FILENAME,
  );
  try {
    const template = await loadAcpRuntimePromptTemplate(
      ACP_RUNTIME_PROMPT_TEMPLATES_BY_ID.acp_chat_workspace_agents,
    );
    const managedBlock = managedAcpChatWorkspaceAgentsBlock(template);
    const existing = (await runtimePathExists(targetPath))
      ? await readRuntimeTextFile(targetPath)
      : "";
    const startCount = countTextOccurrences(
      existing,
      ACP_CHAT_WORKSPACE_AGENTS_START,
    );
    const endCount = countTextOccurrences(
      existing,
      ACP_CHAT_WORKSPACE_AGENTS_END,
    );
    let content = managedBlock;
    if (startCount === 0 && endCount === 0) {
      content = existing.trim()
        ? `${managedBlock}\n\n${existing}`
        : `${managedBlock}\n`;
    } else if (startCount === 1 && endCount === 1) {
      const start = existing.indexOf(ACP_CHAT_WORKSPACE_AGENTS_START);
      const end = existing.indexOf(ACP_CHAT_WORKSPACE_AGENTS_END);
      if (end < start) {
        appendAcpChatPreparationDiagnostic(args.sessionRuntime, {
          kind: "acp_chat_workspace_instructions_unavailable",
          level: "warn",
          message:
            "ACP Chat workspace instructions were not updated because AGENTS.md contains malformed managed markers.",
          detail: targetPath,
        });
        return;
      }
      content =
        existing.slice(0, start) +
        managedBlock +
        existing.slice(end + ACP_CHAT_WORKSPACE_AGENTS_END.length);
    } else {
      appendAcpChatPreparationDiagnostic(args.sessionRuntime, {
        kind: "acp_chat_workspace_instructions_unavailable",
        level: "warn",
        message:
          "ACP Chat workspace instructions were not updated because AGENTS.md contains ambiguous managed markers.",
        detail: targetPath,
      });
      return;
    }
    await replaceRuntimeTextFileAtomically({
      targetPath,
      fragments: [content],
    });
    appendAcpChatPreparationDiagnostic(args.sessionRuntime, {
      kind: "acp_chat_workspace_instructions_ready",
      level: "info",
      message: "ACP Chat workspace instructions materialized.",
      detail: targetPath,
    });
  } catch (error) {
    appendAcpChatPreparationDiagnostic(args.sessionRuntime, {
      kind: "acp_chat_workspace_instructions_unavailable",
      level: "warn",
      message: "ACP Chat workspace instruction materialization failed.",
      detail: compactError(error),
    });
  }
}

function acpChatInjectedSkillTargetKey(target: AcpChatInjectedSkillTarget) {
  return `${target.relativeRoot}\u0000${target.skillId}`;
}

function resolveManagedAcpChatInjectedSkillDir(args: {
  workspaceDir: string;
  relativeRoot: string;
  skillId: string;
}) {
  const relativeRoot = normalizeAcpProjectSkillRoot(args.relativeRoot);
  if (
    !relativeRoot ||
    !ACP_CHAT_INJECTED_SKILL_IDS.includes(
      args.skillId as (typeof ACP_CHAT_INJECTED_SKILL_IDS)[number],
    )
  ) {
    return "";
  }
  const workspaceDir = normalizeString(args.workspaceDir)
    .replace(/\\/g, "/")
    .replace(/\/+$/, "");
  const targetDir = joinPath(
    args.workspaceDir,
    relativeRoot,
    args.skillId,
  ).replace(/\\/g, "/");
  if (!workspaceDir || !targetDir.startsWith(`${workspaceDir}/`)) {
    return "";
  }
  return targetDir;
}

function normalizeAcpChatInjectedSkillTargets(value: unknown) {
  if (!Array.isArray(value)) {
    return null;
  }
  const targets = new Map<string, AcpChatInjectedSkillTarget>();
  for (const raw of value) {
    if (!raw || typeof raw !== "object") {
      return null;
    }
    const record = raw as Record<string, unknown>;
    const relativeRoot = normalizeAcpProjectSkillRoot(record.relativeRoot);
    const skillId = normalizeString(record.skillId);
    if (
      !relativeRoot ||
      relativeRoot !== record.relativeRoot ||
      !ACP_CHAT_INJECTED_SKILL_IDS.includes(
        skillId as (typeof ACP_CHAT_INJECTED_SKILL_IDS)[number],
      )
    ) {
      return null;
    }
    const target = { relativeRoot, skillId };
    targets.set(acpChatInjectedSkillTargetKey(target), target);
  }
  return Array.from(targets.values());
}

async function bootstrapLegacyAcpChatInjectedSkillTargets(
  workspaceDir: string,
) {
  const targets: AcpChatInjectedSkillTarget[] = [];
  for (const relativeRoot of LEGACY_ACP_CHAT_SKILL_ROOTS) {
    for (const skillId of ACP_CHAT_INJECTED_SKILL_IDS) {
      const targetDir = resolveManagedAcpChatInjectedSkillDir({
        workspaceDir,
        relativeRoot,
        skillId,
      });
      if (targetDir && (await runtimePathExists(targetDir))) {
        targets.push({ relativeRoot, skillId });
      }
    }
  }
  return targets;
}

async function readAcpChatInjectedSkillsManifest(args: {
  sessionRuntime: AcpChatSessionRuntime;
  workspaceDir: string;
  manifestPath: string;
}) {
  if (!(await runtimePathExists(args.manifestPath))) {
    return bootstrapLegacyAcpChatInjectedSkillTargets(args.workspaceDir);
  }
  try {
    const parsed = JSON.parse(
      await readRuntimeTextFile(args.manifestPath),
    ) as Partial<AcpChatInjectedSkillsManifest>;
    const targets = normalizeAcpChatInjectedSkillTargets(parsed.targets);
    if (
      parsed.schema !== ACP_CHAT_INJECTED_SKILLS_MANIFEST_SCHEMA ||
      targets === null
    ) {
      throw new Error("unsupported or invalid injected skills manifest");
    }
    return targets;
  } catch (error) {
    appendAcpChatPreparationDiagnostic(args.sessionRuntime, {
      kind: "acp_chat_injected_skills_manifest_invalid",
      level: "warn",
      message:
        "ACP Chat ignored an invalid injected skills manifest and skipped stale cleanup.",
      detail: compactError(error),
    });
    return [];
  }
}

async function writeAcpChatInjectedSkillsManifest(args: {
  sessionRuntime: AcpChatSessionRuntime;
  manifestPath: string;
  targets: AcpChatInjectedSkillTarget[];
}) {
  const manifest: AcpChatInjectedSkillsManifest = {
    schema: ACP_CHAT_INJECTED_SKILLS_MANIFEST_SCHEMA,
    targets: [...args.targets].sort(
      (left, right) =>
        left.relativeRoot.localeCompare(right.relativeRoot) ||
        left.skillId.localeCompare(right.skillId),
    ),
  };
  try {
    await replaceRuntimeTextFileAtomically({
      targetPath: args.manifestPath,
      fragments: [JSON.stringify(manifest, null, 2), "\n"],
    });
    return true;
  } catch (error) {
    appendAcpChatPreparationDiagnostic(args.sessionRuntime, {
      kind: "acp_chat_injected_skills_manifest_unavailable",
      level: "warn",
      message: "ACP Chat injected skills manifest could not be committed.",
      detail: compactError(error),
    });
    return false;
  }
}

export async function materializeAcpChatInjectedSkills(args: {
  sessionRuntime: AcpChatSessionRuntime;
  backends: readonly BackendInstance[];
  workspaceDir: string;
}) {
  const workspaceDir = normalizeString(args.workspaceDir);
  if (!workspaceDir) {
    return;
  }
  const injectionPlan = buildAcpChatSkillInjectionPlan({
    backends: args.backends,
    workspaceDir,
  });
  for (const diagnostic of injectionPlan.diagnostics) {
    appendAcpChatPreparationDiagnostic(args.sessionRuntime, {
      kind: diagnostic.code,
      level:
        diagnostic.level === "error"
          ? "error"
          : diagnostic.level === "warning"
            ? "warn"
            : "info",
      message: diagnostic.message,
      detail: injectionPlan.families.join(", "),
      raw: {
        families: injectionPlan.families,
        skillRoots: injectionPlan.skillRoots,
      },
    });
  }

  const manifestPath = joinPath(
    getRuntimePersistencePaths().acpChatRoot,
    ACP_CHAT_INJECTED_SKILLS_MANIFEST_FILENAME,
  );
  const previousTargets = await readAcpChatInjectedSkillsManifest({
    sessionRuntime: args.sessionRuntime,
    workspaceDir,
    manifestPath,
  });
  const desiredRoots = new Set(injectionPlan.relativeSkillRoots);
  const nextTargets = new Map<string, AcpChatInjectedSkillTarget>();
  for (const target of previousTargets) {
    nextTargets.set(acpChatInjectedSkillTargetKey(target), target);
  }
  for (const relativeRoot of injectionPlan.relativeSkillRoots) {
    for (const skillId of ACP_CHAT_INJECTED_SKILL_IDS) {
      const target = { relativeRoot, skillId };
      nextTargets.set(acpChatInjectedSkillTargetKey(target), target);
    }
  }
  const ownershipCommitted = await writeAcpChatInjectedSkillsManifest({
    sessionRuntime: args.sessionRuntime,
    manifestPath,
    targets: Array.from(nextTargets.values()),
  });
  if (!ownershipCommitted) {
    appendAcpChatPreparationDiagnostic(args.sessionRuntime, {
      kind: "acp_chat_injected_skills_unavailable",
      level: "warn",
      message:
        "ACP Chat skipped injected skill reconciliation because target ownership could not be committed.",
      detail: manifestPath,
    });
    return;
  }

  let registry: Awaited<ReturnType<typeof scanPluginSkillRegistry>> | null =
    null;
  try {
    registry = await scanPluginSkillRegistry();
  } catch (error) {
    appendAcpChatPreparationDiagnostic(args.sessionRuntime, {
      kind: "acp_chat_injected_skills_unavailable",
      level: "warn",
      message: "ACP Chat injected skill registry scan failed.",
      detail: compactError(error),
    });
  }

  const missingSkillIds: string[] = [];
  const targetDirsBySkill: Record<string, string[]> = {};
  if (registry) {
    for (const skillId of ACP_CHAT_INJECTED_SKILL_IDS) {
      const entry = registry.entriesById[skillId];
      if (!entry) {
        missingSkillIds.push(skillId);
        appendAcpChatPreparationDiagnostic(args.sessionRuntime, {
          kind: "acp_chat_injected_skill_unavailable",
          level: "warn",
          message:
            "ACP Chat injected skill was not found in the plugin skill registry.",
          detail: skillId,
          raw: {
            skillId,
            skillIds: [...ACP_CHAT_INJECTED_SKILL_IDS],
            diagnostics: registry.diagnostics,
          },
        });
        continue;
      }
      const targetDirs: string[] = [];
      for (const relativeRoot of injectionPlan.relativeSkillRoots) {
        const target = { relativeRoot, skillId };
        const targetDir = resolveManagedAcpChatInjectedSkillDir({
          workspaceDir,
          relativeRoot,
          skillId,
        });
        if (!targetDir) {
          continue;
        }
        try {
          await copyRuntimeDirectory({
            sourceDir: entry.sourceDir,
            targetDir,
          });
          nextTargets.set(acpChatInjectedSkillTargetKey(target), target);
          targetDirs.push(targetDir);
        } catch (error) {
          appendAcpChatPreparationDiagnostic(args.sessionRuntime, {
            kind: "acp_chat_injected_skill_unavailable",
            level: "warn",
            message: "ACP Chat injected skill materialization failed.",
            detail: `${skillId}: ${compactError(error)}`,
            raw: { relativeRoot, skillId },
          });
        }
      }
      targetDirsBySkill[skillId] = targetDirs;
    }
  }

  for (const target of previousTargets) {
    if (desiredRoots.has(target.relativeRoot)) {
      continue;
    }
    const targetDir = resolveManagedAcpChatInjectedSkillDir({
      workspaceDir,
      relativeRoot: target.relativeRoot,
      skillId: target.skillId,
    });
    if (!targetDir) {
      continue;
    }
    try {
      await removeRuntimePath(targetDir);
      nextTargets.delete(acpChatInjectedSkillTargetKey(target));
    } catch (error) {
      nextTargets.set(acpChatInjectedSkillTargetKey(target), target);
      appendAcpChatPreparationDiagnostic(args.sessionRuntime, {
        kind: "acp_chat_injected_skill_cleanup_unavailable",
        level: "warn",
        message: "ACP Chat could not clean up a stale injected skill.",
        detail: `${targetDir}: ${compactError(error)}`,
        raw: target,
      });
    }
  }

  await writeAcpChatInjectedSkillsManifest({
    sessionRuntime: args.sessionRuntime,
    manifestPath,
    targets: Array.from(nextTargets.values()),
  });
  appendAcpChatPreparationDiagnostic(args.sessionRuntime, {
    kind:
      injectionPlan.skillRoots.length > 0
        ? "acp_chat_injected_skills_ready"
        : "acp_chat_injected_skills_unavailable",
    level: injectionPlan.skillRoots.length > 0 ? "info" : "warn",
    message:
      injectionPlan.skillRoots.length > 0
        ? "ACP Chat injected skills materialized."
        : "ACP Chat injected skills were not materialized because no project skill roots were available.",
    detail: Object.values(targetDirsBySkill).flat().join(", "),
    raw: {
      skillIds: [...ACP_CHAT_INJECTED_SKILL_IDS],
      missingSkillIds,
      families: injectionPlan.families,
      skillRoots: injectionPlan.skillRoots,
      targetDirsBySkill,
    },
  });
}
