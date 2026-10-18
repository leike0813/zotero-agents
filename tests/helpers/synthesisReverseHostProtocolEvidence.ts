import {
  SynthesisClientError,
  rebuildSynthesisProtocolCapabilityDto,
  rebuildSynthesisProtocolDto,
  rebuildSynthesisReverseHostPayload,
  rebuildSynthesisReverseHostResult,
  type SynthesisReverseHostCapability,
} from "../../packages/synthesis-contracts/src";
import {
  appendSynthesisProtocolExecutionEvidence,
  synthesisProtocolExecutionIdentity,
  appendSynthesisProtocolObservation,
} from "../../scripts/synthesis/synthesisProtocolExecutionEvidence";
import registry from "../../packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/registry.json" with { type: "json" };
import type {
  SynthesisProductionRouteHostCall,
  SynthesisProductionRouteHarness,
} from "./synthesisProductionRouteHarness";

const REVERSE_HOST_SCHEMA =
  "https://zotero-agents.local/synthesis/sidecar-protocol/v1/reverse-host.schema.json";

type EvidencePart = "request" | "result" | "error";

function rebuildOutcome(
  capability: SynthesisReverseHostCapability,
  direction: "request" | "result",
  value: unknown,
) {
  try {
    rebuildSynthesisProtocolCapabilityDto({ capability, direction, value });
    return "accepted" as const;
  } catch (error) {
    if (!(error instanceof SynthesisClientError)) throw error;
    return "rejected" as const;
  }
}

// Reverse Host host-call errors are validated as the wire error the sidecar
// decodes, without projecting the envelope into another shape.
function rebuildReverseHostErrorOutcome(value: unknown) {
  try {
    rebuildSynthesisProtocolDto({
      schemaId: REVERSE_HOST_SCHEMA,
      definition: "ReverseHostError",
      direction: "result",
      value,
    });
    return "accepted" as const;
  } catch (error) {
    if (!(error instanceof SynthesisClientError)) throw error;
    return "rejected" as const;
  }
}

// Protocol DTOs close their own fields, so one unknown field is the shared
// mutation used to prove the negative side of a transported instance.
function mutated(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? { ...(value as Record<string, unknown>), __unexpected: true }
    : { __unexpected: true };
}

function record(
  capability: SynthesisReverseHostCapability,
  part: EvidencePart,
  outcome: "accepted" | "rejected",
) {
  const identity = synthesisProtocolExecutionIdentity();
  if (!identity) throw new Error("native_execution_identity_missing");
  appendSynthesisProtocolExecutionEvidence(
    identity,
    capability + ":" + part,
    outcome,
  );
}

function latestCall(
  harness: SynthesisProductionRouteHarness,
  capability: SynthesisReverseHostCapability,
  part: EvidencePart,
): SynthesisProductionRouteHostCall {
  const call = harness.recorder.hostCalls
    .filter((entry) => entry.capability === capability)
    .at(-1);
  if (!call)
    throw new Error(
      "synthesis_reverse_host_" + part + "_missing:" + capability,
    );
  return call;
}

function observations(
  harness: SynthesisProductionRouteHarness,
  capability: SynthesisReverseHostCapability,
) {
  return harness
    .observations()
    .filter(
      (event) =>
        event.boundary === "reverse-host" &&
        event.identities?.capability === capability,
    );
}

/**
 * Records request evidence for a call the native side really made: the
 * captured request is accepted by production TypeScript, and its unknown-field
 * root is rejected by the same production rebuilder.
 */
export function recordSynthesisReverseHostRequestEvidence(
  harness: SynthesisProductionRouteHarness,
  capability: SynthesisReverseHostCapability,
  call = latestCall(harness, capability, "request"),
) {
  if (
    !harness.recorder.hostCalls.includes(call) ||
    call.capability !== capability
  )
    throw new Error(
      "synthesis_reverse_host_request_not_recorded:" + capability,
    );
  if (
    !observations(harness, capability).some(
      (event) =>
        event.phase === "call-started" &&
        event.identities?.operation === call.operationId,
    )
  )
    throw new Error(
      "synthesis_reverse_host_request_not_transported:" + capability,
    );
  if (rebuildOutcome(capability, "request", call.payload) !== "accepted")
    throw new Error(
      "synthesis_reverse_host_request_rejected_by_typescript:" + capability,
    );
  rebuildSynthesisReverseHostPayload(capability, call.payload);
  record(capability, "request", "accepted");
  appendSynthesisProtocolObservation(
    synthesisProtocolExecutionIdentity()!,
    registry.capabilities.find((entry) => entry.capability === capability)!
      .requestSchemaRef,
    call.payload,
  );
  // Guard only: a TypeScript-only rejection says nothing about the native side,
  // so it is asserted here and never recorded as cross-language evidence.
  if (
    rebuildOutcome(capability, "request", mutated(call.payload)) !== "rejected"
  )
    throw new Error(
      "synthesis_reverse_host_request_mutation_admitted:" + capability,
    );
}

/**
 * The call-completed observation only proves transport receipt of this exact
 * result, so it is required to carry the operation id of the recorded call.
 * Typed consumption is the caller's client-visible success assertion.
 */
export function recordSynthesisReverseHostResultAcceptance(
  harness: SynthesisProductionRouteHarness,
  capability: SynthesisReverseHostCapability,
  call = latestCall(harness, capability, "result"),
) {
  if (
    !harness.recorder.hostCalls.includes(call) ||
    call.capability !== capability
  )
    throw new Error("synthesis_reverse_host_result_not_recorded:" + capability);
  if (
    !observations(harness, capability).some(
      (event) =>
        event.phase === "call-completed" &&
        event.outcome === "succeeded" &&
        event.identities?.operation === call.operationId,
    )
  )
    throw new Error("synthesis_reverse_host_result_not_consumed:" + capability);
  if (rebuildOutcome(capability, "result", call.result) !== "accepted")
    throw new Error(
      "synthesis_reverse_host_result_rejected_by_typescript:" + capability,
    );
  rebuildSynthesisReverseHostResult(
    capability,
    call.result,
    rebuildSynthesisReverseHostPayload(capability, call.payload),
  );
  record(capability, "result", "accepted");
  appendSynthesisProtocolObservation(
    synthesisProtocolExecutionIdentity()!,
    registry.capabilities.find((entry) => entry.capability === capability)!
      .resultSchemaRef,
    call.result,
  );
}

/**
 * Records the typed error transport the sidecar really consumed. The sidecar
 * reports the envelope code when it decoded the error as the declared Reverse
 * Host error contract and its own envelope-invalid code otherwise; the recorded
 * outcome has to agree with that observable behaviour.
 */
export function recordSynthesisReverseHostErrorEvidence(args: {
  harness: SynthesisProductionRouteHarness;
  capability: SynthesisReverseHostCapability;
  nativeFailureCode: string;
}) {
  if (!args.nativeFailureCode)
    throw new Error("synthesis_reverse_host_native_code_missing");
  const call = latestCall(args.harness, args.capability, "error");
  if (!call.error)
    throw new Error(
      "synthesis_reverse_host_error_envelope_missing:" + args.capability,
    );
  const failure = observations(args.harness, args.capability).find(
    (event) =>
      event.phase === "call-failed" &&
      event.outcome === "failed" &&
      event.identities?.operation === call.operationId,
  );
  if (!failure || failure.code !== args.nativeFailureCode)
    throw new Error(
      "synthesis_reverse_host_error_not_consumed:" + args.capability,
    );
  const outcome = rebuildReverseHostErrorOutcome(call.error);
  const decodedBySidecar =
    args.nativeFailureCode !== "reverse_host_response_envelope_invalid";
  if (decodedBySidecar !== (outcome === "accepted"))
    throw new Error(
      "synthesis_reverse_host_error_parity_mismatch:" + args.capability,
    );
  record(args.capability, "error", outcome);
  if (outcome === "accepted")
    appendSynthesisProtocolObservation(
      synthesisProtocolExecutionIdentity()!,
      registry.capabilities.find(
        (entry) => entry.capability === args.capability,
      )!.errorSchemaRef,
      call.error,
    );
}

/**
 * Records only the negative outcome of a malformed host response the sidecar
 * really received: the client-visible failure code it reported and production
 * TypeScript rejecting that same root. A TypeScript-only rejection is never
 * recorded here.
 */
export function recordSynthesisReverseHostResultRejection(args: {
  harness: SynthesisProductionRouteHarness;
  capability: SynthesisReverseHostCapability;
  nativeFailureCode: string;
}) {
  if (!args.nativeFailureCode)
    throw new Error("synthesis_reverse_host_native_failure_code_missing");
  const call = latestCall(args.harness, args.capability, "result");
  if (
    !observations(args.harness, args.capability).some(
      (event) =>
        event.phase === "call-completed" &&
        event.identities?.operation === call.operationId,
    )
  )
    throw new Error(
      "synthesis_reverse_host_rejected_result_not_transported:" +
        args.capability,
    );
  if (rebuildOutcome(args.capability, "result", call.result) !== "rejected")
    throw new Error(
      "synthesis_reverse_host_rejected_result_admitted_by_typescript:" +
        args.capability,
    );
  let rejected = false;
  try {
    rebuildSynthesisReverseHostResult(
      args.capability,
      call.result,
      rebuildSynthesisReverseHostPayload(args.capability, call.payload),
    );
  } catch (error) {
    if (!(error instanceof SynthesisClientError)) throw error;
    rejected = true;
  }
  if (!rejected)
    throw new Error(
      "synthesis_reverse_host_rejected_result_admitted_by_host_rebuilder:" +
        args.capability,
    );
  record(args.capability, "result", "rejected");
}
