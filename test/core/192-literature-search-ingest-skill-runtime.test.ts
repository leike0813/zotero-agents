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
    action: "approve_search_plan",
    approved: true,
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
          source_class: "regional_index",
          role: "primary",
          fallback_sources: ["Crossref", "institutional repositories"],
        },
      ],
      inclusion_criteria: ["研究对象为隧道衬砌病害"],
      exclusion_criteria: ["仅介绍通用目标检测且无隧道场景"],
      candidate_policy: {
        tiers: ["ready", "needs_curation", "lead_only"],
        material_conflict: "keep_separate",
        batch_size: 20,
      },
      breadth: "balanced",
      stop_conditions: ["适用来源不再产生新的高相关候选"],
      pdf_policy: "three_route_public_identity_matched",
    },
  };
}

function candidate(
  candidateId = "doi:10.5555/tunnel.001",
  title = "隧道衬砌病害智能识别研究",
) {
  return {
    candidate_id: candidateId,
    tier: "ready",
    title,
    alternate_titles: [],
    creators_display: ["张三"],
    year: "2024",
    container: "隧道工程学报",
    original_language: "zh-CN",
    material_version: "journal_article",
    identifiers: {
      ...(candidateId.startsWith("doi:")
        ? { doi: candidateId.slice("doi:".length) }
        : {}),
    },
    identity: {
      strong_keys: candidateId.startsWith("doi:") ? [candidateId] : [],
      weak_key: `${title}|2024|张三`,
    },
    discovery_sources: [
      {
        source: "China DOI",
        url: `https://example.test/record/${encodeURIComponent(candidateId)}`,
        query_lane: "core",
        source_role: "index",
        raw_title: title,
        reason: "The source record supplies the original title and year.",
        facts: ["original_title", "publication_year"],
      },
    ],
    matching_evidence: [
      {
        field: "title",
        value: title,
        source: "China DOI",
      },
    ],
    landing_url: `https://example.test/record/${encodeURIComponent(candidateId)}`,
    duplicate_status: "not_in_library",
    missing_fields: [],
    recommendation_reason: "与研究目标直接相关。",
  };
}

function discoveryPayload(discoveryRound: number, candidates = [candidate()]) {
  return {
    action: "record_discovery",
    discovery_round: discoveryRound,
    query_attempts: [
      {
        lane: "core",
        query: "隧道衬砌 病害 智能识别",
        source: "China DOI",
        status: "completed",
        result_count: candidates.length,
      },
    ],
    candidates,
    uncovered_gaps: [],
    source_failures: [],
    deduplication_summary: {
      source_record_count: candidates.length,
      unique_candidate_count: candidates.length,
      merged_record_count: 0,
      unresolved_conflict_count: 0,
    },
    stop_reason: "all_applicable_lanes_completed",
  };
}

function metadataPayload() {
  return {
    action: "record_metadata",
    candidate_id: "doi:10.5555/tunnel.001",
    status: "qualified",
    identifier_status: "resolved",
    checked_sources: ["China DOI", "Official journal landing"],
    match: {
      method: "identifier",
      direct_work: true,
      material_conflict: false,
      normalized_identifier: {
        type: "DOI",
        value: "10.5555/tunnel.001",
      },
    },
    metadata: {
      itemType: "journalArticle",
      originalTitle: {
        value: "隧道衬砌病害智能识别研究",
        language: "zh-CN",
        script: "Hans",
      },
      alternateTitles: [
        {
          value: "Intelligent Recognition of Tunnel Lining Defects",
          role: "translated",
          language: "en",
          script: "Latn",
        },
      ],
      language: "zh-CN",
      script: "Hans",
      creatorCompleteness: "incomplete",
      fields: {
        title: "隧道衬砌病害智能识别研究",
        date: "2024",
        language: "zh-CN",
      },
      creators: [],
      identifiers: { doi: "10.5555/tunnel.001" },
      containers: [
        {
          role: "journal",
          title: "隧道工程学报",
        },
      ],
      landingUrl: "https://doi.org/10.5555/tunnel.001",
    },
    evidence: [
      {
        source: "China DOI",
        source_role: "authoritative",
        url: "https://doi.org/10.5555/tunnel.001",
        identifier: "10.5555/tunnel.001",
        reason: "The normalized DOI and original Chinese title match.",
        facts: ["identifier", "original_title", "publication_year"],
      },
    ],
    warnings: [
      {
        code: "native_creator_names_unverified",
        message: "The complete Chinese creator list was not verified.",
      },
    ],
    needs_curation: true,
  };
}

function pdfPayload() {
  return {
    action: "record_pdf_probe",
    candidate_id: "doi:10.5555/tunnel.001",
    attempts: [
      {
        route: "authoritative_landing",
        source: "DOI landing page",
        query_or_url: "https://doi.org/10.5555/tunnel.001",
        status: "not_found",
        identity_match: true,
        legal_source: true,
        reachable: true,
      },
      {
        route: "open_access",
        source: "Open-access indexes and repositories",
        query_or_url: "10.5555/tunnel.001",
        status: "not_found",
        identity_match: false,
        legal_source: true,
        reachable: true,
      },
      {
        route: "web_search",
        source: "Public web search",
        query_or_url:
          '"隧道衬砌病害智能识别研究" filetype:pdf OR "10.5555/tunnel.001" pdf',
        status: "not_found",
        identity_match: false,
        legal_source: true,
        reachable: true,
      },
    ],
  };
}

async function advanceToMetadata() {
  const run = await createRun();
  const waitingActions: string[] = [];

  let gate = runGate(run.runRoot, run.common);
  assert.equal(gate.stage, "stage_10_search_plan");
  assert.equal(gate.next_action, "await_user_input");
  assert.equal(gate.discovery_round, 1);
  assert.deepEqual(gate.allowed_actions, [
    "approve_search_plan",
    "cancel_workflow",
  ]);
  assert.match(gate.required_reads[0], /search-planning-and-discovery\.md$/);
  waitingActions.push(gate.next_action);
  gate = await submitPayload(run, gate, searchPlanPayload());

  assert.equal(gate.stage, "stage_20_discovery");
  assert.equal(gate.next_action, "submit_stage_payload");
  assert.equal(gate.discovery_round, 1);
  gate = await submitPayload(run, gate, discoveryPayload(1));

  assert.equal(gate.stage, "stage_30_ingest_scope");
  assert.equal(gate.next_action, "await_user_input");
  assert.deepEqual(gate.allowed_actions, [
    "approve_ingest_scope",
    "request_discovery_expansion",
    "cancel_workflow",
  ]);
  waitingActions.push(gate.next_action);
  gate = await submitPayload(run, gate, {
    action: "approve_ingest_scope",
    approved: true,
    discovery_round: 1,
    candidate_ids: ["doi:10.5555/tunnel.001"],
    excluded_candidate_ids: [],
    authorization_notice_acknowledged: true,
  });

  assert.equal(gate.stage, "stage_40_metadata_resolution");
  assert.equal(gate.next_action, "submit_stage_payload");
  assert.match(gate.required_reads[0], /metadata-resolution\.md$/);
  assert.deepEqual(waitingActions, ["await_user_input", "await_user_input"]);
  return { run, gate };
}

describe("literature search ingest skill gate runtime", function () {
  this.timeout(30000);

  it("keeps two interactive decisions and automatically advances after ingest-scope approval", async function () {
    const { run, gate: metadataGate } = await advanceToMetadata();
    const englishCreatorAttempt = {
      ...metadataPayload(),
      metadata: {
        ...metadataPayload().metadata,
        creatorCompleteness: "complete",
        creators: [{ name: "Zhang San", creatorType: "author" }],
      },
      warnings: [],
      needs_curation: false,
    };
    await writeJson(metadataGate.payload_path, englishCreatorAttempt);
    const englishCreatorFailure = runGate(
      run.runRoot,
      [...run.common, "--submit-stage-payload", metadataGate.payload_path],
      { expectFailure: true },
    );
    assert.equal(englishCreatorFailure.error?.code, "invalid_stage_payload");

    let gate = await submitPayload(run, metadataGate, metadataPayload());

    assert.equal(gate.stage, "stage_50_pdf_probe");
    assert.equal(gate.next_action, "submit_stage_payload");
    assert.notEqual(gate.next_action, "await_user_input");
    assert.match(gate.required_reads[0], /pdf-probe\.md$/);
    assert.deepEqual(gate.required_pdf_routes, [
      "authoritative_landing",
      "open_access",
      "web_search",
    ]);

    gate = await submitPayload(run, gate, pdfPayload());

    assert.equal(gate.stage, "stage_60_ingest_prepare");
    assert.equal(gate.next_action, "run_stage");
    assert.match(gate.required_reads[0], /ingest-output-recovery\.md$/);
    gate = runGate(run.runRoot, [...run.common, "--run-stage"]);
    assert.equal(gate.stage, "stage_70_ingest");
    assert.equal(gate.next_action, "execute_ingest");
    assert.notEqual(gate.next_action, "await_user_input");
    assert.include(gate.command, `@${gate.ingest_payload_path}`);
    assert.notInclude(gate.command, '@"');

    const ingestPayload = JSON.parse(
      await fs.readFile(gate.ingest_payload_path, "utf8"),
    );
    assert.equal(ingestPayload.paper.fields.title, "隧道衬砌病害智能识别研究");
    assert.deepEqual(ingestPayload.paper.creators, []);
    assert.equal(ingestPayload.paper.identifiers.doi, "10.5555/tunnel.001");
    assert.notProperty(ingestPayload.paper.fields, "extra");

    await writeJson(gate.ingest_payload_path, {
      ...ingestPayload,
      paper: {
        ...ingestPayload.paper,
        fields: {
          ...ingestPayload.paper.fields,
          title: "tampered title",
        },
      },
    });
    const tampered = runGate(run.runRoot, run.common);
    assert.equal(tampered.next_action, "blocked");
    assert.equal(tampered.blockers[0]?.code, "payload_hash_mismatch");
    await writeJson(gate.ingest_payload_path, ingestPayload);
    gate = runGate(run.runRoot, run.common);
    assert.equal(gate.next_action, "execute_ingest");

    const receiptPath = gate.receipt_path;
    await writeJson(receiptPath, {
      candidate_id: gate.candidate_id,
      ingest_payload_hash: gate.ingest_payload_hash,
      host_response: {
        result: {
          ingest: {
            status: "created",
            item: { id: 1, key: "ITEM1", libraryId: 1 },
          },
        },
      },
    });
    const receiptArgs = [...run.common, "--submit-ingest-receipt", receiptPath];
    gate = runGate(run.runRoot, receiptArgs);
    assert.equal(gate.stage, "completed");
    assert.equal(gate.next_action, "return_final_output");
    assert.equal(gate.status, "completed");
    assert.equal(gate.kind, "literature_search_ingest");
    assert.match(gate.required_reads[0], /ingest-output-recovery\.md$/);

    const replay = runGate(run.runRoot, receiptArgs);
    assert.equal(replay.stage, "completed");
    await writeJson(receiptPath, { status: "failed" });
    const conflictingReceipt = runGate(run.runRoot, receiptArgs, {
      expectFailure: true,
    });
    assert.equal(conflictingReceipt.error?.code, "conflicting_replay");
  });

  it("blocks incomplete metadata and PDF evidence while allowing exact retries", async function () {
    const { run, gate } = await advanceToMetadata();
    const invalidMetadata = {
      action: "record_metadata",
      candidate_id: "doi:10.5555/tunnel.001",
      status: "qualified",
      identifier_status: "identifier_not_found",
      checked_sources: ["Search snippet"],
      match: {
        method: "title",
        direct_work: true,
        material_conflict: false,
      },
      metadata: {
        itemType: "journalArticle",
        originalTitle: {
          value: "English-only candidate title",
          language: "en",
          script: "Latn",
        },
        alternateTitles: [],
        language: "en",
        script: "Latn",
        creatorCompleteness: "unknown",
        fields: { title: "English-only candidate title" },
        creators: [],
        identifiers: {},
        containers: [],
        landingUrl: "https://aggregator.example.test/record",
      },
      evidence: [
        {
          source: "Search snippet",
          source_role: "secondary",
          url: "https://aggregator.example.test/record",
          reason: "A title-like string was found.",
        },
      ],
      corroborating_signals: ["title"],
      warnings: [],
      needs_curation: false,
    };
    await writeJson(gate.payload_path, invalidMetadata);
    const failed = runGate(
      run.runRoot,
      [...run.common, "--submit-stage-payload", gate.payload_path],
      { expectFailure: true },
    );
    assert.equal(failed.error?.code, "invalid_stage_payload");

    const unchanged = runGate(run.runRoot, run.common);
    assert.equal(unchanged.stage, "stage_40_metadata_resolution");

    const searchPlanEvent = JSON.parse(await fs.readFile(run.statePath, "utf8"))
      .events[0];
    const replayPath = path.join(
      run.runRoot,
      "runtime",
      "payloads",
      "replay.json",
    );
    await writeJson(replayPath, searchPlanEvent.payload);
    const replay = runGate(run.runRoot, [
      ...run.common,
      "--submit-stage-payload",
      replayPath,
    ]);
    assert.equal(replay.stage, "stage_40_metadata_resolution");

    await writeJson(replayPath, {
      ...searchPlanEvent.payload,
      plan: {
        ...searchPlanEvent.payload.plan,
        objective: "conflicting replay",
      },
    });
    const conflict = runGate(
      run.runRoot,
      [...run.common, "--submit-stage-payload", replayPath],
      { expectFailure: true },
    );
    assert.equal(conflict.error?.code, "conflicting_replay");
  });

  it("returns to the next cumulative discovery round without adding a third decision stage", async function () {
    const run = await createRun();
    let gate = runGate(run.runRoot, run.common);
    gate = await submitPayload(run, gate, searchPlanPayload());
    gate = await submitPayload(run, gate, discoveryPayload(1));

    gate = await submitPayload(run, gate, {
      action: "request_discovery_expansion",
      discovery_round: 1,
      gap_requests: [
        {
          gap_type: "literature_type",
          description: "补充中文学位论文",
          requested_lanes: ["multilingual", "gap"],
        },
      ],
    });
    assert.equal(gate.stage, "stage_20_discovery");
    assert.equal(gate.next_action, "submit_stage_payload");
    assert.equal(gate.discovery_round, 2);
    assert.match(gate.payload_path, /discovery-round-002\.json$/);

    const missingPriorCandidate = discoveryPayload(2, [
      candidate("source:thesis-002", "隧道衬砌裂缝识别学位论文"),
    ]);
    await writeJson(gate.payload_path, missingPriorCandidate);
    const missingFailure = runGate(
      run.runRoot,
      [...run.common, "--submit-stage-payload", gate.payload_path],
      { expectFailure: true },
    );
    assert.equal(missingFailure.error?.code, "invalid_stage_payload");

    gate = await submitPayload(
      run,
      gate,
      discoveryPayload(2, [
        candidate(),
        candidate("source:thesis-002", "隧道衬砌裂缝识别学位论文"),
      ]),
    );
    assert.equal(gate.stage, "stage_30_ingest_scope");
    assert.equal(gate.next_action, "await_user_input");
    assert.equal(gate.discovery_round, 2);
    assert.lengthOf(gate.resume_packet.candidate_ids, 2);
  });

  it("supports cancellation only at the two user decision stages", async function () {
    const planRun = await createRun();
    let gate = runGate(planRun.runRoot, planRun.common);
    gate = await submitPayload(planRun, gate, {
      action: "cancel_workflow",
      reason: "user_cancelled",
      message: "The user canceled search planning.",
    });
    assert.equal(gate.next_action, "return_final_output");
    assert.equal(gate.status, "canceled");
    assert.equal(gate.kind, "literature_search_ingest_canceled");

    const scopeRun = await createRun();
    gate = runGate(scopeRun.runRoot, scopeRun.common);
    gate = await submitPayload(scopeRun, gate, searchPlanPayload());
    gate = await submitPayload(scopeRun, gate, discoveryPayload(1));
    gate = await submitPayload(scopeRun, gate, {
      action: "cancel_workflow",
      reason: "user_cancelled",
      message: "The user declined the ingest scope.",
    });
    assert.equal(gate.next_action, "return_final_output");
    assert.equal(gate.status, "canceled");
    assert.equal(gate.kind, "literature_search_ingest_canceled");
  });

  it("skips rejected metadata candidates without another waiting stage", async function () {
    const { run, gate: metadataGate } = await advanceToMetadata();
    let gate = await submitPayload(run, metadataGate, {
      action: "record_metadata",
      candidate_id: "doi:10.5555/tunnel.001",
      status: "not_attempted",
      reason_code: "material_conflict_unresolved",
      reason:
        "The resolved DOI belongs to a later journal article rather than the approved direct work.",
      checked_sources: ["China DOI", "Official journal landing"],
      evidence: [
        {
          source: "Official journal landing",
          source_role: "authoritative",
          url: "https://doi.org/10.5555/tunnel.001",
          identifier: "10.5555/tunnel.001",
          reason: "The landing record exposes a different material version.",
          facts: ["different_title", "different_material_version"],
        },
      ],
      warnings: [
        {
          code: "material_version_conflict",
          message: "The authorized direct work could not be qualified.",
        },
      ],
    });

    assert.equal(gate.stage, "stage_60_ingest_prepare");
    assert.equal(gate.next_action, "run_stage");
    assert.notEqual(gate.next_action, "await_user_input");
    gate = runGate(run.runRoot, [...run.common, "--run-stage"]);
    assert.equal(gate.stage, "completed");
    assert.equal(gate.next_action, "return_final_output");
    assert.deepEqual(gate.resume_packet.prepared_candidate_ids, []);
  });

  it("fails closed on accepted payload tampering and fatal receipt mismatches", async function () {
    const { run, gate: metadataGate } = await advanceToMetadata();
    let gate = await submitPayload(run, metadataGate, metadataPayload());
    gate = await submitPayload(run, gate, pdfPayload());
    assert.equal(gate.stage, "stage_60_ingest_prepare");

    const acceptedMetadata = JSON.parse(
      await fs.readFile(metadataGate.payload_path, "utf8"),
    );
    await writeJson(metadataGate.payload_path, {
      ...acceptedMetadata,
      metadata: {
        ...acceptedMetadata.metadata,
        fields: {
          ...acceptedMetadata.metadata.fields,
          title: "tampered accepted title",
        },
      },
    });
    const tamperedUpstream = runGate(
      run.runRoot,
      [...run.common, "--run-stage"],
      { expectFailure: true },
    );
    assert.equal(tamperedUpstream.error?.code, "payload_hash_mismatch");

    await writeJson(metadataGate.payload_path, acceptedMetadata);
    gate = runGate(run.runRoot, [...run.common, "--run-stage"]);
    assert.equal(gate.stage, "stage_70_ingest");

    await writeJson(gate.receipt_path, {
      candidate_id: gate.candidate_id,
      ingest_payload_hash: "sha256:wrong",
      status: "failed",
      reason: "approval_denied",
      message: "The user denied the Host write request.",
    });
    const wrongHash = runGate(
      run.runRoot,
      [...run.common, "--submit-ingest-receipt", gate.receipt_path],
      { expectFailure: true },
    );
    assert.equal(wrongHash.error?.code, "invalid_ingest_receipt");

    await writeJson(gate.receipt_path, {
      candidate_id: gate.candidate_id,
      ingest_payload_hash: gate.ingest_payload_hash,
      status: "failed",
      reason: "approval_denied",
      message: "The user denied the Host write request.",
    });
    gate = runGate(run.runRoot, [
      ...run.common,
      "--submit-ingest-receipt",
      gate.receipt_path,
    ]);
    assert.equal(gate.stage, "completed");
    assert.equal(gate.next_action, "return_final_output");
    assert.equal(gate.status, "canceled");
    assert.equal(gate.kind, "literature_search_ingest_canceled");
    assert.equal(gate.reason, "approval_denied");
  });

  it("fails closed on input drift and a receipt written outside the issued path", async function () {
    const { run, gate: metadataGate } = await advanceToMetadata();
    let gate = await submitPayload(run, metadataGate, metadataPayload());
    gate = await submitPayload(run, gate, pdfPayload());
    gate = runGate(run.runRoot, [...run.common, "--run-stage"]);

    const wrongReceipt = path.join(
      run.runRoot,
      "runtime",
      "host",
      "wrong.json",
    );
    await writeJson(wrongReceipt, { status: "created" });
    const wrongReceiptResult = runGate(
      run.runRoot,
      [...run.common, "--submit-ingest-receipt", wrongReceipt],
      { expectFailure: true },
    );
    assert.equal(wrongReceiptResult.error?.code, "invalid_ingest_receipt");

    await writeJson(run.inputPath, {
      parameter: {
        query: "changed after initialization",
        searchMode: "guided",
      },
    });
    const drift = runGate(run.runRoot, run.common);
    assert.equal(drift.next_action, "blocked");
    assert.equal(drift.blockers[0]?.code, "invalid_state");
  });

  it("returns a blocker for corrupt state instead of guessing progress", async function () {
    const run = await createRun();
    await fs.mkdir(path.dirname(run.statePath), { recursive: true });
    await fs.writeFile(run.statePath, "{broken", "utf8");

    const gate = runGate(run.runRoot, run.common);
    assert.equal(gate.next_action, "blocked");
    assert.equal(gate.blockers[0]?.code, "invalid_state");
  });
});

describe("literature search ingest runtime action schema", function () {
  it("compiles under Ajv 8 and accepts every declared action shape", async function () {
    const schema = JSON.parse(
      await fs.readFile(
        path.join(skillRoot, "assets", "runtime-action.schema.json"),
        "utf8",
      ),
    );
    const validate = new Ajv({
      allErrors: true,
      strict: true,
      allowUnionTypes: true,
    }).compile(schema);
    const validActions = [
      searchPlanPayload(),
      discoveryPayload(1),
      {
        action: "request_discovery_expansion",
        discovery_round: 1,
        gap_requests: [
          {
            gap_type: "language",
            description: "补充繁体中文来源",
            requested_lanes: ["multilingual", "gap"],
          },
        ],
      },
      {
        action: "approve_ingest_scope",
        approved: true,
        discovery_round: 1,
        candidate_ids: ["doi:10.5555/tunnel.001"],
        excluded_candidate_ids: [],
        authorization_notice_acknowledged: true,
      },
      {
        action: "cancel_workflow",
        reason: "user_cancelled",
        message: "The user canceled the workflow.",
      },
      metadataPayload(),
      pdfPayload(),
    ];

    for (const payload of validActions) {
      assert.isTrue(
        validate(payload),
        `${payload.action}: ${JSON.stringify(validate.errors)}`,
      );
    }
  });

  it("rejects incomplete evidence, missing routes or rounds, undeclared actions, and illegal enums", async function () {
    const schema = JSON.parse(
      await fs.readFile(
        path.join(skillRoot, "assets", "runtime-action.schema.json"),
        "utf8",
      ),
    );
    const validate = new Ajv({
      allErrors: true,
      strict: true,
      allowUnionTypes: true,
    }).compile(schema);
    const withoutRound: any = discoveryPayload(1);
    delete withoutRound.discovery_round;
    const withoutAuthority = metadataPayload();
    withoutAuthority.evidence[0].source_role = "secondary";
    const withoutOriginalTitle: any = metadataPayload();
    delete withoutOriginalTitle.metadata.originalTitle;
    const incompleteCreators = metadataPayload();
    incompleteCreators.metadata.creatorCompleteness = "complete";
    incompleteCreators.metadata.creators = [];
    const missingPdfRoute = pdfPayload();
    missingPdfRoute.attempts = missingPdfRoute.attempts.slice(0, 2);
    const illegalPdfStatus = pdfPayload();
    illegalPdfStatus.attempts[0].status = "skipped";

    const invalidPayloads = [
      withoutRound,
      withoutAuthority,
      withoutOriginalTitle,
      incompleteCreators,
      missingPdfRoute,
      illegalPdfStatus,
      { action: "invented_action" },
      { ...searchPlanPayload(), extra_field: true },
    ];
    for (const payload of invalidPayloads) {
      assert.isFalse(validate(payload), JSON.stringify(payload));
    }
  });
});
