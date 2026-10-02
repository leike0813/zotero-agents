import { resolveRuntimeWindowCandidates } from "../utils/runtimeBridge";
let owner = null;
export async function loadPiMcpToolSourceModule() {
    const scope = globalThis;
    if (!scope.TransformStream ||
        !scope.TextDecoderStream ||
        !scope.ReadableStream ||
        !scope.AbortController) {
        const window = resolveRuntimeWindowCandidates().find((candidate) => {
            const value = candidate;
            return (value.TransformStream &&
                value.TextDecoderStream &&
                value.ReadableStream &&
                value.AbortController);
        });
        if (!window)
            throw new Error("mcp_web_stream_unavailable");
        scope.TransformStream ||= window.TransformStream;
        scope.TextDecoderStream ||= window.TextDecoderStream;
        scope.ReadableStream ||= window.ReadableStream;
        scope.AbortController ||= window.AbortController;
    }
    return import("./piMcpToolSources");
}
export async function getPiMcpToolSources() {
    if (!owner) {
        const { createPiMcpToolSources } = await loadPiMcpToolSourceModule();
        owner ||= createPiMcpToolSources();
    }
    return owner;
}
export async function shutdownPiMcpToolSources() {
    const current = owner;
    owner = null;
    if (current)
        await current.dispose();
}
export async function disconnectPiMcpSource(id) {
    if (owner)
        await owner.disconnectSource(id);
}
