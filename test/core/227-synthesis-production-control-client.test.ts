import { assert } from "chai";
import {
  SYNTHESIS_PRODUCTION_DISCOVERY_SCHEMA,
  rebuildSynthesisProductionDiscovery,
} from "../../packages/synthesis-contracts/src/sidecarProduction";
import {
  SYNTHESIS_SIDECAR_CAPABILITIES,
  SYNTHESIS_SIDECAR_PRODUCTION_CLIENT_CAPABILITY_FINGERPRINT,
  SYNTHESIS_SIDECAR_PROTOCOL,
  SYNTHESIS_SIDECAR_READY_PRODUCTION_CLIENT_CAPABILITIES,
} from "../../packages/synthesis-contracts/src/sidecarSystem";
import { createSynthesisProductionSidecarControlClient } from "../../src/modules/synthesisSidecarControlClient";

const PROFILE_ID = "1".repeat(64);

function identity() {
  return {
    implementation: "rust-native" as const,
    protocol: SYNTHESIS_SIDECAR_PROTOCOL,
    serviceVersion: "0.1.0",
    serviceInstanceId: "service-1",
    supervisorInstanceId: "supervisor-1",
    bundleId: "4".repeat(64),
    target: "linux-x64" as const,
    targetTriple: "x86_64-unknown-linux-gnu" as const,
    buildFingerprint: "5".repeat(64),
    platformSignature: {
      scheme: "not-applicable" as const,
      status: "not-applicable" as const,
      signer: null,
    },
  };
}

function authority() {
  return {
    ownerMode: "production" as const,
    mutationEnabled: false as const,
    capabilityFingerprint:
      SYNTHESIS_SIDECAR_PRODUCTION_CLIENT_CAPABILITY_FINGERPRINT,
    cutoverReceiptId: "receipt-1",
    readyClientCapabilities:
      SYNTHESIS_SIDECAR_READY_PRODUCTION_CLIENT_CAPABILITIES,
  };
}

function snapshots() {
  return {
    repository: {
      mode: "production" as const,
      state: "ready" as const,
      schemaVersion: "synthesis-repository-foundation.v1" as const,
      repositoryId: "6".repeat(64),
    },
    canonicalStore: {
      state: "ready" as const,
      schemaVersion: "synthesis-topic-canonical-store.v1" as const,
      storeId: "7".repeat(64),
    },
    computePool: {
      state: "idle" as const,
      active: 0 as const,
      queued: 0,
      restartCount: 0,
      failureCount: 0,
    },
    citationGraphTransfer: {
      state: "idle" as const,
      sessions: 0,
      stagedBytes: 0,
    },
  };
}

function discovery() {
  const runtime = identity();
  return rebuildSynthesisProductionDiscovery({
    schema: SYNTHESIS_PRODUCTION_DISCOVERY_SCHEMA,
    profileId: PROFILE_ID,
    supervisorInstanceId: runtime.supervisorInstanceId,
    serviceInstanceId: runtime.serviceInstanceId,
    bundleId: runtime.bundleId,
    implementation: runtime.implementation,
    target: runtime.target,
    targetTriple: runtime.targetTriple,
    buildFingerprint: runtime.buildFingerprint,
    platformSignature: runtime.platformSignature,
    serviceVersion: runtime.serviceVersion,
    protocolVersion: runtime.protocol,
    schemaVersion: "synthesis-repository-foundation.v1",
    runtimeRootId: "2".repeat(64),
    dataRootId: "3".repeat(64),
    host: "127.0.0.1",
    port: 9134,
    pid: 42,
    lifecycleState: "ready",
    tokenLocator: "supervisor-session",
    capabilities: SYNTHESIS_SIDECAR_CAPABILITIES,
    ...authority(),
  });
}

async function expectRejected(promise: Promise<unknown>, message: string) {
  try {
    await promise;
    assert.fail(`expected rejection: ${message}`);
  } catch (error) {
    assert.equal((error as Error).message, message);
  }
}

describe("Synthesis production sidecar control client", function () {
  it("shares the bounded transport while enforcing production authority on every readiness response", async function () {
    const productionDiscovery = discovery();
    const runtime = identity();
    const requests: Array<{ url: string; init?: RequestInit }> = [];
    const fetch = async (url: string | URL | Request, init?: RequestInit) => {
      requests.push({ url: String(url), init });
      if (init?.method === "GET") {
        return new Response(
          JSON.stringify({
            status: "ok",
            ...runtime,
            lifecycleState: "ready",
            ...snapshots(),
            ...authority(),
          }),
        );
      }
      const request = JSON.parse(String(init?.body)) as {
        capability: string;
      };
      if (request.capability === "system.shutdown") {
        return new Response(
          JSON.stringify({
            ok: true,
            requestId: "shutdown-1",
            serviceInstanceId: runtime.serviceInstanceId,
            data: { accepted: true, lifecycleState: "stopping" },
            diagnostics: [],
          }),
        );
      }
      return new Response(
        JSON.stringify({
          ok: true,
          requestId: "handshake-1",
          serviceInstanceId: runtime.serviceInstanceId,
          data: {
            ...runtime,
            profileId: PROFILE_ID,
            schemaVersion: productionDiscovery.schemaVersion,
            runtimeRootId: productionDiscovery.runtimeRootId,
            dataRootId: productionDiscovery.dataRootId,
            capabilities: SYNTHESIS_SIDECAR_CAPABILITIES,
            lifecycleState: "ready",
            ...snapshots(),
            ...authority(),
          },
          diagnostics: [],
        }),
      );
    };
    const client = createSynthesisProductionSidecarControlClient({ fetch });
    const connection = {
      discovery: productionDiscovery,
      clientToken: "client-token",
      lifecycleToken: "lifecycle-token",
    };

    assert.equal((await client.health(connection)).ownerMode, "production");
    assert.equal(
      (await client.handshake(connection)).cutoverReceiptId,
      "receipt-1",
    );
    await client.activate(connection, {
      receiptId: "receipt-1",
      serviceInstanceId: runtime.serviceInstanceId,
      capabilityFingerprint:
        SYNTHESIS_SIDECAR_PRODUCTION_CLIENT_CAPABILITY_FINGERPRINT,
      readyClientCapabilities:
        SYNTHESIS_SIDECAR_READY_PRODUCTION_CLIENT_CAPABILITIES,
      smokeEvidenceDigest: "8".repeat(64),
      issuedAtMs: Date.now(),
    });
    await client.shutdown(connection);

    assert.deepEqual(
      requests.map((request) => request.init?.method),
      ["GET", "POST", "POST", "POST"],
    );
    assert.equal(
      (requests[1]!.init?.headers as Record<string, string>).authorization,
      "Bearer client-token",
    );
    assert.equal(
      (requests[2]!.init?.headers as Record<string, string>).authorization,
      "Bearer lifecycle-token",
    );
    assert.equal(
      (requests[3]!.init?.headers as Record<string, string>).authorization,
      "Bearer lifecycle-token",
    );
    assert.equal(
      JSON.parse(String(requests[2]!.init?.body)).capability,
      "system.production.activate",
    );
  });

  it("rejects a health or handshake bound to another cutover receipt", async function () {
    const productionDiscovery = discovery();
    const runtime = identity();
    const client = createSynthesisProductionSidecarControlClient({
      fetch: async (_url, init) =>
        new Response(
          JSON.stringify(
            init?.method === "GET"
              ? {
                  status: "ok",
                  ...runtime,
                  lifecycleState: "ready",
                  ...snapshots(),
                  ...authority(),
                  cutoverReceiptId: "receipt-2",
                }
              : {
                  ok: true,
                  serviceInstanceId: runtime.serviceInstanceId,
                  data: {
                    ...runtime,
                    profileId: PROFILE_ID,
                    schemaVersion: productionDiscovery.schemaVersion,
                    runtimeRootId: productionDiscovery.runtimeRootId,
                    dataRootId: productionDiscovery.dataRootId,
                    capabilities: SYNTHESIS_SIDECAR_CAPABILITIES,
                    lifecycleState: "ready",
                    ...snapshots(),
                    ...authority(),
                    cutoverReceiptId: "receipt-2",
                  },
                },
          ),
        ),
    });
    const connection = {
      discovery: productionDiscovery,
      clientToken: "client-token",
      lifecycleToken: "lifecycle-token",
    };

    await expectRejected(
      client.health(connection),
      "sidecar_health_identity_mismatch",
    );
    await expectRejected(
      client.handshake(connection),
      "sidecar_handshake_identity_mismatch",
    );
  });
});
