import { joinPath } from "../../../utils/path";
import { appendRuntimeTextFile, readRuntimeTextFile, writeRuntimeTextFile, } from "../../runtimePersistence";
export const ACP_SKILL_RUN_CONTEXT_SCHEMA = "zotero-skills.acp.skill-run.context.v1";
export const ACP_SKILL_RUN_OUTPUT_REVISION_SCHEMA = "zotero-skills.acp.skill-run.output-revision.v1";
function normalizeString(value) {
    return String(value || "").trim();
}
export function resolveAcpSkillRunPayloadPaths(runtimeDirRaw) {
    const runtimeDir = normalizeString(runtimeDirRaw);
    if (!runtimeDir) {
        return {};
    }
    return {
        runContextPath: joinPath(runtimeDir, "run-context.json"),
        outputRevisionsPath: joinPath(runtimeDir, "output-revisions.jsonl"),
    };
}
export async function writeAcpSkillRunContextPayload(args) {
    const refs = resolveAcpSkillRunPayloadPaths(args.runtimeDir);
    if (!refs.runContextPath) {
        return refs;
    }
    const existing = await readAcpSkillRunContextPayload(args.runtimeDir);
    const merged = {
        ...(existing || {}),
    };
    delete merged.schema;
    delete merged.updatedAt;
    for (const [key, value] of Object.entries(args.payload)) {
        if (typeof value !== "undefined") {
            merged[key] = value;
        }
    }
    const payload = {
        schema: ACP_SKILL_RUN_CONTEXT_SCHEMA,
        ...merged,
        updatedAt: normalizeString(args.updatedAt) || new Date().toISOString(),
    };
    await writeRuntimeTextFile(refs.runContextPath, JSON.stringify(payload));
    return refs;
}
export async function readAcpSkillRunContextPayload(runtimeDir) {
    const refs = resolveAcpSkillRunPayloadPaths(runtimeDir);
    if (!refs.runContextPath) {
        return null;
    }
    const text = await readRuntimeTextFile(refs.runContextPath);
    if (!text.trim()) {
        return null;
    }
    try {
        const parsed = JSON.parse(text);
        return parsed.schema === ACP_SKILL_RUN_CONTEXT_SCHEMA ? parsed : null;
    }
    catch {
        return null;
    }
}
export async function writeAcpSkillRunOutputRevisions(args) {
    const refs = resolveAcpSkillRunPayloadPaths(args.runtimeDir);
    if (!refs.outputRevisionsPath) {
        return refs;
    }
    const lines = args.revisions.map((revision, index) => JSON.stringify({
        schema: ACP_SKILL_RUN_OUTPUT_REVISION_SCHEMA,
        seq: index + 1,
        revision,
        createdAt: revision.createdAt,
    }));
    await writeRuntimeTextFile(refs.outputRevisionsPath, lines.length > 0 ? `${lines.join("\n")}\n` : "");
    return refs;
}
export async function appendAcpSkillRunOutputRevision(args) {
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
export async function readAcpSkillRunOutputRevisions(runtimeDir) {
    const refs = resolveAcpSkillRunPayloadPaths(runtimeDir);
    if (!refs.outputRevisionsPath) {
        return [];
    }
    const text = await readRuntimeTextFile(refs.outputRevisionsPath);
    return text
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
        try {
            const parsed = JSON.parse(line);
            return parsed.schema === ACP_SKILL_RUN_OUTPUT_REVISION_SCHEMA
                ? parsed.revision
                : null;
        }
        catch {
            return null;
        }
    })
        .filter((entry) => !!entry);
}
