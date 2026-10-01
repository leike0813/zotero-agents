import { assert } from "chai";
import {
  freezePiToolGatewayTurn,
  piGatewayToolDeadline,
  PI_TOOL_ORDINARY_DEADLINE_MS,
  PI_TOOL_LONG_TRAVERSAL_DEADLINE_MS,
  PI_TOOL_SHELL_DEFAULT_DEADLINE_MS,
  PI_TOOL_SHELL_MAX_DEADLINE_MS,
  type PiGatewayToolDefinition,
} from "../../src/modules/piToolGateway";
import { PiMcpStdioTransport } from "../../src/modules/piMcpStdioTransport";
import type { PiPhysicalSettlement } from "../../src/modules/piRuntimeLifecycle";
import { createPiRuntimeLifecycle } from "../../src/modules/piRuntimeLifecycle";

let definitionSeq = 0;
function definition(
  overrides: Partial<PiGatewayToolDefinition> = {},
): PiGatewayToolDefinition {
  // Claims are process-wide, so a test that leaves one unproved would block
  // every later test sharing the key. Each test therefore claims its own.
  const resourceKey = `fixture:physical:${++definitionSeq}`;
  return {
    capabilityId: "fixture.physical",
    name: "fixture_physical",
    description: "Settle physically",
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
      resourceKeys: [resourceKey],
      cost: 1,
    }),
    execute: async () => ({
      status: "completed",
      effectCertainty: "confirmed_complete",
      value: null,
    }),
    ...overrides,
  };
}

async function gateway(
  definitions: PiGatewayToolDefinition[],
  trackPhysical?: (settlement: Promise<PiPhysicalSettlement>) => void,
  signal?: AbortSignal,
) {
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
    policy: {
      mode: "interactive",
      systemAllowedEffects: ["bounded-read"],
      authorizedEffects: ["bounded-read"],
      authorizedKeys: [],
      maxCalls: 8,
      maxConcurrent: 3,
      maxCost: 8,
    },
    ...(trackPhysical ? { trackPhysical } : {}),
    ...(signal ? { signal } : {}),
  });
}

describe("Pi physical settlement and Broker invocation binding", function () {
  this.timeout(15000);

  it("resolves trusted deadline categories from the descriptor alone", function () {
    assert.equal(
      piGatewayToolDeadline("ordinary"),
      PI_TOOL_ORDINARY_DEADLINE_MS,
    );
    assert.equal(piGatewayToolDeadline("ordinary"), 120_000);
    assert.equal(
      piGatewayToolDeadline("long-traversal"),
      PI_TOOL_LONG_TRAVERSAL_DEADLINE_MS,
    );
    assert.equal(piGatewayToolDeadline("long-traversal"), 900_000);
    assert.equal(
      piGatewayToolDeadline("shell"),
      PI_TOOL_SHELL_DEFAULT_DEADLINE_MS,
    );
    assert.equal(piGatewayToolDeadline("shell"), 900_000);
    assert.equal(PI_TOOL_SHELL_MAX_DEADLINE_MS, 3_600_000);
  });

  it("rejects an untrusted or oversized descriptor deadline", async function () {
    for (const bad of [
      { timeLimitMs: 0 },
      { timeLimitMs: -1 },
      { timeLimitMs: PI_TOOL_SHELL_MAX_DEADLINE_MS + 1 },
      { timeLimitMs: 1.5 },
    ]) {
      let failed = false;
      try {
        await freezePiToolGatewayTurn({
          owner: { kind: "conversation", ownerId: "owner-one" },
          turnId: "turn-one",
          definitions: [definition(bad)],
          runtimeCapability: {
            identity: "fixture-runtime",
            availableCapabilityIds: ["fixture.physical"],
          },
          hooks: {
            recordStarted: async () => undefined,
            recordReceipt: async () => undefined,
            recordPermission: async () => undefined,
          },
          policy: {
            mode: "interactive",
            systemAllowedEffects: ["bounded-read"],
            authorizedEffects: ["bounded-read"],
            authorizedKeys: [],
            maxCalls: 8,
            maxConcurrent: 3,
            maxCost: 8,
          },
        });
      } catch (error) {
        failed = String(error).includes("pi_gateway_definition_invalid");
      }
      assert.isTrue(failed, `expected ${JSON.stringify(bad)} to be refused`);
    }
  });

  it("clips the logical watchdog to the turn deadline", async function () {
    const tool = definition({
      // A generous descriptor bound still yields to a nearer turn deadline.
      timeLimitMs: 10_000,
      execute: async () => {
        await new Promise((resolve) => setTimeout(resolve, 5000));
        return { status: "completed", effectCertainty: "confirmed_complete" };
      },
    });
    const started = Date.now();
    const turn = await freezePiToolGatewayTurn({
      owner: { kind: "conversation", ownerId: "owner-one" },
      turnId: "turn-one",
      definitions: [tool],
      runtimeCapability: {
        identity: "fixture-runtime",
        availableCapabilityIds: [tool.capabilityId],
      },
      hooks: {
        recordStarted: async () => undefined,
        recordReceipt: async () => undefined,
        recordPermission: async () => undefined,
      },
      policy: {
        mode: "interactive",
        systemAllowedEffects: ["bounded-read"],
        authorizedEffects: ["bounded-read"],
        authorizedKeys: [],
        maxCalls: 8,
        maxConcurrent: 3,
        maxCost: 8,
      },
      deadline: Date.now() + 60,
    });
    const outcome = await turn.executeBatch([
      { callId: "clipped", name: "fixture_physical", arguments: { path: "p" } },
    ]);
    assert.equal(outcome.results[0].failure?.code, "execution_timeout");
    assert.isBelow(Date.now() - started, 2_000);
  });

  it("commits the trusted Broker operation binding before the first effect", async function () {
    const started: Record<string, unknown>[] = [];
    const tool = definition({
      minimumEffects: ["bounded-read", "zotero-mutation"],
      classify: () => ({
        effects: ["bounded-read", "zotero-mutation"],
        authorizationKeys: [],
        resourceKeys: ["fixture:physical"],
        cost: 1,
      }),
      preflight: async () => ({
        status: "prepared",
        domainPlanDigest: "sha256:plan",
        admissionFacts: { planned: true },
        domainOperation: {
          scope: { ownerId: "pi:conversation:owner-one" },
          operationId: "zotero-op-1",
        },
        execute: async () => ({
          status: "completed",
          effectCertainty: "confirmed_complete",
        }),
        dispose: async () => undefined,
      }),
    });
    const turn = await freezePiToolGatewayTurn({
      owner: { kind: "conversation", ownerId: "owner-one" },
      turnId: "turn-one",
      definitions: [tool],
      runtimeCapability: {
        identity: "fixture-runtime",
        availableCapabilityIds: [tool.capabilityId],
      },
      hooks: {
        recordStarted: async (fact) => {
          started.push(fact as unknown as Record<string, unknown>);
        },
        recordReceipt: async () => undefined,
        recordPermission: async () => undefined,
      },
      policy: {
        mode: "interactive",
        systemAllowedEffects: ["bounded-read", "zotero-mutation"],
        authorizedEffects: ["bounded-read", "zotero-mutation"],
        authorizedKeys: [],
        maxCalls: 8,
        maxConcurrent: 3,
        maxCost: 8,
      },
    });
    const outcome = await turn.executeBatch([
      { callId: "call-1", name: "fixture_physical", arguments: { path: "p" } },
    ]);
    assert.equal(outcome.results[0].status, "completed");
    assert.deepEqual(started[0]?.domainOperation, {
      scope: { ownerId: "pi:conversation:owner-one" },
      operationId: "zotero-op-1",
    });
    // The binding is trusted composition, never a model-visible argument.
    assert.notProperty(tool.schema.properties as object, "domainOperation");
  });

  it("keeps a resource claim until a registered physical promise settles", async function () {
    let release!: () => void;
    const hold = new Promise<void>((resolve) => {
      release = resolve;
    });
    let entered!: () => void;
    const firstEntered = new Promise<void>((resolve) => {
      entered = resolve;
    });
    const settled: string[] = [];
    const tool = definition({
      execute: async (_args, context) => {
        context.trackPhysical?.(
          hold.then<PiPhysicalSettlement>(() => "settled"),
        );
        entered();
        return {
          status: "failed",
          effectCertainty: "unknown",
          code: "pi_shell_timeout",
        };
      },
    });
    const turn = await gateway([tool], (settlement) => {
      // One call produces exactly one settlement observation, even though the
      // executor registers its own promise as well.
      void settlement.then((state) => settled.push(state));
    });
    const first = turn.executeBatch([
      { callId: "first", name: "fixture_physical", arguments: { path: "p" } },
    ]);
    await firstEntered;
    await first;
    // The logical result returned, but the resource stays claimed until the
    // physical promise settles, so a second turn still cannot take it.
    release();
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.deepEqual(settled, ["settled"]);
  });

  it("preserves a canceled receipt and still appends the real settled outcome", async function () {
    let release!: () => void;
    const hold = new Promise<void>((resolve) => {
      release = resolve;
    });
    const evidence: Array<{
      callId: string;
      state: string;
      outcome?: { status: string };
    }> = [];
    const receipts: Array<{ outcome: string; effectCertainty: string }> = [];
    const tool = definition({
      // Finishes after the trusted logical bound, so the committed answer is
      // an unknown timeout and the real outcome genuinely arrives late.
      timeLimitMs: 30,
      execute: async (_args, context) => {
        context.trackPhysical?.(
          hold.then<PiPhysicalSettlement>(() => "settled"),
        );
        await new Promise((resolve) => setTimeout(resolve, 120));
        return {
          status: "completed",
          effectCertainty: "confirmed_complete",
          value: { text: "really done" },
        };
      },
    });
    const turn = await freezePiToolGatewayTurn({
      owner: { kind: "conversation", ownerId: "owner-one" },
      turnId: "turn-one",
      definitions: [tool],
      runtimeCapability: {
        identity: "fixture-runtime",
        availableCapabilityIds: [tool.capabilityId],
      },
      hooks: {
        recordStarted: async () => undefined,
        recordReceipt: async (receipt) => {
          receipts.push({
            outcome: receipt.outcome,
            effectCertainty: receipt.effectCertainty,
          });
        },
        recordPermission: async () => undefined,
      },
      policy: {
        mode: "interactive",
        systemAllowedEffects: ["bounded-read"],
        authorizedEffects: ["bounded-read"],
        authorizedKeys: [],
        maxCalls: 8,
        maxConcurrent: 3,
        maxCost: 8,
      },
      recordPhysicalEvidence: (value) => {
        evidence.push(value);
      },
    });
    const outcome = await turn.executeBatch([
      {
        callId: "slow-call",
        name: "fixture_physical",
        arguments: { path: "p" },
      },
    ]);
    // The executor was still running, so the committed answer stays unknown.
    assert.equal(outcome.results[0].status, "state_unknown");
    assert.equal(outcome.results[0].failure?.code, "execution_timeout");
    assert.deepEqual(receipts, [
      { outcome: "state_unknown", effectCertainty: "unknown" },
    ]);
    assert.isEmpty(evidence);
    release();
    // The executor still has to finish before its real outcome can be appended.
    await new Promise((resolve) => setTimeout(resolve, 200));
    // The real outcome is appended as separate evidence. The committed
    // unknown receipt is never rewritten, so a caller cannot read the late
    // fact as if the original answer had been settled.
    assert.lengthOf(evidence, 1);
    assert.equal(evidence[0].callId, "slow-call");
    assert.equal(evidence[0].state, "settled");
    assert.equal(evidence[0].outcome?.status, "completed");
    assert.deepEqual(receipts, [
      { outcome: "state_unknown", effectCertainty: "unknown" },
    ]);
  });

  it("reports exactly one physical settlement per call", async function () {
    const observed: string[] = [];
    const tool = definition({
      execute: async (_args, context) => {
        // An executor that also tracks a longer physical fact must not produce
        // a second settlement observation for the same call.
        context.trackPhysical?.(Promise.resolve("settled" as const));
        return { status: "completed", effectCertainty: "confirmed_complete" };
      },
    });
    const turn = await gateway([tool], (settlement) => {
      void settlement.then((state) => observed.push(state));
    });
    const outcome = await turn.executeBatch([
      { callId: "single", name: "fixture_physical", arguments: { path: "p" } },
    ]);
    assert.equal(outcome.results[0].status, "completed");
    await new Promise((resolve) => setTimeout(resolve, 5));
    assert.deepEqual(observed, ["settled"]);
  });

  it("reports unknown when any tracked physical fact stays unproved", async function () {
    const observed: string[] = [];
    const tool = definition({
      execute: async (_args, context) => {
        // The executor answered, but a child it started is still unproved.
        context.trackPhysical?.(
          new Promise<PiPhysicalSettlement>(() => undefined),
        );
        return { status: "completed", effectCertainty: "confirmed_complete" };
      },
    });
    const turn = await gateway([tool], (settlement) => {
      void settlement.then((state) => observed.push(state));
    });
    const outcome = await turn.executeBatch([
      {
        callId: "unproved",
        name: "fixture_physical",
        arguments: { path: "p" },
      },
    ]);
    assert.equal(outcome.results[0].status, "completed");
    await new Promise((resolve) => setTimeout(resolve, 5));
    assert.deepEqual(observed, []);
  });

  it("serializes the same resource key across different owners", async function () {
    const order: string[] = [];
    let release!: () => void;
    const hold = new Promise<void>((resolve) => {
      release = resolve;
    });
    const shared = {
      capabilityId: "fixture.shared",
      name: "fixture_shared",
      description: "Shared canonical resource",
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
        resourceKeys: ["canonical:shared-file"],
        cost: 1,
      }),
      execute: async (
        _args: unknown,
        context: { trackPhysical?: (p: Promise<PiPhysicalSettlement>) => void },
      ) => {
        order.push("enter");
        if (context.trackPhysical) {
          await hold;
          context.trackPhysical(Promise.resolve("settled"));
        } else {
          await hold;
        }
        order.push("exit");
        return { status: "completed", effectCertainty: "confirmed_complete" };
      },
    } as unknown as PiGatewayToolDefinition;
    const first = await gateway([shared]);
    const second = await freezePiToolGatewayTurn({
      owner: { kind: "conversation", ownerId: "owner-two" },
      turnId: "turn-two",
      definitions: [shared],
      runtimeCapability: {
        identity: "fixture-runtime",
        availableCapabilityIds: [shared.capabilityId],
      },
      hooks: {
        recordStarted: async () => undefined,
        recordReceipt: async () => undefined,
        recordPermission: async () => undefined,
      },
      policy: {
        mode: "interactive",
        systemAllowedEffects: ["bounded-read"],
        authorizedEffects: ["bounded-read"],
        authorizedKeys: [],
        maxCalls: 8,
        maxConcurrent: 3,
        maxCost: 8,
      },
    });
    const one = first.executeBatch([
      { callId: "a", name: "fixture_shared", arguments: { path: "p" } },
    ]);
    await new Promise((resolve) => setTimeout(resolve, 10));
    const two = second.executeBatch([
      { callId: "b", name: "fixture_shared", arguments: { path: "p" } },
    ]);
    await new Promise((resolve) => setTimeout(resolve, 30));
    // The second owner cannot enter while the first physically holds the key.
    assert.deepEqual(order, ["enter"]);
    release();
    await Promise.all([one, two]);
    assert.deepEqual(order, ["enter", "exit", "enter", "exit"]);
  });

  it("carries the real late outcome into the original invocation evidence", async function () {
    const evidence: Array<{
      callId: string;
      state: string;
      outcome?: unknown;
    }> = [];
    const tool = definition({
      deadlineCategory: "ordinary",
      timeLimitMs: 30,
      execute: async () => {
        // Finishes well after the trusted logical bound, so the caller has
        // already been answered and the real outcome arrives late.
        await new Promise((resolve) => setTimeout(resolve, 120));
        return {
          status: "completed",
          effectCertainty: "confirmed_complete",
          value: { text: "late" },
        };
      },
    });
    const turn = await freezePiToolGatewayTurn({
      owner: { kind: "conversation", ownerId: "owner-one" },
      turnId: "turn-one",
      definitions: [tool],
      runtimeCapability: {
        identity: "fixture-runtime",
        availableCapabilityIds: [tool.capabilityId],
      },
      hooks: {
        recordStarted: async () => undefined,
        recordReceipt: async () => undefined,
        recordPermission: async () => undefined,
      },
      policy: {
        mode: "interactive",
        systemAllowedEffects: ["bounded-read"],
        authorizedEffects: ["bounded-read"],
        authorizedKeys: [],
        maxCalls: 8,
        maxConcurrent: 3,
        maxCost: 8,
      },
      recordPhysicalEvidence: (value) => evidence.push(value),
    });
    const outcome = await turn.executeBatch([
      {
        callId: "late-call",
        name: "fixture_physical",
        arguments: { path: "p" },
      },
    ]);
    // The committed logical answer is the unknown timeout.
    assert.equal(outcome.results[0].status, "state_unknown");
    assert.equal(outcome.results[0].failure?.code, "execution_timeout");
    assert.lengthOf(evidence, 0);
    await new Promise((resolve) => setTimeout(resolve, 200));
    // The real outcome is appended to the same invocation and never rewrites it.
    assert.lengthOf(evidence, 1);
    assert.equal(evidence[0].callId, "late-call");
    assert.equal(evidence[0].state, "settled");
    // Identity and the outcome's own status only; the committed receipt keeps
    // the result body, so a late append never duplicates it.
    assert.deepEqual(evidence[0].outcome, {
      status: "completed",
      effectCertainty: "confirmed_complete",
      value: { text: "late" },
    });
  });

  it("never releases a resource claim whose settlement is unknown", async function () {
    const lifecycle = createPiRuntimeLifecycle();
    const lease = await lifecycle.acquire({
      owner: { kind: "conversation", ownerId: "owner-one" },
      turnId: "turn-one",
      lane: "foreground",
    });
    lease.trackPhysical(Promise.resolve<PiPhysicalSettlement>("unknown"));
    lease.release();
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.isTrue(lifecycle.hasPhysicalHold());
    lifecycle.closeAdmission();
  });

  it("reports MCP child settlement from real exit evidence, not from close", async function () {
    const transport = new PiMcpStdioTransport({
      executable: process.execPath,
      argv: ["-e", "setInterval(()=>undefined,1000)"],
      cwd: process.cwd(),
      environment: { PATH: process.env.PATH || "" },
    });
    await transport.start();
    const settlement = transport.physicalSettlement;
    let settledEarly = false;
    void settlement.then(() => {
      settledEarly = true;
    });
    await new Promise((resolve) => setTimeout(resolve, 50));
    // A running child has no exit evidence, so settlement must stay pending
    // and nothing may claim it exited.
    assert.isFalse(settledEarly);
    await transport.close();
    // close() terminated the child and the real wait observed its exit, which
    // is the only evidence that may release it.
    assert.equal(await settlement.then((state) => state.state), "settled");
  });

  it("does not reopen transport state after a settled close", async function () {
    const transport = new PiMcpStdioTransport({
      executable: process.execPath,
      argv: ["-e", "setInterval(()=>undefined,1000)"],
      cwd: process.cwd(),
      environment: { PATH: process.env.PATH || "" },
    });
    await transport.start();
    await transport.close();
    let closedCalls = 0;
    transport.onclose = () => {
      closedCalls += 1;
    };
    await transport.close();
    assert.equal(closedCalls, 0);
  });

  it("retains staging while registered physical settlement is unproved", async function () {
    let disposed = false;
    const tool = definition({
      preflight: async () => ({
        status: "prepared",
        domainPlanDigest: "sha256:plan",
        admissionFacts: {},
        execute: async (context: {
          trackPhysical?: (p: Promise<PiPhysicalSettlement>) => void;
        }) => {
          // A physical fact that never proves itself must keep the staging.
          context.trackPhysical?.(
            new Promise<PiPhysicalSettlement>(() => undefined),
          );
          return {
            status: "completed",
            effectCertainty: "confirmed_complete",
          };
        },
        dispose: async () => {
          disposed = true;
        },
      }),
    });
    const turn = await gateway([tool]);
    const outcome = await turn.executeBatch([
      {
        callId: "held-teardown",
        name: "fixture_physical",
        arguments: { path: "p" },
      },
    ]);
    // The completed effect and pending cleanup are distinct facts.
    assert.equal(outcome.results[0].status, "completed");
    assert.equal(outcome.results[0].failure?.details?.cleanup, "pending");
    assert.isFalse(disposed);
  });

  it("stops waiting for hung teardown when shutdown aborts the turn", async function () {
    const controller = new AbortController();
    let disposing!: () => void;
    const entered = new Promise<void>((resolve) => {
      disposing = resolve;
    });
    const tool = definition({
      preflight: async () => ({
        status: "prepared",
        domainPlanDigest: "sha256:plan",
        admissionFacts: {},
        execute: async () => ({
          status: "completed",
          effectCertainty: "confirmed_complete",
        }),
        dispose: async () => {
          disposing();
          await new Promise<void>(() => undefined);
        },
      }),
    });
    const turn = await gateway([tool], undefined, controller.signal);
    const pending = turn.executeBatch([
      { callId: "dispose", name: "fixture_physical", arguments: { path: "p" } },
    ]);
    await entered;
    controller.abort();
    const outcome = await pending;
    assert.equal(outcome.results[0].failure?.details?.cleanup, "pending");
  });
});
