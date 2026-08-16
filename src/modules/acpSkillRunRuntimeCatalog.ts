import type { AcpSkillRunRuntimeCatalog } from "./acpSkillRunStore";

export type AcpSkillRunRuntimeCatalogHost = {
  setCatalog: (...args: any[]) => any;
  getCatalog: (...args: any[]) => any;
  updateSelection: (...args: any[]) => any;
};

let host: AcpSkillRunRuntimeCatalogHost | undefined;

export function configureAcpSkillRunRuntimeCatalogHost(
  nextHost: AcpSkillRunRuntimeCatalogHost,
) {
  host = nextHost;
}

function requireAcpSkillRunRuntimeCatalogHost() {
  if (!host) {
    throw new Error("ACP Skill Run runtime catalog host is not configured.");
  }
  return host;
}

export function setAcpSkillRunRuntimeCatalog(
  requestId: string,
  options: Partial<AcpSkillRunRuntimeCatalog> | null | undefined,
) {
  requireAcpSkillRunRuntimeCatalogHost().setCatalog(requestId, options);
}

export function getAcpSkillRunRuntimeCatalog(
  requestId: string,
): import("./acpSkillRunStore").AcpSkillRunRuntimeCatalog | null {
  return requireAcpSkillRunRuntimeCatalogHost().getCatalog(requestId);
}

export function updateAcpSkillRunRuntimeSelection(args: {
  requestId: string;
  selection: {
    modeId?: string;
    modelId?: string;
    rawModelId?: string;
    reasoningEffort?: string | null;
  };
  event?: any;
}) {
  return requireAcpSkillRunRuntimeCatalogHost().updateSelection(args);
}
