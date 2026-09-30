import type { createPiMcpToolSources } from "./piMcpToolSources";
import { resolveRuntimeWindowCandidates } from "../utils/runtimeBridge";

let owner: ReturnType<typeof createPiMcpToolSources> | null = null;

export async function loadPiMcpToolSourceModule() {
  const scope = globalThis as typeof globalThis & {
    TransformStream?: typeof TransformStream;
    TextDecoderStream?: typeof TextDecoderStream;
    ReadableStream?: typeof ReadableStream;
    AbortController?: typeof AbortController;
  };
  if (
    !scope.TransformStream ||
    !scope.TextDecoderStream ||
    !scope.ReadableStream ||
    !scope.AbortController
  ) {
    const window = resolveRuntimeWindowCandidates().find((candidate) => {
      const value = candidate as typeof globalThis;
      return (
        value.TransformStream &&
        value.TextDecoderStream &&
        value.ReadableStream &&
        value.AbortController
      );
    }) as typeof globalThis | undefined;
    if (!window) throw new Error("mcp_web_stream_unavailable");
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

export async function shutdownPiMcpToolSources(): Promise<void> {
  const current = owner;
  owner = null;
  if (current) await current.dispose();
}

export async function disconnectPiMcpSource(id: string): Promise<void> {
  if (owner) await owner.disconnectSource(id);
}
