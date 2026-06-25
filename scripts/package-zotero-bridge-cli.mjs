import { copyFile, mkdir, stat, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

const platform = (
  process.env.ZOTERO_BRIDGE_PLATFORM ||
  process.argv.find((arg) => arg.startsWith("--platform="))?.split("=")[1] ||
  ""
).trim();
const targetTriple = (
  process.env.ZOTERO_BRIDGE_TARGET ||
  process.argv.find((arg) => arg.startsWith("--target="))?.split("=")[1] ||
  ""
).trim();

const platformByRuntime = {
  win32: "win32-x64",
  darwin: process.arch === "arm64" ? "darwin-arm64" : "darwin-x64",
  linux:
    process.arch === "ia32" || process.arch === "x32"
      ? "linux-x86"
      : process.arch === "arm"
        ? "linux-arm"
        : process.arch === "arm64"
          ? "linux-arm64"
          : "linux-x64",
};

const targetPlatform = platform || platformByRuntime[process.platform] || "";
if (!targetPlatform) {
  throw new Error(`Unsupported packaging platform: ${process.platform}`);
}

const binaryName = targetPlatform.startsWith("win32")
  ? "zotero-bridge.exe"
  : "zotero-bridge";
const source = path.join(
  "cli",
  "zotero-bridge",
  "target",
  ...(targetTriple ? [targetTriple] : []),
  "release",
  binaryName,
);
const targetDir = path.join("addon", "bin", targetPlatform);
const target = path.join(targetDir, binaryName);

await stat(source);
await mkdir(targetDir, { recursive: true });
await copyFile(source, target);

const bytes = await readFile(target);
const sha256 = createHash("sha256").update(bytes).digest("hex");
await writeFile(`${target}.sha256`, `${sha256}  ${binaryName}\n`, "utf8");

console.log(
  JSON.stringify({
    ok: true,
    platform: targetPlatform,
    targetTriple: targetTriple || null,
    source,
    target,
    sha256,
  }),
);
