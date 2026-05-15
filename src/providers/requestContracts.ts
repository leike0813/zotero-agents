import {
  ACP_BACKEND_TYPE,
  ACP_PROMPT_REQUEST_KIND,
  ACP_SKILL_RUN_REQUEST_KIND,
  DEFAULT_BACKEND_TYPE,
  PASS_THROUGH_BACKEND_TYPE,
  PASS_THROUGH_REQUEST_KIND,
} from "../config/defaults";

type ProviderRequestContractDefinition = {
  providerType: string;
  backendType: string;
  compatiblePairs?: Array<{ providerType: string; backendType: string }>;
  validatePayload: (request: unknown) => string | null;
};

const PROVIDER_REQUEST_CONTRACTS: Record<
  string,
  ProviderRequestContractDefinition
> = {
  "skillrunner.job.v1": {
    providerType: DEFAULT_BACKEND_TYPE,
    backendType: DEFAULT_BACKEND_TYPE,
    validatePayload: validateSkillRunnerJobPayload,
  },
  "generic-http.request.v1": {
    providerType: "generic-http",
    backendType: "generic-http",
    validatePayload: validateGenericHttpRequestPayload,
  },
  "generic-http.steps.v1": {
    providerType: "generic-http",
    backendType: "generic-http",
    validatePayload: validateGenericHttpStepsPayload,
  },
  [ACP_PROMPT_REQUEST_KIND]: {
    providerType: ACP_BACKEND_TYPE,
    backendType: ACP_BACKEND_TYPE,
    validatePayload: validateAcpPromptPayload,
  },
  [ACP_SKILL_RUN_REQUEST_KIND]: {
    providerType: ACP_BACKEND_TYPE,
    backendType: ACP_BACKEND_TYPE,
    validatePayload: validateAcpSkillRunPayload,
  },
  [PASS_THROUGH_REQUEST_KIND]: {
    providerType: PASS_THROUGH_BACKEND_TYPE,
    backendType: PASS_THROUGH_BACKEND_TYPE,
    validatePayload: validatePassThroughPayload,
  },
};

export type ProviderRequestContractCategory =
  | "provider_contract_error"
  | "provider_backend_mismatch"
  | "request_kind_unsupported"
  | "request_payload_invalid";

export type ProviderRequestContractReason =
  | "request_kind_missing"
  | "unsupported_request_kind"
  | "backend_type_mismatch"
  | "provider_type_mismatch"
  | "provider_not_registered"
  | "invalid_request_payload";

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function normalizeRequestKind(value: unknown) {
  return String(value || "").trim();
}

function getCompatiblePairs(contract: ProviderRequestContractDefinition) {
  return contract.compatiblePairs?.length
    ? contract.compatiblePairs
    : [
        {
          providerType: contract.providerType,
          backendType: contract.backendType,
        },
      ];
}

function validateSkillRunnerJobPayload(request: unknown) {
  if (!isObject(request)) {
    return "payload must be object";
  }
  if (String(request.kind || "").trim() !== "skillrunner.job.v1") {
    return "payload.kind must be skillrunner.job.v1";
  }
  if (!isNonEmptyString(request.skill_id)) {
    return "payload.skill_id must be non-empty string";
  }
  if (!Object.prototype.hasOwnProperty.call(request, "upload_files")) {
    return null;
  }
  if (!Array.isArray(request.upload_files)) {
    return "payload.upload_files must be array when provided";
  }
  if (request.upload_files.length === 0) {
    return null;
  }

  if (!isObject(request.input)) {
    return "payload.input must be object when payload.upload_files is non-empty";
  }

  const seenKeys = new Set<string>();
  const seenRelativePaths = new Set<string>();
  for (let i = 0; i < request.upload_files.length; i++) {
    const entry = request.upload_files[i];
    if (!isObject(entry)) {
      return `payload.upload_files[${i}] must be object`;
    }
    const key = String(entry.key || "").trim();
    const localPath = String(entry.path || "").trim();
    if (!key) {
      return `payload.upload_files[${i}].key must be non-empty string`;
    }
    if (!localPath) {
      return `payload.upload_files[${i}].path must be non-empty string`;
    }
    if (seenKeys.has(key)) {
      return `payload.upload_files contains duplicated key: ${key}`;
    }
    seenKeys.add(key);

    if (!Object.prototype.hasOwnProperty.call(request.input, key)) {
      return `payload.input.${key} must be declared for upload mapping`;
    }
    const relativePath = String((request.input as Record<string, unknown>)[key] || "")
      .trim()
      .replace(/\\/g, "/")
      .replace(/^\.\/+/, "");
    if (!relativePath) {
      return `payload.input.${key} must be non-empty upload relative path`;
    }
    if (/^[A-Za-z]:\//.test(relativePath) || relativePath.startsWith("/")) {
      return `payload.input.${key} must be relative path under uploads root`;
    }
    if (relativePath.startsWith("uploads/")) {
      return `payload.input.${key} must not include uploads/ prefix`;
    }
    const segments = relativePath.split("/").filter(Boolean);
    if (
      segments.length === 0 ||
      segments.some((segment) => segment === "." || segment === "..")
    ) {
      return `payload.input.${key} must not contain '.' or '..' path segments`;
    }
    const normalizedRelativePath = segments.join("/");
    if (seenRelativePaths.has(normalizedRelativePath)) {
      return `payload.input maps duplicated upload target path: ${normalizedRelativePath}`;
    }
    seenRelativePaths.add(normalizedRelativePath);
  }
  return null;
}

function validateGenericHttpRequestPayload(request: unknown) {
  if (!isObject(request)) {
    return "payload must be object";
  }
  if (!isObject(request.request)) {
    return "payload.request must be object";
  }
  if (!isNonEmptyString(request.request.method)) {
    return "payload.request.method must be non-empty string";
  }
  if (!isNonEmptyString(request.request.path)) {
    return "payload.request.path must be non-empty string";
  }
  return null;
}

function validateGenericHttpStepsPayload(request: unknown) {
  if (!isObject(request)) {
    return "payload must be object";
  }
  if (!Array.isArray(request.steps) || request.steps.length === 0) {
    return "payload.steps must be non-empty array";
  }
  return null;
}

function validatePassThroughPayload(request: unknown) {
  if (!isObject(request)) {
    return "payload must be object";
  }
  if (String(request.kind || "").trim() !== PASS_THROUGH_REQUEST_KIND) {
    return `payload.kind must be ${PASS_THROUGH_REQUEST_KIND}`;
  }
  if (!Object.prototype.hasOwnProperty.call(request, "selectionContext")) {
    return "payload.selectionContext is required";
  }
  return null;
}

function validateAcpPromptPayload(request: unknown) {
  if (!isObject(request)) {
    return "payload must be object";
  }
  if (String(request.kind || "").trim() !== ACP_PROMPT_REQUEST_KIND) {
    return `payload.kind must be ${ACP_PROMPT_REQUEST_KIND}`;
  }
  if (!isNonEmptyString(request.message)) {
    return "payload.message must be non-empty string";
  }
  if (
    typeof request.hostContext !== "undefined" &&
    !isObject(request.hostContext)
  ) {
    return "payload.hostContext must be object when provided";
  }
  return null;
}

function validateAcpSkillRunPayload(request: unknown) {
  if (!isObject(request)) {
    return "payload must be object";
  }
  if (String(request.kind || "").trim() !== ACP_SKILL_RUN_REQUEST_KIND) {
    return `payload.kind must be ${ACP_SKILL_RUN_REQUEST_KIND}`;
  }
  if (!isNonEmptyString(request.skill_id)) {
    return "payload.skill_id must be non-empty string";
  }
  if (Object.prototype.hasOwnProperty.call(request, "upload_files")) {
    return "payload.upload_files is not allowed for acp.skill.run.v1";
  }
  if (!isObject(request.input)) {
    return null;
  }
  for (const [key, value] of Object.entries(request.input)) {
    if (typeof value !== "string") {
      continue;
    }
    const normalized = value.trim().replace(/\\/g, "/").replace(/^\.\/+/, "");
    if (
      normalized === "inputs" ||
      normalized.startsWith("inputs/") ||
      normalized.startsWith("uploads/")
    ) {
      return `payload.input.${key} must be a local absolute path, not upload-relative path`;
    }
  }
  return null;
}

function buildContractErrorMessage(args: {
  category: ProviderRequestContractCategory;
  reason: ProviderRequestContractReason;
  requestKind?: string;
  backendType?: string;
  providerId?: string;
  detail?: string;
}) {
  const parts = [
    `category=${args.category}`,
    `reason=${args.reason}`,
    `requestKind=${String(args.requestKind || "")}`,
    `backendType=${String(args.backendType || "")}`,
    `providerId=${String(args.providerId || "")}`,
  ];
  if (String(args.detail || "").trim()) {
    parts.push(`detail=${String(args.detail).trim()}`);
  }
  return `Provider request contract error (${parts.join(", ")})`;
}

export class ProviderRequestContractError extends Error {
  readonly category: ProviderRequestContractCategory;

  readonly reason: ProviderRequestContractReason;

  readonly requestKind?: string;

  readonly backendType?: string;

  readonly providerId?: string;

  readonly detail?: string;

  constructor(args: {
    category: ProviderRequestContractCategory;
    reason: ProviderRequestContractReason;
    requestKind?: string;
    backendType?: string;
    providerId?: string;
    detail?: string;
  }) {
    super(
      buildContractErrorMessage({
        category: args.category,
        reason: args.reason,
        requestKind: args.requestKind,
        backendType: args.backendType,
        providerId: args.providerId,
        detail: args.detail,
      }),
    );
    this.name = "ProviderRequestContractError";
    this.category = args.category;
    this.reason = args.reason;
    this.requestKind = args.requestKind;
    this.backendType = args.backendType;
    this.providerId = args.providerId;
    this.detail = args.detail;
  }
}

export function assertRequestKindSupported(requestKind: unknown) {
  const normalized = normalizeRequestKind(requestKind);
  if (!normalized) {
    throw new ProviderRequestContractError({
      category: "request_kind_unsupported",
      reason: "request_kind_missing",
      requestKind: normalized,
      detail: "requestKind is required",
    });
  }
  const contract = PROVIDER_REQUEST_CONTRACTS[normalized];
  if (!contract) {
    throw new ProviderRequestContractError({
      category: "request_kind_unsupported",
      reason: "unsupported_request_kind",
      requestKind: normalized,
    });
  }
  return {
    requestKind: normalized,
    contract,
  };
}

export function assertRequestKindBackendCompatible(args: {
  requestKind: unknown;
  backendType: unknown;
}) {
  const normalizedBackendType = String(args.backendType || "").trim();
  const resolved = assertRequestKindSupported(args.requestKind);
  const matchedPair = getCompatiblePairs(resolved.contract).find(
    (pair) => pair.backendType === normalizedBackendType,
  );
  if (!matchedPair) {
    throw new ProviderRequestContractError({
      category: "provider_backend_mismatch",
      reason: "backend_type_mismatch",
      requestKind: resolved.requestKind,
      backendType: normalizedBackendType,
      providerId: resolved.contract.providerType,
      detail: `expected backendType=${getCompatiblePairs(resolved.contract)
        .map((pair) => pair.backendType)
        .join("|")}`,
    });
  }
  return {
    ...resolved,
    backendType: normalizedBackendType,
    providerType: matchedPair.providerType,
  };
}

export function assertRequestKindProviderCompatible(args: {
  requestKind: unknown;
  providerId: unknown;
}) {
  const normalizedProviderId = String(args.providerId || "").trim();
  const resolved = assertRequestKindSupported(args.requestKind);
  if (
    !getCompatiblePairs(resolved.contract).some(
      (pair) => pair.providerType === normalizedProviderId,
    )
  ) {
    throw new ProviderRequestContractError({
      category: "provider_contract_error",
      reason: "provider_type_mismatch",
      requestKind: resolved.requestKind,
      providerId: normalizedProviderId,
      detail: `expected providerId=${getCompatiblePairs(resolved.contract)
        .map((pair) => pair.providerType)
        .join("|")}`,
    });
  }
  return {
    ...resolved,
    providerId: normalizedProviderId,
  };
}

export function assertRequestPayloadContract(args: {
  requestKind: unknown;
  request: unknown;
}) {
  const resolved = assertRequestKindSupported(args.requestKind);
  const detail = resolved.contract.validatePayload(args.request);
  if (detail) {
    throw new ProviderRequestContractError({
      category: "request_payload_invalid",
      reason: "invalid_request_payload",
      requestKind: resolved.requestKind,
      detail,
    });
  }
  return resolved;
}

export function assertProviderRequestDispatchContract(args: {
  requestKind: unknown;
  backendType: unknown;
  providerId: unknown;
  request: unknown;
}) {
  const byBackend = assertRequestKindBackendCompatible({
    requestKind: args.requestKind,
    backendType: args.backendType,
  });
  const byProvider = assertRequestKindProviderCompatible({
    requestKind: byBackend.requestKind,
    providerId: args.providerId,
  });
  const normalizedProviderId = String(args.providerId || "").trim();
  const normalizedBackendType = String(args.backendType || "").trim();
  const pairMatched = getCompatiblePairs(byProvider.contract).some(
    (pair) =>
      pair.providerType === normalizedProviderId &&
      pair.backendType === normalizedBackendType,
  );
  if (!pairMatched) {
    throw new ProviderRequestContractError({
      category: "provider_backend_mismatch",
      reason: "backend_type_mismatch",
      requestKind: byProvider.requestKind,
      backendType: normalizedBackendType,
      providerId: normalizedProviderId,
      detail: "request kind does not allow this provider/backend pair",
    });
  }
  assertRequestPayloadContract({
    requestKind: byProvider.requestKind,
    request: args.request,
  });
  return byProvider;
}
