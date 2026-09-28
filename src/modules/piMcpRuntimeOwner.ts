import { createPiMcpToolSources } from "./piMcpToolSources";

let owner: ReturnType<typeof createPiMcpToolSources> | null = null;

export function getPiMcpToolSources() {
  return (owner ||= createPiMcpToolSources());
}

export async function shutdownPiMcpToolSources(): Promise<void> {
  const current = owner;
  owner = null;
  if (current) await current.dispose();
}

export async function disconnectPiMcpSource(id: string): Promise<void> {
  if (owner) await owner.disconnectSource(id);
}
