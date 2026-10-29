import { assert } from "chai";
import Ajv from "ajv";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { once } from "node:events";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import {
  validateCitationAgainstReferences,
  validateSourceReferenceArtifact,
} from "../../packages/synthesis-contracts/src/sourceReferenceArtifact";
import { validateLiteratureScoreArtifact } from "../../packages/synthesis-contracts/src/literatureArtifacts";
import {
  assembleTopicArtifact,
  validateTopicAnalysisManifest,
  validateTopicSynthesisArtifact,
} from "../../packages/synthesis-engine/src/topicStructuredArtifact";

const TOPIC_FIXTURE = path.resolve(
  "tests/fixtures/workflow-happy-path/acp-agent.mjs",
);
const PLANNED_TOPIC_ID = "system-e2e:wf:planned-topic";
const SEED_TOPIC_ID = "system-e2e:wf:seed-topic";
const UPDATE_TOPIC_ID = "system-e2e:wf:update-topic";

async function writeJsonFile(filePath: string, value: unknown) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(value, null, 2), "utf8");
}

async function runTopicPeer(args: {
  workspace: string;
  manifest: unknown;
  name: string;
  env: Record<string, string>;
}) {
  const manifestPath = path.join(
    args.workspace,
    ".acp",
    args.name,
    "input_manifest.json",
  );
  await writeJsonFile(manifestPath, args.manifest);
  const child = spawn(process.execPath, [TOPIC_FIXTURE], {
    env: { ...process.env, ...args.env },
  });
  let output = "";
  let stderr = "";
  child.stdout.setEncoding("utf8").on("data", (chunk) => (output += chunk));
  child.stderr.setEncoding("utf8").on("data", (chunk) => (stderr += chunk));
  const exited = once(child, "exit");
  child.stdin.end(
    [
      { id: 1, method: "initialize", params: { protocolVersion: 1 } },
      { id: 2, method: "session/new", params: { cwd: args.workspace } },
      {
        id: 3,
        method: "session/prompt",
        params: {
          sessionId: "workflow-fixture",
          prompt: [
            {
              type: "text",
              text: `- Run workspace: ${args.workspace}\n- Input manifest: ${manifestPath}`,
            },
          ],
        },
      },
    ]
      .map((request) => JSON.stringify({ jsonrpc: "2.0", ...request }))
      .join("\n") + "\n",
  );
  const [code] = await exited;
  assert.equal(code, 0, stderr);
  const messages = output
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line));
  return messages;
}

function peerResult(messages: Array<Record<string, any>>) {
  const update = messages.find(
    (message) => message.method === "session/update",
  );
  assert.isOk(update, JSON.stringify(messages));
  return JSON.parse(String(update!.params.update.content.text));
}

function peerError(messages: Array<Record<string, any>>) {
  const failure = messages.find((message) => message.id === 3);
  assert.isOk(failure?.error, JSON.stringify(messages));
  return String(failure!.error.message);
}

describe("production workflow ACP peer", function () {
  this.timeout(5000);

  for (const skillId of [
    "tag-bootstrapper",
    "tag-regulator",
    "literature-analysis",
    "literature-translator",
    "literature-deep-reading",
    "literature-explainer",
    "collection-collector",
    "literature-metadata-search",
    "unreviewed-skill",
  ]) {
    it(`handles ${skillId} according to reviewed coverage`, async function () {
      const root = await mkdtemp(path.join(os.tmpdir(), "workflow-acp-peer-"));
      const manifestDir = path.join(root, ".acp", "step");
      await mkdir(manifestDir, { recursive: true });
      const manifestPath = path.join(manifestDir, "input_manifest.json");
      const input = {
        metadata: { title: "Synthetic input" },
        input_tags: ["method:synthetic-input"],
        source_path: path.join(root, "source.md"),
      };
      const imageRef = "Images_SYN00000/figure.png";
      await writeFile(
        input.source_path,
        `# Synthetic Document\n\nThis paragraph is a synthetic fixture body for the MinerU mock peer.\n\n![figure](${imageRef})\n`,
      );
      await writeFile(
        manifestPath,
        JSON.stringify({
          skill_id: skillId,
          input,
          parameter: {
            target_language: "zh-CN",
            mode: "fast",
            collection: "1:SYNBOUND",
            collectionScope: "Synthetic collection scope",
          },
        }),
      );
      const refs = Array.from(
        { length: 20 },
        (_, index) => `1:BOUND${index + 1}`,
      );
      const child = spawn(
        process.execPath,
        [path.resolve("tests/fixtures/workflow-happy-path/acp-agent.mjs")],
        {
          env: {
            ...process.env,
            ZOTERO_WORKFLOW_FIXTURE_PAPER_REFS: JSON.stringify(refs),
          },
        },
      );
      let output = "";
      let stderr = "";
      child.stdout.setEncoding("utf8").on("data", (chunk) => (output += chunk));
      child.stderr.setEncoding("utf8").on("data", (chunk) => (stderr += chunk));
      const exited = once(child, "exit");
      child.stdin.end(
        [
          { id: 1, method: "initialize", params: { protocolVersion: 1 } },
          { id: 2, method: "session/new", params: { cwd: root } },
          {
            id: 3,
            method: "session/prompt",
            params: {
              sessionId: "workflow-fixture",
              prompt: [
                {
                  type: "text",
                  text: `- Run workspace: ${root}\n- Input manifest: ${manifestPath}`,
                },
              ],
            },
          },
          ...(skillId === "literature-explainer"
            ? [
                {
                  id: 4,
                  method: "session/prompt",
                  params: {
                    sessionId: "workflow-fixture",
                    prompt: [{ type: "text", text: "generate_note" }],
                  },
                },
                {
                  id: 5,
                  method: "session/prompt",
                  params: {
                    sessionId: "workflow-fixture",
                    prompt: [{ type: "text", text: "confirm_note" }],
                  },
                },
              ]
            : []),
        ]
          .map((request) => JSON.stringify({ jsonrpc: "2.0", ...request }))
          .join("\n") + "\n",
      );
      const [code] = await exited;
      assert.equal(code, 0, stderr);
      const messages = output
        .trim()
        .split("\n")
        .map((line) => JSON.parse(line));
      assert.equal(
        messages.find((message) => message.id === 1).result.protocolVersion,
        1,
      );
      if (skillId === "unreviewed-skill") {
        assert.equal(
          messages.find((message) => message.id === 3).error.code,
          -32602,
        );
        assert.isFalse(
          messages.some((message) => message.method === "session/update"),
        );
        return;
      }
      assert.equal(
        messages.find((message) => message.id === 3).result.stopReason,
        "end_turn",
      );
      const updates = messages.filter(
        (message) => message.method === "session/update",
      );
      if (skillId === "literature-explainer") {
        assert.lengthOf(updates, 3);
        for (const [index, kind] of ["choose_one", "confirm"].entries()) {
          const pending = JSON.parse(updates[index].params.update.content.text);
          assert.isFalse(pending.__SKILL_DONE__);
          assert.equal(pending.ui_hints.kind, kind);
          assert.isNotEmpty(pending.ui_hints.options);
        }
      }
      const result = JSON.parse(updates.at(-1).params.update.content.text);
      assert.isTrue(result.__SKILL_DONE__);
      delete result.__SKILL_DONE__;
      const schema = JSON.parse(
        await readFile(
          `skills_builtin/${skillId}/assets/output.schema.json`,
          "utf8",
        ),
      );
      const validate = new Ajv({ strict: false }).compile(schema);
      assert.isTrue(validate(result), JSON.stringify(validate.errors));
      if (skillId === "collection-collector") {
        assert.equal(result.collection, "1:SYNBOUND");
        assert.deepEqual(
          result.selected_items.map(
            (item: { paper_ref: string }) => item.paper_ref,
          ),
          [7, 10, 13, 18, 19].map((index) => refs[index]),
        );
        assert.equal(result.selected_count, result.selected_items.length);
      } else if (skillId === "literature-metadata-search") {
        assert.equal(result.status, "succeeded");
        assert.isNotEmpty(result.metadata.fields);
        assert.isNotEmpty(result.metadata.creators);
      } else if (skillId === "tag-regulator") {
        assert.deepEqual(result.metadata, input.metadata);
        assert.deepEqual(result.input_tags, input.input_tags);
        assert.isNotEmpty(result.suggest_tags);
      } else if (skillId === "literature-analysis") {
        const paths = [
          "digest_path",
          "references_path",
          "citation_analysis_path",
          "literature_score_path",
          "literature_matching_metadata_path",
        ];
        for (const field of paths) {
          assert.equal(path.dirname(result[field]), root);
          assert.isNotEmpty(await readFile(result[field], "utf8"));
        }
        const references = JSON.parse(
          await readFile(result.references_path, "utf8"),
        );
        const citation = JSON.parse(
          await readFile(result.citation_analysis_path, "utf8"),
        );
        const score = JSON.parse(
          await readFile(result.literature_score_path, "utf8"),
        );
        assert.isTrue(validateSourceReferenceArtifact(references).ok);
        assert.isTrue(
          validateCitationAgainstReferences(citation, references).ok,
        );
        assert.isTrue(validateLiteratureScoreArtifact(score).ok);
      } else if (skillId === "literature-explainer") {
        assert.equal(path.dirname(result.note_path), root);
        assert.isNotEmpty(await readFile(result.note_path, "utf8"));
        const sourceHash = createHash("sha256")
          .update(await readFile(input.source_path))
          .digest("hex");
        assert.equal(result.provenance.input_hash, `sha256:${sourceHash}`);
      } else if (skillId === "literature-deep-reading") {
        assert.equal(result.status, "completed");
        assert.isTrue(result.final_html_available);
        const html = await readFile(result.html_path, "utf8");
        assert.include(html, 'lang="zh-CN"');
        assert.include(html, "data:image/png;base64,");
        const manifest = JSON.parse(
          await readFile(result.artifact_manifest_path, "utf8"),
        );
        for (const file of Object.values(manifest))
          assert.isNotEmpty(await readFile(String(file), "utf8"));
      } else if (skillId === "literature-translator") {
        assert.equal(result.status, "success");
        assert.equal(result.provenance.source_path, input.source_path);
        assert.equal(result.provenance.source_language, "en-US");
        assert.equal(result.provenance.target_language, "zh-CN");
        for (const field of [
          "output_path",
          "alignment_path",
          "glossary_path",
          "qa_report_path",
        ]) {
          assert.equal(path.dirname(result[field]), root);
          assert.isNotEmpty(await readFile(result[field], "utf8"));
        }
        assert.include(await readFile(result.output_path, "utf8"), imageRef);
        const alignment = JSON.parse(
          await readFile(result.alignment_path, "utf8"),
        );
        assert.equal(alignment.format, "v1");
        assert.equal(alignment.target_language, "zh-CN");
        assert.include(JSON.stringify(alignment.blocks), imageRef);
        assert.notInclude(JSON.stringify(alignment), "__IMAGE_REF__");
      } else assert.lengthOf(result.add_tags, 2);
    });
  }
});

describe("production workflow topic ACP peer", function () {
  this.timeout(15_000);

  const refs = Array.from(
    { length: 7 },
    (_, index) => `1:SYNTOPIC${String(index + 1).padStart(2, "0")}`,
  );

  const artifactRows = (subset: string[]) =>
    subset.flatMap((paper_ref) =>
      [
        ["digest", "digest-markdown"],
        ["references", "references-json"],
        ["citation_analysis", "citation-analysis-json"],
        ["literature_score", "literature-score-json"],
      ].map(([artifact_type, payload_type]) => ({
        paper_ref,
        artifact_type,
        payload_type,
        status: "available",
        hash: `sha256:${createHash("sha256").update(`${paper_ref}:${artifact_type}`).digest("hex")}`,
      })),
    );

  async function prepareFixture(root: string) {
    const planningContext = {
      schema_id: "synthesis.topic_planning_context",
      library: {
        index_hash: `sha256:${"1".repeat(64)}`,
        papers: refs.map((paper_ref, index) => ({
          paper_ref,
          title: `Synthetic source ${index + 1}`,
        })),
      },
      topics: [],
      topic_graph: {
        manifest: { manifest_hash: `sha256:${"2".repeat(64)}` },
        nodes: [],
        edges: [],
      },
      diagnostics: { truncated: false },
    };
    const stubPath = path.join(root, "topic-reader-stub.json");
    const updateHashes = {
      artifact: `sha256:${"3".repeat(64)}`,
      manifest: `sha256:${"4".repeat(64)}`,
      metadata: `sha256:${"5".repeat(64)}`,
    };
    const topicResolver = { paper_refs: refs, combine: "union" };
    const topicContext = {
      schema_id: "synthesis.topic_context",
      schema_version: "2.0.0",
      topic_id: UPDATE_TOPIC_ID,
      view: "full",
      semantic: {
        topic_id: UPDATE_TOPIC_ID,
        lifecycle: "materialized",
        topic_definition: {
          id: UPDATE_TOPIC_ID,
          title: "合成更新主题",
          definition: "用于离线演练的合成更新主题定义。",
          scope: "仅覆盖合成输入。",
          discipline: "信息检索",
          research_field: "信息检索",
          research_area: "合成主题更新",
          scope_boundary: {
            include: ["合成候选集"],
            exclude: ["真实文献结论"],
            notes: "由完整 topic context 提供。",
          },
          aliases: ["更新主题"],
          scope_include: ["合成候选集"],
          scope_exclude: ["真实文献结论"],
        },
        topic_resolver: topicResolver,
      },
      audit: {
        topic_id: UPDATE_TOPIC_ID,
        language: "en-US",
        current_hashes: updateHashes,
      },
    };
    await writeJsonFile(stubPath, {
      resolverByRefs: {
        [refs.join("|")]: {
          papers: refs.map((paper_ref) => ({
            paper_ref,
            title: `Synthetic source ${paper_ref}`,
          })),
        },
        [refs.slice(0, 5).join("|")]: {
          papers: refs.slice(0, 5).map((paper_ref) => ({
            paper_ref,
            title: `Synthetic source ${paper_ref}`,
          })),
        },
      },
      artifacts: artifactRows(refs),
      planningContext,
      topicContext,
    });
    return {
      planningContext,
      topicContext,
      updateHashes,
      env: {
        ZOTERO_WORKFLOW_FIXTURE_PAPER_REFS: JSON.stringify(refs),
        ZOTERO_WORKFLOW_TOPIC_PUBLIC_READER: stubPath,
      },
    };
  }

  async function validateSkillOutput(skillId: string, raw: unknown) {
    const result = { ...(raw as Record<string, unknown>) };
    assert.isTrue(result.__SKILL_DONE__);
    delete result.__SKILL_DONE__;
    const schema = JSON.parse(
      await readFile(
        `skills_builtin/${skillId}/assets/output.schema.json`,
        "utf8",
      ),
    );
    const validate = new Ajv({ strict: false, allErrors: true }).compile(
      schema,
    );
    assert.isTrue(validate(result), JSON.stringify(validate.errors));
    return result;
  }

  async function runReviewedTopicChain(
    root: string,
    env: Record<string, string>,
    prepareManifest: Record<string, any>,
    name: string,
  ) {
    const prepare = peerResult(
      await runTopicPeer({
        workspace: root,
        name: `${name}.prepare`,
        env,
        manifest: prepareManifest,
      }),
    );
    const prepareOutput = await validateSkillOutput(
      prepareManifest.skill_id,
      prepare,
    );
    assert.equal(
      prepareOutput.operation,
      prepareManifest.skill_id === "update-topic-synthesis-prepare"
        ? "update_full"
        : "create",
    );
    assert.isTrue(prepareOutput.db_path.startsWith(root));
    assert.isTrue(prepareOutput.handoff_manifest_path.startsWith(root));
    assert.isNotEmpty(
      await readFile(prepareOutput.db_path, "utf8").catch(() => ""),
    );
    const handoffManifest = JSON.parse(
      await readFile(prepareOutput.handoff_manifest_path, "utf8"),
    );
    for (const artifactPath of Object.values(handoffManifest)) {
      assert.isTrue(String(artifactPath).startsWith(root));
      assert.isNotEmpty(await readFile(String(artifactPath), "utf8"));
    }
    const db = new DatabaseSync(prepareOutput.db_path);
    const stored = JSON.parse(
      String(
        (
          db
            .prepare(
              "select payload from topic_fixture_state where singleton = 1",
            )
            .get() as { payload: string }
        ).payload,
      ),
    );
    db.close();
    assert.isNotEmpty(stored.topic.id);
    assert.isAbove(stored.source_refs.length, 0);

    const core = peerResult(
      await runTopicPeer({
        workspace: root,
        name: `${name}.core`,
        env,
        manifest: {
          skill_id: "topic-synthesis-core-enrichment",
          input: { handoff: prepareOutput },
          parameter: { language: "zh-CN" },
        },
      }),
    );
    const coreOutput = await validateSkillOutput(
      "topic-synthesis-core-enrichment",
      core,
    );
    assert.equal(coreOutput.db_path, prepareOutput.db_path);
    assert.equal(coreOutput.operation, prepareOutput.operation);
    assert.isTrue(coreOutput.handoff_manifest_path.startsWith(root));
    assert.isNotEmpty(await readFile(coreOutput.handoff_manifest_path, "utf8"));

    const finalizeRaw = peerResult(
      await runTopicPeer({
        workspace: root,
        name: `${name}.finalize`,
        env,
        manifest: {
          skill_id: "topic-synthesis-finalize",
          input: { handoff: coreOutput },
          parameter: { language: "zh-CN" },
        },
      }),
    );
    const candidate = await validateSkillOutput(
      "topic-synthesis-finalize",
      finalizeRaw,
    );
    return { prepareOutput, coreOutput, candidate, stored };
  }

  it("materializes an ad-hoc topic through three reviewed handoffs", async function () {
    const root = await mkdtemp(path.join(os.tmpdir(), "workflow-topic-peer-"));
    const { env } = await prepareFixture(root);
    const { candidate } = await runReviewedTopicChain(
      root,
      env,
      {
        skill_id: "create-topic-synthesis-prepare",
        input: {},
        parameter: {
          usePlannedTopic: false,
          topicSeed: "synthetic offline evaluation",
          language: "zh-CN",
        },
      },
      "create-topic",
    );

    assert.equal(candidate.operation, "create");
    assert.notProperty(candidate, "base_hashes");
    assert.equal(candidate.topic_definition.id, SEED_TOPIC_ID);
    const candidatePath = path.join(
      root,
      "result",
      "final-output.candidate.json",
    );
    assert.deepEqual(
      JSON.parse(await readFile(candidatePath, "utf8")),
      candidate,
    );
    const artifactManifest = JSON.parse(
      await readFile(String(candidate.artifact_manifest_path), "utf8"),
    );
    for (const artifactPath of Object.values(artifactManifest)) {
      assert.isNotEmpty(await readFile(String(artifactPath), "utf8"));
    }
    const analysis = JSON.parse(
      await readFile(String(artifactManifest.topic_analysis), "utf8"),
    );
    assert.equal(analysis.operation, "create");
    const resolver = JSON.parse(
      await readFile(String(artifactManifest.resolver_manifest), "utf8"),
    );
    assert.equal(resolver.operation_intent, "create");
    const analysisCheck = validateTopicAnalysisManifest(analysis);
    assert.isTrue(analysisCheck.ok, JSON.stringify(analysisCheck.errors));
    assert.lengthOf(Object.keys(analysis.sections), 15);
    assert.lengthOf(Object.keys(analysis.sidecars), 4);
    const sections = Object.fromEntries(
      await Promise.all(
        Object.entries(
          analysis.sections as Record<string, { path: string }>,
        ).map(async ([name, entry]) => [
          name,
          JSON.parse(await readFile(path.resolve(root, entry.path), "utf8")),
        ]),
      ),
    );
    const artifact = assembleTopicArtifact({ manifest: analysis, sections });
    const artifactCheck = validateTopicSynthesisArtifact(artifact, {
      expectedLanguage: "zh-CN",
    });
    assert.isTrue(artifactCheck.ok, JSON.stringify(artifactCheck.errors));
    assert.equal(artifact.topic.id, SEED_TOPIC_ID);
    assert.deepEqual(
      artifact.source_papers.map((row: { paper_ref: string }) => row.paper_ref),
      refs,
    );
    assert.equal(artifact.statistics.paper_count, refs.length);
    assert.lengthOf(artifact.source_artifacts, refs.length * 4);
    for (const row of artifact.source_artifacts) {
      assert.include(
        artifactRows([row.paper_ref]).map((entry) => entry.hash),
        row.hash,
      );
    }
    for (const field of [
      "claims",
      "taxonomy",
      "timeline_events",
      "improvement_dimensions",
      "future_directions",
      "review_outline",
    ]) {
      assert.include(JSON.stringify(artifact[field]), refs[0]);
      assert.include(JSON.stringify(artifact[field]), refs.at(-1));
    }
  });

  it("keeps the reviewed planned topic identity and resolver", async function () {
    const root = await mkdtemp(
      path.join(os.tmpdir(), "workflow-topic-planned-"),
    );
    const { env } = await prepareFixture(root);
    const snapshot = {
      topic_id: PLANNED_TOPIC_ID,
      lifecycle: "planned",
      topic_definition: {
        id: PLANNED_TOPIC_ID,
        title: "合成规划主题",
        definition: "用于离线演练的合成规划主题定义。",
        aliases: ["规划主题"],
        scope_include: ["合成候选集"],
        scope_exclude: ["真实文献结论"],
      },
      topic_resolver: { paper_refs: refs.slice(0, 5), combine: "union" },
      planning: { lifecycle: "planned", revision: 1 },
    };
    const { candidate } = await runReviewedTopicChain(
      root,
      env,
      {
        skill_id: "create-topic-synthesis-prepare",
        input: { planned_topic: snapshot },
        parameter: {
          usePlannedTopic: true,
          topicSeed: "synthetic offline evaluation",
          language: "zh-CN",
        },
      },
      "planned-topic",
    );
    assert.equal(candidate.topic_definition.id, PLANNED_TOPIC_ID);
    assert.equal(candidate.topic_definition.title, "合成规划主题");
    assert.equal(
      candidate.topic_definition.definition,
      "用于离线演练的合成规划主题定义。",
    );
    const artifactManifest = JSON.parse(
      await readFile(String(candidate.artifact_manifest_path), "utf8"),
    );
    const resolver = JSON.parse(
      await readFile(String(artifactManifest.resolver_manifest), "utf8"),
    );
    assert.deepEqual(resolver.resolver, snapshot.topic_resolver);
    assert.deepEqual(resolver.paper_refs, refs.slice(0, 5));
    const analysis = JSON.parse(
      await readFile(String(artifactManifest.topic_analysis), "utf8"),
    );
    const sections = Object.fromEntries(
      await Promise.all(
        Object.entries(
          analysis.sections as Record<string, { path: string }>,
        ).map(async ([name, entry]) => [
          name,
          JSON.parse(await readFile(path.resolve(root, entry.path), "utf8")),
        ]),
      ),
    );
    const artifact = assembleTopicArtifact({ manifest: analysis, sections });
    assert.equal(artifact.topic.id, PLANNED_TOPIC_ID);
    assert.lengthOf(artifact.source_papers, 5);
    assert.equal(artifact.statistics.paper_count, 5);
    const check = validateTopicSynthesisArtifact(artifact, {
      expectedLanguage: "zh-CN",
    });
    assert.isTrue(check.ok, JSON.stringify(check.errors));
  });

  it("updates an existing topic from its full public context", async function () {
    const root = await mkdtemp(
      path.join(os.tmpdir(), "workflow-topic-update-"),
    );
    const { env, topicContext, updateHashes } = await prepareFixture(root);
    const { prepareOutput, coreOutput, candidate, stored } =
      await runReviewedTopicChain(
        root,
        env,
        {
          skill_id: "update-topic-synthesis-prepare",
          input: {},
          parameter: { topicId: UPDATE_TOPIC_ID },
        },
        "update-topic",
      );

    assert.equal(stored.operation, "update_full");
    assert.equal(stored.language, topicContext.audit.language);
    assert.deepEqual(stored.topic, topicContext.semantic.topic_definition);
    assert.deepEqual(stored.resolver, topicContext.semantic.topic_resolver);
    assert.deepEqual(stored.base_hashes, updateHashes);
    assert.equal(prepareOutput.operation, "update_full");
    assert.equal(coreOutput.operation, "update_full");
    assert.equal(candidate.operation, "update_full");
    assert.equal(candidate.topic_definition.id, UPDATE_TOPIC_ID);
    assert.deepEqual(candidate.topic_definition, stored.topic);
    assert.deepEqual(candidate.base_hashes, updateHashes);

    for (const [skillId, handoff] of [
      ["topic-synthesis-core-enrichment", prepareOutput],
      ["topic-synthesis-finalize", coreOutput],
    ] as const) {
      const mismatch = await runTopicPeer({
        workspace: root,
        name: `${skillId}.operation-mismatch`,
        env,
        manifest: {
          skill_id: skillId,
          input: { handoff: { ...handoff, operation: "create" } },
          parameter: { language: "zh-CN" },
        },
      });
      assert.include(
        peerError(mismatch),
        "workflow_fixture_handoff_state_operation_mismatch",
      );
    }

    const artifactManifest = JSON.parse(
      await readFile(String(candidate.artifact_manifest_path), "utf8"),
    );
    for (const artifactPath of Object.values(artifactManifest)) {
      assert.isNotEmpty(await readFile(String(artifactPath), "utf8"));
    }
    const resolver = JSON.parse(
      await readFile(String(artifactManifest.resolver_manifest), "utf8"),
    );
    assert.equal(resolver.operation_intent, "update_full");
    assert.deepEqual(resolver.resolver, stored.resolver);
    assert.deepEqual(resolver.paper_refs, refs);
    const analysis = JSON.parse(
      await readFile(String(artifactManifest.topic_analysis), "utf8"),
    );
    assert.equal(analysis.operation, "update_full");
    assert.equal(analysis.topic_id, UPDATE_TOPIC_ID);
    const analysisCheck = validateTopicAnalysisManifest(analysis);
    assert.isTrue(analysisCheck.ok, JSON.stringify(analysisCheck.errors));
    const sections = Object.fromEntries(
      await Promise.all(
        Object.entries(
          analysis.sections as Record<string, { path: string }>,
        ).map(async ([name, entry]) => [
          name,
          JSON.parse(await readFile(path.resolve(root, entry.path), "utf8")),
        ]),
      ),
    );
    const artifact = assembleTopicArtifact({ manifest: analysis, sections });
    const artifactCheck = validateTopicSynthesisArtifact(artifact, {
      expectedLanguage: topicContext.audit.language,
    });
    assert.isTrue(artifactCheck.ok, JSON.stringify(artifactCheck.errors));
    assert.equal(artifact.topic.id, UPDATE_TOPIC_ID);
    assert.equal(artifact.statistics.paper_count, refs.length);
  });

  it("plans one topic from the public planning context", async function () {
    const root = await mkdtemp(
      path.join(os.tmpdir(), "workflow-topic-planner-"),
    );
    const { env, planningContext } = await prepareFixture(root);
    const plan = await validateSkillOutput(
      "topic-planner",
      peerResult(
        await runTopicPeer({
          workspace: root,
          name: "topic-planner.1",
          env,
          manifest: {
            skill_id: "topic-planner",
            input: {},
            parameter: { language: "zh-CN" },
          },
        }),
      ),
    );
    assert.equal(
      plan.base_graph_hash,
      planningContext.topic_graph.manifest.manifest_hash,
    );
    assert.equal(plan.library_index_hash, planningContext.library.index_hash);
    assert.lengthOf(plan.topic_actions, 1);
    assert.lengthOf(plan.relation_proposals, 0);
    assert.deepEqual(plan.topic_actions[0], {
      action: "create",
      topic_id: PLANNED_TOPIC_ID,
      title: "合成规划主题",
      definition: "用于离线演练的合成规划主题定义。",
      aliases: ["规划主题"],
      scope: {
        include: ["合成候选集", "合成引用关系"],
        exclude: ["真实文献结论", "线上系统指标"],
      },
      resolver: { paper_refs: refs.slice(0, 5), combine: "union" },
      revision: 1,
    });
  });

  it("rejects unreviewed topic skills and operations", async function () {
    const root = await mkdtemp(
      path.join(os.tmpdir(), "workflow-topic-reject-"),
    );
    const { env } = await prepareFixture(root);
    const unreviewed = await runTopicPeer({
      workspace: root,
      name: "update-topic-synthesis-patch.1",
      env,
      manifest: {
        skill_id: "update-topic-synthesis-patch",
        input: {},
        parameter: {},
      },
    });
    assert.include(peerError(unreviewed), "workflow_fixture_skill_unreviewed");
    const badOperation = await runTopicPeer({
      workspace: root,
      name: "create-topic-synthesis-prepare.2",
      env,
      manifest: {
        skill_id: "create-topic-synthesis-prepare",
        input: { operation: "update_patch" },
        parameter: { language: "zh-CN" },
      },
    });
    assert.include(
      peerError(badOperation),
      "workflow_fixture_operation_unreviewed",
    );
  });
});
