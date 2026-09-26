import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { persistCompatibilityHostFactsEvent } from "./zotero-compatibility-fixture";

function requiredEnvironment(name: string) {
  const value = String(process.env[name] || "").trim();
  if (!value)
    throw new Error(`Missing compatibility worker environment: ${name}`);
  return value;
}

async function createDirectoryLink(source: string, target: string) {
  await fs.mkdir(path.dirname(target), { recursive: true });
  try {
    await fs.symlink(
      source,
      target,
      process.platform === "win32" ? "junction" : "dir",
    );
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
  }
}

export function resolveCompatibilityWorkerEntries(
  mode: string,
  configuredEntries: readonly unknown[],
  domain = "all",
  installCandidateXpi = false,
  lane = "",
) {
  return mode === "xpi-smoke"
    ? ["tests/zotero/compatibility/xpi"]
    : domain === "e2e"
      ? [
          ...(installCandidateXpi ? ["tests/zotero/compatibility/xpi"] : []),
          ...configuredEntries.map((entry) =>
            lane === "acceptance" && entry === "tests/zotero/e2e/full"
              ? "tests/zotero/e2e/acceptance"
              : String(entry),
          ),
        ]
      : [...configuredEntries.map(String), "tests/zotero/compatibility/probe"];
}

export async function materializeCompatibilityTestWorkspace(
  projectRoot: string,
  runRoot: string,
  lane = "",
) {
  await fs.mkdir(path.join(runRoot, "tests"), { recursive: true });
  await fs.cp(
    path.join(projectRoot, "tests/zotero"),
    path.join(runRoot, "tests/zotero"),
    { recursive: true },
  );
  if (lane === "acceptance") {
    const full = path.join(runRoot, "tests/zotero/e2e/full");
    const selected = (await fs.readdir(full)).filter((name) =>
      /^30[0-2]-.*\.zotero\.test\.ts$/.test(name),
    );
    if (
      selected.length !== 3 ||
      ["300-", "301-", "302-"].some(
        (prefix) => !selected.some((name) => name.startsWith(prefix)),
      )
    ) {
      throw new Error("acceptance_phase1_test_membership_invalid");
    }
    const acceptance = path.join(runRoot, "tests/zotero/e2e/acceptance");
    await fs.mkdir(acceptance, { recursive: true });
    await Promise.all(
      selected.map((name) =>
        fs.copyFile(path.join(full, name), path.join(acceptance, name)),
      ),
    );
  }
  for (const relative of [
    "tests/fixtures",
    "tests/helpers",
    "src",
    "scripts",
    "packages",
  ]) {
    await createDirectoryLink(
      path.join(projectRoot, relative),
      path.join(runRoot, relative),
    );
  }
  await fs.copyFile(
    path.join(projectRoot, "package.json"),
    path.join(runRoot, "package.json"),
  );
}

async function main() {
  const projectRoot = path.resolve(
    requiredEnvironment("ZOTERO_COMPAT_PROJECT_ROOT"),
  );
  const runRoot = path.resolve(requiredEnvironment("ZOTERO_COMPAT_RUN_ROOT"));
  const buildRoot = path.resolve(
    requiredEnvironment("ZOTERO_COMPAT_BUILD_ROOT"),
  );
  const mode = requiredEnvironment("ZOTERO_COMPAT_MODE");
  const domain = requiredEnvironment("ZOTERO_TEST_DOMAIN");
  await createDirectoryLink(
    path.join(projectRoot, "node_modules"),
    path.join(runRoot, "node_modules"),
  );
  await createDirectoryLink(
    path.join(projectRoot, "workflows_builtin"),
    path.join(runRoot, "workflows_builtin"),
  );
  const lane = String(process.env.ZOTERO_E2E_TRIGGER_LANE || "").trim();
  await materializeCompatibilityTestWorkspace(projectRoot, runRoot, lane);
  try {
    await fs.access(path.join(projectRoot, ".scaffold", "cache"));
    await createDirectoryLink(
      path.join(projectRoot, ".scaffold", "cache"),
      path.join(runRoot, ".scaffold", "cache"),
    );
  } catch {
    // Fresh CI workers can let scaffold populate their run-local cache.
  }

  process.chdir(runRoot);
  const { Config, Test } = await import("zotero-plugin-scaffold");
  const { resolveZoteroTestDisplayMode } =
    await import("../zotero-plugin.config");
  process.chdir(projectRoot);
  const context = await Config.loadConfig({ dist: buildRoot });
  const configuredEntries = Array.isArray(context.test.entries)
    ? context.test.entries
    : [context.test.entries];
  context.test.entries = resolveCompatibilityWorkerEntries(
    mode,
    configuredEntries,
    domain,
    process.env.ZOTERO_COMPAT_INSTALL_CANDIDATE_XPI === "1",
    lane,
  );
  context.test.watch = false;
  context.test.headless = resolveZoteroTestDisplayMode().needsXvfb;
  context.test.prefs = {
    ...context.test.prefs,
    "extensions.zotero.zotero-skills.compatibilityTestXpiPath": String(
      process.env.ZOTERO_COMPAT_XPI_PATH || "",
    ).trim(),
    "extensions.zotero.zotero-skills.compatibilityKeepXpiInstalled":
      process.env.ZOTERO_COMPAT_INSTALL_CANDIDATE_XPI === "1",
    "extensions.zotero.zotero-skills.compatibilityPreviousXpiPath": String(
      process.env.ZOTERO_COMPAT_PREVIOUS_XPI_PATH || "",
    ).trim(),
  };
  process.chdir(runRoot);
  const test = new Test(context);
  context.test.headless = resolveZoteroTestDisplayMode().needsXvfb;
  const internals = test as unknown as {
    builder: { run: () => Promise<void> };
    reporter: {
      onData: (body: { type?: string; data?: any }) => Promise<void>;
    };
  };
  internals.builder.run = async () => undefined;
  const originalOnData = internals.reporter.onData.bind(internals.reporter);
  internals.reporter.onData = async (body) => {
    await persistCompatibilityHostFactsEvent(runRoot, body);
    await originalOnData(body);
  };
  await test.run();
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  void main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
