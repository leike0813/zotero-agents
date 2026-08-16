import type {
  AcpSkillRunControllerPurpose,
  AcpSkillRunSetupController,
} from "./acpSkillRunStore";

type AcpSkillRunController = {
  cancel: () => Promise<void>;
  interruptTurn?: () => Promise<void>;
  reply?: (message: string) => Promise<void>;
  replyRequest?: (args: any) => Promise<void>;
  disconnect?: () => Promise<void>;
  endSession?: () => Promise<void>;
  setConfigOption?: (args: any) => Promise<boolean>;
  setMode?: (args: any) => Promise<void>;
  setModel?: (args: any) => Promise<void>;
};

export type AcpSkillRunControllerRegistryHost = {
  registerController: (...args: any[]) => any;
  unregisterController: (...args: any[]) => any;
  registerSetupController: (...args: any[]) => any;
  unregisterSetupController: (...args: any[]) => any;
  hasController: (...args: any[]) => any;
};

let host: AcpSkillRunControllerRegistryHost | undefined;

export function configureAcpSkillRunControllerRegistryHost(
  nextHost: AcpSkillRunControllerRegistryHost,
) {
  host = nextHost;
}

function requireAcpSkillRunControllerRegistryHost() {
  if (!host) {
    throw new Error(
      "ACP Skill Run controller registry host is not configured.",
    );
  }
  return host;
}

export function registerAcpSkillRunController(
  requestId: string,
  controller: AcpSkillRunController | null,
  setupController?: AcpSkillRunSetupController,
  purpose: AcpSkillRunControllerPurpose = "workflow",
) {
  return requireAcpSkillRunControllerRegistryHost().registerController(
    requestId,
    controller,
    setupController,
    purpose,
  );
}

export function unregisterAcpSkillRunController(
  requestId: string,
  controller: AcpSkillRunController,
) {
  return requireAcpSkillRunControllerRegistryHost().unregisterController(
    requestId,
    controller,
  );
}

export function registerAcpSkillRunSetupController(
  requestId: string,
  controller: AcpSkillRunSetupController,
) {
  requireAcpSkillRunControllerRegistryHost().registerSetupController(
    requestId,
    controller,
  );
}

export function unregisterAcpSkillRunSetupController(
  requestId: string,
  controller: AcpSkillRunSetupController,
) {
  requireAcpSkillRunControllerRegistryHost().unregisterSetupController(
    requestId,
    controller,
  );
}

export function hasAcpSkillRunController(requestId: string) {
  return requireAcpSkillRunControllerRegistryHost().hasController(requestId);
}
