import {
  ASSISTANT_INTERACTION_FILE_MAX_BYTES,
  ASSISTANT_INTERACTION_TOTAL_MAX_BYTES,
  ASSISTANT_PENDING_INTERACTION_FILE_LIMIT,
  type AssistantInteractionFileSlot,
} from "../shared/assistantInteractionContract";
import { openRuntimeFilePicker } from "../platform/filePicker";
import { getBaseName, joinNativePath } from "../platform/path";
import { sha256Hex } from "../utils/sha256";
import {
  assertManagedRelativePath,
  copyRuntimeFile,
  ensureRuntimeDirectory,
  moveRuntimePath,
  removeRuntimePath,
  writeRuntimeTextFile,
} from "./runtimePersistence";
import {
  digestRuntimeFileSource,
  inspectRuntimeFileSource,
} from "./runtimeFileTransfer";
import {
  ACP_RUNTIME_PROMPT_TEMPLATES_BY_ID,
  loadAcpRuntimePromptTemplate,
  renderAcpRuntimePromptTemplate,
} from "./acpRuntimePromptTemplates";
import {
  getAcpSkillRunPendingInteractionToken,
  getAcpSkillRunWorkspaceReadModel,
  replyAcpSkillRun,
} from "./acpSkillRunStore";

export type AssistantInteractionFileSelection = {
  slot: string;
  sourcePath: string;
  displayName: string;
};

export type StagedAcpInteractionFile = {
  slot: string;
  displayName: string;
  relativePath: string;
  size: number;
  sha256: string;
};

export type StagedAcpInteractionFiles = {
  directoryPath: string;
  directoryRelativePath: string;
  files: StagedAcpInteractionFile[];
  displayMessage: string;
  promptMessage: string;
};

const inFlightInteractionFiles = new Map<string, Promise<unknown>>();

function encodeText(value: string) {
  return new TextEncoder().encode(value);
}

function randomSubmissionKey() {
  const runtime = globalThis as {
    crypto?: { getRandomValues?: (bytes: Uint8Array) => Uint8Array };
  };
  const bytes = new Uint8Array(4);
  runtime.crypto?.getRandomValues?.(bytes);
  if (bytes.some((entry) => entry !== 0)) {
    return Array.from(bytes, (entry) =>
      entry.toString(16).padStart(2, "0"),
    ).join("");
  }
  return Math.floor(Date.now() % 0xffffffff)
    .toString(16)
    .padStart(8, "0");
}

function safeManagedFileName(value: unknown) {
  const original = String(value || "")
    .trim()
    .replace(/\\/g, "/");
  const base = original.split("/").filter(Boolean).at(-1) || "file";
  const lastDot = base.lastIndexOf(".");
  const extension =
    lastDot > 0
      ? base
          .slice(lastDot + 1)
          .replace(/[^A-Za-z0-9]+/g, "")
          .slice(0, 16)
      : "";
  const stemSource = lastDot > 0 ? base.slice(0, lastDot) : base;
  const stem =
    stemSource
      .normalize("NFKD")
      .replace(/[^A-Za-z0-9._-]+/g, "-")
      .replace(/^[-_.]+|[-_.]+$/g, "")
      .slice(0, extension ? 72 : 90) || "file";
  return extension ? `${stem}.${extension}` : stem;
}

function collisionSafeName(
  requested: string,
  used: Set<string>,
  index: number,
) {
  const initial = safeManagedFileName(requested);
  const dot = initial.lastIndexOf(".");
  const stem = dot > 0 ? initial.slice(0, dot) : initial;
  const extension = dot > 0 ? initial.slice(dot) : "";
  let candidate = initial;
  let suffix = Math.max(2, index + 1);
  while (used.has(candidate.toLowerCase())) {
    const suffixText = `-${suffix}`;
    candidate = `${stem.slice(0, Math.max(1, 90 - extension.length - suffixText.length))}${suffixText}${extension}`;
    suffix += 1;
  }
  used.add(candidate.toLowerCase());
  return candidate;
}

async function renderFileReplyPrompt(files: StagedAcpInteractionFile[]) {
  const template = await loadAcpRuntimePromptTemplate(
    ACP_RUNTIME_PROMPT_TEMPLATES_BY_ID.interaction_file_reply,
  );
  const bindings = files
    .map(
      (entry) =>
        `- ${entry.slot}: ${entry.relativePath} (${entry.displayName})`,
    )
    .join("\n");
  return renderAcpRuntimePromptTemplate({
    template,
    replacements: { file_bindings: bindings },
    requiredPlaceholders: ["file_bindings"],
  });
}

export async function stageAcpSkillRunInteractionFiles(args: {
  requestId: string;
  interactionToken: string;
  workspaceDir: string;
  selections: AssistantInteractionFileSelection[];
  submissionKey?: string;
}): Promise<StagedAcpInteractionFiles> {
  const requestId = String(args.requestId || "").trim();
  const interactionToken = String(args.interactionToken || "").trim();
  const workspaceDir = String(args.workspaceDir || "").trim();
  const selections = Array.isArray(args.selections) ? args.selections : [];
  if (!requestId || !interactionToken || !workspaceDir || !selections.length) {
    throw new Error("ACP interaction file staging arguments are incomplete");
  }
  if (selections.length > ASSISTANT_PENDING_INTERACTION_FILE_LIMIT) {
    throw new Error("ACP interaction file count exceeds the managed limit");
  }
  const digest = await sha256Hex(
    encodeText(`${requestId}\n${interactionToken}`),
  );
  if (!digest)
    throw new Error("SHA-256 is unavailable for interaction staging");
  const turnKey = digest.slice(0, 12);
  const submissionKey = safeManagedFileName(
    String(args.submissionKey || randomSubmissionKey()).slice(0, 12),
  );
  const directoryRelativePath = assertManagedRelativePath(
    `.acp-inputs/${turnKey}-${submissionKey}`,
  );
  const temporaryRelativePath = assertManagedRelativePath(
    `.acp-inputs/.tmp-${submissionKey}`,
  );
  const directoryPath = joinNativePath(workspaceDir, directoryRelativePath);
  const temporaryPath = joinNativePath(workspaceDir, temporaryRelativePath);
  const usedNames = new Set<string>(["manifest.json"]);
  const files: StagedAcpInteractionFile[] = [];
  let totalBytes = 0;
  try {
    await ensureRuntimeDirectory(joinNativePath(workspaceDir, ".acp-inputs"));
    await ensureRuntimeDirectory(temporaryPath);
    for (let index = 0; index < selections.length; index += 1) {
      const selection = selections[index];
      const source = await inspectRuntimeFileSource(selection.sourcePath);
      if (source.size > ASSISTANT_INTERACTION_FILE_MAX_BYTES) {
        throw new Error("ACP interaction file exceeds the per-file limit");
      }
      totalBytes += source.size;
      if (totalBytes > ASSISTANT_INTERACTION_TOTAL_MAX_BYTES) {
        throw new Error("ACP interaction files exceed the total limit");
      }
      const displayName =
        String(selection.displayName || "").trim() ||
        getBaseName(selection.sourcePath);
      const managedName = collisionSafeName(displayName, usedNames, index);
      const relativePath = assertManagedRelativePath(
        `${directoryRelativePath}/${managedName}`,
      );
      const temporaryTarget = joinNativePath(temporaryPath, managedName);
      await copyRuntimeFile({
        sourcePath: source.path,
        targetPath: temporaryTarget,
      });
      const fileDigest = await digestRuntimeFileSource(source);
      files.push({
        slot: String(selection.slot || "").trim() || `file-${index + 1}`,
        displayName,
        relativePath,
        size: source.size,
        sha256: fileDigest.sha256,
      });
    }
    await writeRuntimeTextFile(
      joinNativePath(temporaryPath, "manifest.json"),
      `${JSON.stringify({ schema: "zotero-agents.acp-interaction-files.v1", files }, null, 2)}\n`,
    );
    await moveRuntimePath({
      sourcePath: temporaryPath,
      targetPath: directoryPath,
    });
  } catch (error) {
    await removeRuntimePath(temporaryPath).catch(() => undefined);
    throw error;
  }
  return {
    directoryPath,
    directoryRelativePath,
    files,
    displayMessage: files.map((entry) => entry.displayName).join(", "),
    promptMessage: await renderFileReplyPrompt(files),
  };
}

export async function pickAssistantInteractionFiles(args: {
  slots: AssistantInteractionFileSlot[];
  pickFile?: (slot: AssistantInteractionFileSlot) => Promise<string | null>;
}) {
  const pickFile =
    args.pickFile ||
    ((slot: AssistantInteractionFileSlot) =>
      openRuntimeFilePicker({
        title: slot.name,
        mode: "open",
        filters: [["All files", "*.*"]],
      }) as Promise<string | null>);
  const selections: AssistantInteractionFileSelection[] = [];
  for (const slot of args.slots.slice(
    0,
    ASSISTANT_PENDING_INTERACTION_FILE_LIMIT,
  )) {
    const sourcePath = await pickFile(slot);
    if (!sourcePath) {
      if (slot.required)
        return { status: "cancelled" as const, selections: [] };
      continue;
    }
    selections.push({
      slot: slot.name,
      sourcePath,
      displayName: getBaseName(sourcePath),
    });
  }
  return {
    status: selections.length ? ("selected" as const) : ("empty" as const),
    selections,
  };
}

export async function submitAcpSkillRunInteractionFiles(args: {
  requestId: string;
  interactionToken: string;
  slots: AssistantInteractionFileSlot[];
  pickFile?: (slot: AssistantInteractionFileSlot) => Promise<string | null>;
}) {
  const requestId = String(args.requestId || "").trim();
  const interactionToken = String(args.interactionToken || "").trim();
  const flowKey = `${requestId}\n${interactionToken}`;
  if (inFlightInteractionFiles.has(flowKey)) {
    return { status: "in-flight" as const };
  }
  const flow = (async () => {
    const initial = getAcpSkillRunWorkspaceReadModel(requestId);
    if (
      !initial ||
      initial.status !== "waiting_user" ||
      interactionToken !== getAcpSkillRunPendingInteractionToken(requestId)
    ) {
      throw new Error("ACP skill run interaction token is stale.");
    }
    const picked = await pickAssistantInteractionFiles({
      slots: args.slots,
      pickFile: args.pickFile,
    });
    if (picked.status !== "selected") return { status: picked.status };
    const current = getAcpSkillRunWorkspaceReadModel(requestId);
    if (
      !current ||
      current.status !== "waiting_user" ||
      interactionToken !== getAcpSkillRunPendingInteractionToken(requestId)
    ) {
      throw new Error("ACP skill run interaction token is stale.");
    }
    const staged = await stageAcpSkillRunInteractionFiles({
      requestId,
      interactionToken,
      workspaceDir: String(current.workspaceDir || "").trim(),
      selections: picked.selections,
    });
    await replyAcpSkillRun({
      requestId,
      displayMessage: staged.displayMessage,
      promptMessage: staged.promptMessage,
      interactionToken,
    });
    return { status: "submitted" as const, staged };
  })();
  inFlightInteractionFiles.set(flowKey, flow);
  try {
    return await flow;
  } finally {
    inFlightInteractionFiles.delete(flowKey);
  }
}

export function resetAcpSkillRunInteractionFileFlowsForTests() {
  inFlightInteractionFiles.clear();
}
