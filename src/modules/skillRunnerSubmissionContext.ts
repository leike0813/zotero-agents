export type SkillRunnerSkillDisplayById = Record<
  string,
  {
    skillId: string;
    skillName?: string;
    skillLabel?: string;
  }
>;

export function normalizeSkillRunnerSubmissionText(value: unknown) {
  return String(value || "").trim();
}

export function resolveSkillRunnerSkillDisplay(args: {
  skillDisplayById?: SkillRunnerSkillDisplayById;
  skillId?: string;
}) {
  const skillId = normalizeSkillRunnerSubmissionText(args.skillId);
  if (!skillId) {
    return { skillId: "", skillName: "", skillLabel: "" };
  }
  const display = args.skillDisplayById?.[skillId];
  return {
    skillId,
    skillName: normalizeSkillRunnerSubmissionText(display?.skillName),
    skillLabel: normalizeSkillRunnerSubmissionText(display?.skillLabel),
  };
}
