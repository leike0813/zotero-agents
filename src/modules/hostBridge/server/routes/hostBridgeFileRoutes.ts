import {
  HostBridgeFileRegistryError,
  registerHostBridgeUploadedFile,
  resolveHostBridgeFileDownload,
} from "../hostBridgeFileRegistry";
import { hostBridgeError, hostBridgeOk } from "../hostBridgeProtocol";
import type { HostHttpRequest } from "../hostHttpRequestReader";
import { safeDecodeHostHttpPath } from "../hostHttpRequestReader";
import type {
  HostBridgeRouteMatch,
  HostBridgeRouteRespond,
} from "../hostBridgeRouteContract";
import { prepareRuntimeFileHttpResponse } from "../runtimeHttpResponse";

export type HostBridgeFileRouteContext = {
  respond: HostBridgeRouteRespond;
  maxUploadBytes: number;
  recordSuccessfulDownload: () => void;
};

function fileErrorResponse(
  context: HostBridgeFileRouteContext,
  error: HostBridgeFileRegistryError,
) {
  const status =
    error.code === "invalid_file_id"
      ? 400
      : error.code === "file_not_found"
        ? 404
        : error.code === "file_handle_expired"
          ? 410
          : 404;
  return context.respond(
    status,
    status === 400 ? "Bad Request" : status === 410 ? "Gone" : "Not Found",
    hostBridgeError(error.code, error.message, "not_found", error.details),
    error.code,
  );
}

async function downloadFile(
  request: HostHttpRequest,
  context: HostBridgeFileRouteContext,
) {
  if (request.method !== "GET") {
    return context.respond(
      405,
      "Method Not Allowed",
      hostBridgeError(
        "method_not_allowed",
        "File download endpoint only supports GET",
        "routing",
        { allow: "GET" },
      ),
      "method_not_allowed",
    );
  }
  const fileId =
    safeDecodeHostHttpPath(request.path.slice("/bridge/v2/files/".length)) ||
    "";
  try {
    const download = await resolveHostBridgeFileDownload(fileId);
    context.recordSuccessfulDownload();
    return prepareRuntimeFileHttpResponse({
      filename: download.descriptor.displayName,
      contentType: download.descriptor.contentType,
      source: download.source,
      sha256: download.descriptor.sha256,
    });
  } catch (error) {
    if (error instanceof HostBridgeFileRegistryError) {
      return fileErrorResponse(context, error);
    }
    return context.respond(
      500,
      "Internal Server Error",
      hostBridgeError(
        "download_failed",
        "Host Bridge file download failed",
        "internal",
        {
          message: error instanceof Error ? error.message : String(error || ""),
        },
      ),
      "download_failed",
    );
  }
}

async function uploadFile(
  request: HostHttpRequest,
  context: HostBridgeFileRouteContext,
) {
  if (request.method !== "POST") {
    return context.respond(
      405,
      "Method Not Allowed",
      hostBridgeError(
        "method_not_allowed",
        "File upload endpoint only supports POST",
        "routing",
        { allow: "POST" },
      ),
      "method_not_allowed",
    );
  }
  if ((request.bodyByteLength || 0) <= 0) {
    return context.respond(
      400,
      "Bad Request",
      hostBridgeError(
        "upload_empty",
        "Uploaded file body is empty",
        "validation",
      ),
      "upload_empty",
    );
  }
  if ((request.bodyByteLength || 0) > context.maxUploadBytes) {
    return context.respond(
      413,
      "Payload Too Large",
      hostBridgeError(
        "upload_too_large",
        "Uploaded file body is too large",
        "validation",
        { maxBytes: context.maxUploadBytes },
      ),
      "upload_too_large",
    );
  }
  try {
    const descriptor = await registerHostBridgeUploadedFile({
      bytes: request.bodyBytes,
      displayName:
        request.headers["x-zotero-bridge-display-name"] ||
        request.query.displayName,
      contentType:
        request.headers["content-type"] ||
        request.headers["x-zotero-bridge-content-type"] ||
        "application/octet-stream",
    });
    return context.respond(200, "OK", hostBridgeOk({ file: descriptor }));
  } catch (error) {
    if (error instanceof HostBridgeFileRegistryError) {
      return fileErrorResponse(context, error);
    }
    return context.respond(
      500,
      "Internal Server Error",
      hostBridgeError(
        "upload_failed",
        "Host Bridge file upload failed",
        "internal",
        {
          message: error instanceof Error ? error.message : String(error || ""),
        },
      ),
      "upload_failed",
    );
  }
}

export function matchHostBridgeFileRoute(
  request: HostHttpRequest,
  context: HostBridgeFileRouteContext,
): HostBridgeRouteMatch | null {
  if (request.path === "/bridge/v2/files/upload") {
    return {
      admission: request.method === "GET" ? "read" : "generic-operation",
      handle: () => uploadFile(request, context),
    };
  }
  if (request.path.startsWith("/bridge/v2/files/")) {
    return {
      admission: "read",
      handle: () => downloadFile(request, context),
    };
  }
  return null;
}
