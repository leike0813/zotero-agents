import { assert } from "chai";
import Ajv from "ajv";
import fs from "fs/promises";
import path from "path";

const skillRoot = path.resolve("skills_builtin/literature-search-ingest");

async function read(relativePath: string) {
  return fs.readFile(path.join(skillRoot, relativePath), "utf8");
}

function jsonExamples(markdown: string) {
  return Array.from(markdown.matchAll(/```json\s*([\s\S]*?)```/g), (match) =>
    JSON.parse(match[1]),
  );
}

function stageNumbers(markdown: string) {
  return Array.from(markdown.matchAll(/^### 阶段 (\d+)\b/gm), (match) =>
    Number(match[1]),
  );
}

describe("literature search ingest instruction-backed workflow", function () {
  it("keeps the stage topology", async function () {
    const skill = await read("SKILL.md");

    assert.deepEqual(stageNumbers(skill), [10, 20, 30, 40, 50]);
  });

  it("keeps path-based worker inputs and a single-paper Host payload", async function () {
    const skill = await read("SKILL.md");
    const payload = jsonExamples(skill).find(
      (example) => example.paper && !example.kind,
    );

    assert.isOk(payload);
    assert.include(skill, "CANDIDATE_FILES_JSON");
    assert.include(skill, "TARGET_COLLECTION");

    assert.containsAllKeys(payload, ["paper", "collection"]);
    assert.notProperty(payload, "papers");
    assert.containsAllKeys(payload.paper, [
      "itemType",
      "fields",
      "creators",
      "identifiers",
      "landingUrl",
      "pdfUrl",
      "attachLandingUrlOnMissingPdf",
    ]);
    assert.property(payload.paper.fields, "abstractNote");
    assert.notProperty(payload.paper.fields, "abstract");
  });

  it("persists one discovery candidate per file and pairs its payload path", async function () {
    const discovery = await read("references/search-planning-and-discovery.md");
    const candidate = jsonExamples(discovery).find(
      (example) =>
        typeof example.candidateId === "string" &&
        typeof example.payloadPath === "string",
    );

    assert.isOk(candidate);
    assert.containsAllKeys(candidate, [
      "candidateId",
      "title",
      "tier",
      "payloadPath",
    ]);
    assert.match(candidate.payloadPath, /^runtime\/payloads\/.+\.json$/);
  });

  it("defines a ledger-compatible research report", async function () {
    const skill = await read("SKILL.md");
    const report = jsonExamples(skill).find(
      (example) => example.kind === "literature_search_research_report",
    );

    assert.isOk(report);
    assert.containsAllKeys(report, ["kind", "candidateResults"]);
    assert.isArray(report.candidateResults);
    assert.lengthOf(report.candidateResults, 1);

    const result = report.candidateResults[0];
    assert.containsAllKeys(result, [
      "candidateId",
      "candidatePath",
      "title",
      "metadataStatus",
      "pdfStatus",
      "payloadPath",
      "metadataSources",
      "pdfRoutes",
      "uncertainties",
    ]);
    assert.include(["qualified", "unresolved"], result.metadataStatus);
    assert.include(["found", "missing", "failed", "skipped"], result.pdfStatus);
    assert.isArray(result.metadataSources);
    assert.isArray(result.pdfRoutes);
    assert.isArray(result.uncertainties);
    assert.sameMembers(
      result.pdfRoutes.map((route: { route: string }) => route.route),
      ["authoritative_landing", "open_access", "public_web"],
    );
    for (const route of result.pdfRoutes) {
      assert.include(
        [
          "found",
          "not_found",
          "restricted",
          "mismatch",
          "unavailable",
          "error",
          "skipped_after_verified_pdf",
        ],
        route.status,
      );
    }
    assert.notProperty(report, "paper");
    assert.notProperty(result, "receiptPath");
    assert.notProperty(result, "ingestStatus");
    assert.notProperty(result, "itemId");
  });

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
          itemRef: { id: 101 },
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
