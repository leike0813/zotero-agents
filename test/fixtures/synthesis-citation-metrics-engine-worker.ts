import { parentPort } from "node:worker_threads";
import {
  createInProcessSynthesisCitationGraphMetricsEngine,
  rebuildSynthesisCitationGraphMetricsRequest,
} from "../../packages/synthesis-engine/src/index.ts";

if (!parentPort) {
  throw new Error("Citation Graph metrics worker requires a parent port");
}

const engine = createInProcessSynthesisCitationGraphMetricsEngine();

parentPort.on("message", async (value: unknown) => {
  try {
    const request = rebuildSynthesisCitationGraphMetricsRequest(value);
    parentPort?.postMessage({ ok: true, result: await engine.compute(request) });
  } catch {
    parentPort?.postMessage({ ok: false });
  }
});
