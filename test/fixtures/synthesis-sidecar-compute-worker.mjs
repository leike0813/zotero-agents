import { parentPort } from "node:worker_threads";

if (!parentPort) {
  throw new Error("fixture worker requires parentPort");
}

parentPort.on("message", (message) => {
  if (!message || message.type !== "run") {
    return;
  }
  const graphHash = String(message.payload?.graphHash || "");
  const mode = graphHash.slice("sha256:".length, "sha256:".length + 1);
  if (mode === "a") {
    for (;;) {
      // Deliberately ignore cooperative cancellation to exercise termination.
    }
  }
  if (mode === "b") {
    process.exit(17);
  }
  if (mode === "c") {
    parentPort.postMessage({
      type: "result",
      taskId: message.taskId,
      result: {},
    });
    return;
  }
  if (mode === "d") {
    const error = new Error("simulated worker out of memory");
    error.code = "ERR_WORKER_OUT_OF_MEMORY";
    throw error;
  }
  parentPort.postMessage({
    type: "result",
    taskId: message.taskId,
    result: {
      graphHash: message.payload.graphHash,
      algorithm: "components",
      layoutEngine: "components",
      layoutVersion: 1.2,
      params: {
        component_gap: 360,
        node_gap: 54,
        golden_angle: 2.399963229728653,
      },
      nodes: message.payload.nodes.map((node) => ({
        nodeId: node.nodeId,
        x: 0,
        y: 0,
      })),
    },
  });
});
