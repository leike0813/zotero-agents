import { joinPath } from "../utils/path";
import {
  readRuntimeTextFile,
  writeRuntimeTextFile,
} from "./runtimePersistence";
import type { AcpSkillRunOutputRevision } from "./acpSkillRunStore";

export const ACP_SKILL_RUN_CONTEXT_SCHEMA =
  "zotero-skills.acp.skill-run.context.v1";
export const ACP_SKILL_RUN_OUTPUT_REVISION_SCHEMA =
  "zotero-skills.acp.skill-run.output-revision.v1";

function normalizeString(value: unknown) {
  return String(value || "").trim();
}

export type AcpSkillRunPayloadRefs = {
  runContextPath?: string;
  outputRevisionsPath?: string;
};

export type AcpSkillRunContextPayload = {
  schema: typeof ACP_SKILL_RUN_CONTEXT_SCHEMA;
  requestPayload?: unknown;
  runnerJson?: Record<string, unknown>;
  providerOptions?: Record<string, unknown>;
  primarySkillDir?: string;
  requestedSkillId?: string;
  requestedSkillProxyPath?: string;
  sharedSkillCatalogPath?: string;
  proxySkillRoots?: string[];
  executionMode?: "auto" | "interactive";
  workspaceDir?: string;
  runtimeDir?: string;
  inputManifestPath?: string;
  resultJsonPath?: string;
  updatedAt: string;
};

export function resolveAcpSkillRunPayloadPaths(
  runtimeDirRaw?: string,
): AcpSkillRunPayloadRefs {
  const runtimeDir = normalizeString(runtimeDirRaw);
  if (!runtimeDir) {
    return {};
  }
  return {
    runContextPath: joinPath(runtimeDir, "run-context.json"),
    outputRevisionsPath: joinPath(runtimeDir, "output-revisions.jsonl"),
  };
}

export async function writeAcpSkillRunContextPayload(args: {
  runtimeDir?: string;
  payload: Omit<AcpSkillRunContextPayload, "schema" | "updatedAt">;
  updatedAt?: string;
}) {
  const refs = resolveAcpSkillRunPayloadPaths(args.runtimeDir);
  if (!refs.runContextPath) {
    return refs;
  }
  const payload: AcpSkillRunContextPayload = {
    schema: ACP_SKILL_RUN_CONTEXT_SCHEMA,
    ...args.payload,
    updatedAt: normalizeString(args.updatedAt) || new Date().toISOString(),
  };
  await writeRuntimeTextFile(refs.runContextPath, JSON.stringify(payload));
  return refs;
}

export async function readAcpSkillRunContextPayload(runtimeDir?: string) {
  const refs = resolveAcpSkillRunPayloadPaths(runtimeDir);
  if (!refs.runContextPath) {
    return null;
  }
  const text = await readRuntimeTextFile(refs.runContextPath);
  if (!text.trim()) {
    return null;
  }
  try {
    const parsed = JSON.parse(text) as AcpSkillRunContextPayload;
    return parsed.schema === ACP_SKILL_RUN_CONTEXT_SCHEMA ? parsed : null;
  } catch {
    return null;
  }
}

export async function writeAcpSkillRunOutputRevisions(args: {
  runtimeDir?: string;
  revisions: AcpSkillRunOutputRevision[];
}) {
  const refs = resolveAcpSkillRunPayloadPaths(args.runtimeDir);
  if (!refs.outputRevisionsPath) {
    return refs;
  }
  const lines = args.revisions.map((revision, index) =>
    JSON.stringify({
      schema: ACP_SKILL_RUN_OUTPUT_REVISION_SCHEMA,
      seq: index + 1,
      revision,
      createdAt: revision.createdAt,
    }),
  );
  await writeRuntimeTextFile(
    refs.outputRevisionsPath,
    lines.length > 0 ? `${lines.join("\n")}\n` : "",
  );
  return refs;
}

export async function readAcpSkillRunOutputRevisions(runtimeDir?: string) {
  const refs = resolveAcpSkillRunPayloadPaths(runtimeDir);
  if (!refs.outputRevisionsPath) {
    return [];
  }
  const text: string = await readRuntimeTextFile(refs.outputRevisionsPath);
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      try {
        const parsed = JSON.parse(line) as {
          schema?: string;
          revision?: AcpSkillRunOutputRevision;
        };
        return parsed.schema === ACP_SKILL_RUN_OUTPUT_REVISION_SCHEMA
          ? parsed.revision
          : null;
      } catch {
        return null;
      }
    })
    .filter((entry): entry is AcpSkillRunOutputRevision => !!entry);
}
