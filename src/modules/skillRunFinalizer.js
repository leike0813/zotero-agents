import { sha256PrefixedHex } from "../utils/sha256";
import { validateAcpSkillFinalPayload } from "./acp/skillRun/acpSkillOutputValidator";
import { writeAcpSkillRunnerResultEnvelope } from "./acp/skillRun/acpSkillOutputConvergence";
// Backend-neutral Skill Run finalizer (issue #21 resolution). It is the single
// trust seam for output Schema validation, result ownership and the sanitized
// execution receipt. The real Skill output travels on the ProviderExecutionResult
// output channel; the receipt never copies it and never carries local paths,
// provider raw responses, transcript/assistant text, tool args or apply state.
export const SKILL_RUN_RESPONSE_SCHEMA = "zotero-agents.skill-run-response.v1";
export const SKILL_RUN_PROTOCOL_VERSION = "v1";
function isRecord(value) {
    return !!value && typeof value === "object" && !Array.isArray(value);
}
function sanitizeArtifactRefs(refs) {
    return refs
        .map((ref) => String(ref || "")
        .replace(/\\/g, "/")
        .trim())
        .filter((ref) => ref && !ref.startsWith("/") && !/^[A-Za-z]:\//.test(ref))
        .sort();
}
async function digestOf(value) {
    return ((await sha256PrefixedHex(new TextEncoder().encode(JSON.stringify(value)))) || "");
}
// Early submit validation for the Built-in Pi runtime. Pi rejects a candidate
// payload before its own sealing while sharing the exact ACP output contract,
// so validation rules and stable codes keep one source of truth.
export async function validateSkillRunSubmission(args) {
    const prepared = args.prepared;
    const frozenSchema = prepared?.schemas.output;
    // A snapshot is the authority for the dynamic output Schema on both the early
    // and final paths: when a Prepared Skill Run is supplied without one, fail
    // closed instead of re-discovering a possibly newer Schema from disk.
    if (prepared &&
        !frozenSchema?.document &&
        typeof args.outputSchema === "undefined") {
        return {
            ok: false,
            errors: ["output schema is missing from the prepared skill run snapshot"],
            artifactRefs: [],
        };
    }
    const validation = await validateAcpSkillFinalPayload({
        payload: args.payload,
        runnerJson: prepared?.runnerJson || args.runnerJson || {},
        primarySkillDir: prepared?.primarySkillDir || args.primarySkillDir || "",
        workspaceDir: prepared?.workspace.workspaceDir || args.workspaceDir,
        outputSchema: frozenSchema?.document ?? args.outputSchema,
        outputSchemaPath: frozenSchema?.path ?? args.outputSchemaPath,
        readArtifactText: args.readArtifactText,
    });
    const artifactRefs = sanitizeArtifactRefs(validation.artifactPaths || []);
    if (!validation.ok || !isRecord(validation.resultJson)) {
        return {
            ok: false,
            errors: validation.errors,
            ...(validation.schemaPath ? { schemaPath: validation.schemaPath } : {}),
            artifactRefs,
        };
    }
    return {
        ok: true,
        resultJson: { ...validation.resultJson },
        errors: [],
        ...(validation.schemaPath ? { schemaPath: validation.schemaPath } : {}),
        artifactRefs,
    };
}
// Versioned execution receipt for any terminal status. Failed receipts carry
// the stable error object; the receipt never mirrors the Skill output.
export function buildSkillRunResponseEnvelope(args) {
    return {
        schema: SKILL_RUN_RESPONSE_SCHEMA,
        status: args.status,
        requestId: args.requestId,
        backend: { id: args.backend.id, type: args.backend.type },
        fetchType: args.fetchType ?? "result",
        result: {
            resolution: "workflow-result-context",
            ...(args.resultDigest ? { digest: args.resultDigest } : {}),
            artifactCount: Math.max(0, Math.floor(Number(args.artifactCount || 0) || 0)),
        },
        provenance: {
            protocolVersion: SKILL_RUN_PROTOCOL_VERSION,
            ...(args.preparedSnapshotDigest
                ? { preparedSnapshotDigest: args.preparedSnapshotDigest }
                : {}),
            ...(args.skillId ? { skillId: args.skillId } : {}),
            ...(typeof args.repairRounds === "number"
                ? { repairRounds: args.repairRounds }
                : {}),
        },
        ...(args.error ? { error: { ...args.error } } : {}),
    };
}
export async function finalizeSkillRun(args) {
    const { prepared } = args;
    const validation = await validateSkillRunSubmission({
        payload: args.payload,
        prepared,
        readArtifactText: args.readArtifactText,
    });
    if (!validation.ok || !validation.resultJson) {
        return {
            ok: false,
            errors: validation.errors,
            ...(validation.schemaPath ? { schemaPath: validation.schemaPath } : {}),
            artifactRefs: validation.artifactRefs,
        };
    }
    const resultJsonPath = prepared.workspace.resultJsonPath;
    await writeAcpSkillRunnerResultEnvelope({
        resultJsonPath,
        resultJson: validation.resultJson,
    });
    const resultDigest = await digestOf(validation.resultJson);
    return {
        ok: true,
        resultJson: validation.resultJson,
        resultJsonPath,
        workspaceDir: prepared.workspace.workspaceDir,
        resultDigest,
        artifacts: validation.artifactRefs,
        ...(validation.schemaPath ? { schemaPath: validation.schemaPath } : {}),
        responseJson: buildSkillRunResponseEnvelope({
            status: "succeeded",
            requestId: prepared.requestId,
            backend: args.backend,
            fetchType: args.fetchType ?? "result",
            resultDigest,
            artifactCount: validation.artifactRefs.length,
            preparedSnapshotDigest: prepared.provenance.snapshotDigest,
            skillId: prepared.skillId,
            repairRounds: args.repairRounds,
        }),
    };
}
