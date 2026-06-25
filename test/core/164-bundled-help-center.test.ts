import { access, readFile } from "fs/promises";
import path from "path";
import { assert } from "chai";

async function readProjectFile(relativePath: string) {
  return readFile(path.join(process.cwd(), relativePath), "utf8");
}

describe("bundled help center packaging", function () {
  it("keeps the help docs generator on the build path", async function () {
    const pkg = JSON.parse(await readProjectFile("package.json")) as {
      scripts: Record<string, string>;
      devDependencies: Record<string, string>;
    };
    const script = await readProjectFile("scripts/build-help-docs.ts");

    assert.include(pkg.scripts.build, "npm run build:help-docs");
    assert.equal(pkg.scripts["build:help-docs"], "tsx scripts/build-help-docs.ts");
    assert.equal(
      pkg.scripts["check:help-docs"],
      "tsx scripts/build-help-docs.ts --check",
    );
    assert.property(pkg.devDependencies, "sharp");
    assert.include(script, "zotero-agents.help-docs.v1");
    assert.include(script, '"site", "docs"');
    assert.include(script, "discoverLocaleInputs");
    assert.include(script, "docusaurus-plugin-content-docs");
    assert.include(script, "sharp(sourcePath)");
    assert.include(script, "renderImageFigure");
  });

  it("exposes built-in and online documentation entry points", async function () {
    const helpTab = await readProjectFile("src/modules/helpCenterTab.ts");
    const hooks = await readProjectFile("src/hooks.ts");
    const prefs = await readProjectFile("src/modules/preferenceScript.ts");
    const workspace = await readProjectFile("src/modules/workspaceTab.ts");
    const html = await readProjectFile("addon/content/help-center/index.html");

    assert.include(helpTab, "openHelpCenterTab");
    assert.include(helpTab, "content/help-center/index.html");
    assert.include(helpTab, "zotero-agents-help-center");
    assert.include(helpTab, "__zoteroAgentsHelpCenterBridge");
    assert.include(helpTab, "openOnlineDocs");
    assert.include(helpTab, "wrappedJSObject");
    assert.include(helpTab, "scheduleHelpCenterBridge");
    assert.include(helpTab, "resolveWindowZoteroTabs");
    assert.include(hooks, 'case "openHelpCenter"');
    assert.include(hooks, 'case "openOnlineDocs"');
    assert.include(prefs, "open-help");
    assert.include(prefs, "open-online-docs");
    assert.include(prefs, "bindXulButtonActivation");
    assert.include(workspace, 'action === "open-help"');
    assert.include(workspace, 'action === "open-online-docs"');
    assert.include(html, "ZoteroSkillsMarkdownRenderer.renderInto");
    assert.include(html, "../help-docs/manifest.json");
    assert.include(html, "resolveSupportedLocale");
    assert.include(html, "help-locale-select");
    assert.include(html, "__zoteroAgentsHelpCenterBridge");
    assert.include(html, "onlineDocs");
    assert.include(html, "zs-doc-figure--icon");
    assert.include(html, "zs-doc-figure--poster");
  });

  it("pins plugin release update metadata to the migrated repository", async function () {
    const config = await readProjectFile("zotero-plugin.config.ts");

    assert.include(config, 'RELEASE_REPO = "leike0813/zotero-agents"');
    assert.include(
      config,
      "https://github.com/${RELEASE_REPO}/releases/download/release/",
    );
    assert.include(
      config,
      "https://github.com/${RELEASE_REPO}/releases/download/v{{version}}/{{xpiName}}.xpi",
    );
    assert.notInclude(config, "github.com/{{owner}}/{{repo}}");
  });

  it("commits generated help docs with resolvable manifest paths", async function () {
    const manifestPath = path.join(
      process.cwd(),
      "addon/content/help-docs/manifest.json",
    );
    const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as {
      schema: string;
      default_doc: string;
      locales: string[];
      docs: Array<{ id: string; locale: string; path: string }>;
      assets: string[];
    };

    assert.equal(manifest.schema, "zotero-agents.help-docs.v1");
    assert.equal(manifest.default_doc, "installation");
    assert.sameMembers(manifest.locales, [
      "de",
      "en",
      "es",
      "fr",
      "it",
      "ja",
      "ko",
      "ru",
      "zh-CN",
    ]);
    assert.isAtLeast(manifest.docs.length, 400);
    assert.isTrue(
      manifest.docs.some(
        (doc) => doc.locale === "zh-CN" && doc.id === "installation",
      ),
    );
    for (const doc of manifest.docs.slice(0, 10)) {
      await access(path.join(process.cwd(), "addon/content/help-docs", doc.path));
    }
    for (const asset of manifest.assets.slice(0, 10)) {
      await access(path.join(process.cwd(), "addon/content/help-docs", asset));
    }
  });
});
