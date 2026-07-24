import { assert } from "chai";
import Ajv from "ajv";
import { spawnSync } from "child_process";
import fs from "fs/promises";
import os from "os";
import path from "path";

const skillRoot = path.resolve("skills_builtin/literature-search-ingest");

function pythonCommand(
  args: string[],
  script = path.join(skillRoot, "scripts", "gate_runtime.py"),
) {
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
        script,
        ...args,
      ],
    };
  }
  return {
    command: process.env.PYTHON || "python",
    args: [script, ...args],
  };
}

function runBatch(
  runRoot: string,
  args: string[],
  options: { expectFailure?: boolean } = {},
) {
  const command = pythonCommand(
    args,
    path.join(skillRoot, "scripts", "batch_runtime.py"),
  );
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

async function advanceToMetadata(targetCollection = "") {
  const run = await createRun(targetCollection);
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
  assert.equal(gate.next_action, "prepare_agent_batches");
  assert.deepEqual(waits, ["await_user_input", "await_user_input"]);
  return { run, gate };
}

function batchFilePath(specPath: string, relativePath: string) {
  return path.resolve(path.dirname(specPath), relativePath);
}

async function finalizeBatch(
  run: Awaited<ReturnType<typeof createRun>>,
  batch: any,
  entries: Array<{ metadata: any; pdf?: any }>,
) {
  const spec = JSON.parse(await fs.readFile(batch.spec_path, "utf8"));
  assert.equal(spec.candidates.length, entries.length);
  await writeJson(
    batchFilePath(batch.spec_path, spec.write_probe_path),
    spec.write_probe_contract,
  );
  for (const [index, entry] of entries.entries()) {
    const candidate = spec.candidates[index];
    await writeJson(
      batchFilePath(batch.spec_path, candidate.metadata_path),
      entry.metadata,
    );
    if (entry.pdf) {
      await writeJson(
        batchFilePath(batch.spec_path, candidate.pdf_path),
        entry.pdf,
      );
    }
  }
  const finalized = runBatch(run.runRoot, [
    "--finalize",
    "--spec",
    batch.spec_path,
  ]);
  assert.equal(finalized.batch_id, spec.batch_id);
  assert.equal(finalized.spec_hash, spec.spec_hash);
  assert.equal(finalized.result_path, batch.result_path);
  return finalized;
}

async function prepareSingleBatch(
  run: Awaited<ReturnType<typeof createRun>>,
  gate: any,
) {
  const delegated = runGate(run.runRoot, [
    ...run.common,
    "--prepare-agent-batches",
  ]);
  assert.equal(delegated.stage, "stage_40_metadata_resolution");
  assert.equal(delegated.next_action, "delegate_agent_batches");
  assert.equal(delegated.dispatch_plan.mode, "parallel");
  assert.isTrue(delegated.dispatch_plan.dispatch_all_before_wait);
  assert.lengthOf(delegated.dispatch_plan.batches, 1);
  assert.notProperty(delegated, "next_batch_id");
  assert.notProperty(delegated, "import_result_path");
  assert.notProperty(delegated, "import_command");
  assert.notProperty(delegated.dispatch_plan.batches[0], "host_command");
  assert.notProperty(delegated.dispatch_plan.batches[0], "receipt_path");
  assert.notProperty(delegated.dispatch_plan.batches[0], "import_command");
  return delegated.dispatch_plan.batches[0];
}

describe("literature search ingest skill gate runtime", function () {
  this.timeout(30000);

  it("keeps two decisions, derives context, and generates terminal output", async function () {
    const { run, gate: batchGate } = await advanceToMetadata(
      "Research/Infrastructure AI",
    );
    const batch = await prepareSingleBatch(run, batchGate);
    await finalizeBatch(run, batch, [
      { metadata: metadataPayload(), pdf: pdfPayload() },
    ]);
    const readyGate = runGate(run.runRoot, run.common);
    assert.equal(readyGate.next_action, "import_agent_batches");
    assert.equal(readyGate.next_batch_id, batch.batch_id);
    let gate = runGate(run.runRoot, [
      ...run.common,
      "--import-agent-batch",
      batch.result_path,
    ]);
    assert.equal(gate.stage, "stage_70_ingest");
    const ingestPayload = JSON.parse(
      await fs.readFile(gate.ingest_payload_path, "utf8"),
    );
    assert.equal(ingestPayload.paper.fields.title, "隧道衬砌病害智能识别研究");
    assert.deepEqual(ingestPayload.paper.creators, []);
    assert.equal(ingestPayload.paper.identifiers.doi, "10.5555/tunnel.001");
    assert.equal(ingestPayload.collection, "Research/Infrastructure AI");

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

  it("cuts approved candidates into stable five-paper agent batches and withholds Stage 70 until every batch imports", async function () {
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
        (_, index) => `doi:10.5555/tunnel.${index + 1}`,
      ),
    });
    assert.equal(gate.next_action, "prepare_agent_batches");
    gate = runGate(run.runRoot, [...run.common, "--prepare-agent-batches"]);
    assert.equal(gate.next_action, "delegate_agent_batches");
    assert.equal(gate.dispatch_plan.mode, "parallel");
    assert.isTrue(gate.dispatch_plan.dispatch_all_before_wait);
    assert.equal(gate.dispatch_plan.expected_batch_count, 3);
    assert.deepEqual(gate.dispatch_plan.batch_ids, [
      "batch-001",
      "batch-002",
      "batch-003",
    ]);
    assert.notProperty(gate, "next_batch_id");
    assert.notProperty(gate, "import_result_path");
    assert.notProperty(gate, "import_command");
    assert.deepEqual(
      gate.dispatch_plan.batches.map(
        (batch: any) => batch.candidate_ids.length,
      ),
      [5, 5, 2],
    );
    assert.isTrue(
      gate.dispatch_plan.batches.every((batch: any) =>
        batch.spec_path.startsWith(
          path.join(run.runRoot, "runtime", "agent-batches"),
        ),
      ),
    );
    assert.isTrue(
      gate.dispatch_plan.batches.every((batch: any) =>
        batch.write_probe_path.startsWith(
          path.join(run.runRoot, "runtime", "agent-batches"),
        ),
      ),
    );
    assert.isTrue(
      gate.dispatch_plan.batches.every(
        (batch: any) => batch.worker_contract.host_mutation_allowed === false,
      ),
    );
    assert.deepEqual(gate.dispatch_plan.batches[0].write_probe_contract, {
      batch_id: "batch-001",
      status: "writable",
    });
    assert.deepEqual(
      gate.dispatch_plan.batches[0].worker_contract.stage_chain,
      [
        "stage_40_metadata_resolution",
        "stage_50_pdf_probe",
        "stage_60_ingest_prepare",
      ],
    );
    assert.match(
      gate.dispatch_plan.batches[0].delegation_prompt,
      /one subagent context/i,
    );
    assert.notProperty(gate.dispatch_plan.batches[0], "import_command");

    const repeatedDispatch = runGate(run.runRoot, run.common);
    assert.equal(
      repeatedDispatch.dispatch_plan.plan_hash,
      gate.dispatch_plan.plan_hash,
    );
    assert.deepEqual(
      repeatedDispatch.dispatch_plan.batch_ids,
      gate.dispatch_plan.batch_ids,
    );

    const batches = gate.dispatch_plan.batches;
    const first = batches[0];
    await finalizeBatch(
      run,
      first,
      Array.from({ length: 5 }, (_, index) => {
        const doi = `10.5555/tunnel.${index + 1}`;
        return {
          metadata: {
            ...metadataPayload(),
            metadata: {
              ...metadataPayload().metadata,
              identifiers: { doi },
              landingUrl: `https://doi.org/${doi}`,
            },
          },
          pdf: pdfPayload(),
        };
      }),
    );
    gate = runGate(run.runRoot, run.common);
    assert.equal(gate.stage, "stage_40_metadata_resolution");
    assert.equal(gate.next_action, "delegate_agent_batches");
    assert.deepEqual(gate.result_ready_batch_ids, ["batch-001"]);
    assert.deepEqual(
      gate.dispatch_plan.batches.map((batch: any) => batch.batch_id),
      ["batch-002", "batch-003"],
    );
    assert.notProperty(gate, "next_batch_id");
    assert.notProperty(gate, "import_result_path");
    assert.notProperty(gate, "import_command");
    const prematureImport = runGate(
      run.runRoot,
      [...run.common, "--import-agent-batch", first.result_path],
      { expectFailure: true },
    );
    assert.equal(prematureImport.error?.code, "agent_batch_results_incomplete");

    for (const batch of batches.slice(1)) {
      const spec = JSON.parse(await fs.readFile(batch.spec_path, "utf8"));
      await finalizeBatch(
        run,
        batch,
        spec.candidates.map((entry: any) => {
          const doi = entry.candidate_id.replace(/^doi:/, "");
          return {
            metadata: {
              ...metadataPayload(),
              metadata: {
                ...metadataPayload().metadata,
                title: entry.candidate.title,
                identifiers: { doi },
                landingUrl: `https://doi.org/${doi}`,
              },
            },
            pdf: pdfPayload(),
          };
        }),
      );
    }

    gate = runGate(run.runRoot, run.common);
    assert.equal(gate.next_action, "import_agent_batches");
    assert.deepEqual(gate.ready_batch_ids, [
      "batch-001",
      "batch-002",
      "batch-003",
    ]);
    for (const [index, batch] of batches.entries()) {
      assert.equal(gate.next_batch_id, batch.batch_id);
      assert.equal(gate.import_result_path, batch.result_path);
      assert.match(gate.import_command, /--import-agent-batch/);
      gate = runGate(run.runRoot, [
        ...run.common,
        "--import-agent-batch",
        batch.result_path,
      ]);
      if (index < batches.length - 1) {
        assert.equal(gate.next_action, "import_agent_batches");
      }
    }
    assert.equal(gate.stage, "stage_70_ingest");
    assert.equal(gate.candidate_id, "doi:10.5555/tunnel.1");
  });

  it("validates a whole batch before publishing canonical payloads", async function () {
    const run = await createRun();
    let gate = runGate(run.runRoot, run.common);
    gate = await submitPayload(run, gate, searchPlanPayload());
    const candidates = [
      candidate("隧道衬砌病害智能识别研究 1", "10.5555/tunnel.1"),
      candidate("隧道衬砌病害智能识别研究 2", "10.5555/tunnel.2"),
    ];
    gate = await submitPayload(run, gate, discoveryPayload(candidates));
    gate = await submitPayload(run, gate, {
      decision: "approve",
      candidate_ids: ["doi:10.5555/tunnel.1", "doi:10.5555/tunnel.2"],
    });
    gate = runGate(run.runRoot, [...run.common, "--prepare-agent-batches"]);
    const batch = gate.dispatch_plan.batches[0];
    await finalizeBatch(
      run,
      batch,
      candidates.map((_, index) => {
        const doi = `10.5555/tunnel.${index + 1}`;
        return {
          metadata: {
            ...metadataPayload(),
            metadata: {
              ...metadataPayload().metadata,
              title: `隧道衬砌病害智能识别研究 ${index + 1}`,
              identifiers: { doi },
              landingUrl: `https://doi.org/${doi}`,
            },
          },
          pdf: pdfPayload(),
        };
      }),
    );
    const spec = JSON.parse(await fs.readFile(batch.spec_path, "utf8"));
    const secondMetadataPath = batchFilePath(
      batch.spec_path,
      spec.candidates[1].metadata_path,
    );
    const secondMetadata = JSON.parse(
      await fs.readFile(secondMetadataPath, "utf8"),
    );
    await writeJson(secondMetadataPath, {
      ...secondMetadata,
      metadata: { ...secondMetadata.metadata, title: "tampered second record" },
    });

    const rejected = runGate(
      run.runRoot,
      [...run.common, "--import-agent-batch", batch.result_path],
      { expectFailure: true },
    );
    assert.equal(rejected.error?.code, "batch_artifact_hash_mismatch");
    const state = JSON.parse(await fs.readFile(run.statePath, "utf8"));
    assert.deepEqual(state.metadata, {});
    let canonicalMetadataExists = true;
    try {
      await fs.access(
        path.join(run.runRoot, "runtime", "payloads", "metadata-001.json"),
      );
    } catch {
      canonicalMetadataExists = false;
    }
    assert.isFalse(canonicalMetadataExists);
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
    const { run, gate: batchGate } = await advanceToMetadata();
    const batch = await prepareSingleBatch(run, batchGate);
    await finalizeBatch(run, batch, [
      {
        metadata: {
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
        },
      },
    ]);
    const gate = runGate(run.runRoot, [
      ...run.common,
      "--import-agent-batch",
      batch.result_path,
    ]);
    assert.equal(gate.next_action, "return_final_output");
    assert.deepEqual(gate.final_output.outcomes, [
      {
        title: "隧道衬砌病害智能识别研究",
        ingestStatus: "not_attempted",
      },
    ]);
  });

  it("keeps hash, receipt-path, fatal failure, input-drift, and corrupt-state gates", async function () {
    const { run, gate: batchGate } = await advanceToMetadata();
    const batch = await prepareSingleBatch(run, batchGate);
    await finalizeBatch(run, batch, [
      { metadata: metadataPayload(), pdf: pdfPayload() },
    ]);
    const spec = JSON.parse(await fs.readFile(batch.spec_path, "utf8"));
    const metadataPath = batchFilePath(
      batch.spec_path,
      spec.candidates[0].metadata_path,
    );

    const acceptedMetadata = JSON.parse(
      await fs.readFile(metadataPath, "utf8"),
    );
    await writeJson(metadataPath, {
      ...acceptedMetadata,
      metadata: { ...acceptedMetadata.metadata, title: "tampered title" },
    });
    const tampered = runGate(
      run.runRoot,
      [...run.common, "--import-agent-batch", batch.result_path],
      {
        expectFailure: true,
      },
    );
    assert.equal(tampered.error?.code, "batch_artifact_hash_mismatch");
    await writeJson(metadataPath, acceptedMetadata);
    await runBatch(run.runRoot, ["--finalize", "--spec", batch.spec_path]);
    const result = JSON.parse(await fs.readFile(batch.result_path, "utf8"));
    await writeJson(batch.result_path, {
      ...result,
      host_command: "zotero-bridge mutation literature-ingest",
    });
    const unauthorized = runGate(
      run.runRoot,
      [...run.common, "--import-agent-batch", batch.result_path],
      { expectFailure: true },
    );
    assert.equal(unauthorized.error?.code, "invalid_agent_batch");
    await runBatch(run.runRoot, ["--finalize", "--spec", batch.spec_path]);
    let gate = runGate(run.runRoot, [
      ...run.common,
      "--import-agent-batch",
      batch.result_path,
    ]);

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
    const abstractField: any = metadataPayload();
    abstractField.metadata.fields.abstract = "This must use abstractNote.";
    const forbiddenFieldNames = ["title", "DOI", "doi", "ISBN", "extra"];

    for (const payload of [
      { ...searchPlanPayload(), action: "approve_search_plan" },
      { ...discoveryPayload(), discovery_round: 1 },
      { ...metadataPayload(), candidate_id: "doi:10.5555/tunnel.001" },
      noAuthority,
      incompleteCreators,
      missingRoute,
      foundWithoutEvidence,
      abstractField,
      ...forbiddenFieldNames.map((field) => ({
        ...metadataPayload(),
        metadata: {
          ...metadataPayload().metadata,
          fields: { [field]: "forbidden" },
        },
      })),
      { decision: "invented" },
    ]) {
      assert.isFalse(validate(payload), JSON.stringify(payload));
    }
  });

  it("accepts abstractNote as the canonical abstract field", async function () {
    const validate = await validator();
    const payload: any = metadataPayload();
    payload.metadata.fields.abstractNote = "A verified abstract.";
    payload.metadata.fields.ISSN = "1234-5678";
    assert.isTrue(validate(payload), JSON.stringify(validate.errors));
  });
});
