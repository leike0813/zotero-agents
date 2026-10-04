import { assert } from "chai";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  createPiFailureCore,
  getPiFailurePolicy,
  isPiFailureCode,
  PI_FAILURE_KINDS,
} from "../../src/shared/piFailureContract";
import { PiModelStreamFailure, PiRuntime } from "../../src/modules/piRuntime";
import { createPiProviderModelSource } from "../../src/modules/piProviderExecution";
import { putPiCredential } from "../../src/modules/piCredentialStore";
import { getPref, setPref } from "../../src/utils/prefs";
import { PI_TRANSCRIPT_NON_CONTEXT_KINDS } from "../../src/modules/piTurnPreparation";
import { resetPiRuntimeAuditForTests } from "../../src/modules/piRuntimeAudit";
import { createPiOwner } from "../../src/modules/piOwnerPersistence";
import { readOwnerAudit as readOwnerAuditFile } from "./piOwnerAuditRead";
import type { PiModelSelectionSnapshot } from "../../src/shared/piProviderContract";
import {
  freezePiToolGatewayTurn,
  type PiGatewayPolicy,
  type PiGatewayToolDefinition,
  type PiGatewayTurnInput,
} from "../../src/modules/piToolGateway";
import {
  clearRuntimeLogs,
  listRuntimeLogs,
} from "../../src/modules/runtimeLogManager";

function toolFixture(overrides: Partial<PiGatewayToolDefinition> = {}) {
  return {
    capabilityId: "fixture.read",
    name: "fixture_read",
    description: "Read a fixture",
    schema: {
      type: "object",
      properties: { path: { type: "string" } },
      additionalProperties: false,
    },
    minimumEffects: [
      "bounded-read",
    ] as PiGatewayToolDefinition["minimumEffects"],
    maxResultBytes: 1024,
    classify: () => ({
      effects: ["bounded-read"],
      authorizationKeys: [],
      resourceKeys: [],
      cost: 1,
    }),
    execute: async () => ({
      status: "completed",
      effectCertainty: "not_applicable",
      value: { text: "done" },
    }),
    ...overrides,
  } satisfies PiGatewayToolDefinition;
}

const selection: PiModelSelectionSnapshot = {
  configurationId: "test-config",
  configurationLabel: "Test",
  provider: "fixture-provider",
  modelId: "fixture-model",
  authVariant: "api-key",
  credentialRef: "fixture-key",
  api: "openai-completions",
  baseUrl: "https://provider.example/v1",
  reasoning: "off",
  catalogRevision: "fixture",
  adapterVersion: "0.84.4",
  runtimeVersion: "0.84.4",
  requiresLocalNetwork: false,
  policy: {
    contextWindow: 8192,
    maxTokens: 1024,
    input: ["text"],
    supportsTools: false,
  },
};

async function turn(
  definition: PiGatewayToolDefinition,
  overrides: Partial<Omit<PiGatewayTurnInput, "policy" | "definitions">> = {},
) {
  const policy: PiGatewayPolicy = {
    mode: "interactive",
    systemAllowedEffects: ["bounded-read", "workspace-mutation"],
    authorizedEffects: ["bounded-read", "workspace-mutation"],
    authorizedKeys: [],
    maxCalls: 8,
    maxConcurrent: 3,
    maxCost: 8,
  };
  return freezePiToolGatewayTurn({
    owner: { kind: "conversation", ownerId: "owner-one" },
    turnId: "turn-one",
    definitions: [definition],
    runtimeCapability: {
      identity: "fixture-runtime",
      availableCapabilityIds: [definition.capabilityId],
    },
    audit: overrides.audit || {
      owner: { kind: "conversation", ownerId: "owner-one" },
    },
    hooks: {
      recordStarted: async () => undefined,
      recordReceipt: async () => undefined,
      recordPermission: async () => undefined,
      ...overrides.hooks,
    },
    ...overrides,
    policy,
  });
}

/** Owner evidence lives in the owner's managed workspace, not the global log. */
async function readOwnerAudit(root: string) {
  return readOwnerAuditFile(root, {
    kind: "conversation",
    ownerId: "owner-one",
  });
}

describe("Pi failure contract", function () {
  let priorCredentialJson: string;
  let root: string;
  beforeEach(async function () {
    priorCredentialJson = String(getPref("piCredentialEncryptedJson") || "");
    setPref("piCredentialEncryptedJson", "");
    root = await fs.mkdtemp(path.join(os.tmpdir(), "pi-failure-"));
  });
  afterEach(async function () {
    setPref("piCredentialEncryptedJson", priorCredentialJson);
    clearRuntimeLogs();
    await resetPiRuntimeAuditForTests();
    if (root) await fs.rm(root, { recursive: true, force: true });
  });

  async function seedCredential() {
    await putPiCredential({
      id: "fixture-key",
      label: "Fixture",
      material: { kind: "api-key", secret: "fixture-secret" },
    });
  }

  it("classifies each known code into one level, category and retryability", function () {
    assert.deepEqual(getPiFailurePolicy("provider_auth_failed"), {
      level: "error",
      category: "availability",
      retryable: true,
    });
    assert.deepEqual(getPiFailurePolicy("policy_denied"), {
      level: "warn",
      category: "policy",
      retryable: false,
    });
    assert.deepEqual(getPiFailurePolicy("persistence_failed"), {
      level: "error",
      category: "persistence",
      retryable: true,
    });
    assert.deepEqual(getPiFailurePolicy("preparation_failed"), {
      level: "error",
      category: "contract",
      retryable: false,
    });
  });

  it("classifies an unmapped code without throwing and never as info", function () {
    const unknown = getPiFailurePolicy("some_unmapped_code");
    assert.equal(unknown.level, "error");
    assert.equal(unknown.category, "execution");
  });

  it("keeps SIWC incomplete, failed, and absent terminals typed and non-retryable", function () {
    for (const code of [
      "provider_response_incomplete",
      "provider_response_failed",
      "provider_terminal_missing",
    ]) {
      assert.isTrue(isPiFailureCode(code));
      assert.isFalse(getPiFailurePolicy(code).retryable);
    }
    assert.equal(
      getPiFailurePolicy("provider_terminal_missing").category,
      "integrity",
    );
  });

  it("ignores origin so one code classifies identically everywhere", function () {
    assert.deepEqual(
      getPiFailurePolicy("execution_failed", "pi_tool_gateway"),
      getPiFailurePolicy("execution_failed", "pi_runtime"),
    );
  });

  it("builds a core without message, stack, cause or free-form detail", function () {
    const core = createPiFailureCore({
      origin: "pi_provider_execution",
      code: "provider_network_error",
      effectCertainty: "not_started",
      failureId: "failure-fixed",
      at: "2026-01-01T00:00:00.000Z",
    });
    assert.deepEqual(core, {
      failureId: "failure-fixed",
      origin: "pi_provider_execution",
      code: "provider_network_error",
      category: "availability",
      retryable: true,
      severity: "error",
      effectCertainty: "not_started",
      createdAt: "2026-01-01T00:00:00.000Z",
    });
  });

  it("guards the canonical code set for safe export classification", function () {
    assert.isTrue(isPiFailureCode("provider_auth_failed"));
    assert.isFalse(isPiFailureCode("some_unmapped_code"));
    assert.isFalse(isPiFailureCode(undefined));
    assert.isFalse(isPiFailureCode(42));
    // Prototype keys are not canonical codes.
    assert.isFalse(isPiFailureCode("toString"));
    assert.isFalse(isPiFailureCode("constructor"));
  });

  it("defaults effect certainty instead of omitting it", function () {
    const core = createPiFailureCore({
      origin: "pi_runtime",
      code: "runtime_failed",
      failureId: "failure-default",
      at: "2026-01-01T00:00:00.000Z",
    });
    assert.equal(core.effectCertainty, "not_applicable");
  });

  it("keeps effect uncertainty distinct from the failure cause category", function () {
    const base = {
      origin: "pi_tool_gateway" as const,
      code: "persistence_failed",
      failureId: "f",
      at: "2026-01-01T00:00:00.000Z",
    };
    const settled = createPiFailureCore({
      ...base,
      effectCertainty: "settled",
    });
    const unknown = createPiFailureCore({
      ...base,
      effectCertainty: "unknown",
    });
    assert.equal(settled.category, unknown.category);
    assert.notEqual(settled.effectCertainty, unknown.effectCertainty);
  });

  it("declares the canonical non-context failure fact kind", function () {
    assert.deepEqual(PI_FAILURE_KINDS, ["failure_observed"]);
  });

  it("classifies a real gateway failure through the shared policy table", async function () {
    const gateway = await turn(
      toolFixture({
        batchMode: "ordinary",
        execute: async () => {
          throw new Error("tool boom");
        },
      }),
    );
    const result = (
      await gateway.executeBatch([
        { callId: "one", name: "fixture_read", arguments: {} },
      ])
    ).results[0];
    // A throwing executor leaves effects unprovable, so the gateway settles on
    // state_unknown rather than claiming a clean failure.
    assert.equal(result.status, "state_unknown");
    assert.equal(result.failure?.code, "execution_failed");
    assert.equal(result.effectCertainty, "unknown");
    const core = createPiFailureCore({
      origin: "pi_tool_gateway",
      code: result.failure?.code || "",
      effectCertainty: "unknown",
      failureId: "failure-gateway",
      at: "2026-01-01T00:00:00.000Z",
    });
    assert.equal(
      core.category,
      getPiFailurePolicy("execution_failed").category,
    );
    assert.equal(core.severity, "error");
    // A throwing executor leaves effects unprovable; that uncertainty lives on
    // the core beside the cause, never inside the cause category.
    assert.equal(core.effectCertainty, "unknown");
  });

  for (const [status, code, retryable] of [
    [429, "provider_rate_limited", true],
    [503, "provider_unavailable", true],
    [400, "provider_http_error", true],
  ] as const) {
    it(`classifies a real provider HTTP ${status} into one code and policy`, async function () {
      await seedCredential();
      const session = new PiRuntime().openSession({
        sessionId: `http-${status}`,
        modelStream: createPiProviderModelSource(selection, {
          fetch: async () =>
            new Response("private-response fixture-secret", { status }),
        }),
      });
      const result = await session.runTurn({
        turnId: "turn",
        prompt: "hi",
        systemPrompt: "",
      }).result;
      assert.equal(result.status, "failed");
      const actual =
        result.status === "failed" ? result.failure.code : "runtime_failed";
      assert.equal(actual, code);
      const policy = getPiFailurePolicy(actual);
      assert.equal(policy.category, "availability");
      assert.equal(policy.retryable, retryable);
      // The core the owner would persist carries identity and classification
      // only; the response body never reaches it.
      const core = createPiFailureCore({
        origin: "pi_provider_execution",
        code: actual,
        failureId: "failure-provider",
        at: "2026-01-01T00:00:00.000Z",
      });
      assert.notInclude(JSON.stringify(core), "private-response");
      assert.notInclude(JSON.stringify(core), "fixture-secret");
      session.dispose();
    });
  }

  it("classifies a real provider network rejection without leaking the cause", async function () {
    await seedCredential();
    const session = new PiRuntime().openSession({
      sessionId: "session-network",
      modelStream: createPiProviderModelSource(selection, {
        fetch: async () => {
          throw new Error("private network detail");
        },
      }),
    });
    const result = await session.runTurn({
      turnId: "turn",
      prompt: "hi",
      systemPrompt: "",
    }).result;
    assert.equal(result.status, "failed");
    const code =
      result.status === "failed" ? result.failure.code : "runtime_failed";
    assert.equal(code, "provider_network_error");
    assert.equal(getPiFailurePolicy(code).category, "availability");
    assert.notInclude(JSON.stringify(result), "private network detail");
    session.dispose();
  });

  it("keeps the runtime's own model_failed classification intact", async function () {
    const session = new PiRuntime().openSession({
      sessionId: "session-failed",
      // eslint-disable-next-line require-yield -- deliberate failure before any output
      modelStream: (async function* () {
        throw new PiModelStreamFailure("provider_rate_limited");
      })(),
    });
    const result = await session.runTurn({
      turnId: "turn-failed",
      prompt: "reply",
      systemPrompt: "",
    }).result;
    assert.equal(result.status, "failed");
    const code =
      result.status === "failed" ? result.failure.code : "runtime_failed";
    // The legacy text seam deliberately collapses provider detail; the
    // contract classifies whatever code actually reaches it.
    assert.equal(code, "model_failed");
    assert.equal(getPiFailurePolicy(code).category, "execution");
    session.dispose();
  });

  it("routes gateway categories through the shared policy table", async function () {
    const cases: [string, string, boolean][] = [
      // code, expected category, expected retryable
      ["invalid_request", "input", false],
      ["policy_denied", "policy", false],
      ["capability_unavailable", "availability", true],
      ["resource_limited", "resource", true],
      ["persistence_failed", "persistence", true],
      ["owner_busy", "lifecycle", true],
      ["cleanup_pending", "resource", true],
    ];
    for (const [code, category, retryable] of cases) {
      const policy = getPiFailurePolicy(code);
      assert.equal(policy.category, category, code);
      assert.equal(policy.retryable, retryable, code);
    }
  });

  it("projects a real gateway denial through the shared policy", async function () {
    const gateway = await turn(
      toolFixture({
        classify: () => ({
          effects: ["workspace-mutation"],
          authorizationKeys: [],
          resourceKeys: [],
          cost: 1,
        }),
        minimumEffects: ["workspace-mutation"],
      }),
    );
    const result = (
      await gateway.executeBatch([
        { callId: "one", name: "fixture_read", arguments: {} },
      ])
    ).results[0];
    assert.equal(result.status, "failed");
    assert.equal(result.failure?.code, "policy_denied");
    // The gateway's own category/retryable must equal the shared policy so a
    // higher projection never disagrees with the canonical core.
    assert.equal(
      result.failure?.category,
      getPiFailurePolicy(result.failure?.code || "").category,
    );
    assert.equal(
      result.failure?.retryable,
      getPiFailurePolicy(result.failure?.code || "").retryable,
    );
  });

  it("keeps failure observations out of model history", function () {
    // A failure is a durable owner fact, never a model-visible message. If it
    // entered the preparation basis it would both move the CAS revision and
    // reach the next model call.
    assert.isTrue(PI_TRANSCRIPT_NON_CONTEXT_KINDS.has("failure_observed"));
  });
});
