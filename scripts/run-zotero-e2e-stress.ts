import { spawn } from "node:child_process";

const command = process.platform === "win32" ? "cmd.exe" : "npm";
const args =
  process.platform === "win32"
    ? ["/d", "/s", "/c", "npm", "run", "test:zotero:e2e"]
    : ["run", "test:zotero:e2e"];
const child = spawn(command, args, {
  stdio: "inherit",
  windowsHide: true,
  env: {
    ...process.env,
    ZOTERO_TEST_ENTRY:
      "tests/zotero/ui/full/276-dashboard-synthesis-close.zotero.test.ts",
    ZOTERO_SYNTHESIS_CLOSE_CYCLES:
      process.env.ZOTERO_SYNTHESIS_CLOSE_CYCLES || "100",
    ZOTERO_SYNTHESIS_CLOSE_REAL_LIBRARY:
      process.env.ZOTERO_SYNTHESIS_CLOSE_REAL_LIBRARY ||
      (process.env.ZOTERO_E2E_GOLD_DATA_DIR ? "1" : "0"),
  },
});
child.on("exit", (code) => process.exit(typeof code === "number" ? code : 1));
