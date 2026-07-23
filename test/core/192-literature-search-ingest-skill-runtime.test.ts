import { assert } from "chai";
import Ajv from "ajv";
import { spawnSync } from "child_process";
import fs from "fs/promises";
import os from "os";
import path from "path";

const skillRoot = path.resolve("skills_builtin/literature-search-ingest");

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
        path.join(skillRoot, "scripts", "gate_runtime.py"),
        ...args,
      ],
    };
  }
  return {
    command: process.env.PYTHON || "python",
    args: [path.join(skillRoot, "scripts", "gate_runtime.py"), ...args],
  };
}

function runGate(
  runRoot: string,
  args: string[],
  options: { expectFailure?: boolean } = {},
) {
  const command = pythonCommand(args);
  const result = spawnSync(command.command, command.args, {
    cwd: runRoot,
    encoding: "utf8",
    env: { ...process.env, PYTHONUTF8: "1" },
  });
  if (options.expectFailure) {
    assert.notEqual(result.status, 0, result.stdout);
    return JSON.parse(result.stdout || "{}");
  }
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return JSON.parse(result.stdout);
}

async function writeJson(target: string, value: unknown) {
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function createRun() {
  const runRoot = await fs.mkdtemp(
    path.join(os.tmpdir(), "literature-search-ingest-gate-"),
  );
  const statePath = path.join(
    runRoot,
    "runtime",
    "literature-search-ingest-gate.json",
  );
  const inputPath = path.join(runRoot, "runtime", "input.json");
  await writeJson(inputPath, {
    parameter: {
      query: "隧道衬砌病害智能识别",
      searchMode: "guided",
      searchBreadth: "balanced",
      languageHints: ["zh-CN"],
      targetCollection: "",
    },
  });
  return {
    runRoot,
    statePath,
    inputPath,
    common: ["--state", statePath, "--input", inputPath],
  };
}

async function submitPayload(
  run: Awaited<ReturnType<typeof createRun>>,
  gate: any,
  payload: unknown,
) {
  await writeJson(gate.payload_path, payload);
  return runGate(run.runRoot, [
    ...run.common,
    "--submit-stage-payload",
    gate.payload_path,
  ]);
}

function searchPlanPayload() {
  return {
    decision: "approve",
    plan: {
      search_mode: "guided",
      objective: "查找隧道衬砌病害智能识别研究",
      discipline_or_application: "土木基础设施智能检测",
      scope: {
        date_range: "2018-present",
        language_hints: ["zh-CN", "en"],
        literature_types: ["journalArticle", "thesis"],
        regions: ["China"],
      },
      local_coverage: {
        summary: "本地库覆盖通用视觉检测，但缺少隧道衬砌专题。",
        existing_identifiers: [],
        reusable_seed_refs: [],
        gaps: ["中文学位论文与工程应用研究"],
      },
      seed_artifacts: [],
      query_lanes: [
        {
          lane: "core",
          queries: ["隧道衬砌 病害 智能识别"],
          rationale: "覆盖研究对象、问题与方法。",
        },
        {
          lane: "multilingual",
          queries: ["tunnel lining defect intelligent recognition"],
          rationale: "补充英文表达与跨语言索引。",
        },
      ],
      source_lanes: [
        {
          source: "China DOI",
          purpose: "发现中文期刊记录",
          fallback_sources: ["Crossref", "institutional repositories"],
        },
      ],
      inclusion_criteria: ["研究对象为隧道衬砌病害"],
      exclusion_criteria: ["仅介绍通用目标检测且无隧道场景"],
      batch_size: 20,
      stop_conditions: ["适用来源不再产生新的高相关候选"],
    },
  };
}

function candidate(
  title = "隧道衬砌病害智能识别研究",
  doi = "10.5555/tunnel.001",
) {
  return {
    tier: "ready",
    title,
    alternate_titles: [],
    creators_display: ["张三"],
    year: "2024",
    container: "隧道工程学报",
    original_language: "zh-CN",
    material_version: "journal_article",
    identifiers: doi ? { doi } : {},
    landing_url: doi
      ? `https://doi.org/${doi}`
      : "https://repository.example.test/thesis-002",
    discovery_sources: [
      {
        source: doi ? "China DOI" : "University repository",
        url: doi
          ? `https://doi.org/${doi}`
          : "https://repository.example.test/thesis-002",
        lane: "core",
        reason: "The source exposes the original title and publication year.",
        facts: ["original_title", "publication_year"],
      },
    ],
    matching_notes: [],
    library_note: "No exact local duplicate found.",
    missing_fields: [],
    recommendation_reason: "与研究目标直接相关。",
  };
}

function discoveryPayload(candidates = [candidate()]) {
  return {
    query_attempts: [
      {
        lane: "core",
        query: "隧道衬砌 病害 智能识别",
        source: "China DOI",
        status: "completed",
        result_count: candidates.length,
        message: "Inspected the returned source records.",
      },
    ],
    candidates,
    uncovered_gaps: [],
    stop_reason: "all_applicable_lanes_completed",
  };
}

function metadataPayload() {
  return {
    status: "qualified",
    metadata: {
      itemType: "journalArticle",
      title: "隧道衬砌病害智能识别研究",
      language: "zh-CN",
      script: "Hans",
      alternateTitles: [
        {
          value: "Intelligent Recognition of Tunnel Lining Defects",
          role: "translated",
          language: "en",
          script: "Latn",
        },
      ],
      fields: {
        publicationTitle: "隧道工程学报",
        date: "2024",
        language: "zh-CN",
      },
      creatorCompleteness: "incomplete",
      creators: [],
      identifiers: { doi: "10.5555/tunnel.001" },
      landingUrl: "https://doi.org/10.5555/tunnel.001",
    },
    evidence: [
      {
        source: "China DOI",
        role: "authoritative",
        url: "https://doi.org/10.5555/tunnel.001",
        facts: ["identifier", "original_title", "publication_year"],
      },
    ],
    corroborating_signals: [],
    curation_notes: ["Complete Chinese creator list could not be verified."],
  };
}

function pdfPayload() {
  return {
    attempts: {
      authoritative_landing: {
        source: "DOI landing page",
        query_or_url: "https://doi.org/10.5555/tunnel.001",
        status: "not_found",
        notes: "No public PDF link was exposed.",
      },
      open_access: {
        source: "Open-access indexes and repositories",
        query_or_url: "10.5555/tunnel.001",
        status: "not_found",
        notes: "No matching repository copy was found.",
      },
      web_search: {
        source: "Public web search",
        query_or_url: '"隧道衬砌病害智能识别研究" filetype:pdf',
        status: "not_found",
        notes: "Results were HTML landing pages.",
      },
    },
  };
}

async function advanceToMetadata() {
  const run = await createRun();
  const waits: string[] = [];
  let gate = runGate(run.runRoot, run.common);

  assert.equal(gate.stage, "stage_10_search_plan");
  assert.equal(gate.next_action, "await_user_input");
  assert.deepEqual(Object.keys(gate.payload_variants).sort(), [
    "approve",
    "cancel",
  ]);
  assert.equal(
    gate.payload_variants.approve.payload_template.decision,
    "approve",
  );
  waits.push(gate.next_action);
  gate = await submitPayload(run, gate, searchPlanPayload());

  assert.equal(gate.stage, "stage_20_discovery");
  assert.equal(gate.discovery_round, 1);
  assert.match(gate.payload_schema_ref, /#\/\$defs\/discoveryPayload$/);
  assert.isObject(gate.payload_template);
  gate = await submitPayload(run, gate, discoveryPayload());

  assert.equal(gate.stage, "stage_30_ingest_scope");
  assert.deepEqual(Object.keys(gate.payload_variants).sort(), [
    "approve",
    "cancel",
    "expand",
  ]);
  waits.push(gate.next_action);
  gate = await submitPayload(run, gate, {
    decision: "approve",
    candidate_ids: ["doi:10.5555/tunnel.001"],
  });

  assert.equal(gate.stage, "stage_40_metadata_resolution");
  assert.equal(gate.candidate_id, "doi:10.5555/tunnel.001");
  assert.match(gate.payload_schema_ref, /#\/\$defs\/metadataPayload$/);
  assert.deepEqual(waits, ["await_user_input", "await_user_input"]);
  return { run, gate };
}

describe("literature search ingest skill gate runtime", function () {
  this.timeout(30000);

  it("keeps two decisions, derives context, and generates terminal output", async function () {
    const { run, gate: metadataGate } = await advanceToMetadata();
    let gate = await submitPayload(run, metadataGate, metadataPayload());

    assert.equal(gate.stage, "stage_50_pdf_probe");
    assert.notEqual(gate.next_action, "await_user_input");
    assert.deepEqual(gate.required_pdf_routes, [
      "authoritative_landing",
      "open_access",
      "web_search",
    ]);
    gate = await submitPayload(run, gate, pdfPayload());

    assert.equal(gate.stage, "stage_60_ingest_prepare");
    gate = runGate(run.runRoot, [...run.common, "--run-stage"]);
    assert.equal(gate.stage, "stage_70_ingest");
    const ingestPayload = JSON.parse(
      await fs.readFile(gate.ingest_payload_path, "utf8"),
    );
    assert.equal(ingestPayload.paper.fields.title, "隧道衬砌病害智能识别研究");
    assert.deepEqual(ingestPayload.paper.creators, []);
    assert.equal(ingestPayload.paper.identifiers.doi, "10.5555/tunnel.001");

    const receiptPath = gate.receipt_path;
    await writeJson(receiptPath, {
      result: {
        ingest: {
          status: "created",
          item: { id: 101, key: "ITEM101", libraryId: 1 },
          hasPdfAttachment: false,
        },
      },
    });
    const receiptArgs = [...run.common, "--submit-ingest-receipt", receiptPath];
    gate = runGate(run.runRoot, receiptArgs);

    assert.equal(gate.next_action, "return_final_output");
    assert.deepEqual(gate.final_output, {
      kind: "literature_search_ingest",
      status: "completed",
      summary: {
        discovered: 1,
        selected: 1,
        created: 1,
        existing: 0,
        failed: 0,
        notAttempted: 0,
      },
      outcomes: [
        {
          title: "隧道衬砌病害智能识别研究",
          ingestStatus: "created",
          itemRef: { id: 101 },
          pdfStatus: "missing",
          needsCuration: true,
        },
      ],
      searchLedgerPath: "result/search-ledger.json",
    });
    const ledger = JSON.parse(
      await fs.readFile(
        path.join(run.runRoot, "result", "search-ledger.json"),
        "utf8",
      ),
    );
    assert.equal(ledger.status, "completed");
    assert.deepEqual(ledger.approved_candidate_ids, ["doi:10.5555/tunnel.001"]);

    const replay = runGate(run.runRoot, receiptArgs);
    assert.deepEqual(replay.final_output, gate.final_output);
    await writeJson(receiptPath, { status: "failed" });
    const conflicting = runGate(run.runRoot, receiptArgs, {
      expectFailure: true,
    });
    assert.equal(conflicting.error?.code, "conflicting_replay");
  });

  it("merges discovery deltas and rejects identity-changing updates", async function () {
    const run = await createRun();
    let gate = runGate(run.runRoot, run.common);
    gate = await submitPayload(run, gate, searchPlanPayload());
    gate = await submitPayload(run, gate, discoveryPayload());
    gate = await submitPayload(run, gate, {
      decision: "expand",
      gaps: [
        {
          description: "补充中文学位论文",
          lanes: ["multilingual", "gap"],
        },
      ],
    });

    assert.equal(gate.discovery_round, 2);
    gate = await submitPayload(
      run,
      gate,
      discoveryPayload([candidate("隧道衬砌裂缝识别学位论文", "")]),
    );
    assert.equal(gate.stage, "stage_30_ingest_scope");
    assert.lengthOf(gate.resume_packet.candidate_ids, 2);

    const state = JSON.parse(await fs.readFile(run.statePath, "utf8"));
    assert.property(state.candidates, "doi:10.5555/tunnel.001");
    assert.lengthOf(state.discovery_rounds, 2);
    assert.equal(state.discovery_rounds[1].discovery_round, 2);
  });

  it("supports stable cancellation at both decision stages", async function () {
    const planRun = await createRun();
    let gate = runGate(planRun.runRoot, planRun.common);
    gate = await submitPayload(planRun, gate, { decision: "cancel" });
    assert.deepEqual(gate.final_output, {
      kind: "literature_search_ingest_canceled",
      status: "canceled",
      reason: "user_cancelled",
      message: "The user canceled search planning.",
    });

    const scopeRun = await createRun();
    gate = runGate(scopeRun.runRoot, scopeRun.common);
    gate = await submitPayload(scopeRun, gate, searchPlanPayload());
    gate = await submitPayload(scopeRun, gate, discoveryPayload());
    gate = await submitPayload(scopeRun, gate, { decision: "cancel" });
    assert.equal(gate.final_output.status, "canceled");
    assert.equal(
      gate.final_output.message,
      "The user declined the ingest scope.",
    );
  });

  it("derives not-attempted terminal output without another wait", async function () {
    const { run, gate: metadataGate } = await advanceToMetadata();
    let gate = await submitPayload(run, metadataGate, {
      status: "not_attempted",
      reason: "material_conflict_unresolved",
      message:
        "The DOI resolves to a later article rather than the approved work.",
      evidence: [
        {
          source: "Official journal landing",
          role: "authoritative",
          url: "https://doi.org/10.5555/tunnel.001",
          facts: ["different_material_version"],
        },
      ],
    });
    assert.equal(gate.stage, "stage_60_ingest_prepare");
    gate = runGate(run.runRoot, [...run.common, "--run-stage"]);
    assert.equal(gate.next_action, "return_final_output");
    assert.deepEqual(gate.final_output.outcomes, [
      {
        title: "隧道衬砌病害智能识别研究",
        ingestStatus: "not_attempted",
      },
    ]);
  });

  it("keeps hash, receipt-path, fatal failure, input-drift, and corrupt-state gates", async function () {
    const { run, gate: metadataGate } = await advanceToMetadata();
    let gate = await submitPayload(run, metadataGate, metadataPayload());
    gate = await submitPayload(run, gate, pdfPayload());

    const acceptedMetadata = JSON.parse(
      await fs.readFile(metadataGate.payload_path, "utf8"),
    );
    await writeJson(metadataGate.payload_path, {
      ...acceptedMetadata,
      metadata: { ...acceptedMetadata.metadata, title: "tampered title" },
    });
    const tampered = runGate(run.runRoot, [...run.common, "--run-stage"], {
      expectFailure: true,
    });
    assert.equal(tampered.error?.code, "payload_hash_mismatch");
    await writeJson(metadataGate.payload_path, acceptedMetadata);
    gate = runGate(run.runRoot, [...run.common, "--run-stage"]);

    const wrongReceipt = path.join(
      run.runRoot,
      "runtime",
      "host",
      "wrong.json",
    );
    await writeJson(wrongReceipt, { status: "created" });
    const wrongPath = runGate(
      run.runRoot,
      [...run.common, "--submit-ingest-receipt", wrongReceipt],
      { expectFailure: true },
    );
    assert.equal(wrongPath.error?.code, "invalid_ingest_receipt");

    await writeJson(gate.receipt_path, {
      failure: "approval_denied",
      message: "The user denied the Host write request.",
    });
    gate = runGate(run.runRoot, [
      ...run.common,
      "--submit-ingest-receipt",
      gate.receipt_path,
    ]);
    assert.equal(gate.final_output.status, "canceled");
    assert.equal(gate.final_output.reason, "approval_denied");

    await writeJson(run.inputPath, {
      parameter: { query: "changed after initialization" },
    });
    const drift = runGate(run.runRoot, run.common);
    assert.equal(drift.next_action, "blocked");

    const corruptRun = await createRun();
    await fs.mkdir(path.dirname(corruptRun.statePath), { recursive: true });
    await fs.writeFile(corruptRun.statePath, "{broken", "utf8");
    const corrupt = runGate(corruptRun.runRoot, corruptRun.common);
    assert.equal(corrupt.next_action, "blocked");
  });
});

describe("literature search ingest runtime action schema", function () {
  async function validator() {
    const schema = JSON.parse(
      await fs.readFile(
        path.join(skillRoot, "assets", "runtime-action.schema.json"),
        "utf8",
      ),
    );
    return new Ajv({
      allErrors: true,
      strict: true,
      allowUnionTypes: true,
    }).compile(schema);
  }

  it("accepts every semantic payload branch", async function () {
    const validate = await validator();
    const validPayloads = [
      searchPlanPayload(),
      { decision: "cancel" },
      discoveryPayload(),
      {
        decision: "expand",
        gaps: [{ description: "补充繁体中文", lanes: ["multilingual", "gap"] }],
      },
      {
        decision: "approve",
        candidate_ids: ["doi:10.5555/tunnel.001"],
      },
      metadataPayload(),
      {
        status: "not_attempted",
        reason: "material_conflict_unresolved",
        message: "The direct-work identity could not be resolved.",
        evidence: [],
      },
      pdfPayload(),
    ];
    for (const payload of validPayloads) {
      assert.isTrue(validate(payload), JSON.stringify(validate.errors));
    }
  });

  it("rejects derived fields, missing authority, incomplete creators, and incomplete PDF routes", async function () {
    const validate = await validator();
    const noAuthority = metadataPayload();
    noAuthority.evidence[0].role = "secondary";
    const incompleteCreators = metadataPayload();
    incompleteCreators.metadata.creatorCompleteness = "complete";
    incompleteCreators.metadata.creators = [];
    const missingRoute: any = pdfPayload();
    delete missingRoute.attempts.web_search;
    const foundWithoutEvidence: any = pdfPayload();
    foundWithoutEvidence.attempts.open_access = {
      source: "Repository",
      query_or_url: "10.5555/tunnel.001",
      status: "found",
      pdf_url: "https://example.test/paper.pdf",
      content_type: "application/pdf",
    };

    for (const payload of [
      { ...searchPlanPayload(), action: "approve_search_plan" },
      { ...discoveryPayload(), discovery_round: 1 },
      { ...metadataPayload(), candidate_id: "doi:10.5555/tunnel.001" },
      noAuthority,
      incompleteCreators,
      missingRoute,
      foundWithoutEvidence,
      { decision: "invented" },
    ]) {
      assert.isFalse(validate(payload), JSON.stringify(payload));
    }
  });
});
