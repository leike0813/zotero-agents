import {
  defaultSkillRunnerConnectionGovernor,
  type SkillRunnerConnectionGovernor,
  type SkillRunnerConnectionGovernorCoreSnapshot,
} from "./skillRunnerConnectionGovernor";
import {
  readSkillRunnerConnectionAudit,
  type SkillRunnerConnectionAuditEvent,
} from "./skillRunnerConnectionAuditStore";

export type SkillRunnerConnectionGovernorSnapshot = Omit<
  SkillRunnerConnectionGovernorCoreSnapshot,
  "summary"
> & {
  summary: SkillRunnerConnectionGovernorCoreSnapshot["summary"] & {
    timeoutCount: number;
    lateSettlementCount: number;
    skippedReachabilityCount: number;
    skippedBackgroundCount: number;
    skippedHistoryCount: number;
    recentTimeoutAt?: number;
  };
  events: SkillRunnerConnectionAuditEvent[];
};

export function getSkillRunnerConnectionGovernorSnapshot(
  governor: SkillRunnerConnectionGovernor = defaultSkillRunnerConnectionGovernor,
): SkillRunnerConnectionGovernorSnapshot {
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
