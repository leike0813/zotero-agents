import { withPackageRuntimeScope } from "../../lib/runtime.mjs";
import {
  __tagRegulatorRequestTestOnly,
  buildTagRegulatorStandaloneRequest,
} from "../../lib/tagRegulatorRequest.mjs";

async function buildRequestImpl(args) {
  try {
    return await buildTagRegulatorStandaloneRequest(args);
  } catch (error) {
    throw new Error(`tag-regulator buildRequest failed: ${String(error)}`);
  }
}

export async function buildRequest(args) {
  return withPackageRuntimeScope(args?.runtime, () => buildRequestImpl(args));
}

export const __tagRegulatorBuildRequestTestOnly = __tagRegulatorRequestTestOnly;
