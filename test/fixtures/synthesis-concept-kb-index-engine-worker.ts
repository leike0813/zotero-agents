import { parentPort } from "node:worker_threads";
import {
  createInProcessSynthesisConceptKbIndexEngine,
  rebuildSynthesisConceptKbIndexRequest,
  rebuildSynthesisConceptKbQueryRequest,
} from "../../packages/synthesis-engine/src/conceptKbIndex.ts";

parentPort?.once(
  "message",
  async (message: { index: unknown; query: unknown }) => {
    const engine = createInProcessSynthesisConceptKbIndexEngine();
    parentPort?.postMessage({
      index: await engine.buildIndex(
        rebuildSynthesisConceptKbIndexRequest(message.index),
      ),
      query: await engine.query(
        rebuildSynthesisConceptKbQueryRequest(message.query),
      ),
    });
  },
);
