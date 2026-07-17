import { assert } from "chai";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  SYNTHESIS_SIDECAR_DISCOVERY_SCHEMA,
  type SynthesisSidecarLaunchConfig,
} from "../../packages/synthesis-contracts/src/sidecarLifecycle";
import {
  SYNTHESIS_SIDECAR_CAPABILITIES,
  SYNTHESIS_SIDECAR_PROTOCOL,
} from "../../packages/synthesis-contracts/src/sidecarSystem";
import {
  createSynthesisSidecarRuntimeSupervisor,
  synthesisSidecarRuntimeSupervisorInternalsForTests,
  type SynthesisSidecarSupervisorStatus,
} from "../../src/modules/synthesisSidecarRuntimeSupervisor";

const BUNDLE_ID = "a".repeat(64);

function readyInstall() {
  return {
    state: "ready" as const,
    target: "linux-x64" as const,
    bundleId: BUNDLE_ID,
    nodeVersion: "24.18.0",
    serviceVersion: "0.1.0",
    protocolVersion: SYNTHESIS_SIDECAR_PROTOCOL,
    installRoot: "/product/runtime",
    nodePath: "/product/runtime/node",
    entrypointPath: "/product/runtime/service/entrypoint.js",
    diagnostics: [],
  };
}

function waitForStatus(
  supervisor: ReturnType<typeof createSynthesisSidecarRuntimeSupervisor>,
  status: SynthesisSidecarSupervisorStatus,
  timeoutMs = 2_000,
) {
  const deadline = Date.now() + timeoutMs;
  return new Promise<void>((resolve, reject) => {
    const inspect = () => {
      if (supervisor.getSnapshot().status === status) {
        resolve();
        return;
      }
      if (Date.now() >= deadline) {
        reject(
          new Error(
            `supervisor did not reach ${status}: ${JSON.stringify(
              supervisor.getSnapshot(),
            )}`,
          ),
        );
        return;
      }
      setTimeout(inspect, 5);
    };
    inspect();
  });
}

function createHarness(options?: {
  handshakeError?: string;
  gracefulClose?: boolean;
  leaseIntervalMs?: number;
  healthIntervalMs?: number;
  stableResetMs?: number;
  restartDelaysMs?: readonly number[];
}) {
  const runtimeRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), "zs-sidecar-supervisor-"),
  );
  const invocations: Array<Record<string, unknown>> = [];
  const launchConfigs: SynthesisSidecarLaunchConfig[] = [];
  const processes: Array<{
    exit: () => void;
    killed: () => boolean;
    stdinClosed: () => boolean;
  }> = [];
  let healthCalls = 0;
  let handshakeCalls = 0;
  let shutdownCalls = 0;
  let randomCall = 0;
  const subprocess = {
    call: async (invocation: {
      command: string;
      arguments?: string[];
      environment?: Record<string, string>;
      environmentAppend?: boolean;
      workdir?: string;
    }) => {
      invocations.push(invocation);
      const configPath = invocation.arguments?.[2] || "";
      const config = JSON.parse(
        fs.readFileSync(configPath, "utf8"),
      ) as SynthesisSidecarLaunchConfig;
      launchConfigs.push(config);
      fs.rmSync(configPath);
      let resolveExit: () => void = () => undefined;
      const closed = new Promise<void>((resolve) => {
        resolveExit = resolve;
      });
      let killed = false;
      let stdinClosed = false;
      const serviceInstanceId = `service-${processes.length + 1}`;
      fs.writeFileSync(
        path.join(config.profileRuntimeRoot, "discovery.json"),
        `${JSON.stringify({
          schema: SYNTHESIS_SIDECAR_DISCOVERY_SCHEMA,
          profileId: config.profileId,
          supervisorInstanceId: config.supervisorInstanceId,
          serviceInstanceId,
          bundleId: config.bundleId,
          nodeVersion: config.nodeVersion,
          serviceVersion: config.serviceVersion,
          protocolVersion: config.protocolVersion,
          schemaVersion: config.schemaVersion,
          runtimeRootId: config.runtimeRootId,
          dataRootId: config.dataRootId,
          host: "127.0.0.1",
          port: 43123,
          pid: 12345 + processes.length,
          lifecycleState: "ready",
          tokenLocator: "supervisor-session",
          capabilities: [...SYNTHESIS_SIDECAR_CAPABILITIES],
        })}\n`,
        "utf8",
      );
      processes.push({
        exit: resolveExit,
        killed: () => killed,
        stdinClosed: () => stdinClosed,
      });
      return {
        stdin: {
          close: async () => {
            stdinClosed = true;
            if (options?.gracefulClose) {
              resolveExit();
            }
          },
        },
        stdout: { readString: async () => "" },
        stderr: { readString: async () => "" },
        wait: async () => closed,
        kill: () => {
          killed = true;
          resolveExit();
        },
      };
    },
  };
  const controlClient = {
    health: async () => {
      healthCalls += 1;
      return {} as never;
    },
    handshake: async () => {
      handshakeCalls += 1;
      if (options?.handshakeError) {
        throw new Error(options.handshakeError);
      }
      return {} as never;
    },
    shutdown: async () => {
      shutdownCalls += 1;
    },
  };
  const supervisor = createSynthesisSidecarRuntimeSupervisor({
    runtimeRoot,
    profilePath: "/profiles/test",
    installer: {
      inspect: async () => readyInstall(),
      ensureInstalled: async () => readyInstall(),
      rollback: async () => readyInstall(),
    },
    subprocess,
    controlClient,
    randomHex: (bytes) => {
      randomCall += 1;
      return (randomCall % 16).toString(16).repeat(bytes * 2);
    },
    discoveryTimeoutMs: 500,
    leaseIntervalMs: options?.leaseIntervalMs ?? 20,
    healthIntervalMs: options?.healthIntervalMs ?? 40,
    stableResetMs: options?.stableResetMs ?? 100,
    restartDelaysMs: options?.restartDelaysMs ?? [5, 5, 5],
  });
  return {
    supervisor,
    invocations,
    launchConfigs,
    processes,
    healthCalls: () => healthCalls,
    handshakeCalls: () => handshakeCalls,
    shutdownCalls: () => shutdownCalls,
  };
}

describe("Synthesis sidecar runtime supervisor", function () {
  this.timeout(10_000);

  it("launches the verified absolute runtime with a sealed environment", async function () {
    const harness = createHarness({ gracefulClose: true });
    harness.supervisor.start();
    await waitForStatus(harness.supervisor, "ready");

    assert.lengthOf(harness.invocations, 1);
    const launch = harness.invocations[0] as {
      command: string;
      arguments: string[];
      environment: Record<string, string>;
      environmentAppend: boolean;
    };
    assert.equal(launch.command, "/product/runtime/node");
    assert.deepEqual(launch.arguments.slice(0, 2), [
      "/product/runtime/service/entrypoint.js",
      "--config",
    ]);
    assert.equal(launch.environmentAppend, false);
    assert.notProperty(launch.environment, "PATH");
    assert.notProperty(launch.environment, "NODE_OPTIONS");
    assert.notProperty(launch.environment, "NODE_PATH");
    assert.equal(harness.handshakeCalls(), 1);

    await harness.supervisor.stop();
  });

  it("keeps ready supervision low-frequency and state-change-only", async function () {
    const harness = createHarness({
      gracefulClose: true,
      leaseIntervalMs: 20,
      healthIntervalMs: 40,
      stableResetMs: 100,
    });
    const snapshots: string[] = [];
    harness.supervisor.subscribe((snapshot) => {
      snapshots.push(JSON.stringify(snapshot));
    });
    harness.supervisor.start();
    await waitForStatus(harness.supervisor, "ready");
    const publishedAtReady = snapshots.length;
    await new Promise((resolve) => setTimeout(resolve, 125));

    assert.isAtLeast(harness.healthCalls(), 2);
    assert.equal(snapshots.length, publishedAtReady);
    assert.equal(
      synthesisSidecarRuntimeSupervisorInternalsForTests.DEFAULT_LEASE_INTERVAL_MS,
      30_000,
    );
    assert.equal(
      synthesisSidecarRuntimeSupervisorInternalsForTests.DEFAULT_HEALTH_INTERVAL_MS,
      60_000,
    );
    await harness.supervisor.stop();
  });

  it("fails closed on handshake identity mismatch", async function () {
    const harness = createHarness({
      handshakeError: "sidecar_handshake_identity_mismatch",
    });
    harness.supervisor.start();
    await waitForStatus(harness.supervisor, "incompatible");
    assert.equal(
      harness.supervisor.getSnapshot().recoveryState,
      "manual-recovery-required",
    );
    assert.lengthOf(harness.invocations, 1);
    await harness.supervisor.stop();
  });

  it("uses bounded restart and fuses after the fourth failure", async function () {
    const harness = createHarness({ restartDelaysMs: [5, 5, 5] });
    harness.supervisor.start();
    for (let attempt = 0; attempt < 4; attempt += 1) {
      await waitForStatus(harness.supervisor, "ready");
      harness.processes.at(-1)!.exit();
      if (attempt < 3) {
        await waitForStatus(harness.supervisor, "unavailable");
      }
    }
    const deadline = Date.now() + 2_000;
    while (
      harness.supervisor.getSnapshot().recoveryState !==
        "manual-recovery-required" &&
      Date.now() < deadline
    ) {
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
    assert.equal(
      harness.supervisor.getSnapshot().reasonCode,
      "sidecar_crash_loop_fused",
    );
    assert.lengthOf(harness.invocations, 4);
    assert.deepEqual(
      harness.launchConfigs.map((config) => [
        config.supervisorInstanceId,
        config.leaseNonce,
      ]),
      Array.from({ length: 4 }, () => [
        harness.launchConfigs[0]!.supervisorInstanceId,
        harness.launchConfigs[0]!.leaseNonce,
      ]),
    );

    await harness.supervisor.recover();
    await waitForStatus(harness.supervisor, "ready");
    assert.lengthOf(harness.invocations, 5);
    assert.notEqual(
      harness.launchConfigs[4]!.supervisorInstanceId,
      harness.launchConfigs[0]!.supervisorInstanceId,
    );
    assert.notEqual(
      harness.launchConfigs[4]!.leaseNonce,
      harness.launchConfigs[0]!.leaseNonce,
    );
    await harness.supervisor.stop();
  });

  it("closes stdin and directly kills a service that ignores shutdown", async function () {
    const harness = createHarness();
    harness.supervisor.start();
    await waitForStatus(harness.supervisor, "ready");
    await harness.supervisor.stop();

    assert.equal(harness.shutdownCalls(), 1);
    assert.isTrue(harness.processes[0]!.stdinClosed());
    assert.isTrue(harness.processes[0]!.killed());
    assert.equal(harness.supervisor.getSnapshot().status, "stopped");
  });

  it("routes every service stop signal through bounded compute-pool termination", function () {
    const entrypoint = fs.readFileSync(
      path.join(process.cwd(), "apps/synthesis-service/src/entrypoint.ts"),
      "utf8",
    );
    const server = fs.readFileSync(
      path.join(process.cwd(), "apps/synthesis-service/src/server.ts"),
      "utf8",
    );
    const pool = fs.readFileSync(
      path.join(
        process.cwd(),
        "apps/synthesis-service/src/computeWorkerPool.ts",
      ),
      "utf8",
    );
    assert.include(entrypoint, 'runtime.beginShutdown("host_lease")');
    assert.include(entrypoint, 'runtime.beginShutdown("host_pipe_eof")');
    assert.include(server, "computePool.shutdown()");
    assert.include(server, "transferOwner.shutdown()");
    assert.include(pool, "shutdownTimeoutMs: 500");
    assert.include(pool, "target.terminate()");
    assert.notInclude(pool, "node:child_process");
    const transferOwner = fs.readFileSync(
      path.join(
        process.cwd(),
        "apps/synthesis-service/src/citationGraphTransferOwner.ts",
      ),
      "utf8",
    );
    assert.notInclude(transferOwner, "node:child_process");
    assert.notInclude(transferOwner, "node:worker_threads");
  });

  it("bounds retained diagnostic tails", function () {
    const { appendTail, DIAGNOSTIC_TAIL_LIMIT } =
      synthesisSidecarRuntimeSupervisorInternalsForTests;
    const tail = appendTail("", "x".repeat(DIAGNOSTIC_TAIL_LIMIT + 50));
    assert.lengthOf(tail, DIAGNOSTIC_TAIL_LIMIT);
  });
});
