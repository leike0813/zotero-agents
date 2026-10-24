import { assert } from "chai";
import Ajv from "ajv";
import { spawnSync } from "child_process";
import fs from "fs/promises";
import os from "os";
import path from "path";

const skillRoot = path.resolve("skills_builtin/literature-search-ingest");
const gateScript = path.join(skillRoot, "scripts", "ingest_gate.py");

async function read(relativePath: string) {
  return fs.readFile(path.join(skillRoot, relativePath), "utf8");
}

async function readJson(relativePath: string) {
  return JSON.parse(await read(relativePath));
}

function pythonCommand(args: string[]) {
  const arProject = path.join(os.homedir(), ".ar");
  const uv = spawnSync("uv", ["--version"], { encoding: "utf8" });
  if (uv.status === 0) {
    return {
      command: "uv",
      args: [
        "run",
        `--project=${arProject}`,
        "--locked",
        "--",
        "python",
        gateScript,
        ...args,
      ],
    };
  }
  return {
    command: process.env.PYTHON || "python",
    args: [gateScript, ...args],
  };
}

async function writeJson(target: string, value: unknown) {
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function runGate(
  runRoot: string,
  args: string[],
  options: { expectFailure?: boolean } = {},
) {
  const command = pythonCommand(["--run-root", runRoot, ...args]);
  const result = spawnSync(command.command, command.args, {
    encoding: "utf8",
    env: { ...process.env, PYTHONUTF8: "1" },
  });
  let json: any;
  try {
    json = JSON.parse(result.stdout || "{}");
  } catch {
    json = {};
  }
  if (!options.expectFailure) {
    assert.equal(result.status, 0, result.stderr || result.stdout);
  } else {
    assert.notEqual(result.status, 0, result.stdout);
  }
  return { json, result };
}

async function createRun(
  candidates: unknown[],
  extra: Record<string, unknown> = {},
) {
  const runRoot = await fs.mkdtemp(
    path.join(os.tmpdir(), "literature-search-ingest-gate-"),
  );
  await writeJson(path.join(runRoot, "runtime", "approved-candidates.json"), {
    searchMode: "guided",
    breadth: "balanced",
    discovered: candidates.length,
    candidates,
    ...extra,
  });
  const init = runGate(runRoot, [
    "--action",
    "init",
    "--payload",
    path.join(runRoot, "runtime", "approved-candidates.json"),
  ]);
  return { runRoot, init: init.json };
}

function approvedCandidate(
  index: number,
  overrides: Record<string, unknown> = {},
) {
  return {
    candidateId: `doi:10.5555/example.${index}`,
    title: `示例论文 ${index}`,
    candidatePath: `runtime/candidates/candidate-${String(index).padStart(4, "0")}.json`,
    payloadPath: `runtime/payloads/candidate-${String(index).padStart(4, "0")}.json`,
    metadataStatus: "qualified",
    pdfStatus: "missing",
    needsCuration: false,
    ...overrides,
  };
}

function coreReceipt(
  options: {
    key?: string;
    outcome?: "created" | "existing";
    pdfAttached?: boolean;
    operationId?: string;
  } = {},
) {
  const key = options.key || "ITEM0001";
  const operationId = options.operationId || `core-${key}`;
  return {
    ok: true,
    data: {
      capability: "mutation.execute",
      approval: "zotero-ui-required",
      data: {
        outcome: "committed",
        receipt: {
          schema: "zotero-agents.mutation-receipt.v1",
          receiptId: `receipt-${operationId}`,
          operationId,
          operation: "literature.ingest",
          outcome: "committed",
          committedAt: "2026-10-23T00:00:00.000Z",
          effectDigest: "sha256:core",
          changes: [],
        },
        result: {
          item: { ref: { libraryId: 1, key }, revision: "1" },
          collectionRef: null,
          itemOutcome: options.outcome || "created",
          collectionOutcome: "added",
          enrichment: [
            {
              kind: "pdf",
              outcome: options.pdfAttached ? "attached" : "skipped",
            },
            { kind: "landing", outcome: "skipped" },
          ],
        },
      },
    },
    meta: { operationId },
  };
}

function attachmentReceipt(
  options: {
    parentKey?: string;
    attachmentKey?: string;
    outcome?: "committed" | "unchanged";
    operationId?: string;
  } = {},
) {
  const parentKey = options.parentKey || "ITEM0001";
  const attachmentKey = options.attachmentKey || "ATT0001";
  const outcome = options.outcome || "committed";
  const operationId = options.operationId || `attach-${attachmentKey}`;
  return {
    ok: true,
    data: {
      capability: "mutation.execute",
      approval: "zotero-ui-required",
      data: {
        outcome,
        receipt: {
          schema: "zotero-agents.mutation-receipt.v1",
          receiptId: `receipt-${operationId}`,
          operationId,
          operation: "attachments.create",
          outcome,
          committedAt: "2026-10-23T00:00:00.000Z",
          effectDigest: "sha256:attachment",
          changes: [],
        },
        result: {
          attachment: {
            ref: { libraryId: 1, key: attachmentKey },
            parentRef: { libraryId: 1, key: parentKey },
            revision: "1",
            title: "Full Text PDF",
            filename: "paper.pdf",
            contentType: "application/pdf",
            url: null,
            linkMode: "stored_file",
            role: "ordinary",
            file: {
              state: "available",
              path: "/home/example/Zotero/storage/ATT0001/paper.pdf",
              sizeBytes: 649859,
              modifiedAt: null,
            },
          },
        },
      },
    },
    meta: { operationId },
  };
}

function corePayload() {
  return {
    paper: {
      itemType: "journalArticle",
      fields: { title: "示例论文" },
      creators: [],
      identifiers: {},
    },
  };
}

async function prepareCore(
  runRoot: string,
  candidate: any,
  operationId = "core-ITEM0001",
  payload: unknown = corePayload(),
) {
  const payloadPath = path.join(runRoot, candidate.payloadPath);
  await writeJson(payloadPath, payload);
  runGate(runRoot, [
    "--action",
    "prepare",
    "--kind",
    "core",
    "--candidate",
    candidate.candidateId,
    "--operation-id",
    operationId,
    "--payload",
    payloadPath,
  ]);
  return payloadPath;
}

async function prepareAttachment(
  runRoot: string,
  candidate: any,
  operationId = "attach-ATT0001",
  parentKey = "ITEM0001",
  fileId = "file-0001",
) {
  const payloadPath = path.join(
    runRoot,
    "runtime",
    "attachments",
    "candidate-0001.json",
  );
  await writeJson(payloadPath, {
    parentRef: { libraryId: 1, key: parentKey },
    fileId,
  });
  runGate(runRoot, [
    "--action",
    "prepare",
    "--kind",
    "attachment",
    "--candidate",
    candidate.candidateId,
    "--operation-id",
    operationId,
    "--payload",
    payloadPath,
  ]);
  return payloadPath;
}

describe("literature search ingest output schema", function () {
  it("keeps completed and canceled final output schema compatibility", async function () {
    const schema = JSON.parse(await read("assets/output.schema.json"));
    const validate = new Ajv({ allErrors: true, strict: false }).compile(
      schema,
    );
    const completed = {
      kind: "literature_search_ingest",
      status: "completed",
      summary: {
        discovered: 3,
        selected: 2,
        created: 1,
        existing: 0,
        failed: 0,
        notAttempted: 1,
      },
      outcomes: [
        {
          title: "隧道衬砌病害智能识别研究",
          ingestStatus: "created",
          itemRef: { libraryId: 1, key: "ITEM0001" },
          pdfStatus: "missing",
          needsCuration: false,
        },
        {
          title: "身份未能确认的候选",
          ingestStatus: "not_attempted",
        },
      ],
      searchLedgerPath: "result/search-ledger.json",
    };
    const canceled = {
      kind: "literature_search_ingest_canceled",
      status: "canceled",
      reason: "user_cancelled",
      message: "用户取消了入库范围。",
    };

    assert.isTrue(validate(completed), JSON.stringify(validate.errors));
    assert.isTrue(validate(canceled), JSON.stringify(validate.errors));

    const completedWithAuditPath = {
      ...completed,
      auditPath: "runtime/audit.json",
    };
    const outcomeWithEvidencePath = {
      ...completed,
      outcomes: [
        {
          ...completed.outcomes[0],
          evidencePath: "runtime/evidence.json",
        },
        completed.outcomes[1],
      ],
    };

    assert.isFalse(validate(completedWithAuditPath));
    assert.isFalse(validate(outcomeWithEvidencePath));
  });
});

describe("literature search ingest authorized fulltext runtime", function () {
  it("accepts canceled output that preserves partial progress", async function () {
    const schema = await readJson("assets/output.schema.json");
    const validate = new Ajv({ allErrors: true, strict: false }).compile(
      schema,
    );
    const partialCanceled = {
      kind: "literature_search_ingest_canceled",
      status: "canceled",
      reason: "approval_denied",
      message: "Zotero Host 未批准附件写入。",
      summary: {
        discovered: 3,
        selected: 2,
        created: 1,
        existing: 0,
        failed: 0,
        notAttempted: 1,
      },
      outcomes: [
        {
          title: "已入库论文",
          ingestStatus: "created",
          itemRef: { libraryId: 1, key: "ITEM0001" },
          pdfStatus: "attached",
          needsCuration: false,
        },
        { title: "尚未处理论文", ingestStatus: "not_attempted" },
      ],
      searchLedgerPath: "result/search-ledger.json",
    };
    assert.isTrue(validate(partialCanceled), JSON.stringify(validate.errors));
    assert.isFalse(
      validate({
        ...partialCanceled,
        outcomes: [
          ...partialCanceled.outcomes,
          { title: "x", ingestStatus: "skipped" },
        ],
      }),
    );
  });

  it("keeps a download-ready acquisition distinct from a committed attachment", async function () {
    const run = await createRun([approvedCandidate(1)]);
    const [candidate] = run.init.candidates;
    await prepareCore(run.runRoot, candidate);
    await writeJson(
      path.join(run.runRoot, candidate.coreReceiptPath),
      coreReceipt({ key: "ITEM0001" }),
    );
    runGate(run.runRoot, [
      "--action",
      "record-core",
      "--candidate",
      candidate.candidateId,
      "--receipt",
      candidate.coreReceiptPath,
    ]);
    const acquisitionPath = path.join(
      run.runRoot,
      "runtime",
      "acquisition-0001.json",
    );
    await writeJson(acquisitionPath, {
      status: "ready",
      reason: "matching_pdf_ready",
    });
    runGate(run.runRoot, [
      "--action",
      "record-acquisition",
      "--candidate",
      candidate.candidateId,
      "--payload",
      acquisitionPath,
    ]);

    const { json: output } = runGate(run.runRoot, ["--action", "finalize"]);
    assert.equal(output.status, "completed");
    assert.equal(output.outcomes[0].pdfStatus, "missing");

    const ledger = JSON.parse(
      await fs.readFile(
        path.join(run.runRoot, "result", "search-ledger.json"),
        "utf8",
      ),
    );
    assert.deepEqual(ledger.candidateResults[0].acquisition, {
      status: "ready",
      reason: "matching_pdf_ready",
    });
    assert.isNull(ledger.candidateResults[0].attachment);
    assert.isFalse(JSON.stringify(ledger).includes(run.runRoot));
  });

  it("reports attached only after a canonical attachment success receipt", async function () {
    const run = await createRun([approvedCandidate(1)]);
    const [candidate] = run.init.candidates;
    await prepareCore(run.runRoot, candidate);
    await writeJson(
      path.join(run.runRoot, candidate.coreReceiptPath),
      coreReceipt({ key: "ITEM0001" }),
    );
    runGate(run.runRoot, [
      "--action",
      "record-core",
      "--candidate",
      candidate.candidateId,
      "--receipt",
      candidate.coreReceiptPath,
    ]);
    await prepareAttachment(run.runRoot, candidate);
    await writeJson(
      path.join(run.runRoot, candidate.attachmentReceiptPath),
      attachmentReceipt({ parentKey: "ITEM0001", attachmentKey: "ATT0001" }),
    );
    runGate(run.runRoot, [
      "--action",
      "record-attachment",
      "--candidate",
      candidate.candidateId,
      "--receipt",
      candidate.attachmentReceiptPath,
    ]);

    const { json: output } = runGate(run.runRoot, ["--action", "finalize"]);
    assert.equal(output.outcomes[0].pdfStatus, "attached");

    const ledger = JSON.parse(
      await fs.readFile(
        path.join(run.runRoot, "result", "search-ledger.json"),
        "utf8",
      ),
    );
    assert.equal(ledger.candidateResults[0].core.status, "created");
    assert.equal(
      ledger.candidateResults[0].core.receiptPath,
      candidate.coreReceiptPath,
    );
    assert.deepEqual(ledger.candidateResults[0].attachment.attachmentRef, {
      libraryId: 1,
      key: "ATT0001",
    });
    assert.isFalse(JSON.stringify(ledger).includes("/home/example/Zotero"));
  });

  it("keeps the successful core receipt when attachment creation fails", async function () {
    const run = await createRun([approvedCandidate(1)]);
    const [candidate] = run.init.candidates;
    await prepareCore(run.runRoot, candidate);
    await writeJson(
      path.join(run.runRoot, candidate.coreReceiptPath),
      coreReceipt({ key: "ITEM0001" }),
    );
    runGate(run.runRoot, [
      "--action",
      "record-core",
      "--candidate",
      candidate.candidateId,
      "--receipt",
      candidate.coreReceiptPath,
    ]);
    await writeJson(path.join(run.runRoot, candidate.attachmentReceiptPath), {
      ok: false,
      error: {
        code: "permission_denied",
        message: "The user denied the attachment write.",
        details: { stateChange: "unchanged" },
      },
    });
    runGate(run.runRoot, [
      "--action",
      "record-attachment",
      "--candidate",
      candidate.candidateId,
      "--receipt",
      candidate.attachmentReceiptPath,
    ]);

    const { json: output } = runGate(run.runRoot, ["--action", "finalize"]);
    assert.equal(output.status, "completed");
    assert.equal(output.outcomes[0].ingestStatus, "created");
    assert.equal(output.outcomes[0].pdfStatus, "failed");
    assert.equal(output.summary.created, 1);
    assert.equal(output.summary.failed, 0);

    const ledger = JSON.parse(
      await fs.readFile(
        path.join(run.runRoot, "result", "search-ledger.json"),
        "utf8",
      ),
    );
    assert.equal(ledger.candidateResults[0].core.status, "created");
    assert.equal(ledger.candidateResults[0].attachment.status, "denied");
  });

  it("rejects a receipt reused for another candidate", async function () {
    const run = await createRun([approvedCandidate(1), approvedCandidate(2)]);
    const [first, second] = run.init.candidates;
    await prepareCore(run.runRoot, first);
    const sharedReceipt = coreReceipt({ key: "ITEM0001" });
    await writeJson(
      path.join(run.runRoot, first.coreReceiptPath),
      sharedReceipt,
    );
    await writeJson(
      path.join(run.runRoot, second.coreReceiptPath),
      sharedReceipt,
    );
    runGate(run.runRoot, [
      "--action",
      "record-core",
      "--candidate",
      first.candidateId,
      "--receipt",
      first.coreReceiptPath,
    ]);
    const rejected = runGate(
      run.runRoot,
      [
        "--action",
        "record-core",
        "--candidate",
        second.candidateId,
        "--receipt",
        second.coreReceiptPath,
      ],
      { expectFailure: true },
    );
    assert.equal(rejected.json.error.code, "receipt_reused");

    const { json: output } = runGate(run.runRoot, ["--action", "finalize"]);
    assert.deepEqual(
      output.outcomes.map((outcome: any) => outcome.ingestStatus),
      ["created", "not_attempted"],
    );
  });

  it("rejects acquisition evidence that carries local paths or credentials", async function () {
    const run = await createRun([approvedCandidate(1)]);
    const [candidate] = run.init.candidates;
    const acquisitionPath = path.join(
      run.runRoot,
      "runtime",
      "acquisition-0001.json",
    );
    await writeJson(acquisitionPath, {
      status: "ready",
      reason: "matching_pdf_ready",
      localPath: "/home/example/Downloads/paper.pdf",
    });
    const rejected = runGate(
      run.runRoot,
      [
        "--action",
        "record-acquisition",
        "--candidate",
        candidate.candidateId,
        "--payload",
        acquisitionPath,
      ],
      { expectFailure: true },
    );
    assert.equal(rejected.json.error.code, "invalid_acquisition_evidence");
  });

  it("rejects an attachment receipt bound to a different parent", async function () {
    const run = await createRun([approvedCandidate(1)]);
    const [candidate] = run.init.candidates;
    await prepareCore(run.runRoot, candidate);
    await writeJson(
      path.join(run.runRoot, candidate.coreReceiptPath),
      coreReceipt({ key: "ITEM0001" }),
    );
    runGate(run.runRoot, [
      "--action",
      "record-core",
      "--candidate",
      candidate.candidateId,
      "--receipt",
      candidate.coreReceiptPath,
    ]);
    await writeJson(
      path.join(run.runRoot, candidate.attachmentReceiptPath),
      attachmentReceipt({ parentKey: "OTHER999", attachmentKey: "ATT0001" }),
    );
    const rejected = runGate(
      run.runRoot,
      [
        "--action",
        "record-attachment",
        "--candidate",
        candidate.candidateId,
        "--receipt",
        candidate.attachmentReceiptPath,
      ],
      { expectFailure: true },
    );
    assert.equal(rejected.json.error.code, "attachment_parent_mismatch");
  });

  it("cancels with partial outcomes and distinguishes unattempted papers from failures", async function () {
    const run = await createRun([
      approvedCandidate(1),
      approvedCandidate(2),
      approvedCandidate(3),
    ]);
    const [first, second, third] = run.init.candidates;
    await prepareCore(run.runRoot, first);
    await writeJson(
      path.join(run.runRoot, first.coreReceiptPath),
      coreReceipt({ key: "ITEM0001" }),
    );
    await writeJson(
      path.join(run.runRoot, first.attachmentReceiptPath),
      attachmentReceipt({ parentKey: "ITEM0001", attachmentKey: "ATT0001" }),
    );
    await writeJson(path.join(run.runRoot, second.coreReceiptPath), {
      ok: false,
      error: { code: "invalid_capability_input", message: "bad payload" },
    });
    for (const [candidate, receipt] of [
      [first, first.coreReceiptPath],
      [second, second.coreReceiptPath],
    ] as const) {
      runGate(run.runRoot, [
        "--action",
        "record-core",
        "--candidate",
        candidate.candidateId,
        "--receipt",
        receipt,
      ]);
    }
    await prepareAttachment(run.runRoot, first);
    runGate(run.runRoot, [
      "--action",
      "record-attachment",
      "--candidate",
      first.candidateId,
      "--receipt",
      first.attachmentReceiptPath,
    ]);

    const { json: canceled } = runGate(run.runRoot, [
      "--action",
      "cancel",
      "--reason",
      "user_cancelled",
    ]);
    assert.equal(canceled.kind, "literature_search_ingest_canceled");
    assert.equal(canceled.status, "canceled");
    assert.equal(canceled.message, "用户取消了文献入库。");
    assert.equal(canceled.searchLedgerPath, "result/search-ledger.json");
    assert.deepEqual(canceled.summary, {
      discovered: 3,
      selected: 3,
      created: 1,
      existing: 0,
      failed: 1,
      notAttempted: 1,
    });
    assert.deepEqual(
      canceled.outcomes.map((outcome: any) => outcome.ingestStatus),
      ["created", "failed", "not_attempted"],
    );
    assert.equal(canceled.outcomes[0].pdfStatus, "attached");
    assert.isUndefined(canceled.outcomes[2].pdfStatus);

    const serialized = JSON.stringify(canceled);
    assert.isFalse(serialized.includes(run.runRoot));
    assert.isFalse(serialized.includes("/home/"));
    assert.isFalse(serialized.includes("Zotero/storage"));
    assert.isFalse(/cookie|credential|password|bearer/i.test(serialized));

    const ledgerSchema = await readJson("assets/ledger.schema.json");
    const ledger = JSON.parse(
      await fs.readFile(
        path.join(run.runRoot, "result", "search-ledger.json"),
        "utf8",
      ),
    );
    const validateLedger = new Ajv({ allErrors: true, strict: false }).compile(
      ledgerSchema,
    );
    assert.isTrue(
      validateLedger(ledger),
      JSON.stringify(validateLedger.errors),
    );
    assert.equal(ledger.status, "canceled");
    assert.equal(ledger.cancellation.reason, "user_cancelled");
    assert.equal(ledger.candidateResults[2].finalPdfStatus, "missing");
  });
});

describe("literature search ingest gate receipt evidence", function () {
  function clone<T>(value: T): T {
    return JSON.parse(JSON.stringify(value));
  }

  async function startRun() {
    const run = await createRun([approvedCandidate(1)]);
    const [candidate] = run.init.candidates;
    return { ...run, candidate };
  }

  function corePath(run: Awaited<ReturnType<typeof startRun>>) {
    return path.join(run.runRoot, run.candidate.coreReceiptPath);
  }

  function attachmentPath(run: Awaited<ReturnType<typeof startRun>>) {
    return path.join(run.runRoot, run.candidate.attachmentReceiptPath);
  }

  function recordCore(run: Awaited<ReturnType<typeof startRun>>) {
    return runGate(
      run.runRoot,
      [
        "--action",
        "record-core",
        "--candidate",
        run.candidate.candidateId,
        "--receipt",
        run.candidate.coreReceiptPath,
      ],
      { expectFailure: true },
    );
  }

  it("rejects non-canonical ingest projections and non-success envelopes", async function () {
    const run = await startRun();
    await writeJson(corePath(run), {
      ok: true,
      data: {
        data: {
          result: {
            ingest: {
              status: "created",
              item: { id: 1, key: "ITEM0001", libraryId: 1 },
              hasPdfAttachment: false,
            },
          },
        },
      },
    });
    assert.equal(recordCore(run).json.error.code, "invalid_core_receipt");

    const wrongOperation = coreReceipt();
    wrongOperation.data.data.receipt.operation = "attachments.create";
    await writeJson(corePath(run), wrongOperation);
    assert.equal(recordCore(run).json.error.code, "invalid_core_receipt");

    const wrongOutcome = coreReceipt();
    wrongOutcome.data.data.outcome = "failed";
    wrongOutcome.data.data.receipt.outcome = "failed";
    await writeJson(corePath(run), wrongOutcome);
    assert.equal(recordCore(run).json.error.code, "invalid_core_receipt");
  });

  it("requires the receipt operation id and rejects a client-side mismatch", async function () {
    const run = await startRun();
    const missingId = coreReceipt();
    delete (missingId.data.data.receipt as any).operationId;
    await writeJson(corePath(run), missingId);
    assert.equal(recordCore(run).json.error.code, "invalid_core_receipt");

    const mismatched = coreReceipt();
    mismatched.meta.operationId = "client-supplied";
    await writeJson(corePath(run), mismatched);
    assert.equal(recordCore(run).json.error.code, "operation_id_mismatch");
  });

  it("binds the prepared core payload and rejects changes", async function () {
    const run = await startRun();
    const payloadPath = await prepareCore(run.runRoot, run.candidate);
    await prepareCore(run.runRoot, run.candidate);
    const differentOperation = runGate(
      run.runRoot,
      [
        "--action",
        "prepare",
        "--kind",
        "core",
        "--candidate",
        run.candidate.candidateId,
        "--operation-id",
        "core-other",
        "--payload",
        payloadPath,
      ],
      { expectFailure: true },
    );
    assert.equal(differentOperation.json.error.code, "conflicting_prepare");

    const changed = corePayload() as any;
    changed.paper.fields.title = "另一篇论文";
    await writeJson(payloadPath, changed);
    const differentPayload = runGate(
      run.runRoot,
      [
        "--action",
        "prepare",
        "--kind",
        "core",
        "--candidate",
        run.candidate.candidateId,
        "--operation-id",
        "core-ITEM0001",
        "--payload",
        payloadPath,
      ],
      { expectFailure: true },
    );
    assert.equal(differentPayload.json.error.code, "conflicting_prepare");
  });

  it("requires a prepared mutation before successful core evidence", async function () {
    const run = await startRun();
    await writeJson(corePath(run), coreReceipt());
    assert.equal(recordCore(run).json.error.code, "missing_prepare");
  });

  it("rejects a receipt operation id that differs from the prepared mutation", async function () {
    const run = await startRun();
    await prepareCore(run.runRoot, run.candidate, "core-prepared");
    await writeJson(corePath(run), coreReceipt());
    assert.equal(recordCore(run).json.error.code, "operation_id_mismatch");
  });

  it("rejects a payload changed after preparation", async function () {
    const run = await startRun();
    const payloadPath = await prepareCore(run.runRoot, run.candidate);
    await writeJson(corePath(run), coreReceipt());
    const changed = corePayload() as any;
    changed.paper.fields.title = "修改后的论文";
    await writeJson(payloadPath, changed);
    assert.equal(recordCore(run).json.error.code, "payload_changed");
  });

  it("binds attachment preparation to the parent and file", async function () {
    const run = await startRun();
    await prepareCore(run.runRoot, run.candidate);
    await writeJson(corePath(run), coreReceipt({ key: "ITEM0001" }));
    runGate(run.runRoot, [
      "--action",
      "record-core",
      "--candidate",
      run.candidate.candidateId,
      "--receipt",
      run.candidate.coreReceiptPath,
    ]);
    await prepareAttachment(run.runRoot, run.candidate);
    await prepareAttachment(run.runRoot, run.candidate);

    const otherFile = path.join(
      run.runRoot,
      "runtime",
      "attachments",
      "other.json",
    );
    await writeJson(otherFile, {
      parentRef: { libraryId: 1, key: "ITEM0001" },
      fileId: "file-0002",
    });
    const differentFile = runGate(
      run.runRoot,
      [
        "--action",
        "prepare",
        "--kind",
        "attachment",
        "--candidate",
        run.candidate.candidateId,
        "--operation-id",
        "attach-ATT0001",
        "--payload",
        otherFile,
      ],
      { expectFailure: true },
    );
    assert.equal(differentFile.json.error.code, "conflicting_prepare");

    const wrongParent = path.join(
      run.runRoot,
      "runtime",
      "attachments",
      "wrong.json",
    );
    await writeJson(wrongParent, {
      parentRef: { libraryId: 1, key: "OTHER999" },
      fileId: "file-0001",
    });
    const rejectedParent = runGate(
      run.runRoot,
      [
        "--action",
        "prepare",
        "--kind",
        "attachment",
        "--candidate",
        run.candidate.candidateId,
        "--operation-id",
        "attach-other",
        "--payload",
        wrongParent,
      ],
      { expectFailure: true },
    );
    assert.equal(rejectedParent.json.error.code, "attachment_parent_mismatch");
  });

  it("requires attachment preparation before a successful attachment receipt", async function () {
    const run = await startRun();
    await prepareCore(run.runRoot, run.candidate);
    await writeJson(corePath(run), coreReceipt({ key: "ITEM0001" }));
    runGate(run.runRoot, [
      "--action",
      "record-core",
      "--candidate",
      run.candidate.candidateId,
      "--receipt",
      run.candidate.coreReceiptPath,
    ]);
    await writeJson(attachmentPath(run), attachmentReceipt());
    const rejected = runGate(
      run.runRoot,
      [
        "--action",
        "record-attachment",
        "--candidate",
        run.candidate.candidateId,
        "--receipt",
        run.candidate.attachmentReceiptPath,
      ],
      { expectFailure: true },
    );
    assert.equal(rejected.json.error.code, "missing_prepare");
  });

  it("writes prepared bindings into the ledger", async function () {
    const run = await startRun();
    await prepareCore(run.runRoot, run.candidate);
    await writeJson(corePath(run), coreReceipt({ key: "ITEM0001" }));
    runGate(run.runRoot, [
      "--action",
      "record-core",
      "--candidate",
      run.candidate.candidateId,
      "--receipt",
      run.candidate.coreReceiptPath,
    ]);
    await prepareAttachment(run.runRoot, run.candidate);
    runGate(run.runRoot, ["--action", "finalize"]);
    const ledger = JSON.parse(
      await fs.readFile(
        path.join(run.runRoot, "result", "search-ledger.json"),
        "utf8",
      ),
    );
    assert.equal(
      ledger.candidateResults[0].prepared.core.operationId,
      "core-ITEM0001",
    );
    assert.equal(
      ledger.candidateResults[0].prepared.core.payloadHash.startsWith(
        "sha256:",
      ),
      true,
    );
    assert.equal(
      ledger.candidateResults[0].prepared.attachment.fileId,
      "file-0001",
    );
    const validate = new Ajv({ allErrors: true, strict: false }).compile(
      await readJson("assets/ledger.schema.json"),
    );
    assert.isTrue(validate(ledger), JSON.stringify(validate.errors));
  });

  it("requires attachments.create, a matching explicit parent and a PDF content type", async function () {
    const run = await startRun();
    await prepareCore(run.runRoot, run.candidate);
    await writeJson(corePath(run), coreReceipt({ key: "ITEM0001" }));
    runGate(run.runRoot, [
      "--action",
      "record-core",
      "--candidate",
      run.candidate.candidateId,
      "--receipt",
      run.candidate.coreReceiptPath,
    ]);
    const recordAttachment = () =>
      runGate(
        run.runRoot,
        [
          "--action",
          "record-attachment",
          "--candidate",
          run.candidate.candidateId,
          "--receipt",
          run.candidate.attachmentReceiptPath,
        ],
        { expectFailure: true },
      );

    const wrongOperation = attachmentReceipt();
    wrongOperation.data.data.receipt.operation = "attachments.updateMetadata";
    await writeJson(attachmentPath(run), wrongOperation);
    assert.equal(
      recordAttachment().json.error.code,
      "invalid_attachment_receipt",
    );

    const wrongOutcome = attachmentReceipt();
    wrongOutcome.data.data.outcome = "unknown";
    wrongOutcome.data.data.receipt.outcome = "unknown";
    await writeJson(attachmentPath(run), wrongOutcome);
    assert.equal(
      recordAttachment().json.error.code,
      "invalid_attachment_receipt",
    );

    const missingParent = attachmentReceipt();
    delete (missingParent.data.data.result.attachment as any).parentRef;
    await writeJson(attachmentPath(run), missingParent);
    assert.equal(
      recordAttachment().json.error.code,
      "invalid_attachment_receipt",
    );

    const wrongType = attachmentReceipt();
    wrongType.data.data.result.attachment.contentType = "text/html";
    await writeJson(attachmentPath(run), wrongType);
    assert.equal(recordAttachment().json.error.code, "attachment_not_pdf");
  });

  it("treats the same receipt as idempotent and refuses a different one", async function () {
    const run = await startRun();
    await prepareCore(run.runRoot, run.candidate);
    const receipt = coreReceipt({ key: "ITEM0001" });
    await writeJson(corePath(run), receipt);
    runGate(run.runRoot, [
      "--action",
      "record-core",
      "--candidate",
      run.candidate.candidateId,
      "--receipt",
      run.candidate.coreReceiptPath,
    ]);
    runGate(run.runRoot, [
      "--action",
      "record-core",
      "--candidate",
      run.candidate.candidateId,
      "--receipt",
      run.candidate.coreReceiptPath,
    ]);
    const changed = clone(receipt);
    changed.data.data.receipt.receiptId = "receipt-other";
    await writeJson(corePath(run), changed);
    assert.equal(recordCore(run).json.error.code, "conflicting_receipt");

    await prepareAttachment(run.runRoot, run.candidate);
    const attachment = attachmentReceipt();
    await writeJson(attachmentPath(run), attachment);
    const recordAttachment = (expectFailure: boolean) =>
      runGate(
        run.runRoot,
        [
          "--action",
          "record-attachment",
          "--candidate",
          run.candidate.candidateId,
          "--receipt",
          run.candidate.attachmentReceiptPath,
        ],
        { expectFailure },
      );
    recordAttachment(false);
    recordAttachment(false);
    const changedAttachment = clone(attachment);
    changedAttachment.data.data.receipt.receiptId = "receipt-other";
    await writeJson(attachmentPath(run), changedAttachment);
    assert.equal(recordAttachment(true).json.error.code, "conflicting_receipt");
  });

  it("records an existing usable PDF only from the canonical attachment listing", async function () {
    const run = await startRun();
    await prepareCore(run.runRoot, run.candidate);
    await writeJson(corePath(run), coreReceipt({ key: "ITEM0001" }));
    runGate(run.runRoot, [
      "--action",
      "record-core",
      "--candidate",
      run.candidate.candidateId,
      "--receipt",
      run.candidate.coreReceiptPath,
    ]);
    const evidencePath = path.join(run.runRoot, run.candidate.pdfEvidencePath);
    const record = () =>
      runGate(
        run.runRoot,
        [
          "--action",
          "record-existing-pdf",
          "--candidate",
          run.candidate.candidateId,
          "--payload",
          run.candidate.pdfEvidencePath,
        ],
        { expectFailure: true },
      );

    await writeJson(evidencePath, {
      ok: true,
      data: {
        data: {
          attachments: [
            {
              ref: { libraryId: 1, key: "PDF00001" },
              parentRef: { libraryId: 1, key: "ITEM0001" },
              role: "ordinary",
              fields: { contentType: "application/pdf" },
              file: { state: "available", path: "/tmp/paper.pdf" },
            },
          ],
        },
      },
    });
    assert.equal(record().json.error.code, "no_usable_pdf");

    await writeJson(evidencePath, {
      ok: true,
      data: {
        data: {
          attachments: [
            {
              ref: { libraryId: 1, key: "PDF00001" },
              role: "ordinary",
              contentType: "application/pdf",
              file: { state: "available", path: "/tmp/paper.pdf" },
            },
          ],
        },
      },
    });
    assert.equal(record().json.error.code, "no_usable_pdf");

    await writeJson(evidencePath, {
      ok: false,
      error: { code: "permission_denied" },
      data: {
        data: {
          attachments: [
            {
              ref: { libraryId: 1, key: "PDF00001" },
              parentRef: { libraryId: 1, key: "ITEM0001" },
              role: "ordinary",
              contentType: "application/pdf",
              file: { state: "available", path: "/tmp/paper.pdf" },
            },
          ],
        },
      },
    });
    assert.equal(record().json.error.code, "invalid_pdf_evidence");

    await writeJson(evidencePath, {
      ok: true,
      data: {
        data: {
          attachments: [
            {
              ref: { libraryId: 1, key: "PDF00001" },
              parentRef: { libraryId: 1, key: "ITEM0001" },
              role: "ordinary",
              contentType: "application/pdf",
              file: { state: "missing" },
            },
          ],
        },
      },
    });
    assert.equal(record().json.error.code, "no_usable_pdf");

    await writeJson(evidencePath, {
      ok: true,
      data: {
        capability: "library.get_item_attachments",
        approval: "none",
        data: {
          attachments: [
            {
              ref: { libraryId: 1, key: "PDF00001" },
              parentRef: { libraryId: 1, key: "ITEM0001" },
              role: "ordinary",
              contentType: "application/pdf",
              filename: "paper.pdf",
              file: {
                state: "available",
                path: "/tmp/paper.pdf",
                sizeBytes: 1024,
                modifiedAt: null,
              },
            },
          ],
          limit: 25,
          total: 1,
          returned: 1,
          hasMore: false,
          nextCursor: null,
        },
      },
    });
    const recorded = runGate(run.runRoot, [
      "--action",
      "record-existing-pdf",
      "--candidate",
      run.candidate.candidateId,
      "--payload",
      run.candidate.pdfEvidencePath,
    ]);
    assert.equal(recorded.json.candidates[0].finalPdfStatus, "attached");

    const { json: output } = runGate(run.runRoot, ["--action", "finalize"]);
    assert.equal(output.outcomes[0].pdfStatus, "attached");
    const ledger = JSON.parse(
      await fs.readFile(
        path.join(run.runRoot, "result", "search-ledger.json"),
        "utf8",
      ),
    );
    assert.equal(ledger.candidateResults[0].pdfEvidence.status, "usable_pdf");
    assert.isNull(ledger.candidateResults[0].attachment);
  });

  it("seals the run after finalize or cancel", async function () {
    const run = await startRun();
    await prepareCore(run.runRoot, run.candidate);
    await writeJson(corePath(run), coreReceipt({ key: "ITEM0001" }));
    runGate(run.runRoot, [
      "--action",
      "record-core",
      "--candidate",
      run.candidate.candidateId,
      "--receipt",
      run.candidate.coreReceiptPath,
    ]);
    const { json: completed } = runGate(run.runRoot, ["--action", "finalize"]);
    const { json: completedAgain } = runGate(run.runRoot, [
      "--action",
      "finalize",
    ]);
    assert.deepEqual(completedAgain, completed);
    assert.equal(recordCore(run).json.error.code, "terminal_state");
    assert.equal(
      runGate(
        run.runRoot,
        ["--action", "cancel", "--reason", "user_cancelled"],
        {
          expectFailure: true,
        },
      ).json.error.code,
      "terminal_state",
    );

    const canceledRun = await startRun();
    const { json: canceled } = runGate(canceledRun.runRoot, [
      "--action",
      "cancel",
      "--reason",
      "user_cancelled",
    ]);
    const { json: canceledAgain } = runGate(canceledRun.runRoot, [
      "--action",
      "cancel",
      "--reason",
      "user_cancelled",
    ]);
    assert.deepEqual(canceledAgain, canceled);
    assert.equal(
      runGate(
        canceledRun.runRoot,
        ["--action", "cancel", "--reason", "execution_blocked"],
        { expectFailure: true },
      ).json.error.code,
      "terminal_state",
    );
    assert.deepEqual(
      runGate(canceledRun.runRoot, ["--action", "finalize"]).json,
      canceled,
    );
  });

  it("uses fixed safe messages for fatal failures", async function () {
    const run = await startRun();
    await writeJson(corePath(run), {
      failure: "host_unavailable",
      message: "/home/example/secret token=abc",
    });
    runGate(run.runRoot, [
      "--action",
      "record-core",
      "--candidate",
      run.candidate.candidateId,
      "--receipt",
      run.candidate.coreReceiptPath,
    ]);
    const { json: canceled } = runGate(run.runRoot, ["--action", "finalize"]);
    assert.equal(canceled.kind, "literature_search_ingest_canceled");
    assert.equal(canceled.reason, "host_unavailable");
    assert.equal(canceled.message, "Zotero Host 当前不可用。");
    assert.isFalse(JSON.stringify(canceled).includes("/home/example"));
    assert.isFalse(JSON.stringify(canceled).includes("token=abc"));
  });

  it("rejects cancellation reasons outside the fixed set", async function () {
    const run = await startRun();
    const rejected = runGate(
      run.runRoot,
      ["--action", "cancel", "--reason", "because"],
      { expectFailure: true },
    );
    assert.equal(rejected.json.error.code, "invalid_cancellation");
  });
});
