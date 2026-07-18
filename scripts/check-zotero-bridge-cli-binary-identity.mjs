#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

function argValue(name) {
  const prefix = `--${name}=`;
  return process.argv.find((entry) => entry.startsWith(prefix))?.slice(prefix.length) || "";
}

async function readJson(root, relativePath) {
  return JSON.parse(await fs.readFile(path.join(root, relativePath), "utf8"));
}

export async function checkHostBridgeCliBinaryIdentity(options = {}) {
  const root = path.resolve(options.root || process.cwd());
  const platform = String(options.platform || "").trim();
  const binary = String(options.binary || "").trim();
  if (!platform || !binary) {
    throw new Error("platform and binary are required");
  }

  const [release, surface, bytes] = await Promise.all([
    readJson(root, "cli/zotero-bridge/release.json"),
    readJson(root, "cli/zotero-bridge/src/agent-surface.json"),
    fs.readFile(path.join(root, "addon", "bin", platform, binary)),
  ]);
  const expected = [
    release.version,
    release.buildFingerprint,
    surface.protocol,
    surface.cliSchema,
    surface.commandCatalogChecksum,
  ].map((value) => String(value || ""));
  const missing = expected.filter(
    (value) => !value || bytes.indexOf(Buffer.from(value, "utf8")) < 0,
  );
  return {
    ok: missing.length === 0,
    platform,
    binary,
    missing,
  };
}

async function main() {
  const result = await checkHostBridgeCliBinaryIdentity({
    platform: argValue("platform"),
    binary: argValue("binary"),
  });
  process.stdout.write(`${JSON.stringify(result)}\n`);
  if (!result.ok) {
    process.exitCode = 1;
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  await main();
}
