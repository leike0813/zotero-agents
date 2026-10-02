export function normalizeSkillRunnerSubmissionText(value) {
    return String(value || "").trim();
}
export function resolveSkillRunnerSkillDisplay(args) {
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
