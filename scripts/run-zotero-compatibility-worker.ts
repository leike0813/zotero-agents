import fs from "node:fs/promises";
import path from "node:path";

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

async function createEntryProxy(
  runRoot: string,
  name: string,
  sourceFiles: string[],
) {
  const relativeRoot = path.join(
    "compatibility-entries",
    path.basename(runRoot),
    name,
  );
  const content = `${sourceFiles
    .map((sourceFile) => `import ${JSON.stringify(sourceFile)};`)
    .join("\n")}\n`;
  const entryRoot = path.join(runRoot, relativeRoot);
  await fs.mkdir(entryRoot, { recursive: true });
  await fs.writeFile(path.join(entryRoot, "suite.test.ts"), content, "utf8");
  return relativeRoot.replaceAll("\\", "/");
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
  const hostFactsPath = path.join(runRoot, "diagnostics", "host-facts.json");
  await fs.mkdir(path.dirname(hostFactsPath), { recursive: true });
  await createDirectoryLink(
    path.join(projectRoot, "node_modules"),
    path.join(runRoot, "node_modules"),
  );
  await createDirectoryLink(
    path.join(projectRoot, "workflows_builtin"),
    path.join(runRoot, "workflows_builtin"),
  );
  await createDirectoryLink(
    path.join(projectRoot, "test"),
    path.join(runRoot, "test"),
  );
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
  process.chdir(projectRoot);
  const context = await Config.loadConfig({ dist: buildRoot });
  const configuredEntries = Array.isArray(context.test.entries)
    ? context.test.entries
    : [context.test.entries];
  const sourceFiles =
    mode === "xpi-smoke"
      ? [path.join(projectRoot, "test/zotero/compatibility/xpi/suite.test.ts")]
      : [
          ...configuredEntries.map((entry) =>
            path.resolve(projectRoot, String(entry), "suite.test.ts"),
          ),
          path.join(
            projectRoot,
            "test/zotero/compatibility/probe/suite.test.ts",
          ),
        ];
  context.test.entries = [await createEntryProxy(runRoot, mode, sourceFiles)];
  context.test.watch = false;
  context.test.headless = process.platform === "linux";
  context.test.prefs = {
    ...context.test.prefs,
    "extensions.zotero.zotero-skills.compatibilityTestXpiPath": String(
      process.env.ZOTERO_COMPAT_XPI_PATH || "",
    ).trim(),
  };

  process.chdir(runRoot);
  const test = new Test(context);
  context.test.headless = process.platform === "linux";
  const internals = test as unknown as {
    builder: { run: () => Promise<void> };
    reporter: {
      onData: (body: { type?: string; data?: any }) => Promise<void>;
    };
  };
  internals.builder.run = async () => undefined;
  const originalOnData = internals.reporter.onData.bind(internals.reporter);
  internals.reporter.onData = async (body) => {
    if (
      body?.type === "debug" &&
      body?.data?.kind === "zotero-compatibility-host-facts"
    ) {
      await fs.writeFile(
        hostFactsPath,
        `${JSON.stringify(body.data, null, 2)}\n`,
        "utf8",
      );
    }
    await originalOnData(body);
  };
  await test.run();
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
