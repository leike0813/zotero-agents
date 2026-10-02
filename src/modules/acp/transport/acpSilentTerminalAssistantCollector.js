import { classifyAcpTranscriptSemanticUpdate } from "./acpTranscriptBoundary";
export function createAcpSilentTerminalAssistantCollector() {
    let chunks = [];
    const discard = () => {
        chunks = [];
    };
    return {
        reset: discard,
        update(update) {
            const semanticKind = classifyAcpTranscriptSemanticUpdate(update.sessionUpdate);
            if (semanticKind === "assistant-message") {
                const content = update.content;
                if (String(content?.type || "") !== "text") {
                    return;
                }
                const chunk = String(content?.text || "");
                if (chunk) {
                    chunks.push(chunk);
                }
                return;
            }
            if (semanticKind === "soft-side-channel" ||
                semanticKind === "terminal-boundary") {
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
