import { assert } from "chai";
import { PiMcpStdioTransport } from "../../../../src/modules/piMcpStdioTransport";
import {
  getPiMcpToolSources,
  shutdownPiMcpToolSources,
} from "../../../../src/modules/piMcpRuntimeOwner";
import {
  getCachedRuntimeCommand,
  preflightRuntimeCommandsOnStartup,
} from "../../../../src/platform/command";
import { detectRuntimePlatform } from "../../../../src/platform/runtimePlatform";
import {
  ensureWindowsStdioBridgeService,
  shutdownWindowsStdioBridgeService,
} from "../../../../src/platform/windowsStdioBridgeService";

describe("Pi MCP source transport in real Zotero", function () {
  it("loads the outbound source owner with browser streams", async function () {
    this.timeout(30_000);
    const sources = await getPiMcpToolSources();
    assert.isFunction(sources.testSource);
    await shutdownPiMcpToolSources();
  });

  it("streams JSON-RPC through the live stdio adapter", async function () {
    this.timeout(120_000);
    await preflightRuntimeCommandsOnStartup();
    const windows = detectRuntimePlatform() === "win32";
    const resolved = windows
      ? getCachedRuntimeCommand("powershell") || getCachedRuntimeCommand("pwsh")
      : getCachedRuntimeCommand("sh");
    if (!resolved?.available || !resolved.resolvedPath) this.skip();
    const transport = new PiMcpStdioTransport({
      executable: resolved.resolvedPath,
      argv: windows
        ? [
            "-NoLogo",
            "-NoProfile",
            "-Command",
            "$stdinStream = [Console]::OpenStandardInput(); $stdoutStream = [Console]::OpenStandardOutput(); $stdinStream.CopyTo($stdoutStream); $stdoutStream.Flush()",
          ]
        : ["-c", "cat"],
      cwd: Zotero.getTempDirectory().path,
      environment: {},
    });
    await transport.start();
    try {
      const received = new Promise<unknown>((resolve, reject) => {
        transport.onmessage = resolve;
        transport.onerror = reject;
        transport.onclose = () => reject(new Error("mcp_stdio_closed"));
      });
      await transport.send({ jsonrpc: "2.0", id: 1, method: "ping" });
      assert.deepEqual(await received, {
        jsonrpc: "2.0",
        id: 1,
        method: "ping",
      });
    } finally {
      await transport.close();
    }
  });

  it("observes Windows stdio bridge exit before leaving the host", async function () {
    if (detectRuntimePlatform() !== "win32") this.skip();
    const bridge = await ensureWindowsStdioBridgeService();
    await shutdownWindowsStdioBridgeService();
    const exited = await Promise.race([
      bridge.closed.then(() => true),
      new Promise<boolean>((resolve) =>
        setTimeout(() => resolve(false), 1_000),
      ),
    ]);
    assert.isTrue(exited);
  });
});
