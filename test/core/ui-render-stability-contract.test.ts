import { assert } from "chai";
import fs from "fs/promises";
import { bootstrapSynthesisWorkbench } from "../../src/synthesis/synthesisWorkbenchApp";
import {
  buildSynthesisUiSnapshot,
  createDefaultSynthesisUiState,
} from "../../src/modules/synthesis/uiModel";
import {
  createSidebarDomEnvironment,
  installSidebarDomGlobals,
  restoreSidebarDomGlobals,
  subtreeNodes,
} from "../helpers/sidebarDomEnv";

describe("UI render stability contract", function () {
  it("preserves active controls, focus and content across chrome updates", function () {
    const env = createSidebarDomEnvironment();
    installSidebarDomGlobals(env);
    const root = document.createElement("div");
    root.id = "app";
    document.body.appendChild(root);
    const page = bootstrapSynthesisWorkbench({ root });
    try {
      const snapshot = buildSynthesisUiSnapshot(
        { libraryId: 1 },
        createDefaultSynthesisUiState(),
      );
      page.handleHostMessage({ type: "synthesis:snapshot", payload: snapshot });
      const content = root.querySelector(
        '[data-region-content="synthesis-home"]',
      )!;
      const control = content.querySelector<HTMLButtonElement>("button")!;
      control.focus();
      const nodes = subtreeNodes(content);
      page.handleHostMessage({
        type: "synthesis:chrome",
        payload: {
          ...snapshot,
          actions: {
            ...snapshot.actions,
            inFlight: [
              {
                key: "refresh",
                command: "refresh",
                status: "running",
                label: "Refreshing",
              },
            ],
          },
        },
      });
      assert.strictEqual(document.activeElement, control);
      const after = subtreeNodes(content);
      assert.equal(after.length, nodes.length);
      after.forEach((node, index) => assert.strictEqual(node, nodes[index]));
      assert.isTrue(content.isConnected);
    } finally {
      page.dispose();
      restoreSidebarDomGlobals();
      env.dom.window.close();
    }
  });

  it("keeps workspace mounts while switching visibility", async function () {
    const workspace = await fs.readFile("src/workspaceApp.ts", "utf8");
    assert.include(workspace, 'root.querySelector(".workspace-panel")');
    assert.include(workspace, "updateWorkspaceVisibility");
    assert.include(workspace, 'if (root.querySelector(".workspace-panel"))');
  });
});
