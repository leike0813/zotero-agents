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
  narrowSynthesisSidecarHealth,
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
  libraryId: number;
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
  startupTrace?: {
    schema: "synthesis-sidecar-observation.v2";
    traceId: string;
    spanId: string;
    attempt: number;
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

async function waitForSnapshot(
  supervisor: ReturnType<typeof createSynthesisProductionRuntimeSupervisor>,
  predicate: (
    snapshot: ReturnType<(typeof supervisor)["getSnapshot"]>,
  ) => boolean,
) {
  const deadline = Date.now() + 2_000;
  while (Date.now() < deadline) {
    if (predicate(supervisor.getSnapshot())) return;
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  assert.fail(
    "supervisor snapshot did not match: " +
      JSON.stringify(supervisor.getSnapshot()),
  );
}

describe("Synthesis production runtime supervisor", function () {
  it("narrows health to the Workbench runtime status contract", function () {
    const status = narrowSynthesisSidecarHealth({
      serviceVersion: "0.1.0",
      serviceInstanceId: "service-current",
      bundleId: BUNDLE_ID,
      computePool: {
        state: "busy",
        active: 1,
        queued: 2,
        restartCount: 3,
        failureCount: 1,
      },
      repository: { secretPath: "/must/not/escape" },
    } as never);

    assert.deepEqual(status, {
      serviceVersion: "0.1.0",
      serviceInstanceId: "service-current",
      bundleId: BUNDLE_ID,
      computePool: { state: "busy", active: 1, queued: 2 },
    });
    assert.notProperty(status, "repository");
  });

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
          recover: () => undefined,
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

  it("retries a failed production owner through the existing supervisor generation", async function () {
    const connection = {
      discovery: {
        host: "127.0.0.1" as const,
        port: 9135,
        serviceInstanceId: "service-recovered",
      },
      clientToken: "7".repeat(64),
    };
    let ready = false;
    let supervisorStarts = 0;
    let recoveries = 0;
    const owner = createSynthesisProductionOwner({
      createReverseHostEndpoint: () => ({
        start: () => ({
          host: "127.0.0.1",
          port: 9134,
          authorizationToken: "8".repeat(64),
        }),
        bindServiceInstance: () => undefined,
        stop: () => undefined,
      }),
      startProductionSupervisor: () => {
        supervisorStarts += 1;
        return {
          subscribe: () => () => undefined,
          getSnapshot: () =>
            ready
              ? ({
                  status: "ready" as const,
                  recoveryState: "none" as const,
                  restartCount: 0,
                } as const)
              : ({
                  status: "unavailable" as const,
                  recoveryState: "manual-recovery-required" as const,
                  reasonCode: "legacy_schema_variant_unsupported",
                  restartCount: 0,
                } as const),
          getDiagnosticEvidence: () => ({ stdoutTail: "", stderrTail: "" }),
          getReadyConnection: () => (ready ? connection : null),
          recover: () => {
            recoveries += 1;
            ready = true;
          },
        };
      },
      stopProductionSupervisor: async () => undefined,
    });

    let startupCode = "";
    try {
      await owner.start();
    } catch (error) {
      startupCode = error instanceof Error ? error.message : String(error);
    }
    assert.equal(startupCode, "legacy_schema_variant_unsupported");
    assert.equal(await owner.recover(), connection);
    assert.equal(supervisorStarts, 1);
    assert.equal(recoveries, 1);
    await owner.shutdown();
  });

  it("shares one automatic recovery after a ready runtime and latches failure until ready again", async function () {
    const connection = {
      discovery: {
        host: "127.0.0.1" as const,
        port: 9135,
        serviceInstanceId: "service-current",
      },
      clientToken: "7".repeat(64),
    };
    let ready = true;
    let recoveries = 0;
    let failRecovery = false;
    let snapshot = {
      status: "ready" as SynthesisSidecarSupervisorStatus,
      recoveryState: "none" as const,
      restartCount: 0,
      supervisorInstanceId: "supervisor-ready",
      readyAt: "2026-09-04T00:00:00.000Z",
      reasonCode: undefined as string | undefined,
    };
    const subscribers = new Set<(value: typeof snapshot) => void>();
    const publish = (next: typeof snapshot) => {
      snapshot = next;
      for (const subscriber of subscribers) subscriber(snapshot);
    };
    const owner = createSynthesisProductionOwner({
      createReverseHostEndpoint: () => ({
        start: () => ({
          host: "127.0.0.1",
          port: 9134,
          authorizationToken: "8".repeat(64),
        }),
        bindServiceInstance: () => undefined,
        stop: () => undefined,
      }),
      startProductionSupervisor: () => ({
        subscribe: (subscriber) => {
          subscribers.add(subscriber);
          return () => subscribers.delete(subscriber);
        },
        getSnapshot: () => snapshot,
        getDiagnosticEvidence: () => ({ stdoutTail: "", stderrTail: "" }),
        getReadyConnection: () => (ready ? connection : null),
        recover: () => {
          recoveries += 1;
          if (failRecovery) {
            publish({
              ...snapshot,
              status: "unavailable",
              recoveryState: "manual-recovery-required",
              supervisorInstanceId: "supervisor-recovery-failed",
              reasonCode: "sidecar_crash_loop_fused",
            });
          }
        },
      }),
      stopProductionSupervisor: async () => undefined,
    });

    await owner.start();
    ready = false;
    publish({
      ...snapshot,
      status: "unavailable",
      recoveryState: "scheduled",
      reasonCode: "sidecar_process_exited",
    });
    const first = owner.recoverIfEligible();
    const second = owner.recoverIfEligible();
    assert.equal(recoveries, 0);
    ready = true;
    publish({
      ...snapshot,
      status: "ready",
      recoveryState: "none",
      supervisorInstanceId: "supervisor-recovered",
      readyAt: "2026-09-04T00:01:00.000Z",
      reasonCode: undefined,
    });
    assert.equal(await first, connection);
    assert.equal(await second, connection);

    ready = false;
    failRecovery = true;
    publish({
      ...snapshot,
      status: "unavailable",
      recoveryState: "manual-recovery-required",
      reasonCode: "sidecar_crash_loop_fused",
    });
    const failure = await Promise.allSettled([owner.recoverIfEligible()]);
    assert.equal(failure[0]?.status, "rejected");
    assert.isNull(await owner.recoverIfEligible());
    assert.equal(recoveries, 1);
    await owner.shutdown();
  });

  it("does not automatically recover a runtime that has never been ready", async function () {
    let recoveries = 0;
    const owner = createSynthesisProductionOwner({
      createReverseHostEndpoint: () => ({
        start: () => ({
          host: "127.0.0.1",
          port: 9134,
          authorizationToken: "8".repeat(64),
        }),
        bindServiceInstance: () => undefined,
        stop: () => undefined,
      }),
      startProductionSupervisor: () => ({
        subscribe: () => () => undefined,
        getSnapshot: () => ({
          status: "unavailable" as const,
          recoveryState: "manual-recovery-required" as const,
          reasonCode: "sidecar_crash_loop_fused",
          supervisorInstanceId: "supervisor-startup-failed",
          restartCount: 4,
        }),
        getDiagnosticEvidence: () => ({ stdoutTail: "", stderrTail: "" }),
        getReadyConnection: () => null,
        recover: () => {
          recoveries += 1;
        },
      }),
      stopProductionSupervisor: async () => undefined,
    });

    assert.isNull(await owner.recoverIfEligible());
    assert.equal(recoveries, 0);
    await owner.shutdown();
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

    type Invocation = {
      arguments?: string[];
      environment?: Record<string, string>;
      environmentAppend?: boolean;
      stderr?: "ignore" | "stdout" | "pipe";
    };
    const invocations: Invocation[] = [];
    const configs: LaunchConfig[] = [];
    const diagnosticEvents: Record<string, unknown>[] = [];
    let closeProcess = () => undefined;
    const closed = new Promise<void>((resolve) => {
      closeProcess = resolve;
    });
    const startupTrace = {
      schema: "synthesis-sidecar-observation.v2" as const,
      traceId: "a".repeat(32),
      spanId: "b".repeat(16),
      attempt: 0,
    };
    const supervisor = createSynthesisProductionRuntimeSupervisor({
      runtimeRoot,
      profilePath: PROFILE_PATH,
      libraryId: 7,
      repositoryDbPath,
      canonicalRoot,
      reverseHost: {
        host: "127.0.0.1",
        port: 9134,
        authorizationToken: "8".repeat(64),
      },
      resolvedInstall: readyInstall(),
      subprocess: {
        call: async (invocation: Invocation) => {
          invocations.push(invocation);
          const configPath = invocation.arguments?.[2] || "";
          const config = JSON.parse(
            fs.readFileSync(configPath, "utf8"),
          ) as LaunchConfig;
          assert.equal(config.libraryId, 7);
          configs.push(config);
          fs.writeFileSync(
            path.join(config.profileRuntimeRoot, "discovery.json"),
            JSON.stringify(discovery(config, "service-1")),
          );
          const stderrChunks = [
            '{"schema":"synthesis-sidecar-observation.v2","traceId":"11111111111111111111111111111111","spanId":"22222222',
            '22222222","attempt":0,"source":"rust-sidecar","boundary":"reverse-host","phase":"call-failed","outcome":"failed","code":"reverse_host_response_body_truncated","occurredAtMs":1,"identities":{"capability":"library.artifacts.read"}}\n',
          ];
          return {
            stdout: { readString: async () => "" },
            stderr: {
              readString: async () => stderrChunks.shift() || "",
            },
            stdin: { close: async () => closeProcess() },
            wait: () => closed,
            kill: () => closeProcess(),
          };
        },
      } as never,
      controlClient: {
        health: async () => ({
          serviceVersion: "0.1.0",
          serviceInstanceId: "service-1",
          bundleId: BUNDLE_ID,
          computePool: {
            state: "idle",
            active: 0,
            queued: 0,
            restartCount: 0,
            failureCount: 0,
          },
        }),
        handshake: async () => ({}),
        shutdown: async () => undefined,
      } as never,
      discoveryTimeoutMs: 500,
      healthIntervalMs: 0,
      diagnosticsEnabled: true,
      startupTrace,
      recordTraceEvent: (event) => diagnosticEvents.push(event),
    });

    supervisor.start();
    await waitForStatus(supervisor, "ready");

    assert.deepEqual(invocations[0]?.arguments?.slice(0, 2), [
      "serve",
      "--config",
    ]);
    assert.equal(invocations[0]?.environmentAppend, false);
    assert.equal(invocations[0]?.stderr, "pipe");
    assert.notProperty(invocations[0]?.environment || {}, "PATH");
    assert.notProperty(invocations[0]?.environment || {}, "NODE_OPTIONS");
    assert.equal(configs[0]?.schema, "synthesis-sidecar-launch-config.v4");
    assert.deepEqual(configs[0]?.startupTrace, startupTrace);
    assert.equal(configs[0]?.repositoryDbPath, repositoryDbPath);
    assert.equal(configs[0]?.canonicalRoot, canonicalRoot);
    assert.deepEqual(configs[0]?.reverseHost, {
      host: "127.0.0.1",
      port: 9134,
      authorizationToken: "8".repeat(64),
    });
    assert.notProperty(configs[0], "leaseNonce");
    await new Promise((resolve) => setTimeout(resolve, 0));
    const nativeEvent = diagnosticEvents[0];
    assert.equal(nativeEvent?.boundary, "reverse-host");
    assert.equal(nativeEvent?.phase, "call-failed");
    assert.equal(nativeEvent?.outcome, "failed");
    assert.equal(nativeEvent?.code, "reverse_host_response_body_truncated");
    assert.equal(nativeEvent?.identities?.capability, "library.artifacts.read");
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

  it("surfaces a deterministic child startup code before discovery without retaining raw stderr", async function () {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "zs-supervisor-exit-"));
    const chunks = ["legacy_schema_variant_unsupported\n"];
    const supervisor = createSynthesisProductionRuntimeSupervisor({
      runtimeRoot: path.join(root, "runtime"),
      profilePath: PROFILE_PATH,
      libraryId: 7,
      repositoryDbPath: path.join(root, "state", "synthesis.db"),
      canonicalRoot: path.join(root, "data", "synthesis"),
      reverseHost: {
        host: "127.0.0.1",
        port: 9134,
        authorizationToken: "8".repeat(64),
      },
      resolvedInstall: readyInstall(),
      subprocess: {
        call: async () => ({
          stdout: { readString: async () => "" },
          stderr: { readString: async () => chunks.shift() || "" },
          stdin: { close: async () => undefined },
          wait: async () => undefined,
          kill: () => undefined,
        }),
      } as never,
      controlClient: {} as never,
      discoveryTimeoutMs: 100,
      healthIntervalMs: 0,
      diagnosticsEnabled: false,
      restartDelaysMs: [1],
    });

    supervisor.start();
    await waitForStatus(supervisor, "unavailable");
    assert.equal(
      supervisor.getSnapshot().reasonCode,
      "legacy_schema_variant_unsupported",
    );
    assert.equal(
      supervisor.getSnapshot().recoveryState,
      "manual-recovery-required",
    );
    assert.equal(supervisor.getSnapshot().restartCount, 0);
    assert.equal(supervisor.getDiagnosticEvidence().stderrTail, "");
    await supervisor.stop();
  });

  it("fuses unknown startup crashes and ignores a delayed retry from an older generation", async function () {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "zs-supervisor-fuse-"));
    let attempts = 0;
    const crashSupervisor = createSynthesisProductionRuntimeSupervisor({
      runtimeRoot: path.join(root, "crash-runtime"),
      profilePath: PROFILE_PATH,
      libraryId: 7,
      repositoryDbPath: path.join(root, "crash-state", "synthesis.db"),
      canonicalRoot: path.join(root, "crash-data", "synthesis"),
      reverseHost: {
        host: "127.0.0.1",
        port: 9134,
        authorizationToken: "8".repeat(64),
      },
      resolvedInstall: readyInstall(),
      subprocess: {
        call: async () => {
          attempts += 1;
          return {
            stdout: { readString: async () => "" },
            stderr: { readString: async () => "" },
            stdin: { close: async () => undefined },
            wait: async () => undefined,
            kill: () => undefined,
          };
        },
      } as never,
      controlClient: {} as never,
      discoveryTimeoutMs: 100,
      healthIntervalMs: 0,
      restartDelaysMs: [1, 1],
    });
    crashSupervisor.start();
    await waitForSnapshot(
      crashSupervisor,
      (snapshot) => snapshot.recoveryState === "manual-recovery-required",
    );
    assert.equal(attempts, 3);
    assert.equal(
      crashSupervisor.getSnapshot().reasonCode,
      "sidecar_crash_loop_fused",
    );
    assert.equal(crashSupervisor.getSnapshot().restartCount, 3);
    await crashSupervisor.stop();

    let generationAttempts = 0;
    let closeCurrent = () => undefined;
    const delayedSupervisor = createSynthesisProductionRuntimeSupervisor({
      runtimeRoot: path.join(root, "generation-runtime"),
      profilePath: PROFILE_PATH,
      libraryId: 7,
      repositoryDbPath: path.join(root, "generation-state", "synthesis.db"),
      canonicalRoot: path.join(root, "generation-data", "synthesis"),
      reverseHost: {
        host: "127.0.0.1",
        port: 9134,
        authorizationToken: "8".repeat(64),
      },
      resolvedInstall: readyInstall(),
      subprocess: {
        call: async (invocation: { arguments?: string[] }) => {
          generationAttempts += 1;
          if (generationAttempts === 1) {
            return {
              stdout: { readString: async () => "" },
              stderr: { readString: async () => "" },
              stdin: { close: async () => undefined },
              wait: async () => undefined,
              kill: () => undefined,
            };
          }
          const config = JSON.parse(
            fs.readFileSync(invocation.arguments?.[2] || "", "utf8"),
          ) as LaunchConfig;
          fs.writeFileSync(
            path.join(config.profileRuntimeRoot, "discovery.json"),
            JSON.stringify(discovery(config, "service-current")),
          );
          const closed = new Promise<void>((resolve) => {
            closeCurrent = resolve;
          });
          return {
            stdout: { readString: async () => "" },
            stderr: { readString: async () => "" },
            stdin: { close: async () => closeCurrent() },
            wait: () => closed,
            kill: () => closeCurrent(),
          };
        },
      } as never,
      controlClient: {
        health: async () => ({
          serviceVersion: "0.1.0",
          serviceInstanceId: "service-current",
          bundleId: BUNDLE_ID,
          computePool: {
            state: "idle",
            active: 0,
            queued: 0,
            restartCount: 0,
            failureCount: 0,
          },
        }),
        handshake: async () => ({}),
        shutdown: async () => undefined,
      } as never,
      discoveryTimeoutMs: 500,
      healthIntervalMs: 0,
      restartDelaysMs: [50],
    });
    delayedSupervisor.start();
    await waitForSnapshot(
      delayedSupervisor,
      (snapshot) => snapshot.recoveryState === "scheduled",
    );
    await delayedSupervisor.stop();
    delayedSupervisor.start();
    await waitForStatus(delayedSupervisor, "ready");
    await new Promise((resolve) => setTimeout(resolve, 80));
    assert.equal(generationAttempts, 2);
    await delayedSupervisor.stop();
  });
});
