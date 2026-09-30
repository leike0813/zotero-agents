import Ajv2020, { type ValidateFunction } from "ajv/dist/2020";
import type { JsonValue } from "../workflows/types";
import { assertWorkflowHostStrictJsonValue } from "../workflows/workflowHostErrorContract";
import { sha256PrefixedHex } from "../utils/sha256";
import { resolveNativeAbortControllerConstructor } from "../utils/wait";

import type { PiGatewayEffect } from "../shared/piToolGatewayContract";
export type { PiGatewayEffect } from "../shared/piToolGatewayContract";

export type PiGatewayCertainty =
  | "not_applicable"
  | "not_started"
  | "confirmed_none"
  | "confirmed_complete"
  | "confirmed_partial"
  | "unknown";

export type PiGatewayClassification = {
  effects: PiGatewayEffect[];
  authorizationKeys: string[];
  resourceKeys: string[];
  cost: number;
  safeRefs?: string[];
};

export type PiGatewayExecution = {
  status: "completed" | "failed" | "canceled";
  effectCertainty: PiGatewayCertainty;
  value?: JsonValue;
  code?: string;
  retryable?: boolean;
  details?: JsonValue;
  domainReceiptRef?: string;
};

export type PiGatewayPreflightContext = {
  signal: AbortSignal;
  onUpdate: (update: JsonValue) => void;
  callId?: string;
};

export type PiGatewayPreflight =
  | {
      status: "prepared";
      domainPlanDigest: string;
      admissionFacts: JsonValue;
      execute(context: PiGatewayPreflightContext): Promise<PiGatewayExecution>;
      dispose(): Promise<void>;
    }
  | {
      status: "failed";
      code: string;
      retryable?: boolean;
      details?: JsonValue;
    };

export type PiGatewayToolDefinition = {
  capabilityId: string;
  name: string;
  description: string;
  schema: Record<string, unknown>;
  minimumEffects: PiGatewayEffect[];
  maxResultBytes: number;
  identityDigest?: string;
  batchMode?: "ordinary" | "exclusive" | "deferred";
  classify(
    args: JsonValue,
  ): PiGatewayClassification | Promise<PiGatewayClassification>;
  preflight?(
    args: JsonValue,
    context: {
      owner: PiGatewayAttemptReceipt["owner"];
      turnId: string;
      sourceTurnId: string;
      callId: string;
      signal: AbortSignal;
    },
  ): Promise<PiGatewayPreflight>;
  execute(
    args: JsonValue,
    context: {
      signal: AbortSignal;
      onUpdate: (update: JsonValue) => void;
      callId?: string;
    },
  ): Promise<PiGatewayExecution>;
};

export type PiGatewayCall = {
  callId: string;
  name: string;
  arguments: JsonValue;
};

export type PiGatewayFailure = {
  origin: "tool_gateway";
  category:
    | "input"
    | "policy"
    | "availability"
    | "resource"
    | "persistence"
    | "execution"
    | "lifecycle";
  code: string;
  retryable: boolean;
  details?: JsonValue;
};

export type PiGatewayCallResult = {
  callId: string;
  name: string;
  status:
    | "completed"
    | "failed"
    | "permission_required"
    | "state_unknown"
    | "canceled";
  effectCertainty: PiGatewayCertainty;
  value?: JsonValue;
  failure?: PiGatewayFailure;
};

export type PiGatewayAttemptReceipt = {
  owner: { kind: "conversation" | "skill_run"; ownerId: string };
  turnId: string;
  callId: string;
  capabilityId: string;
  name: string;
  catalogDigest: string;
  descriptorDigest: string;
  argumentDigest: string;
  effects: PiGatewayEffect[];
  safeRefs: string[];
  startedAt: string;
  completedAt: string;
  outcome: PiGatewayCallResult["status"];
  effectCertainty: PiGatewayCertainty;
  domainReceiptRef?: string;
};

export type PiGatewayStartedFact = Omit<
  PiGatewayAttemptReceipt,
  "completedAt" | "outcome" | "effectCertainty" | "domainReceiptRef"
>;

export type PiGatewayPolicy = {
  mode: "interactive" | "automatic";
  systemAllowedEffects: PiGatewayEffect[];
  authorizedEffects: PiGatewayEffect[];
  authorizedKeys: string[];
  maxCalls: number;
  maxConcurrent: number;
  maxCost: number;
};

export type PiGatewayPendingCall = {
  call: PiGatewayCall;
  admissionFacts?: JsonValue;
  binding: {
    owner: PiGatewayAttemptReceipt["owner"];
    sourceTurnId: string;
    callId: string;
    name: string;
    argumentDigest: string;
    catalogDigest: string;
    descriptorDigest: string;
    envelopeDigest: string;
    runtimeCapabilityDigest: string;
    domainPlanDigest?: string;
  };
};

export type PiGatewayTurnInput = {
  owner: PiGatewayAttemptReceipt["owner"];
  turnId: string;
  hiddenCatalogDigest?: string;
  definitions: PiGatewayToolDefinition[];
  policy: PiGatewayPolicy;
  runtimeCapability: { identity: string; availableCapabilityIds: string[] };
  hooks: {
    recordStarted: (fact: PiGatewayStartedFact) => Promise<void>;
    recordReceipt: (receipt: PiGatewayAttemptReceipt) => Promise<void>;
    recordPermission: (pending: PiGatewayPendingCall) => Promise<void>;
  };
  signal?: AbortSignal;
  onUpdate?: (callId: string, update: JsonValue) => void;
};

export type PiGatewayTurn = {
  catalog: {
    digest: string;
    tools: readonly {
      capabilityId: string;
      name: string;
      description: string;
      schema: Record<string, unknown>;
    }[];
  };
  executeBatch(calls: PiGatewayCall[]): Promise<{
    results: PiGatewayCallResult[];
    pending: PiGatewayPendingCall[];
  }>;
  continueCall(
    pending: PiGatewayPendingCall,
    decision: "approve" | "deny",
  ): Promise<{ result: PiGatewayCallResult; pending?: PiGatewayPendingCall }>;
};

type FrozenDefinition = PiGatewayToolDefinition & {
  descriptorDigest: string;
  validate: ValidateFunction;
};
type PreparedPlan = {
  domainPlanDigest: string;
  admissionFacts: JsonValue;
  execute(context: PiGatewayPreflightContext): Promise<PiGatewayExecution>;
  dispose(): Promise<void>;
};
type PreparedCall = {
  call: PiGatewayCall;
  definition: FrozenDefinition;
  claims: PiGatewayClassification;
  argumentDigest: string;
  authorization: "ready" | "permission";
  plan?: PreparedPlan;
};

const EFFECTS = new Set<PiGatewayEffect>([
  "bounded-read",
  "workspace-mutation",
  "code-execution",
  "external-egress",
  "external-mutation",
  "local-network",
  "zotero-mutation",
  "host-control",
  "forbidden",
]);
const CERTAINTIES = new Set<PiGatewayCertainty>([
  "not_applicable",
  "not_started",
  "confirmed_none",
  "confirmed_complete",
  "confirmed_partial",
  "unknown",
]);
const utf8 = new TextEncoder();
const MAX_RESULT_BYTES = 1024 * 1024;
const MAX_ARGUMENT_BYTES = 512 * 1024;
const MAX_CLAIM_BYTES = 16 * 1024;

function canonical(value: JsonValue): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value !== null && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

async function digest(value: JsonValue) {
  const result = await sha256PrefixedHex(utf8.encode(canonical(value)));
  if (!result) throw new Error("pi_gateway_hash_unavailable");
  return result;
}

function copyJson<T extends JsonValue>(value: T): T {
  assertWorkflowHostStrictJsonValue(value);
  return JSON.parse(canonical(value)) as T;
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object") {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

function failure(code: string): PiGatewayFailure {
  const category =
    code === "invalid_request"
      ? "input"
      : code === "policy_denied"
        ? "policy"
        : code === "capability_unavailable"
          ? "availability"
          : code === "resource_limited"
            ? "resource"
            : code === "persistence_failed"
              ? "persistence"
              : code === "owner_busy"
                ? "lifecycle"
                : code === "cleanup_pending"
                  ? "resource"
                  : "execution";
  return {
    origin: "tool_gateway",
    category,
    code,
    retryable: code === "persistence_failed" || code === "owner_busy",
  };
}

function fail(
  call: PiGatewayCall | null | undefined,
  code: string,
): PiGatewayCallResult {
  return {
    callId: call?.callId || "",
    name: call?.name || "",
    status: "failed",
    effectCertainty: "not_started",
    failure: failure(code),
  };
}

function canceled(call: PiGatewayCall): PiGatewayCallResult {
  return {
    callId: call.callId,
    name: call.name,
    status: "canceled",
    effectCertainty: "not_started",
  };
}

export async function freezePiToolGatewayTurn(
  input: PiGatewayTurnInput,
): Promise<PiGatewayTurn> {
  if (
    !input.owner ||
    !["conversation", "skill_run"].includes(input.owner.kind) ||
    typeof input.owner.ownerId !== "string" ||
    !input.owner.ownerId ||
    input.owner.ownerId.length > 128 ||
    typeof input.turnId !== "string" ||
    !input.turnId ||
    input.turnId.length > 128
  )
    throw new Error("pi_gateway_identity_invalid");
  for (const limit of [
    input.policy.maxCalls,
    input.policy.maxConcurrent,
    input.policy.maxCost,
  ]) {
    if (!Number.isSafeInteger(limit) || limit < 1)
      throw new Error("pi_gateway_limit_invalid");
  }
  const ajv = new Ajv2020({ allErrors: true, strict: false, logger: false });
  const names = new Set<string>();
  const capabilities = new Set<string>();
  const frozen: FrozenDefinition[] = [];
  for (const definition of input.definitions) {
    if (
      typeof definition.name !== "string" ||
      !definition.name ||
      definition.name.length > 128 ||
      typeof definition.capabilityId !== "string" ||
      !definition.capabilityId ||
      definition.capabilityId.length > 128 ||
      typeof definition.description !== "string" ||
      !definition.description ||
      definition.description.length > 4096 ||
      names.has(definition.name) ||
      capabilities.has(definition.capabilityId) ||
      !Number.isSafeInteger(definition.maxResultBytes) ||
      definition.maxResultBytes < 1 ||
      definition.maxResultBytes > MAX_RESULT_BYTES ||
      !Array.isArray(definition.minimumEffects) ||
      !definition.minimumEffects.length ||
      definition.minimumEffects.some((effect) => !EFFECTS.has(effect)) ||
      (definition.batchMode !== undefined &&
        !["ordinary", "exclusive", "deferred"].includes(
          definition.batchMode,
        )) ||
      typeof definition.classify !== "function" ||
      (definition.preflight !== undefined &&
        typeof definition.preflight !== "function") ||
      typeof definition.execute !== "function"
    )
      throw new Error("pi_gateway_definition_invalid");
    names.add(definition.name);
    capabilities.add(definition.capabilityId);
    const schema = copyJson(definition.schema as JsonValue) as Record<
      string,
      unknown
    >;
    let validate: ValidateFunction;
    try {
      validate = ajv.compile(schema);
    } catch {
      throw new Error("pi_gateway_schema_invalid");
    }
    const descriptorDigest = await digest({
      capabilityId: definition.capabilityId,
      name: definition.name,
      description: definition.description,
      schema: schema as JsonValue,
      minimumEffects: [...definition.minimumEffects].sort(),
      maxResultBytes: definition.maxResultBytes,
      batchMode: definition.batchMode || "ordinary",
      ...(definition.identityDigest
        ? { identityDigest: definition.identityDigest }
        : {}),
    });
    frozen.push({
      ...definition,
      schema,
      minimumEffects: [...definition.minimumEffects],
      descriptorDigest,
      validate,
    });
  }
  if (
    !input.runtimeCapability ||
    typeof input.runtimeCapability.identity !== "string" ||
    !input.runtimeCapability.identity ||
    input.runtimeCapability.identity.length > 256 ||
    !Array.isArray(input.runtimeCapability.availableCapabilityIds) ||
    input.runtimeCapability.availableCapabilityIds.some(
      (id) => typeof id !== "string" || !id || id.length > 128,
    )
  ) {
    throw new Error("pi_gateway_capability_invalid");
  }
  const available = new Set(input.runtimeCapability.availableCapabilityIds);
  const visible = frozen.filter((definition) =>
    available.has(definition.capabilityId),
  );
  const policy = copyJson(
    input.policy as unknown as JsonValue,
  ) as unknown as PiGatewayPolicy;
  if (policy.mode !== "interactive" && policy.mode !== "automatic") {
    throw new Error("pi_gateway_policy_invalid");
  }
  if (
    !Array.isArray(policy.systemAllowedEffects) ||
    !Array.isArray(policy.authorizedEffects) ||
    !Array.isArray(policy.authorizedKeys) ||
    [...policy.systemAllowedEffects, ...policy.authorizedEffects].some(
      (effect) => !EFFECTS.has(effect),
    ) ||
    policy.authorizedKeys.some((key) => typeof key !== "string" || !key)
  ) {
    throw new Error("pi_gateway_policy_invalid");
  }
  const tools = deepFreeze(
    visible.map(({ capabilityId, name, description, schema }) => ({
      capabilityId,
      name,
      description,
      schema,
    })),
  );
  if (
    input.hiddenCatalogDigest !== undefined &&
    (typeof input.hiddenCatalogDigest !== "string" ||
      !/^sha256:[a-f0-9]+$/i.test(input.hiddenCatalogDigest))
  )
    throw new Error("pi_gateway_catalog_identity_invalid");
  const catalogDigest = await digest({
    definitions: visible.map(({ descriptorDigest }) => descriptorDigest),
    hiddenCatalogDigest: input.hiddenCatalogDigest || null,
  });
  const catalog = Object.freeze({ digest: catalogDigest, tools });
  const envelopeDigest = await digest(policy as unknown as JsonValue);
  const runtimeCapabilityDigest = await digest({
    identity: input.runtimeCapability.identity,
    availableCapabilityIds: [...available].sort(),
  });
  const owner = Object.freeze({ ...input.owner });
  const hooks = { ...input.hooks };
  const usedCallIds = new Set<string>();
  const AbortControllerCtor = resolveNativeAbortControllerConstructor();
  if (!input.signal && !AbortControllerCtor)
    throw new Error("pi_gateway_signal_unavailable");
  const signal = input.signal || new AbortControllerCtor!().signal;

  async function classify(definition: FrozenDefinition, args: JsonValue) {
    try {
      const claims = await definition.classify(args);
      if (
        !claims ||
        !Array.isArray(claims.effects) ||
        !Array.isArray(claims.authorizationKeys) ||
        !Array.isArray(claims.resourceKeys) ||
        !Number.isSafeInteger(claims.cost) ||
        claims.cost < 1 ||
        claims.effects.some((effect) => !EFFECTS.has(effect)) ||
        definition.minimumEffects.some(
          (effect) => !claims.effects.includes(effect),
        ) ||
        (claims.effects.includes("workspace-mutation") &&
          !claims.resourceKeys.length) ||
        [...claims.authorizationKeys, ...claims.resourceKeys].some(
          (key) => typeof key !== "string" || !key,
        ) ||
        (claims.safeRefs !== undefined &&
          (!Array.isArray(claims.safeRefs) ||
            claims.safeRefs.length > 32 ||
            claims.safeRefs.some((ref) => typeof ref !== "string"))) ||
        claims.authorizationKeys.length > 64 ||
        claims.resourceKeys.length > 64 ||
        utf8.encode(canonical(claims as unknown as JsonValue)).byteLength >
          MAX_CLAIM_BYTES
      )
        return null;
      return deepFreeze(
        copyJson(claims as unknown as JsonValue),
      ) as PiGatewayClassification;
    } catch {
      return null;
    }
  }

  async function prepare(
    call: PiGatewayCall,
  ): Promise<PreparedCall | PiGatewayCallResult> {
    if (
      !call ||
      typeof call.callId !== "string" ||
      !call.callId ||
      call.callId.length > 128 ||
      typeof call.name !== "string" ||
      !call.name ||
      call.name.length > 128
    ) {
      return fail(
        call || { callId: "", name: "", arguments: null },
        "invalid_request",
      );
    }
    const definition = visible.find((item) => item.name === call.name);
    if (!definition) return fail(call, "capability_unavailable");
    try {
      assertWorkflowHostStrictJsonValue(call.arguments);
    } catch {
      return fail(call, "invalid_request");
    }
    if (!definition.validate(call.arguments))
      return fail(
        call,
        definition.validate.errors?.some(
          (error) => error.keyword === "maxItems",
        )
          ? "resource_limited"
          : "invalid_request",
      );
    const args = deepFreeze(copyJson(call.arguments));
    if (utf8.encode(canonical(args)).byteLength > MAX_ARGUMENT_BYTES) {
      return fail(call, "resource_limited");
    }
    const claims = await classify(definition, args);
    if (
      !claims ||
      claims.effects.includes("forbidden") ||
      claims.effects.some(
        (effect) => !policy.systemAllowedEffects.includes(effect),
      )
    ) {
      return fail(call, "policy_denied");
    }
    const authorized =
      claims.effects.every((effect) =>
        policy.authorizedEffects.includes(effect),
      ) &&
      claims.authorizationKeys.every((key) =>
        policy.authorizedKeys.includes(key),
      );
    if (!authorized && policy.mode === "automatic")
      return fail(call, "policy_denied");
    return {
      call: { callId: call.callId, name: call.name, arguments: args },
      definition,
      claims,
      argumentDigest: await digest(args),
      authorization: authorized ? "ready" : "permission",
    };
  }

  function cleanupPendingResult(
    result: PiGatewayCallResult,
  ): PiGatewayCallResult {
    const existing = result.failure;
    const prior = existing?.details;
    const details: JsonValue =
      prior !== undefined &&
      prior !== null &&
      typeof prior === "object" &&
      !Array.isArray(prior)
        ? { ...(prior as Record<string, JsonValue>), cleanup: "pending" }
        : prior === undefined
          ? { cleanup: "pending" }
          : { cleanup: "pending", recovery: prior };
    return {
      ...result,
      failure: { ...(existing ?? failure("cleanup_pending")), details },
    };
  }

  async function disposePrepared(
    prepared: PreparedCall,
    result: PiGatewayCallResult,
  ): Promise<PiGatewayCallResult> {
    const plan = prepared.plan;
    if (!plan) return result;
    prepared.plan = undefined;
    try {
      await plan.dispose();
      return result;
    } catch {
      return cleanupPendingResult(result);
    }
  }

  async function preflightCall(
    prepared: PreparedCall,
    sourceTurnId: string,
  ): Promise<PiGatewayCallResult | null> {
    const { call, definition } = prepared;
    if (typeof definition.preflight !== "function") return null;
    let outcome: PiGatewayPreflight;
    try {
      outcome = await definition.preflight(call.arguments, {
        owner: { ...owner },
        turnId: input.turnId,
        sourceTurnId,
        callId: call.callId,
        signal,
      });
    } catch {
      return fail(call, "execution_failed");
    }
    if (!outcome || typeof outcome !== "object")
      return fail(call, "execution_failed");
    if (outcome.status === "failed") {
      if (
        outcome.retryable !== undefined &&
        typeof outcome.retryable !== "boolean"
      )
        return fail(call, "execution_failed");
      const base = failure(
        typeof outcome.code === "string" &&
          outcome.code &&
          outcome.code.length <= 128
          ? outcome.code
          : "execution_failed",
      );
      let details: JsonValue | undefined;
      if (outcome.details !== undefined) {
        try {
          assertWorkflowHostStrictJsonValue(outcome.details);
          if (
            utf8.encode(canonical(outcome.details)).byteLength >
            definition.maxResultBytes
          )
            throw new Error("preflight_details_too_large");
          details = copyJson(outcome.details);
        } catch {
          details = undefined;
        }
      }
      return {
        callId: call.callId,
        name: call.name,
        status: "failed",
        effectCertainty: "not_started",
        failure: {
          ...base,
          retryable: outcome.retryable ?? base.retryable,
          ...(details !== undefined ? { details } : {}),
        },
      };
    }
    if (outcome.status !== "prepared") return fail(call, "execution_failed");
    const stage = outcome;
    const reject = async (code: string): Promise<PiGatewayCallResult> => {
      let cleaned = true;
      if (typeof stage.dispose === "function") {
        try {
          await stage.dispose();
        } catch {
          cleaned = false;
        }
      }
      const result = fail(call, code);
      return cleaned ? result : cleanupPendingResult(result);
    };
    if (
      typeof stage.domainPlanDigest !== "string" ||
      !stage.domainPlanDigest ||
      stage.domainPlanDigest.length > 256 ||
      typeof stage.execute !== "function" ||
      typeof stage.dispose !== "function"
    )
      return await reject("execution_failed");
    let tooLarge = false;
    try {
      assertWorkflowHostStrictJsonValue(stage.admissionFacts);
      // ponytail: admission facts share the definition's own result envelope
      // (50 KiB for catalog tools) instead of the smaller claim bound, so a
      // legitimate 100-target plan preview is not rejected as resource_limited.
      tooLarge =
        utf8.encode(canonical(stage.admissionFacts)).byteLength >
        definition.maxResultBytes;
    } catch {
      return await reject("execution_failed");
    }
    if (tooLarge) return await reject("resource_limited");
    prepared.plan = {
      domainPlanDigest: stage.domainPlanDigest,
      admissionFacts: copyJson(stage.admissionFacts),
      execute: stage.execute.bind(stage),
      dispose: stage.dispose.bind(stage),
    };
    return null;
  }

  async function runPrepared(
    prepared: PreparedCall,
  ): Promise<PiGatewayCallResult> {
    const { call, definition, claims, argumentDigest, plan } = prepared;
    if (signal.aborted) return canceled(call);
    const startedAt = new Date().toISOString();
    const started: PiGatewayStartedFact = {
      owner: { ...owner },
      turnId: input.turnId,
      callId: call.callId,
      capabilityId: definition.capabilityId,
      name: definition.name,
      catalogDigest,
      descriptorDigest: definition.descriptorDigest,
      argumentDigest,
      effects: [...claims.effects],
      safeRefs: [...(claims.safeRefs || [])],
      startedAt,
    };
    try {
      await hooks.recordStarted(started);
    } catch {
      return fail(call, "persistence_failed");
    }
    let execution: PiGatewayExecution;
    let updatesOpen = true;
    const onUpdate = (update: JsonValue) => {
      if (!updatesOpen || signal.aborted) return;
      try {
        assertWorkflowHostStrictJsonValue(update);
        if (
          utf8.encode(canonical(update)).byteLength <= definition.maxResultBytes
        ) {
          input.onUpdate?.(call.callId, copyJson(update));
        }
      } catch {
        /* Updates are non-authoritative. */
      }
    };
    if (signal.aborted) {
      execution = { status: "canceled", effectCertainty: "confirmed_none" };
    } else {
      try {
        execution = plan
          ? await plan.execute({ signal, callId: call.callId, onUpdate })
          : await definition.execute(call.arguments, {
              signal,
              callId: call.callId,
              onUpdate,
            });
      } catch {
        execution = {
          status: "failed",
          effectCertainty: "unknown",
          code: "execution_failed",
        };
      }
    }
    updatesOpen = false;
    if (
      !execution ||
      !["completed", "failed", "canceled"].includes(execution.status) ||
      !CERTAINTIES.has(execution.effectCertainty) ||
      (execution.domainReceiptRef !== undefined &&
        (typeof execution.domainReceiptRef !== "string" ||
          execution.domainReceiptRef.length > 256))
    ) {
      execution = {
        status: "failed",
        effectCertainty: "unknown",
        code: "execution_failed",
      };
    }
    let recoveryDetails: JsonValue | undefined;
    if (execution.details !== undefined) {
      try {
        assertWorkflowHostStrictJsonValue(execution.details);
        if (
          utf8.encode(canonical(execution.details)).byteLength >
          definition.maxResultBytes
        )
          throw new Error("failure_details_too_large");
        recoveryDetails = copyJson(execution.details);
      } catch {
        recoveryDetails = undefined;
        if (execution.status === "failed")
          execution = {
            status: "failed",
            effectCertainty: execution.effectCertainty,
            code: "execution_failed",
          };
      }
    }
    if (
      execution.status === "failed" &&
      execution.retryable !== undefined &&
      typeof execution.retryable !== "boolean"
    ) {
      execution = {
        status: "failed",
        effectCertainty: execution.effectCertainty,
        code: "execution_failed",
      };
      recoveryDetails = undefined;
    }
    const effectful = claims.effects.some(
      (effect) => effect !== "bounded-read",
    );
    let result: PiGatewayCallResult;
    if (
      execution.effectCertainty === "unknown" ||
      (execution.status === "canceled" &&
        !["confirmed_none", "confirmed_complete", "confirmed_partial"].includes(
          execution.effectCertainty,
        )) ||
      (execution.status === "completed" &&
        effectful &&
        execution.effectCertainty !== "confirmed_complete")
    ) {
      result = {
        callId: call.callId,
        name: call.name,
        status: "state_unknown",
        effectCertainty: "unknown",
        failure: {
          ...failure("state_unknown"),
          ...(recoveryDetails !== undefined
            ? { details: copyJson(recoveryDetails) }
            : {}),
        },
      };
    } else if (execution.status === "completed") {
      try {
        if (execution.value !== undefined) {
          assertWorkflowHostStrictJsonValue(execution.value);
          if (
            utf8.encode(canonical(execution.value)).byteLength >
            definition.maxResultBytes
          ) {
            throw new Error("result_too_large");
          }
        }
        result = {
          callId: call.callId,
          name: call.name,
          status: "completed",
          effectCertainty: execution.effectCertainty,
          ...(execution.value !== undefined
            ? { value: copyJson(execution.value) }
            : {}),
        };
      } catch {
        result = {
          ...fail(call, "resource_limited"),
          effectCertainty: execution.effectCertainty,
        };
      }
    } else if (execution.status === "canceled") {
      result = {
        callId: call.callId,
        name: call.name,
        status: "canceled",
        effectCertainty: execution.effectCertainty,
      };
    } else {
      const baseFailure = failure(execution.code || "execution_failed");
      result = {
        callId: call.callId,
        name: call.name,
        status: "failed",
        effectCertainty: execution.effectCertainty,
        failure: {
          ...baseFailure,
          retryable: execution.retryable ?? baseFailure.retryable,
          ...(recoveryDetails !== undefined
            ? { details: copyJson(recoveryDetails) }
            : {}),
        },
      };
    }
    const receipt: PiGatewayAttemptReceipt = {
      ...started,
      completedAt: new Date().toISOString(),
      outcome: result.status,
      effectCertainty: result.effectCertainty,
      ...(execution.domainReceiptRef
        ? { domainReceiptRef: execution.domainReceiptRef }
        : {}),
    };
    try {
      await hooks.recordReceipt(receipt);
    } catch {
      return {
        callId: call.callId,
        name: call.name,
        status: "state_unknown",
        effectCertainty: "unknown",
        failure: failure("state_unknown"),
      };
    }
    return result;
  }

  async function run(prepared: PreparedCall): Promise<PiGatewayCallResult> {
    return await disposePrepared(prepared, await runPrepared(prepared));
  }

  async function runGroup(
    group: PreparedCall[],
    results: Map<string, PiGatewayCallResult>,
  ) {
    const queue = [...group];
    const running = new Set<Promise<void>>();
    const held = new Set<string>();
    while (queue.length || running.size) {
      if (signal.aborted) {
        for (const pending of queue)
          results.set(
            pending.call.callId,
            await disposePrepared(pending, canceled(pending.call)),
          );
        queue.length = 0;
      }
      for (
        let index = 0;
        index < queue.length && running.size < policy.maxConcurrent;
      ) {
        const item = queue[index];
        if (item.claims.resourceKeys.some((key) => held.has(key))) {
          index += 1;
          continue;
        }
        queue.splice(index, 1);
        for (const key of item.claims.resourceKeys) held.add(key);
        const task = run(item)
          .then((result) => {
            results.set(item.call.callId, result);
          })
          .finally(() => {
            for (const key of item.claims.resourceKeys) held.delete(key);
            running.delete(task);
          });
        running.add(task);
      }
      if (running.size) await Promise.race(running);
    }
  }

  async function defer(
    prepared: PreparedCall,
    sourceTurnId: string,
  ): Promise<{
    result: PiGatewayCallResult;
    pending?: PiGatewayPendingCall;
  }> {
    const { call, definition, argumentDigest, plan } = prepared;
    if (signal.aborted)
      return { result: await disposePrepared(prepared, canceled(call)) };
    const request: PiGatewayPendingCall = {
      call,
      ...(plan ? { admissionFacts: plan.admissionFacts } : {}),
      binding: {
        owner: { ...owner },
        sourceTurnId,
        callId: call.callId,
        name: call.name,
        argumentDigest,
        catalogDigest,
        descriptorDigest: definition.descriptorDigest,
        envelopeDigest,
        runtimeCapabilityDigest,
        ...(plan ? { domainPlanDigest: plan.domainPlanDigest } : {}),
      },
    };
    const result = await disposePrepared(prepared, {
      callId: call.callId,
      name: call.name,
      status: "permission_required",
      effectCertainty: "not_started",
    });
    if (result.failure) return { result: { ...result, status: "failed" } };
    if (signal.aborted) return { result: canceled(call) };
    try {
      await hooks.recordPermission(request);
      return { pending: request, result };
    } catch {
      return { result: fail(call, "persistence_failed") };
    }
  }

  const turn: PiGatewayTurn = {
    catalog,
    async executeBatch(calls) {
      if (!Array.isArray(calls)) throw new Error("pi_gateway_batch_invalid");
      const ids = calls.map((call) => call?.callId);
      const structural =
        calls.length > policy.maxCalls
          ? "resource_limited"
          : ids.some(
                (id) => typeof id !== "string" || !id || usedCallIds.has(id),
              ) ||
              new Set(ids).size !== ids.length ||
              (calls.some(
                (call) =>
                  visible.find((item) => item.name === call?.name)
                    ?.batchMode === "exclusive",
              ) &&
                calls.length !== 1)
            ? "invalid_request"
            : "";
      if (structural)
        return {
          results: calls.map((call) => fail(call, structural)),
          pending: [],
        };
      for (const id of ids) usedCallIds.add(id);
      const prepared = await Promise.all(calls.map(prepare));
      const eligible = prepared.filter(
        (item): item is PreparedCall => "definition" in item,
      );
      if (
        eligible
          .filter((item) => item.authorization === "ready")
          .reduce((sum, item) => sum + item.claims.cost, 0) > policy.maxCost
      ) {
        return {
          results: calls.map((call) => fail(call, "resource_limited")),
          pending: [],
        };
      }
      const results = new Map<string, PiGatewayCallResult>();
      for (const item of prepared)
        if (!("definition" in item)) results.set(item.callId, item);
      const preflights = await Promise.all(
        eligible.map((item) => preflightCall(item, input.turnId)),
      );
      eligible.forEach((item, index) => {
        const rejected = preflights[index];
        if (rejected) results.set(item.call.callId, rejected);
      });
      const planned = eligible.filter((item) => !results.has(item.call.callId));
      await runGroup(
        planned.filter(
          (item) =>
            item.authorization === "ready" &&
            item.definition.batchMode !== "deferred",
        ),
        results,
      );
      await runGroup(
        planned.filter(
          (item) =>
            item.authorization === "ready" &&
            item.definition.batchMode === "deferred",
        ),
        results,
      );
      const pending: PiGatewayPendingCall[] = [];
      for (const item of planned.filter(
        (entry) => entry.authorization === "permission",
      )) {
        const deferred = await defer(item, input.turnId);
        if (deferred.pending) pending.push(deferred.pending);
        results.set(item.call.callId, deferred.result);
      }
      return {
        results: calls.map((call) => results.get(call.callId)!),
        pending,
      };
    },
    async continueCall(pending, decision) {
      const call = pending?.call;
      const binding = pending?.binding;
      if (
        !call ||
        !binding ||
        !call.callId ||
        usedCallIds.has(call.callId) ||
        binding.sourceTurnId === input.turnId ||
        !binding.sourceTurnId ||
        (decision !== "approve" && decision !== "deny")
      ) {
        return {
          result: fail(
            call || { callId: "", name: "", arguments: null },
            "invalid_request",
          ),
        };
      }
      if (
        !binding.owner ||
        binding.owner.kind !== owner.kind ||
        binding.owner.ownerId !== owner.ownerId
      ) {
        return { result: fail(call, "policy_denied") };
      }
      usedCallIds.add(call.callId);
      if (decision === "deny") return { result: fail(call, "policy_denied") };
      const prepared = await prepare(call);
      if (!("definition" in prepared)) return { result: prepared };
      if (prepared.claims.cost > policy.maxCost)
        return { result: fail(call, "resource_limited") };
      const sourceTurnId = binding.sourceTurnId;
      const rejected = await preflightCall(prepared, sourceTurnId);
      if (rejected) return { result: rejected };
      const matches =
        binding.callId === call.callId &&
        binding.name === call.name &&
        binding.argumentDigest === prepared.argumentDigest &&
        binding.catalogDigest === catalogDigest &&
        binding.descriptorDigest === prepared.definition.descriptorDigest &&
        binding.envelopeDigest === envelopeDigest &&
        binding.runtimeCapabilityDigest === runtimeCapabilityDigest &&
        binding.domainPlanDigest === prepared.plan?.domainPlanDigest;
      if (!matches) {
        const deferred = await defer(prepared, sourceTurnId);
        return {
          result: deferred.result,
          ...(deferred.pending ? { pending: deferred.pending } : {}),
        };
      }
      return { result: await run(prepared) };
    },
  };
  let active = false;
  async function exclusive<T>(work: () => Promise<T>): Promise<T> {
    active = true;
    try {
      return await work();
    } finally {
      active = false;
    }
  }
  return {
    catalog,
    executeBatch(calls) {
      return active
        ? Promise.resolve({
            results: calls.map((call) => fail(call, "owner_busy")),
            pending: [],
          })
        : exclusive(() => turn.executeBatch(calls));
    },
    continueCall(pending, decision) {
      return active
        ? Promise.resolve({ result: fail(pending?.call, "owner_busy") })
        : exclusive(() => turn.continueCall(pending, decision));
    },
  };
}
