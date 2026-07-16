import { parentPort } from "node:worker_threads";
import {
  createInProcessSynthesisTopicGraphIndexEngine,
  rebuildSynthesisTopicGraphIndexRequest,
} from "../../packages/synthesis-engine/src/topicGraphIndex.ts";

parentPort?.once("message", async (message: unknown) => {
  const engine = createInProcessSynthesisTopicGraphIndexEngine();
  parentPort?.postMessage(
    await engine.buildIndex(rebuildSynthesisTopicGraphIndexRequest(message)),
  );
});
