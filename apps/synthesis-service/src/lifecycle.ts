import fs from "node:fs";
import path from "node:path";
import {
  SYNTHESIS_SIDECAR_DISCOVERY_SCHEMA,
  type SynthesisSidecarDiscovery,
} from "../../../packages/synthesis-contracts/src/sidecarLifecycle.js";
import { SYNTHESIS_SIDECAR_CAPABILITIES } from "../../../packages/synthesis-contracts/src/sidecarSystem.js";
import type { SynthesisSidecarRuntimeConfig } from "./runtimeConfig.js";

export type SynthesisSidecarServiceLifecycle = {
  publishDiscovery(args: { port: number }): void;
  release(): void;
};

function lifecyclePaths(config: SynthesisSidecarRuntimeConfig) {
  const sessionRoot = path.join(
    config.profileRuntimeRoot,
    "sessions",
    config.supervisorInstanceId,
  );
  return {
    sessionRoot,
    configPath: path.join(sessionRoot, "config.json"),
    discoveryPath: path.join(sessionRoot, "discovery.json"),
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

export function acquireSynthesisSidecarServiceLifecycle(args: {
  config: SynthesisSidecarRuntimeConfig;
  configPath: string;
  serviceInstanceId: string;
}): SynthesisSidecarServiceLifecycle {
  const paths = lifecyclePaths(args.config);
  if (path.resolve(args.configPath) !== path.resolve(paths.configPath)) {
    throw new Error("sidecar_config_path_scope_mismatch");
  }
  try {
    fs.rmSync(args.configPath);
  } catch {
    throw new Error("sidecar_config_delete_failed");
  }

  let released = false;
  const release = () => {
    if (released) {
      return;
    }
    released = true;
    try {
      const discovery = readJson(paths.discoveryPath) as {
        supervisorInstanceId?: unknown;
        serviceInstanceId?: unknown;
      };
      if (
        discovery.supervisorInstanceId === args.config.supervisorInstanceId &&
        discovery.serviceInstanceId === args.serviceInstanceId
      ) {
        fs.rmSync(paths.discoveryPath, { force: true });
      }
    } catch {
      // Discovery may not have been published.
    }
  };

  return {
    publishDiscovery({ port }) {
      const discovery: SynthesisSidecarDiscovery = {
        schema: SYNTHESIS_SIDECAR_DISCOVERY_SCHEMA,
        profileId: args.config.profileId,
        supervisorInstanceId: args.config.supervisorInstanceId,
        serviceInstanceId: args.serviceInstanceId,
        bundleId: args.config.bundleId,
        implementation: args.config.implementation,
        target: args.config.target,
        targetTriple: args.config.targetTriple,
        buildFingerprint: args.config.buildFingerprint,
        platformSignature: args.config.platformSignature,
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
      writeJsonAtomically(paths.discoveryPath, discovery);
    },
    release,
  };
}

export const synthesisSidecarServiceLifecycleInternalsForTests = {
  lifecyclePaths,
};
