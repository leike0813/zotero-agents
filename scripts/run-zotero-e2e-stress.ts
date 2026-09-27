import { spawn } from "node:child_process";
import { pathToFileURL } from "node:url";

export function buildSynthesisCloseTestEnvironment(
  args: string[] = [],
  env: NodeJS.ProcessEnv = process.env,
) {
  const catalog = args.includes("--catalog");
  return {
    ...env,
    ZOTERO_TEST_ENTRY:
      "tests/zotero/ui/full/276-dashboard-synthesis-close.zotero.test.ts",
    ZOTERO_SYNTHESIS_CLOSE_CYCLES:
      env.ZOTERO_SYNTHESIS_CLOSE_CYCLES || (catalog ? "30" : "100"),
    ZOTERO_SYNTHESIS_CLOSE_REAL_LIBRARY:
      env.ZOTERO_SYNTHESIS_CLOSE_REAL_LIBRARY ||
      (env.ZOTERO_E2E_GOLD_DATA_DIR ? "1" : "0"),
    ...(catalog
      ? {
          ZOTERO_SYSTEM_E2E_CASE: "CG-02",
          ZOTERO_E2E_TRIGGER_LANE: "cg-02-windows",
        }
      : {}),
  };
}

export function runSynthesisCloseTest(args = process.argv.slice(2)) {
  const command = process.platform === "win32" ? "cmd.exe" : "npm";
  const commandArgs =
    process.platform === "win32"
      ? ["/d", "/s", "/c", "npm", "run", "test:zotero:e2e"]
      : ["run", "test:zotero:e2e"];
  const child = spawn(command, commandArgs, {
    stdio: "inherit",
    windowsHide: true,
    env: buildSynthesisCloseTestEnvironment(args),
  });
  child.on("exit", (code) => process.exit(typeof code === "number" ? code : 1));
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  runSynthesisCloseTest();
}
