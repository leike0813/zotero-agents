import { parentPort } from "node:worker_threads";
import {
  createInProcessSynthesisConceptKbIndexEngine,
  rebuildSynthesisConceptKbIndexRequest,
  rebuildSynthesisConceptKbIndexResult,
  rebuildSynthesisConceptKbQueryRequest,
  rebuildSynthesisConceptKbQueryResult,
} from "../../../packages/synthesis-engine/src/conceptKbIndex.js";
import {
  createSynthesisCitationGraphBuildPackedAccumulator,
  createInProcessSynthesisCitationGraphLayoutEngine,
  createInProcessSynthesisCitationGraphMetricsEngine,
  iterateRebuiltSynthesisCitationGraphBuildResultPageArtifacts,
  rebuildSynthesisCitationGraphLayoutRequest,
  rebuildSynthesisCitationGraphLayoutResult,
  rebuildSynthesisCitationGraphMetricsRequest,
  rebuildSynthesisCitationGraphMetricsResult,
  rebuildSynthesisCitationGraphBuildTransferPage,
} from "../../../packages/synthesis-engine/src/index.js";
import { SYNTHESIS_SIDECAR_TRANSFER_LIMITS } from "../../../packages/synthesis-contracts/src/sidecarTransfer.js";
import {
  createInProcessSynthesisCitationGraphBuildEngine,
  rebuildSynthesisCitationGraphBuildRequest,
  rebuildSynthesisCitationGraphBuildResult,
} from "../../../packages/synthesis-engine/src/citationGraphBuild.js";
import {
  createInProcessSynthesisTagVocabularyEngine,
  rebuildSynthesisTagVocabularyIndexRequest,
  rebuildSynthesisTagVocabularyIndexResult,
  rebuildSynthesisTagVocabularyValidationRequest,
  rebuildSynthesisTagVocabularyValidationResult,
} from "../../../packages/synthesis-engine/src/tagVocabulary.js";
import {
  createInProcessSynthesisTopicGraphIndexEngine,
  rebuildSynthesisTopicGraphIndexRequest,
  rebuildSynthesisTopicGraphIndexResult,
} from "../../../packages/synthesis-engine/src/topicGraphIndex.js";
import {
  SYNTHESIS_SIDECAR_COMPUTE_OPERATION,
  SYNTHESIS_SIDECAR_CONCEPT_KB_INDEX_OPERATION,
  SYNTHESIS_SIDECAR_CONCEPT_KB_QUERY_OPERATION,
  SYNTHESIS_SIDECAR_GRAPH_BUILD_COMPUTE_OPERATION,
  SYNTHESIS_SIDECAR_GRAPH_BUILD_TRANSFER_OPERATION,
  SYNTHESIS_SIDECAR_METRICS_COMPUTE_OPERATION,
  SYNTHESIS_SIDECAR_TAG_VOCABULARY_INDEX_OPERATION,
  SYNTHESIS_SIDECAR_TAG_VOCABULARY_VALIDATE_OPERATION,
  SYNTHESIS_SIDECAR_TOPIC_GRAPH_INDEX_OPERATION,
  type SynthesisSidecarComputeWorkerMessage,
  type SynthesisSidecarComputeWorkerResponse,
  type SynthesisSidecarTransferPortAckMessage,
  type SynthesisSidecarTransferPortInputMessage,
} from "./computeProtocol.js";

if (!parentPort) {
  throw new Error("Synthesis compute worker requires a parent port");
}

class ComputeCanceledError extends Error {}

function post(response: SynthesisSidecarComputeWorkerResponse) {
  parentPort?.postMessage(response);
}

function nextPortMessage<T>(port: import("node:worker_threads").MessagePort) {
  return new Promise<T>((resolve, reject) => {
    const cleanup = () => {
      port.off("message", onMessage);
      port.off("messageerror", onError);
      port.off("close", onClose);
    };
    const onMessage = (message: T) => {
      cleanup();
      resolve(message);
    };
    const onError = () => {
      cleanup();
      reject(new Error("transfer_port_error"));
    };
    const onClose = () => {
      cleanup();
      reject(new Error("transfer_port_closed"));
    };
    port.once("message", onMessage);
    port.once("messageerror", onError);
    port.once("close", onClose);
  });
}

async function runGraphBuildTransfer(
  message: Extract<
    SynthesisSidecarComputeWorkerMessage,
    { operation: typeof SYNTHESIS_SIDECAR_GRAPH_BUILD_TRANSFER_OPERATION }
  >,
  checkpoint: () => void,
) {
  const port = message.port as import("node:worker_threads").MessagePort;
  try {
    const accumulator = createSynthesisCitationGraphBuildPackedAccumulator(
      message.header,
    );
    while (true) {
      checkpoint();
      const input =
        await nextPortMessage<SynthesisSidecarTransferPortInputMessage>(port);
      if (input.type === "input_complete") {
        break;
      }
      if (!(input.bytes instanceof ArrayBuffer)) {
        throw new Error("transfer_page_bytes_invalid");
      }
      const rows = JSON.parse(new TextDecoder().decode(input.bytes)) as unknown;
      const page = rebuildSynthesisCitationGraphBuildTransferPage({
        descriptor: input.descriptor,
        rows,
      });
      if (page.descriptor.kind === "library_nodes") {
        accumulator.addLibraryNodes(page.rows);
      } else if (page.descriptor.kind === "references") {
        accumulator.addReferences(page.rows);
      } else {
        throw new Error("transfer_input_kind_invalid");
      }
      port.postMessage({
        type: "input_ack",
        kind: page.descriptor.kind,
        pageIndex: page.descriptor.pageIndex,
      });
    }
    const result = accumulator.finish({ checkpoint });
    checkpoint();
    port.postMessage({ type: "output_started" });
    for (const artifact of iterateRebuiltSynthesisCitationGraphBuildResultPageArtifacts(
      result,
      {
        pageBytes: SYNTHESIS_SIDECAR_TRANSFER_LIMITS.pageBytes,
        pageJsonNodes: SYNTHESIS_SIDECAR_TRANSFER_LIMITS.pageJsonNodes,
      },
    )) {
      checkpoint();
      const bytes = artifact.bytes.buffer as ArrayBuffer;
      port.postMessage(
        {
          type: "output_page",
          descriptor: artifact.page.descriptor,
          bytes,
        },
        [bytes],
      );
      const acknowledgment =
        await nextPortMessage<SynthesisSidecarTransferPortAckMessage>(port);
      if (
        acknowledgment.type !== "output_ack" ||
        acknowledgment.kind !== artifact.page.descriptor.kind ||
        acknowledgment.pageIndex !== artifact.page.descriptor.pageIndex
      ) {
        throw new Error("transfer_output_ack_invalid");
      }
    }
    port.postMessage({
      type: "output_complete",
      header: {
        contractVersion: result.contractVersion,
        scope: result.scope,
        diagnostics: result.diagnostics,
      },
    });
  } catch {
    port.postMessage({ type: "stream_error" });
  } finally {
    port.close();
  }
}

parentPort.on(
  "message",
  async (message: SynthesisSidecarComputeWorkerMessage) => {
    if (message?.type !== "run") {
      return;
    }
    const taskId = String(message.taskId || "");
    try {
      if (!(message.cancellation instanceof SharedArrayBuffer)) {
        throw new Error("Invalid compute operation");
      }
      const canceled = new Int32Array(message.cancellation);
      const checkpoint = () => {
        if (Atomics.load(canceled, 0) !== 0) {
          throw new ComputeCanceledError();
        }
      };
      checkpoint();
      if (
        message.operation === SYNTHESIS_SIDECAR_GRAPH_BUILD_TRANSFER_OPERATION
      ) {
        await runGraphBuildTransfer(message, checkpoint);
        return;
      }
      if (message.operation === SYNTHESIS_SIDECAR_COMPUTE_OPERATION) {
        const request = rebuildSynthesisCitationGraphLayoutRequest(
          message.payload,
        );
        const result = await createInProcessSynthesisCitationGraphLayoutEngine({
          checkpoint,
        }).compute(request);
        checkpoint();
        post({
          type: "result",
          taskId,
          result: rebuildSynthesisCitationGraphLayoutResult(result, request),
        });
        return;
      }
      if (message.operation === SYNTHESIS_SIDECAR_METRICS_COMPUTE_OPERATION) {
        const request = rebuildSynthesisCitationGraphMetricsRequest(
          message.payload,
        );
        const result = await createInProcessSynthesisCitationGraphMetricsEngine(
          {
            checkpoint,
          },
        ).compute(request);
        checkpoint();
        post({
          type: "result",
          taskId,
          result: rebuildSynthesisCitationGraphMetricsResult(result, request),
        });
        return;
      }
      if (
        message.operation === SYNTHESIS_SIDECAR_GRAPH_BUILD_COMPUTE_OPERATION
      ) {
        const request = rebuildSynthesisCitationGraphBuildRequest(
          message.payload,
        );
        const result = await createInProcessSynthesisCitationGraphBuildEngine({
          checkpoint,
        }).compute(request);
        checkpoint();
        post({
          type: "result",
          taskId,
          result: rebuildSynthesisCitationGraphBuildResult(result, request),
        });
        return;
      }
      if (
        message.operation ===
        SYNTHESIS_SIDECAR_TAG_VOCABULARY_VALIDATE_OPERATION
      ) {
        const request = rebuildSynthesisTagVocabularyValidationRequest(
          message.payload,
        );
        const result = createInProcessSynthesisTagVocabularyEngine({
          checkpoint,
        }).validate(request);
        checkpoint();
        post({
          type: "result",
          taskId,
          result: rebuildSynthesisTagVocabularyValidationResult(
            result,
            request,
          ),
        });
        return;
      }
      if (
        message.operation === SYNTHESIS_SIDECAR_TAG_VOCABULARY_INDEX_OPERATION
      ) {
        const request = rebuildSynthesisTagVocabularyIndexRequest(
          message.payload,
        );
        const result = createInProcessSynthesisTagVocabularyEngine({
          checkpoint,
        }).buildIndex(request);
        checkpoint();
        post({
          type: "result",
          taskId,
          result: rebuildSynthesisTagVocabularyIndexResult(result, request),
        });
        return;
      }
      if (message.operation === SYNTHESIS_SIDECAR_CONCEPT_KB_INDEX_OPERATION) {
        const request = rebuildSynthesisConceptKbIndexRequest(message.payload);
        const result = await createInProcessSynthesisConceptKbIndexEngine({
          checkpoint: () => checkpoint(),
        }).buildIndex(request);
        checkpoint();
        post({
          type: "result",
          taskId,
          result: rebuildSynthesisConceptKbIndexResult(result, request),
        });
        return;
      }
      if (message.operation === SYNTHESIS_SIDECAR_CONCEPT_KB_QUERY_OPERATION) {
        const request = rebuildSynthesisConceptKbQueryRequest(message.payload);
        const result = await createInProcessSynthesisConceptKbIndexEngine({
          checkpoint: () => checkpoint(),
        }).query(request);
        checkpoint();
        post({
          type: "result",
          taskId,
          result: rebuildSynthesisConceptKbQueryResult(result, request),
        });
        return;
      }
      if (message.operation === SYNTHESIS_SIDECAR_TOPIC_GRAPH_INDEX_OPERATION) {
        const request = rebuildSynthesisTopicGraphIndexRequest(message.payload);
        const result = await createInProcessSynthesisTopicGraphIndexEngine({
          checkpoint: () => checkpoint(),
        }).buildIndex(request);
        checkpoint();
        post({
          type: "result",
          taskId,
          result: rebuildSynthesisTopicGraphIndexResult(result, request),
        });
        return;
      }
      throw new Error("Invalid compute operation");
    } catch (error) {
      post({
        type: error instanceof ComputeCanceledError ? "canceled" : "error",
        taskId,
      });
    }
  },
);
