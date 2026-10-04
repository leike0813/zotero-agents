import { assert } from "chai";
import { PiMcpStdioTransport } from "../../../../src/modules/piMcpStdioTransport";
import {
  getPiMcpToolSources,
  shutdownPiMcpToolSources,
} from "../../../../src/modules/piMcpRuntimeOwner";
import { applyPiMcpSourceChange } from "../../../../src/modules/piMcpSourceRegistry";
import { getPref, setPref } from "../../../../src/utils/prefs";
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

  it("admits an enabled saved source with no persisted tool selection", async function () {
    this.timeout(60_000);
    const prior = String(getPref("piMcpSourceRegistryJson") || "");
    try {
      await applyPiMcpSourceChange({
        sources: [
          {
            id: "zotero-fixture",
            label: "Fixture",
            transport: "http",
            // A closed loopback port fails fast, so admission is exercised
            // without waiting on any live server.
            url: "https://127.0.0.1:1/mcp",
            enabled: true,
            authentication: { kind: "none" },
            bindings: [],
            approveLocalNetwork: true,
          },
        ],
      });
      const saved = String(getPref("piMcpSourceRegistryJson") || "");
      assert.notInclude(saved, "selectedTools");
      assert.notInclude(saved, "promoted");
      assert.notInclude(saved, "digest");
      const sources = await getPiMcpToolSources();
      const catalog = await sources.getCatalogForTurn();
      assert.isArray(catalog.tools);
      assert.isFunction(sources.callTool);
    } finally {
      await shutdownPiMcpToolSources();
      setPref("piMcpSourceRegistryJson", prior);
    }
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
