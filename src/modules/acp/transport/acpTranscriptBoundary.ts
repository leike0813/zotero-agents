export type AcpTranscriptUpdateBoundary =
  | "text-continuation"
  | "soft-side-channel"
  | "hard-boundary";

export type AcpTranscriptSemanticUpdateKind =
  | "assistant-message"
  | "assistant-thought"
  | "soft-side-channel"
  | "tool-boundary"
  | "plan-boundary"
  | "user-boundary"
  | "turn-boundary"
  | "terminal-boundary"
  | "other-boundary";

export function normalizeAcpSessionUpdateKind(value: unknown) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

export function classifyAcpTranscriptSessionUpdate(
  updateKindRaw: unknown,
): AcpTranscriptUpdateBoundary {
  const semanticKind = classifyAcpTranscriptSemanticUpdate(updateKindRaw);
  if (
    semanticKind === "assistant-message" ||
    semanticKind === "assistant-thought"
  ) {
    return "text-continuation";
  }
  if (semanticKind === "soft-side-channel") {
    return "soft-side-channel";
  }
  return "hard-boundary";
}

export function classifyAcpTranscriptSemanticUpdate(
  updateKindRaw: unknown,
): AcpTranscriptSemanticUpdateKind {
  const updateKind = normalizeAcpSessionUpdateKind(updateKindRaw);
  switch (updateKind) {
    case "agent_message_chunk":
      return "assistant-message";
    case "agent_thought_chunk":
      return "assistant-thought";
    case "user_message_chunk":
    case "user_message":
      return "user-boundary";
    case "tool_call_update":
    case "usage_update":
    case "status_update":
    case "workspace_activity":
    case "available_commands_update":
    case "current_mode_update":
    case "config_option_update":
    case "session_info_update":
      return "soft-side-channel";
    case "tool_call":
      return "tool-boundary";
    case "plan":
      return "plan-boundary";
    case "turn_boundary":
    case "request_turn_boundary":
      return "turn-boundary";
    case "request_terminal":
    case "session_terminal":
      return "terminal-boundary";
    default:
      return "other-boundary";
  }
}

export function isAcpTranscriptHardBoundaryUpdate(updateKindRaw: unknown) {
  return classifyAcpTranscriptSessionUpdate(updateKindRaw) === "hard-boundary";
}
