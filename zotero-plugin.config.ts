import { defineConfig } from "zotero-plugin-scaffold";
import pkg from "./package.json";
import { patchGeneratedZoteroTestRunner } from "./scripts/patch-zotero-test-runner";

type TestDomain = "all" | "core" | "ui" | "workflow";

function normalizeTestDomain(value: string | undefined): TestDomain {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "core" || normalized === "ui" || normalized === "workflow") {
    return normalized;
  }
  return "all";
}

function resolveTestEntries(domain: TestDomain): string | string[] {
  if (domain === "core") {
    return ["test/core"];
  }
  if (domain === "ui") {
    return ["test/ui"];
  }
  if (domain === "workflow") {
    return ["test/workflow-*"];
  }
  return ["test/core", "test/ui", "test/workflow-*"];
}

const TEST_DOMAIN = normalizeTestDomain(process.env.ZOTERO_TEST_DOMAIN);
const TEST_ENTRIES = resolveTestEntries(TEST_DOMAIN);

export default defineConfig({
  source: ["src", "addon"],
  // 关闭开发模式下的热重载，避免大文件变更导致频繁 rebuild + reload
  watchIgnore: ["**/*"],
  dist: ".scaffold/build",
  name: pkg.config.addonName,
  id: pkg.config.addonID,
  namespace: pkg.config.addonRef,
  updateURL: `https://github.com/{{owner}}/{{repo}}/releases/download/release/${
    pkg.version.includes("-") ? "update-beta.json" : "update.json"
  }`,
  xpiDownloadLink:
    "https://github.com/{{owner}}/{{repo}}/releases/download/v{{version}}/{{xpiName}}.xpi",

  build: {
    assets: ["addon/**/*.*", "workflows_builtin/**/*.*", "skills_builtin/**/*.*"],
    define: {
      ...pkg.config,
      author: pkg.author,
      description: pkg.description,
      homepage: pkg.homepage,
      buildVersion: pkg.version,
      buildTime: "{{buildTime}}",
    },
    prefs: {
      prefix: pkg.config.prefsPrefix,
    },
    esbuildOptions: [
      {
        entryPoints: ["src/index.ts"],
        define: {
          __env__: `"${process.env.NODE_ENV}"`,
        },
        bundle: true,
        target: "firefox115",
        outfile: `.scaffold/build/addon/content/scripts/${pkg.config.addonRef}.js`,
      },
      {
        entryPoints: ["src/synthesisWorkbenchApp.ts"],
        bundle: true,
        target: "firefox115",
        outfile: ".scaffold/build/addon/content/synthesis/app.bundle.js",
      },
      {
        entryPoints: ["src/workspaceApp.ts"],
        bundle: true,
        target: "firefox115",
        outfile: ".scaffold/build/addon/content/workspace/app.bundle.js",
      },
    ],
  },

  test: {
    entries: TEST_ENTRIES,
    startupDelay: 100,
    waitForPlugin: `() => Zotero.${pkg.config.addonInstance}.data.initialized`,
    hooks: {
      "test:bundleTests": async () => {
        await patchGeneratedZoteroTestRunner();
      },
    },
  },

  // If you need to see a more detailed log, uncomment the following line:
  // logLevel: "trace",
});
