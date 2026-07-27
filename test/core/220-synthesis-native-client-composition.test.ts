import { assert } from "chai";
import {
  SynthesisClientError,
  SYNTHESIS_SIDECAR_PRODUCTION_CLIENT_CAPABILITY_FINGERPRINT,
  type SynthesisSidecarProductionClientCapability,
} from "../../packages/synthesis-contracts/src";
import { inspectSynthesisProductionCapabilities } from "../../scripts/check-synthesis-production-capabilities";
import { createNativeSynthesisClientComposition } from "../../src/modules/synthesisClient/nativeComposition";

describe("Synthesis native client composition", function () {
  it("keeps the TypeScript port and Rust manifest on one closed fingerprint", function () {
    const report = inspectSynthesisProductionCapabilities();
    assert.equal(report.capabilityCount, 95);
    assert.equal(report.operationCount, 95);
    assert.equal(
      report.fingerprint,
      SYNTHESIS_SIDECAR_PRODUCTION_CLIENT_CAPABILITY_FINGERPRINT,
    );
    assert.isTrue(
      Object.values(report.errors).every((values) => values.length === 0),
      JSON.stringify(report.errors),
    );
  });

  it("reuses the grouped client facade over closed native capabilities", async function () {
    const calls: Array<{
      capability: SynthesisSidecarProductionClientCapability;
      payload: unknown;
    }> = [];
    const composition = createNativeSynthesisClientComposition({
      getReadyConnection: () => ({
        discovery: {
          host: "127.0.0.1",
          port: 1234,
          profileId: "1".repeat(64),
          serviceInstanceId: "service-1",
        },
        clientToken: "token",
      }),
      rpcClient: {
        async call(args) {
          calls.push({
            capability:
              args.capability as SynthesisSidecarProductionClientCapability,
            payload: args.payload,
          });
          return args.rebuildResult({ topics: [] });
        },
      },
    });

    assert.deepEqual(await composition.client.topics.list(), { topics: [] });
    assert.deepEqual(calls, [
      {
        capability: "client.listTopics",
        payload: { args: [{}] },
      },
    ]);
  });

  it("fails closed after invalidation without resolving another owner", async function () {
    let connectionReads = 0;
    const composition = createNativeSynthesisClientComposition({
      getReadyConnection: () => {
        connectionReads += 1;
        return null;
      },
      rpcClient: {
        async call() {
          throw new Error("unexpected");
        },
      },
    });
    composition.invalidate();
    let failure: unknown;
    try {
      await composition.client.topics.list();
    } catch (error) {
      failure = error;
    }
    assert.instanceOf(failure, SynthesisClientError);
    assert.equal((failure as SynthesisClientError).code, "unavailable");
    assert.equal(connectionReads, 0);
    await composition.dispose();
  });
});
