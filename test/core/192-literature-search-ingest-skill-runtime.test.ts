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

async function createRun(targetCollection = "") {
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
      targetCollection,
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

function metadataPayload(title = "隧道衬砌病害智能识别研究") {
  return {
    status: "qualified",
    metadata: {
      itemType: "journalArticle",
      title,
      language: "zh-CN",
      script: "Hans",
      alternateTitles: [],
      fields: {
        publicationTitle: "隧道工程学报",
        date: "2024",
        language: "zh-CN",
      },
      creatorCompleteness: "complete",
      creators: [{ creatorType: "author", name: "张三" }],
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
    curation_notes: [],
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
        source: "Open-access repositories",
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

function foundPdfPayload() {
  return {
    attempts: {
      authoritative_landing: {
        source: "DOI landing page",
        query_or_url: "https://doi.org/10.5555/tunnel.001",
        status: "not_found",
        notes: "No public PDF link was exposed.",
      },
      open_access: {
        source: "Institutional repository",
        query_or_url: "10.5555/tunnel.001",
        status: "found",
        notes: "A public same-work PDF was verified.",
        pdf_url: "https://repository.example.org/tunnel-001.pdf",
        content_type: "application/pdf",
        identity_evidence: ["DOI, title, creators, and year match."],
      },
      web_search: {
        source: "Public web search",
        query_or_url: "not needed after verified repository PDF",
        status: "skipped_after_verified_pdf",
        notes: "A higher-priority route already found the PDF.",
      },
    },
  };
}

function workerResult(
  candidateId = "doi:10.5555/tunnel.001",
  title = "隧道衬砌病害智能识别研究",
) {
  return {
    candidate_id: candidateId,
    status: "resolved",
    item_type: "journalArticle",
    title,
    creators: ["张三"],
    date: "2024",
    publication_title: "隧道工程学报",
    language: "zh-CN",
    doi: candidateId.startsWith("doi:") ? candidateId.slice(4) : null,
    landing_url: "https://doi.org/10.5555/tunnel.001",
    pdf_url: null,
    source_urls: ["https://doi.org/10.5555/tunnel.001"],
    notes: ["No public PDF was found within the bounded search."],
  };
}

function reviewPayload(title = "隧道衬砌病害智能识别研究") {
  return { metadata: metadataPayload(title), pdf: pdfPayload() };
}

async function advanceToResearch(targetCollection = "") {
  const run = await createRun(targetCollection);
  let gate = runGate(run.runRoot, run.common);
  gate = await submitPayload(run, gate, searchPlanPayload());
  gate = await submitPayload(run, gate, discoveryPayload());
  gate = await submitPayload(run, gate, {
    decision: "approve",
    candidate_ids: ["doi:10.5555/tunnel.001"],
  });
  assert.equal(gate.stage, "stage_40_delegated_research");
  assert.equal(gate.next_action, "prepare_agent_batches");
  return { run, gate };
}

async function prepareAssignments(run: Awaited<ReturnType<typeof createRun>>) {
  const gate = runGate(run.runRoot, [...run.common, "--prepare-agent-batches"]);
  assert.equal(gate.stage, "stage_40_delegated_research");
  assert.equal(gate.next_action, "delegate_agent_research");
  assert.equal(gate.dispatch_plan.mode, "parallel");
  assert.isTrue(gate.dispatch_plan.dispatch_all_before_wait);
  assert.deepEqual(
    gate.required_reads.map((entry: string) => path.basename(entry)),
    ["metadata-resolution.md", "pdf-probe.md", "ingest-output-recovery.md"],
  );
  return gate;
}

async function writeWorkerResult(assignment: any, result: unknown) {
  const spec = JSON.parse(
    await fs.readFile(assignment.worker_spec_path, "utf8"),
  );
  await writeJson(spec.result_path, result);
  return spec;
}

async function submitReview(
  run: Awaited<ReturnType<typeof createRun>>,
  gate: any,
  payload: unknown,
) {
  await writeJson(gate.payload_path, payload);
  return runGate(run.runRoot, [
    ...run.common,
    "--submit-agent-review",
    gate.payload_path,
  ]);
}

describe("literature search ingest skill gate runtime", function () {
  this.timeout(30000);

  it("keeps the two user decisions before delegated research", async function () {
    const run = await createRun();
    let gate = runGate(run.runRoot, run.common);
    assert.equal(gate.stage, "stage_10_search_plan");
    assert.equal(gate.next_action, "await_user_input");

    gate = await submitPayload(run, gate, searchPlanPayload());
    assert.equal(gate.stage, "stage_20_discovery");

    gate = await submitPayload(run, gate, discoveryPayload());
    assert.equal(gate.stage, "stage_30_ingest_scope");
    assert.equal(gate.next_action, "await_user_input");

    gate = await submitPayload(run, gate, {
      decision: "approve",
      candidate_ids: ["doi:10.5555/tunnel.001"],
    });
    assert.equal(gate.stage, "stage_40_delegated_research");
    assert.equal(gate.next_action, "prepare_agent_batches");
  });

  it("returns every single-paper assignment at once without prompts, commands, stages, probes, or hashes", async function () {
    const run = await createRun();
    let gate = runGate(run.runRoot, run.common);
    gate = await submitPayload(run, gate, searchPlanPayload());
    const candidates = Array.from({ length: 12 }, (_, index) =>
      candidate(
        `隧道衬砌病害智能识别研究 ${index + 1}`,
        `10.5555/tunnel.${index + 1}`,
      ),
    );
    gate = await submitPayload(run, gate, discoveryPayload(candidates));
    gate = await submitPayload(run, gate, {
      decision: "approve",
      candidate_ids: candidates.map(
        (_entry, index) => `doi:10.5555/tunnel.${index + 1}`,
      ),
    });
    gate = await prepareAssignments(run);

    assert.lengthOf(gate.dispatch_plan.assignments, 12);
    for (const [
      index,
      assignment,
    ] of gate.dispatch_plan.assignments.entries()) {
      assert.equal(assignment.assignment_id, `paper-${index + 1}`);
      assert.deepEqual(Object.keys(assignment).sort(), [
        "assignment_id",
        "status",
        "worker_spec_path",
      ]);
      const spec = JSON.parse(
        await fs.readFile(assignment.worker_spec_path, "utf8"),
      );
      assert.deepEqual(Object.keys(spec).sort(), [
        "assignment_id",
        "candidate",
        "result_path",
        "search_limits",
      ]);
      assert.equal(
        spec.candidate.candidate_id,
        `doi:10.5555/tunnel.${index + 1}`,
      );
      assert.lengthOf(spec.candidate ? [spec.candidate] : [], 1);
      const serialized = JSON.stringify(spec);
      for (const forbidden of [
        "stage_40",
        "stage_50",
        "stage_60",
        "delegation_prompt",
        "write_probe",
        "finalize",
        "zotero-bridge",
        "sha256",
      ]) {
        assert.notInclude(serialized, forbidden);
      }
    }
  });

  it("waits for every simple worker result before opening main-agent review", async function () {
    const run = await createRun();
    let gate = runGate(run.runRoot, run.common);
    gate = await submitPayload(run, gate, searchPlanPayload());
    const candidates = [
      candidate("论文一", "10.5555/tunnel.1"),
      candidate("论文二", "10.5555/tunnel.2"),
    ];
    gate = await submitPayload(run, gate, discoveryPayload(candidates));
    gate = await submitPayload(run, gate, {
      decision: "approve",
      candidate_ids: ["doi:10.5555/tunnel.1", "doi:10.5555/tunnel.2"],
    });
    gate = await prepareAssignments(run);
    const [first, second] = gate.dispatch_plan.assignments;
    const firstSpec = JSON.parse(
      await fs.readFile(first.worker_spec_path, "utf8"),
    );

    await writeWorkerResult(
      first,
      workerResult("doi:10.5555/tunnel.1", "论文一"),
    );
    gate = runGate(run.runRoot, run.common);
    assert.equal(gate.next_action, "delegate_agent_research");
    assert.deepEqual(
      gate.dispatch_plan.assignments.map((entry: any) => entry.assignment_id),
      ["paper-2"],
    );
    assert.notProperty(gate, "payload_path");

    await writeWorkerResult(
      second,
      workerResult("doi:10.5555/tunnel.2", "论文二"),
    );
    gate = runGate(run.runRoot, run.common);
    assert.equal(gate.next_action, "review_agent_result");
    assert.equal(gate.assignment_id, "paper-1");
    assert.equal(gate.raw_result_path, firstSpec.result_path);
    assert.match(gate.payload_schema_ref, /#\/\$defs\/researchReviewPayload$/);
  });

  it("requires a main-agent review before canonical payloads or Stage 70 appear", async function () {
    const { run } = await advanceToResearch("1:COLLECTION");
    let gate = await prepareAssignments(run);
    const assignment = gate.dispatch_plan.assignments[0];
    await writeWorkerResult(assignment, workerResult());

    gate = runGate(run.runRoot, run.common);
    assert.equal(gate.next_action, "review_agent_result");
    const stateBefore = JSON.parse(await fs.readFile(run.statePath, "utf8"));
    assert.deepEqual(stateBefore.metadata, {});
    assert.deepEqual(stateBefore.pdf, {});

    gate = await submitReview(run, gate, reviewPayload());
    assert.equal(gate.stage, "stage_70_ingest");
    assert.equal(gate.next_action, "execute_ingest");
    const prepared = JSON.parse(
      await fs.readFile(gate.ingest_payload_path, "utf8"),
    );
    assert.equal(prepared.paper.fields.title, "隧道衬砌病害智能识别研究");
    assert.equal(prepared.collection, "1:COLLECTION");
    assert.notProperty(prepared, "hash");
  });

  it("rejects an invalid formal review without mutating global research state", async function () {
    const { run } = await advanceToResearch();
    let gate = await prepareAssignments(run);
    await writeWorkerResult(gate.dispatch_plan.assignments[0], workerResult());
    gate = runGate(run.runRoot, run.common);

    const invalid = reviewPayload();
    (invalid.metadata.metadata.fields as any).abstract = "invalid alias";
    await writeJson(gate.payload_path, invalid);
    const rejected = runGate(
      run.runRoot,
      [...run.common, "--submit-agent-review", gate.payload_path],
      { expectFailure: true },
    );
    assert.equal(rejected.error?.code, "invalid_stage_payload");
    const state = JSON.parse(await fs.readFile(run.statePath, "utf8"));
    assert.deepEqual(state.metadata, {});
    assert.deepEqual(state.pdf, {});
  });

  it("stops later PDF routes after the first verified public PDF", async function () {
    const { run } = await advanceToResearch();
    let gate = await prepareAssignments(run);
    await writeWorkerResult(gate.dispatch_plan.assignments[0], workerResult());
    gate = runGate(run.runRoot, run.common);
    gate = await submitReview(run, gate, {
      metadata: metadataPayload(),
      pdf: foundPdfPayload(),
    });
    assert.equal(gate.stage, "stage_70_ingest");
    const prepared = JSON.parse(
      await fs.readFile(gate.ingest_payload_path, "utf8"),
    );
    assert.equal(
      prepared.paper.pdfUrl,
      "https://repository.example.org/tunnel-001.pdf",
    );
  });

  it("rejects a skipped PDF route when no earlier route found a PDF", async function () {
    const { run } = await advanceToResearch();
    let gate = await prepareAssignments(run);
    await writeWorkerResult(gate.dispatch_plan.assignments[0], workerResult());
    gate = runGate(run.runRoot, run.common);
    const invalidPdf = pdfPayload();
    invalidPdf.attempts.open_access.status = "skipped_after_verified_pdf";
    await writeJson(gate.payload_path, {
      metadata: metadataPayload(),
      pdf: invalidPdf,
    });
    const rejected = runGate(
      run.runRoot,
      [...run.common, "--submit-agent-review", gate.payload_path],
      { expectFailure: true },
    );
    assert.equal(rejected.error?.code, "invalid_stage_payload");
  });

  it("allows an unresolved worker to terminate without PDF research or another subagent repair", async function () {
    const { run } = await advanceToResearch();
    let gate = await prepareAssignments(run);
    await writeWorkerResult(gate.dispatch_plan.assignments[0], {
      candidate_id: "doi:10.5555/tunnel.001",
      status: "unresolved",
      notes: [
        "The bounded search ended without a reliable direct-work record.",
      ],
    });
    gate = runGate(run.runRoot, run.common);
    gate = await submitReview(run, gate, {
      metadata: {
        status: "not_attempted",
        reason: "identity_not_verified",
        message: "The bounded search did not verify the direct work.",
        evidence: [],
      },
    });
    assert.equal(gate.next_action, "return_final_output");
    assert.deepEqual(gate.final_output.outcomes, [
      {
        title: "隧道衬砌病害智能识别研究",
        ingestStatus: "not_attempted",
      },
    ]);
  });

  it("keeps Stage 70 receipt validation and input-drift recovery", async function () {
    const { run } = await advanceToResearch();
    let gate = await prepareAssignments(run);
    await writeWorkerResult(gate.dispatch_plan.assignments[0], workerResult());
    gate = runGate(run.runRoot, run.common);
    gate = await submitReview(run, gate, reviewPayload());

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
      result: {
        ingest: {
          status: "created",
          item: { id: 123 },
          hasPdfAttachment: false,
        },
      },
    });
    gate = runGate(run.runRoot, [
      ...run.common,
      "--submit-ingest-receipt",
      gate.receipt_path,
    ]);
    assert.equal(gate.final_output.status, "completed");

    await writeJson(run.inputPath, {
      parameter: { query: "changed after initialization" },
    });
    const drift = runGate(run.runRoot, run.common);
    assert.equal(drift.next_action, "blocked");
  });
});

describe("literature search ingest instruction and schema contracts", function () {
  it("keeps the worker prompt in SKILL.md and the runner prompt minimal", async function () {
    const skill = await fs.readFile(path.join(skillRoot, "SKILL.md"), "utf8");
    const runner = JSON.parse(
      await fs.readFile(path.join(skillRoot, "assets", "runner.json"), "utf8"),
    );
    const batchRuntime = await fs.readFile(
      path.join(skillRoot, "scripts", "batch_runtime.py"),
      "utf8",
    );
    const commonPrompt = runner.entrypoint.prompts.common;

    assert.include(skill, "{{WORKER_SPEC_PATH}}");
    assert.include(
      skill,
      "exactly one literature-search-ingest research assignment",
    );
    assert.include(skill, "Do not run any project script or runtime command");
    assert.notInclude(batchRuntime, "delegation_prompt");
    assert.notInclude(batchRuntime, "finalize_argv");
    assert.isBelow(commonPrompt.length, 700);
    assert.include(commonPrompt, "SKILL.md");
    assert.notInclude(commonPrompt, "Stage 40");
    assert.notInclude(commonPrompt, "Stage 50");
    assert.notInclude(commonPrompt, "Stage 60");
  });

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

  it("accepts the main-agent research review and canonical abstract field", async function () {
    const validate = await validator();
    const review = reviewPayload();
    review.metadata.metadata.fields.abstractNote = "A verified abstract.";
    assert.isTrue(validate(review), JSON.stringify(validate.errors));
  });

  it("rejects invalid formal metadata and incomplete PDF routes", async function () {
    const validate = await validator();
    const abstractAlias = reviewPayload();
    (abstractAlias.metadata.metadata.fields as any).abstract = "invalid";
    const missingRoute = reviewPayload();
    delete (missingRoute.pdf.attempts as any).web_search;
    assert.isFalse(validate(abstractAlias));
    assert.isFalse(validate(missingRoute));
  });
});
