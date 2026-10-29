import { assert } from "chai";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { createMineruMockRoutes } from "../mock-skillrunner/mineru";
import { createWorkflowArchiveApi } from "../../src/workflows/archive";
import {
  literatureDigestBundlePath,
  startMockSkillRunnerServer,
} from "../mock-skillrunner/server";

describe("mineru mock peer", function () {
  this.timeout(20000);

  let server: Server;
  let baseUrl = "";
  let tempDir = "";

  before(async function () {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "zs-mineru-peer-"));
    const handle = createMineruMockRoutes(() => baseUrl);
    server = createServer((req, res) => {
      handle(req, res).then(
        (handled) => {
          if (handled) {
            return;
          }
          res.statusCode = 404;
          res.setHeader("content-type", "application/json");
          res.end(JSON.stringify({ error: "not found" }));
        },
        (error) => {
          res.statusCode = 500;
          res.end(String((error as Error)?.message || error));
        },
      );
    });
    await new Promise<void>((resolve) => {
      server.listen(0, "127.0.0.1", () => resolve());
    });
    const address = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  after(async function () {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  async function createBatch(name: string) {
    const response = await fetch(`${baseUrl}/api/v4/file-urls/batch`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ files: [{ name }] }),
    });
    assert.equal(response.status, 200);
    const payload = await response.json();
    return payload.data as { batch_id: string; file_urls: string[] };
  }

  async function pollState(batchId: string) {
    const response = await fetch(
      `${baseUrl}/api/v4/extract-results/batch/${batchId}`,
    );
    assert.equal(response.status, 200);
    const payload = await response.json();
    return payload.data.extract_result[0] as {
      state: string;
      full_zip_url?: string;
    };
  }

  it("serves MinerU through the existing E2E HTTP peer", async function () {
    const shared = await startMockSkillRunnerServer({
      bundlePath: literatureDigestBundlePath(process.cwd()),
    });
    try {
      const created = await fetch(`${shared.baseUrl}/api/v4/file-urls/batch`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ files: [{ name: "synthetic.pdf" }] }),
      });
      assert.equal(created.status, 200);
      const batch = (await created.json()).data;
      const uploaded = await fetch(batch.file_urls[0], {
        method: "PUT",
        body: Buffer.from("%PDF-1.7 synthetic bytes"),
      });
      assert.equal(uploaded.status, 200);
      const pollUrl = `${shared.baseUrl}/api/v4/extract-results/batch/${batch.batch_id}`;
      await fetch(pollUrl).then((response) => response.json());
      const done = await fetch(pollUrl).then((response) => response.json());
      assert.equal(done.data.extract_result[0].state, "done");
      const bundle = await fetch(done.data.extract_result[0].full_zip_url);
      assert.equal(bundle.status, 200);
      assert.isAbove((await bundle.arrayBuffer()).byteLength, 0);
      const jobs = await fetch(`${shared.baseUrl}/__test/jobs`, {
        method: "POST",
      });
      assert.equal(jobs.status, 200);
    } finally {
      await shared.close();
    }
  });

  it("serves the create, upload, poll, and bundle download chain", async function () {
    const batch = await createBatch("paper.pdf");
    assert.isString(batch.batch_id);
    assert.isNotEmpty(batch.batch_id);
    assert.lengthOf(batch.file_urls, 1);
    assert.include(batch.file_urls[0], "/__mineru/upload/");

    const uploadResponse = await fetch(batch.file_urls[0], {
      method: "PUT",
      body: Buffer.from("%PDF-1.7 synthetic bytes"),
    });
    assert.equal(uploadResponse.status, 200);

    const running = await pollState(batch.batch_id);
    assert.equal(running.state, "running");
    const done = await pollState(batch.batch_id);
    assert.equal(done.state, "done");
    assert.include(String(done.full_zip_url), "/__mineru/bundle/");

    const bundleResponse = await fetch(String(done.full_zip_url));
    assert.equal(bundleResponse.status, 200);
    assert.include(
      String(bundleResponse.headers.get("content-type")),
      "application/zip",
    );
    const bytes = Buffer.from(await bundleResponse.arrayBuffer());
    assert.equal(bytes.subarray(0, 4).toString("latin1"), "PK\u0003\u0004");

    const zipPath = path.join(tempDir, `${batch.batch_id}.zip`);
    await fs.writeFile(zipPath, bytes);
    const archive = createWorkflowArchiveApi();
    let entries: string[] = [];
    let markdown = "";
    let figure = new Uint8Array();
    await archive.withExtractedZip(
      { sourcePath: zipPath },
      {},
      async (extracted) => {
        entries = extracted.entries;
        markdown = await extracted.readText("full.md");
        figure = await extracted.readBytes("images/figure.png");
      },
    );
    assert.includeMembers(entries, ["full.md", "images/figure.png"]);
    assert.include(markdown, "![figure](images/figure.png)");
    assert.isAbove(figure.length, 0);
  });

  it("keeps batches isolated from each other", async function () {
    const first = await createBatch("first.pdf");
    const second = await createBatch("second.pdf");
    assert.notEqual(first.batch_id, second.batch_id);

    assert.equal((await pollState(second.batch_id)).state, "waiting-file");
    await fetch(first.file_urls[0], {
      method: "PUT",
      body: Buffer.from("%PDF-1.7 synthetic bytes"),
    });
    assert.equal((await pollState(first.batch_id)).state, "running");
    assert.equal((await pollState(second.batch_id)).state, "waiting-file");

    const earlyBundle = await fetch(
      `${baseUrl}/__mineru/bundle/${second.batch_id}`,
    );
    assert.equal(earlyBundle.status, 409);
  });

  it("rejects unsupported batch requests and unknown batch ids", async function () {
    const invalidBodies: Array<{ label: string; body: unknown }> = [
      {
        label: "multiple files",
        body: { files: [{ name: "a.pdf" }, { name: "b.pdf" }] },
      },
      { label: "empty files", body: { files: [] } },
      { label: "missing files", body: {} },
      { label: "blank name", body: { files: [{ name: "   " }] } },
    ];
    for (const invalid of invalidBodies) {
      const response = await fetch(`${baseUrl}/api/v4/file-urls/batch`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(invalid.body),
      });
      assert.equal(response.status, 400, invalid.label);
    }

    const unknown = await fetch(
      `${baseUrl}/api/v4/extract-results/batch/unknown-batch-id`,
    );
    assert.equal(unknown.status, 404);
  });

  it("does not handle non-MinerU paths", async function () {
    const handle = createMineruMockRoutes(() => baseUrl);
    const handled = await handle(
      { method: "GET", url: "/v1/jobs" } as any,
      {} as any,
    );
    assert.isFalse(handled);
  });
});
