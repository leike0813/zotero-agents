import { assert } from "chai";
import { execFileSync } from "child_process";
import fs from "fs/promises";
import fsSync from "fs";
import os from "os";
import path from "path";
import { pathToFileURL } from "url";
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
  options?: {
    includeDigest?: boolean;
    includeReferences?: boolean;
    translatorAlignment?: Record<string, unknown>;
    imageOriginalSrc?: string;
    imageManifestSourceOnly?: boolean;
  },
) {
  const bundleSource = path.join(tempRoot, "bundle-source");
  await fs.mkdir(path.join(bundleSource, "images"), { recursive: true });
  await fs.mkdir(path.join(bundleSource, "artifacts"), { recursive: true });
  await fs.mkdir(path.join(bundleSource, "translator"), { recursive: true });
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
      "Fig. 1. This figure shows the main idea.",
      "",
      "$$",
      "a = b + c",
      "$$",
      "",
      "<table><tr><td>Metric</td><td>Value</td></tr><tr><td>AP</td><td>$42 \\pm 1$</td></tr></table>",
      "",
      "Table 1. Main metric results.",
      "",
      "| Method | Score |",
      "| --- | --- |",
      "| DETR | 42 |",
      "",
      "Table 2. Markdown table results.",
      "",
      "# References",
      "",
      "1. Example Author. Example reference title. 2020.",
      "2. Another Author. Another reference title. 2021.",
      "",
      "# Appendix",
      "",
      "The appendix contains additional experimental details.",
      "",
      "## A Additional table",
      "",
      "| Extra | Value |",
      "| --- | --- |",
      "| Heads | 8 |",
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
          creators: [{ firstName: "Jane", lastName: "Doe" }],
        },
        source_kind: "mineru_markdown",
        images: [
          {
            ...(options?.imageManifestSourceOnly
              ? { source: options?.imageOriginalSrc || "images/figure-1.png" }
              : {
                  original_src:
                    options?.imageOriginalSrc || "images/figure-1.png",
                }),
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
  if (options?.includeReferences !== false) {
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
  }
  if (options?.includeDigest !== false) {
    await fs.writeFile(
      path.join(bundleSource, "artifacts", "digest.md"),
      [
        "## TL;DR",
        "",
        "Digest artifact summary.",
        "",
        "## Contributions",
        "",
        "A concise contribution list.",
        "",
        "## Methods",
        "",
        "Method summary.",
        "",
        "## Results",
        "",
        "Result summary.",
        "",
        "## Limitations and reproducibility",
        "",
        "Reusable clues.",
        "",
        "## Section-by-section",
        "",
        "This should not appear in the final Summary view.",
      ].join("\n"),
      "utf8",
    );
  }
  if (options?.translatorAlignment) {
    await fs.writeFile(
      path.join(bundleSource, "translator", "alignment.json"),
      JSON.stringify(options.translatorAlignment, null, 2),
      "utf8",
    );
  }
  await fs.writeFile(
    path.join(bundleSource, "artifacts", "artifact-manifest.json"),
    JSON.stringify(
      {
        artifacts: [
          ...(options?.includeReferences === false
            ? []
            : [
                {
                  artifact_type: "references",
                  payload_type: "references-json",
                  bundle_path: "artifacts/references.json",
                  status: "available",
                },
              ]),
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

function sampleTranslatorAlignment() {
  return {
    format: "v1",
    doc_id: "D1",
    source_language: "en",
    target_language: "zh-CN",
    metadata: {
      source: "test",
    },
    blocks: [
      {
        b: "b_001",
        type: "heading",
        heading: "Sample Paper",
        source_markdown: "# Sample Paper",
        translated_markdown: "# 示例论文",
        pairs: [
          {
            i: 1,
            src: "# Sample Paper",
            tgt: "# 示例论文",
            status: "passed",
            repair_count: 0,
          },
        ],
      },
      {
        b: "b_002",
        type: "paragraph",
        heading: "Sample Paper",
        source_markdown: "This paper introduces a small test method.",
        translated_markdown: "本文介绍了一种小型测试方法。",
        pairs: [
          {
            i: 1,
            src: "This paper introduces a small test method.",
            tgt: "本文介绍了一种小型测试方法。",
            status: "passed",
            repair_count: 0,
          },
        ],
      },
    ],
  };
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
        request_topic_context: true,
        topic_context_reason: "Use the Host topic containing the target paper.",
        selected_topic_id: "",
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
        let translated = `这是 ${block.block_id} 对应自然段的完整中文译文，用于验证段落级翻译流程。`;
        if (kind === "heading") {
          translated = source
            .replace("Sample Paper", "样例论文")
            .replace("Introduction", "引言")
            .replace("Appendix", "附录")
            .replace("Additional table", "附加表格");
        } else if (kind === "table") {
          translated = `<table><tr><td>指标</td><td>数值</td></tr><tr><td>${block.block_id}</td><td>$42 \\pm 1$</td></tr></table>`;
        } else if (kind === "image") {
          translated = "图示说明：该图用于展示方法的主要想法。";
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

async function writeFinalReview(
  runRoot: string,
  payload?: Record<string, unknown>,
) {
  await fs.mkdir(path.join(runRoot, "runtime", "payloads"), {
    recursive: true,
  });
  await fs.writeFile(
    path.join(runRoot, "runtime", "payloads", "final-review.json"),
    JSON.stringify(
      payload || {
        overall_assessment: "ready",
        quality_observations: [
          {
            severity: "warning",
            kind: "translation_style",
            block_id: "block-0002",
            message: "术语按概念表统一。",
          },
        ],
      },
      null,
      2,
    ),
    "utf8",
  );
}

async function installFakeBridge(
  runRoot: string,
  options?: { layoutStatus?: string; exportTargetArtifacts?: boolean },
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
const exportTargetArtifacts = ${JSON.stringify(options?.exportTargetArtifacts !== false)};
if (command === "reference-index get") {
  reply({
    rows: [
      {
        paper_ref: "1:EIMSDEU3",
        zoteroItemKey: "EIMSDEU3",
        title: "Sample Paper",
        artifacts: {
          digest: { status: "available" },
          references: { status: "available" },
          citation_analysis: { status: "available" }
        }
      },
      {
        reference_index: 3,
        title: "Reference index bound title",
        target_paper_ref: "1:B",
        target_literature_item_id: "B",
        target_title: "Reference index bound title",
        target_binding: "library",
        binding_status: "accepted",
        confidence: "high"
      },
      {
        reference_index: 2,
        title: "External reference title",
        target_paper_ref: "ext:C",
        target_title: "External reference title",
        target_binding: "external",
        binding_status: "accepted"
      }
    ]
  });
} else if (command === "paper-artifacts manifest") {
  const artifacts = [];
  for (const paperRef of input.paper_refs) {
    const types = input.artifact_types || ["digest"];
    for (const type of types) {
      artifacts.push({ paperRef, artifact_type: type, payload_type: type === "digest" ? "digest-markdown" : type === "references" ? "references-json" : "citation-analysis-json", status: "available" });
    }
  }
  reply({ artifacts, diagnostics: [], total: artifacts.length });
} else if (command === "paper-artifacts export-filtered") {
  const targetDir = "runtime/payloads/artifacts";
  const manifestFile = "runtime/payloads/paper-artifacts-manifest.json";
  const papers = [];
  for (const paperRef of input.paper_refs) {
    const safe = paperRef.replace(/[^A-Za-z0-9_.-]+/g, "_");
    const dir = path.resolve(process.cwd(), targetDir, safe);
    fs.mkdirSync(dir, { recursive: true });
    const types = input.artifact_types || ["digest"];
    const artifacts = [];
    for (const type of types) {
      if (type === "digest") {
        const contentFile = path.join(targetDir, safe, "digest.md");
        fs.writeFileSync(path.resolve(process.cwd(), contentFile), "# Digest for " + paperRef + "\\n", "utf8");
        artifacts.push({ artifact_type: "digest", payload_type: "digest-markdown", content_file: contentFile, status: "available" });
      } else if (type === "references" && exportTargetArtifacts) {
        const contentFile = path.join(targetDir, safe, "references.json");
        fs.writeFileSync(path.resolve(process.cwd(), contentFile), JSON.stringify({ references: [{ id: "ref-host", title: "Host Reference", year: "2024" }] }), "utf8");
        artifacts.push({ artifact_type: "references", payload_type: "references-json", content_file: contentFile, status: "available" });
      } else if ((type === "citation_analysis" || type === "citation-analysis") && exportTargetArtifacts) {
        const contentFile = path.join(targetDir, safe, "citation-analysis.md");
        fs.writeFileSync(path.resolve(process.cwd(), contentFile), "# Citation Analysis for " + paperRef + "\\n", "utf8");
        artifacts.push({ artifact_type: "citation_analysis", payload_type: "citation-analysis-markdown", content_file: contentFile, status: "available" });
      }
    }
    papers.push({ paper_ref: paperRef, artifacts, diagnostics: [] });
  }
  fs.writeFileSync(path.resolve(process.cwd(), manifestFile), JSON.stringify({ papers }, null, 2), "utf8");
  reply({ exported: papers.reduce((sum, paper) => sum + paper.artifacts.length, 0), manifest_file: manifestFile, diagnostics: [] });
} else if (command === "topics find-by-paper-ref") {
  reply({
    ok: true,
    status: "ok",
    paper_refs: [input.paper_ref || input.paperRef],
    topics: [
      {
        topic_id: "computer-vision",
        title: "Computer Vision",
        status: "active",
        matched_paper_refs: [input.paper_ref || input.paperRef],
        match_sources: ["current_dependencies"]
      }
    ],
    diagnostics: { requested_count: 1, matched_topic_count: 1, unmatched_paper_refs: [], source: "artifact_state" }
  });
} else if (command === "topics get-context") {
  reply({
    topic_id: input.topicId || input.topic_id,
    title: "Computer Vision",
    summary: "Topic context for the selected paper.",
    diagnostics: []
  });
} else if (command === "citation-graph get-slice") {
  reply({
    nodes: [
      { node_id: "zotero:item:EIMSDEU3", title: "Sample Paper", kind: "target", paperRef: "1:EIMSDEU3" },
      { node_id: "zotero:item:A", title: "Library Paper A", authors: ["Alice Smith", "Bob Lee"], kind: "library", paperRef: "1:A" }
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
  reply({ matches: input.labels.map((label) => ({ label, matches: [{ label, definition: label + " definition" }] })) });
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
  this.timeout(30000);

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
      "assets/schemas/final-review.schema.json",
      "runtime/deep_reading_runtime.py",
      "renderer/render_literature_deep_reading_skill.ts",
      "renderer/templates/deep-reading.html.tpl",
      "renderer/templates/deep-reading.css",
      "renderer/templates/deep-reading.js",
      "renderer/templates/citation-graph-synthesis-app.js",
      "renderer/templates/citation-graph-synthesis.css",
      "renderer/templates/citation-graph-synthesis-theme.js",
      "renderer/templates/citation-graph-synthesis-i18n.json",
      "renderer/templates/citation-graph-standalone.css",
      "renderer/templates/citation-graph-standalone.js",
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
      "assets/schemas/final-review.schema.json",
      "scripts/deep_reading_runtime.py",
      "renderer/templates/deep-reading.html.tpl",
      "renderer/templates/deep-reading.css",
      "renderer/templates/deep-reading.js",
      "renderer/templates/citation-graph-synthesis-app.js",
      "renderer/templates/citation-graph-synthesis.css",
      "renderer/templates/citation-graph-synthesis-theme.js",
      "renderer/templates/citation-graph-synthesis-i18n.json",
      "renderer/templates/citation-graph-standalone.css",
      "renderer/templates/citation-graph-standalone.js",
    ];
    for (const filePath of requiredGeneratedFiles) {
      await assertFileExists(path.join(skillRoot, filePath));
    }
  });

  it("keeps the fallback citation graph renderer SVG-only and read-only", async function () {
    const rendererSource = await fs.readFile(
      path.resolve("src/shared/citationGraphStandalone.ts"),
      "utf8",
    );
    const rendererCss = await fs.readFile(
      path.resolve("src/shared/citationGraphStandalone.css"),
      "utf8",
    );

    assert.include(rendererSource, "zs-cg-svg");
    assert.include(rendererSource, "is-current-paper");
    assert.include(rendererSource, "mouseenter");
    assert.notInclude(rendererSource, "new Sigma");
    assert.notInclude(rendererSource, "graphology");
    assert.notInclude(rendererSource, "data-zs-cg-search");
    assert.notInclude(rendererSource, "data-zs-cg-clear");
    assert.notInclude(rendererSource, "data-zs-cg-detail");

    assert.include(rendererCss, ".zs-cg-stage");
    assert.include(rendererCss, ".zs-cg-legend");
    assert.include(rendererCss, ".zs-cg-node-size i.is-current-paper");
    assert.notInclude(rendererCss, ".zs-cg-toolbar");
    assert.notInclude(rendererCss, ".zs-cg-detail");
    assert.notInclude(rendererCss, ".graph-detail");
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
    const imageBlock = blocks.blocks.find(
      (block: Record<string, unknown>) => block.kind === "image",
    ) as Record<string, unknown>;
    assert.include(String(imageBlock.caption_markdown), "Fig. 1");
    const tableBlocks = blocks.blocks.filter(
      (block: Record<string, unknown>) => block.kind === "table",
    ) as Array<Record<string, unknown>>;
    assert.isAtLeast(tableBlocks.length, 3);
    assert.isTrue(
      tableBlocks.some((block) =>
        String(block.caption_markdown).includes("Table 1"),
      ),
    );
    assert.isTrue(
      tableBlocks.some((block) =>
        String(block.table_markdown_or_html).includes("| Method |"),
      ),
    );
    const referencesHeadingIndex = blocks.blocks.findIndex(
      (block: Record<string, unknown>) =>
        block.kind === "heading" &&
        String(block.source_markdown).includes("References"),
    );
    assert.isAtLeast(referencesHeadingIndex, 0);
    const appendixHeadingIndex = blocks.blocks.findIndex(
      (block: Record<string, unknown>) =>
        block.kind === "heading" &&
        String(block.source_markdown).includes("Appendix"),
    );
    assert.isAbove(appendixHeadingIndex, referencesHeadingIndex);
    assert.isTrue(
      blocks.blocks
        .filter(
          (block: Record<string, unknown>) => block.role === "bibliography",
        )
        .every((block: Record<string, unknown>) => block.translate === false),
    );
    assert.isTrue(
      blocks.blocks
        .filter((block: Record<string, unknown>) => block.role === "appendix")
        .every((block: Record<string, unknown>) => block.translate === true),
    );
    assert.isAtLeast(
      blocks.blocks.filter(
        (block: Record<string, unknown>) => block.role === "appendix",
      ).length,
      2,
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

  it("bootstraps bundled translator alignment as canonical reading blocks", async function () {
    const tempRoot = await fs.mkdtemp(
      path.join(os.tmpdir(), "deep-reading-bundled-alignment-"),
    );
    const bundlePath = await makeSourceBundle(tempRoot, {
      translatorAlignment: sampleTranslatorAlignment(),
    });
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

    runRuntime(["bootstrap", "--input", "runtime/input.json"], runRoot);
    const blocks = JSON.parse(
      await fs.readFile(
        path.join(runRoot, "runtime", "views", "reading-blocks.json"),
        "utf8",
      ),
    );
    assert.deepEqual(
      blocks.blocks.map((block: Record<string, unknown>) => block.block_id),
      ["b_001", "b_002"],
    );
    const alignment = JSON.parse(
      await fs.readFile(
        path.join(
          runRoot,
          "runtime",
          "views",
          "translator-alignment-view.json",
        ),
        "utf8",
      ),
    );
    assert.equal(
      alignment.metadata.import_source,
      "bundle.translator_alignment",
    );
  });

  it("keeps translator alignment image refs mapped to bundled image files", async function () {
    const tempRoot = await fs.mkdtemp(
      path.join(os.tmpdir(), "deep-reading-alignment-image-"),
    );
    const bundlePath = await makeSourceBundle(tempRoot, {
      imageOriginalSrc: "images/original figure.png",
      imageManifestSourceOnly: true,
      translatorAlignment: {
        ...sampleTranslatorAlignment(),
        blocks: [
          ...sampleTranslatorAlignment().blocks,
          {
            b: "b_003",
            type: "image",
            heading: "Sample Paper",
            source_markdown: "![Figure](images/original figure.png)",
            translated_markdown: "![Figure](images/original figure.png)",
            pairs: [
              {
                i: 1,
                src: "![Figure](images/original figure.png)",
                tgt: "![Figure](images/original figure.png)",
                status: "passed",
                repair_count: 0,
              },
            ],
          },
        ],
      },
    });
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

    runRuntime(["bootstrap", "--input", "runtime/input.json"], runRoot);
    const imageManifest = JSON.parse(
      await fs.readFile(
        path.join(runRoot, "runtime", "views", "image-manifest.json"),
        "utf8",
      ),
    );
    assert.equal(imageManifest.available_count, 1);
    assert.lengthOf(imageManifest.images, 1);
    assert.equal(
      imageManifest.images[0].original_src,
      "images/original figure.png",
    );
    assert.equal(imageManifest.images[0].bundle_path, "images/figure-1.png");
  });

  it("imports explicit translator alignment and skips runtime translation batches", async function () {
    const tempRoot = await fs.mkdtemp(
      path.join(os.tmpdir(), "deep-reading-explicit-alignment-"),
    );
    const bundlePath = await makeSourceBundle(tempRoot);
    const alignmentPath = path.join(tempRoot, "alignment.json");
    await fs.writeFile(
      alignmentPath,
      JSON.stringify(sampleTranslatorAlignment(), null, 2),
      "utf8",
    );
    const runRoot = path.join(tempRoot, "run");
    await fs.mkdir(path.join(runRoot, "runtime"), { recursive: true });
    await fs.writeFile(
      path.join(runRoot, "runtime", "input.json"),
      JSON.stringify(
        {
          source_bundle_path: bundlePath,
          translator_alignment_path: alignmentPath,
          parameter: { target_language: "zh-CN" },
        },
        null,
        2,
      ),
      "utf8",
    );
    await installFakeBridge(runRoot);
    runRuntime(["bootstrap", "--input", "runtime/input.json"], runRoot);
    await writeContextRequest(runRoot, {
      main_task: "test method",
      method_family: "sample",
      external_context_section_anchors: ["sec-sample-paper"],
      request_topic_context: false,
      topic_context_reason: "",
      selected_topic_id: "",
      request_concept_context: false,
      concept_labels: [],
      request_citation_graph: false,
      citation_graph_depth: 1,
      citation_graph_direction: "both",
      citation_graph_max_nodes: 20,
      citation_graph_max_edges: 40,
      citation_graph_include_low_signal: false,
      reference_digest_policy: "none",
      priority_reference_indices: [],
    });
    runRuntime(
      [
        "submit-context-request",
        "--payload",
        "runtime/payloads/context-request.json",
      ],
      runRoot,
    );
    await writeReadingEnrichment(runRoot, {
      preface_title: "阅读前导读",
      preface_cards: [{ title: "研究问题", body: "样例 alignment 复用。" }],
      preface_reading_path: ["先看样例"],
      preface_goal: "验证 translator alignment 复用。",
      preface_concepts: [],
      preface_warnings: [],
      preface_questions: [],
      section_notes: [
        {
          section_anchor: "sec-sample-paper",
          reading_goal: "理解样例论文。",
          concepts: [],
          misread_warnings: [],
          questions: [],
          citation_note_body: "",
          citation_reference_roles: [],
        },
      ],
      concepts: [],
      reference_digest_notes: [],
      summary_fallback_enabled: true,
      summary_fallback_sections: [{ title: "TL;DR", body: "样例。" }],
      extensions: [],
    });

    const result = runRuntime(
      [
        "submit-reading-enrichment",
        "--payload",
        "runtime/payloads/reading-enrichment.json",
      ],
      runRoot,
    );
    assert.equal(result.translation_batch_count, 0);
    const batches = JSON.parse(
      await fs.readFile(
        path.join(runRoot, "runtime", "views", "translation-batches-view.json"),
        "utf8",
      ),
    );
    assert.equal(batches.source, "translator_alignment");
    assert.equal(batches.batch_count, 0);
    const translation = JSON.parse(
      await fs.readFile(
        path.join(runRoot, "runtime", "views", "translation-view.json"),
        "utf8",
      ),
    );
    assert.equal(translation.source, "translator_alignment");
    assert.equal(translation.translated_count, 2);
  });

  it("hydrates translator alignment input from ACP audit manifest", async function () {
    const tempRoot = await fs.mkdtemp(
      path.join(os.tmpdir(), "deep-reading-audit-alignment-"),
    );
    const bundlePath = await makeSourceBundle(tempRoot);
    const alignmentPath = path.join(tempRoot, "alignment.json");
    const outputPath = path.join(tempRoot, "output_zh-CN.md");
    await fs.writeFile(
      alignmentPath,
      JSON.stringify(sampleTranslatorAlignment(), null, 2),
      "utf8",
    );
    await fs.writeFile(outputPath, "# 示例论文\n", "utf8");
    const runRoot = path.join(tempRoot, "run");
    await fs.mkdir(path.join(runRoot, "runtime"), { recursive: true });
    await fs.mkdir(
      path.join(runRoot, ".audit", "literature-deep-reading.1"),
      { recursive: true },
    );
    await fs.writeFile(
      path.join(runRoot, "runtime", "input.json"),
      JSON.stringify({ source_bundle_path: bundlePath }, null, 2),
      "utf8",
    );
    await fs.writeFile(
      path.join(
        runRoot,
        ".audit",
        "literature-deep-reading.1",
        "input_manifest.json",
      ),
      JSON.stringify(
        {
          kind: "acp.skill.run.v1",
          skill_id: "literature-deep-reading",
          input: {
            source_bundle_path: bundlePath,
            translator_alignment_path: alignmentPath,
            translator_output_path: outputPath,
            translator_status: "success",
          },
          parameter: { target_language: "zh-CN" },
        },
        null,
        2,
      ),
      "utf8",
    );
    await installFakeBridge(runRoot);

    runRuntime(["bootstrap", "--input", "runtime/input.json"], runRoot);

    const hydratedInput = JSON.parse(
      await fs.readFile(path.join(runRoot, "runtime", "input.json"), "utf8"),
    );
    assert.equal(hydratedInput.translator_alignment_path, alignmentPath);
    assert.equal(hydratedInput.translator_output_path, outputPath);
    assert.equal(hydratedInput.translator_status, "success");
    assert.deepEqual(hydratedInput.parameter, { target_language: "zh-CN" });
    const translatorAlignmentView = JSON.parse(
      await fs.readFile(
        path.join(runRoot, "runtime", "views", "translator-alignment-view.json"),
        "utf8",
      ),
    );
    assert.equal(
      translatorAlignmentView.metadata.import_source,
      "input.translator_alignment_path",
    );

    await writeContextRequest(runRoot, {
      main_task: "test method",
      method_family: "sample",
      external_context_section_anchors: ["sec-sample-paper"],
      request_topic_context: false,
      topic_context_reason: "",
      selected_topic_id: "",
      request_concept_context: false,
      concept_labels: [],
      request_citation_graph: false,
      citation_graph_depth: 1,
      citation_graph_direction: "both",
      citation_graph_max_nodes: 20,
      citation_graph_max_edges: 40,
      citation_graph_include_low_signal: false,
      reference_digest_policy: "none",
      priority_reference_indices: [],
    });
    runRuntime(
      [
        "submit-context-request",
        "--payload",
        "runtime/payloads/context-request.json",
      ],
      runRoot,
    );
    await writeReadingEnrichment(runRoot, {
      preface_title: "阅读前导读",
      preface_cards: [{ title: "研究问题", body: "审计输入 alignment 复用。" }],
      preface_reading_path: ["先看样例"],
      preface_goal: "验证 audit manifest 输入补齐。",
      preface_concepts: [],
      preface_warnings: [],
      preface_questions: [],
      section_notes: [
        {
          section_anchor: "sec-sample-paper",
          reading_goal: "理解样例论文。",
          concepts: [],
          misread_warnings: [],
          questions: [],
          citation_note_body: "",
          citation_reference_roles: [],
        },
      ],
      concepts: [],
      reference_digest_notes: [],
      summary_fallback_enabled: true,
      summary_fallback_sections: [{ title: "TL;DR", body: "样例。" }],
      extensions: [],
    });
    const enrichment = runRuntime(
      [
        "submit-reading-enrichment",
        "--payload",
        "runtime/payloads/reading-enrichment.json",
      ],
      runRoot,
    );
    assert.equal(enrichment.translation_batch_count, 0);
    const batches = JSON.parse(
      await fs.readFile(
        path.join(runRoot, "runtime", "views", "translation-batches-view.json"),
        "utf8",
      ),
    );
    assert.equal(batches.source, "translator_alignment");
    assert.equal(batches.batch_count, 0);
  });

  it("fails bootstrap when translator succeeded but alignment is unavailable", async function () {
    const tempRoot = await fs.mkdtemp(
      path.join(os.tmpdir(), "deep-reading-missing-success-alignment-"),
    );
    const bundlePath = await makeSourceBundle(tempRoot);
    const runRoot = path.join(tempRoot, "run");
    await fs.mkdir(path.join(runRoot, "runtime"), { recursive: true });
    await fs.writeFile(
      path.join(runRoot, "runtime", "input.json"),
      JSON.stringify(
        {
          source_bundle_path: bundlePath,
          translator_status: "success",
          parameter: { target_language: "zh-CN" },
        },
        null,
        2,
      ),
      "utf8",
    );
    await installFakeBridge(runRoot);

    const result = runRuntimeAllowFailure(
      ["bootstrap", "--input", "runtime/input.json"],
      runRoot,
    );

    assert.notEqual(result.exitCode, 0);
    assert.include(
      String(result.output.error?.message || ""),
      "translator_alignment_handoff_missing",
    );
    const diagnostics = JSON.parse(
      await fs.readFile(
        path.join(runRoot, "runtime", "views", "diagnostics-bootstrap.json"),
        "utf8",
      ),
    );
    assert.isTrue(
      diagnostics.diagnostics.some(
        (item: Record<string, unknown>) =>
          item.code === "translator_alignment_handoff_missing",
      ),
    );
  });

  it("renders cancelled translator runs as source-only without translation modes", async function () {
    const tempRoot = await fs.mkdtemp(
      path.join(os.tmpdir(), "deep-reading-source-only-"),
    );
    const bundlePath = await makeSourceBundle(tempRoot);
    const runRoot = path.join(tempRoot, "run");
    await fs.mkdir(path.join(runRoot, "runtime"), { recursive: true });
    await fs.writeFile(
      path.join(runRoot, "runtime", "input.json"),
      JSON.stringify(
        {
          source_bundle_path: bundlePath,
          translator_status: "cancelled",
          parameter: { target_language: "en-US" },
        },
        null,
        2,
      ),
      "utf8",
    );
    await installFakeBridge(runRoot);
    runRuntime(["bootstrap", "--input", "runtime/input.json"], runRoot);
    await writeContextRequest(runRoot, {
      main_task: "test method",
      method_family: "sample",
      external_context_section_anchors: ["sec-sample-paper"],
      request_topic_context: false,
      topic_context_reason: "",
      selected_topic_id: "",
      request_concept_context: false,
      concept_labels: [],
      request_citation_graph: false,
      citation_graph_depth: 1,
      citation_graph_direction: "both",
      citation_graph_max_nodes: 20,
      citation_graph_max_edges: 40,
      citation_graph_include_low_signal: false,
      reference_digest_policy: "none",
      priority_reference_indices: [],
    });
    runRuntime(
      [
        "submit-context-request",
        "--payload",
        "runtime/payloads/context-request.json",
      ],
      runRoot,
    );
    await writeReadingEnrichment(runRoot);

    const enrichment = runRuntime(
      [
        "submit-reading-enrichment",
        "--payload",
        "runtime/payloads/reading-enrichment.json",
      ],
      runRoot,
    );
    assert.equal(enrichment.translation_batch_count, 0);
    assert.equal(enrichment.required_translation_count, 0);
    const batches = JSON.parse(
      await fs.readFile(
        path.join(runRoot, "runtime", "views", "translation-batches-view.json"),
        "utf8",
      ),
    );
    assert.equal(batches.source, "source_only_alignment");
    const translation = JSON.parse(
      await fs.readFile(
        path.join(runRoot, "runtime", "views", "translation-view.json"),
        "utf8",
      ),
    );
    assert.equal(translation.source, "source_only_alignment");
    assert.equal(translation.translated_count, 0);
    assert.isTrue(
      translation.items.every(
        (item: Record<string, unknown>) => item.status === "source_only",
      ),
    );
    await writeFinalReview(runRoot, {
      overall_assessment: "ready",
      quality_observations: [],
    });
    runRuntime(
      [
        "submit-final-review",
        "--payload",
        "runtime/payloads/final-review.json",
      ],
      runRoot,
    );

    const sections = JSON.parse(
      await fs.readFile(
        path.join(runRoot, "result", "sections", "sections.json"),
        "utf8",
      ),
    );
    assert.equal(sections.translation_available, false);
    const html = await fs.readFile(
      path.join(runRoot, "result", "deep-reading.html"),
      "utf8",
    );
    assert.include(
      html,
      '<body class="mode-original translation-unavailable">',
    );
    assert.include(html, "body.translation-unavailable .modes");
  });

  it("keeps Appendix out of markdown references fallback", async function () {
    const tempRoot = await fs.mkdtemp(
      path.join(os.tmpdir(), "deep-reading-references-fallback-"),
    );
    const bundlePath = await makeSourceBundle(tempRoot, {
      includeReferences: false,
    });
    const runRoot = path.join(tempRoot, "run");
    await fs.mkdir(path.join(runRoot, "runtime"), { recursive: true });
    await fs.writeFile(
      path.join(runRoot, "runtime", "input.json"),
      JSON.stringify({ source_bundle_path: bundlePath }, null, 2),
      "utf8",
    );

    runRuntime(["bootstrap", "--input", "runtime/input.json"], runRoot);

    const referencesSeed = JSON.parse(
      await fs.readFile(
        path.join(runRoot, "runtime", "views", "references-seed-view.json"),
        "utf8",
      ),
    );
    assert.equal(referencesSeed.source, "markdown");
    assert.equal(referencesSeed.reference_count, 2);
    assert.isFalse(
      referencesSeed.references.some((item: Record<string, unknown>) =>
        String(item.raw || "").includes("appendix"),
      ),
    );
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
    const preflight = JSON.parse(
      await fs.readFile(
        path.join(runRoot, "runtime", "views", "host-preflight-view.json"),
        "utf8",
      ),
    );
    assert.equal(preflight.target.paper_ref, "1:EIMSDEU3");
    assert.equal(preflight.exported_target_artifacts.length, 3);
    assert.equal(preflight.topic.topic_id, "computer-vision");
    const topicCandidates = JSON.parse(
      await fs.readFile(
        path.join(runRoot, "runtime", "views", "topic-candidates-view.json"),
        "utf8",
      ),
    );
    assert.deepEqual(
      topicCandidates.topics.map(
        (topic: Record<string, unknown>) => topic.topic_id,
      ),
      ["computer-vision"],
    );
    const conceptNeedsAfterBootstrap = JSON.parse(
      await fs.readFile(
        path.join(runRoot, "runtime", "views", "concept-needs-view.json"),
        "utf8",
      ),
    );
    assert.isAtLeast(conceptNeedsAfterBootstrap.items.length, 1);
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
        "topics find-by-paper-ref",
        "paper-artifacts manifest",
        "paper-artifacts export-filtered",
        "reference-index get",
        "paper-artifacts manifest",
        "paper-artifacts export-filtered",
        "citation-graph get-slice",
        "citation-graph get-layout",
        "concepts query",
        "topics get-context",
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
    const topicContext = JSON.parse(
      await fs.readFile(
        path.join(runRoot, "runtime", "views", "topic-context.json"),
        "utf8",
      ),
    );
    assert.equal(topicContext.topic_id, "computer-vision");

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
    const conceptNeeds = JSON.parse(
      await fs.readFile(
        path.join(runRoot, "runtime", "views", "concept-needs-view.json"),
        "utf8",
      ),
    );
    assert.isTrue(
      conceptNeeds.items.some(
        (item: Record<string, unknown>) =>
          item.label === "DETR" && item.status === "resolved_by_host",
      ),
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
    const readingBlocksPath = path.join(
      runRoot,
      "runtime",
      "views",
      "reading-blocks.json",
    );
    const readingBlocksView = JSON.parse(
      await fs.readFile(readingBlocksPath, "utf8"),
    );
    const originalCount = readingBlocksView.blocks.length;
    for (let index = 0; index < 28; index += 1) {
      readingBlocksView.blocks.push({
        block_id: `block-${String(originalCount + index + 1).padStart(4, "0")}`,
        kind: "paragraph",
        role: "main",
        section_anchor: "sec-1-introduction",
        translate: true,
        source_markdown: Array.from(
          { length: 90 },
          (_, wordIndex) => `translation-source-${index}-${wordIndex}`,
        ).join(" "),
      });
    }
    await fs.writeFile(
      readingBlocksPath,
      `${JSON.stringify(readingBlocksView, null, 2)}\n`,
      "utf8",
    );
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
    assert.isAtLeast(result.translation_batch_count, 2);
    assert.notInclude(
      JSON.stringify(result),
      "This paper introduces a small test method",
      "stdout result should not inline source content",
    );

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
    assert.lengthOf(summary.sections, 5);
    assert.notInclude(
      JSON.stringify(summary.sections),
      "This should not appear in the final Summary view.",
    );

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
    assert.isUndefined(unresolved);
    assert.isTrue(
      concepts.unresolved_mentions.some(
        (item: Record<string, unknown>) => item.label === "unresolved keyword",
      ),
    );

    const preface = JSON.parse(
      await fs.readFile(
        path.join(runRoot, "runtime", "views", "preface-view.json"),
        "utf8",
      ),
    );
    assert.deepEqual(
      preface.cards.map((item: Record<string, unknown>) => item.title),
      ["研究领域", "研究方向", "本文位置", "阅读路线"],
    );
    assert.lengthOf(preface.cards, 4);

    const batchView = JSON.parse(
      await fs.readFile(
        path.join(runRoot, "runtime", "views", "translation-batches-view.json"),
        "utf8",
      ),
    );
    assert.isAtLeast(batchView.batch_count, 2);
    assert.equal(
      batchView.required_translation_count,
      batchView.required_block_ids.length,
    );
    const blocks = JSON.parse(
      await fs.readFile(
        path.join(runRoot, "runtime", "views", "reading-blocks.json"),
        "utf8",
      ),
    ).blocks as Array<Record<string, unknown>>;
    const expectedRequiredIds = blocks
      .filter(
        (block) =>
          block.translate === true &&
          block.role !== "bibliography" &&
          block.kind !== "formula",
      )
      .map((block) => block.block_id);
    assert.sameMembers(batchView.required_block_ids, expectedRequiredIds);
    const firstBatch = JSON.parse(
      await fs.readFile(path.join(runRoot, batchView.batches[0].path), "utf8"),
    );
    assert.include(firstBatch.prompt, "Translate every required block fully");
    assert.include(firstBatch.prompt, "Table captions");
    assert.isAtLeast(firstBatch.blocks.length, 1);

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

  it("submits final review and renders a self-contained deep-reading HTML", async function () {
    this.timeout(10000);
    const tempRoot = await fs.mkdtemp(
      path.join(os.tmpdir(), "deep-reading-final-"),
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
    runRuntime(
      [
        "submit-block-translations",
        "--payload",
        "runtime/payloads/block-translations.json",
      ],
      runRoot,
    );
    await writeFinalReview(runRoot);

    const result = runRuntime(
      [
        "submit-final-review",
        "--payload",
        "runtime/payloads/final-review.json",
      ],
      runRoot,
    );
    assert.equal(result.kind, "literature_deep_reading_finalized");
    assert.equal(result.status, "completed");
    assert.equal(result.final_html_available, true);
    assert.equal(result.html_path, "result/deep-reading.html");

    const validation = runRuntime(["validate-final-output"], runRoot);
    assert.deepEqual(validation, { ok: true, errors: [] });

    const html = await fs.readFile(
      path.join(runRoot, "result", "deep-reading.html"),
      "utf8",
    );
    assert.notMatch(html, /\bsrc=["'](?:https?:\/\/|file:\/\/)/i);
    assert.notMatch(html, /\bsrcset=["'](?:https?:\/\/|file:\/\/)/i);
    assert.notMatch(
      html,
      /<(?:link|base)\b[^>]*\bhref=["'](?:https?:\/\/|file:\/\/)/i,
    );
    assert.notMatch(html, /\bhref=["']file:\/\//i);
    assert.notMatch(html, /\b(?:src|href)=["'](?:assets|sections)\//i);
    for (const marker of [
      "data-nav",
      "data-concept-rail",
      'data-mode="compare"',
      "data-preface",
      "data-paper",
      "data-translation-paper",
      "data-summary",
      "data-post-reading",
      "data-appendix-reading",
      "data-citation-graph",
      "data-extensions",
      "data-digest-modal",
    ]) {
      assert.include(html, marker);
    }
    assert.include(html, "data:image/png;base64,");
    assert.include(html, "aligned-block-pair");
    assert.include(html, "data-paper-scroll");
    assert.include(html, "zotero-viewer-warning");
    assert.include(html, "当前处于静态阅读模式");
    assert.include(html, "static-citation-graph");
    assert.include(html, "static-cg-svg");
    assert.include(html, "initScrollTracking");
    assert.include(html, "可能的问题");
    assert.include(html, "引用线索");
    assert.include(html, "math-display");
    assert.include(html, "<math");
    assert.notInclude(html, "math-fallback");
    assert.notInclude(html, "<code>\\");
    assert.include(html, "structured references artifact");
    assert.include(html, "__ZoteroSkillsDeepReadingCitationGraphAssets");
    assert.include(html, "__zoteroSkillsSynthesisGraphExport");
    assert.notInclude(html, "window.__zoteroSkillsSynthesisTopicExport=");
    assert.include(html, "citation-graph-synthesis-frame");
    assert.include(html, "ZoteroSkillsCitationGraph");
    assert.include(html, "window.self !== window.top");
    assert.include(html, "chrome:\\/\\/zotero");
    assert.include(html, "resource:\\/\\/zotero");
    assert.include(html, "zotero_viewer_detected");
    assert.notInclude(html, "<svg viewBox=");

    const sections = JSON.parse(
      await fs.readFile(
        path.join(runRoot, "result", "sections", "sections.json"),
        "utf8",
      ),
    );
    assert.equal(sections.preface.title, "阅读前导读");
    assert.isAtLeast(sections.reading_blocks.length, 1);
    assert.isAtLeast(sections.translation.items.length, 1);
    assert.equal(sections.summary.source, "digest_artifact");
    assert.equal(sections.references.references_source, "artifact");
    assert.equal(sections.references.reference_count, 3);
    assert.isAtLeast(sections.appendix_reading_blocks.length, 1);
    assert.isTrue(
      sections.appendix_reading_blocks.some((item: Record<string, unknown>) =>
        String(item.source_markdown || "").includes(
          "additional experimental details",
        ),
      ),
    );
    assert.isFalse(
      sections.reading_blocks.some((item: Record<string, unknown>) =>
        String(item.source_markdown || "").includes("Example reference title"),
      ),
    );
    assert.isFalse(
      sections.appendix_reading_blocks.some((item: Record<string, unknown>) =>
        String(item.source_markdown || "").includes("Example reference title"),
      ),
    );
    assert.isTrue(
      sections.reading_blocks.some((item: Record<string, unknown>) =>
        String(item.source_html || "").includes("math-display"),
      ),
    );
    const tableWithMath = sections.reading_blocks.find(
      (item: Record<string, unknown>) =>
        item.kind === "table" &&
        String(item.source_markdown || "").includes("$42"),
    ) as Record<string, unknown> | undefined;
    assert.isOk(tableWithMath);
    assert.include(String(tableWithMath?.source_html || ""), "<math");
    assert.include(String(tableWithMath?.translation_html || ""), "<math");
    assert.notInclude(String(tableWithMath?.source_html || ""), "$42");
    assert.notInclude(String(tableWithMath?.translation_html || ""), "$42");
    assert.isAtLeast(sections.concepts.concepts.length, 1);
    assert.isAtLeast(sections.citation_graph.layout.nodes.length, 1);
    assert.equal(
      sections.citation_graph.model.renderer,
      "zotero-skills-citation-graph-standalone",
    );
    assert.equal(sections.citation_graph.synthesis_export_envelope.version, 1);
    assert.equal(
      sections.citation_graph.synthesis_export_envelope.i18n.locale,
      "zh-CN",
    );
    assert.include(
      sections.citation_graph.synthesis_export_envelope.scopeLabel,
      "2 跳",
    );
    assert.equal(
      sections.citation_graph.synthesis_export_envelope.focusNodeId,
      "zotero:item:EIMSDEU3",
    );
    assert.isAtLeast(
      sections.citation_graph.synthesis_export_envelope.snapshot.graph
        .visibleNodes.length,
      1,
    );
    assert.isAtLeast(
      sections.citation_graph.synthesis_export_envelope.snapshot.graph
        .visibleEdges.length,
      1,
    );
    assert.property(
      sections.citation_graph.synthesis_export_envelope.graphLayouts,
      "force",
    );
    const focusNode =
      sections.citation_graph.synthesis_export_envelope.snapshot.graph.visibleNodes.find(
        (node: Record<string, unknown>) => node.id === "zotero:item:EIMSDEU3",
      );
    assert.isOk(focusNode);
    assert.equal(focusNode?.focus_role, "current_paper");
    assert.equal(focusNode?.is_focus, true);
    assert.deepEqual(focusNode?.authors, ["Jane Doe"]);
    const neighborNode =
      sections.citation_graph.synthesis_export_envelope.snapshot.graph.visibleNodes.find(
        (node: Record<string, unknown>) => node.id === "zotero:item:A",
      );
    assert.deepEqual(neighborNode?.authors, ["Alice Smith", "Bob Lee"]);
    assert.deepEqual(
      sections.citation_graph.model.nodes.find(
        (node: Record<string, unknown>) => node.id === "zotero:item:EIMSDEU3",
      )?.authors,
      ["Jane Doe"],
    );
    assert.deepEqual(
      sections.citation_graph.model.nodes.find(
        (node: Record<string, unknown>) => node.id === "zotero:item:A",
      )?.authors,
      ["Alice Smith", "Bob Lee"],
    );
    assert.isAtLeast(sections.citation_graph.model.nodes.length, 1);
    assert.isAtLeast(sections.citation_graph.model.edges.length, 1);
    assert.equal(
      sections.citation_graph.model.diagnostics.layout_status,
      "ready",
    );
    assert.isAtLeast(
      sections.citation_graph.model.diagnostics.drawable_node_count,
      1,
    );
    assert.isObject(
      sections.citation_graph.model.diagnostics.coordinate_bounds,
    );
    assert.isAtLeast(sections.extensions.items.length, 1);
    assert.isTrue(
      sections.references.items.some(
        (item: Record<string, unknown>) =>
          (item as { digest_modal?: { available?: boolean } }).digest_modal
            ?.available === true,
      ),
    );

    const manifest = JSON.parse(
      await fs.readFile(
        path.join(runRoot, "result", "deep-reading-manifest.json"),
        "utf8",
      ),
    );
    assert.equal(manifest.final_html_available, true);
    assert.equal(manifest.entrypoint, "result/deep-reading.html");

    const { chromium } = await import("playwright");
    const browser = await chromium.launch();
    try {
      const page = await browser.newPage({
        viewport: { width: 1440, height: 1000 },
      });
      await page.goto(
        pathToFileURL(
          path.join(runRoot, "result", "deep-reading.html"),
        ).toString(),
      );
      await page.waitForSelector("[data-citation-graph-synthesis-frame]", {
        timeout: 20_000,
      });
      await page.waitForFunction(() => {
        const frame = document.querySelector(
          "[data-citation-graph-synthesis-frame]",
        ) as HTMLIFrameElement | null;
        const doc = frame?.contentDocument;
        return Boolean(doc?.querySelector(".graph-shell canvas"));
      });
      const graphState = await page.evaluate(() => {
        const section = document.querySelector("[data-citation-graph]");
        const frame = document.querySelector(
          "[data-citation-graph-synthesis-frame]",
        ) as HTMLIFrameElement | null;
        const doc = frame?.contentDocument;
        const app = doc?.querySelector("#app");
        const appRect = app?.getBoundingClientRect();
        const appStyle = app ? doc?.defaultView?.getComputedStyle(app) : null;
        const stage = doc?.querySelector(".graph-stage");
        const rect = stage?.getBoundingClientRect();
        return {
          status: section?.getAttribute("data-zs-cg-status"),
          error: section?.getAttribute("data-zs-cg-error"),
          fallback: section?.getAttribute("data-zs-cg-fallback"),
          hasGraphShell: Boolean(doc?.querySelector(".graph-shell")),
          hasTopicTabs: Boolean(doc?.querySelector(".topic-detail-tabs")),
          hasTimeline: Boolean(doc?.querySelector(".topic-timeline")),
          hasTopicToolbar: Boolean(doc?.querySelector(".topic-detail-toolbar")),
          hasControlDrawer: Boolean(
            doc?.querySelector(".graph-control-drawer"),
          ),
          hasZoomSlider: Boolean(doc?.querySelector(".graph-zoom-slider")),
          hasLegend: Boolean(doc?.querySelector(".citation-graph-legend")),
          hasHorizontalLegend: Boolean(
            doc?.querySelector(".citation-graph-legend-horizontal"),
          ),
          scopeLabel:
            doc?.querySelector(".graph-scope-badge")?.textContent?.trim() || "",
          canvasCount: stage?.querySelectorAll("canvas").length || 0,
          appDisplay: appStyle?.display || "",
          appWidth: appRect?.width || 0,
          width: rect?.width || 0,
          height: rect?.height || 0,
        };
      });
      assert.equal(graphState.status, "ready", graphState.error || "");
      assert.isNull(graphState.fallback);
      assert.isTrue(graphState.hasGraphShell);
      assert.isFalse(graphState.hasTopicTabs);
      assert.isFalse(graphState.hasTimeline);
      assert.isFalse(graphState.hasTopicToolbar);
      assert.isFalse(graphState.hasControlDrawer);
      assert.isTrue(graphState.hasZoomSlider);
      assert.isTrue(graphState.hasLegend);
      assert.isTrue(graphState.hasHorizontalLegend);
      assert.include(graphState.scopeLabel, "2 跳");
      assert.isAtLeast(graphState.canvasCount, 1);
      assert.equal(graphState.appDisplay, "block");
      assert.isAtLeast(graphState.appWidth, graphState.width);
      assert.isAtLeast(graphState.width, 520);
      assert.isAtLeast(graphState.height, 360);

      const browserState = await page.evaluate(() => {
        const warning = document.querySelector(
          "[data-zotero-viewer-warning]",
        ) as HTMLElement | null;
        return {
          jsReady: document.body.classList.contains("js-ready"),
          zoteroWarningDisplay: warning
            ? getComputedStyle(warning).display
            : "",
          staticGraphCount: document.querySelectorAll(
            "[data-static-citation-graph]",
          ).length,
          prefaceCount: document.querySelectorAll("[data-preface] h1").length,
        };
      });
      assert.isTrue(browserState.jsReady);
      assert.equal(browserState.zoteroWarningDisplay, "none");
      assert.equal(browserState.staticGraphCount, 0);
      assert.equal(browserState.prefaceCount, 1);

      const noJsPage = await browser.newPage({
        viewport: { width: 1440, height: 1000 },
        javaScriptEnabled: false,
      });
      try {
        await noJsPage.goto(
          pathToFileURL(
            path.join(runRoot, "result", "deep-reading.html"),
          ).toString(),
        );
        const staticState = await noJsPage.evaluate(() => ({
          navItems: document.querySelectorAll("[data-toc] a").length,
          preface: document.querySelectorAll("[data-preface] h1").length,
          readingBlocks: document.querySelectorAll(".aligned-block-pair")
            .length,
          references: document.querySelectorAll(".structured-references")
            .length,
          staticGraph: document.querySelectorAll(
            "[data-static-citation-graph] .static-cg-svg",
          ).length,
          staticWarning:
            document.body.textContent?.includes("当前处于静态阅读模式"),
        }));
        assert.isAtLeast(staticState.navItems, 5);
        assert.equal(staticState.preface, 1);
        assert.isAtLeast(staticState.readingBlocks, 1);
        assert.equal(staticState.references, 1);
        assert.equal(staticState.staticGraph, 1);
        assert.isTrue(staticState.staticWarning);
      } finally {
        await noJsPage.close();
      }

      const zoteroPage = await browser.newPage({
        viewport: { width: 1440, height: 1000 },
      });
      try {
        await zoteroPage.addInitScript(() => {
          (window as unknown as { Zotero?: unknown }).Zotero = {};
        });
        await zoteroPage.goto(
          pathToFileURL(
            path.join(runRoot, "result", "deep-reading.html"),
          ).toString(),
        );
        await zoteroPage.waitForSelector("[data-citation-graph] .zs-cg-svg", {
          timeout: 20_000,
        });
        const zoteroState = await zoteroPage.evaluate(() => {
          const section = document.querySelector("[data-citation-graph]");
          const warning = document.querySelector(
            "[data-zotero-viewer-warning]",
          ) as HTMLElement | null;
          return {
            zoteroClass: document.body.classList.contains(
              "zotero-viewer-detected",
            ),
            warningVisible: warning
              ? getComputedStyle(warning).display !== "none"
              : false,
            fallback: section?.getAttribute("data-zs-cg-fallback"),
            fallbackReason: section?.getAttribute("data-zs-cg-fallback-reason"),
            iframeCount: document.querySelectorAll(
              "[data-citation-graph-synthesis-frame]",
            ).length,
            svgCount: document.querySelectorAll(
              "[data-citation-graph] .zs-cg-svg",
            ).length,
          };
        });
        assert.isTrue(zoteroState.zoteroClass);
        assert.isTrue(zoteroState.warningVisible);
        assert.equal(zoteroState.fallback, "standalone");
        assert.equal(zoteroState.fallbackReason, "zotero_viewer_detected");
        assert.equal(zoteroState.iframeCount, 0);
        assert.equal(zoteroState.svgCount, 1);
      } finally {
        await zoteroPage.close();
      }
    } finally {
      await browser.close();
    }
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

  for (const targetLanguage of ["fr-FR", "zh-CN"]) {
    it(`rejects copied source text as translation for ${targetLanguage}`, async function () {
      const tempRoot = await fs.mkdtemp(
        path.join(os.tmpdir(), "deep-reading-copy-translation-"),
      );
      const bundlePath = await makeSourceBundle(tempRoot);
      const runRoot = path.join(tempRoot, "run");
      await fs.mkdir(path.join(runRoot, "runtime"), { recursive: true });
      await fs.writeFile(
        path.join(runRoot, "runtime", "input.json"),
        JSON.stringify(
          {
            source_bundle_path: bundlePath,
            parameter: { target_language: targetLanguage },
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

      const blocks = JSON.parse(
        await fs.readFile(
          path.join(runRoot, "runtime", "views", "reading-blocks.json"),
          "utf8",
        ),
      ).blocks as Array<Record<string, unknown>>;
      const copiedBlock = blocks.find(
        (block) => block.translate === true && block.kind === "paragraph",
      )!;
      const payloadPath = path.join(
        runRoot,
        "runtime",
        "payloads",
        "block-translations.json",
      );
      const payload = JSON.parse(await fs.readFile(payloadPath, "utf8"));
      const row = payload.translations.find(
        (entry: Record<string, unknown>) =>
          entry.block_id === copiedBlock.block_id,
      );
      row.translated_markdown = copiedBlock.source_markdown;
      await fs.writeFile(payloadPath, JSON.stringify(payload, null, 2), "utf8");

      const result = runRuntimeAllowFailure(
        [
          "submit-block-translations",
          "--payload",
          "runtime/payloads/block-translations.json",
        ],
        runRoot,
      );
      assert.equal(result.exitCode, 1);
      assert.include(JSON.stringify(result.output.error), "copies source text");
    });
  }

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
