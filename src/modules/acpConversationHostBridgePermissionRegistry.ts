import type { RequestPermissionOutcome } from "./acpProtocol";
import type { AcpPendingPermissionRequest } from "./acpTypes";

type AcpConversationHostBridgePermissionRequest =
  AcpPendingPermissionRequest & {
    resolve: (outcome: RequestPermissionOutcome) => void;
  };

type AcpConversationHostBridgePermissionHandler = (
  request: AcpConversationHostBridgePermissionRequest,
) => void;

const handlersByConversationId = new Map<
  string,
  AcpConversationHostBridgePermissionHandler
>();

function normalizeString(value: unknown) {
  return String(value || "").trim();
}

export function registerAcpConversationHostBridgePermissionHandler(
  conversationIdRaw: string,
  handler: AcpConversationHostBridgePermissionHandler,
) {
  const conversationId = normalizeString(conversationIdRaw);
  if (!conversationId) {
    return () => undefined;
  }
  handlersByConversationId.set(conversationId, handler);
  return () => {
    if (handlersByConversationId.get(conversationId) === handler) {
      handlersByConversationId.delete(conversationId);
    }
  };
}

export function setAcpConversationHostBridgePermissionRequest(
  conversationIdRaw: string,
  request: AcpConversationHostBridgePermissionRequest,
) {
  const conversationId = normalizeString(conversationIdRaw);
  const requestId = normalizeString(request.requestId);
  if (!conversationId || !requestId) {
    return false;
  }
  const handler = handlersByConversationId.get(conversationId);
  if (!handler) {
    return false;
  }
  handler(request);
  return true;
}

export function resetAcpConversationHostBridgePermissionHandlersForTests() {
  handlersByConversationId.clear();
}
