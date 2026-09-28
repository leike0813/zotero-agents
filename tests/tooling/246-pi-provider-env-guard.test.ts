import { assert } from "chai";
import { build } from "esbuild";
import { runInNewContext } from "node:vm";
import { resolve } from "node:path";
import { piProviderEnvGuardPlugin } from "../../zotero-plugin.config";

describe("Pi Provider browser import guard", function () {
  this.timeout(30_000);
  it("rejects other Node builtins and fails if the exact guarded branch runs", async function () {
    const guarded = await build({
      entryPoints: [
        resolve(
          "node_modules/@earendil-works/pi-ai/dist/utils/provider-env.js",
        ),
      ],
      bundle: true,
      platform: "browser",
      format: "cjs",
      write: false,
      plugins: [piProviderEnvGuardPlugin],
    });
    const module = { exports: {} as Record<string, unknown> };
    let guardTriggered = false;
    class ProbeError extends Error {
      constructor(message: string) {
        super(message);
        if (message.includes("provider-env node:fs")) guardTriggered = true;
      }
    }
    runInNewContext(guarded.outputFiles[0].text, {
      module,
      exports: module.exports,
      process: { versions: { bun: "test" }, env: {} },
      Error: ProbeError,
    });
    const getValue = module.exports.getProviderEnvValue as (
      name: string,
    ) => string | undefined;
    getValue("EXAMPLE");
    assert.isTrue(guardTriggered);
    try {
      await build({
        stdin: { contents: 'import "node:fs";', resolveDir: process.cwd() },
        bundle: true,
        platform: "browser",
        write: false,
        plugins: [piProviderEnvGuardPlugin],
      });
      assert.fail("Expected unrelated builtin to be rejected");
    } catch (error) {
      assert.match(String(error), /node:fs/);
    }
  });
});
