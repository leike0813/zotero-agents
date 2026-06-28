import { assert } from "chai";
import fs from "node:fs";
import path from "node:path";

describe("acp websocket bridge packaging", function () {
  it("keeps ACP WebSocket bridge packaging independent from Host Bridge CLI", function () {
    const packageJson = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), "package.json"), "utf8"),
    );
    const buildScript = fs.readFileSync(
      path.join(process.cwd(), "scripts/build-acp-ws-bridge.mjs"),
      "utf8",
    );
    const packageScript = fs.readFileSync(
      path.join(process.cwd(), "scripts/package-acp-ws-bridge.mjs"),
      "utf8",
    );
    const cargoToml = fs.readFileSync(
      path.join(process.cwd(), "native/acp-ws-bridge/Cargo.toml"),
      "utf8",
    );

    assert.equal(
      packageJson.scripts["prebuild:acp-ws-bridge"],
      "node scripts/build-acp-ws-bridge.mjs",
    );
    assert.equal(
      packageJson.scripts["package:acp-ws-bridge"],
      "node scripts/package-acp-ws-bridge.mjs",
    );
    assert.include(cargoToml, 'name = "zotero-acp-bridge"');
    assert.include(packageScript, "zotero-acp-bridge.exe");
    assert.include(packageScript, "addon");
    assert.include(packageScript, "win32-x64");
    assert.include(buildScript, "native/acp-ws-bridge/Cargo.toml");
    assert.notInclude(buildScript, "cli/zotero-bridge");
    assert.notInclude(packageScript, "cli/zotero-bridge");
  });
});
