export type AcpSkillRunWorkspaceSelectionHost = {
  select: (...args: any[]) => any;
  ensureSelection: (...args: any[]) => any;
  getSelected: (...args: any[]) => any;
};

let host: AcpSkillRunWorkspaceSelectionHost | undefined;

export function configureAcpSkillRunWorkspaceSelectionHost(
  nextHost: AcpSkillRunWorkspaceSelectionHost,
) {
  host = nextHost;
}

function requireAcpSkillRunWorkspaceSelectionHost() {
  if (!host) {
    throw new Error(
      "ACP Skill Run workspace selection host is not configured.",
    );
  }
  return host;
}

export async function selectAcpSkillRun(requestId: string) {
  await requireAcpSkillRunWorkspaceSelectionHost().select(requestId);
}

export function ensureAcpSkillRunWorkspaceSelection() {
  return requireAcpSkillRunWorkspaceSelectionHost().ensureSelection();
}

export function getSelectedAcpSkillRunRequestId() {
  return requireAcpSkillRunWorkspaceSelectionHost().getSelected();
}
