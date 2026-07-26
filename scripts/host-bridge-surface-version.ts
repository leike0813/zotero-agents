import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  bumpHostBridgeSurfacePatch,
  inspectHostBridgeSurfaceVersion,
} from "./host-bridge-surface-model";

function option(name: string) {
  const prefix = `--${name}=`;
  const inline = process.argv.find((entry) => entry.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

export function inspectOrBumpHostBridgeSurfaceVersion(args: {
  definitionsPath?: string;
  surfaceId: string;
  bump?: boolean;
  alignCli?: boolean;
}) {
  if (args.bump || args.alignCli) {
    return bumpHostBridgeSurfacePatch({
      definitionsPath: args.definitionsPath,
      surfaceId: args.surfaceId,
      alignCli: args.alignCli,
    });
  }
  return inspectHostBridgeSurfaceVersion({
    definitionsPath: args.definitionsPath,
    surfaceId: args.surfaceId,
  });
}

function isMainModule() {
  return process.argv[1]
    ? resolve(process.argv[1]) === fileURLToPath(import.meta.url)
    : false;
}

if (isMainModule()) {
  const surfaceId = option("surface");
  if (!surfaceId) {
    throw new Error("--surface=<surface-id> is required");
  }
  process.stdout.write(
    `${JSON.stringify(
      inspectOrBumpHostBridgeSurfaceVersion({
        definitionsPath: option("definitions"),
        surfaceId,
        bump: process.argv.includes("--bump"),
        alignCli: process.argv.includes("--align-cli"),
      }),
      null,
      2,
    )}\n`,
  );
}
