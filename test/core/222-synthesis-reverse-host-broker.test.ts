import { assert } from "chai";
import {
  SYNTHESIS_REVERSE_HOST_CALL_SCHEMA,
  SYNTHESIS_REVERSE_HOST_CAPABILITIES,
  SynthesisClientError,
  type SynthesisReverseHostCapability,
} from "../../packages/synthesis-contracts/src";
import {
  createSynthesisReverseHostBroker,
  type SynthesisReverseHostHandlers,
} from "../../src/modules/synthesisReverseHostBroker";

const profileId = "1".repeat(64);
const serviceInstanceId = "service-1";
const token = "token-1";

function makeHandlers(run: (capability: string) => unknown) {
  return Object.fromEntries(
    SYNTHESIS_REVERSE_HOST_CAPABILITIES.map((capability) => [
      capability,
      async () => run(capability),
    ]),
  ) as SynthesisReverseHostHandlers;
}

function call(
  capability: SynthesisReverseHostCapability,
  overrides: Record<string, unknown> = {},
) {
  return {
    schema: SYNTHESIS_REVERSE_HOST_CALL_SCHEMA,
    requestId: "request-1",
    profileId,
    serviceInstanceId,
    operationId: "operation-1",
    capability,
    deadlineAtMs: 11_000,
    payload: {},
    ...overrides,
  };
}

function reason(error: unknown) {
  assert.instanceOf(error, SynthesisClientError);
  return (error as SynthesisClientError).details?.reason;
}

describe("Synthesis reverse Host broker", function () {
  it("routes the closed capability set through lifecycle-scoped authorization", async function () {
    const routed: string[] = [];
    const broker = createSynthesisReverseHostBroker({
      profileId,
      serviceInstanceId,
      authorizationToken: token,
      now: () => 10_000,
      isHostConnected: () => true,
      authorizeCapability: () => true,
      handlers: makeHandlers((capability) => {
        routed.push(capability);
        return { capability };
      }),
    });
    assert.deepEqual(
      await broker.dispatch({
        authorizationToken: token,
        call: call("library.items.list_page"),
      }),
      { capability: "library.items.list_page" },
    );
    assert.deepEqual(routed, ["library.items.list_page"]);
  });

  it("allows a token-authenticated preflight instance only while no live instance is bound", async function () {
    let boundInstance: string | null = null;
    const broker = createSynthesisReverseHostBroker({
      profileId,
      serviceInstanceId: () => boundInstance,
      allowUnboundServiceInstance: true,
      authorizationToken: token,
      now: () => 10_000,
      isHostConnected: () => true,
      authorizeCapability: () => true,
      handlers: makeHandlers(() => ({ ok: true })),
    });

    assert.deepEqual(
      await broker.dispatch({
        authorizationToken: token,
        call: call("library.items.list_page", {
          serviceInstanceId: "preflight-instance",
        }),
      }),
      { ok: true },
    );
    boundInstance = serviceInstanceId;
    let stale: unknown;
    try {
      await broker.dispatch({
        authorizationToken: token,
        call: call("library.items.list_page", {
          serviceInstanceId: "preflight-instance",
        }),
      });
    } catch (error) {
      stale = error;
    }
    assert.equal(reason(stale), "reverse_host_stale_instance");
  });

  it("rejects authorization, instance, deadline, connection, and permission failures before effects", async function () {
    let effects = 0;
    let connected = true;
    let permitted = true;
    const broker = createSynthesisReverseHostBroker({
      profileId,
      serviceInstanceId,
      authorizationToken: token,
      now: () => 10_000,
      isHostConnected: () => connected,
      authorizeCapability: () => permitted,
      handlers: makeHandlers(() => {
        effects += 1;
        return {};
      }),
    });
    const attempts = [
      {
        authorizationToken: "wrong",
        call: call("effects.tags.apply_batch"),
        expected: "reverse_host_unauthorized",
      },
      {
        authorizationToken: token,
        call: call("effects.tags.apply_batch", {
          serviceInstanceId: "stale",
        }),
        expected: "reverse_host_stale_instance",
      },
      {
        authorizationToken: token,
        call: call("effects.tags.apply_batch", {
          deadlineAtMs: 10_000,
        }),
        expected: "reverse_host_deadline_invalid",
      },
    ];
    for (const attempt of attempts) {
      let error: unknown;
      try {
        await broker.dispatch(attempt);
      } catch (caught) {
        error = caught;
      }
      assert.equal(reason(error), attempt.expected);
    }
    connected = false;
    let disconnected: unknown;
    try {
      await broker.dispatch({
        authorizationToken: token,
        call: call("effects.tags.apply_batch"),
      });
    } catch (caught) {
      disconnected = caught;
    }
    assert.equal(reason(disconnected), "reverse_host_disconnected");
    connected = true;
    permitted = false;
    let denied: unknown;
    try {
      await broker.dispatch({
        authorizationToken: token,
        call: call("effects.tags.apply_batch"),
      });
    } catch (caught) {
      denied = caught;
    }
    assert.equal(reason(denied), "permission_denied");
    assert.equal(effects, 0);
  });

  it("deduplicates effects by operation id and rejects conflicting replay", async function () {
    let effects = 0;
    const broker = createSynthesisReverseHostBroker({
      profileId,
      serviceInstanceId,
      authorizationToken: token,
      now: () => 10_000,
      isHostConnected: () => true,
      authorizeCapability: () => true,
      handlers: makeHandlers(() => ({ effects: ++effects })),
    });
    const first = {
      authorizationToken: token,
      call: call("effects.tags.apply_batch", {
        payload: { tag: "one" },
      }),
    };
    assert.deepEqual(await broker.dispatch(first), { effects: 1 });
    assert.deepEqual(await broker.dispatch(first), { effects: 1 });
    let conflict: unknown;
    try {
      await broker.dispatch({
        authorizationToken: token,
        call: call("effects.tags.apply_batch", {
          payload: { tag: "two" },
        }),
      });
    } catch (caught) {
      conflict = caught;
    }
    assert.equal(reason(conflict), "reverse_host_operation_conflict");
    assert.equal(effects, 1);
  });
});
