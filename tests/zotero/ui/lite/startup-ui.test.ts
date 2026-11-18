import { assert } from "chai";
import { config } from "../../../../package.json";

describe("Zotero UI startup", function () {
  it("mounts the workflow menu in the real main window", function () {
    const win = Zotero.getMainWindow();
    assert.isOk(win);
    assert.isOk(
      win?.document.getElementById(`${config.addonRef}-workflows-menu`),
    );
  });

  it("opens embedding preference menus repeatedly and applies native selections to the draft", async function () {
    this.timeout(30000);
    const plugin = (Zotero as any)[config.addonInstance] as typeof addon;
    const originalPrefsEvent = plugin.hooks.onPrefsEvent;
    let discoveryDraft: any;
    plugin.hooks.onPrefsEvent = ((type: string, data: any) => {
      if (type === "discoverEmbeddingModels") {
        discoveryDraft = data.connection;
        return Promise.resolve({
          status: "ok",
          models: [
            { id: "fixture-first", embedding: "supported" },
            { id: "fixture-second", embedding: "unknown" },
          ],
          partial: false,
          diagnostics: [],
        });
      }
      if (type === "inspectEmbeddingModel")
        return Promise.resolve({
          id: data.connection.modelId,
          embedding: "supported",
        });
      return originalPrefsEvent(type as any, data);
    }) as typeof originalPrefsEvent;
    const preferences = (Zotero.Utilities.Internal as any).openPreferences(
      `zotero-prefpane-${config.addonRef}`,
    ) as Window;
    const control = <T extends Element>(suffix: string) =>
      preferences.document.getElementById(
        `zotero-prefpane-${config.addonRef}-retrieval-${suffix}`,
      ) as T;
    const waitFor = async (read: () => boolean, state: string) => {
      for (let attempt = 0; attempt < 400; attempt++) {
        if (read()) return;
        await Zotero.Promise.delay(25);
      }
      assert.fail(`embedding preferences: ${state}`);
    };
    const choose = async (suffix: string, value: string) => {
      const menu = control<XUL.MenuList>(suffix);
      const popup = control<XUL.MenuPopup>(`${suffix}-popup`);
      menu.scrollIntoView({ block: "center" });
      menu.focus();
      menu.openMenu(true);
      await waitFor(() => popup.state === "open", `${suffix} popup opens`);
      const item = Array.from(popup.children).find(
        (entry) => entry.getAttribute("value") === value,
      ) as XUL.MenuItem;
      assert.isOk(item);
      item.doCommand();
      menu.openMenu(false);
      await waitFor(() => popup.state === "closed", `${suffix} popup closes`);
      assert.equal(menu.value, value);
      assert.equal(menu.label, item.getAttribute("label"));
    };
    try {
      await waitFor(
        () => Boolean(control("preset-popup")?.children.length),
        "preset catalog loads",
      );
      await waitFor(
        () => control("preset").getBoundingClientRect().width > 0,
        "preset menu is visible",
      );
      assert.isFalse(control<HTMLDetailsElement>("advanced").open);
      assert.isFalse(control<HTMLDetailsElement>("routing").open);
      assert.isTrue(control<XUL.Button>("model-toggle").disabled);
      const primary = control<XUL.MenuList>("primary").value;
      // Creating a preset draft must not change the active connection.
      const preset = control<XUL.MenuList>("preset");
      const popup = control<XUL.MenuPopup>("preset-popup");
      preset.scrollIntoView({ block: "center" });
      preset.openMenu(true);
      await waitFor(() => popup.state === "open", "preset popup opens");
      const item = Array.from(popup.children).find(
        (entry) =>
          entry.getAttribute("value") === "ollama-qwen3-embedding-0.6b-local",
      ) as XUL.MenuItem;
      assert.isOk(item);
      item.doCommand();
      preset.openMenu(false);
      await waitFor(() => popup.state === "closed", "preset popup closes");
      assert.equal(
        control<HTMLInputElement>("model").value,
        "qwen3-embedding:0.6b",
      );
      assert.equal(control<XUL.MenuList>("primary").value, primary);
      assert.equal(
        control<HTMLTextAreaElement>("query-prefix").value,
        "Instruct: Given a query, retrieve relevant passages that answer the query\nQuery:",
      );
      assert.equal(preset.value, "ollama-qwen3-embedding-0.6b-local");
      const model = control<HTMLInputElement>("model");
      const base = control<HTMLInputElement>("base-url");
      base.value = "http://embedding.example.test:11434";
      base.dispatchEvent(
        new (preferences as any).Event("input", { bubbles: true }),
      );
      assert.equal(preset.value, "");
      assert.equal(
        control<HTMLInputElement>("embedding-url").value,
        "http://embedding.example.test:11434/api/embed",
      );
      control<XUL.Button>("discover").doCommand();
      await waitFor(
        () => model.value === "fixture-first",
        "discovery prefills the model input",
      );
      assert.equal(discoveryDraft.baseUrl, base.value);
      assert.equal(
        discoveryDraft.embeddingUrl,
        "http://embedding.example.test:11434/api/embed",
      );
      const modelPopup = control<XUL.MenuPopup>("model-popup");
      for (let cycle = 0; cycle < 2; cycle++) {
        control<XUL.Button>("model-toggle").doCommand();
        await waitFor(() => modelPopup.state === "open", "model popup opens");
        const targetIndex = cycle === 0 ? 1 : 0;
        (modelPopup.children[targetIndex] as XUL.MenuItem).doCommand();
        await waitFor(
          () => modelPopup.state === "closed",
          "model popup closes",
        );
        await waitFor(
          () =>
            model.value ===
            (targetIndex === 0 ? "fixture-first" : "fixture-second"),
          "model selection applies",
        );
      }
      model.focus();
      for (const key of ["ArrowDown", "Enter"]) {
        model.dispatchEvent(
          new (preferences as any).KeyboardEvent("keydown", {
            key,
            bubbles: true,
            cancelable: true,
          }),
        );
        if (key === "ArrowDown")
          await waitFor(
            () => modelPopup.state === "open",
            "keyboard opens model popup",
          );
      }
      await waitFor(
        () => modelPopup.state === "closed",
        "keyboard selects a model",
      );
      assert.equal(model.value, "fixture-first");
      model.value = "custom:model@tag";
      model.dispatchEvent(
        new (preferences as any).Event("input", { bubbles: true }),
      );
      assert.equal(model.value, "custom:model@tag");
      for (let cycle = 0; cycle < 2; cycle++) {
        await choose("protocol", "openai");
        await choose("protocol", "ollama");
        assert.include(control("preview").textContent, "/api/embed");
      }
      control<HTMLDetailsElement>("advanced").open = true;
      await choose("auth-type", "header");
      assert.isFalse(control<HTMLInputElement>("header-name").disabled);
      await choose("auth-type", "none");
      assert.isTrue(control<HTMLInputElement>("header-name").disabled);
      await choose("discovery-protocol", "none");
    } finally {
      plugin.hooks.onPrefsEvent = originalPrefsEvent;
      preferences.close();
    }
  });
});
