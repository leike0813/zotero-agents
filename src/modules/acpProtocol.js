export const ACP_PROTOCOL_VERSION = 1;
export const ACP_AGENT_METHODS = {
    authenticate: "authenticate",
    initialize: "initialize",
    session_cancel: "session/cancel",
    session_load: "session/load",
    session_new: "session/new",
    session_prompt: "session/prompt",
    session_resume: "session/resume",
    session_set_config_option: "session/set_config_option",
    session_set_mode: "session/set_mode",
    session_set_model: "session/set_model",
};
export const ACP_CLIENT_METHODS = {
    session_request_permission: "session/request_permission",
    session_update: "session/update",
};
export class RequestError extends Error {
    code;
    data;
    constructor(code, message, data) {
        super(message);
        this.name = "RequestError";
        this.code = code;
        this.data = data;
    }
    static methodNotFound(method) {
        return new RequestError(-32601, `Method not found: ${method}`);
    }
    static invalidParams(data) {
        return new RequestError(-32602, "Invalid params", data);
    }
    static internalError(data) {
        return new RequestError(-32603, "Internal error", data);
    }
    static fromJsonRpc(error) {
        return new RequestError(Number(error?.code || 0), String(error?.message || "Request failed"), error?.data);
    }
    toResult() {
        return {
            error: {
                code: this.code,
                message: this.message,
                data: this.data,
            },
        };
    }
}
export function isJsonRpcRequest(message) {
    return (!!message &&
        typeof message === "object" &&
        "method" in message &&
        "id" in message);
}
export function isJsonRpcNotification(message) {
    return (!!message &&
        typeof message === "object" &&
        "method" in message &&
        !("id" in message));
}
export function isJsonRpcResponse(message) {
    return (!!message &&
        typeof message === "object" &&
        "id" in message &&
        ("result" in message || "error" in message));
}
