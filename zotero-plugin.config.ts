import { defineConfig } from "zotero-plugin-scaffold";
import path from "node:path";
import { promises as fs } from "node:fs";
import pkg from "./package.json";
import { assertPluginHostBridgeAssets } from "./scripts/host-bridge/check-plugin-host-bridge-assets";
import { patchGeneratedZoteroTestRunner } from "./scripts/patch-zotero-test-runner";
import { stageDirectSynthesisBundle } from "./scripts/run-zotero-direct";
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
import {
  materializeCommittedSeed,
  readFixtureRegistry,
} from "./scripts/system-e2e/fixture";

export type TestDomain = "all" | "core" | "ui" | "workflow" | "e2e";
type TestMode = "lite" | "full";

/**
 * ZoteroPane opens `https://www.zotero.org/start` through `Zotero.launchURL()`
 * (the system default browser) whenever `extensions.zotero.firstRun2` is true at
 * startup, and only clears the flag afterwards. Test runs start from a fresh
 * profile, so that first run would open a browser tab every time.
 */
export const ZOTERO_TEST_FIRST_RUN_PREFS = {
  "extensions.zotero.firstRun2": false,
  "extensions.zotero.firstRunGuidance": false,
  "extensions.zotero.firstRunGuidanceShown.readAloud": false,
} as const;

export const ZOTERO_TEST_HEADLESS_ENV = "ZOTERO_TEST_HEADLESS";
export const MOZ_HEADLESS_ENV = "MOZ_HEADLESS";
export const ZOTERO_TEST_HEADLESS_WIDTH = "1280";
export const ZOTERO_TEST_HEADLESS_HEIGHT = "1024";

export type ZoteroTestDisplayMode = {
  /** Zotero runs without a display through the native `MOZ_HEADLESS` backend. */
  headless: boolean;
  /** The `zotero-plugin-scaffold` Xvfb path is needed to supply a virtual display. */
  needsXvfb: boolean;
};

export type ZoteroTestDisplayEnvironment = Pick<
  NodeJS.ProcessEnv,
  "DISPLAY" | "WAYLAND_DISPLAY" | typeof ZOTERO_TEST_HEADLESS_ENV
>;

/**
 * Headless is the default on every platform: Windows and macOS have no Xvfb
 * equivalent, so the native `MOZ_HEADLESS` backend is the only portable path.
 * Set `ZOTERO_TEST_HEADLESS=0` to fall back to a visible Zotero window.
 */
export function resolveZoteroTestDisplayMode(
  platform: NodeJS.Platform = process.platform,
  env: ZoteroTestDisplayEnvironment = process.env,
): ZoteroTestDisplayMode {
  const requested = String(env[ZOTERO_TEST_HEADLESS_ENV] ?? "")
    .trim()
    .toLowerCase();
  const headless = !["0", "false", "no", "off"].includes(requested);
  return {
    headless,
    needsXvfb:
      headless &&
      platform === "linux" &&
      !String(env.DISPLAY || "").trim() &&
      !String(env.WAYLAND_DISPLAY || "").trim(),
  };
}

/**
 * Applies the headless launch environment to a process environment that will
 * spawn Zotero, so the exported variables survive the whole
 * npm -> tsx -> zotero-plugin-scaffold -> Zotero process chain.
 */
export function applyZoteroTestHeadlessEnvironment(
  env: NodeJS.ProcessEnv,
  platform: NodeJS.Platform = process.platform,
): NodeJS.ProcessEnv {
  if (!resolveZoteroTestDisplayMode(platform, env).headless) {
    delete env[MOZ_HEADLESS_ENV];
    return env;
  }
  env[MOZ_HEADLESS_ENV] = "1";
  env.MOZ_HEADLESS_WIDTH ??= ZOTERO_TEST_HEADLESS_WIDTH;
  env.MOZ_HEADLESS_HEIGHT ??= ZOTERO_TEST_HEADLESS_HEIGHT;
  return env;
}

const ZOTERO_TEST_ENTRIES = {
  lite: {
    core: ["tests/zotero/core/lite"],
    ui: ["tests/zotero/ui/lite"],
    workflow: ["tests/zotero/workflow/lite"],
  },
  full: {
    core: ["tests/zotero/core/lite", "tests/zotero/core/full"],
    ui: ["tests/zotero/ui/lite", "tests/zotero/ui/full"],
    workflow: ["tests/zotero/workflow/lite", "tests/zotero/workflow/full"],
    e2e: ["tests/zotero/e2e/full"],
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
    normalized === "workflow" ||
    normalized === "e2e"
  ) {
    return normalized;
  }
  return "all";
}

export function resolveTestEntries(
  domain: TestDomain,
  mode: TestMode,
  requestedEntry?: string,
): string | string[] {
  const setup = "tests/zotero/setup.test.ts";
  const entry = String(requestedEntry || "").trim();
  if (entry) return [setup, path.extname(entry) ? path.dirname(entry) : entry];
  const entries = ZOTERO_TEST_ENTRIES[mode];
  if (domain === "core") {
    return [setup, ...entries.core];
  }
  if (domain === "ui") {
    return [setup, ...entries.ui];
  }
  if (domain === "workflow") {
    return [setup, ...entries.workflow];
  }
  if (domain === "e2e") {
    return [setup, ...(mode === "full" ? ZOTERO_TEST_ENTRIES.full.e2e : [])];
  }
  return [setup, ...entries.core, ...entries.ui, ...entries.workflow];
}

export function shouldStageDirectSynthesisBundle(
  domain: TestDomain = TEST_DOMAIN,
  env: NodeJS.ProcessEnv = process.env,
) {
  return (
    domain === "e2e" && env.ZOTERO_COMPAT_PREBUILT_ARTIFACTS?.trim() !== "1"
  );
}

const TEST_MODE = normalizeTestMode(process.env.ZOTERO_TEST_MODE);
const TEST_DOMAIN = normalizeTestDomain(process.env.ZOTERO_TEST_DOMAIN);
const TEST_ENTRIES = resolveTestEntries(
  TEST_DOMAIN,
  TEST_MODE,
  process.env.ZOTERO_TEST_ENTRY,
);
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

export async function stageZoteroE2EFixture(
  options: {
    domain?: TestDomain;
    env?: NodeJS.ProcessEnv;
    testRoot?: string;
  } = {},
) {
  const domain = options.domain || TEST_DOMAIN;
  const env = options.env || process.env;
  const testRoot = path.resolve(options.testRoot || ".scaffold/test");
  if (domain !== "e2e") return;
  const resumeRoot = String(env.ZOTERO_SYSTEM_E2E_RESUME_ROOT || "").trim();
  if (resumeRoot) {
    await Promise.all(
      ["data", "profile"].map((name) =>
        fs.cp(path.join(resumeRoot, name), path.join(testRoot, name), {
          recursive: true,
          force: true,
        }),
      ),
    );
    await Promise.all(
      ["parent.lock", ".parentlock", "lock"].map((name) =>
        fs.rm(path.join(testRoot, "profile", name), { force: true }),
      ),
    );
    return { kind: "resume" as const };
  }
  const dataSource = String(env.ZOTERO_E2E_GOLD_DATA_DIR || "").trim();
  const profileSource = String(env.ZOTERO_E2E_GOLD_PROFILE_DIR || "").trim();
  const goldSelected =
    String(env.ZOTERO_E2E_FIXTURE || "")
      .trim()
      .toLowerCase() === "gold" || Boolean(dataSource || profileSource);
  if (!goldSelected) {
    const fixtureRoot = path.resolve("tests/fixtures/zotero-e2e");
    const fixture = await materializeCommittedSeed({
      sourceDir: path.join(fixtureRoot, "committed-seed-v1"),
      targetDir: path.join(testRoot, "data", "system-e2e"),
      registry: await readFixtureRegistry(
        path.join(fixtureRoot, "registry.json"),
      ),
    });
    env.ZOTERO_E2E_FIXTURE_ID = fixture.identity.fixtureId;
    env.ZOTERO_E2E_FIXTURE_SCHEMA_VERSION = fixture.identity.schemaVersion;
    env.ZOTERO_E2E_FIXTURE_REVISION = String(fixture.identity.fixtureRevision);
    return { kind: "committed-seed" as const, fixture: fixture.identity };
  }
  if (!dataSource) {
    throw new Error("ZOTERO_E2E_GOLD_DATA_DIR is required for a gold run");
  }
  const dataTarget = path.join(testRoot, "data");
  await fs.cp(dataSource, dataTarget, {
    recursive: true,
    force: true,
  });
  await Promise.all(
    [
      path.join(dataTarget, "zotero-agents/data/synthesis/identity.json"),
      path.join(dataTarget, "zotero-agents/runtime/logs"),
      path.join(dataTarget, "zotero-agents/runtime/synthesis/service-runtime"),
    ].map((target) => fs.rm(target, { recursive: true, force: true })),
  );
  if (profileSource) {
    await fs.cp(profileSource, path.join(testRoot, "profile"), {
      recursive: true,
      force: true,
    });
  }
  env.ZOTERO_E2E_GOLD_ID ||= "lisongtao-v1";
  return { kind: "private-gold" as const, fixtureId: env.ZOTERO_E2E_GOLD_ID };
}

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
    bumpp: {
      execute: "npm run check:synthesis-sidecar-runtime-xpi",
    },
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
            "releases",
            "host-bridge",
            "cli-release.json",
          ),
        });
      },
    },
    assets: [
      "addon/**/*.*",
      "!addon/content/harness/prototype-*.html",
      "!addon/content/harness/prototype-*.bundle.js",
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
        plugins: [runtimeDiagnosticsSideEffectsPlugin],
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
    headless: resolveZoteroTestDisplayMode().needsXvfb,
    startupDelay: TEST_DOMAIN === "e2e" ? 30_000 : 100,
    // ZoteroPane opens https://www.zotero.org/start through Zotero.launchURL()
    // (i.e. the system default browser) whenever `extensions.zotero.firstRun2`
    // is true at startup, and only clears the flag afterwards. Every test run
    // starts from a fresh profile, so that first run would open a browser tab
    // each time. Pin the first-run flags here instead of relying on upstream
    // scaffold defaults.
    prefs: { ...ZOTERO_TEST_FIRST_RUN_PREFS },
    waitForPlugin: `() => Zotero.${pkg.config.addonInstance}.data.initialized`,
    hooks: {
      "test:init": stageZoteroE2EFixture,
      "test:prebuild": async () => {
        if (shouldStageDirectSynthesisBundle()) {
          stageDirectSynthesisBundle(path.resolve(".scaffold/build/addon"));
        }
      },
      "test:bundleTests": async () => {
        await patchGeneratedZoteroTestRunner();
      },
    },
  },

  // If you need to see a more detailed log, uncomment the following line:
  // logLevel: "trace",
});
