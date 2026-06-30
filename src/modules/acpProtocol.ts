import type { AcpPermissionOptionKind } from "./acpPermissionOptions";

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
} as const;

export const ACP_CLIENT_METHODS = {
  session_request_permission: "session/request_permission",
  session_update: "session/update",
} as const;

export type JsonRpcVersion = "2.0";
export type JsonRpcId = string | number | null;

export type JsonRpcRequest = {
  jsonrpc: JsonRpcVersion;
  id: JsonRpcId;
  method: string;
  params?: unknown;
};

export type JsonRpcNotification = {
  jsonrpc: JsonRpcVersion;
  method: string;
  params?: unknown;
};

export type JsonRpcErrorObject = {
  code: number;
  message: string;
  data?: unknown;
};

export type JsonRpcSuccessResponse = {
  jsonrpc: JsonRpcVersion;
  id: JsonRpcId;
  result: unknown;
};

export type JsonRpcErrorResponse = {
  jsonrpc: JsonRpcVersion;
  id: JsonRpcId;
  error: JsonRpcErrorObject;
};

export type JsonRpcResponse = JsonRpcSuccessResponse | JsonRpcErrorResponse;
export type JsonRpcMessage =
  | JsonRpcRequest
  | JsonRpcNotification
  | JsonRpcResponse;

export type AcpAuthMethod = {
  id: string;
  name: string;
  description?: string | null;
};

export type AcpAgentInfo = {
  name?: string | null;
  title?: string | null;
  version?: string | null;
};

export type AcpAgentCapabilities = {
  loadSession?: boolean | null;
  mcpCapabilities?: {
    http?: boolean | null;
    sse?: boolean | null;
    [key: string]: unknown;
  } | null;
  sessionCapabilities?: {
    resume?: Record<string, unknown> | null;
    [key: string]: unknown;
  } | null;
  [key: string]: unknown;
};

export type AcpInitializeRequest = {
  protocolVersion: number;
  clientCapabilities?: Record<string, unknown>;
};

export type AcpInitializeResponse = {
  protocolVersion?: number;
  agentInfo?: AcpAgentInfo | null;
  authMethods?: AcpAuthMethod[] | null;
  agentCapabilities?: AcpAgentCapabilities | null;
};

export type AcpSessionMode = {
  id: string;
  name: string;
  description?: string | null;
};

export type SessionModeState = {
  availableModes: AcpSessionMode[];
  currentModeId: string;
};

export type AcpModelInfo = {
  modelId: string;
  name: string;
  description?: string | null;
};

export type SessionModelState = {
  availableModels: AcpModelInfo[];
  currentModelId: string;
};

export type AcpSessionConfigCategory =
  | "mode"
  | "model"
  | "thought_level"
  | string;

export type AcpSessionConfigSelectOption = {
  value: string;
  name: string;
  description?: string | null;
};

export type AcpSessionConfigSelectGroup = {
  group: string;
  name: string;
  options: AcpSessionConfigSelectOption[];
};

export type AcpSessionConfigOption = {
  id: string;
  name: string;
  description?: string | null;
  category?: AcpSessionConfigCategory | null;
  type: "select" | string;
  currentValue: string;
  options?: Array<AcpSessionConfigSelectOption | AcpSessionConfigSelectGroup>;
};

export type NewSessionResponse = {
  sessionId: string;
  title?: string | null;
  updatedAt?: string | null;
  configOptions?: AcpSessionConfigOption[] | null;
  modes?: SessionModeState | null;
  models?: SessionModelState | null;
};

export type SessionAttachResponse = {
  title?: string | null;
  updatedAt?: string | null;
  configOptions?: AcpSessionConfigOption[] | null;
  modes?: SessionModeState | null;
  models?: SessionModelState | null;
} | null;

export type AcpPermissionOption = {
  optionId: string;
  kind: AcpPermissionOptionKind;
  name: string;
  description?: string | null;
};

export type RequestPermissionOutcome =
  | {
      outcome: "cancelled";
    }
  | {
      outcome: "selected";
      optionId: string;
    };

export type RequestPermissionRequest = {
  sessionId: string;
  options: AcpPermissionOption[];
  toolCall?: {
    toolCallId?: string | null;
    title?: string | null;
  } | null;
};

export type AcpContentChunk = {
  content?: {
    type?: string | null;
    text?: string | null;
  } | null;
};

export type AcpToolCall = {
  toolCallId?: string | null;
  title?: string | null;
  kind?: string | null;
  status?: string | null;
  summary?: string | null;
  name?: string | null;
  tool?: string | null;
  functionName?: string | null;
  function_name?: string | null;
  description?: string | null;
  metadata?: unknown;
  rawInput?: unknown;
  input?: unknown;
  arguments?: unknown;
  args?: unknown;
  parameters?: unknown;
  params?: unknown;
  rawOutput?: unknown;
  output?: unknown;
  result?: unknown;
  content?: unknown;
  message?: unknown;
  detail?: unknown;
};

export type AcpPlan = {
  entries?: Array<{
    content?: string | null;
    priority?: string | null;
    status?: string | null;
  }> | null;
};

export type AcpAvailableCommandsUpdate = {
  availableCommands?: Array<{
    name?: string | null;
    title?: string | null;
    description?: string | null;
    input?: unknown;
  }> | null;
};

export type AcpCurrentModeUpdate = {
  currentModeId?: string | null;
};

export type AcpConfigOptionUpdate = {
  optionId?: string | null;
  configOptions?: AcpSessionConfigOption[] | null;
};

export type AcpSessionInfoUpdate = {
  title?: string | null;
  updatedAt?: string | null;
};

export type AcpUsageUpdate = {
  used?: number | null;
  size?: number | null;
};

export type SessionUpdate =
  | ({ sessionUpdate: "user_message_chunk" } & AcpContentChunk)
  | ({ sessionUpdate: "agent_message_chunk" } & AcpContentChunk)
  | ({ sessionUpdate: "agent_thought_chunk" } & AcpContentChunk)
  | ({ sessionUpdate: "tool_call" } & AcpToolCall)
  | ({ sessionUpdate: "tool_call_update" } & AcpToolCall)
  | ({ sessionUpdate: "plan" } & AcpPlan)
  | ({
      sessionUpdate: "available_commands_update";
    } & AcpAvailableCommandsUpdate)
  | ({ sessionUpdate: "current_mode_update" } & AcpCurrentModeUpdate)
  | ({ sessionUpdate: "config_option_update" } & AcpConfigOptionUpdate)
  | ({ sessionUpdate: "session_info_update" } & AcpSessionInfoUpdate)
  | ({ sessionUpdate: "usage_update" } & AcpUsageUpdate)
  | {
      sessionUpdate: string;
      [key: string]: unknown;
    };

export type SessionNotification = {
  sessionId: string;
  update: SessionUpdate;
};

export class RequestError extends Error {
  readonly code: number;
  readonly data?: unknown;

  constructor(code: number, message: string, data?: unknown) {
    super(message);
    this.name = "RequestError";
    this.code = code;
    this.data = data;
  }

  static methodNotFound(method: string) {
    return new RequestError(-32601, `Method not found: ${method}`);
  }

  static invalidParams(data?: unknown) {
    return new RequestError(-32602, "Invalid params", data);
  }

  static internalError(data?: unknown) {
    return new RequestError(-32603, "Internal error", data);
  }

  static fromJsonRpc(error: JsonRpcErrorObject) {
    return new RequestError(
      Number(error?.code || 0),
      String(error?.message || "Request failed"),
      error?.data,
    );
  }

  toResult(): { error: JsonRpcErrorObject } {
    return {
      error: {
        code: this.code,
        message: this.message,
        data: this.data,
      },
    };
  }
}

export function isJsonRpcRequest(message: unknown): message is JsonRpcRequest {
  return (
    !!message &&
    typeof message === "object" &&
    "method" in message &&
    "id" in message
  );
}

export function isJsonRpcNotification(
  message: unknown,
): message is JsonRpcNotification {
  return (
    !!message &&
    typeof message === "object" &&
    "method" in message &&
    !("id" in message)
  );
}

export function isJsonRpcResponse(
  message: unknown,
): message is JsonRpcResponse {
  return (
    !!message &&
    typeof message === "object" &&
    "id" in message &&
    ("result" in message || "error" in message)
  );
}
