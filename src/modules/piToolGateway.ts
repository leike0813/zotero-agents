import Ajv2020, { type ValidateFunction } from "ajv/dist/2020";
import type { JsonValue } from "../workflows/types";
import { assertWorkflowHostStrictJsonValue } from "../workflows/workflowHostErrorContract";
import { sha256PrefixedHex } from "../utils/sha256";
import { resolveNativeAbortControllerConstructor } from "../utils/wait";
import { waitForPromiseSettlement } from "../utils/wait";

import type { PiGatewayEffect } from "../shared/piToolGatewayContract";
export type { PiGatewayEffect } from "../shared/piToolGatewayContract";
import {
  getPiFailurePolicy,
  type PiFailureEffectCertainty,
  type PiFailureCategory,
} from "../shared/piFailureContract";
import { record, type PiRuntimeAuditContext } from "./piRuntimeAudit";
import type { PiPhysicalSettlement } from "./piRuntimeLifecycle";

/**
 * Trusted Broker operation identity for one invocation. It comes from the
 * domain's private identity, never from model input, so the started fact can
 * be reconciled against authoritative Broker evidence later.
 */
export type PiGatewayDomainOperation = {
  scope: { ownerId: string };
  operationId: string;
};

export type PiGatewayPhysicalSettlement = PiPhysicalSettlement;

/**
 * Trusted tool deadline categories, in milliseconds. The category comes from
 * the catalog's own descriptor, never from model input, so a tool cannot ask
 * for a longer budget by naming a bigger number. Shell owns its own default
 * and ceiling; every other tool is capped by PI_TOOL_MAX_DEADLINE_MS.
 */
export const PI_TOOL_ORDINARY_DEADLINE_MS = 120_000;
export const PI_TOOL_LONG_TRAVERSAL_DEADLINE_MS = 900_000;
export const PI_TOOL_SHELL_DEFAULT_DEADLINE_MS = 900_000;
export const PI_TOOL_SHELL_MAX_DEADLINE_MS = 3_600_000;
export const PI_TOOL_MAX_DEADLINE_MS = 3_600_000;
/** Per-tool teardown bound; expiry keeps the hold rather than assuming exit. */
export const PI_TOOL_TEARDOWN_TIMEOUT_MS = 30_000;

export type PiGatewayDeadlineCategory = "ordinary" | "long-traversal" | "shell";

/** Resolves the absolute deadline for a trusted descriptor category. */
export function piGatewayToolDeadline(
  category: PiGatewayDeadlineCategory,
): number {
  if (category === "long-traversal") return PI_TOOL_LONG_TRAVERSAL_DEADLINE_MS;
  if (category === "shell") return PI_TOOL_SHELL_DEFAULT_DEADLINE_MS;
  return PI_TOOL_ORDINARY_DEADLINE_MS;
}

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
  sourceTurnId?: string;
  /**
   * Registers the executor's real completion promise. The settlement promise
   * never enters the JSON result; it only decides when the call's resource
   * claims may be released.
   */
  trackPhysical?: (settlement: Promise<PiPhysicalSettlement>) => void;
};

export type PiGatewayPreflight =
  | {
      status: "prepared";
      domainPlanDigest: string;
      admissionFacts: JsonValue;
      domainOperation?: PiGatewayDomainOperation;
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
  batchMode?: "ordinary" | "exclusive" | "deferred" | "single-per-batch";
  /** Trusted deadline category; defaults to the ordinary bound. */
  deadlineCategory?: PiGatewayDeadlineCategory;
  /**
   * Trusted wall-clock limit for the whole call, in milliseconds. It is
   * descriptor metadata the catalog supplies, never a model argument, and it
   * is still capped by PI_TOOL_MAX_DEADLINE_MS.
   */
  timeLimitMs?: number;
  requiresForegroundConversation?: boolean;
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
      sourceTurnId?: string;
      trackPhysical?: (settlement: Promise<PiPhysicalSettlement>) => void;
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
  category: PiFailureCategory;
  code: string;
  retryable: boolean;
  /** Effects known to the gateway when the failure was produced. */
  effectCertainty: PiGatewayCertainty;
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
  domainOperation?: PiGatewayDomainOperation;
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
    /**
     * Commits the canonical failure core for a failed call and returns its
     * identity. The gateway owns the failure, so it owns the commit; audit and
     * higher layers only reuse the returned failureId.
     */
    recordFailure?: (
      failure: PiGatewayFailure,
      call: {
        owner: PiGatewayAttemptReceipt["owner"];
        turnId: string;
        callId: string;
        capabilityId: string;
        /** What the gateway already knows about the effects of this call. */
        effectCertainty: PiGatewayCertainty;
      },
    ) => Promise<string | undefined>;
    /**
     * Reports how many calls this batch will actually dispatch, once, after the
     * whole-batch preflight and before the first effect. Pending approvals and
     * rejected calls are excluded; a failure aborts the batch before any effect.
     */
    beforeExecuteBatch?: (attempts: number) => Promise<void>;
  };
  signal?: AbortSignal;
  /** Absolute turn deadline; clips every tool's logical watchdog. */
  deadline?: number;
  /**
   * Process-wide physical settlement registration. The gateway holds every
   * resource claim of a call until the registered promise reports `settled`;
   * `unknown` keeps the claim for the life of the process.
   */
  trackPhysical?: (settlement: Promise<PiPhysicalSettlement>) => void;
  /**
   * Authoritative evidence that arrived after the logical result committed.
   * It is appended to the original invocation and never reopens a sealed or
   * canceled turn, so late settlement reconciles evidence without replaying
   * the call. The owning runtime supplies this; the gateway only reports it.
   */
  recordPhysicalEvidence?: (evidence: {
    owner: PiGatewayAttemptReceipt["owner"];
    turnId: string;
    callId: string;
    capabilityId: string;
    state: PiPhysicalSettlement;
    /** The executor's real logical outcome, when it arrived after the wait. */
    outcome?: PiGatewayExecution;
    domainOperation?: PiGatewayDomainOperation;
  }) => Promise<void> | void;
  foregroundConversation?: () => boolean;
  onUpdate?: (callId: string, update: JsonValue) => void;
  /**
   * Transient trusted context for audit owner resolution. Never persisted and
   * never carried into a result; it only tells the audit module where this
   * owner's evidence already lives.
   */
  audit?: PiRuntimeAuditContext;
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
  domainOperation?: PiGatewayDomainOperation;
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
  /** Every physical promise registered by this call's executor. */
  physicalSettlement?: Promise<PiPhysicalSettlement>;
  /** True once the combined claim proved it settled. */
  physicalSettled?: boolean;
  /** Trusted binding, kept after dispose clears the plan. */
  domainOperation?: PiGatewayDomainOperation;
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

// Canonical write-resource claims for the whole process, not just one batch:
// a call's keys stay claimed until its physical settlement is `settled`. An
// `unknown` settlement is unprovable evidence, so the claim is kept rather than
// released on a logical result. Counted, because two independent callers may
// legitimately hold the same key for the same canonical resource.
const resourceClaims = new Map<string, number>();
// Waiters let a blocked call sleep until a claim is genuinely released instead
// of spinning. A claim held by `unknown` may never resolve, and that is a real
// hold, not a reason to burn the event loop.
const resourceWaiters = new Map<string, Set<() => void>>();

function claimResource(key: string) {
  resourceClaims.set(key, (resourceClaims.get(key) || 0) + 1);
}

function releaseResource(key: string) {
  const next = (resourceClaims.get(key) || 0) - 1;
  if (next > 0) resourceClaims.set(key, next);
  else {
    resourceClaims.delete(key);
    const waiting = resourceWaiters.get(key);
    resourceWaiters.delete(key);
    for (const wake of waiting || []) wake();
  }
}

function resourceClaimed(key: string) {
  return (resourceClaims.get(key) || 0) > 0;
}

/** Resolves the next time `key` is free; never rejects. */
function whenResourceFree(key: string): Promise<void> {
  if (!resourceClaimed(key)) return Promise.resolve();
  return new Promise<void>((resolve) => {
    const waiting = resourceWaiters.get(key) || new Set<() => void>();
    resourceWaiters.set(key, waiting);
    waiting.add(resolve);
  });
}

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
  // Classification is the shared policy table's job, so a gateway failure and
  // the canonical core an owner later commits can never disagree.
  const policy = getPiFailurePolicy(code, "pi_tool_gateway");
  return {
    origin: "tool_gateway",
    category: policy.category,
    code,
    retryable: policy.retryable,
    effectCertainty: "not_started",
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

/**
 * What the call's effects are known to be, expressed in the failure contract's
 * vocabulary. The gateway's confirmed states are effects that did settle, and
 * an unprovable call is explicitly uncertain rather than merely not started.
 */
export function failureEffectCertainty(
  certainty: PiGatewayCertainty,
): PiFailureEffectCertainty {
  if (certainty === "unknown") return "unknown";
  if (certainty === "not_started") return "not_started";
  if (certainty === "not_applicable") return "not_applicable";
  return "settled";
}

/**
 * Structural gateway evidence, recorded by the gateway because it owns the
 * call. It runs only after the canonical receipt has committed, so evidence
 * never precedes the fact it describes, and it carries no argument or result
 * body: only identity, outcome and the committed receipt reference.
 */
function recordPiGatewayEvidence(
  input: PiGatewayTurnInput,
  call: {
    turnId: string;
    callId: string;
    capabilityId: string;
    outcome?: PiGatewayCallResult["status"];
    domainReceiptRef?: string;
  },
  result: PiGatewayCallResult,
  failureId?: string,
) {
  if (!input.owner) return;
  const context = {
    owner: input.owner,
    ...(input.audit?.root ? { root: input.audit.root } : {}),
    ...(input.audit?.workspaceDir
      ? { workspaceDir: input.audit.workspaceDir }
      : {}),
  };
  const correlation = { turnId: call.turnId, callId: call.callId };
  // Failure evidence references a committed canonical identity. Without one
  // there is nothing durable to point at, so no evidence is written.
  if (
    failureId &&
    (result.status === "failed" || result.status === "state_unknown")
  ) {
    record({
      operation: "failure.observed",
      origin: "tool_gateway",
      ...context,
      correlation: { ...correlation, failureId },
      ...(result.failure ? { failureCode: result.failure.code } : {}),
    });
  }
  if (
    result.failure?.category === "policy" ||
    result.failure?.code === "capability_unavailable"
  )
    record({
      operation:
        result.failure?.code === "security_denied"
          ? "security.decision_denied"
          : "capability.denied_or_degraded",
      origin: "tool_gateway",
      ...context,
      correlation,
      attributes: {
        outcome: result.status,
        reason: result.failure.code,
        capabilityId: call.capabilityId,
      },
    });
  if (call.domainReceiptRef)
    record({
      operation: "tool.mutation_receipt_committed",
      origin: "tool_gateway",
      ...context,
      correlation,
      attributes: {
        outcome: call.outcome || result.status,
        receiptId: call.domainReceiptRef,
        capabilityId: call.capabilityId,
      },
    });
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
        !["ordinary", "exclusive", "deferred", "single-per-batch"].includes(
          definition.batchMode,
        )) ||
      (definition.requiresForegroundConversation !== undefined &&
        typeof definition.requiresForegroundConversation !== "boolean") ||
      (definition.deadlineCategory !== undefined &&
        !["ordinary", "long-traversal", "shell"].includes(
          definition.deadlineCategory,
        )) ||
      (definition.timeLimitMs !== undefined &&
        (!Number.isSafeInteger(definition.timeLimitMs) ||
          definition.timeLimitMs < 1 ||
          definition.timeLimitMs > PI_TOOL_MAX_DEADLINE_MS)) ||
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
      requiresForegroundConversation:
        !!definition.requiresForegroundConversation,
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
  const owner = Object.freeze({ ...input.owner });
  const foregroundConversation = input.foregroundConversation;
  function foregroundAvailable() {
    try {
      return (
        owner.kind === "conversation" &&
        policy.mode === "interactive" &&
        foregroundConversation?.() === true
      );
    } catch {
      return false;
    }
  }
  const visible = frozen.filter(
    (definition) =>
      available.has(definition.capabilityId) &&
      (!definition.requiresForegroundConversation || foregroundAvailable()),
  );
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
    if (definition.requiresForegroundConversation && !foregroundAvailable())
      return fail(call, "policy_denied");
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
      claims.effects.every(
        (effect) =>
          policy.authorizedEffects.includes(effect) ||
          (effect === "host-control" &&
            !!definition.requiresForegroundConversation),
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

  /**
   * Per-tool teardown, bounded so one unresponsive cleanup cannot stall a
   * turn. Expiry is not proof that anything stopped: the staging stays
   * reserved, its claim is kept, and maintenance retries the cleanup later.
   */
  async function disposeWithinTeardownBound(plan: PreparedPlan) {
    const settled = await waitForPromiseSettlement(plan.dispose(), {
      phase: "tool_dispose",
      signal,
      timeoutMs: Math.min(
        PI_TOOL_TEARDOWN_TIMEOUT_MS,
        Math.max(0, (input.deadline ?? Infinity) - Date.now()),
      ),
    });
    if (settled.status === "fulfilled") return;
    if (settled.status === "rejected") throw settled.error;
    throw new Error("pi_tool_teardown_pending");
  }

  async function disposePrepared(
    prepared: PreparedCall,
    result: PiGatewayCallResult,
  ): Promise<PiGatewayCallResult> {
    const plan = prepared.plan;
    if (!plan) return result;
    prepared.plan = undefined;
    // Staging may reference files a still-running executor is using, so an
    // unproved settlement keeps the staging reserved. The turn never waits on
    // that claim: it reports cleanup pending now and the release happens when
    // the claim actually settles.
    const settlement = prepared.physicalSettlement;
    if (settlement) {
      // A claim that has already proved itself disposes inline. One that is
      // still open defers immediately: waiting on it would hang the turn, and
      // an open claim is exactly the case where staging may still be in use.
      const state = prepared.physicalSettled;
      if (state === true) {
        try {
          await disposeWithinTeardownBound(plan);
          return result;
        } catch {
          return cleanupPendingResult(result);
        }
      }
      void settlement.then(
        (state) => {
          if (state !== "settled") return;
          void disposeWithinTeardownBound(plan).catch(() => undefined);
        },
        () => undefined,
      );
      return cleanupPendingResult(result);
    }
    try {
      await disposeWithinTeardownBound(plan);
      return result;
    } catch {
      return cleanupPendingResult(result);
    }
  }

  /**
   * Disposes staging produced by the whole-batch preflight when the batch is
   * refused before any call runs. A cleanup failure is still canonical evidence,
   * so the affected call ids travel on the original refusal error.
   */
  async function disposeUnstarted(
    items: readonly PreparedCall[],
  ): Promise<string[]> {
    const cleanupPending: string[] = [];
    for (const item of items) {
      const plan = item.plan;
      if (!plan) continue;
      item.plan = undefined;
      try {
        await disposeWithinTeardownBound(plan);
      } catch {
        cleanupPending.push(item.call.callId);
      }
    }
    return cleanupPending;
  }

  /** Preserves the owner's refusal (e.g. the LoopGuard limit) while carrying
   * cleanup-pending evidence, so nothing dispatches and nothing is lost. */
  function rethrowRefusal(error: unknown, cleanupPending: string[]): never {
    if (cleanupPending.length && error && typeof error === "object") {
      (error as { cleanupPendingCallIds?: string[] }).cleanupPendingCallIds = [
        ...cleanupPending,
      ];
    }
    throw error;
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
      const denied: PiGatewayCallResult = {
        callId: call.callId,
        name: call.name,
        status: "failed",
        effectCertainty: "not_started",
        failure: {
          ...base,
          retryable: outcome.retryable ?? base.retryable,
          effectCertainty: "not_started",
          ...(details !== undefined ? { details } : {}),
        },
      };
      // A preflight denial settles before any receipt exists. It is still a
      // gateway-owned decision, so the gateway records it here; a failure
      // reference is written only when a canonical core was committed.
      const failureId = denied.failure
        ? await hooks
            .recordFailure?.(denied.failure, {
              owner: input.owner,
              turnId: input.turnId,
              callId: call.callId,
              capabilityId: definition.capabilityId,
              effectCertainty: denied.effectCertainty,
            })
            .catch(() => undefined)
        : undefined;
      recordPiGatewayEvidence(
        input,
        {
          turnId: input.turnId,
          callId: call.callId,
          capabilityId: definition.capabilityId,
          outcome: denied.status,
        },
        denied,
        failureId,
      );
      return denied;
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
    // Trusted identity only: a malformed or oversized binding is a broken
    // domain composition, so the call never starts an effect it cannot bind.
    let domainOperation: PiGatewayDomainOperation | undefined;
    if (stage.domainOperation !== undefined) {
      const binding =
        stage.domainOperation as Partial<PiGatewayDomainOperation>;
      const scope = binding?.scope as { ownerId?: unknown } | undefined;
      if (
        !binding ||
        typeof binding.operationId !== "string" ||
        !binding.operationId ||
        binding.operationId.length > 256 ||
        !scope ||
        typeof scope.ownerId !== "string" ||
        !scope.ownerId ||
        scope.ownerId.length > 256
      )
        return await reject("execution_failed");
      domainOperation = {
        scope: { ownerId: scope.ownerId },
        operationId: binding.operationId,
      };
    }
    prepared.plan = {
      domainPlanDigest: stage.domainPlanDigest,
      admissionFacts: copyJson(stage.admissionFacts),
      ...(domainOperation ? { domainOperation } : {}),
      execute: stage.execute.bind(stage),
      dispose: stage.dispose.bind(stage),
    };
    return null;
  }

  async function runPrepared(
    prepared: PreparedCall,
    sourceTurnId = input.turnId,
  ): Promise<PiGatewayCallResult> {
    const { call, definition, claims, argumentDigest, plan } = prepared;
    if (signal.aborted) return canceled(call);
    // The logical watchdog is the trusted descriptor's own bound, further
    // clipped by the lease deadline. Racing it only decides what the caller is
    // told; the executor keeps running and its claim stays held until the
    // physical promise settles, so a timeout never frees a running resource.
    const limitMs = Math.min(
      definition.timeLimitMs ??
        piGatewayToolDeadline(definition.deadlineCategory || "ordinary"),
      input.deadline !== undefined
        ? Math.max(0, input.deadline - Date.now())
        : PI_TOOL_MAX_DEADLINE_MS,
    );
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
      // The binding is committed with the started fact, so the first effect
      // never runs before its Broker identity is durable.
      ...(plan?.domainOperation
        ? { domainOperation: plan.domainOperation }
        : {}),
    };
    try {
      await hooks.recordStarted(started);
    } catch {
      return fail(call, "persistence_failed");
    }
    let execution: PiGatewayExecution;
    let executorAnswered = false;
    let updatesOpen = true;
    // Physical settlement is collected here and reported to the owner exactly
    // once, when every part of the call has settled. The executor's own
    // registrations describe sub-facts of the same dispatch, so they are not
    // forwarded individually: one call produces one settlement observation.
    const registrations: Promise<PiPhysicalSettlement>[] = [];
    let dispatchSettlement: Promise<PiPhysicalSettlement> | undefined;
    const trackPhysical = (settlement: Promise<PiPhysicalSettlement>) => {
      registrations.push(settlement);
    };
    const combinePhysical = () =>
      dispatchSettlement
        ? Promise.all([dispatchSettlement, ...registrations]).then<
            PiPhysicalSettlement,
            PiPhysicalSettlement
          >(
            (states) =>
              states.every((state) => state === "settled")
                ? "settled"
                : "unknown",
            () => "unknown",
          )
        : undefined;
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
    } else if (
      definition.requiresForegroundConversation &&
      !foregroundAvailable()
    ) {
      execution = {
        status: "failed",
        effectCertainty: "confirmed_none",
        code: "policy_denied",
        retryable: false,
      };
    } else {
      try {
        const dispatched = plan
          ? plan.execute({
              signal,
              callId: call.callId,
              sourceTurnId,
              onUpdate,
              trackPhysical,
            })
          : definition.execute(call.arguments, {
              signal,
              callId: call.callId,
              sourceTurnId,
              onUpdate,
              trackPhysical,
            });
        // The dispatched promise is registered before the race, so the claim is
        // held by the executor's real completion whether it wins the race or
        // loses it. A losing branch keeps the same claim, so the physical state
        // is the same either way; only the logical answer differs.
        // The real outcome is evidence the owner must commit before the claim
        // is released, so the durable append is part of the settlement promise
        // itself. Releasing first would let the next owner start against a
        // resource whose real outcome is not yet recorded. Only identity and
        // the outcome's own status travel: the body stays with the executor,
        // so a late append can never duplicate a result payload.
        // A call whose wait was won already committed its own receipt, so a
        // second fact would be a duplicate. Only a call whose answer was
        // forced ahead of its executor needs the later append, and that is
        // exactly the case the durable evidence exists to reconcile.
        let answerDeferred = false;
        const recordOutcome = async (value?: PiGatewayExecution) => {
          if (!answerDeferred || !input.recordPhysicalEvidence) return;
          await input.recordPhysicalEvidence({
            owner: { ...owner },
            turnId: input.turnId,
            callId: call.callId,
            capabilityId: definition.capabilityId,
            state: value ? "settled" : "unknown",
            ...(value ? { outcome: value } : {}),
            ...(plan?.domainOperation
              ? { domainOperation: plan.domainOperation }
              : {}),
          });
        };
        const held = dispatched.then<
          PiPhysicalSettlement,
          PiPhysicalSettlement
        >(
          async (value) => {
            try {
              await recordOutcome(value);
              return "settled" as const;
            } catch {
              return "unknown" as const;
            }
          },
          async () => {
            await recordOutcome().catch(() => undefined);
            return "unknown" as const;
          },
        );
        // The executor's own promise is the same fact as the dispatch, so it
        // only joins the combined claim when the executor tracked nothing else.
        dispatchSettlement = held;
        // The call's own completion is the single settlement the owner
        // observes; sub-registrations only widen it when an executor tracks a
        // longer physical fact such as a child process or a staged write.
        input.trackPhysical?.(combinePhysical()!);
        const waited = await waitForPromiseSettlement(dispatched, {
          phase: "tool_execution",
          signal,
          timeoutMs: limitMs,
        });
        if (waited.status === "fulfilled") {
          execution = waited.value;
        } else if (waited.status === "rejected") {
          execution = {
            status: "failed",
            effectCertainty: "unknown",
            code: "execution_failed",
          };
        } else if (waited.status === "canceled") {
          // Cancellation is not proof that the effect did not happen, so the
          // result stays unknown unless the executor said otherwise itself.
          answerDeferred = true;
          execution = {
            status: "canceled",
            effectCertainty: "unknown",
          };
        } else {
          // The watchdog won: the caller was answered while the executor is
          // still running, so its eventual outcome is the late evidence.
          answerDeferred = true;
          execution = {
            status: "failed",
            effectCertainty: "unknown",
            code: "execution_timeout",
            retryable: true,
          };
        }
        executorAnswered =
          waited.status === "fulfilled" || waited.status === "rejected";
      } catch {
        execution = {
          status: "failed",
          effectCertainty: "unknown",
          code: "execution_failed",
        };
      }
    }
    updatesOpen = false;
    prepared.physicalSettlement = combinePhysical() ?? dispatchSettlement;
    // Executor return and registered child/write evidence must all settle.
    if (prepared.physicalSettlement) {
      if (!registrations.length) prepared.physicalSettled = executorAnswered;
      else
        void prepared.physicalSettlement.then((state) => {
          prepared.physicalSettled = state === "settled";
        });
    }
    prepared.domainOperation = plan?.domainOperation;
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
          ...failure(
            typeof execution.code === "string" &&
              execution.code &&
              execution.code.length <= 128
              ? execution.code
              : "state_unknown",
          ),
          retryable: execution.retryable ?? false,
          effectCertainty: "unknown",
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
          effectCertainty: execution.effectCertainty,
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
        failure: { ...failure("state_unknown"), effectCertainty: "unknown" },
      };
    }
    let failureId: string | undefined;
    if (result.failure && hooks.recordFailure) {
      // Canonical first: the failure identity is committed before any evidence
      // or projection can reference it.
      failureId = await hooks
        .recordFailure(result.failure, {
          owner: receipt.owner,
          turnId: receipt.turnId,
          callId: receipt.callId,
          capabilityId: receipt.capabilityId,
          effectCertainty: receipt.effectCertainty,
        })
        .catch(() => undefined);
    }
    recordPiGatewayEvidence(
      input,
      {
        turnId: receipt.turnId,
        callId: receipt.callId,
        capabilityId: receipt.capabilityId,
        outcome: receipt.outcome,
        ...(receipt.domainReceiptRef
          ? { domainReceiptRef: receipt.domainReceiptRef }
          : {}),
      },
      result,
      failureId,
    );
    return result;
  }

  async function run(
    prepared: PreparedCall,
    sourceTurnId = input.turnId,
  ): Promise<PiGatewayCallResult> {
    return await disposePrepared(
      prepared,
      await runPrepared(prepared, sourceTurnId),
    );
  }

  async function runGroup(
    group: PreparedCall[],
    results: Map<string, PiGatewayCallResult>,
  ) {
    const queue = [...group];
    const running = new Set<Promise<void>>();
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
        if (item.claims.resourceKeys.some(resourceClaimed)) {
          index += 1;
          continue;
        }
        queue.splice(index, 1);
        for (const key of item.claims.resourceKeys) claimResource(key);
        const task = run(item)
          .then((result) => {
            results.set(item.call.callId, result);
          })
          .finally(() => {
            running.delete(task);
            // Release on real settlement, not on the logical result. A call
            // that registered no physical promise is a plain in-process
            // executor, so its own promise is its settlement evidence.
            const settlement =
              item.physicalSettlement ?? Promise.resolve("settled" as const);
            void settlement.then((state) => {
              // Release only. The outcome evidence is reported once, by the
              // late-fulfillment path, so a call never yields two observations
              // of the same physical fact.
              if (state !== "settled") return;
              for (const key of item.claims.resourceKeys) releaseResource(key);
            });
          });
        running.add(task);
      }
      // Nothing running and nothing dispatchable means every remaining call is
      // blocked on a claim this process still holds. Sleep on that claim rather
      // than spinning: a claim whose settlement is `unknown` may never be
      // released, and the turn's own signal is what ends the wait.
      if (running.size) {
        await Promise.race(running);
        continue;
      }
      const blocked = queue[0]?.claims.resourceKeys.filter(resourceClaimed);
      if (!blocked?.length) continue;
      // The queued call waits for the real settlement. This sleeps instead of
      // spinning, and the turn's own signal ends the wait, so cancellation and
      // shutdown stay responsive while the claim itself remains held.
      await Promise.race([
        Promise.all(blocked.map((key) => whenResourceFree(key))),
        new Promise<void>((resolve) => {
          if (signal.aborted) return resolve();
          signal.addEventListener("abort", () => resolve(), { once: true });
        }),
      ]);
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
      const singleCalls = calls.filter(
        (call) =>
          visible.find((item) => item.name === call?.name)?.batchMode ===
          "single-per-batch",
      );
      const prepared = await Promise.all(
        calls.map((call) =>
          singleCalls.length > 1 && singleCalls.includes(call)
            ? fail(call, "invalid_request")
            : prepare(call),
        ),
      );
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
      const dispatched = planned.filter(
        (item) => item.authorization === "ready",
      );
      // A booking failure means the batch cannot run, so it is surfaced to the
      // owner (which owns the accounting semantics) rather than dispatching any
      // call; nothing has started at this point.
      if (hooks.beforeExecuteBatch) {
        try {
          await hooks.beforeExecuteBatch(dispatched.length);
        } catch (error) {
          rethrowRefusal(error, await disposeUnstarted(planned));
        }
      }
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
      // Only a binding-preserving approval dispatches, so only it books one
      // attempt; denials, rejections and renewals return above untouched.
      if (hooks.beforeExecuteBatch) {
        try {
          await hooks.beforeExecuteBatch(1);
        } catch (error) {
          rethrowRefusal(error, await disposeUnstarted([prepared]));
        }
      }
      return { result: await run(prepared, sourceTurnId) };
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
