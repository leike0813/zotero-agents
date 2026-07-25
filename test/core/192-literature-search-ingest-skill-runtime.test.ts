import { assert } from "chai";
import Ajv from "ajv";
import fs from "fs/promises";
import path from "path";

const skillRoot = path.resolve("skills_builtin/literature-search-ingest");

async function read(relativePath: string) {
  return fs.readFile(path.join(skillRoot, relativePath), "utf8");
}

function markedJson(markdown: string, marker: string) {
  const markerIndex = markdown.indexOf(marker);
  assert.isAtLeast(markerIndex, 0, marker);
  const match = /```json\s*([\s\S]*?)```/.exec(markdown.slice(markerIndex));
  assert.isOk(match, `${marker} JSON example`);
  return JSON.parse(match?.[1] || "{}");
}

describe("literature search ingest instruction-backed workflow", function () {
  it("keeps the existing stage flow and only two user waiting points", async function () {
    const skill = await read("SKILL.md");

    for (const stage of [
      "### 阶段 10 — 检索计划",
      "### 阶段 20 — 发现轮次",
      "### 阶段 30 — 入库范围",
      "### 阶段 40 — 研究委派与载荷准备",
      "### 阶段 70 — 逐篇 Zotero 入库",
    ]) {
      assert.include(skill, stage);
    }

    assert.match(skill, /仅两个阶段可以等待用户/);
    assert.match(skill, /阶段 10[\s\S]*阶段 30/);
    assert.match(skill, /范围批准后[\s\S]*自动继续/);
  });

  it("keeps the static worker prompt flexible while preserving per-paper payloads", async function () {
    const skill = await read("SKILL.md");
    const payload = markedJson(skill, "DIRECT_HOST_PAYLOAD_EXAMPLE");

    assert.include(skill, "CANDIDATES_JSON");
    assert.include(skill, "OUTPUT_PATHS_JSON");
    assert.match(skill, /一个或多个候选/);
    assert.match(skill, /每篇论文[\s\S]*独立/);

    assert.hasAllKeys(payload, ["paper", "collection"]);
    assert.notProperty(payload, "papers");
    assert.hasAllKeys(payload.paper, [
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

  it("keeps metadata identity and all three PDF routes mandatory", async function () {
    const metadata = await read("references/metadata-resolution.md");
    const pdf = await read("references/pdf-probe.md");

    assert.match(metadata, /直接作品身份/);
    assert.match(metadata, /标识符优先/);
    assert.match(metadata, /完整.*创建者|创建者.*完整/);
    assert.match(metadata, /不能|不得/);

    for (const route of ["权威落地页", "开放获取", "公开网络搜索"]) {
      assert.include(pdf, route);
    }
    assert.include(pdf, "skipped_after_verified_pdf");
    assert.match(pdf, /三条路线|三路线/);
    assert.match(pdf, /元数据.*入库|metadata-only/);
  });

  it("allows incremental payload collection while keeping Host mutation serial", async function () {
    const skill = await read("SKILL.md");

    assert.match(skill, /任一.*载荷.*完成|载荷.*就绪/);
    assert.match(skill, /无需等待|立即收集|立刻收集/);
    assert.match(skill, /缺失|畸形/);
    assert.match(skill, /只影响|单篇/);

    assert.match(skill, /主代理/);
    assert.match(skill, /一次只|逐篇/);
    assert.match(skill, /终态|terminal/);
    assert.match(skill, /receipt|收据/);
  });

  it("keeps optional audit information outside blocking and final-output contracts", async function () {
    const skill = await read("SKILL.md");

    assert.include(skill, "stdout");
    assert.match(skill, /可选/);
    assert.match(skill, /不.*阻塞|不得.*阻塞/);
  });

  it("contains only the current instruction-backed workflow protocol", async function () {
    const packageText = (
      await Promise.all([
        read("SKILL.md"),
        read("references/search-planning-and-discovery.md"),
        read("references/metadata-resolution.md"),
        read("references/pdf-probe.md"),
        read("references/ingest-output-recovery.md"),
        read("assets/runner.json"),
      ])
    ).join("\n");

    for (const obsolete of [
      "gate_runtime.py",
      "stage_runtime.py",
      "batch_runtime.py",
      "runtime-action.schema.json",
      "next_action",
      "allowed_actions",
      "researchReviewPayload",
      "WORKER_SPEC_PATH",
      "SEARCH_LIMITS",
      "prepare_agent_batches",
      "旧 gate",
      "已移除的 gate",
    ]) {
      assert.notInclude(packageText, obsolete, obsolete);
    }
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
