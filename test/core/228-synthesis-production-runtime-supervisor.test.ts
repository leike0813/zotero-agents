import { assert } from "chai";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  SYNTHESIS_PRODUCTION_ADMISSION_SCHEMA,
  SYNTHESIS_PRODUCTION_DISCOVERY_SCHEMA,
  type SynthesisProductionAdmission,
} from "../../packages/synthesis-contracts/src/sidecarProduction";
import {
  SYNTHESIS_SIDECAR_CAPABILITIES,
  SYNTHESIS_SIDECAR_PRODUCTION_CLIENT_CAPABILITY_FINGERPRINT,
  SYNTHESIS_SIDECAR_PROTOCOL,
  SYNTHESIS_SIDECAR_READY_PRODUCTION_CLIENT_CAPABILITIES,
} from "../../packages/synthesis-contracts/src/sidecarSystem";
import {
  createSynthesisProductionRuntimeSupervisor,
  type SynthesisSidecarSupervisorStatus,
} from "../../src/modules/synthesisSidecarRuntimeSupervisor";

const PROFILE_PATH = "/profile/test";
const PROFILE_ID = createHash("sha256").update(PROFILE_PATH).digest("hex");
const BUNDLE_ID = "4".repeat(64);

function admission(root: string): SynthesisProductionAdmission {
  return {
    schema: SYNTHESIS_PRODUCTION_ADMISSION_SCHEMA,
    purpose: "live_owner",
    profileId: PROFILE_ID,
    supervisorInstanceId: "production-supervisor-1",
    cutoverReceiptId: "receipt-1",
    cutoverReceiptPath: path.join(
      root,
      "state/synthesis-cutover/receipt.json",
    ),
    capabilityFingerprint:
      SYNTHESIS_SIDECAR_PRODUCTION_CLIENT_CAPABILITY_FINGERPRINT,
    repositoryDbPath: path.join(root, "state/synthesis.db"),
    canonicalRoot: path.join(root, "data/synthesis"),
    reverseHost: {
      host: "127.0.0.1",
      port: 9134,
      authorizationToken: "8".repeat(64),
    },
    mutationEnabled: false,
  };
}

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
    installRoot: "/product/runtime",
    executablePath: "/product/runtime/synthesis-sidecar",
    diagnostics: [],
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
  it("launches only the production command with a private validated admission and v3 readiness", async function () {
    const root = fs.mkdtempSync(
      path.join(os.tmpdir(), "zs-production-supervisor-"),
    );
    const productionAdmission = admission(root);
    fs.mkdirSync(path.dirname(productionAdmission.cutoverReceiptPath), {
      recursive: true,
    });
    fs.mkdirSync(path.dirname(productionAdmission.repositoryDbPath), {
      recursive: true,
    });
    fs.mkdirSync(productionAdmission.canonicalRoot, { recursive: true });
    fs.writeFileSync(productionAdmission.cutoverReceiptPath, "{}");
    fs.writeFileSync(productionAdmission.repositoryDbPath, "");

    const invocations: Array<{
      command: string;
      arguments?: string[];
    }> = [];
    let writtenAdmission: unknown;
    let resolveExit: () => void = () => undefined;
    const closed = new Promise<void>((resolve) => {
      resolveExit = resolve;
    });
    const subprocess = {
      call: async (invocation: {
        command: string;
        arguments?: string[];
      }) => {
        invocations.push(invocation);
        const configPath = invocation.arguments?.[2] || "";
        const admissionPath = invocation.arguments?.[4] || "";
        const config = JSON.parse(fs.readFileSync(configPath, "utf8")) as {
          profileId: string;
          profileRuntimeRoot: string;
          supervisorInstanceId: string;
          bundleId: string;
          implementation: string;
          target: string;
          targetTriple: string;
          buildFingerprint: string;
          platformSignature: unknown;
          serviceVersion: string;
          protocolVersion: string;
          schemaVersion: string;
          runtimeRootId: string;
          dataRootId: string;
        };
        writtenAdmission = JSON.parse(
          fs.readFileSync(admissionPath, "utf8"),
        );
        fs.writeFileSync(
          path.join(config.profileRuntimeRoot, "discovery.json"),
          JSON.stringify({
            schema: SYNTHESIS_PRODUCTION_DISCOVERY_SCHEMA,
            profileId: config.profileId,
            supervisorInstanceId: config.supervisorInstanceId,
            serviceInstanceId: "service-1",
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
            ownerMode: "production",
            mutationEnabled: false,
            capabilityFingerprint:
              productionAdmission.capabilityFingerprint,
            cutoverReceiptId: productionAdmission.cutoverReceiptId,
            readyClientCapabilities:
              SYNTHESIS_SIDECAR_READY_PRODUCTION_CLIENT_CAPABILITIES,
          }),
        );
        return {
          stdout: { readString: async () => "" },
          stderr: { readString: async () => "" },
          stdin: {
            close: async () => {
              resolveExit();
            },
          },
          wait: () => closed,
          kill: () => resolveExit(),
        };
      },
    };
    const controlClient = {
      health: async () => ({ ownerMode: "production" as const }),
      handshake: async () => ({ ownerMode: "production" as const }),
      shutdown: async () => undefined,
    };
    const supervisor = createSynthesisProductionRuntimeSupervisor({
      admission: productionAdmission,
      runtimeRoot: path.join(root, "runtime"),
      profilePath: PROFILE_PATH,
      installer: {
        ensureInstalled: async () => readyInstall(),
        getSnapshot: () => readyInstall(),
        subscribe: () => () => undefined,
        retry: async () => readyInstall(),
      },
      subprocess: subprocess as never,
      controlClient: controlClient as never,
      discoveryTimeoutMs: 500,
    });

    supervisor.start();
    await waitForStatus(supervisor, "ready");

    assert.deepEqual(invocations[0]?.arguments, [
      "serve-production",
      "--config",
      invocations[0]?.arguments?.[2],
      "--admission",
      invocations[0]?.arguments?.[4],
    ]);
    assert.deepEqual(writtenAdmission, productionAdmission);
    assert.equal(
      supervisor.getReadyConnection()?.discovery.cutoverReceiptId,
      productionAdmission.cutoverReceiptId,
    );
    assert.equal(
      supervisor.getReadyConnection()?.discovery.ownerMode,
      "production",
    );

    await supervisor.stop();
    assert.equal(supervisor.getSnapshot().status, "stopped");
  });

  it("fails closed before launch when admission is bound to another profile", async function () {
    const root = fs.mkdtempSync(
      path.join(os.tmpdir(), "zs-production-supervisor-mismatch-"),
    );
    let launches = 0;
    const supervisor = createSynthesisProductionRuntimeSupervisor({
      admission: {
        ...admission(root),
        profileId: "9".repeat(64),
      },
      runtimeRoot: path.join(root, "runtime"),
      profilePath: PROFILE_PATH,
      installer: {
        ensureInstalled: async () => readyInstall(),
        getSnapshot: () => readyInstall(),
        subscribe: () => () => undefined,
        retry: async () => readyInstall(),
      },
      subprocess: {
        call: async () => {
          launches += 1;
          throw new Error("unexpected_launch");
        },
      } as never,
      discoveryTimeoutMs: 50,
    });

    supervisor.start();
    await waitForStatus(supervisor, "incompatible");

    assert.equal(launches, 0);
    assert.equal(
      supervisor.getSnapshot().reasonCode,
      "production_admission_profile_mismatch",
    );
  });
});
