import { defineAssistantWorkspacePublicationAdapter, } from "../publication/assistantWorkspacePublicationRuntime";
import { workflowSubmissionQueue } from "../../../jobQueue/workflowSubmissionQueue";
export function mapWorkspaceChangeKindsToPublicationKinds(mapping, kinds) {
    return Array.from(new Set(kinds.flatMap((kind) => mapping[kind])));
}
/**
 * Per-kind region read dispatcher shared by the three surface adapters: each
 * requested kind runs its reader (when one is registered) and a defined
 * result lands under that kind. Readers returning undefined leave the kind
 * unpublished (e.g. a missing owner-details read model).
 */
export async function readWorkspaceOwnerRegions(args) {
    const regions = {};
    for (const kind of new Set(args.kinds)) {
        const read = args.readers[kind];
        if (!read)
            continue;
        // Synchronous readers resolve in the same tick, matching the per-kind
        // if-chain this dispatcher replaces; only genuine promises yield.
        const payload = read();
        const resolved = payload instanceof Promise ? await payload : payload;
        if (resolved === undefined)
            continue;
        regions[kind] = resolved;
    }
    return regions;
}
/**
 * Owner-control DTO assembly. All field values are sourced per-source; this
 * factory only pins the shared 8-field block shape (and its key order).
 */
export function createWorkspaceOwnerControl(args) {
    return {
        status: args.status,
        busy: args.busy,
        hint: args.hint,
        interaction: args.interaction,
        connection: args.connection,
        execution: args.execution,
        authentication: args.authentication,
        permissionPolicy: args.permissionPolicy,
        badges: args.badges,
    };
}
/**
 * Banner subtitle shared by the skill-run surfaces (ACP Skills and
 * SkillRunner): the resolved skill label, upgraded to the
 * `<step> <skill>/<workflow>` form when the run belongs to a sequence.
 * Pure label math — no source-specific state.
 */
export function skillRunSecondaryLabel(value) {
    const skillLabel = String(value.skillName || value.skillId || value.requestId).trim() ||
        value.requestId;
    const sequenceStepIndex = Number(value.sequenceStepIndex);
    const hasSequenceStepIndex = typeof value.sequenceStepIndex === "number" &&
        Number.isFinite(sequenceStepIndex) &&
        sequenceStepIndex >= 0;
    if (!value.sequenceStepId && !hasSequenceStepIndex)
        return skillLabel;
    const sequenceNumber = hasSequenceStepIndex
        ? Math.floor(sequenceStepIndex) + 1
        : null;
    const sequenceLabel = sequenceNumber
        ? ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣"][sequenceNumber - 1] || `#${sequenceNumber}`
        : "";
    const workflowLabel = String(value.workflowLabel || value.workflowId || "").trim();
    const taskLabel = workflowLabel
        ? `${skillLabel}/${workflowLabel}`
        : skillLabel;
    return [sequenceLabel, taskLabel].filter(Boolean).join(" ");
}
/**
 * Queued-workflow navigation entries shared by the skills and skillrunner
 * owner-navigation builders: queued units of one backend type become
 * navigation entries, ensuring a "queued" drawer group per backend. Group id
 * derivation and label sourcing stay per-source via the injected accessors.
 */
export function listQueuedWorkspaceNavigationEntries(args) {
    return workflowSubmissionQueue
        .listQueued()
        .filter((entry) => entry.backendType === args.backendType)
        .map((entry) => {
        const groupId = args.groupIdOf(entry);
        if (!args.groups.has(groupId)) {
            args.groups.set(groupId, {
                groupId,
                label: args.missingGroupLabel(entry, groupId),
                status: "queued",
                disabledReason: null,
            });
        }
        return {
            queueId: entry.queueId,
            groupId,
            label: entry.taskName || entry.workflowLabel || entry.workflowId,
            subtitle: entry.workflowLabel || null,
            groupLabel: args.entryGroupLabel(entry, groupId),
            updatedAt: entry.createdAt || null,
            canCancel: entry.canCancel,
            submission: entry.submission,
            resumptionPending: false,
        };
    });
}
export function defineAssistantWorkspaceSurfaceAdapter(adapter) {
    return defineAssistantWorkspacePublicationAdapter(adapter);
}
