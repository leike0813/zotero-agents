import { defineConfig } from "zotero-plugin-scaffold";
import path from "node:path";
import pkg from "./package.json";
import { assertPluginHostBridgeAssets } from "./scripts/check-plugin-host-bridge-assets";
import { patchGeneratedZoteroTestRunner } from "./scripts/patch-zotero-test-runner";
import {
  dashboardSynthesisSidecarRegionElisionPlugin,
  runtimeDiagnosticsSideEffectsPlugin,
} from "./scripts/runtime-diagnostics-esbuild";
import {
  ACP_RUNTIME_PERFORMANCE_PROFILER_ENABLED,
  ACP_RUNTIME_REPLAY_PROFILER_ENABLED,
  ACP_RUNTIME_SEMANTIC_TRACE_RECORDER_ENABLED,
  SKILLRUNNER_CONNECTION_AUDIT_ENABLED,
  SYNTHESIS_SIDECAR_DIAGNOSTICS_ENABLED,
  WORKSPACE_PUBLICATION_WIRE_ASSERT_ENABLED,
} from "./src/modules/debugMode";

type TestDomain = "all" | "core" | "ui" | "workflow";
type TestMode = "lite" | "full";

export function shouldUseHeadlessZoteroTest(
  platform: NodeJS.Platform = process.platform,
  env: Pick<NodeJS.ProcessEnv, "DISPLAY" | "WAYLAND_DISPLAY"> = process.env,
) {
  return (
    platform === "linux" &&
    !String(env.DISPLAY || "").trim() &&
    !String(env.WAYLAND_DISPLAY || "").trim()
  );
}

const ZOTERO_TEST_ENTRIES = {
  lite: {
    core: "test/zotero/core/lite",
    ui: "test/zotero/ui/lite",
    workflow: "test/zotero/workflow/lite",
  },
  full: {
    core: "test/zotero/core/full",
    ui: "test/zotero/ui/full",
    workflow: "test/zotero/workflow/full",
  },
} as const;

function normalizeTestMode(value: string | undefined): TestMode {
  return String(value || "")
    .trim()
    .toLowerCase() === "full"
    ? "full"
    : "lite";
}

function normalizeTestDomain(value: string | undefined): TestDomain {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();
  if (
    normalized === "core" ||
    normalized === "ui" ||
    normalized === "workflow"
  ) {
    return normalized;
  }
  return "all";
}

function resolveTestEntries(
  domain: TestDomain,
  mode: TestMode,
): string | string[] {
  const entries = ZOTERO_TEST_ENTRIES[mode];
  if (domain === "core") {
    return [entries.core];
  }
  if (domain === "ui") {
    return [entries.ui];
  }
  if (domain === "workflow") {
    return [entries.workflow];
  }
  return [entries.core, entries.ui, entries.workflow];
}

const TEST_MODE = normalizeTestMode(process.env.ZOTERO_TEST_MODE);
const TEST_DOMAIN = normalizeTestDomain(process.env.ZOTERO_TEST_DOMAIN);
const TEST_ENTRIES = resolveTestEntries(TEST_DOMAIN, TEST_MODE);
const RELEASE_REPO = "leike0813/zotero-agents";
const RELEASE_UPLOAD_REPO = process.env.GITHUB_REPOSITORY || RELEASE_REPO;

async function resolveGitBranch(): Promise<string> {
  try {
    // @ts-expect-error -- dynamic import for ESM/CJS compatibility
    const { createRequire } = await import("node:module");
    // @ts-expect-error -- createRequire result typed as any
    const { execSync } = createRequire(import.meta.url)("node:child_process");
    return execSync("git rev-parse --abbrev-ref HEAD", {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
      timeout: 5000,
    }).trim();
  } catch {
    return "";
  }
}

const branch = await resolveGitBranch();
const DEBUG_MODE = branch === "dev" || branch.startsWith("dev-");

export default defineConfig({
  source: ["src", "addon"],
  // 关闭开发模式下的热重载，避免大文件变更导致频繁 rebuild + reload
  watchIgnore: ["**/*"],
  dist: ".scaffold/build",
  name: pkg.config.addonName,
  id: pkg.config.addonID,
  namespace: pkg.config.addonRef,
  updateURL: `https://github.com/${RELEASE_REPO}/releases/download/release/${
    pkg.version.includes("-") ? "update-beta.json" : "update.json"
  }`,
  xpiDownloadLink: `https://github.com/${RELEASE_REPO}/releases/download/v{{version}}/{{xpiName}}.xpi`,

  release: {
    github: {
      repository: RELEASE_UPLOAD_REPO,
    },
  },

  build: {
    hooks: {
      "build:pack": (ctx) => {
        assertPluginHostBridgeAssets({
          xpiPath: path.join(ctx.dist, `${ctx.xpiName}.xpi`),
          hostBridgeReleasePath: path.join(
            "cli",
            "zotero-bridge",
            "release.json",
          ),
        });
      },
    },
    assets: [
      "addon/**/*.*",
      "addon/bin/**/*",
      "addon/bin/**/zotero-bridge",
      "addon/bin/**/synthesis-sidecar/**/*",
      "addon/content/host-bridge-skills/**/*",
    ],
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
          __debug_mode__: String(DEBUG_MODE),
          __acp_runtime_performance_profiler_enabled__: String(
            ACP_RUNTIME_PERFORMANCE_PROFILER_ENABLED,
          ),
          __acp_runtime_semantic_trace_recorder_enabled__: String(
            ACP_RUNTIME_SEMANTIC_TRACE_RECORDER_ENABLED,
          ),
          __acp_runtime_replay_profiler_enabled__: String(
            ACP_RUNTIME_REPLAY_PROFILER_ENABLED,
          ),
          __skillrunner_connection_audit_enabled__: String(
            SKILLRUNNER_CONNECTION_AUDIT_ENABLED,
          ),
          __synthesis_sidecar_diagnostics_enabled__: String(
            SYNTHESIS_SIDECAR_DIAGNOSTICS_ENABLED,
          ),
          __workspace_publication_wire_assert_enabled__: String(
            WORKSPACE_PUBLICATION_WIRE_ASSERT_ENABLED,
          ),
        },
        bundle: true,
        minifySyntax: true,
        plugins: [runtimeDiagnosticsSideEffectsPlugin],
        target: "firefox115",
        outfile: `.scaffold/build/addon/content/scripts/${pkg.config.addonRef}.js`,
      },
      {
        entryPoints: ["src/synthesisWorkbenchApp.ts"],
        jsx: "automatic",
        jsxImportSource: "preact",
        define: {
          __debug_mode__: String(DEBUG_MODE),
        },
        bundle: true,
        minifySyntax: true,
        target: "firefox115",
        outfile: ".scaffold/build/addon/content/synthesis/app.bundle.js",
      },
      {
        entryPoints: ["src/synthesis/standaloneTopicApp.ts"],
        bundle: true,
        minifySyntax: true,
        jsx: "automatic",
        jsxImportSource: "preact",
        target: "firefox115",
        outfile:
          ".scaffold/build/addon/content/synthesis/topic-export.bundle.js",
      },
      {
        entryPoints: ["src/dashboard/dashboardApp.ts"],
        define: {
          __debug_mode__: String(DEBUG_MODE),
          __synthesis_sidecar_diagnostics_enabled__: String(
            SYNTHESIS_SIDECAR_DIAGNOSTICS_ENABLED,
          ),
        },
        bundle: true,
        minifySyntax: true,
        jsx: "automatic",
        jsxImportSource: "preact",
        plugins: [dashboardSynthesisSidecarRegionElisionPlugin],
        target: "firefox115",
        outfile: ".scaffold/build/addon/content/dashboard/app.js",
      },
      {
        entryPoints: ["src/dashboard/workflowSettingsDialogApp.ts"],
        define: {
          __debug_mode__: String(DEBUG_MODE),
          __synthesis_sidecar_diagnostics_enabled__: String(
            SYNTHESIS_SIDECAR_DIAGNOSTICS_ENABLED,
          ),
        },
        bundle: true,
        minifySyntax: true,
        jsx: "automatic",
        jsxImportSource: "preact",
        target: "firefox115",
        outfile:
          ".scaffold/build/addon/content/dashboard/workflow-settings-dialog.js",
      },
      {
        entryPoints: ["src/dashboard/backendManagerApp.ts"],
        bundle: true,
        minifySyntax: true,
        jsx: "automatic",
        jsxImportSource: "preact",
        target: "firefox115",
        outfile: ".scaffold/build/addon/content/dashboard/backend-manager.js",
      },
      {
        entryPoints: ["src/workspaceApp.ts"],
        bundle: true,
        target: "firefox115",
        outfile: ".scaffold/build/addon/content/workspace/app.bundle.js",
      },
      {
        entryPoints: ["src/sidebar/acpChildApp.js"],
        bundle: true,
        jsx: "automatic",
        jsxImportSource: "preact",
        target: "firefox115",
        outfile: ".scaffold/build/addon/content/sidebar/acp-child.bundle.js",
      },
      {
        entryPoints: ["src/sidebar/assistantWorkspaceApp.js"],
        bundle: true,
        jsx: "automatic",
        jsxImportSource: "preact",
        target: "firefox115",
        outfile:
          ".scaffold/build/addon/content/sidebar/assistant-workspace.bundle.js",
      },
      {
        entryPoints: ["src/workers/runtimeFileRangeWorker.ts"],
        bundle: true,
        target: "firefox115",
        outfile:
          ".scaffold/build/addon/content/workers/runtime-file-range-worker.js",
      },
    ],
  },

  test: {
    entries: TEST_ENTRIES,
    headless: shouldUseHeadlessZoteroTest(),
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
