import { assert } from "chai";
import {
  freezePiToolGatewayTurn,
  type PiGatewayAttemptReceipt,
  type PiGatewayToolDefinition,
  type PiGatewayPolicy,
  type PiGatewayTurnInput,
} from "../../src/modules/piToolGateway";

function fixture(overrides: Partial<PiGatewayToolDefinition> = {}) {
  let executions = 0;
  const definition: PiGatewayToolDefinition = {
    capabilityId: "fixture.read",
    name: "fixture_read",
    description: "Read a fixture",
    schema: {
      type: "object",
      properties: { path: { type: "string" } },
      required: ["path"],
      additionalProperties: false,
    },
    minimumEffects: ["bounded-read"],
    maxResultBytes: 1024,
    classify: () => ({
      effects: ["bounded-read"],
      authorizationKeys: [],
      resourceKeys: [],
      cost: 1,
    }),
    execute: async () => {
      executions += 1;
      return {
        status: "completed",
        effectCertainty: "not_applicable",
        value: { text: "done" },
      };
    },
    ...overrides,
  };
  return { definition, executions: () => executions };
}

async function turn(
  definitions: PiGatewayToolDefinition[],
  overrides: Partial<Omit<PiGatewayTurnInput, "policy">> & {
    policy?: Partial<PiGatewayPolicy>;
  } = {},
) {
  const policy: PiGatewayPolicy = {
    mode: "interactive",
    systemAllowedEffects: ["bounded-read", "workspace-mutation"],
    authorizedEffects: ["bounded-read", "workspace-mutation"],
    authorizedKeys: [],
    maxCalls: 8,
    maxConcurrent: 3,
    maxCost: 8,
    ...overrides.policy,
  };
  return freezePiToolGatewayTurn({
    owner: { kind: "conversation", ownerId: "owner-one" },
    turnId: "turn-one",
    definitions,
    runtimeCapability: {
      identity: "fixture-runtime",
      availableCapabilityIds: definitions.map((item) => item.capabilityId),
    },
    hooks: {
      recordStarted: async () => undefined,
      recordReceipt: async () => undefined,
      recordPermission: async () => undefined,
    },
    ...overrides,
    policy,
  });
}

async function rejects(work: () => Promise<unknown>, code: string) {
  let caught: unknown;
  try {
    await work();
  } catch (error) {
    caught = error;
  }
  assert.isDefined(caught);
  assert.include(String(caught), code);
}

describe("Pi Tool Gateway shared behavior", function () {
  it("preserves bounded executor failure facts without copying them into receipts", async function () {
    const receipts: PiGatewayAttemptReceipt[] = [];
    const gateway = await turn(
      [
        fixture({
          execute: async () => ({
            status: "failed",
            effectCertainty: "confirmed_none",
            code: "not_found",
            retryable: true,
            details: { kind: "item", opaqueKey: "missing" },
          }),
        }).definition,
      ],
      {
        hooks: {
          recordStarted: async () => undefined,
          recordReceipt: async (receipt) => {
            receipts.push(receipt);
          },
          recordPermission: async () => undefined,
        },
      },
    );
    const result = (
      await gateway.executeBatch([
        { callId: "missing", name: "fixture_read", arguments: { path: "p" } },
      ])
    ).results[0];
    assert.equal(result.status, "failed");
    assert.equal(result.failure?.code, "not_found");
    assert.equal(result.failure?.retryable, true);
    assert.deepEqual(result.failure?.details, {
      kind: "item",
      opaqueKey: "missing",
    });
    assert.lengthOf(receipts, 1);
    assert.notProperty(receipts[0], "details");
  });

  it("rejects invalid or oversized executor failure details", async function () {
    for (const details of [
      { unsafe: new Error("private cause") },
      { oversized: "x".repeat(2048) },
    ]) {
      const gateway = await turn([
        fixture({
          execute: async () => ({
            status: "failed",
            effectCertainty: "confirmed_none",
            code: "not_found",
            details: details as any,
          }),
        }).definition,
      ]);
      const result = (
        await gateway.executeBatch([
          { callId: "invalid", name: "fixture_read", arguments: { path: "p" } },
        ])
      ).results[0];
      assert.equal(result.status, "failed");
      assert.equal(result.failure?.code, "execution_failed");
      assert.notProperty(result.failure || {}, "details");
    }
  });

  it("binds hidden MCP catalog identity and admits external mutation as its own effect", async function () {
    const item = fixture({
      execute: async () => ({
        status: "completed",
        effectCertainty: "confirmed_complete",
        value: { text: "done" },
      }),
      classify: () => ({
        effects: ["bounded-read", "external-egress", "external-mutation"],
        authorizationKeys: ["mcp:source"],
        resourceKeys: ["mcp:source"],
        cost: 1,
      }),
    });
    const first = await turn([item.definition], {
      hiddenCatalogDigest: "sha256:aaaa",
      policy: {
        systemAllowedEffects: [
          "bounded-read",
          "external-egress",
          "external-mutation",
        ],
        authorizedEffects: [
          "bounded-read",
          "external-egress",
          "external-mutation",
        ],
        authorizedKeys: ["mcp:source"],
      },
    });
    const second = await turn([item.definition], {
      hiddenCatalogDigest: "sha256:bbbb",
      policy: {
        systemAllowedEffects: [
          "bounded-read",
          "external-egress",
          "external-mutation",
        ],
        authorizedEffects: [
          "bounded-read",
          "external-egress",
          "external-mutation",
        ],
        authorizedKeys: ["mcp:source"],
      },
    });
    assert.notEqual(first.catalog.digest, second.catalog.digest);
    const result = await first.executeBatch([
      { callId: "mcp", name: "fixture_read", arguments: { path: "p" } },
    ]);
    assert.equal(result.results[0].status, "completed");
  });
  it("awaits canonical classification before authorization and executor start", async function () {
    const steps: string[] = [];
    const item = fixture({
      classify: async () => {
        await Promise.resolve();
        steps.push("classified");
        return {
          effects: ["bounded-read"],
          authorizationKeys: ["workspace:canonical"],
          resourceKeys: ["file:canonical"],
          cost: 1,
        };
      },
      execute: async () => {
        steps.push("executed");
        return { status: "completed", effectCertainty: "not_applicable" };
      },
    });
    const gateway = await turn([item.definition], {
      policy: { authorizedKeys: ["workspace:canonical"] },
    });
    const result = await gateway.executeBatch([
      { callId: "async", name: "fixture_read", arguments: { path: "p" } },
    ]);
    assert.equal(result.results[0].status, "completed");
    assert.deepEqual(steps, ["classified", "executed"]);
  });

  it("freezes a validated catalog and rejects unknown or malformed calls before effects", async function () {
    const item = fixture();
    const gateway = await turn([item.definition]);
    const originalDigest = gateway.catalog.digest;
    item.definition.name = "mutated_after_freeze";
    assert.equal(gateway.catalog.tools[0].name, "fixture_read");
    assert.equal(gateway.catalog.digest, originalDigest);

    const outcome = await gateway.executeBatch([
      { callId: "a", name: "fixture_read", arguments: {} },
      { callId: "b", name: "unregistered", arguments: {} },
    ]);
    assert.deepEqual(
      outcome.results.map((result) => result.failure?.code),
      ["invalid_request", "capability_unavailable"],
    );
    assert.equal(item.executions(), 0);
  });

  it("distinguishes the system ceiling, runtime capability, and current authorization", async function () {
    const item = fixture({
      classify: () => ({
        effects: ["bounded-read"],
        authorizationKeys: ["workspace:outside"],
        resourceKeys: [],
        cost: 1,
      }),
    });
    const call = {
      callId: "a",
      name: "fixture_read",
      arguments: { path: "outside" },
    };
    const pending: string[] = [];
    const interactive = await turn([item.definition], {
      hooks: {
        recordStarted: async () => undefined,
        recordReceipt: async () => undefined,
        recordPermission: async (value) => {
          pending.push(value.call.callId);
        },
      },
      policy: { authorizedKeys: [] },
    });
    const first = await interactive.executeBatch([call]);
    assert.equal(first.results[0].status, "permission_required");
    assert.deepEqual(pending, ["a"]);
    assert.equal(item.executions(), 0);

    const automatic = await turn([item.definition], {
      policy: { mode: "automatic", authorizedKeys: [] },
    });
    assert.equal(
      (await automatic.executeBatch([call])).results[0].failure?.code,
      "policy_denied",
    );

    const unavailable = await turn([item.definition], {
      runtimeCapability: { identity: "down", availableCapabilityIds: [] },
    });
    assert.equal(
      (await unavailable.executeBatch([call])).results[0].failure?.code,
      "capability_unavailable",
    );

    const forbidden = await turn([item.definition], {
      policy: { systemAllowedEffects: [] },
    });
    assert.equal(
      (await forbidden.executeBatch([call])).results[0].failure?.code,
      "policy_denied",
    );
    assert.equal(item.executions(), 0);
  });

  it("fails closed on incomplete classification and preserves validated arguments", async function () {
    const item = fixture({
      classify: () => ({
        effects: [],
        authorizationKeys: [],
        resourceKeys: [],
        cost: 1,
      }),
    });
    const gateway = await turn([item.definition]);
    const result = await gateway.executeBatch([
      { callId: "a", name: "fixture_read", arguments: { path: "p" } },
    ]);
    assert.equal(result.results[0].failure?.code, "policy_denied");
    assert.equal(result.results[0].failure?.origin, "tool_gateway");
    assert.equal(result.results[0].failure?.category, "policy");
    assert.equal(item.executions(), 0);

    const write = fixture({
      minimumEffects: ["workspace-mutation"],
      classify: () => ({
        effects: ["workspace-mutation"],
        authorizationKeys: [],
        resourceKeys: [],
        cost: 1,
      }),
    });
    const writeTurn = await turn([write.definition]);
    assert.equal(
      (
        await writeTurn.executeBatch([
          { callId: "write", name: "fixture_read", arguments: { path: "p" } },
        ])
      ).results[0].failure?.code,
      "policy_denied",
    );
    assert.equal(write.executions(), 0);

    let executedPath = "";
    const mutating = fixture({
      classify: (args) => {
        (args as { path: string }).path = "changed";
        return {
          effects: ["bounded-read"],
          authorizationKeys: [],
          resourceKeys: [],
          cost: 1,
        };
      },
      execute: async (args) => {
        executedPath = (args as { path: string }).path;
        return {
          status: "completed",
          effectCertainty: "not_applicable",
          value: null,
        };
      },
    });
    const mutationTurn = await turn([mutating.definition]);
    const mutationResult = await mutationTurn.executeBatch([
      { callId: "mutation", name: "fixture_read", arguments: { path: "p" } },
    ]);
    if (mutationResult.results[0].status === "completed") {
      assert.equal(executedPath, "p");
    } else {
      assert.equal(mutationResult.results[0].failure?.code, "policy_denied");
      assert.equal(executedPath, "");
    }
  });

  it("rejects invalid definitions and oversized safe evidence at admission", async function () {
    const item = fixture();
    await rejects(
      () => turn([item.definition, item.definition]),
      "definition_invalid",
    );
    await rejects(
      () => turn([fixture({ batchMode: "invalid" as never }).definition]),
      "definition_invalid",
    );
    await rejects(
      () =>
        turn([item.definition], {
          runtimeCapability: {
            identity: "",
            availableCapabilityIds: [item.definition.capabilityId],
          },
        }),
      "capability_invalid",
    );

    const oversized = fixture({
      classify: () => ({
        effects: ["bounded-read"],
        authorizationKeys: [],
        resourceKeys: [],
        cost: 1,
        safeRefs: ["x".repeat(20_000)],
      }),
    });
    const gateway = await turn([oversized.definition]);
    const result = await gateway.executeBatch([
      { callId: "a", name: "fixture_read", arguments: { path: "p" } },
    ]);
    assert.equal(result.results[0].failure?.code, "policy_denied");
    assert.equal(oversized.executions(), 0);
  });

  it("rejects structural batch errors before starting an otherwise eligible call", async function () {
    const item = fixture();
    const gateway = await turn([item.definition]);
    const malformed = await gateway.executeBatch([
      { callId: "valid", name: "fixture_read", arguments: { path: "a" } },
      null as never,
    ]);
    assert.isTrue(
      malformed.results.every(
        (result) => result.failure?.code === "invalid_request",
      ),
    );
    assert.equal(item.executions(), 0);

    const duplicate = await gateway.executeBatch([
      { callId: "same", name: "fixture_read", arguments: { path: "a" } },
      { callId: "same", name: "fixture_read", arguments: { path: "b" } },
    ]);
    assert.isTrue(
      duplicate.results.every(
        (result) => result.failure?.code === "invalid_request",
      ),
    );
    assert.equal(item.executions(), 0);

    const exclusive = fixture({
      capabilityId: "fixture.exclusive",
      name: "fixture_exclusive",
      batchMode: "exclusive",
    });
    const second = await turn([item.definition, exclusive.definition]);
    const mixed = await second.executeBatch([
      { callId: "one", name: "fixture_read", arguments: { path: "a" } },
      { callId: "two", name: "fixture_exclusive", arguments: { path: "b" } },
    ]);
    assert.isTrue(
      mixed.results.every(
        (result) => result.failure?.code === "invalid_request",
      ),
    );
    assert.equal(item.executions(), 0);
    assert.equal(exclusive.executions(), 0);
  });

  it("serializes one resource while independent calls run, then returns assistant order", async function () {
    const starts: string[] = [];
    let releaseFirst!: () => void;
    const holdFirst = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });
    let notifyOther!: () => void;
    const otherStarted = new Promise<void>((resolve) => {
      notifyOther = resolve;
    });
    const item = fixture({
      classify: (args) => ({
        effects: ["bounded-read"],
        authorizationKeys: [],
        resourceKeys: [(args as { path: string }).path],
        cost: 1,
      }),
      execute: async (args) => {
        const path = (args as { path: string }).path;
        starts.push(path);
        if (
          path === "a" &&
          starts.filter((entry) => entry === "a").length === 1
        ) {
          await holdFirst;
        }
        if (path === "b") notifyOther();
        return {
          status: "completed",
          effectCertainty: "not_applicable",
          value: { path },
        };
      },
    });
    const gateway = await turn([item.definition]);
    const batch = gateway.executeBatch([
      { callId: "first", name: "fixture_read", arguments: { path: "a" } },
      { callId: "second", name: "fixture_read", arguments: { path: "a" } },
      { callId: "third", name: "fixture_read", arguments: { path: "b" } },
    ]);
    await otherStarted;
    assert.deepEqual(starts, ["a", "b"]);
    releaseFirst();
    const outcome = await batch;
    assert.deepEqual(
      outcome.results.map((result) => result.callId),
      ["first", "second", "third"],
    );
    assert.deepEqual(
      outcome.results.map((result) => result.status),
      ["completed", "completed", "completed"],
    );
    assert.deepEqual(starts, ["a", "b", "a"]);
  });

  it("starts deferred interaction only after ordinary work settles", async function () {
    const order: string[] = [];
    const ordinary = fixture({
      execute: async () => {
        order.push("ordinary");
        return {
          status: "completed",
          effectCertainty: "not_applicable",
          value: null,
        };
      },
    });
    const deferred = fixture({
      capabilityId: "fixture.interaction",
      name: "fixture_interaction",
      batchMode: "deferred",
      execute: async () => {
        order.push("deferred");
        return {
          status: "completed",
          effectCertainty: "not_applicable",
          value: null,
        };
      },
    });
    const gateway = await turn([ordinary.definition, deferred.definition]);
    const outcome = await gateway.executeBatch([
      {
        callId: "interaction",
        name: "fixture_interaction",
        arguments: { path: "p" },
      },
      { callId: "work", name: "fixture_read", arguments: { path: "p" } },
    ]);
    assert.deepEqual(order, ["ordinary", "deferred"]);
    assert.deepEqual(
      outcome.results.map((result) => result.callId),
      ["interaction", "work"],
    );
  });

  it("removes a queued call on cancellation without claiming its effect started", async function () {
    const abort = new AbortController();
    let started!: () => void;
    const firstStarted = new Promise<void>((resolve) => {
      started = resolve;
    });
    let release!: () => void;
    const hold = new Promise<void>((resolve) => {
      release = resolve;
    });
    const item = fixture({
      classify: () => ({
        effects: ["bounded-read"],
        authorizationKeys: [],
        resourceKeys: ["same"],
        cost: 1,
      }),
      execute: async (_args, { signal }) => {
        started();
        await hold;
        return {
          status: "canceled",
          effectCertainty: signal.aborted ? "confirmed_none" : "unknown",
        };
      },
    });
    const gateway = await turn([item.definition], { signal: abort.signal });
    const batch = gateway.executeBatch([
      { callId: "first", name: "fixture_read", arguments: { path: "p" } },
      { callId: "queued", name: "fixture_read", arguments: { path: "p" } },
    ]);
    await firstStarted;
    abort.abort();
    release();
    const outcome = await batch;
    assert.equal(outcome.results[0].status, "canceled");
    assert.equal(outcome.results[1].effectCertainty, "not_started");
  });

  it("makes started evidence durable before effects and receipt durable before success", async function () {
    const order: string[] = [];
    let releaseReceipt!: () => void;
    const holdReceipt = new Promise<void>((resolve) => {
      releaseReceipt = resolve;
    });
    let receiptStarted!: () => void;
    const receiptAttempt = new Promise<void>((resolve) => {
      receiptStarted = resolve;
    });
    const item = fixture({
      execute: async () => {
        order.push("effect");
        return {
          status: "completed",
          effectCertainty: "not_applicable",
          value: { text: "done" },
        };
      },
    });
    const gateway = await turn([item.definition], {
      hooks: {
        recordStarted: async () => {
          order.push("started");
        },
        recordReceipt: async (receipt) => {
          order.push("receipt");
          assert.equal(receipt.outcome, "completed");
          assert.isUndefined((receipt as unknown as { value?: unknown }).value);
          receiptStarted();
          await holdReceipt;
        },
        recordPermission: async () => undefined,
      },
    });
    let settled = false;
    const batch = gateway
      .executeBatch([
        { callId: "a", name: "fixture_read", arguments: { path: "p" } },
      ])
      .then((result) => {
        settled = true;
        return result;
      });
    await receiptAttempt;
    assert.deepEqual(order, ["started", "effect", "receipt"]);
    assert.isFalse(settled);
    releaseReceipt();
    assert.equal((await batch).results[0].status, "completed");
  });

  it("fails closed on persistence failure, uncertain effect, and oversized result", async function () {
    const call = {
      callId: "a",
      name: "fixture_read",
      arguments: { path: "p" },
    };
    const before = fixture();
    const noStart = await turn([before.definition], {
      hooks: {
        recordStarted: async () => {
          throw new Error("disk unavailable");
        },
        recordReceipt: async () => undefined,
        recordPermission: async () => undefined,
      },
    });
    const startResult = (await noStart.executeBatch([call])).results[0];
    assert.equal(startResult.failure?.code, "persistence_failed");
    assert.equal(startResult.effectCertainty, "not_started");
    assert.equal(before.executions(), 0);

    const after = fixture();
    const noReceipt = await turn([after.definition], {
      hooks: {
        recordStarted: async () => undefined,
        recordReceipt: async () => {
          throw new Error("disk unavailable");
        },
        recordPermission: async () => undefined,
      },
    });
    const receiptResult = (await noReceipt.executeBatch([call])).results[0];
    assert.equal(receiptResult.status, "state_unknown");
    assert.equal(after.executions(), 1);

    const uncertain = fixture({
      execute: async () => {
        throw new Error("transport lost");
      },
    });
    const unknown = await turn([uncertain.definition]);
    assert.equal(
      (await unknown.executeBatch([call])).results[0].status,
      "state_unknown",
    );

    const unconfirmedStop = fixture({
      execute: async () => ({
        status: "canceled",
        effectCertainty: "unknown",
      }),
    });
    const stopped = await turn([unconfirmedStop.definition]);
    assert.equal(
      (await stopped.executeBatch([call])).results[0].status,
      "state_unknown",
    );

    const large = fixture({ maxResultBytes: 5 });
    const bounded = await turn([large.definition]);
    assert.equal(
      (await bounded.executeBatch([call])).results[0].failure?.code,
      "resource_limited",
    );
  });

  it("does not start an executor when cancellation arrives during durable start", async function () {
    const abort = new AbortController();
    let startEntered!: () => void;
    const entered = new Promise<void>((resolve) => {
      startEntered = resolve;
    });
    let releaseStart!: () => void;
    const hold = new Promise<void>((resolve) => {
      releaseStart = resolve;
    });
    const item = fixture();
    const gateway = await turn([item.definition], {
      signal: abort.signal,
      hooks: {
        recordStarted: async () => {
          startEntered();
          await hold;
        },
        recordReceipt: async () => undefined,
        recordPermission: async () => undefined,
      },
    });
    const batch = gateway.executeBatch([
      { callId: "a", name: "fixture_read", arguments: { path: "p" } },
    ]);
    await entered;
    abort.abort();
    releaseStart();
    const result = (await batch).results[0];
    assert.equal(item.executions(), 0);
    assert.equal(result.status, "canceled");
    assert.equal(result.effectCertainty, "confirmed_none");
  });

  it("continues only the exact approved call in a new turn without creating a standing grant", async function () {
    const item = fixture({
      classify: () => ({
        effects: ["bounded-read"],
        authorizationKeys: ["outside"],
        resourceKeys: [],
        cost: 1,
      }),
    });
    const call = {
      callId: "exact",
      name: "fixture_read",
      arguments: { path: "p" },
    };
    const first = await turn([item.definition]);
    const pending = (await first.executeBatch([call])).pending[0];
    assert.isOk(pending);
    const next = await turn([item.definition], { turnId: "turn-two" });
    const result = await next.continueCall(pending, "approve");
    assert.equal(result.status, "completed");
    assert.equal(item.executions(), 1);
    assert.equal(
      (await next.continueCall(pending, "approve")).failure?.code,
      "invalid_request",
    );

    const later = await turn([item.definition], { turnId: "turn-three" });
    assert.equal(
      (await later.executeBatch([{ ...call, callId: "later" }])).results[0]
        .status,
      "permission_required",
    );
    assert.equal(item.executions(), 1);
  });

  it("denies a matching request and reevaluates stale approval without executing", async function () {
    const item = fixture({
      classify: () => ({
        effects: ["bounded-read"],
        authorizationKeys: ["outside"],
        resourceKeys: [],
        cost: 1,
      }),
    });
    const call = {
      callId: "exact",
      name: "fixture_read",
      arguments: { path: "p" },
    };
    const first = await turn([item.definition]);
    const pending = (await first.executeBatch([call])).pending[0];
    const denied = await turn([item.definition], { turnId: "turn-deny" });
    assert.equal(
      (await denied.continueCall(pending, "deny")).failure?.code,
      "policy_denied",
    );

    const stale = await turn([item.definition], { turnId: "turn-stale" });
    const altered = {
      ...pending,
      call: { ...pending.call, arguments: { path: "changed" } },
    };
    const result = await stale.continueCall(altered, "approve");
    assert.equal(result.status, "permission_required");
    assert.equal(item.executions(), 0);

    const sameTurn = await first.continueCall(pending, "approve");
    assert.equal(sameTurn.failure?.code, "invalid_request");
  });

  it("treats malformed executor evidence as unknown and suppresses late updates", async function () {
    const call = {
      callId: "a",
      name: "fixture_read",
      arguments: { path: "p" },
    };
    const broken = fixture({ execute: async () => undefined as never });
    const brokenTurn = await turn([broken.definition]);
    assert.equal(
      (await brokenTurn.executeBatch([call])).results[0].status,
      "state_unknown",
    );

    let publish!: (value: { text: string }) => void;
    const updates: string[] = [];
    const item = fixture({
      execute: async (_args, context) => {
        publish = context.onUpdate;
        context.onUpdate({ text: "live" });
        return {
          status: "completed",
          effectCertainty: "not_applicable",
          value: null,
        };
      },
    });
    const gateway = await turn([item.definition], {
      onUpdate: (_callId, update) =>
        updates.push((update as { text: string }).text),
    });
    assert.equal(
      (await gateway.executeBatch([call])).results[0].status,
      "completed",
    );
    publish({ text: "late" });
    assert.deepEqual(updates, ["live"]);
  });

  it("keeps one active batch per turn and refuses a stale approval above the new budget", async function () {
    let release!: () => void;
    const hold = new Promise<void>((resolve) => {
      release = resolve;
    });
    let started!: () => void;
    const entered = new Promise<void>((resolve) => {
      started = resolve;
    });
    const item = fixture({
      classify: () => ({
        effects: ["bounded-read"],
        authorizationKeys: [],
        resourceKeys: ["same"],
        cost: 1,
      }),
      execute: async () => {
        started();
        await hold;
        return {
          status: "completed",
          effectCertainty: "not_applicable",
          value: null,
        };
      },
    });
    const gateway = await turn([item.definition]);
    const first = gateway.executeBatch([
      { callId: "first", name: "fixture_read", arguments: { path: "p" } },
    ]);
    await entered;
    const overlapping = await gateway.executeBatch([
      { callId: "second", name: "fixture_read", arguments: { path: "p" } },
    ]);
    assert.equal(overlapping.results[0].failure?.code, "owner_busy");
    release();
    assert.equal((await first).results[0].status, "completed");

    const expensive = fixture({
      classify: () => ({
        effects: ["bounded-read"],
        authorizationKeys: ["outside"],
        resourceKeys: [],
        cost: 9,
      }),
    });
    const old = await turn([expensive.definition], { policy: { maxCost: 9 } });
    const pending = (
      await old.executeBatch([
        { callId: "costly", name: "fixture_read", arguments: { path: "p" } },
      ])
    ).pending[0];
    const next = await turn([expensive.definition], {
      turnId: "next",
      policy: { maxCost: 8 },
    });
    const result = await next.continueCall(pending, "approve");
    assert.equal(result.failure?.code, "resource_limited");
    assert.equal(expensive.executions(), 0);
  });
});
