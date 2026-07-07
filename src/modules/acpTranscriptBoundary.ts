export type AcpTranscriptUpdateBoundary =
  | "text-continuation"
  | "soft-side-channel"
  | "hard-boundary";

export function normalizeAcpSessionUpdateKind(value: unknown) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

export function classifyAcpTranscriptSessionUpdate(
  updateKindRaw: unknown,
): AcpTranscriptUpdateBoundary {
  const updateKind = normalizeAcpSessionUpdateKind(updateKindRaw);
  switch (updateKind) {
    case "agent_message_chunk":
    case "agent_thought_chunk":
      return "text-continuation";
    case "user_message_chunk":
      return "hard-boundary";
    case "tool_call_update":
    case "usage_update":
    case "available_commands_update":
    case "current_mode_update":
    case "config_option_update":
    case "session_info_update":
      return "soft-side-channel";
    case "tool_call":
    case "plan":
    default:
      return "hard-boundary";
  }
}

export function isAcpTranscriptHardBoundaryUpdate(updateKindRaw: unknown) {
  return classifyAcpTranscriptSessionUpdate(updateKindRaw) === "hard-boundary";
}
