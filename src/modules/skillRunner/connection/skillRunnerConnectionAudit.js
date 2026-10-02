import { defaultSkillRunnerConnectionGovernor, } from "./skillRunnerConnectionGovernor";
import { readSkillRunnerConnectionAudit, } from "./skillRunnerConnectionAuditStore";
export function getSkillRunnerConnectionGovernorSnapshot(governor = defaultSkillRunnerConnectionGovernor) {
    const core = governor.getCoreSnapshot();
    const audit = readSkillRunnerConnectionAudit(governor);
    return {
        ...core,
        summary: {
            ...core.summary,
            ...audit.summary,
        },
        events: audit.events,
    };
}
