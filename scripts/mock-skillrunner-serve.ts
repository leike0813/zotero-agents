import path from "path";
import { fileURLToPath } from "url";
import {
  literatureDigestBundlePath,
  startMockSkillRunnerServer,
} from "../tests/mock-skillrunner/server";

type CliOptions = {
  host: string;
  port: number;
  pollDelayMs: number;
  bundlePath: string;
};

function projectRoot() {
  const filePath = fileURLToPath(import.meta.url);
  return path.resolve(path.dirname(filePath), "..");
}

function parseNumber(value: string, fallback: number) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return fallback;
  }
  return parsed;
}

function parseArgs(rootDir: string): CliOptions {
  const defaults: CliOptions = {
    host: "127.0.0.1",
    port: 18030,
    pollDelayMs: 50,
    bundlePath: literatureDigestBundlePath(rootDir),
  };

  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const next = args[i + 1] || "";
    if (arg === "--host" && next) {
      defaults.host = next;
      i += 1;
      continue;
    }
    if (arg === "--port" && next) {
      defaults.port = parseNumber(next, defaults.port);
      i += 1;
      continue;
    }
    if (arg === "--poll-delay" && next) {
      defaults.pollDelayMs = parseNumber(next, defaults.pollDelayMs);
      i += 1;
      continue;
    }
    if (arg === "--bundle" && next) {
      defaults.bundlePath = path.resolve(next);
      i += 1;
      continue;
    }
  }

  return defaults;
}

async function main() {
  const rootDir = projectRoot();

  const options = parseArgs(rootDir);
  const server = await startMockSkillRunnerServer({
    bundlePath: options.bundlePath,
    host: options.host,
    port: options.port,
    pollDelayMs: options.pollDelayMs,
  });

  console.log("mock skillrunner started");
  console.log(`baseUrl=${server.baseUrl}`);
  console.log(`bundlePath=${options.bundlePath}`);
  console.log("press Ctrl+C to stop");

  const shutdown = async () => {
    await server.close();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
