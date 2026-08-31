import {
  SYNTHESIS_REVERSE_HOST_CAPABILITIES,
  SynthesisClientError,
  rebuildSynthesisReverseHostCall,
  rebuildSynthesisReverseHostResult,
  type SynthesisReverseHostCall,
  type SynthesisReverseHostCapability,
  type SynthesisReverseHostPayload,
  type SynthesisReverseHostResult,
  type SynthesisSidecarObservationEvent,
} from "../../packages/synthesis-contracts/src";
import { timingSafeEqualString } from "../utils/timingSafeEqual";
import {
  createSynthesisSidecarTraceContext,
  recordSynthesisSidecarTraceEvent,
} from "./synthesisSidecarTrace";

type HandlerContext = {
  requestId: string;
  operationId: string;
  deadlineAtMs: number;
};

export type SynthesisReverseHostHandler<
  Capability extends SynthesisReverseHostCapability =
    SynthesisReverseHostCapability,
> = (
  payload: SynthesisReverseHostPayload<Capability>,
  context: HandlerContext,
) => Promise<SynthesisReverseHostResult<Capability>>;

export type SynthesisReverseHostHandlers = {
  [Capability in SynthesisReverseHostCapability]: SynthesisReverseHostHandler<Capability>;
};

type BrokerOptions = {
  profileId: string;
  serviceInstanceId: string | (() => string | null);
  allowUnboundServiceInstance?: boolean;
  authorizationToken: string;
  now: () => number;
  isHostConnected: () => boolean;
  authorizeCapability: (
    call: SynthesisReverseHostCall,
  ) => boolean | Promise<boolean>;
  handlers: SynthesisReverseHostHandlers;
  recordTraceEvent?: (event: SynthesisSidecarObservationEvent) => void;
};

type DispatchInput = {
  authorizationToken: string;
  call: unknown;
};

type EffectResult = {
  callIdentity: string;
  result: SynthesisReverseHostResult<SynthesisReverseHostCapability>;
};

const MAX_DEADLINE_AHEAD_MS = 60_000;
const textEncoder = new TextEncoder();

function failure(
  code: ConstructorParameters<typeof SynthesisClientError>[0],
  reason: string,
): never {
  throw new SynthesisClientError(code, reason, { reason });
}

function isEffect(capability: SynthesisReverseHostCapability) {
  return capability.startsWith("effects.");
}

function callIdentity(call: SynthesisReverseHostCall) {
  return JSON.stringify({
    capability: call.capability,
    payload: call.payload,
  });
}

function assertCompleteHandlers(handlers: SynthesisReverseHostHandlers) {
  const actual = Object.keys(handlers).sort();
  const expected = [...SYNTHESIS_REVERSE_HOST_CAPABILITIES].sort();
  if (
    actual.length !== expected.length ||
    actual.some(
      (capability, index) =>
        capability !== expected[index] ||
        typeof handlers[capability as SynthesisReverseHostCapability] !==
          "function",
    )
  ) {
    failure("invalid_request", "reverse_host_handlers_incomplete");
  }
}

export function createSynthesisReverseHostBroker(options: BrokerOptions) {
  assertCompleteHandlers(options.handlers);
  let active = true;
  const completedEffects = new Map<string, EffectResult>();
  const inFlightEffects = new Map<
    string,
    Promise<SynthesisReverseHostResult<SynthesisReverseHostCapability>>
  >();

  async function execute(call: SynthesisReverseHostCall) {
    const startedAt = options.now();
    const trace = createSynthesisSidecarTraceContext({ parent: call.trace });
    const record = (
      event: Parameters<typeof recordSynthesisSidecarTraceEvent>[0],
    ) => {
      const retained = recordSynthesisSidecarTraceEvent(event);
      if (retained) options.recordTraceEvent?.(retained);
    };
    record({
      context: trace,
      source: "host",
      boundary: "reverse-host",
      phase: "handler",
      outcome: "started",
      identities: { capability: call.capability },
    });
    try {
      if (!(await options.authorizeCapability(call))) {
        failure("unavailable", "permission_denied");
      }
      const handler = options.handlers[call.capability] as (
        payload: SynthesisReverseHostPayload<SynthesisReverseHostCapability>,
        context: HandlerContext,
      ) => Promise<unknown>;
      const result = rebuildSynthesisReverseHostResult(
        call.capability,
        await handler(call.payload, {
          requestId: call.requestId,
          operationId: call.operationId,
          deadlineAtMs: call.deadlineAtMs,
        }),
        call.payload,
      );
      record({
        context: trace,
        source: "host",
        boundary: "reverse-host",
        phase: "handler-terminal",
        outcome: "succeeded",
        identities: { capability: call.capability },
        metrics: {
          durationMs: Math.max(0, options.now() - startedAt),
          responseBytes: textEncoder.encode(JSON.stringify(result)).byteLength,
        },
      });
      return result;
    } catch (error) {
      record({
        context: trace,
        source: "host",
        boundary: "reverse-host",
        phase: "handler-terminal",
        outcome:
          error instanceof SynthesisClientError && error.code === "timeout"
            ? "timed-out"
            : "failed",
        code:
          error instanceof SynthesisClientError
            ? error.code
            : "reverse_host_handler_failed",
        identities: { capability: call.capability },
        metrics: { durationMs: Math.max(0, options.now() - startedAt) },
      });
      throw error;
    }
  }

  async function dispatch(input: DispatchInput) {
    if (!active) {
      failure("unavailable", "reverse_host_disposed");
    }
    if (
      !timingSafeEqualString(
        input.authorizationToken,
        options.authorizationToken,
      )
    ) {
      failure("unavailable", "reverse_host_unauthorized");
    }
    const call = rebuildSynthesisReverseHostCall(input.call);
    const serviceInstanceId =
      typeof options.serviceInstanceId === "function"
        ? options.serviceInstanceId()
        : options.serviceInstanceId;
    const instanceMatches =
      serviceInstanceId === call.serviceInstanceId ||
      (!serviceInstanceId &&
        options.allowUnboundServiceInstance === true &&
        call.serviceInstanceId.length > 0);
    if (call.profileId !== options.profileId || !instanceMatches) {
      failure("unavailable", "reverse_host_stale_instance");
    }
    const now = options.now();
    if (
      call.deadlineAtMs <= now ||
      call.deadlineAtMs > now + MAX_DEADLINE_AHEAD_MS
    ) {
      failure("timeout", "reverse_host_deadline_invalid");
    }
    if (!options.isHostConnected()) {
      failure("unavailable", "reverse_host_disconnected");
    }
    if (!isEffect(call.capability)) {
      return execute(call);
    }

    const identity = callIdentity(call);
    const completed = completedEffects.get(call.operationId);
    if (completed) {
      if (completed.callIdentity !== identity) {
        failure("conflict", "reverse_host_operation_conflict");
      }
      return completed.result;
    }
    const inFlight = inFlightEffects.get(call.operationId);
    if (inFlight) {
      return inFlight;
    }
    const operation = execute(call)
      .then((result) => {
        completedEffects.set(call.operationId, {
          callIdentity: identity,
          result,
        });
        return result;
      })
      .finally(() => {
        inFlightEffects.delete(call.operationId);
      });
    inFlightEffects.set(call.operationId, operation);
    return operation;
  }

  return {
    dispatch,
    dispose() {
      active = false;
      completedEffects.clear();
      inFlightEffects.clear();
    },
  };
}
