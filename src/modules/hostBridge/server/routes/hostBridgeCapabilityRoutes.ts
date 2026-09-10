import {
  getHostBridgeCapability,
  isCanonicalMutationProjectionCapability,
  HostBridgeCapabilityContractError,
  HostBridgeWorkflowProductError,
  executeHostBridgeCapability,
  type HostBridgeCapabilityContext,
} from "../../../hostBridgeCapabilityRegistry";
import { validateHostBridgeCapabilityInput } from "../hostBridgeCapabilityContract";
import {
  HostBridgePermissionError,
  requestHostBridgePermission,
  type HostBridgePermissionScope,
} from "../../permissions/hostBridgePermissionManager";
import { isHostBridgeWriteAutoApprovalScope } from "../../permissions/hostBridgeWriteAutoApprovalRegistry";
import {
  resolveZoteroHostCapabilityBroker,
  ZoteroHostCapabilityError,
} from "../../../zoteroHostCapabilityBroker";
import { ZoteroLibraryCursorError } from "../../../zoteroHost/zoteroLibraryPageQuery";
import {
  SynthesisClientError,
  type SynthesisClient,
} from "../../../../../packages/synthesis-contracts/src/index";
import type { DirectResearchBundleApplication } from "../../workflow/researchBundleService";
import type {
  JsonObject,
  MutationPreviewResult,
  WorkflowCallControl,
} from "../../../../workflows/types";
import { HostBridgeCursorError } from "../hostBridgePagination";
import type {
  HostBridgeCallRequest,
  HostBridgeConnectionMode,
  HostBridgeStatusSnapshot,
} from "../hostBridgeProtocol";
import { hostBridgeError, hostBridgeOk } from "../hostBridgeProtocol";
import type { HostHttpRequest } from "../hostHttpRequestReader";
import { parseHostHttpJsonBody } from "../hostHttpRequestReader";
import type {
  HostBridgeRouteAdmission,
  HostBridgeRouteMatch,
  HostBridgeRouteRespond,
} from "../hostBridgeRouteContract";

export type HostBridgeCapabilityRouteContext = {
  respond: HostBridgeRouteRespond;
  getStatus: () => HostBridgeStatusSnapshot;
  getConnectionMode: () => HostBridgeConnectionMode;
  getOperationId: () => string;
  getPermissionScope: () => HostBridgePermissionScope | null;
  navigationScopeAllowed: () => boolean;
  getWorkflowCallControl: () => WorkflowCallControl | undefined;
  resolveSynthesisClient?: () => SynthesisClient | Promise<SynthesisClient>;
  resolveDirectResearchBundleApplication?: () =>
    | DirectResearchBundleApplication
    | Promise<DirectResearchBundleApplication>;
};

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error || "");
}

function methodNotAllowed(
  context: HostBridgeCapabilityRouteContext,
  message: string,
  allow: string,
) {
  return context.respond(
    405,
    "Method Not Allowed",
    hostBridgeError("method_not_allowed", message, "routing", { allow }),
    "method_not_allowed",
  );
}

function permissionErrorResponse(
  context: HostBridgeCapabilityRouteContext,
  error: HostBridgePermissionError,
) {
  const status =
    error.code === "permission_timeout"
      ? 408
      : error.code === "permission_ui_unavailable"
        ? 503
        : 403;
  const reason =
    status === 408
      ? "Request Timeout"
      : status === 503
        ? "Service Unavailable"
        : "Forbidden";
  return context.respond(
    status,
    reason,
    hostBridgeError(error.code, error.message, "permission", {
      decision: error.decision,
    }),
    error.code,
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function compactApprovalText(value: unknown, limit: number) {
  const text = String(value || "").trim();
  if (text.length <= limit) return text;
  return text.slice(0, Math.max(0, limit)) + "...[truncated]";
}

function buildDebugZoteroEvalApprovalPrompt(input: unknown) {
  const object = isRecord(input) ? input : {};
  const codePreview = compactApprovalText(object.code, 500);
  return {
    title: "Approve Zotero debug eval?",
    summary:
      "Run an approved debug script with access to arbitrary Zotero APIs.",
    detail: [
      "Capability: debug.zotero.eval.",
      "Risk: this code can read or modify Zotero state depending on what it does.",
      "Source: zotero-bridge CLI.",
      codePreview ? "Code preview:\n" + codePreview : "Code preview: (empty)",
    ].join("\n"),
  };
}

function buildCanonicalMutationApprovalPrompt(
  preview: MutationPreviewResult<JsonObject>,
) {
  const effect = preview.outcome === "would_change" ? "change" : "verification";
  return {
    title: "Approve Zotero mutation?",
    summary:
      "Apply the planned Zotero " +
      effect +
      ' for "' +
      preview.operation +
      '"?',
    detail: [
      "Operation: " + preview.operation + ".",
      "Planned outcome: " + preview.outcome + ".",
      "Zotero will revalidate this plan immediately before execution.",
      "Source: zotero-bridge CLI.",
    ].join("\n"),
  };
}

function buildCapabilityApprovalPrompt(
  capability: NonNullable<ReturnType<typeof getHostBridgeCapability>>,
  input: unknown,
) {
  if (capability.name === "debug.zotero.eval") {
    return buildDebugZoteroEvalApprovalPrompt(input);
  }
  if (capability.name === "workflow_products.remove") {
    const productId = String(
      (input as Record<string, unknown>)?.productId || "",
    ).trim();
    return {
      title: "Remove Dashboard Product record?",
      summary: productId
        ? 'Remove Dashboard Product record "' + productId + '".'
        : "Remove a Dashboard Product record.",
      detail:
        "Managed asset files are retained for persistence cleanup and are not deleted immediately.",
    };
  }
  if (
    capability.name === "reference_sidecar.refresh" ||
    capability.name === "citation_graph.update"
  ) {
    const object = isRecord(input) ? input : {};
    const paperRefs = Array.isArray(object.paper_refs || object.paperRefs)
      ? ((object.paper_refs || object.paperRefs) as unknown[])
          .map((entry) => String(entry || "").trim())
          .filter(Boolean)
      : [];
    const scope = String(
      object.scope || (paperRefs.length ? "papers" : "library"),
    ).trim();
    const sidecar = capability.name === "reference_sidecar.refresh";
    return {
      title: sidecar
        ? "Refresh the references sidecar?"
        : "Update the citation graph?",
      summary: sidecar
        ? "Refresh reference facts for " +
          (scope === "papers"
            ? paperRefs.length + " paper(s)"
            : "the current library") +
          "."
        : "Update the citation graph for " +
          (scope === "papers"
            ? paperRefs.length + " paper closure(s)"
            : "the current library") +
          ".",
      detail: [
        "Capability: " + capability.name + ".",
        "Scope: " + scope + ".",
        paperRefs.length
          ? "Paper refs: " +
            paperRefs.slice(0, 10).join(", ") +
            (paperRefs.length > 10
              ? " and " + (paperRefs.length - 10) + " more"
              : "") +
            "."
          : "Paper refs: full library scope.",
        sidecar
          ? "This approval does not update the citation graph."
          : "This approval does not refresh reference-sidecar facts.",
      ].join("\n"),
    };
  }
  return {
    title: "Approve Host Bridge action?",
    summary: 'Run "' + capability.name + '" from zotero-bridge.',
    detail: [
      "Capability: " + capability.name + ".",
      capability.summary ? "Purpose: " + capability.summary + "." : "",
      "Source: zotero-bridge CLI.",
    ]
      .filter(Boolean)
      .join("\n"),
  };
}

function capabilityAdmission(
  request: HostHttpRequest,
): HostBridgeRouteAdmission {
  if (request.method === "GET") return "read";
  try {
    const payload = parseHostHttpJsonBody(
      request.body,
    ) as HostBridgeCallRequest;
    const capabilityName = String(payload.capability || "").trim();
    if (isCanonicalMutationProjectionCapability(capabilityName)) {
      return "canonical-mutation";
    }
    return getHostBridgeCapability(capabilityName)?.requestEffect ===
      "state-change"
      ? "generic-operation"
      : "read";
  } catch {
    return "read";
  }
}

function contextErrorResponse(
  context: HostBridgeCapabilityRouteContext,
  error: unknown,
) {
  if (error instanceof ZoteroHostCapabilityError) {
    const details = error.details as Record<string, unknown>;
    const notFound = error.code === "not_found";
    const transportCode =
      error.code === "invalid_ref"
        ? "invalid_object_ref"
        : error.code === "invalid_request"
          ? "invalid_object_ref"
          : error.code === "not_found"
            ? details.kind === "note"
              ? "note_not_found"
              : details.kind === "collection"
                ? "collection_not_found"
                : "item_not_found"
            : "context_navigation_failed";
    return context.respond(
      notFound ? 404 : 400,
      notFound ? "Not Found" : "Bad Request",
      hostBridgeError(
        transportCode,
        error.message,
        notFound ? "not_found" : "validation",
        error.details,
      ),
      transportCode,
    );
  }
  return context.respond(
    500,
    "Internal Server Error",
    hostBridgeError(
      "context_navigation_failed",
      errorMessage(error),
      "internal",
    ),
    "context_navigation_failed",
  );
}

function paginationErrorResponse(
  context: HostBridgeCapabilityRouteContext,
  error: HostBridgeCursorError,
) {
  return context.respond(
    400,
    "Bad Request",
    hostBridgeError("invalid_host_bridge_cursor", error.message, "validation", {
      reason: error.reason,
      ...error.details,
    }),
    "invalid_host_bridge_cursor",
  );
}

function requestPageInput(request: HostHttpRequest) {
  return {
    ...(request.query.limit === undefined
      ? {}
      : { limit: Number(request.query.limit) }),
    ...(request.query.cursor === undefined
      ? {}
      : { cursor: request.query.cursor }),
  };
}

async function callCapability(
  request: HostHttpRequest,
  context: HostBridgeCapabilityRouteContext,
) {
  if (request.method !== "POST") {
    return methodNotAllowed(
      context,
      "Capability call endpoint only supports POST",
      "POST",
    );
  }

  let payload: HostBridgeCallRequest;
  try {
    payload = parseHostHttpJsonBody(request.body) as HostBridgeCallRequest;
  } catch {
    return context.respond(
      400,
      "Bad Request",
      hostBridgeError(
        "invalid_capability_input",
        "Capability call request body must be valid JSON",
        "validation",
      ),
      "invalid_capability_input",
    );
  }

  const capabilityName = String(payload?.capability || "").trim();
  if (!capabilityName) {
    return context.respond(
      400,
      "Bad Request",
      hostBridgeError(
        "invalid_capability_input",
        "Capability call request requires a capability name",
        "validation",
      ),
      "invalid_capability_input",
    );
  }

  const capability = getHostBridgeCapability(capabilityName);
  if (!capability) {
    return context.respond(
      404,
      "Not Found",
      hostBridgeError(
        "capability_not_found",
        "Host Bridge capability not found",
        "capability",
        { capability: capabilityName },
      ),
      "capability_not_found",
    );
  }

  if (
    capabilityName.startsWith("navigation.") &&
    !context.navigationScopeAllowed()
  ) {
    return context.respond(
      403,
      "Forbidden",
      hostBridgeError(
        "permission_denied",
        "Navigation is unavailable for this Host Bridge scope",
        "permission",
        { reason: "navigation_scope_denied" },
      ),
      "navigation_scope_denied",
    );
  }

  const normalizedInput = payload.input ?? {};
  const inputViolations = validateHostBridgeCapabilityInput(
    capabilityName,
    normalizedInput,
  );
  if (inputViolations.length) {
    return context.respond(
      400,
      "Bad Request",
      hostBridgeError(
        "invalid_capability_input",
        "Capability input does not satisfy its executable contract",
        "validation",
        {
          schema: "host-bridge.argument-error.v1",
          phase: "capability_input",
          capability: capabilityName,
          violations: inputViolations,
          truncated: inputViolations.length >= 8,
        },
      ),
      "invalid_capability_input",
    );
  }

  if (isCanonicalMutationProjectionCapability(capabilityName)) {
    const inputOperationId = String(
      (normalizedInput as Record<string, unknown>).operationId || "",
    ).trim();
    const headerOperationId = context.getOperationId();
    if (
      headerOperationId &&
      inputOperationId &&
      headerOperationId !== inputOperationId
    ) {
      return context.respond(
        400,
        "Bad Request",
        hostBridgeError(
          "invalid_operation_id",
          "X-Zotero-Bridge-Operation-Id must match the mutation operationId",
          "validation",
          { headerOperationId, inputOperationId },
        ),
        "invalid_operation_id",
      );
    }
  }

  try {
    const requestOperationId = context.getOperationId();
    const permissionScope = context.getPermissionScope();
    const autoApprovedWrite =
      capability.category === "mutation" &&
      isHostBridgeWriteAutoApprovalScope(permissionScope);
    const canonicalMutationProjection =
      isCanonicalMutationProjectionCapability(capabilityName);
    const canonicalMutationExecute =
      canonicalMutationProjection &&
      (normalizedInput as Record<string, unknown>).dryRun !== true;
    const requestApproval = async (
      preview?: MutationPreviewResult<JsonObject>,
    ) => {
      const approvalPrompt = canonicalMutationExecute
        ? buildCanonicalMutationApprovalPrompt(
            preview as MutationPreviewResult<JsonObject>,
          )
        : buildCapabilityApprovalPrompt(capability, normalizedInput);
      await requestHostBridgePermission({
        action: capability.name,
        ...approvalPrompt,
        source: "host-bridge-cli",
        scope: permissionScope,
      });
    };
    if (
      capability.approval !== "none" &&
      !autoApprovedWrite &&
      !canonicalMutationProjection
    ) {
      await requestApproval();
    }
    const capabilityContext: HostBridgeCapabilityContext = {
      getStatus: context.getStatus,
      connectionMode: context.getConnectionMode(),
      ...(requestOperationId ? { operationId: requestOperationId } : {}),
      control: context.getWorkflowCallControl(),
      ...(canonicalMutationExecute &&
      capability.approval !== "none" &&
      !autoApprovedWrite
        ? { approveMutation: requestApproval }
        : {}),
      ...(context.resolveSynthesisClient
        ? { resolveSynthesisClient: context.resolveSynthesisClient }
        : {}),
      ...(context.resolveDirectResearchBundleApplication
        ? {
            resolveDirectResearchBundleApplication:
              context.resolveDirectResearchBundleApplication,
          }
        : {}),
    };
    const data = await executeHostBridgeCapability(
      capability.name,
      normalizedInput,
      capabilityContext,
    );
    return context.respond(
      200,
      "OK",
      hostBridgeOk({
        capability: capability.name,
        approval:
          canonicalMutationProjection &&
          (normalizedInput as Record<string, unknown>).dryRun === true
            ? "none"
            : autoApprovedWrite
              ? "auto-approved"
              : capability.approval,
        data,
      }),
    );
  } catch (error) {
    if (error instanceof HostBridgeCapabilityContractError) {
      const inputError = error.code === "invalid_capability_input";
      return context.respond(
        inputError ? 400 : 500,
        inputError ? "Bad Request" : "Internal Server Error",
        hostBridgeError(
          error.code,
          error.message,
          inputError ? "validation" : "internal",
          {
            schema: "host-bridge.argument-error.v1",
            phase: inputError ? "capability_input" : "command_result",
            capability: capability.name,
            violations: error.violations,
            truncated: error.violations.length >= 8,
          },
        ),
        error.code,
      );
    }
    if (error instanceof HostBridgePermissionError) {
      return permissionErrorResponse(context, error);
    }
    if (error instanceof HostBridgeWorkflowProductError) {
      return context.respond(
        error.httpStatus,
        error.statusText,
        hostBridgeError(error.code, error.message, error.category),
        error.code,
      );
    }
    if (error instanceof ZoteroLibraryCursorError) {
      return context.respond(
        400,
        "Bad Request",
        hostBridgeError(error.code, error.message, "validation", {
          capability: capability.name,
          retryable: false,
          ...(error.details || {}),
        }),
        error.code,
      );
    }
    if (error instanceof HostBridgeCursorError) {
      return paginationErrorResponse(context, error);
    }
    if (error instanceof SynthesisClientError) {
      const conflict = error.code === "conflict";
      const code = conflict
        ? "synthesis_maintenance_idempotency_conflict"
        : "invalid_capability_input";
      return context.respond(
        conflict ? 409 : 400,
        conflict ? "Conflict" : "Bad Request",
        hostBridgeError(
          code,
          "Invalid Synthesis maintenance request",
          "validation",
          {
            capability: capability.name,
            reasonCode:
              typeof error.details?.reasonCode === "string"
                ? error.details.reasonCode
                : error.code,
          },
        ),
        code,
      );
    }
    return context.respond(
      500,
      "Internal Server Error",
      hostBridgeError(
        "capability_failed",
        "Host Bridge capability failed",
        "capability",
        {
          capability: capability.name,
          message: errorMessage(error),
        },
      ),
      "capability_failed",
    );
  }
}

async function getCurrentContext(
  request: HostHttpRequest,
  context: HostBridgeCapabilityRouteContext,
) {
  if (request.method !== "GET") {
    return methodNotAllowed(
      context,
      "Context current endpoint only supports GET",
      "GET",
    );
  }
  try {
    const broker = resolveZoteroHostCapabilityBroker();
    if (
      !broker?.context ||
      typeof broker.context.getCurrentView !== "function"
    ) {
      throw new ZoteroHostCapabilityError(
        "unavailable",
        "Broker current-view capability is unavailable",
        { reason: "capability" },
      );
    }
    return context.respond(
      200,
      "OK",
      hostBridgeOk(broker.context.getCurrentView()),
    );
  } catch (error) {
    return contextErrorResponse(context, error);
  }
}

async function getCurrentSelection(
  request: HostHttpRequest,
  context: HostBridgeCapabilityRouteContext,
) {
  if (request.method !== "GET") {
    return methodNotAllowed(
      context,
      "Context selection endpoint only supports GET",
      "GET",
    );
  }
  try {
    const broker = resolveZoteroHostCapabilityBroker();
    if (
      !broker?.context ||
      typeof broker.context.getSelectedItems !== "function"
    ) {
      throw new ZoteroHostCapabilityError(
        "unavailable",
        "Broker selected-items capability is unavailable",
        { reason: "capability" },
      );
    }
    const page = await broker.context.getSelectedItems(
      requestPageInput(request),
      context.getWorkflowCallControl(),
    );
    return context.respond(200, "OK", hostBridgeOk(page));
  } catch (error) {
    return contextErrorResponse(context, error);
  }
}

export function matchHostBridgeCapabilityRoute(
  request: HostHttpRequest,
  context: HostBridgeCapabilityRouteContext,
): HostBridgeRouteMatch | null {
  if (request.path === "/bridge/v2/call") {
    return {
      admission: capabilityAdmission(request),
      handle: () => callCapability(request, context),
    };
  }
  if (request.path === "/bridge/v2/context/current") {
    return {
      admission: "read",
      handle: () => getCurrentContext(request, context),
    };
  }
  if (request.path === "/bridge/v2/context/selection") {
    return {
      admission: "read",
      handle: () => getCurrentSelection(request, context),
    };
  }
  return null;
}
