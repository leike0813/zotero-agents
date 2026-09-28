import { assert } from "chai";
import { config } from "../../../../package.json";
import { getPref, setPref } from "../../../../src/utils/prefs";
import { listPiCredentials } from "../../../../src/modules/piCredentialStore";

describe("Built-in Agent Backend Manager page in real Zotero", function () {
  it("shows the independent fourth page", async function () {
    this.timeout(30_000);
    const plugin = (Zotero as any)[config.addonInstance];
    assert.isOk(plugin?.data?.initialized, "plugin is initialized");
    const backendBefore = String(getPref("backendsConfigJson") || "");
    const piBefore = String(getPref("piProviderConfigurationJson") || "");
    const credentialsBefore = String(
      getPref("piCredentialEncryptedJson") || "",
    );
    const mcpBefore = String(getPref("piMcpSourceRegistryJson") || "");
    const credentialCount = listPiCredentials().length;
    const opened = plugin.hooks.onPrefsEvent("openBackendManager", {
      window: Zotero.getMainWindow(),
    });
    try {
      let tab: Element | null = null;
      for (let i = 0; i < 100 && !tab; i++) {
        const frame = plugin.data.dialog?.window?.document.querySelector(
          "[data-zs-role='backend-manager-dialog-frame']",
        ) as HTMLIFrameElement | null;
        tab =
          frame?.contentDocument?.querySelectorAll(
            ".backend-provider-tab",
          )[3] || null;
        if (!tab) await new Promise((resolve) => setTimeout(resolve, 100));
      }
      assert.isOk(tab, "Built-in Agent tab rendered");
      (tab as HTMLElement).click();
      const frame = plugin.data.dialog?.window?.document.querySelector(
        "[data-zs-role='backend-manager-dialog-frame']",
      ) as HTMLIFrameElement;
      assert.isOk(frame.contentDocument?.querySelector(".backend-pi-section"));
      assert.isOk(
        frame.contentDocument?.querySelector("[data-pi-mcp-sources]"),
      );
      assert.isNotOk(
        frame.contentDocument?.querySelector(".backend-profile-card"),
      );
      const label = frame.contentDocument?.querySelector(
        "[data-pi-field='credential-label']",
      ) as HTMLInputElement;
      const secret = frame.contentDocument?.querySelector(
        "[data-pi-field='credential-secret']",
      ) as HTMLInputElement;
      assert.isOk(label);
      assert.isOk(secret);
      label.value = "Fixture";
      label.dispatchEvent(
        new frame.contentWindow!.Event("input", { bubbles: true }),
      );
      secret.value = "fixture-only";
      secret.dispatchEvent(
        new frame.contentWindow!.Event("input", { bubbles: true }),
      );
      await new Promise((resolve) => setTimeout(resolve, 100));
      (
        frame.contentDocument?.querySelector(
          "[data-pi-action='credential-save']",
        ) as HTMLButtonElement
      ).click();
      for (
        let i = 0;
        i < 30 && listPiCredentials().length === credentialCount;
        i++
      )
        await new Promise((resolve) => setTimeout(resolve, 100));
      assert.equal(listPiCredentials().length, credentialCount + 1);
      assert.equal(secret.value, "");
      assert.notInclude(
        String(getPref("piCredentialEncryptedJson")),
        "fixture-only",
      );
      for (const [field, value] of [
        ["id", "fixture-mcp"],
        ["label", "Fixture MCP"],
        ["url", "https://example.org/mcp"],
      ] as const) {
        const input = frame.contentDocument?.querySelector(
          `[data-mcp-field='${field}']`,
        ) as HTMLInputElement;
        assert.isOk(input);
        input.value = value;
        input.dispatchEvent(
          new frame.contentWindow!.Event("input", { bubbles: true }),
        );
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
      (
        frame.contentDocument?.querySelector(
          "[data-mcp-action='save-source']",
        ) as HTMLButtonElement
      ).click();
      for (
        let i = 0;
        i < 30 &&
        String(getPref("piMcpSourceRegistryJson") || "") === mcpBefore;
        i++
      )
        await new Promise((resolve) => setTimeout(resolve, 100));
      assert.include(String(getPref("piMcpSourceRegistryJson")), "fixture-mcp");
      (
        frame.contentDocument?.querySelector(
          "[data-pi-action='save']",
        ) as HTMLButtonElement
      ).click();
      for (
        let i = 0;
        i < 30 &&
        String(getPref("piProviderConfigurationJson") || "") === piBefore;
        i++
      ) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      assert.notEqual(
        String(getPref("piProviderConfigurationJson") || ""),
        piBefore,
      );
      assert.equal(String(getPref("backendsConfigJson") || ""), backendBefore);
    } finally {
      setPref("piProviderConfigurationJson", piBefore);
      setPref("piCredentialEncryptedJson", credentialsBefore);
      setPref("piMcpSourceRegistryJson", mcpBefore);
      plugin.data.dialog?.window?.close();
      await opened;
    }
  });
});
