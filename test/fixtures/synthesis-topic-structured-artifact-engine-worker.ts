import { parentPort } from "node:worker_threads";
import {
  createInProcessSynthesisTopicStructuredArtifactEngine,
  rebuildSynthesisTopicArtifactAssemblyRequest,
} from "../../packages/synthesis-engine/src/topicStructuredArtifact.ts";

parentPort?.once("message", async (message: unknown) => {
  const engine = createInProcessSynthesisTopicStructuredArtifactEngine();
  parentPort?.postMessage(
    await engine.assembleArtifact(
      rebuildSynthesisTopicArtifactAssemblyRequest(message),
    ),
  );
});
