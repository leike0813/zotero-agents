import {
  MANAGED_LOCAL_BACKEND_ID,
  normalizeManagedLocalBackendId,
} from "./identity";
import { resolveManagedLocalBackendDisplayNameText } from "../utils/localizationGovernance";

export function resolveBackendDisplayName(
  backendId: string,
  configuredDisplayName?: string,
) {
  const normalized = normalizeManagedLocalBackendId(backendId);
  const configured = String(configuredDisplayName || "").trim();
  if (!normalized) {
    return "";
  }
  if (normalized === MANAGED_LOCAL_BACKEND_ID) {
    return resolveManagedLocalBackendDisplayNameText();
  }
  if (configured) {
    return configured;
  }
  return normalized;
}
