import { resolveSourceAttachment } from "../lib/pdfSplitPlan.js";

function sourceStem(fileName) {
  return String(fileName || "").replace(/\.[^.]+$/, "");
}

function buildSteps(fileName, sourcePath, pageRanges) {
  const fileDescriptor = {
    name: fileName,
  };
  if (pageRanges) {
    fileDescriptor.page_ranges = pageRanges;
  }
  return [
    {
      id: "create-upload-url",
      request: {
        method: "POST",
        path: "/api/v4/file-urls/batch",
        json: {
          files: [fileDescriptor],
        },
      },
      extract: {
        batch_id: "$.data.batch_id",
        upload_url: "$.data.file_urls[0] || $.data.files[0] || $.data.files[0].url",
      },
    },
    {
      id: "upload-file",
      request: {
        method: "PUT",
        url: "{upload_url}",
        binary_from: sourcePath,
      },
    },
    {
      id: "poll-result",
      request: {
        method: "GET",
        path: "/api/v4/extract-results/batch/{batch_id}",
      },
      repeat_until: {
        json_path: "$.data.extract_result[0].state || $.data.state",
        in: ["done", "failed"],
      },
      fail_when: {
        json_path: "$.data.extract_result[0].state || $.data.state",
        equals: "failed",
        message_path: "$.data.extract_result[0].err_msg || $.data.err_msg || $.msg",
      },
      extract: {
        full_zip_url: "$.data.extract_result[0].full_zip_url || $.data.full_zip_url",
      },
    },
    {
      id: "download-bundle",
      request: {
        method: "GET",
        url: "{full_zip_url}",
        response_type: "bytes",
      },
    },
  ];
}

export async function buildRequest({ selectionContext, preflight, manifest }) {
  const source = resolveSourceAttachment(selectionContext);
  const context = {
    ...(preflight?.context || {}),
  };
  const sourcePath =
    String(context.source_attachment_path || "").trim() || source?.filePath;
  const fileName =
    String(context.source_attachment_name || "").trim() || source?.fileName;
  if (!sourcePath || !fileName) {
    throw new Error("mineru buildRequest requires a selected source PDF");
  }
  const pageRanges = String(context.page_ranges || "").trim();
  return {
    kind: "generic-http.steps.v1",
    taskName: pageRanges
      ? `${fileName} (${context.partIndex || "?"}/${context.partCount || "?"}: ${pageRanges})`
      : fileName,
    sourceAttachmentPaths: [sourcePath],
    context: {
      source_attachment_path: sourcePath,
      source_attachment_name: fileName,
      source_attachment_stem: sourceStem(fileName),
      source_attachment_item_id:
        context.source_attachment_item_id || source?.itemId || null,
      source_attachment_item_key:
        context.source_attachment_item_key || source?.itemKey || "",
      workflow_id: manifest?.id || "mineru",
      workflow_label: manifest?.label || "MinerU",
      ...context,
    },
    steps: buildSteps(fileName, sourcePath, pageRanges),
    poll: {
      interval_ms: manifest?.execution?.poll_interval_ms || 2000,
      timeout_ms: manifest?.execution?.timeout_ms || 600000,
    },
  };
}
