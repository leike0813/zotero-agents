import { assert } from "chai";
import fs from "fs/promises";

function functionBody(source: string, name: string) {
  const start = source.indexOf(`function ${name}`);
  assert.isAtLeast(start, 0, `${name} should exist`);
  const next = source.indexOf("\nfunction ", start + 1);
  return source.slice(start, next > start ? next : undefined);
}

describe("UI render stability contract", function () {
  it("documents the live UI rendering stability boundary", async function () {
    const contract = await fs.readFile(
      "doc/ui-rendering-stability-contract.md",
      "utf8",
    );

    assert.include(contract, "Content state");
    assert.include(contract, "Chrome/status state");
    assert.include(contract, "Transient interaction state");
    assert.include(contract, "High-frequency updates must patch only");
    assert.include(contract, "full `JSON.stringify(snapshot)`");
  });

  it("keeps Synthesis Workbench chrome updates out of full content render", async function () {
    const source = await fs.readFile("src/synthesisWorkbenchApp.ts", "utf8");
    const messageHandlerStart = source.indexOf(
      'data.type === "synthesis:init" || data.type === "synthesis:snapshot"',
    );
    assert.isAtLeast(messageHandlerStart, 0);
    const messageHandler = source.slice(messageHandlerStart, messageHandlerStart + 900);

    assert.include(source, "function snapshotChromeSignature");
    assert.include(source, "function snapshotContentSignature");
    assert.include(source, "function renderWorkbenchChrome");
    assert.include(messageHandler, "contentChanged");
    assert.include(messageHandler, "chromeChanged");
    assert.include(messageHandler, "renderWorkbenchChrome()");
    assert.notInclude(source, "function snapshotPayloadSignature");
    assert.notInclude(source, "JSON.stringify(snapshot) :");
  });

  it("does not destroy graph renderers from generic shell rendering", async function () {
    const source = await fs.readFile("src/synthesisWorkbenchApp.ts", "utf8");
    const shell = functionBody(source, "renderShell");

    assert.include(source, "function disposeGraphRenderer");
    assert.include(source, "graphCamera");
    assert.notInclude(shell, "state.sigma?.kill()");
    assert.notInclude(shell, "state.sigmaResizeObserver?.disconnect()");
  });

  it("uses stable keys for scroll, focus, expanded details, and workspace mounts", async function () {
    const synthesis = await fs.readFile("src/synthesisWorkbenchApp.ts", "utf8");
    const workspace = await fs.readFile("src/workspaceApp.ts", "utf8");

    assert.include(synthesis, "dataset.synthesisScrollKey");
    assert.include(synthesis, "dataset.synthesisControlKey");
    assert.include(synthesis, "dataset.synthesisDetailsKey");
    assert.include(synthesis, "details[data-synthesis-details-key][open]");
    assert.include(workspace, 'root.querySelector(".workspace-panel")');
    assert.include(workspace, "updateWorkspaceVisibility");
    assert.include(workspace, 'if (root.querySelector(".workspace-panel"))');
  });
});
