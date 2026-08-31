import {
  ACP_BACKEND_TYPE,
  GENERIC_HTTP_BACKEND_TYPE,
  PASS_THROUGH_BACKEND_TYPE,
} from "../config/defaults";
import type { WorkflowManifest } from "./types";

export type WorkflowProviderRequirements = {
  requestKind: string;
  acceptedProviderTypes: string[];
};

export type WorkflowResultEvidence = {
  fetchType?: "bundle" | "result";
  resultJson?: string;
  artifacts: string[];
  applyBack: boolean;
};

export type WorkflowManifestContract = {
  executionModes: Array<"auto" | "interactive">;
  supportedInvocationModes: NonNullable<
    WorkflowManifest["supportedInvocationModes"]
  >;
  resourceRequirements: NonNullable<WorkflowManifest["resourceRequirements"]>;
  providerRequirements: WorkflowProviderRequirements;
  requiredWorkflowOptions: string[];
  resultEvidence: WorkflowResultEvidence;
  selection: {
    acceptsNoSelection: boolean;
    inputs: WorkflowManifest["inputs"];
    validation: WorkflowManifest["validateSelection"];
  };
};

export function compatibleBackendTypesForManifest(
  manifest: WorkflowManifest,
) {
  const providerType = String(manifest.provider || "").trim();
  const requestKind = String(manifest.request?.kind || "").trim();
  if (!providerType) {
    return [];
  }
  if (providerType === ACP_BACKEND_TYPE) {
    return requestKind === "skillrunner.sequence.v1"
      ? [ACP_BACKEND_TYPE, "skillrunner"]
      : [ACP_BACKEND_TYPE];
  }
  if (providerType === "skillrunner") {
    return ["skillrunner", ACP_BACKEND_TYPE];
  }
  if (providerType === GENERIC_HTTP_BACKEND_TYPE) {
    return [GENERIC_HTTP_BACKEND_TYPE];
  }
  if (providerType === PASS_THROUGH_BACKEND_TYPE) {
    return [PASS_THROUGH_BACKEND_TYPE];
  }
  return [providerType];
}

export function projectWorkflowManifestContract(
  manifest: WorkflowManifest,
): WorkflowManifestContract {
  const requestKind = String(manifest.request?.kind || "").trim();
  return {
    executionModes: [...(manifest.executionModes || ["auto"])],
    supportedInvocationModes: [
      ...(manifest.supportedInvocationModes || [
        "interactive",
        "non-interactive",
      ]),
    ],
    resourceRequirements: (manifest.resourceRequirements || []).map(
      (requirement) => ({
        ...requirement,
        ...(requirement.accept
          ? {
              accept: {
                ...requirement.accept,
                ...(requirement.accept.contentTypes
                  ? { contentTypes: [...requirement.accept.contentTypes] }
                  : {}),
                ...(requirement.accept.extensions
                  ? { extensions: [...requirement.accept.extensions] }
                  : {}),
              },
            }
          : {}),
      }),
    ),
    providerRequirements: {
      requestKind,
      acceptedProviderTypes: compatibleBackendTypesForManifest(manifest),
    },
    requiredWorkflowOptions: Object.entries(manifest.parameters || {})
      .filter(([, schema]) => schema.required === true)
      .map(([key]) => key),
    resultEvidence: {
      ...(manifest.result?.fetch?.type
        ? { fetchType: manifest.result.fetch.type }
        : {}),
      ...(manifest.result?.expects?.result_json
        ? { resultJson: manifest.result.expects.result_json }
        : {}),
      artifacts: [...(manifest.result?.expects?.artifacts || [])],
      applyBack: Boolean(manifest.hooks?.applyResult),
    },
    selection: {
      acceptsNoSelection: manifest.trigger.requiresSelection === false,
      inputs: manifest.inputs,
      validation: manifest.validateSelection,
    },
  };
}
