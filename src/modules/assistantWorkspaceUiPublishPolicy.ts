import { isAssistantStreamingRenderEnabled } from "./assistantStreamingRenderPreference";

export type AssistantWorkspacePublishReason =
  | "critical"
  | "boundary"
  | "live"
  | "background";

export const ASSISTANT_WORKSPACE_LIVE_PUBLISH_MS = 160;

export function canPublishAssistantWorkspaceLiveUpdates() {
  return isAssistantStreamingRenderEnabled();
}
