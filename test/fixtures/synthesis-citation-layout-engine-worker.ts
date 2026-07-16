import { parentPort } from "node:worker_threads";
import {
  createInProcessSynthesisCitationGraphLayoutEngine,
  rebuildSynthesisCitationGraphLayoutRequest,
} from "../../packages/synthesis-engine/src/index.ts";

if (!parentPort) {
  throw new Error("Citation Graph layout worker requires a parent port");
}

const engine = createInProcessSynthesisCitationGraphLayoutEngine();

parentPort.on("message", async (value: unknown) => {
  try {
    const request = rebuildSynthesisCitationGraphLayoutRequest(value);
    parentPort?.postMessage({ ok: true, result: await engine.compute(request) });
  } catch {
    parentPort?.postMessage({ ok: false });
  }
});
