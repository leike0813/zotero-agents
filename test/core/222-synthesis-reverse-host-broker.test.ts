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
import {
  setDebugModeOverrideForTests,
  setSynthesisSidecarDiagnosticsSourceOverrideForTests,
} from "../../src/modules/debugMode";

const profileId = "1".repeat(64);
const serviceInstanceId = "service-1";
const token = "token-1";

function emptyPage() {
  return {
    cursor: "",
    nextCursor: "",
    hasMore: false,
    returned: 0,
    limit: 50,
    items: [],
  };
}

function tagPayload(tag = "topic:one") {
  return {
    effects: [
      {
        effectId: "effect-1",
        action: "ensure_present",
        target: { libraryId: 1, itemKey: "ABCD1234" },
        tag,
        provenance: { kind: "staged_tag_promotion" },
        precondition: { target: "exists" },
        permission: {
          scope: "synthesis.tags",
          reason: "promote_staged_tag",
        },
      },
    ],
  };
}

function tagResult() {
  return {
    receipts: [
      {
        effectId: "effect-1",
        action: "ensure_present",
        status: "applied",
        occurredAt: "2026-08-12T00:00:00.000Z",
        diagnostics: [],
      },
    ],
  };
}

function makeHandlers(run: (capability: string, payload: unknown) => unknown) {
  return Object.fromEntries(
    SYNTHESIS_REVERSE_HOST_CAPABILITIES.map((capability) => [
      capability,
      async (payload: unknown) => run(capability, payload),
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
  beforeEach(function () {
    setDebugModeOverrideForTests(true);
    setSynthesisSidecarDiagnosticsSourceOverrideForTests(true);
  });

  afterEach(function () {
    setSynthesisSidecarDiagnosticsSourceOverrideForTests(undefined);
    setDebugModeOverrideForTests(undefined);
  });

  it("reports payload-free handler boundaries with shared correlation ids", async function () {
    const events: Record<string, unknown>[] = [];
    const broker = createSynthesisReverseHostBroker({
      profileId,
      serviceInstanceId,
      authorizationToken: token,
      now: () => 10_000,
      isHostConnected: () => true,
      authorizeCapability: () => true,
      handlers: makeHandlers(() => ({
        status: "available",
        content: { kind: "text", text: "目录", mediaType: "text/plain" },
        diagnostics: [],
      })),
      recordTraceEvent: (event) => events.push(event),
    });

    await broker.dispatch({
      authorizationToken: token,
      call: call("library.artifacts.read", {
        payload: { locator: "note:1", expectedHash: "sha256:expected" },
      }),
    });

    assert.deepEqual(
      events.map((event) => [
        event.phase,
        event.outcome,
        (event.identities as Record<string, unknown>)?.capability,
      ]),
      [
        ["handler", "started", "library.artifacts.read"],
        ["handler-terminal", "succeeded", "library.artifacts.read"],
      ],
    );
    assert.isAbove(
      Number((events[1]?.metrics as Record<string, unknown>)?.responseBytes),
      "目录".length,
    );
    assert.notInclude(JSON.stringify(events), "目录");
  });

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
        return emptyPage();
      }),
    });
    assert.deepEqual(
      await broker.dispatch({
        authorizationToken: token,
        call: call("library.items.list_page"),
      }),
      emptyPage(),
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
      handlers: makeHandlers(() => emptyPage()),
    });

    assert.deepEqual(
      await broker.dispatch({
        authorizationToken: token,
        call: call("library.items.list_page", {
          serviceInstanceId: "preflight-instance",
        }),
      }),
      emptyPage(),
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
        return tagResult();
      }),
    });
    const attempts = [
      {
        authorizationToken: "wrong",
        call: call("effects.tags.apply_batch", { payload: tagPayload() }),
        expected: "reverse_host_unauthorized",
      },
      {
        authorizationToken: token,
        call: call("effects.tags.apply_batch", {
          serviceInstanceId: "stale",
          payload: tagPayload(),
        }),
        expected: "reverse_host_stale_instance",
      },
      {
        authorizationToken: token,
        call: call("effects.tags.apply_batch", {
          deadlineAtMs: 10_000,
          payload: tagPayload(),
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
        call: call("effects.tags.apply_batch", { payload: tagPayload() }),
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
        call: call("effects.tags.apply_batch", { payload: tagPayload() }),
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
      handlers: makeHandlers(() => {
        effects += 1;
        return tagResult();
      }),
    });
    const first = {
      authorizationToken: token,
      call: call("effects.tags.apply_batch", {
        payload: tagPayload("topic:one"),
      }),
    };
    assert.deepEqual(await broker.dispatch(first), tagResult());
    assert.deepEqual(await broker.dispatch(first), tagResult());
    let conflict: unknown;
    try {
      await broker.dispatch({
        authorizationToken: token,
        call: call("effects.tags.apply_batch", {
          payload: tagPayload("topic:two"),
        }),
      });
    } catch (caught) {
      conflict = caught;
    }
    assert.equal(reason(conflict), "reverse_host_operation_conflict");
    assert.equal(effects, 1);
  });

  it("rejects unknown nested request and result fields at the broker boundary", async function () {
    let calls = 0;
    const broker = createSynthesisReverseHostBroker({
      profileId,
      serviceInstanceId,
      authorizationToken: token,
      now: () => 10_000,
      isHostConnected: () => true,
      authorizeCapability: () => true,
      handlers: makeHandlers(() => {
        calls += 1;
        return {
          ...tagResult(),
          receipts: [
            {
              ...tagResult().receipts[0],
              diagnostics: [
                { code: "failed", severity: "error", ignored: true },
              ],
            },
          ],
        };
      }),
    });
    const invalidRequest = tagPayload() as Record<string, unknown>;
    const effects = invalidRequest.effects as Array<Record<string, unknown>>;
    effects[0] = {
      ...effects[0],
      permission: {
        ...((effects[0]?.permission as Record<string, unknown>) || {}),
        ignored: true,
      },
    };
    let requestError: unknown;
    try {
      await broker.dispatch({
        authorizationToken: token,
        call: call("effects.tags.apply_batch", { payload: invalidRequest }),
      });
    } catch (error) {
      requestError = error;
    }
    assert.instanceOf(requestError, SynthesisClientError);
    assert.equal(calls, 0);

    let resultError: unknown;
    try {
      await broker.dispatch({
        authorizationToken: token,
        call: call("effects.tags.apply_batch", {
          operationId: "operation-result-invalid",
          payload: tagPayload(),
        }),
      });
    } catch (error) {
      resultError = error;
    }
    assert.instanceOf(resultError, SynthesisClientError);
    assert.equal(calls, 1);
  });
});
