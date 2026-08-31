import {
  getRuntimePersistencePaths,
  writeRuntimeBytes,
  writeRuntimeTextFileStrict,
} from "../modules/runtimePersistence";
import { joinPath } from "../utils/path";
import {
  digestRuntimeFileSource,
  inspectRuntimeFileSource,
} from "../modules/runtimeFileTransfer";
import { createWorkflowHostError } from "./workflowHostErrorContract";

const RESERVED_FILE_SEGMENTS = new Set([
  "con",
  "prn",
  "aux",
  "nul",
  "com1",
  "com2",
  "com3",
  "com4",
  "com5",
  "com6",
  "com7",
  "com8",
  "com9",
  "lpt1",
  "lpt2",
  "lpt3",
  "lpt4",
  "lpt5",
  "lpt6",
  "lpt7",
  "lpt8",
  "lpt9",
]);

export type WorkflowInputMaterializationRequest = {
  workflowId?: string;
  key?: string;
  fileName?: string;
  content?: string;
  bytes?: Uint8Array | ArrayBuffer;
};

export type ScopedWorkflowInputMaterializationRequest = {
  key?: string;
  fileName: string;
  content:
    | { kind: "text"; text: string }
    | { kind: "bytes"; bytes: Uint8Array | ArrayBuffer };
};

function normalizeManagedPathSegment(value: unknown, fallback: string) {
  const fallbackText = String(fallback || "file").trim() || "file";
  const raw = String(value || "")
    .trim()
    .replace(/\\/g, "/")
    .split("/")
    .filter(Boolean)
    .join("-");
  let segment = raw
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/[. ]+$/g, "")
    .slice(0, 96);
  if (!segment || segment === "." || segment === "..") {
    segment = fallbackText;
  }
  const lower = segment.toLowerCase();
  const reservedCandidate = lower.split(".")[0] || lower;
  if (RESERVED_FILE_SEGMENTS.has(reservedCandidate)) {
    segment = `${segment}-file`;
  }
  return segment;
}

function uniqueManagedFileName(fileName: unknown) {
  const segment = normalizeManagedPathSegment(fileName, "input.dat");
  const dotIndex = segment.lastIndexOf(".");
  const stem = dotIndex > 0 ? segment.slice(0, dotIndex) || "input" : segment;
  const extension =
    dotIndex > 0 && dotIndex < segment.length - 1
      ? segment.slice(dotIndex)
      : "";
  const nonce = Math.random().toString(36).slice(2, 10);
  return `${stem}-${Date.now()}-${nonce}${extension}`;
}

export async function materializeWorkflowInputFile(
  args: WorkflowInputMaterializationRequest,
) {
  const hasContent = Object.prototype.hasOwnProperty.call(args || {}, "content");
  const hasBytes = Object.prototype.hasOwnProperty.call(args || {}, "bytes");
  if (hasContent === hasBytes) {
    throw createWorkflowHostError(
      "invalid_request",
      "materializeWorkflowInputFile requires exactly one of content or bytes",
      { reason: "invalid_combination", field: "content" },
    );
  }
  const targetPath = joinPath(
    getRuntimePersistencePaths().tmpDir,
    "workflow-inputs",
    normalizeManagedPathSegment(args?.workflowId, "workflow"),
    normalizeManagedPathSegment(args?.key, "input"),
    uniqueManagedFileName(args?.fileName || "input.dat"),
  );
  if (hasBytes) {
    await writeRuntimeBytes(targetPath, args.bytes as Uint8Array | ArrayBuffer);
  } else {
    await writeRuntimeTextFileStrict(targetPath, String(args.content ?? ""));
  }
  const source = await inspectRuntimeFileSource(targetPath);
  const digest = await digestRuntimeFileSource(source);
  return {
    path: targetPath,
    sizeBytes: source.size,
    sha256: digest.sha256.replace(/^sha256:/, ""),
  };
}

export function createWorkflowInputMaterializer(scope: {
  workflowId: string;
  runId: string;
}) {
  const workflowId = normalizeManagedPathSegment(scope.workflowId, "workflow");
  const runId = normalizeManagedPathSegment(scope.runId, "run");
  return (request: ScopedWorkflowInputMaterializationRequest) => {
    if (request?.content?.kind === "text") {
      return materializeWorkflowInputFile({
        workflowId: `${workflowId}-${runId}`,
        key: request.key,
        fileName: request.fileName,
        content: request.content.text,
      });
    }
    if (request?.content?.kind === "bytes") {
      return materializeWorkflowInputFile({
        workflowId: `${workflowId}-${runId}`,
        key: request.key,
        fileName: request.fileName,
        bytes: request.content.bytes,
      });
    }
    throw createWorkflowHostError(
      "invalid_request",
      "Workflow input content variant is invalid",
      { reason: "invalid_value", field: "content" },
    );
  };
}
