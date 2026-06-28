import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const TARGET = "x86_64-pc-windows-msvc";
const PLATFORM = "win32-x64";
const BINARY = "zotero-acp-bridge.exe";

function argValue(name) {
  const prefix = `--${name}=`;
  return process.argv
    .find((arg) => arg.startsWith(prefix))
    ?.slice(prefix.length);
}

const target = (
  process.env.ZOTERO_ACP_BRIDGE_TARGET ||
  argValue("target") ||
  TARGET
).trim();
if (target !== TARGET) {
  throw new Error(
    `ACP WebSocket bridge only supports ${TARGET}, got ${target}`,
  );
}

const source = path.join(
  "native",
  "acp-ws-bridge",
  "target",
  target,
  "release",
  BINARY,
);
const targetDir = path.join("addon", "bin", PLATFORM);
const output = path.join(targetDir, BINARY);

await stat(source);
await mkdir(targetDir, { recursive: true });
await copyFile(source, output);

const bytes = await readFile(output);
const sha256 = createHash("sha256").update(bytes).digest("hex");
await writeFile(`${output}.sha256`, `${sha256}  ${BINARY}\n`, "utf8");

console.log(
  JSON.stringify({
    ok: true,
    platform: PLATFORM,
    target,
    source,
    output,
    sha256,
  }),
);
