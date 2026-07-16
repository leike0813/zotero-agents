import {
  SYNTHESIS_REFERENCE_MATCHER_BINDING_ALGORITHM_VERSION,
  SYNTHESIS_REFERENCE_MATCHER_CONTRACT_VERSION,
  SYNTHESIS_REFERENCE_MATCHER_DEDUPE_ALGORITHM_VERSION,
  rebuildSynthesisReferenceBindingRequest,
  rebuildSynthesisReferenceBindingResult,
  rebuildSynthesisReferenceDedupeRequest,
  rebuildSynthesisReferenceDedupeResult,
  type ReferenceCanonicalDedupeInput,
  type ReferenceMatcherPaperInput,
  type ReferenceMatcherPolicyId,
  type ReferenceMatcherReferenceInput,
  type SynthesisReferenceBindingRequest,
  type SynthesisReferenceBindingResult,
  type SynthesisReferenceDedupeRequest,
  type SynthesisReferenceDedupeResult,
  type SynthesisReferenceMatcherEngine,
} from "../../../packages/synthesis-engine/src/referenceMatcher";

export type SynthesisReferenceBindingApplicationInput = {
  canonicalReferenceId: string;
  reference: ReferenceMatcherReferenceInput;
};

export function buildSynthesisReferenceBindingRequest(args: {
  papers: ReferenceMatcherPaperInput[];
  references: SynthesisReferenceBindingApplicationInput[];
  policyId?: ReferenceMatcherPolicyId;
}): SynthesisReferenceBindingRequest {
  return rebuildSynthesisReferenceBindingRequest({
    contractVersion: SYNTHESIS_REFERENCE_MATCHER_CONTRACT_VERSION,
    algorithmVersion: SYNTHESIS_REFERENCE_MATCHER_BINDING_ALGORITHM_VERSION,
    policyId: args.policyId || "production",
    papers: args.papers,
    references: args.references,
  });
}

export function buildSynthesisReferenceDedupeRequest(
  canonicals: ReferenceCanonicalDedupeInput[],
): SynthesisReferenceDedupeRequest {
  return rebuildSynthesisReferenceDedupeRequest({
    contractVersion: SYNTHESIS_REFERENCE_MATCHER_CONTRACT_VERSION,
    algorithmVersion: SYNTHESIS_REFERENCE_MATCHER_DEDUPE_ALGORITHM_VERSION,
    canonicals,
  });
}

export async function computeSynthesisReferenceBindingsWithEngine(args: {
  engine: SynthesisReferenceMatcherEngine;
  request: SynthesisReferenceBindingRequest;
}): Promise<SynthesisReferenceBindingResult> {
  return rebuildSynthesisReferenceBindingResult(
    await args.engine.matchBindings(args.request),
    args.request,
  );
}

export async function computeSynthesisReferenceDedupeWithEngine(args: {
  engine: SynthesisReferenceMatcherEngine;
  request: SynthesisReferenceDedupeRequest;
}): Promise<SynthesisReferenceDedupeResult> {
  return rebuildSynthesisReferenceDedupeResult(
    await args.engine.dedupeCanonicals(args.request),
    args.request,
  );
}
