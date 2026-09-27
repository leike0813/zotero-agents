import { assert } from "chai";
import Ajv from "ajv";
import fs from "fs/promises";
import path from "path";

const skillRoot = path.resolve("skills_builtin/literature-search-ingest");

async function read(relativePath: string) {
  return fs.readFile(path.join(skillRoot, relativePath), "utf8");
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
