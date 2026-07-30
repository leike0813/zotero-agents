import { assert } from "chai";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { SYNTHESIS_PRODUCTION_DISCOVERY_SCHEMA } from "../../packages/synthesis-contracts/src/sidecarProduction";
import {
  SYNTHESIS_SIDECAR_CAPABILITIES,
  SYNTHESIS_SIDECAR_PROTOCOL,
} from "../../packages/synthesis-contracts/src/sidecarSystem";
import { createSynthesisProductionOwner } from "../../src/modules/synthesisProductionOwner";
import {
  createSynthesisProductionRuntimeSupervisor,
  type SynthesisSidecarSupervisorStatus,
} from "../../src/modules/synthesisSidecarRuntimeSupervisor";

const PROFILE_PATH = "/profile/test";
const BUNDLE_ID = "4".repeat(64);

function readyInstall() {
  return {
    state: "ready" as const,
    target: "linux-x64" as const,
    bundleId: BUNDLE_ID,
    implementation: "rust-native" as const,
    targetTriple: "x86_64-unknown-linux-gnu" as const,
    serviceVersion: "0.1.0",
    protocolVersion: SYNTHESIS_SIDECAR_PROTOCOL,
    buildFingerprint: "5".repeat(64),
    platformSignature: {
      scheme: "not-applicable" as const,
      status: "not-applicable" as const,
      signer: null,
    },
    installRoot: "/product/runtime/current",
    executablePath: "/product/runtime/current/synthesis-sidecar",
    diagnostics: [],
  };
}

type LaunchConfig = {
  schema: string;
  profileId: string;
  profileRuntimeRoot: string;
  supervisorInstanceId: string;
  bundleId: string;
  implementation: "rust-native";
  target: "linux-x64";
  targetTriple: string;
  buildFingerprint: string;
  platformSignature: unknown;
  serviceVersion: string;
  protocolVersion: typeof SYNTHESIS_SIDECAR_PROTOCOL;
  schemaVersion: string;
  runtimeRootId: string;
  dataRootId: string;
  repositoryDbPath: string;
  canonicalRoot: string;
  reverseHost: {
    host: "127.0.0.1";
    port: number;
    authorizationToken: string;
  };
};

function discovery(config: LaunchConfig, serviceInstanceId: string) {
  return {
    schema: SYNTHESIS_PRODUCTION_DISCOVERY_SCHEMA,
    profileId: config.profileId,
    supervisorInstanceId: config.supervisorInstanceId,
    serviceInstanceId,
    bundleId: config.bundleId,
    implementation: config.implementation,
    target: config.target,
    targetTriple: config.targetTriple,
    buildFingerprint: config.buildFingerprint,
    platformSignature: config.platformSignature,
    serviceVersion: config.serviceVersion,
    protocolVersion: config.protocolVersion,
    schemaVersion: config.schemaVersion,
    runtimeRootId: config.runtimeRootId,
    dataRootId: config.dataRootId,
    host: "127.0.0.1",
    port: 9135,
    pid: 42,
    lifecycleState: "ready",
    tokenLocator: "supervisor-session",
    capabilities: SYNTHESIS_SIDECAR_CAPABILITIES,
  };
}

async function waitForStatus(
  supervisor: ReturnType<typeof createSynthesisProductionRuntimeSupervisor>,
  status: SynthesisSidecarSupervisorStatus,
) {
  const deadline = Date.now() + 2_000;
  while (Date.now() < deadline) {
    if (supervisor.getSnapshot().status === status) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  assert.fail(
    `supervisor did not reach ${status}: ${JSON.stringify(supervisor.getSnapshot())}`,
  );
}

describe("Synthesis production runtime supervisor", function () {
  it("owns one direct startup and shutdown sequence without lifecycle state machines", async function () {
    const events: string[] = [];
    const connection = {
      discovery: {
        host: "127.0.0.1" as const,
        port: 9135,
        serviceInstanceId: "service-current",
      },
      clientToken: "7".repeat(64),
    };
    const owner = createSynthesisProductionOwner({
      createReverseHostEndpoint: () => ({
        start: () => {
          events.push("reverse-host:start");
          return {
            host: "127.0.0.1",
            port: 9134,
            authorizationToken: "8".repeat(64),
          };
        },
        bindServiceInstance: (serviceInstanceId) => {
          events.push(`reverse-host:bind:${serviceInstanceId}`);
        },
        stop: () => {
          events.push("reverse-host:stop");
        },
      }),
      startProductionSupervisor: () => {
        events.push("supervisor:start");
        return {
          subscribe: () => () => undefined,
          getSnapshot: () => ({
            status: "ready" as const,
            recoveryState: "none" as const,
            restartCount: 0,
          }),
          getDiagnosticEvidence: () => ({ stdoutTail: "", stderrTail: "" }),
          getReadyConnection: () => connection,
        };
      },
      stopProductionSupervisor: async () => {
        events.push("supervisor:stop");
      },
      afterReady: async () => {
        events.push("client:ready");
      },
      invalidateClient: () => {
        events.push("client:invalidate");
      },
    });

    assert.equal(await owner.start(), connection);
    await owner.shutdown();
    assert.deepEqual(events, [
      "reverse-host:start",
      "supervisor:start",
      "reverse-host:bind:service-current",
      "client:ready",
      "client:invalidate",
      "supervisor:stop",
      "reverse-host:stop",
    ]);
  });

  it("launches one serve command from a session config and leaves legacy state inert", async function () {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "zs-supervisor-"));
    const runtimeRoot = path.join(root, "runtime");
    const repositoryDbPath = path.join(root, "state", "synthesis.db");
    const canonicalRoot = path.join(root, "data", "synthesis");
    const legacyActivePath = path.join(
      runtimeRoot,
      "synthesis",
      "service-runtime",
      "active.json",
    );
    const legacyVersionPath = path.join(
      runtimeRoot,
      "synthesis",
      "service-runtime",
      "versions",
      "old",
      "manifest.json",
    );
    fs.mkdirSync(path.dirname(legacyActivePath), { recursive: true });
    fs.mkdirSync(path.dirname(legacyVersionPath), { recursive: true });
    fs.writeFileSync(legacyActivePath, "legacy-active\n");
    fs.writeFileSync(legacyVersionPath, "legacy-version\n");

    const invocations: Array<{ arguments?: string[] }> = [];
    const configs: LaunchConfig[] = [];
    let closeProcess = () => undefined;
    const closed = new Promise<void>((resolve) => {
      closeProcess = resolve;
    });
    const supervisor = createSynthesisProductionRuntimeSupervisor({
      runtimeRoot,
      profilePath: PROFILE_PATH,
      repositoryDbPath,
      canonicalRoot,
      reverseHost: {
        host: "127.0.0.1",
        port: 9134,
        authorizationToken: "8".repeat(64),
      },
      resolvedInstall: readyInstall(),
      subprocess: {
        call: async (invocation: { arguments?: string[] }) => {
          invocations.push(invocation);
          const configPath = invocation.arguments?.[2] || "";
          const config = JSON.parse(
            fs.readFileSync(configPath, "utf8"),
          ) as LaunchConfig;
          configs.push(config);
          fs.writeFileSync(
            path.join(config.profileRuntimeRoot, "discovery.json"),
            JSON.stringify(discovery(config, "service-1")),
          );
          return {
            stdout: { readString: async () => "" },
            stderr: { readString: async () => "" },
            stdin: { close: async () => closeProcess() },
            wait: () => closed,
            kill: () => closeProcess(),
          };
        },
      } as never,
      controlClient: {
        health: async () => ({}),
        handshake: async () => ({}),
        shutdown: async () => undefined,
      } as never,
      discoveryTimeoutMs: 500,
      healthIntervalMs: 0,
    });

    supervisor.start();
    await waitForStatus(supervisor, "ready");

    assert.deepEqual(invocations[0]?.arguments?.slice(0, 2), [
      "serve",
      "--config",
    ]);
    assert.equal(configs[0]?.schema, "synthesis-sidecar-launch-config.v3");
    assert.equal(configs[0]?.repositoryDbPath, repositoryDbPath);
    assert.equal(configs[0]?.canonicalRoot, canonicalRoot);
    assert.deepEqual(configs[0]?.reverseHost, {
      host: "127.0.0.1",
      port: 9134,
      authorizationToken: "8".repeat(64),
    });
    assert.notProperty(configs[0], "leaseNonce");
    assert.equal(fs.readFileSync(legacyActivePath, "utf8"), "legacy-active\n");
    assert.equal(
      fs.readFileSync(legacyVersionPath, "utf8"),
      "legacy-version\n",
    );

    await supervisor.stop();
    assert.equal(supervisor.getSnapshot().status, "stopped");
    assert.equal(fs.readFileSync(legacyActivePath, "utf8"), "legacy-active\n");
    assert.equal(
      fs.readFileSync(legacyVersionPath, "utf8"),
      "legacy-version\n",
    );
  });
});
