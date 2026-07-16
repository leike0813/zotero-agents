import fs from "node:fs";
import path from "node:path";
import {
  SYNTHESIS_SIDECAR_DISCOVERY_SCHEMA,
  SYNTHESIS_SIDECAR_OWNER_SCHEMA,
  rebuildSynthesisSidecarLease,
  rebuildSynthesisSidecarOwner,
  type SynthesisSidecarDiscovery,
  type SynthesisSidecarOwner,
} from "../../../packages/synthesis-contracts/src/sidecarLifecycle.js";
import type { SynthesisSidecarRuntimeConfig } from "./runtimeConfig.js";
import { writeServiceLog } from "./logging.js";
import { SYNTHESIS_SIDECAR_CAPABILITIES } from "../../../packages/synthesis-contracts/src/sidecarSystem.js";

const DEFAULT_LEASE_CHECK_MS = 15_000;
const DEFAULT_LEASE_TIMEOUT_MS = 120_000;
const DEFAULT_RESUME_GRACE_MS = 30_000;

type LifecycleOptions = {
  now?: () => number;
  isPidAlive?: (pid: number) => boolean;
  leaseCheckMs?: number;
  leaseTimeoutMs?: number;
  resumeGraceMs?: number;
};

export type SynthesisSidecarServiceLifecycle = {
  publishDiscovery(args: { port: number }): void;
  startLeaseMonitor(onExpired: () => void): void;
  release(): void;
};

function lifecyclePaths(config: SynthesisSidecarRuntimeConfig) {
  const profileRoot = config.profileRuntimeRoot;
  const ownerDir = path.join(profileRoot, "owner");
  const ownerPath = path.join(ownerDir, "owner.json");
  const discoveryPath = path.join(profileRoot, "discovery.json");
  const sessionRoot = path.join(
    profileRoot,
    "sessions",
    config.supervisorInstanceId,
  );
  return {
    profileRoot,
    ownerDir,
    ownerPath,
    discoveryPath,
    sessionRoot,
    configPath: path.join(sessionRoot, "config.json"),
    leasePath: path.join(sessionRoot, "lease.json"),
  };
}

function readJson(pathname: string) {
  return JSON.parse(fs.readFileSync(pathname, "utf8")) as unknown;
}

function writeJsonAtomically(pathname: string, value: unknown, mode = 0o600) {
  const temporaryPath = `${pathname}.tmp-${process.pid}-${Date.now()}`;
  fs.mkdirSync(path.dirname(pathname), { recursive: true, mode: 0o700 });
  fs.writeFileSync(temporaryPath, `${JSON.stringify(value)}\n`, {
    encoding: "utf8",
    mode,
    flag: "wx",
  });
  fs.renameSync(temporaryPath, pathname);
  if (process.platform !== "win32") {
    fs.chmodSync(pathname, mode);
  }
}

function defaultPidAlive(pid: number) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === "EPERM";
  }
}

function ownerMatches(
  owner: SynthesisSidecarOwner,
  expected: SynthesisSidecarOwner,
) {
  return (
    owner.profileId === expected.profileId &&
    owner.supervisorInstanceId === expected.supervisorInstanceId &&
    owner.serviceInstanceId === expected.serviceInstanceId &&
    owner.leaseNonce === expected.leaseNonce &&
    owner.pid === expected.pid
  );
}

function removeOwnerIfMatching(
  ownerPath: string,
  ownerDir: string,
  expected: SynthesisSidecarOwner,
) {
  try {
    if (
      !ownerMatches(rebuildSynthesisSidecarOwner(readJson(ownerPath)), expected)
    ) {
      return;
    }
    fs.rmSync(ownerDir, { recursive: true, force: true });
  } catch {
    // Another instance may have replaced or already removed the owner.
  }
}

function leaseAllowsRecovery(args: {
  profileRoot: string;
  owner: SynthesisSidecarOwner;
  currentSupervisorInstanceId: string;
  currentLeaseNonce: string;
  nowMs: number;
  leaseTimeoutMs: number;
}) {
  if (
    args.owner.supervisorInstanceId === args.currentSupervisorInstanceId &&
    args.owner.leaseNonce === args.currentLeaseNonce
  ) {
    return true;
  }
  const leasePath = path.join(
    args.profileRoot,
    "sessions",
    args.owner.supervisorInstanceId,
    "lease.json",
  );
  try {
    const lease = rebuildSynthesisSidecarLease(readJson(leasePath));
    return (
      lease.profileId !== args.owner.profileId ||
      lease.supervisorInstanceId !== args.owner.supervisorInstanceId ||
      lease.leaseNonce !== args.owner.leaseNonce ||
      args.nowMs - lease.updatedAtMs > args.leaseTimeoutMs
    );
  } catch {
    return true;
  }
}

function acquireOwner(args: {
  config: SynthesisSidecarRuntimeConfig;
  serviceInstanceId: string;
  now: () => number;
  isPidAlive: (pid: number) => boolean;
  leaseTimeoutMs: number;
}) {
  const paths = lifecyclePaths(args.config);
  fs.mkdirSync(paths.profileRoot, { recursive: true, mode: 0o700 });
  const owner: SynthesisSidecarOwner = {
    schema: SYNTHESIS_SIDECAR_OWNER_SCHEMA,
    profileId: args.config.profileId,
    supervisorInstanceId: args.config.supervisorInstanceId,
    serviceInstanceId: args.serviceInstanceId,
    leaseNonce: args.config.leaseNonce,
    pid: process.pid,
    createdAtMs: args.now(),
  };
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      fs.mkdirSync(paths.ownerDir, { mode: 0o700 });
      writeJsonAtomically(paths.ownerPath, owner);
      return { owner, paths };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") {
        throw error;
      }
      let existing: SynthesisSidecarOwner;
      try {
        existing = rebuildSynthesisSidecarOwner(readJson(paths.ownerPath));
      } catch {
        throw new Error("sidecar_owner_invalid");
      }
      if (args.isPidAlive(existing.pid)) {
        throw new Error("sidecar_owner_conflict");
      }
      if (
        !leaseAllowsRecovery({
          profileRoot: paths.profileRoot,
          owner: existing,
          currentSupervisorInstanceId: args.config.supervisorInstanceId,
          currentLeaseNonce: args.config.leaseNonce,
          nowMs: args.now(),
          leaseTimeoutMs: args.leaseTimeoutMs,
        })
      ) {
        throw new Error("sidecar_owner_lease_fresh");
      }
      const tombstone = `${paths.ownerDir}.stale-${process.pid}-${args.now()}`;
      try {
        fs.renameSync(paths.ownerDir, tombstone);
        fs.rmSync(tombstone, { recursive: true, force: true });
      } catch (renameError) {
        if ((renameError as NodeJS.ErrnoException).code !== "ENOENT") {
          throw new Error("sidecar_owner_recovery_failed");
        }
      }
    }
  }
  throw new Error("sidecar_owner_acquire_failed");
}

export function acquireSynthesisSidecarServiceLifecycle(args: {
  config: SynthesisSidecarRuntimeConfig;
  configPath: string;
  serviceInstanceId: string;
  options?: LifecycleOptions;
}): SynthesisSidecarServiceLifecycle {
  const now = args.options?.now || Date.now;
  const isPidAlive = args.options?.isPidAlive || defaultPidAlive;
  const leaseCheckMs = args.options?.leaseCheckMs ?? DEFAULT_LEASE_CHECK_MS;
  const leaseTimeoutMs =
    args.options?.leaseTimeoutMs ?? DEFAULT_LEASE_TIMEOUT_MS;
  const resumeGraceMs = args.options?.resumeGraceMs ?? DEFAULT_RESUME_GRACE_MS;
  const acquired = acquireOwner({
    config: args.config,
    serviceInstanceId: args.serviceInstanceId,
    now,
    isPidAlive,
    leaseTimeoutMs,
  });
  try {
    fs.rmSync(args.configPath);
  } catch {
    removeOwnerIfMatching(
      acquired.paths.ownerPath,
      acquired.paths.ownerDir,
      acquired.owner,
    );
    throw new Error("sidecar_config_delete_failed");
  }

  let leaseTimer: NodeJS.Timeout | null = null;
  let released = false;
  let lastCheckAt = now();
  let resumeGraceUntil = 0;

  const release = () => {
    if (released) {
      return;
    }
    released = true;
    if (leaseTimer) {
      clearTimeout(leaseTimer);
      leaseTimer = null;
    }
    try {
      const discovery = readJson(acquired.paths.discoveryPath) as {
        supervisorInstanceId?: unknown;
        serviceInstanceId?: unknown;
      };
      if (
        discovery.supervisorInstanceId === args.config.supervisorInstanceId &&
        discovery.serviceInstanceId === args.serviceInstanceId
      ) {
        fs.rmSync(acquired.paths.discoveryPath, { force: true });
      }
    } catch {
      // Discovery may not have been published.
    }
    removeOwnerIfMatching(
      acquired.paths.ownerPath,
      acquired.paths.ownerDir,
      acquired.owner,
    );
  };

  return {
    publishDiscovery({ port }) {
      const discovery: SynthesisSidecarDiscovery = {
        schema: SYNTHESIS_SIDECAR_DISCOVERY_SCHEMA,
        profileId: args.config.profileId,
        supervisorInstanceId: args.config.supervisorInstanceId,
        serviceInstanceId: args.serviceInstanceId,
        bundleId: args.config.bundleId,
        nodeVersion: args.config.nodeVersion,
        serviceVersion: args.config.serviceVersion,
        protocolVersion: args.config.protocolVersion,
        schemaVersion: args.config.schemaVersion,
        runtimeRootId: args.config.runtimeRootId,
        dataRootId: args.config.dataRootId,
        host: "127.0.0.1",
        port,
        pid: process.pid,
        lifecycleState: "ready",
        tokenLocator: "supervisor-session",
        capabilities: [...SYNTHESIS_SIDECAR_CAPABILITIES],
      };
      writeJsonAtomically(acquired.paths.discoveryPath, discovery);
    },
    startLeaseMonitor(onExpired) {
      const schedule = () => {
        if (released) {
          return;
        }
        leaseTimer = setTimeout(check, leaseCheckMs);
        leaseTimer.unref();
      };
      const check = () => {
        leaseTimer = null;
        if (released) {
          return;
        }
        const checkedAt = now();
        if (checkedAt - lastCheckAt > leaseTimeoutMs) {
          resumeGraceUntil = checkedAt + resumeGraceMs;
        }
        lastCheckAt = checkedAt;
        let valid = false;
        try {
          const lease = rebuildSynthesisSidecarLease(
            readJson(acquired.paths.leasePath),
          );
          valid =
            lease.profileId === args.config.profileId &&
            lease.supervisorInstanceId === args.config.supervisorInstanceId &&
            lease.leaseNonce === args.config.leaseNonce &&
            checkedAt - lease.updatedAtMs <= leaseTimeoutMs;
        } catch {
          valid = false;
        }
        if (!valid && checkedAt >= resumeGraceUntil) {
          writeServiceLog("host_lease_expired", {
            serviceInstanceId: args.serviceInstanceId,
          });
          onExpired();
          return;
        }
        schedule();
      };
      schedule();
    },
    release,
  };
}

export const synthesisSidecarServiceLifecycleInternalsForTests = {
  lifecyclePaths,
  defaultPidAlive,
  leaseAllowsRecovery,
  DEFAULT_LEASE_CHECK_MS,
  DEFAULT_LEASE_TIMEOUT_MS,
  DEFAULT_RESUME_GRACE_MS,
};
