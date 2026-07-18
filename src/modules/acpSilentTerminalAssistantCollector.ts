import { classifyAcpTranscriptSemanticUpdate } from "./acpTranscriptBoundary";

export type AcpSilentTerminalAssistantCollector = {
  reset(): void;
  update(update: { sessionUpdate?: unknown; content?: unknown }): void;
  take(): string;
  discard(): void;
};

export function createAcpSilentTerminalAssistantCollector(): AcpSilentTerminalAssistantCollector {
  let chunks: string[] = [];

  const discard = () => {
    chunks = [];
  };

  return {
    reset: discard,
    update(update) {
      const semanticKind = classifyAcpTranscriptSemanticUpdate(
        update.sessionUpdate,
      );
      if (semanticKind === "assistant-message") {
        const content = update.content as
          | { type?: unknown; text?: unknown }
          | undefined;
        if (String(content?.type || "") !== "text") {
          return;
        }
        const chunk = String(content?.text || "");
        if (chunk) {
          chunks.push(chunk);
        }
        return;
      }
      if (
        semanticKind === "soft-side-channel" ||
        semanticKind === "terminal-boundary"
      ) {
        return;
      }
      discard();
    },
    take() {
      const candidate = chunks.join("");
      discard();
      return candidate;
    },
    discard,
  };
}
