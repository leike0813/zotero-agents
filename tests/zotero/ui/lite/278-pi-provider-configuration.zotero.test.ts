import { assert } from "chai";
import { config } from "../../../../package.json";
import { getPref, setPref } from "../../../../src/utils/prefs";
import {
  listPiCredentials,
  putPiCredential,
} from "../../../../src/modules/piCredentialStore";
import {
  loadPiProviderConfigurationState,
  upsertPiProviderConfiguration,
} from "../../../../src/modules/piProviderConfiguration";

describe("Built-in Agent Backend Manager page in real Zotero", function () {
  it("keeps a newly linked Codex credential when saving the open form", async function () {
    this.timeout(30_000);
    const plugin = (Zotero as any)[config.addonInstance];
    const prior = String(getPref("piProviderConfigurationJson") || "");
    const priorCredentials = String(getPref("piCredentialEncryptedJson") || "");
    await putPiCredential({
      id: "fixture-codex-credential",
      label: "Fixture Codex",
      material: {
        kind: "openai-codex",
        access: "fixture-access",
        refresh: "fixture-refresh",
        expiresAt: Date.now() + 3600_000,
        accountId: "fixture-account",
      },
    });
    upsertPiProviderConfiguration({
      id: "fixture-codex-config",
      label: "Fixture Codex",
      provider: "openai-codex",
      modelId: "fixture-model",
      authVariant: "openai-codex",
      enabled: true,
    });
    const opened = plugin.hooks.onPrefsEvent("openBackendManager", {
      window: Zotero.getMainWindow(),
    });
    try {
      let frame: HTMLIFrameElement | null = null;
      for (let i = 0; i < 100; i++) {
        frame = plugin.data.dialog?.window?.document.querySelector(
          "[data-zs-role='backend-manager-dialog-frame']",
        ) as HTMLIFrameElement | null;
        if (
          frame?.contentDocument?.querySelectorAll(".backend-provider-tab")
            .length === 4
        )
          break;
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      assert.isOk(frame?.contentDocument, "Backend Manager frame loaded");
      (
        frame!.contentDocument!.querySelectorAll(
          ".backend-provider-tab",
        )[3] as HTMLElement
      ).click();
      assert.lengthOf(
        frame!.contentDocument!.querySelectorAll("[data-web-source]"),
        8,
      );
      const select = frame!.contentDocument!.querySelector(
        "[data-pi-field='configuration']",
      ) as HTMLButtonElement;
      select.click();
      await new Promise((resolve) => setTimeout(resolve, 100));
      (
        frame!.contentDocument!.querySelector(
          "[data-choice-value='fixture-codex-config']",
        ) as HTMLButtonElement
      ).click();
      await new Promise((resolve) => setTimeout(resolve, 100));
      assert.isOk(
        frame!.contentDocument!.querySelector(
          "[data-pi-action='codex-connect']",
        ),
      );
      assert.isNotOk(
        frame!.contentDocument!.querySelector(
          "[data-pi-field='credential-secret']",
        ),
      );
      const label = frame!.contentDocument!.querySelector(
        "[data-pi-field='label']",
      ) as HTMLInputElement;
      label.value = "Edited fixture";
      label.dispatchEvent(
        new frame!.contentWindow!.Event("input", { bubbles: true }),
      );
      upsertPiProviderConfiguration({
        ...loadPiProviderConfigurationState().configurations.find(
          (entry) => entry.id === "fixture-codex-config",
        )!,
        credentialRef: "fixture-codex-credential",
      });
      (
        frame!.contentDocument!.querySelector(
          "[data-pi-action='defaults']",
        ) as HTMLButtonElement
      ).click();
      for (let i = 0; i < 30; i++) {
        if (
          frame!.contentDocument!.querySelector(
            "[aria-label^='Credential: Fixture Codex']",
          )
        )
          break;
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      (
        frame!.contentDocument!.querySelector(
          "[data-pi-action='save']",
        ) as HTMLButtonElement
      ).click();
      let saved;
      for (let i = 0; i < 30; i++) {
        saved = loadPiProviderConfigurationState().configurations.find(
          (entry) => entry.id === "fixture-codex-config",
        );
        if (saved?.label === "Edited fixture") break;
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      assert.equal(saved?.label, "Edited fixture");
      assert.equal(saved?.credentialRef, "fixture-codex-credential");
      const disconnect = frame!.contentDocument!.querySelector(
        "[data-pi-action='codex-disconnect']",
      ) as HTMLButtonElement;
      assert.isOk(disconnect);
      disconnect.click();
      for (
        let i = 0;
        i < 30 &&
        listPiCredentials().some(
          (entry) => entry.id === "fixture-codex-credential",
        );
        i++
      )
        await new Promise((resolve) => setTimeout(resolve, 100));
      assert.isFalse(
        listPiCredentials().some(
          (entry) => entry.id === "fixture-codex-credential",
        ),
      );
    } finally {
      setPref("piProviderConfigurationJson", prior);
      setPref("piCredentialEncryptedJson", priorCredentials);
      plugin.data.dialog?.window?.close();
      await opened;
    }
  });

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
