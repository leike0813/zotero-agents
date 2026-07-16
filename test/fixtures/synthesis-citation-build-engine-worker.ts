import { parentPort } from "node:worker_threads";
import {
  computeSynthesisCitationGraphBuild,
  rebuildSynthesisCitationGraphBuildRequest,
} from "../../packages/synthesis-engine/src/citationGraphBuild.ts";

parentPort?.on("message", (input: unknown) => {
  parentPort?.postMessage(
    computeSynthesisCitationGraphBuild(
      rebuildSynthesisCitationGraphBuildRequest(input),
    ),
  );
});
