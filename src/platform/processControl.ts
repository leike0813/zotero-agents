import {
  getRuntimeCommandRegistrySnapshot,
  type RuntimeCommandRegistrySnapshot,
} from "./command";
import { detectRuntimePlatform } from "./runtimePlatform";

function normalizeString(value: unknown) {
  return String(value || "").trim();
}

export type RuntimeProcessCleanupStrategy =
  | "posix-pidfile-supervisor"
  | "windows-bridge"
  | "direct-kill-only"
  | "unsupported";

export type RuntimeProcessControlDiagnostic = {
  stage: "startup-process-control";
  ok: boolean;
  message: string;
};

export type RuntimeProcessControlSnapshot = {
  initialized: boolean;
  initializedAt?: string;
  platform: string;
  preferredCleanupStrategy: RuntimeProcessCleanupStrategy;
  supportsProcessTreeCleanup: boolean;
  supportsProcessGroupLaunch: boolean;
  supportsNegativePidSignal: boolean;
  supportsPidFileSupervisor: boolean;
  diagnostics?: RuntimeProcessControlDiagnostic[];
};

export type RuntimeProcessControlPreflightOptions = {
  platform?: string;
  commandRegistry?: RuntimeCommandRegistrySnapshot;
  now?: () => string;
};

let processControlSnapshot: RuntimeProcessControlSnapshot = {
  initialized: false,
  platform: detectRuntimePlatform(),
  preferredCleanupStrategy: "unsupported",
  supportsProcessTreeCleanup: false,
  supportsProcessGroupLaunch: false,
  supportsNegativePidSignal: false,
  supportsPidFileSupervisor: false,
};

function isCommandAvailable(
  snapshot: RuntimeCommandRegistrySnapshot,
  command: "sh" | "setsid" | "kill",
) {
  return snapshot.commands[command]?.available === true;
}

function cloneProcessControlSnapshot(
  snapshot: RuntimeProcessControlSnapshot,
): RuntimeProcessControlSnapshot {
  return {
    ...snapshot,
    diagnostics: snapshot.diagnostics
      ? snapshot.diagnostics.map((entry) => ({ ...entry }))
      : undefined,
  };
}

function buildProcessControlSnapshot(
  options: RuntimeProcessControlPreflightOptions = {},
): RuntimeProcessControlSnapshot {
  const platform = normalizeString(options.platform) || detectRuntimePlatform();
  const commandRegistry =
    options.commandRegistry || getRuntimeCommandRegistrySnapshot();
  const diagnostics: RuntimeProcessControlDiagnostic[] = [];
  const now = options.now || (() => new Date().toISOString());

  if (platform === "win32") {
    diagnostics.push({
      stage: "startup-process-control",
      ok: true,
      message:
        "Windows ACP process tree cleanup is delegated to bridge transports when available",
    });
    return {
      initialized: true,
      initializedAt: now(),
      platform,
      preferredCleanupStrategy: "windows-bridge",
      supportsProcessTreeCleanup: true,
      supportsProcessGroupLaunch: false,
      supportsNegativePidSignal: false,
      supportsPidFileSupervisor: false,
      diagnostics,
    };
  }

  const hasShell = isCommandAvailable(commandRegistry, "sh");
  const hasSetsid = isCommandAvailable(commandRegistry, "setsid");
  const hasKill = isCommandAvailable(commandRegistry, "kill");
  if (hasShell && hasSetsid && hasKill) {
    diagnostics.push({
      stage: "startup-process-control",
      ok: true,
      message: "POSIX pidfile supervisor process-group cleanup is available",
    });
    return {
      initialized: true,
      initializedAt: now(),
      platform,
      preferredCleanupStrategy: "posix-pidfile-supervisor",
      supportsProcessTreeCleanup: true,
      supportsProcessGroupLaunch: true,
      supportsNegativePidSignal: true,
      supportsPidFileSupervisor: true,
      diagnostics,
    };
  }

  diagnostics.push({
    stage: "startup-process-control",
    ok: false,
    message: `POSIX process tree cleanup unavailable; sh=${hasShell}, setsid=${hasSetsid}, kill=${hasKill}`,
  });
  return {
    initialized: true,
    initializedAt: now(),
    platform,
    preferredCleanupStrategy: "direct-kill-only",
    supportsProcessTreeCleanup: false,
    supportsProcessGroupLaunch: false,
    supportsNegativePidSignal: hasKill,
    supportsPidFileSupervisor: false,
    diagnostics,
  };
}

export async function preflightRuntimeProcessControlOnStartup(
  options: RuntimeProcessControlPreflightOptions = {},
) {
  if (processControlSnapshot.initialized) {
    return getRuntimeProcessControlSnapshot();
  }
  processControlSnapshot = buildProcessControlSnapshot(options);
  return getRuntimeProcessControlSnapshot();
}

export function getRuntimeProcessControlSnapshot() {
  return cloneProcessControlSnapshot(processControlSnapshot);
}

export function seedRuntimeProcessControlSnapshotForTests(
  snapshot: RuntimeProcessControlSnapshot,
) {
  processControlSnapshot = cloneProcessControlSnapshot(snapshot);
}

export function resetRuntimeProcessControlSnapshotForTests() {
  processControlSnapshot = {
    initialized: false,
    platform: detectRuntimePlatform(),
    preferredCleanupStrategy: "unsupported",
    supportsProcessTreeCleanup: false,
    supportsProcessGroupLaunch: false,
    supportsNegativePidSignal: false,
    supportsPidFileSupervisor: false,
  };
}
