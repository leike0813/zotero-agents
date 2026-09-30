import { assert } from "chai";
import {
  freezePiToolGatewayTurn,
  type PiGatewayExecution,
  type PiGatewayPendingCall,
  type PiGatewayAttemptReceipt,
  type PiGatewayToolDefinition,
  type PiGatewayPolicy,
  type PiGatewayTurnInput,
} from "../../src/modules/piToolGateway";
import type { JsonValue } from "../../src/workflows/types";

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

// Domain preflight fixture: classify claims workspace mutation behind an
// authorization key, the preflight stage owns its own execute/dispose, and the
// plain execute is a tripwire that must never be reached once preflight exists.
function plannedFixture(overrides: Partial<PiGatewayToolDefinition> = {}) {
  const state = {
    executions: 0,
    disposals: 0,
    sources: [] as string[],
    disposeThrows: false,
    digest: "sha256:plan-one",
    facts: { plan: { revision: 1 } } as JsonValue,
    execution: {
      status: "completed",
      effectCertainty: "confirmed_complete",
      value: { ok: true },
    } as PiGatewayExecution,
  };
  const definition: PiGatewayToolDefinition = {
    capabilityId: "fixture.mutate",
    name: "fixture_mutate",
    description: "Mutate a fixture with domain preflight",
    schema: {
      type: "object",
      properties: { path: { type: "string" } },
      required: ["path"],
      additionalProperties: false,
    },
    minimumEffects: ["workspace-mutation"],
    maxResultBytes: 1024,
    classify: () => ({
      effects: ["workspace-mutation"],
      authorizationKeys: ["outside"],
      resourceKeys: ["fixture:resource"],
      cost: 1,
    }),
    preflight: async (_args, context) => {
      state.sources.push(context.sourceTurnId);
      return {
        status: "prepared",
        domainPlanDigest: state.digest,
        admissionFacts: state.facts,
        execute: async () => {
          state.executions += 1;
          return state.execution;
        },
        dispose: async () => {
          if (state.disposeThrows) throw new Error("cleanup failure");
          state.disposals += 1;
        },
      };
    },
    execute: async () => {
      throw new Error("preflight required");
    },
    ...overrides,
  };
  return {
    definition,
    state,
    executions: () => state.executions,
    disposals: () => state.disposals,
  };
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
    const result = (await next.continueCall(pending, "approve")).result;
    assert.equal(result.status, "completed");
    assert.equal(item.executions(), 1);
    assert.equal(
      (await next.continueCall(pending, "approve")).result.failure?.code,
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
      (await denied.continueCall(pending, "deny")).result.failure?.code,
      "policy_denied",
    );

    const stale = await turn([item.definition], { turnId: "turn-stale" });
    const altered = {
      ...pending,
      call: { ...pending.call, arguments: { path: "changed" } },
    };
    const result = await stale.continueCall(altered, "approve");
    assert.equal(result.result.status, "permission_required");
    assert.isOk(result.pending);
    assert.equal(item.executions(), 0);

    const sameTurn = await first.continueCall(pending, "approve");
    assert.equal(sameTurn.result.failure?.code, "invalid_request");
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
    assert.equal(result.result.failure?.code, "resource_limited");
    assert.equal(expensive.executions(), 0);
  });

  it("settles every domain preflight before any executor starts", async function () {
    let release!: () => void;
    const hold = new Promise<void>((resolve) => {
      release = resolve;
    });
    let entered!: () => void;
    const slowPreflight = new Promise<void>((resolve) => {
      entered = resolve;
    });
    const order: string[] = [];
    const planned = (tag: string, wait: Promise<void>, notify?: () => void) =>
      plannedFixture({
        capabilityId: `fixture.${tag}`,
        name: `fixture_${tag}`,
        classify: () => ({
          effects: ["workspace-mutation"],
          authorizationKeys: [],
          resourceKeys: [`fixture:${tag}`],
          cost: 1,
        }),
        preflight: async () => {
          order.push(`preflight:${tag}`);
          notify?.();
          await wait;
          return {
            status: "prepared",
            domainPlanDigest: `sha256:${tag}`,
            admissionFacts: { tag },
            execute: async () => {
              order.push(`execute:${tag}`);
              return {
                status: "completed",
                effectCertainty: "confirmed_complete",
                value: null,
              };
            },
            dispose: async () => {
              order.push(`dispose:${tag}`);
            },
          };
        },
      });
    const slow = planned("slow", hold, entered);
    const fast = planned("fast", Promise.resolve());
    const gateway = await turn([slow.definition, fast.definition]);
    const batch = gateway.executeBatch([
      { callId: "slow", name: "fixture_slow", arguments: { path: "p" } },
      { callId: "fast", name: "fixture_fast", arguments: { path: "p" } },
    ]);
    await slowPreflight;
    assert.isFalse(order.some((entry) => entry.startsWith("execute")));
    release();
    const outcome = await batch;
    assert.lengthOf(
      outcome.results.filter((result) => result.status === "completed"),
      2,
    );
    const firstExecute = order.findIndex((entry) =>
      entry.startsWith("execute"),
    );
    assert.isTrue(
      order
        .slice(0, firstExecute)
        .every((entry) => entry.startsWith("preflight")),
    );
  });

  it("defers a prepared call, disposes its stage, and binds safe admission facts", async function () {
    const item = plannedFixture();
    const recorded: PiGatewayPendingCall[] = [];
    const gateway = await turn([item.definition], {
      hooks: {
        recordStarted: async () => undefined,
        recordReceipt: async () => undefined,
        recordPermission: async (value) => {
          recorded.push(value);
        },
      },
    });
    const outcome = await gateway.executeBatch([
      { callId: "m", name: "fixture_mutate", arguments: { path: "p" } },
    ]);
    assert.equal(outcome.results[0].status, "permission_required");
    assert.lengthOf(outcome.pending, 1);
    assert.deepEqual(outcome.pending[0].admissionFacts, {
      plan: { revision: 1 },
    });
    assert.equal(
      outcome.pending[0].binding.domainPlanDigest,
      "sha256:plan-one",
    );
    assert.lengthOf(recorded, 1);
    assert.equal(item.executions(), 0);
    assert.equal(item.disposals(), 1);
  });

  it("cancels an approval-bound call interrupted during preflight without publishing permission", async function () {
    const controller = new AbortController();
    const item = plannedFixture();
    const preflight = item.definition.preflight!;
    item.definition.preflight = async (args, context) => {
      const stage = await preflight(args, context);
      controller.abort();
      return stage;
    };
    let permissions = 0;
    const gateway = await turn([item.definition], {
      signal: controller.signal,
      hooks: {
        recordStarted: async () => undefined,
        recordReceipt: async () => undefined,
        recordPermission: async () => {
          permissions += 1;
        },
      },
    });
    const outcome = await gateway.executeBatch([
      { callId: "m", name: "fixture_mutate", arguments: { path: "p" } },
    ]);
    assert.equal(outcome.results[0].status, "canceled");
    assert.isEmpty(outcome.pending);
    assert.equal(permissions, 0);
    assert.equal(item.executions(), 0);
    assert.equal(item.disposals(), 1);
  });

  it("renews a changed domain plan while keeping the original source turn", async function () {
    const item = plannedFixture();
    const first = await turn([item.definition]);
    const pending = (
      await first.executeBatch([
        { callId: "m", name: "fixture_mutate", arguments: { path: "p" } },
      ])
    ).pending[0];
    assert.deepEqual(item.state.sources, ["turn-one"]);
    item.state.digest = "sha256:plan-two";
    item.state.facts = { plan: { revision: 2 } };

    const next = await turn([item.definition], { turnId: "turn-two" });
    const continuation = await next.continueCall(pending, "approve");
    assert.equal(continuation.result.status, "permission_required");
    assert.isOk(continuation.pending);
    assert.equal(continuation.pending!.binding.sourceTurnId, "turn-one");
    assert.equal(
      continuation.pending!.binding.domainPlanDigest,
      "sha256:plan-two",
    );
    assert.deepEqual(continuation.pending!.admissionFacts, {
      plan: { revision: 2 },
    });
    assert.equal(item.executions(), 0);
    assert.deepEqual(item.state.sources, ["turn-one", "turn-one"]);

    const later = await turn([item.definition], { turnId: "turn-three" });
    const approved = await later.continueCall(continuation.pending!, "approve");
    assert.equal(approved.result.status, "completed");
    assert.isUndefined(approved.pending);
    assert.equal(item.executions(), 1);
    assert.equal(new Set(item.state.sources).size, 1);
  });

  it("denies a pending call without preparing another domain stage", async function () {
    const item = plannedFixture();
    const first = await turn([item.definition]);
    const pending = (
      await first.executeBatch([
        { callId: "m", name: "fixture_mutate", arguments: { path: "p" } },
      ])
    ).pending[0];
    const denied = await turn([item.definition], { turnId: "turn-deny" });
    const outcome = await denied.continueCall(pending, "deny");
    assert.equal(outcome.result.failure?.code, "policy_denied");
    assert.isUndefined(outcome.pending);
    assert.deepEqual(item.state.sources, ["turn-one"]);
    assert.equal(item.executions(), 0);
    assert.equal(item.disposals(), 1);
  });

  it("maps structured domain preflight failures to bounded safe codes", async function () {
    const structured = await turn(
      [
        plannedFixture({
          preflight: async () => ({
            status: "failed",
            code: "domain_missing",
            retryable: true,
            details: { kind: "item" },
          }),
        }).definition,
      ],
      { policy: { authorizedKeys: ["outside"] } },
    );
    const result = (
      await structured.executeBatch([
        { callId: "m", name: "fixture_mutate", arguments: { path: "p" } },
      ])
    ).results[0];
    assert.equal(result.status, "failed");
    assert.equal(result.failure?.code, "domain_missing");
    assert.equal(result.failure?.retryable, true);
    assert.deepEqual(result.failure?.details, { kind: "item" });
    assert.equal(result.effectCertainty, "not_started");

    const malformed = await turn(
      [
        plannedFixture({
          preflight: async () =>
            ({
              status: "failed",
              code: "",
              details: { big: "x".repeat(4096) },
            }) as never,
        }).definition,
      ],
      { policy: { authorizedKeys: ["outside"] } },
    );
    const safe = (
      await malformed.executeBatch([
        { callId: "m", name: "fixture_mutate", arguments: { path: "p" } },
      ])
    ).results[0];
    assert.equal(safe.failure?.code, "execution_failed");
    assert.notProperty(safe.failure || {}, "details");
  });

  it("maps schema list bounds and oversized admission facts to resource_limited", async function () {
    const bounded = fixture({
      schema: {
        type: "object",
        properties: {
          items: { type: "array", maxItems: 1, items: { type: "string" } },
        },
        required: ["items"],
        additionalProperties: false,
      },
    });
    const gateway = await turn([bounded.definition]);
    const outcome = await gateway.executeBatch([
      { callId: "m", name: "fixture_read", arguments: { items: ["a", "b"] } },
    ]);
    assert.equal(outcome.results[0].failure?.code, "resource_limited");
    assert.equal(bounded.executions(), 0);

    const oversized = plannedFixture();
    oversized.state.facts = { plan: "x".repeat(20_000) };
    const wide = await turn([oversized.definition]);
    const limited = await wide.executeBatch([
      { callId: "m", name: "fixture_mutate", arguments: { path: "p" } },
    ]);
    assert.equal(limited.results[0].failure?.code, "resource_limited");
    assert.equal(oversized.disposals(), 1);
    assert.equal(oversized.executions(), 0);
  });

  it("disposes a rejected prepared stage instead of leaking it", async function () {
    let disposals = 0;
    const stage = (plan: Record<string, unknown>) =>
      plannedFixture({
        preflight: async () =>
          ({
            status: "prepared",
            admissionFacts: {},
            execute: async () => ({
              status: "completed",
              effectCertainty: "confirmed_complete",
              value: null,
            }),
            dispose: async () => {
              disposals += 1;
            },
            ...plan,
          }) as never,
      });
    for (const plan of [
      { domainPlanDigest: "sha256:plan", admissionFacts: { bad: () => {} } },
      { domainPlanDigest: "" },
      { domainPlanDigest: "sha256:plan", execute: 42 },
    ]) {
      const gateway = await turn([stage(plan).definition], {
        policy: { authorizedKeys: ["outside"] },
      });
      const result = (
        await gateway.executeBatch([
          { callId: "m", name: "fixture_mutate", arguments: { path: "p" } },
        ])
      ).results[0];
      assert.equal(result.failure?.code, "execution_failed");
    }
    assert.equal(disposals, 3);
  });

  it("keeps bounded recovery facts for an unknown domain outcome and receipts only the reference", async function () {
    const item = plannedFixture();
    item.state.execution = {
      status: "failed",
      effectCertainty: "unknown",
      code: "domain_unknown",
      details: { recovery: "reconcile" },
      domainReceiptRef: "domain:receipt:1",
    };
    const receipts: PiGatewayAttemptReceipt[] = [];
    const gateway = await turn([item.definition], {
      policy: { authorizedKeys: ["outside"] },
      hooks: {
        recordStarted: async () => undefined,
        recordReceipt: async (receipt) => {
          receipts.push(receipt);
        },
        recordPermission: async () => undefined,
      },
    });
    const result = (
      await gateway.executeBatch([
        { callId: "m", name: "fixture_mutate", arguments: { path: "p" } },
      ])
    ).results[0];
    assert.equal(result.status, "state_unknown");
    assert.deepEqual(result.failure?.details, { recovery: "reconcile" });
    assert.lengthOf(receipts, 1);
    assert.equal(receipts[0].domainReceiptRef, "domain:receipt:1");
    assert.notProperty(receipts[0], "details");
    assert.notProperty(receipts[0], "value");
    assert.equal(item.disposals(), 1);
  });

  it("reports cleanup pending instead of silent success when disposal fails", async function () {
    const completed = plannedFixture();
    completed.state.disposeThrows = true;
    const gateway = await turn([completed.definition], {
      policy: { authorizedKeys: ["outside"] },
    });
    const result = (
      await gateway.executeBatch([
        { callId: "m", name: "fixture_mutate", arguments: { path: "p" } },
      ])
    ).results[0];
    assert.equal(result.status, "completed");
    assert.equal(result.failure?.code, "cleanup_pending");
    assert.deepEqual(result.failure?.details, { cleanup: "pending" });
    assert.deepEqual(result.value, { ok: true });

    const deferred = plannedFixture();
    deferred.state.disposeThrows = true;
    let permissions = 0;
    const guardedTurn = await turn([deferred.definition], {
      hooks: {
        recordStarted: async () => undefined,
        recordReceipt: async () => undefined,
        recordPermission: async () => {
          permissions += 1;
        },
      },
    });
    const deferredOutcome = await guardedTurn.executeBatch([
      { callId: "m", name: "fixture_mutate", arguments: { path: "p" } },
    ]);
    const deferredResult = deferredOutcome.results[0];
    assert.equal(deferredResult.status, "failed");
    assert.equal(deferredResult.failure?.code, "cleanup_pending");
    assert.isEmpty(deferredOutcome.pending);
    assert.equal(permissions, 0);
  });

  it("admits a domain plan up to the definition result envelope, not a smaller claim bound", async function () {
    const item = plannedFixture({ maxResultBytes: 50 * 1024 });
    item.state.facts = {
      plan: {
        targets: Array.from({ length: 100 }, (_, index) => ({
          index,
          itemKey: `ITEMKEY${String(index).padStart(8, "0")}`,
          title: "t".repeat(150),
        })),
      },
    };
    const gateway = await turn([item.definition]);
    const outcome = await gateway.executeBatch([
      { callId: "m", name: "fixture_mutate", arguments: { path: "p" } },
    ]);
    assert.equal(outcome.results[0].status, "permission_required");
    assert.lengthOf(outcome.pending, 1);
    assert.equal(
      (
        outcome.pending[0].admissionFacts as {
          plan: { targets: unknown[] };
        }
      ).plan.targets.length,
      100,
    );
    assert.equal(item.disposals(), 1);
  });

  it("preserves existing recovery facts when disposal fails", async function () {
    const item = plannedFixture();
    item.state.execution = {
      status: "failed",
      effectCertainty: "unknown",
      code: "domain_unknown",
      details: [{ kind: "item" }],
    };
    item.state.disposeThrows = true;
    const gateway = await turn([item.definition], {
      policy: { authorizedKeys: ["outside"] },
    });
    const result = (
      await gateway.executeBatch([
        { callId: "m", name: "fixture_mutate", arguments: { path: "p" } },
      ])
    ).results[0];
    assert.equal(result.status, "state_unknown");
    assert.deepEqual(result.failure?.details, {
      cleanup: "pending",
      recovery: [{ kind: "item" }],
    });
  });
});
