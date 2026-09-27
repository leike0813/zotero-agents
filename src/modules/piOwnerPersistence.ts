import { listRuntimeChildDirectories } from "./runtimePersistence";
import { upsertPiOwnerRegistry } from "./pluginStateStore";
import {
  appendPiTranscript,
  createPiTranscript,
  inspectPiTranscript,
  readPiTranscriptPage,
  rebuildPiIndex,
  repairPiTornTail,
  withPiOwnerWrite,
  type PiInspection,
  type PiOwnerRef,
  type PiTranscriptInput,
} from "./piTranscriptStore";
import { getRuntimePersistencePaths } from "./runtimePersistence";
import { joinPath } from "../utils/path";

export type PiConversationRecord = {
  kind: "conversation";
  conversationId: string;
  entryCount: number;
  lastSequence: number;
  updatedAt: string;
  projection: "ready" | "pending";
};
export type PiSkillRunRecord = {
  kind: "skill_run";
  skillRunId: string;
  entryCount: number;
  lastSequence: number;
  updatedAt: string;
  projection: "ready" | "pending";
};
export type PiOwnerRecord = PiConversationRecord | PiSkillRunRecord;

function record(
  ref: PiOwnerRef,
  inspection: PiInspection,
  projection: "ready" | "pending",
): PiOwnerRecord {
  const common = {
    entryCount: inspection.entries.length,
    lastSequence: inspection.entries.length,
    updatedAt:
      inspection.entries.at(-1)?.createdAt || inspection.header!.createdAt,
    projection,
  };
  return ref.kind === "conversation"
    ? { kind: "conversation", conversationId: ref.ownerId, ...common }
    : { kind: "skill_run", skillRunId: ref.ownerId, ...common };
}

async function project(
  ref: PiOwnerRef,
  inspection: PiInspection,
  root?: string,
): Promise<"ready" | "pending"> {
  try {
    await rebuildPiIndex(ref, inspection, root);
    upsertPiOwnerRegistry({
      ownerKind: ref.kind,
      ownerId: ref.ownerId,
      entryCount: inspection.entries.length,
      lastSequence: inspection.entries.length,
      updatedAt:
        inspection.entries.at(-1)?.createdAt || inspection.header!.createdAt,
    });
    return "ready";
  } catch {
    return "pending";
  }
}

export async function createPiOwner(
  ref: PiOwnerRef,
  root?: string,
): Promise<PiOwnerRecord> {
  return withPiOwnerWrite(ref, root, async () => {
    const inspection = await createPiTranscript(ref, root);
    return record(ref, inspection, await project(ref, inspection, root));
  });
}

export async function appendPiOwnerEntry(
  ref: PiOwnerRef,
  input: PiTranscriptInput,
  root?: string,
) {
  return withPiOwnerWrite(ref, root, async () => {
    const { entry, inspection } = await appendPiTranscript(ref, input, root);
    return {
      sequence: entry.seq,
      projection: await project(ref, inspection, root),
    };
  });
}

export function inspectPiOwner(ref: PiOwnerRef, root?: string) {
  return inspectPiTranscript(ref, root);
}
export function readPiOwnerPage(
  ref: PiOwnerRef,
  options: { cursor?: number; limit?: number } = {},
  root?: string,
) {
  return readPiTranscriptPage(ref, options, root);
}

export async function rebuildPiOwnerProjections(
  ref: PiOwnerRef,
  root?: string,
): Promise<PiOwnerRecord> {
  return withPiOwnerWrite(ref, root, async () => {
    const inspection = await inspectPiTranscript(ref, root);
    if (inspection.status !== "valid")
      throw new Error(`pi_transcript_${inspection.status}`);
    const projection = await project(ref, inspection, root);
    if (projection !== "ready") throw new Error("pi_projection_rebuild_failed");
    return record(ref, inspection, projection);
  });
}

export async function repairPiOwnerTornTail(ref: PiOwnerRef, root?: string) {
  return withPiOwnerWrite(ref, root, async () => {
    const inspection = await repairPiTornTail(ref, root);
    if (inspection.status !== "valid")
      throw new Error(`pi_transcript_${inspection.status}`);
    return record(ref, inspection, await project(ref, inspection, root));
  });
}

export async function rebuildAllPiOwnerProjections(root?: string) {
  const ownersDir = getRuntimePersistencePaths(root).piOwnersDir;
  const results: Array<{
    ref: PiOwnerRef;
    record?: PiOwnerRecord;
    issue?: string;
  }> = [];
  for (const kind of ["conversation", "skill_run"] as const) {
    for (const dir of await listRuntimeChildDirectories(
      joinPath(ownersDir, kind),
    )) {
      const ownerId =
        dir
          .replace(/[\\/]+$/, "")
          .split(/[\\/]/)
          .at(-1) || "";
      const ref = { kind, ownerId };
      try {
        results.push({
          ref,
          record: await rebuildPiOwnerProjections(ref, root),
        });
      } catch (error) {
        results.push({ ref, issue: String(error) });
      }
    }
  }
  return results;
}
