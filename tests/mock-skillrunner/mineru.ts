import { randomUUID } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import { createStoreZipBytes } from "../../src/modules/zipStore";

type BatchRecord = {
  id: string;
  uploaded: boolean;
  pollCount: number;
};

// 1x1 transparent PNG; synthetic fixture bytes only.
const FIGURE_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR4nGNgAAIAAAUAAXpeqz8AAAAASUVORK5CYII=";

const FULL_MD = [
  "# Synthetic Document",
  "",
  "This paragraph is a synthetic fixture body for the MinerU mock peer.",
  "",
  "![figure](images/figure.png)",
  "",
].join("\n");

function json(res: ServerResponse, status: number, payload: unknown) {
  res.statusCode = status;
  res.setHeader("content-type", "application/json");
  res.end(JSON.stringify(payload));
}

async function readBody(req: IncomingMessage) {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

export function createMineruMockRoutes(getBaseUrl: () => string) {
  const batches = new Map<string, BatchRecord>();

  return async function handle(
    req: IncomingMessage,
    res: ServerResponse,
  ): Promise<boolean> {
    const method = (req.method || "GET").toUpperCase();
    const pathOnly = (req.url || "").split("?")[0];
    const base = getBaseUrl().replace(/\/+$/, "");

    if (method === "POST" && pathOnly === "/api/v4/file-urls/batch") {
      let payload: unknown = null;
      try {
        payload = JSON.parse((await readBody(req)).toString("utf8"));
      } catch {
        json(res, 400, { error: "invalid json body" });
        return true;
      }
      const files = (payload as { files?: unknown } | null)?.files;
      if (!Array.isArray(files) || files.length !== 1) {
        json(res, 400, { error: "exactly one file is required" });
        return true;
      }
      const name = String((files[0] as { name?: unknown })?.name || "").trim();
      if (!name) {
        json(res, 400, { error: "file name is required" });
        return true;
      }
      const id = randomUUID();
      batches.set(id, { id, uploaded: false, pollCount: 0 });
      json(res, 200, {
        code: 0,
        data: {
          batch_id: id,
          file_urls: [base + "/__mineru/upload/" + id],
        },
      });
      return true;
    }

    const uploadMatch = pathOnly.match(/^\/__mineru\/upload\/([^/]+)$/);
    if (method === "PUT" && uploadMatch) {
      const batch = batches.get(uploadMatch[1]);
      if (!batch) {
        json(res, 404, { error: "unknown batch" });
        return true;
      }
      const bytes = await readBody(req);
      if (bytes.length === 0) {
        json(res, 400, { error: "empty upload" });
        return true;
      }
      batch.uploaded = true;
      json(res, 200, { code: 0, data: { batch_id: batch.id } });
      return true;
    }

    const pollMatch = pathOnly.match(
      /^\/api\/v4\/extract-results\/batch\/([^/]+)$/,
    );
    if (method === "GET" && pollMatch) {
      const batch = batches.get(pollMatch[1]);
      if (!batch) {
        json(res, 404, { error: "unknown batch" });
        return true;
      }
      if (!batch.uploaded) {
        json(res, 200, {
          code: 0,
          data: { extract_result: [{ state: "waiting-file" }] },
        });
        return true;
      }
      batch.pollCount += 1;
      if (batch.pollCount === 1) {
        json(res, 200, {
          code: 0,
          data: { extract_result: [{ state: "running" }] },
        });
        return true;
      }
      json(res, 200, {
        code: 0,
        data: {
          extract_result: [
            {
              state: "done",
              full_zip_url: base + "/__mineru/bundle/" + batch.id,
            },
          ],
        },
      });
      return true;
    }

    const bundleMatch = pathOnly.match(/^\/__mineru\/bundle\/([^/]+)$/);
    if (method === "GET" && bundleMatch) {
      const batch = batches.get(bundleMatch[1]);
      if (!batch) {
        json(res, 404, { error: "unknown batch" });
        return true;
      }
      if (!batch.uploaded || batch.pollCount < 2) {
        json(res, 409, { error: "bundle is not ready" });
        return true;
      }
      const zip = createStoreZipBytes([
        { name: "full.md", text: FULL_MD },
        {
          name: "images/figure.png",
          bytes: Buffer.from(FIGURE_PNG_BASE64, "base64"),
        },
      ]);
      res.statusCode = 200;
      res.setHeader("content-type", "application/zip");
      res.end(Buffer.from(zip));
      return true;
    }

    return false;
  };
}
