import { joinPath } from "../utils/path";
import {
  appendRuntimeTextFile,
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
  const existing = await readAcpSkillRunContextPayload(args.runtimeDir);
  const merged: Omit<AcpSkillRunContextPayload, "schema" | "updatedAt"> = {
    ...(existing || {}),
  };
  delete (merged as Partial<AcpSkillRunContextPayload>).schema;
  delete (merged as Partial<AcpSkillRunContextPayload>).updatedAt;
  for (const [key, value] of Object.entries(args.payload)) {
    if (typeof value !== "undefined") {
      (merged as Record<string, unknown>)[key] = value;
    }
  }
  const payload: AcpSkillRunContextPayload = {
    schema: ACP_SKILL_RUN_CONTEXT_SCHEMA,
    ...merged,
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

export async function appendAcpSkillRunOutputRevision(args: {
  runtimeDir?: string;
  revision: AcpSkillRunOutputRevision;
  seq: number;
}) {
  const refs = resolveAcpSkillRunPayloadPaths(args.runtimeDir);
  if (!refs.outputRevisionsPath) {
    return refs;
  }
  const line = JSON.stringify({
    schema: ACP_SKILL_RUN_OUTPUT_REVISION_SCHEMA,
    seq: Math.max(1, Math.floor(Number(args.seq || 1) || 1)),
    revision: args.revision,
    createdAt: args.revision.createdAt,
  });
  await appendRuntimeTextFile(refs.outputRevisionsPath, `${line}\n`);
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
