import { assert } from "chai";
import {
  freezePiToolGatewayTurn,
  type PiGatewayAttemptReceipt,
  type PiGatewayPolicy,
} from "../../src/modules/piToolGateway";
import { createZoteroNativeToolDefinitions } from "../../src/modules/zoteroNativeToolCatalog";
import { ZoteroHostCapabilityError } from "../../src/modules/zoteroHostCapabilityBroker";
import type { JsonObject } from "../../src/workflows/types";
import { createFailClosedZoteroHostCapabilityBroker } from "../helpers/zoteroHostCapabilityBrokerHarness";

const capabilityId = "context.get_current_view";
const name = "zotero_context_get_current_view";
const view = {
  target: "library" as const,
  libraryIds: [1],
  selectedSources: [],
  selectionEmpty: true,
};

async function turn(
  broker = createFailClosedZoteroHostCapabilityBroker({
    context: { getCurrentView: () => view },
  }),
  availableCapabilityIds = [capabilityId],
) {
  const started: { capabilityId: string; name: string }[] = [];
  const receipts: PiGatewayAttemptReceipt[] = [];
  const policy: PiGatewayPolicy = {
    mode: "interactive",
    systemAllowedEffects: ["bounded-read"],
    authorizedEffects: ["bounded-read"],
    authorizedKeys: [],
    maxCalls: 1,
    maxConcurrent: 1,
    maxCost: 1,
  };
  const gateway = await freezePiToolGatewayTurn({
    owner: { kind: "conversation", ownerId: "owner" },
    turnId: "turn",
    definitions: [...createZoteroNativeToolDefinitions(broker)],
    policy,
    runtimeCapability: { identity: "test", availableCapabilityIds },
    hooks: {
      recordStarted: async (fact) => {
        started.push(fact);
      },
      recordReceipt: async (receipt) => {
        receipts.push(receipt);
      },
      recordPermission: async () => undefined,
    },
  });
  const call = (arguments_: JsonObject = {}) =>
    gateway.executeBatch([{ callId: "call", name, arguments: arguments_ }]);
  return { gateway, started, receipts, call };
}

describe("Pi Zotero Native Tool Catalog", function () {
  it("admits one reviewed current-view definition and preserves broker DTO and dual receipt identity", async function () {
    let calls = 0;
    const broker = createFailClosedZoteroHostCapabilityBroker({
      context: {
        getCurrentView: () => {
          calls += 1;
          return view;
        },
      },
    });
    const { gateway, started, receipts, call } = await turn(broker);
    assert.deepEqual(
      gateway.catalog.tools.map((tool) => tool.name),
      [name],
    );
    assert.deepEqual(
      gateway.catalog.tools.map((tool) => tool.capabilityId),
      [capabilityId],
    );
    assert.deepEqual(gateway.catalog.tools[0].schema, {
      type: "object",
      properties: {},
      additionalProperties: false,
    });
    const result = (await call()).results[0];
    assert.equal(result.status, "completed");
    assert.deepEqual(result.value, view);
    assert.equal(calls, 1);
    assert.deepEqual(
      started.map(({ capabilityId, name }) => ({ capabilityId, name })),
      [{ capabilityId, name }],
    );
    assert.deepEqual(
      receipts.map(({ capabilityId, name, effects }) => ({
        capabilityId,
        name,
        effects,
      })),
      [{ capabilityId, name, effects: ["bounded-read"] }],
    );
  });

  it("rejects extra input and unavailable capability before calling the broker", async function () {
    let calls = 0;
    const broker = createFailClosedZoteroHostCapabilityBroker({
      context: {
        getCurrentView: () => {
          calls += 1;
          return view;
        },
      },
    });
    const malformed = await turn(broker);
    assert.equal(
      (await malformed.call({ extra: true })).results[0].failure?.code,
      "invalid_request",
    );
    const unavailable = await turn(broker, []);
    assert.lengthOf(unavailable.gateway.catalog.tools, 0);
    assert.equal(
      (await unavailable.call()).results[0].failure?.code,
      "capability_unavailable",
    );
    assert.equal(calls, 0);
  });

  it("preserves canonical broker failure facts and hides unknown exceptions", async function () {
    const known = await turn(
      createFailClosedZoteroHostCapabilityBroker({
        context: {
          getCurrentView: () => {
            throw new ZoteroHostCapabilityError(
              "unavailable",
              "private broker prose",
              { reason: "navigation", kind: "library" },
              true,
            );
          },
        },
      }),
    );
    const knownResult = (await known.call()).results[0];
    assert.equal(knownResult.failure?.code, "unavailable");
    assert.equal(knownResult.failure?.retryable, true);
    assert.deepEqual(knownResult.failure?.details, {
      reason: "navigation",
      kind: "library",
    });
    assert.notInclude(JSON.stringify(knownResult), "private broker prose");
    assert.notProperty(known.receipts[0], "details");

    const unknown = await turn(
      createFailClosedZoteroHostCapabilityBroker({
        context: {
          getCurrentView: () => {
            throw new Error("private native cause");
          },
        },
      }),
    );
    const unknownResult = (await unknown.call()).results[0];
    assert.equal(unknownResult.failure?.code, "internal_error");
    assert.notProperty(unknownResult.failure || {}, "details");
    assert.notInclude(JSON.stringify(unknownResult), "private native cause");
  });

  it("requires the injected broker member and never resolves a global fallback", async function () {
    assert.throws(() => createZoteroNativeToolDefinitions({} as any));
    const { call } = await turn(createFailClosedZoteroHostCapabilityBroker());
    assert.equal((await call()).results[0].failure?.code, "unavailable");
  });
});
