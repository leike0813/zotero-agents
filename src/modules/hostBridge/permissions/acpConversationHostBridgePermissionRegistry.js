const handlersByConversationId = new Map();
function normalizeString(value) {
    return String(value || "").trim();
}
export function registerAcpConversationHostBridgePermissionHandler(conversationIdRaw, handler) {
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
export function setAcpConversationHostBridgePermissionRequest(conversationIdRaw, request) {
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
