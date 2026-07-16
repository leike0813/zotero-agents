import { writeServiceLog } from "./logging.js";
import { loadRuntimeConfig, parseConfigPath } from "./runtimeConfig.js";
import { startSynthesisSidecarServer } from "./server.js";

let terminating = false;

function failFast(kind: string, error: unknown) {
  if (terminating) {
    return;
  }
  terminating = true;
  writeServiceLog("service_fatal", {
    kind,
    errorType: error instanceof Error ? error.name : typeof error,
  });
  process.exit(1);
}

process.once("uncaughtException", (error) => {
  failFast("uncaught_exception", error);
});
process.once("unhandledRejection", (error) => {
  failFast("unhandled_rejection", error);
});

async function main() {
  const configPath = parseConfigPath(process.argv.slice(2));
  const config = loadRuntimeConfig(configPath);
  const runtime = await startSynthesisSidecarServer(config);
  const stopForSignal = (signal: NodeJS.Signals) => {
    runtime.beginShutdown(signal.toLowerCase());
  };
  process.once("SIGINT", stopForSignal);
  process.once("SIGTERM", stopForSignal);
  await runtime.stopped;
}

main().catch((error) => {
  writeServiceLog("service_start_failed", {
    code:
      error && typeof error === "object" && "code" in error
        ? String(error.code)
        : "internal_error",
    errorType: error instanceof Error ? error.name : typeof error,
  });
  process.exitCode = 1;
});
