import { assert } from "chai";
import { execFileSync } from "child_process";
import fs from "fs/promises";
import fsSync from "fs";
import os from "os";
import path from "path";
import { scanPluginSkillRegistry } from "../../src/modules/pluginSkillRegistry";
import { renderLiteratureDeepReadingSkill } from "../../skills_src/literature-deep-reading/renderer/render_literature_deep_reading_skill";

const suiteRoot = path.join("skills_src", "literature-deep-reading");
const skillRoot = path.join("skills_builtin", "literature-deep-reading");

async function assertFileExists(filePath: string) {
  await fs.access(filePath);
}

async function collectFileMap(root: string): Promise<Record<string, string>> {
  const result: Record<string, string> = {};
  async function visit(current: string) {
    const entries = await fs.readdir(current, { withFileTypes: true });
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        await visit(fullPath);
      } else if (entry.isFile()) {
        const relativePath = path
          .relative(root, fullPath)
          .split(path.sep)
          .join("/");
        result[relativePath] = await fs.readFile(fullPath, "utf8");
      }
    }
  }
  await visit(root);
  return result;
}

function pythonCommand(args: string[], cwd: string) {
  const arProject = path.join(os.homedir(), ".ar");
  const arPyproject = path.join(arProject, "pyproject.toml");
  if (fsSync.existsSync(arPyproject)) {
    return execFileSync(
      "uv",
      ["run", `--project=${arProject}`, "--locked", "--", "python", ...args],
      { cwd, encoding: "utf8", stdio: "pipe" },
    );
  }
  return execFileSync(process.env.PYTHON || "python", args, {
    cwd,
    encoding: "utf8",
    stdio: "pipe",
  });
}

async function makeSourceBundle(
  tempRoot: string,
  options?: { includeDigest?: boolean },
) {
  const bundleSource = path.join(tempRoot, "bundle-source");
  await fs.mkdir(path.join(bundleSource, "images"), { recursive: true });
  await fs.mkdir(path.join(bundleSource, "artifacts"), { recursive: true });
  await fs.writeFile(
    path.join(bundleSource, "source.md"),
    [
      "# Sample Paper",
      "",
      "This paper introduces a small test method.",
      "",
      "# 1 Introduction",
      "",
      "We show the main idea with one figure.",
      "",
      "![](images/figure-1.png)",
      "",
      "$$",
      "a = b + c",
      "$$",
      "",
      "<table><tr><td>Metric</td><td>Value</td></tr><tr><td>AP</td><td>42</td></tr></table>",
      "",
      "# References",
      "",
      "1. Example Author. Example reference title. 2020.",
      "2. Another Author. Another reference title. 2021.",
      "",
    ].join("\n"),
    "utf8",
  );
  await fs.writeFile(path.join(bundleSource, "images", "figure-1.png"), "png");
  await fs.writeFile(
    path.join(bundleSource, "source-manifest.json"),
    JSON.stringify(
      {
        paper: {
          item_key: "EIMSDEU3",
          title: "Sample Paper",
        },
        source_kind: "mineru_markdown",
        images: [
          {
            original_src: "images/figure-1.png",
            bundle_path: "images/figure-1.png",
            status: "available",
          },
        ],
      },
      null,
      2,
    ),
    "utf8",
  );
  await fs.writeFile(
    path.join(bundleSource, "artifacts", "references.json"),
    JSON.stringify(
      {
        references: [
          {
            id: "ref-1",
            title: "Example reference title",
            year: "2020",
            bound_paper_ref: "1:A",
            zotero_item_key: "A",
          },
          {
            id: "ref-2",
            title: "External reference title",
            year: "2021",
          },
          {
            id: "ref-3",
            title: "Reference index bound title",
            year: "2022",
          },
        ],
      },
      null,
      2,
    ),
    "utf8",
  );
  if (options?.includeDigest !== false) {
    await fs.writeFile(
      path.join(bundleSource, "artifacts", "digest.md"),
      [
        "# TL;DR",
        "",
        "Digest artifact summary.",
        "",
        "# Contributions",
        "",
        "A concise contribution list.",
      ].join("\n"),
      "utf8",
    );
  }
  await fs.writeFile(
    path.join(bundleSource, "artifacts", "artifact-manifest.json"),
    JSON.stringify(
      {
        artifacts: [
          {
            artifact_type: "references",
            payload_type: "references-json",
            bundle_path: "artifacts/references.json",
            status: "available",
          },
          ...(options?.includeDigest === false
            ? []
            : [
                {
                  artifact_type: "digest",
                  payload_type: "digest-markdown",
                  bundle_path: "artifacts/digest.md",
                  status: "available",
                },
              ]),
        ],
      },
      null,
      2,
    ),
    "utf8",
  );
  const zipPath = path.join(tempRoot, "source_bundle.zip");
  const scriptPath = path.join(tempRoot, "make_bundle.py");
  await fs.writeFile(
    scriptPath,
    [
      "from pathlib import Path",
      "import sys, zipfile",
      "root = Path(sys.argv[1])",
      "out = Path(sys.argv[2])",
      "with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as zf:",
      "    for path in sorted(root.rglob('*')):",
      "        if path.is_file():",
      "            zf.write(path, path.relative_to(root).as_posix())",
      "",
    ].join("\n"),
    "utf8",
  );
  pythonCommand([scriptPath, bundleSource, zipPath], tempRoot);
  return zipPath;
}

function runRuntime(args: string[], cwd: string) {
  const scriptPath = path.resolve(
    "skills_builtin",
    "literature-deep-reading",
    "scripts",
    "deep_reading_runtime.py",
  );
  return JSON.parse(pythonCommand([scriptPath, ...args], cwd));
}

function runRuntimeAllowFailure(args: string[], cwd: string) {
  const scriptPath = path.resolve(
    "skills_builtin",
    "literature-deep-reading",
    "scripts",
    "deep_reading_runtime.py",
  );
  try {
    return {
      exitCode: 0,
      output: JSON.parse(pythonCommand([scriptPath, ...args], cwd)),
    };
  } catch (error) {
    const execError = error as { status?: number; stdout?: Buffer | string };
    return {
      exitCode: execError.status || 1,
      output: JSON.parse(execError.stdout?.toString() || "{}"),
    };
  }
}

async function writeContextRequest(
  runRoot: string,
  payload?: Record<string, unknown>,
) {
  await fs.mkdir(path.join(runRoot, "runtime", "payloads"), {
    recursive: true,
  });
  await fs.writeFile(
    path.join(runRoot, "runtime", "payloads", "context-request.json"),
    JSON.stringify(
      payload || {
        main_task: "object detection",
        method_family: "transformer-based direct set prediction",
        external_context_section_anchors: ["sec-1-introduction"],
        request_topic_context: false,
        topic_context_reason: "",
        request_concept_context: true,
        concept_labels: ["DETR", "object queries"],
        request_citation_graph: true,
        citation_graph_depth: 2,
        citation_graph_direction: "both",
        citation_graph_max_nodes: 80,
        citation_graph_max_edges: 160,
        citation_graph_include_low_signal: false,
        reference_digest_policy: "all_library_references",
        priority_reference_indices: [],
      },
      null,
      2,
    ),
    "utf8",
  );
}

async function writeReadingEnrichment(
  runRoot: string,
  payload?: Record<string, unknown>,
) {
  await fs.mkdir(path.join(runRoot, "runtime", "payloads"), {
    recursive: true,
  });
  await fs.writeFile(
    path.join(runRoot, "runtime", "payloads", "reading-enrichment.json"),
    JSON.stringify(
      payload || {
        preface_title: "阅读前导读",
        preface_cards: [
          {
            title: "研究问题",
            body: "样例论文用于验证文献精读的数据层。",
          },
        ],
        preface_reading_path: ["问题设定", "方法结构", "实验结论"],
        preface_goal: "先建立阅读问题，再进入正文。",
        preface_concepts: ["DETR", "object queries"],
        preface_warnings: ["不要把 object queries 理解成传统 anchor。"],
        preface_questions: [
          {
            question: "这篇文章为什么重要？",
            answer: "它验证了端到端集合预测式目标检测的可行性。",
          },
        ],
        section_notes: [
          {
            section_anchor: "sec-1-introduction",
            reading_goal: "理解论文重新表述目标检测任务的动机。",
            concepts: ["DETR", "object queries", "unresolved keyword"],
            misread_warnings: ["这里的端到端仍依赖明确的训练目标。"],
            questions: [
              {
                question: "作者为什么强调后处理？",
                answer: "因为传统检测管线常依赖候选框去重。",
              },
            ],
            citation_note_body: "本节引用用于铺垫传统检测流程。",
            citation_reference_roles: [
              {
                reference_id: "ref-1",
                role: "background",
              },
            ],
          },
        ],
        concepts: [
          {
            label: "DETR",
            aliases: ["DEtection TRansformer"],
            kind: "method",
            definition: "一种把目标检测建模为集合预测的 Transformer 方法。",
          },
          {
            label: "object queries",
            aliases: ["object query"],
            kind: "method component",
            definition: "解码器中用于预测一组目标的可学习查询。",
          },
        ],
        reference_digest_notes: [
          {
            reference_id: "ref-1",
            role_in_current_paper: "背景方法",
            why_open: "帮助理解本文对传统检测流程的比较对象。",
          },
          {
            reference_id: "ref-2",
            role_in_current_paper: "外部参考",
            why_open: "没有库内 digest 时只保留说明。",
          },
        ],
        summary_fallback_enabled: true,
        summary_fallback_sections: [
          {
            title: "Fallback",
            body: "Fallback summary.",
          },
        ],
        extensions: [
          {
            title: "读后延伸",
            body: "继续比较后续改进方法。",
          },
        ],
      },
      null,
      2,
    ),
    "utf8",
  );
}

async function writeBlockTranslations(
  runRoot: string,
  payload?: Record<string, unknown>,
) {
  await fs.mkdir(path.join(runRoot, "runtime", "payloads"), {
    recursive: true,
  });
  const blocks = JSON.parse(
    await fs.readFile(
      path.join(runRoot, "runtime", "views", "reading-blocks.json"),
      "utf8",
    ),
  ).blocks as Array<Record<string, unknown>>;
  const translations = payload || {
    translations: blocks
      .filter(
        (block) =>
          block.translate === true &&
          block.kind !== "formula" &&
          block.kind !== "unknown",
      )
      .map((block) => {
        const kind = String(block.kind || "");
        const source = String(block.source_markdown || "");
        let translated = `译文：${source}`;
        if (kind === "heading") {
          translated = source
            .replace("Sample Paper", "样例论文")
            .replace("Introduction", "引言");
        } else if (kind === "table") {
          translated =
            "<table><tr><td>指标</td><td>数值</td></tr><tr><td>AP</td><td>42</td></tr></table>";
        } else if (kind === "image") {
          translated = source;
        }
        return {
          block_id: block.block_id,
          translated_markdown: translated,
          quality_notes: [],
        };
      }),
  };
  await fs.writeFile(
    path.join(runRoot, "runtime", "payloads", "block-translations.json"),
    JSON.stringify(translations, null, 2),
    "utf8",
  );
}

async function installFakeBridge(
  runRoot: string,
  options?: { layoutStatus?: string },
) {
  const binDir = path.join(runRoot, ".zotero-bridge", "bin");
  await fs.mkdir(binDir, { recursive: true });
  await fs.writeFile(
    path.join(binDir, "fake-zotero-bridge.js"),
    `
const fs = require("fs");
const path = require("path");
const args = process.argv.slice(2);
const inputFlag = args.indexOf("--input");
const inputArg = inputFlag >= 0 ? args[inputFlag + 1] : "{}";
let input = {};
if (inputArg.startsWith("@")) {
  input = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), inputArg.slice(1)), "utf8"));
} else {
  input = JSON.parse(inputArg);
}
const command = args.slice(0, inputFlag >= 0 ? inputFlag : args.length).join(" ");
fs.appendFileSync(path.resolve(process.cwd(), "bridge-calls.jsonl"), JSON.stringify({ command, input }) + "\\n", "utf8");
function reply(result) {
  console.log(JSON.stringify({ ok: true, data: { result } }));
}
if (command === "reference-index get") {
  reply({ references: [{ index: 3, title: "Reference index bound title", paperRef: "1:B", zoteroItemKey: "B" }] });
} else if (command === "paper-artifacts manifest") {
  reply({ artifacts: input.paper_refs.map((paperRef) => ({ paperRef, kind: "digest" })), diagnostics: [], total: input.paper_refs.length });
} else if (command === "paper-artifacts export-filtered") {
  const targetDir = "runtime/payloads/artifacts";
  for (const paperRef of input.paper_refs) {
    const safe = paperRef.replace(/[^A-Za-z0-9_.-]+/g, "_");
    const dir = path.resolve(process.cwd(), targetDir, safe);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "digest.md"), "# Digest for " + paperRef + "\\n", "utf8");
  }
  reply({ exported: input.paper_refs.length, targetDir, diagnostics: [] });
} else if (command === "citation-graph get-slice") {
  reply({
    nodes: [
      { node_id: "zotero:item:EIMSDEU3", title: "Sample Paper", kind: "target", paperRef: "1:EIMSDEU3" },
      { node_id: "zotero:item:A", title: "Library Paper A", kind: "library", paperRef: "1:A" }
    ],
    edges: [{ edge_id: "edge-1", source: "zotero:item:EIMSDEU3", target: "zotero:item:A", kind: "cites" }],
    diagnostics: [],
    truncated: false
  });
} else if (command === "citation-graph get-layout") {
  const status = ${JSON.stringify(options?.layoutStatus || "ready")};
  if (status === "ready") {
    reply({
      ok: true,
      status: "ready",
      scope: "slice",
      graph_hash: "graph-hash",
      layout_hash: "layout-hash",
      layout_status: "ready",
      preset: "force",
      view_key: "workbench_overview",
      nodes: [
        { node_id: "zotero:item:EIMSDEU3", x: 10, y: 20, title: "Sample Paper" },
        { node_id: "zotero:item:A", x: 30, y: 40, title: "Library Paper A" }
      ],
      edges: [{ edge_id: "edge-1", source: "zotero:item:EIMSDEU3", target: "zotero:item:A" }],
      diagnostics: { node_count: 2, edge_count: 1, truncated: false }
    });
  } else {
    reply({
      ok: false,
      status,
      scope: "slice",
      graph_hash: "graph-hash",
      layout_hash: "",
      layout_status: status,
      preset: "force",
      view_key: "workbench_overview",
      nodes: [],
      edges: [],
      diagnostics: { warnings: ["layout status is " + status] }
    });
  }
} else if (command === "concepts query") {
  reply({ concepts: input.labels.map((label) => ({ label, definition: label + " definition" })) });
} else {
  reply({});
}
`,
    "utf8",
  );
  if (process.platform === "win32") {
    await fs.writeFile(
      path.join(binDir, "zotero-bridge.cmd"),
      '@echo off\r\nnode "%~dp0fake-zotero-bridge.js" %*\r\n',
      "utf8",
    );
  } else {
    const shim = path.join(binDir, "zotero-bridge");
    await fs.writeFile(
      shim,
      '#!/usr/bin/env sh\nnode "$(dirname "$0")/fake-zotero-bridge.js" "$@"\n',
      "utf8",
    );
    await fs.chmod(shim, 0o755);
  }
}

describe("Literature deep reading bootstrap skill", function () {
  it("keeps the source and generated package structure complete", async function () {
    const requiredSourceFiles = [
      "templates/SKILL.md",
      "assets/runner.json",
      "assets/input.schema.json",
      "assets/parameter.schema.json",
      "assets/output.schema.json",
      "assets/schemas/context-request.schema.json",
      "assets/schemas/reading-enrichment.schema.json",
      "assets/schemas/block-translations.schema.json",
      "runtime/deep_reading_runtime.py",
      "renderer/render_literature_deep_reading_skill.ts",
    ];
    for (const filePath of requiredSourceFiles) {
      await assertFileExists(path.join(suiteRoot, filePath));
    }

    const requiredGeneratedFiles = [
      "SKILL.md",
      "assets/runner.json",
      "assets/input.schema.json",
      "assets/parameter.schema.json",
      "assets/output.schema.json",
      "assets/schemas/context-request.schema.json",
      "assets/schemas/reading-enrichment.schema.json",
      "assets/schemas/block-translations.schema.json",
      "scripts/deep_reading_runtime.py",
    ];
    for (const filePath of requiredGeneratedFiles) {
      await assertFileExists(path.join(skillRoot, filePath));
    }
  });

  it("renders deterministic self-contained packages", async function () {
    const rootA = await fs.mkdtemp(
      path.join(os.tmpdir(), "deep-reading-render-a-"),
    );
    const rootB = await fs.mkdtemp(
      path.join(os.tmpdir(), "deep-reading-render-b-"),
    );
    const skillA = await renderLiteratureDeepReadingSkill({ outRoot: rootA });
    const skillB = await renderLiteratureDeepReadingSkill({ outRoot: rootB });

    assert.deepEqual(
      await collectFileMap(skillA),
      await collectFileMap(skillB),
    );
    const generated = await collectFileMap(skillA);
    assert.notInclude(
      generated["scripts/deep_reading_runtime.py"],
      "skills_src",
    );
    assert.notProperty(generated, "scripts/gate.py");
    assert.notProperty(generated, "scripts/stage_runtime.py");
  });

  it("discovers the generated built-in skill through the plugin registry", async function () {
    const registry = await scanPluginSkillRegistry({ cwd: process.cwd() });
    const entry = registry.entriesById["literature-deep-reading"];

    assert.isOk(entry);
    assert.equal(entry.sourceKind, "builtin");
    assert.include(
      entry.sourceDir.replace(/\\/g, "/"),
      "skills_builtin/literature-deep-reading",
    );
    assert.include(entry.description, "literature deep-reading");
  });

  it("bootstraps a source bundle into SQLite and runtime views", async function () {
    const tempRoot = await fs.mkdtemp(
      path.join(os.tmpdir(), "deep-reading-bootstrap-"),
    );
    const bundlePath = await makeSourceBundle(tempRoot);
    const runRoot = path.join(tempRoot, "run");
    await fs.mkdir(path.join(runRoot, "runtime"), { recursive: true });
    await fs.writeFile(
      path.join(runRoot, "runtime", "input.json"),
      JSON.stringify(
        {
          source_bundle_path: bundlePath,
          parameter: {
            target_language: "zh-CN",
          },
        },
        null,
        2,
      ),
      "utf8",
    );

    const bootstrap = runRuntime(
      ["bootstrap", "--input", "runtime/input.json"],
      runRoot,
    );
    assert.equal(bootstrap.kind, "literature_deep_reading_bootstrap");
    assert.equal(bootstrap.status, "bootstrapped");
    assert.equal(bootstrap.final_html_available, false);

    const status = runRuntime(["status"], runRoot);
    assert.equal(status.ok, true);

    const validation = runRuntime(["validate-bootstrap"], runRoot);
    assert.deepEqual(validation, { ok: true, errors: [] });

    const structure = JSON.parse(
      await fs.readFile(
        path.join(runRoot, "runtime", "views", "source-structure.json"),
        "utf8",
      ),
    );
    assert.equal(structure.references_anchor, "sec-references");

    const blocks = JSON.parse(
      await fs.readFile(
        path.join(runRoot, "runtime", "views", "reading-blocks.json"),
        "utf8",
      ),
    );
    assert.isAtLeast(blocks.blocks.length, 6);
    assert.deepEqual(
      blocks.blocks.map((block: Record<string, unknown>) => block.block_id),
      blocks.blocks.map(
        (_: unknown, index: number) =>
          `block-${String(index + 1).padStart(4, "0")}`,
      ),
    );
    assert.isTrue(
      blocks.blocks.some(
        (block: Record<string, unknown>) => block.kind === "table",
      ),
    );
    assert.isTrue(
      blocks.blocks.some(
        (block: Record<string, unknown>) => block.kind === "formula",
      ),
    );

    const imageManifest = JSON.parse(
      await fs.readFile(
        path.join(runRoot, "runtime", "views", "image-manifest.json"),
        "utf8",
      ),
    );
    assert.equal(imageManifest.available_count, 1);

    const referencesSeed = JSON.parse(
      await fs.readFile(
        path.join(runRoot, "runtime", "views", "references-seed-view.json"),
        "utf8",
      ),
    );
    assert.equal(referencesSeed.source, "artifact");
    assert.equal(referencesSeed.reference_count, 3);
  });

  it("submits context requests and collects Host Bridge graph layout and reference digests", async function () {
    const tempRoot = await fs.mkdtemp(
      path.join(os.tmpdir(), "deep-reading-context-"),
    );
    const bundlePath = await makeSourceBundle(tempRoot);
    const runRoot = path.join(tempRoot, "run");
    await fs.mkdir(path.join(runRoot, "runtime"), { recursive: true });
    await fs.writeFile(
      path.join(runRoot, "runtime", "input.json"),
      JSON.stringify({ source_bundle_path: bundlePath }, null, 2),
      "utf8",
    );
    await installFakeBridge(runRoot);
    runRuntime(["bootstrap", "--input", "runtime/input.json"], runRoot);
    await writeContextRequest(runRoot);

    const result = runRuntime(
      [
        "submit-context-request",
        "--payload",
        "runtime/payloads/context-request.json",
      ],
      runRoot,
    );
    assert.equal(result.kind, "literature_deep_reading_context_ready");
    assert.equal(result.status, "context_ready");
    assert.equal(result.final_html_available, false);

    const validation = runRuntime(["validate-context-request"], runRoot);
    assert.deepEqual(validation, { ok: true, errors: [] });

    const calls = (
      await fs.readFile(path.join(runRoot, "bridge-calls.jsonl"), "utf8")
    )
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line));
    assert.deepEqual(
      calls.map((entry) => entry.command),
      [
        "reference-index get",
        "paper-artifacts manifest",
        "paper-artifacts export-filtered",
        "citation-graph get-slice",
        "citation-graph get-layout",
        "concepts query",
      ],
    );
    const layoutCall = calls.find(
      (entry) => entry.command === "citation-graph get-layout",
    );
    assert.equal(layoutCall.input.preset, "force");
    assert.equal(layoutCall.input.allowTruncated, true);

    const layout = JSON.parse(
      await fs.readFile(
        path.join(runRoot, "runtime", "views", "citation-graph-layout.json"),
        "utf8",
      ),
    );
    assert.equal(layout.status, "ready");
    assert.equal(
      layout.nodes.find(
        (node: Record<string, unknown>) =>
          node.node_id === "zotero:item:EIMSDEU3",
      )?.x,
      10,
    );

    const digests = JSON.parse(
      await fs.readFile(
        path.join(runRoot, "runtime", "views", "reference-digests-view.json"),
        "utf8",
      ),
    );
    assert.sameMembers(
      digests.items.map((item: Record<string, unknown>) => item.reference_id),
      ["ref-1", "ref-3"],
    );
  });

  it("submits reading enrichment and writes Analysis Layer views", async function () {
    const tempRoot = await fs.mkdtemp(
      path.join(os.tmpdir(), "deep-reading-enrichment-"),
    );
    const bundlePath = await makeSourceBundle(tempRoot);
    const runRoot = path.join(tempRoot, "run");
    await fs.mkdir(path.join(runRoot, "runtime"), { recursive: true });
    await fs.writeFile(
      path.join(runRoot, "runtime", "input.json"),
      JSON.stringify({ source_bundle_path: bundlePath }, null, 2),
      "utf8",
    );
    await installFakeBridge(runRoot);
    runRuntime(["bootstrap", "--input", "runtime/input.json"], runRoot);
    await writeContextRequest(runRoot);
    runRuntime(
      [
        "submit-context-request",
        "--payload",
        "runtime/payloads/context-request.json",
      ],
      runRoot,
    );
    await writeReadingEnrichment(runRoot);

    const result = runRuntime(
      [
        "submit-reading-enrichment",
        "--payload",
        "runtime/payloads/reading-enrichment.json",
      ],
      runRoot,
    );
    assert.equal(result.kind, "literature_deep_reading_enriched");
    assert.equal(result.status, "enriched");
    assert.equal(result.final_html_available, false);

    const validation = runRuntime(["validate-reading-enrichment"], runRoot);
    assert.deepEqual(validation, { ok: true, errors: [] });

    const summary = JSON.parse(
      await fs.readFile(
        path.join(runRoot, "runtime", "views", "summary-view.json"),
        "utf8",
      ),
    );
    assert.equal(summary.source, "digest_artifact");
    assert.equal(summary.sections[0].title, "TL;DR");

    const references = JSON.parse(
      await fs.readFile(
        path.join(runRoot, "runtime", "views", "references-view.json"),
        "utf8",
      ),
    );
    const ref1 = references.items.find(
      (item: Record<string, unknown>) => item.reference_id === "ref-1",
    );
    const ref2 = references.items.find(
      (item: Record<string, unknown>) => item.reference_id === "ref-2",
    );
    assert.equal(ref1.digest_modal.available, true);
    assert.equal(ref2.digest_modal.available, false);

    const concepts = JSON.parse(
      await fs.readFile(
        path.join(runRoot, "runtime", "views", "concept-overlay-view.json"),
        "utf8",
      ),
    );
    const detr = concepts.concepts.find(
      (item: Record<string, unknown>) => item.label === "DETR",
    );
    const unresolved = concepts.concepts.find(
      (item: Record<string, unknown>) => item.label === "unresolved keyword",
    );
    assert.equal(detr.status, "available");
    assert.equal(unresolved.status, "keyword_only");

    const insights = JSON.parse(
      await fs.readFile(
        path.join(runRoot, "runtime", "views", "section-insights-view.json"),
        "utf8",
      ),
    );
    assert.lengthOf(insights.by_anchor["sec-1-introduction"].questions, 1);
    assert.equal(
      insights.by_anchor["sec-1-introduction"].citation_note.reference_roles[0]
        .reference_id,
      "ref-1",
    );
  });

  it("uses agent fallback summary only when target digest is missing", async function () {
    const tempRoot = await fs.mkdtemp(
      path.join(os.tmpdir(), "deep-reading-enrichment-fallback-"),
    );
    const bundlePath = await makeSourceBundle(tempRoot, {
      includeDigest: false,
    });
    const runRoot = path.join(tempRoot, "run");
    await fs.mkdir(path.join(runRoot, "runtime"), { recursive: true });
    await fs.writeFile(
      path.join(runRoot, "runtime", "input.json"),
      JSON.stringify({ source_bundle_path: bundlePath }, null, 2),
      "utf8",
    );
    await installFakeBridge(runRoot);
    runRuntime(["bootstrap", "--input", "runtime/input.json"], runRoot);
    await writeContextRequest(runRoot);
    runRuntime(
      [
        "submit-context-request",
        "--payload",
        "runtime/payloads/context-request.json",
      ],
      runRoot,
    );
    await writeReadingEnrichment(runRoot);
    runRuntime(
      [
        "submit-reading-enrichment",
        "--payload",
        "runtime/payloads/reading-enrichment.json",
      ],
      runRoot,
    );

    const summary = JSON.parse(
      await fs.readFile(
        path.join(runRoot, "runtime", "views", "summary-view.json"),
        "utf8",
      ),
    );
    assert.equal(summary.source, "agent_fallback");
    assert.equal(summary.sections[0].title, "Fallback");
  });

  it("submits block translations and writes ordered Translation Layer views", async function () {
    const tempRoot = await fs.mkdtemp(
      path.join(os.tmpdir(), "deep-reading-translation-"),
    );
    const bundlePath = await makeSourceBundle(tempRoot);
    const runRoot = path.join(tempRoot, "run");
    await fs.mkdir(path.join(runRoot, "runtime"), { recursive: true });
    await fs.writeFile(
      path.join(runRoot, "runtime", "input.json"),
      JSON.stringify(
        {
          source_bundle_path: bundlePath,
          parameter: { target_language: "zh-CN" },
        },
        null,
        2,
      ),
      "utf8",
    );
    await installFakeBridge(runRoot);
    runRuntime(["bootstrap", "--input", "runtime/input.json"], runRoot);
    await writeContextRequest(runRoot);
    runRuntime(
      [
        "submit-context-request",
        "--payload",
        "runtime/payloads/context-request.json",
      ],
      runRoot,
    );
    await writeReadingEnrichment(runRoot);
    runRuntime(
      [
        "submit-reading-enrichment",
        "--payload",
        "runtime/payloads/reading-enrichment.json",
      ],
      runRoot,
    );
    await writeBlockTranslations(runRoot);

    const result = runRuntime(
      [
        "submit-block-translations",
        "--payload",
        "runtime/payloads/block-translations.json",
      ],
      runRoot,
    );
    assert.equal(result.kind, "literature_deep_reading_translated");
    assert.equal(result.status, "translated");
    assert.equal(result.final_html_available, false);

    const validation = runRuntime(["validate-block-translations"], runRoot);
    assert.deepEqual(validation, { ok: true, errors: [] });

    const blocks = JSON.parse(
      await fs.readFile(
        path.join(runRoot, "runtime", "views", "reading-blocks.json"),
        "utf8",
      ),
    ).blocks as Array<Record<string, unknown>>;
    const translation = JSON.parse(
      await fs.readFile(
        path.join(runRoot, "runtime", "views", "translation-view.json"),
        "utf8",
      ),
    );
    const expectedOrder = blocks
      .filter((block) => block.translate === true)
      .map((block) => block.block_id);
    assert.deepEqual(
      translation.items.map((item: Record<string, unknown>) => item.block_id),
      expectedOrder,
    );
    assert.equal(translation.target_language, "zh-CN");
    assert.isTrue(
      translation.items.some(
        (item: Record<string, unknown>) =>
          item.kind === "formula" && item.status === "carried_over",
      ),
    );
    assert.isTrue(
      translation.items.some(
        (item: Record<string, unknown>) =>
          item.kind === "table" &&
          String(item.translated_markdown).includes("<table>"),
      ),
    );
  });

  it("rejects invalid block translation payloads", async function () {
    const tempRoot = await fs.mkdtemp(
      path.join(os.tmpdir(), "deep-reading-invalid-translation-"),
    );
    const bundlePath = await makeSourceBundle(tempRoot);
    const runRoot = path.join(tempRoot, "run");
    await fs.mkdir(path.join(runRoot, "runtime"), { recursive: true });
    await fs.writeFile(
      path.join(runRoot, "runtime", "input.json"),
      JSON.stringify({ source_bundle_path: bundlePath }, null, 2),
      "utf8",
    );
    await installFakeBridge(runRoot);
    runRuntime(["bootstrap", "--input", "runtime/input.json"], runRoot);
    await writeContextRequest(runRoot);
    runRuntime(
      [
        "submit-context-request",
        "--payload",
        "runtime/payloads/context-request.json",
      ],
      runRoot,
    );
    await writeReadingEnrichment(runRoot);
    runRuntime(
      [
        "submit-reading-enrichment",
        "--payload",
        "runtime/payloads/reading-enrichment.json",
      ],
      runRoot,
    );

    const blocks = JSON.parse(
      await fs.readFile(
        path.join(runRoot, "runtime", "views", "reading-blocks.json"),
        "utf8",
      ),
    ).blocks as Array<Record<string, unknown>>;
    const firstRequired = blocks.find(
      (block) => block.translate === true && block.kind !== "formula",
    )!;
    const referenceBlock = blocks.find((block) => block.translate === false)!;
    const tableBlock = blocks.find((block) => block.kind === "table")!;
    await writeBlockTranslations(runRoot, {
      translations: [
        {
          block_id: firstRequired.block_id,
          translated_markdown: "译文",
          quality_notes: [],
        },
        {
          block_id: firstRequired.block_id,
          translated_markdown: "重复译文",
          quality_notes: [],
        },
        {
          block_id: "block-9999",
          translated_markdown: "未知译文",
          quality_notes: [],
        },
        {
          block_id: referenceBlock.block_id,
          translated_markdown: "不应翻译参考文献",
          quality_notes: [],
        },
        {
          block_id: tableBlock.block_id,
          translated_markdown: "普通段落，不是表格",
          quality_notes: [],
        },
      ],
    });

    const result = runRuntimeAllowFailure(
      [
        "submit-block-translations",
        "--payload",
        "runtime/payloads/block-translations.json",
      ],
      runRoot,
    );
    assert.equal(result.exitCode, 1);
    assert.equal(result.output.status, "failed");
    assert.include(JSON.stringify(result.output.error), "duplicates block_id");
    assert.include(JSON.stringify(result.output.error), "unknown block_id");
    assert.include(JSON.stringify(result.output.error), "non-translatable");
    assert.include(JSON.stringify(result.output.error), "table translation");
    assert.include(JSON.stringify(result.output.error), "missing translations");
  });

  it("rejects invalid reading enrichment payloads", async function () {
    const tempRoot = await fs.mkdtemp(
      path.join(os.tmpdir(), "deep-reading-invalid-enrichment-"),
    );
    const bundlePath = await makeSourceBundle(tempRoot);
    const runRoot = path.join(tempRoot, "run");
    await fs.mkdir(path.join(runRoot, "runtime"), { recursive: true });
    await fs.writeFile(
      path.join(runRoot, "runtime", "input.json"),
      JSON.stringify({ source_bundle_path: bundlePath }, null, 2),
      "utf8",
    );
    await installFakeBridge(runRoot);
    runRuntime(["bootstrap", "--input", "runtime/input.json"], runRoot);
    await writeContextRequest(runRoot);
    runRuntime(
      [
        "submit-context-request",
        "--payload",
        "runtime/payloads/context-request.json",
      ],
      runRoot,
    );
    await writeReadingEnrichment(runRoot, {
      section_notes: [
        {
          section_anchor: "sec-does-not-exist",
        },
      ],
      concepts: [
        {
          label: "",
        },
      ],
      reference_digest_notes: [
        {
          reference_id: "ref-999",
        },
      ],
    });

    const result = runRuntimeAllowFailure(
      [
        "submit-reading-enrichment",
        "--payload",
        "runtime/payloads/reading-enrichment.json",
      ],
      runRoot,
    );
    assert.equal(result.exitCode, 1);
    assert.equal(result.output.status, "failed");
    assert.include(JSON.stringify(result.output.error), "section_anchor");
    assert.include(JSON.stringify(result.output.error), "reference_id");
    assert.include(JSON.stringify(result.output.error), "requires label");
  });

  it("keeps citation graph snapshot when Host layout is missing", async function () {
    const tempRoot = await fs.mkdtemp(
      path.join(os.tmpdir(), "deep-reading-layout-missing-"),
    );
    const bundlePath = await makeSourceBundle(tempRoot);
    const runRoot = path.join(tempRoot, "run");
    await fs.mkdir(path.join(runRoot, "runtime"), { recursive: true });
    await fs.writeFile(
      path.join(runRoot, "runtime", "input.json"),
      JSON.stringify({ source_bundle_path: bundlePath }, null, 2),
      "utf8",
    );
    await installFakeBridge(runRoot, { layoutStatus: "missing" });
    runRuntime(["bootstrap", "--input", "runtime/input.json"], runRoot);
    await writeContextRequest(runRoot);
    runRuntime(
      [
        "submit-context-request",
        "--payload",
        "runtime/payloads/context-request.json",
      ],
      runRoot,
    );

    const snapshot = JSON.parse(
      await fs.readFile(
        path.join(runRoot, "runtime", "views", "citation-graph-snapshot.json"),
        "utf8",
      ),
    );
    const layout = JSON.parse(
      await fs.readFile(
        path.join(runRoot, "runtime", "views", "citation-graph-layout.json"),
        "utf8",
      ),
    );
    assert.lengthOf(snapshot.nodes, 2);
    assert.equal(layout.status, "missing");
    assert.deepEqual(layout.nodes, []);
  });

  it("degrades Stage 10 when Host Bridge CLI is unavailable", async function () {
    const tempRoot = await fs.mkdtemp(
      path.join(os.tmpdir(), "deep-reading-no-host-"),
    );
    const bundlePath = await makeSourceBundle(tempRoot);
    const runRoot = path.join(tempRoot, "run");
    await fs.mkdir(path.join(runRoot, "runtime"), { recursive: true });
    await fs.writeFile(
      path.join(runRoot, "runtime", "input.json"),
      JSON.stringify({ source_bundle_path: bundlePath }, null, 2),
      "utf8",
    );
    runRuntime(["bootstrap", "--input", "runtime/input.json"], runRoot);
    await writeContextRequest(runRoot);

    const result = runRuntime(
      [
        "submit-context-request",
        "--payload",
        "runtime/payloads/context-request.json",
      ],
      runRoot,
    );
    assert.equal(result.status, "context_ready");
    assert.include(result.warnings, "host_bridge_unavailable");

    const diagnostics = JSON.parse(
      await fs.readFile(
        path.join(runRoot, "runtime", "views", "diagnostics-host-context.json"),
        "utf8",
      ),
    );
    assert.isTrue(
      diagnostics.diagnostics.some(
        (entry: Record<string, unknown>) =>
          entry.code === "host_bridge_unavailable",
      ),
    );
  });

  it("rejects invalid context request payloads", async function () {
    const tempRoot = await fs.mkdtemp(
      path.join(os.tmpdir(), "deep-reading-invalid-context-"),
    );
    const bundlePath = await makeSourceBundle(tempRoot);
    const runRoot = path.join(tempRoot, "run");
    await fs.mkdir(path.join(runRoot, "runtime"), { recursive: true });
    await fs.writeFile(
      path.join(runRoot, "runtime", "input.json"),
      JSON.stringify({ source_bundle_path: bundlePath }, null, 2),
      "utf8",
    );
    runRuntime(["bootstrap", "--input", "runtime/input.json"], runRoot);
    await writeContextRequest(runRoot, {
      external_context_section_anchors: ["sec-does-not-exist"],
      citation_graph_direction: "sideways",
      citation_graph_max_nodes: 0,
      reference_digest_policy: "everything",
    });

    const result = runRuntimeAllowFailure(
      [
        "submit-context-request",
        "--payload",
        "runtime/payloads/context-request.json",
      ],
      runRoot,
    );
    assert.equal(result.exitCode, 1);
    assert.equal(result.output.status, "failed");
    assert.include(
      JSON.stringify(result.output.error),
      "reference_digest_policy",
    );
  });
});
