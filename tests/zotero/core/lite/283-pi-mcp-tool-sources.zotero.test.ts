import { assert } from "chai";
import { PiMcpStdioTransport } from "../../../../src/modules/piMcpStdioTransport";
import {
  getCachedRuntimeCommand,
  preflightRuntimeCommandsOnStartup,
} from "../../../../src/platform/command";
import { detectRuntimePlatform } from "../../../../src/platform/runtimePlatform";

describe("Pi MCP source transport in real Zotero", function () {
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
            "$input = [Console]::OpenStandardInput(); $output = [Console]::OpenStandardOutput(); $input.CopyTo($output); $output.Flush()",
          ]
        : ["-c", "cat"],
      cwd: Zotero.getTempDirectory().path,
      environment: {},
    });
    const received = new Promise<unknown>((resolve) => {
      transport.onmessage = resolve;
    });
    await transport.start();
    try {
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
});
