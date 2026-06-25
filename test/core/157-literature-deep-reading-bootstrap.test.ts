import { assert } from "chai";
import { execFileSync } from "child_process";
import fs from "fs/promises";
import fsSync from "fs";
import os from "os";
import path from "path";
import { pathToFileURL } from "url";
import {
  compileSkillJsonSchema,
  type AcpSkillSchemaKey,
  validateSkillSchemaAnnotations,
} from "../../src/modules/acpSkillSchemaAssets";
import { scanPluginSkillRegistry } from "../../src/modules/pluginSkillRegistry";
import { renderLiteratureDeepReadingSkill } from "../../skills_src/literature-deep-reading/renderer/render_literature_deep_reading_skill";

const suiteRoot = path.join("skills_src", "literature-deep-reading");
const skillRoot = path.join("skills_builtin", "literature-deep-reading");

async function assertFileExists(filePath: string) {
  await fs.access(filePath);
}

function collectStringTitlePaths(value: unknown, pathParts: string[] = []) {
  const paths: string[] = [];
  if (!value || typeof value !== "object") {
    return paths;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      paths.push(
        ...collectStringTitlePaths(item, [...pathParts, String(index)]),
      );
    });
    return paths;
  }
  for (const [key, child] of Object.entries(value)) {
    const childPath = [...pathParts, key];
    if (key === "title" && typeof child === "string") {
      paths.push(childPath.join("."));
    }
    paths.push(...collectStringTitlePaths(child, childPath));
  }
  return paths;
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

function pythonCommand(args: string[], cwd: string, env?: NodeJS.ProcessEnv) {
  const arProject = path.join(os.homedir(), ".ar");
  const arPyproject = path.join(arProject, "pyproject.toml");
  const processEnv = { ...process.env, ...env };
  if (fsSync.existsSync(arPyproject)) {
    return execFileSync(
      "uv",
      ["run", `--project=${arProject}`, "--locked", "--", "python", ...args],
      { cwd, encoding: "utf8", stdio: "pipe", env: processEnv },
    );
  }
  return execFileSync(process.env.PYTHON || "python", args, {
    cwd,
    encoding: "utf8",
    stdio: "pipe",
    env: processEnv,
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

function runRuntime(args: string[], cwd: string, env?: NodeJS.ProcessEnv) {
  const scriptPath = path.resolve(
    "skills_builtin",
    "literature-deep-reading",
    "scripts",
    "deep_reading_runtime.py",
  );
  return JSON.parse(pythonCommand([scriptPath, ...args], cwd, env));
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

async function readRuntimeView(runRoot: string, fileName: string) {
  return JSON.parse(
    await fs.readFile(path.join(runRoot, "runtime", "views", fileName), "utf8"),
  );
}

async function writeRemotePaperArtifactsManifest(
  runRoot: string,
  manifestPath: string,
  paperRefs: string[],
  artifactTypes: string[],
) {
  const papers = [];
  for (const paperRef of paperRefs) {
    const safe = paperRef.replace(/[^A-Za-z0-9_.-]+/g, "_");
    const artifactDir = path.join(
      runRoot,
      "runtime",
      "payloads",
      "remote-artifacts",
      safe,
    );
    await fs.mkdir(artifactDir, { recursive: true });
    const artifacts = [];
    for (const type of artifactTypes) {
      if (type === "digest") {
        const contentFile = `runtime/payloads/remote-artifacts/${safe}/digest.md`;
        await fs.writeFile(
          path.join(runRoot, contentFile),
          `# Remote digest for ${paperRef}\n`,
          "utf8",
        );
        artifacts.push({
          artifact_type: "digest",
          payload_type: "digest-markdown",
          content_file: contentFile,
          status: "available",
        });
      } else if (type === "references") {
        const contentFile = `runtime/payloads/remote-artifacts/${safe}/references.json`;
        await fs.writeFile(
          path.join(runRoot, contentFile),
          JSON.stringify({
            references: [{ id: "ref-remote", title: "Remote Reference" }],
          }),
          "utf8",
        );
        artifacts.push({
          artifact_type: "references",
          payload_type: "references-json",
          content_file: contentFile,
          status: "available",
        });
      } else if (type === "citation_analysis") {
        const contentFile = `runtime/payloads/remote-artifacts/${safe}/citation-analysis.md`;
        await fs.writeFile(
          path.join(runRoot, contentFile),
          `# Remote citation analysis for ${paperRef}\n`,
          "utf8",
        );
        artifacts.push({
          artifact_type: "citation_analysis",
          payload_type: "citation-analysis-markdown",
          content_file: contentFile,
          status: "available",
        });
      }
    }
    papers.push({ paper_ref: paperRef, artifacts, diagnostics: [] });
  }
  await fs.mkdir(path.dirname(path.join(runRoot, manifestPath)), {
    recursive: true,
  });
  await fs.writeFile(
    path.join(runRoot, manifestPath),
    JSON.stringify({ papers }, null, 2),
    "utf8",
  );
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

function postReferencesAppendixAlignment() {
  return {
    format: "v1",
    doc_id: "D2",
    source_language: "en",
    target_language: "zh-CN",
    metadata: {
      source: "test",
    },
    blocks: [
      {
        b: "b_001",
        type: "heading",
        heading: "Paper > Sample Paper",
        source_markdown: "# Sample Paper",
        translated_markdown: "# 示例论文",
        pairs: [],
      },
      {
        b: "b_002",
        type: "paragraph",
        heading: "Paper > Sample Paper",
        source_markdown: "The main body introduces the method.",
        translated_markdown: "正文介绍该方法。",
        pairs: [],
      },
      {
        b: "b_003",
        type: "heading",
        heading: "Paper > References",
        source_markdown: "## References",
        translated_markdown: "## 参考文献",
        pairs: [],
      },
      {
        b: "b_004",
        type: "paragraph",
        heading: "Paper > References",
        source_markdown:
          "Abadi, M. Tensorflow: A system for large-scale machine learning. 2016.",
        translated_markdown:
          "Abadi, M. Tensorflow: A system for large-scale machine learning. 2016.",
        pairs: [],
      },
      {
        b: "b_005",
        type: "heading",
        heading: "Paper > A. Linear-probe evaluation",
        source_markdown: "## A. Linear-probe evaluation",
        translated_markdown: "## A. 线性探针评估",
        pairs: [],
      },
      {
        b: "b_006",
        type: "paragraph",
        heading: "Paper > A. Linear-probe evaluation",
        source_markdown:
          "We provide additional details for linear probe experiments.",
        translated_markdown: "我们提供线性探针实验的更多细节。",
        pairs: [],
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
        selected_topic_id: "computer-vision",
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
            title: "研究领域",
            body: "目标检测领域正在从手工后处理管线转向端到端集合预测。",
          },
          {
            title: "研究方向",
            body: "本文位于以 Transformer 解码器和 object queries 为核心的直接预测路线。",
          },
          {
            title: "本文位置",
            body: "它在 2020 年把检测任务重新组织为集合预测，是该路线的重要节点。",
          },
          {
            title: "核心创新",
            body: "本文解决了候选框去重依赖问题，并为后续端到端检测研究提供了基础。",
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
  options?: {
    layoutStatus?: string;
    exportTargetArtifacts?: boolean;
    remoteExportFiltered?: "bootstrap" | "referenceDigests";
    topicCandidates?: Array<Record<string, unknown>>;
  },
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
const remoteExportFiltered = ${JSON.stringify(options?.remoteExportFiltered || "")};
const topicCandidates = ${JSON.stringify(
      options?.topicCandidates || [
        {
          topic_id: "computer-vision",
          title: "Computer Vision",
          status: "active",
          matched_paper_refs: ["1:EIMSDEU3"],
          match_sources: ["current_dependencies"],
        },
      ],
    )};
function topicDigest(topicId) {
  const title = topicId === "object-detection" ? "Object Detection" : topicId === "vision-transformers" ? "Vision Transformers" : "Computer Vision";
  return {
    topic_id: topicId,
    title,
    definition: title + " topic definition.",
    summary: {
      brief: title + " compact digest.",
      overview: title + " overview for candidate comparison.",
      report_excerpt: title + " report excerpt."
    },
    paper_count: 3,
    external_literature_count: 1,
    diagnostics: []
  };
}
function topicSemantic(topicId) {
  const digest = topicDigest(topicId);
  return {
    topic_id: topicId,
    language: "zh-CN",
    topic: {
      id: topicId,
      title: digest.title,
      definition: digest.definition,
      research_field: "Computer vision"
    },
    summary: digest.summary,
    taxonomy: {
      summary: { text: "Taxonomy organizes detection and transformer routes." },
      axes: [
        {
          axis_type: "research_route",
          axis_rationale: "Routes separate detection formulation from backbone design.",
          nodes: [
            {
              id: "route:detection",
              title: "Detection route",
              definition: "Direct set prediction route.",
              source_paper_refs: ["1:EIMSDEU3", "1:A"]
            }
          ]
        }
      ]
    },
    timeline_events: {
      summary: { text: "The topic timeline moves from classical detection to transformer-based set prediction." },
      events: [
        { id: "event:cnn", label: "CNN era", year: 2015, description: "CNN detectors establish the baseline.", source_paper_refs: ["1:A"] },
        { id: "event:set", label: "Set prediction", year: 2020, description: "Direct set prediction becomes central.", source_paper_refs: ["1:EIMSDEU3"] }
      ]
    },
    source_papers: [
      { paper_ref: "1:A", item_key: "A", title: "Library Paper A", year: 2015, synthesis_role: "foundation" },
      { paper_ref: "1:B", item_key: "B", title: "Reference index bound title", year: 2018, synthesis_role: "foundation" },
      { paper_ref: "1:EIMSDEU3", item_key: "EIMSDEU3", title: "Sample Paper", year: 2020, synthesis_role: "milestone" }
    ],
    diagnostics: []
  };
}
if (command === "reference-index get") {
  reply({
    rows: [
      {
        paper_ref: "1:EIMSDEU3",
        zoteroItemKey: "EIMSDEU3",
        title: "Sample Paper",
        reference_count: 2,
        unbound_reference_count: 0,
        artifacts: {
          digest: { status: "available" },
          references: { status: "available" },
          citation_analysis: { status: "available" }
        },
        references: [
          {
            reference_instance_id: "ref-3",
            reference_index: 3,
            title: "Reference index bound title",
            target_paper_ref: "1:B",
            target_literature_item_id: "1:B",
            target_title: "Reference index bound title",
            target_binding: "library",
            binding_status: "accepted",
            confidence: "high"
          },
          {
            reference_instance_id: "ref-2",
            reference_index: 2,
            title: "External reference title",
            target_paper_ref: "ext:C",
            target_title: "External reference title",
            target_binding: "external",
            binding_status: "accepted"
          }
        ]
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
  const types = input.artifact_types || ["digest"];
  const exportPhase = types.includes("references") || types.includes("citation_analysis") || types.includes("citation-analysis") ? "bootstrap" : "referenceDigests";
  if (remoteExportFiltered === exportPhase) {
    const remoteManifestFile = exportPhase === "bootstrap"
      ? "runtime/payloads/remote-bootstrap-paper-artifacts-manifest.json"
      : "runtime/payloads/remote-reference-digests-paper-artifacts-manifest.json";
    reply({
      exported: 0,
      manifest_file: remoteManifestFile,
      delivery: {
        mode: "bridge-download",
        downloadCommand: "zotero-bridge file download file-remote-artifacts --output paper-artifacts.zip",
        unpackHint: "unzip paper-artifacts.zip -d .",
        manifest_file: remoteManifestFile
      },
      diagnostics: []
    });
    return;
  }
  const papers = [];
  for (const paperRef of input.paper_refs) {
    const safe = paperRef.replace(/[^A-Za-z0-9_.-]+/g, "_");
    const dir = path.resolve(process.cwd(), targetDir, safe);
    fs.mkdirSync(dir, { recursive: true });
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
} else if (command === "paper-artifacts resolve-topic-digest") {
  const paperRef = input.paper_ref || input.paperRef || input.digest_ref?.paper_ref || input.digestRef?.paper_ref || "1:B";
  reply({
    ok: true,
    status: "available",
    paper_ref: paperRef,
    note_key: "digest-note-" + String(paperRef).replace(/[^A-Za-z0-9_.-]+/g, "_"),
    digest_markdown: "# Resolved digest for " + paperRef + "\\n\\n## Key idea\\nResolved digest body.",
    representative_image: {
      status: "available",
      data_url: "data:image/png;base64,iVBORw0KGgo=",
      alt: "Representative image",
      caption: "Representative image",
      width: 320,
      height: 180
    },
    source_changed: false,
    diagnostics: []
  });
} else if (command === "topics find-by-paper-ref") {
  reply({
    ok: true,
    status: "ok",
    paper_refs: [input.paper_ref || input.paperRef],
    topics: topicCandidates,
    diagnostics: { requested_count: 1, matched_topic_count: topicCandidates.length, unmatched_paper_refs: [], source: "artifact_state" }
  });
} else if (command === "topics get-context") {
  const topicId = input.topicId || input.topic_id;
  if (input.view === "semantic") {
    reply({
      schema_id: "synthesis.topic_context",
      schema_version: "2.0.0",
      topic_id: topicId,
      view: "semantic",
      semantic: topicSemantic(topicId)
    });
  } else if (input.view === "digest") {
    reply({
      schema_id: "synthesis.topic_context",
      schema_version: "2.0.0",
      topic_id: topicId,
      view: "digest",
      digest: topicDigest(topicId)
    });
  } else {
  reply({
    topic_id: topicId,
    title: "Computer Vision",
    summary: "Topic context for the selected paper.",
    diagnostics: []
  });
  }
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

  it("resolves Host Bridge CLI from PATH when run-local shim is absent", async function () {
    const tempRoot = await fs.mkdtemp(
      path.join(os.tmpdir(), "bridge-path-resolution-"),
    );
    const binDir = path.join(tempRoot, "bin");
    const runRoot = path.join(tempRoot, "run");
    await fs.mkdir(binDir, { recursive: true });
    await fs.mkdir(runRoot, { recursive: true });
    const bridgeName =
      process.platform === "win32" ? "zotero-bridge.cmd" : "zotero-bridge";
    const bridgePath = path.join(binDir, bridgeName);
    if (process.platform === "win32") {
      await fs.writeFile(bridgePath, "@echo off\r\n", "utf8");
    } else {
      await fs.writeFile(bridgePath, "#!/usr/bin/env sh\n", "utf8");
      await fs.chmod(bridgePath, 0o755);
    }
    const probePath = path.join(tempRoot, "probe_bridge.py");
    await fs.writeFile(
      probePath,
      [
        "from pathlib import Path",
        "import importlib.util",
        "import sys",
        "module_path = Path(sys.argv[1])",
        "run_root = Path(sys.argv[2])",
        "spec = importlib.util.spec_from_file_location('runtime_module', module_path)",
        "module = importlib.util.module_from_spec(spec)",
        "assert spec.loader is not None",
        "spec.loader.exec_module(module)",
        "print(Path(module.bridge_executable(run_root)).name)",
        "",
      ].join("\n"),
      "utf8",
    );
    const env = {
      PATH: `${binDir}${path.delimiter}${process.env.PATH || ""}`,
      ZOTERO_BRIDGE_BIN: "",
    };
    const deepName = pythonCommand(
      [
        probePath,
        path.resolve(
          "skills_src/literature-deep-reading/runtime/deep_reading_runtime.py",
        ),
        runRoot,
      ],
      process.cwd(),
      env,
    ).trim();
    const topicName = pythonCommand(
      [
        probePath,
        path.resolve(
          "skills_src/topic-synthesis/runtime/topic_synthesis_runtime/common/topic_synthesis_db.py",
        ),
        runRoot,
      ],
      process.cwd(),
      env,
    ).trim();
    assert.equal(deepName, bridgeName);
    assert.equal(topicName, bridgeName);
  });

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
      "renderer/templates/markdown-renderer.css",
      "renderer/templates/markdown-renderer.js",
      "renderer/templates/citation-graph-synthesis-app.js",
      "renderer/templates/citation-graph-synthesis.css",
      "renderer/templates/citation-graph-synthesis-theme.js",
      "renderer/templates/citation-graph-synthesis-i18n.json",
      "renderer/templates/citation-graph-standalone.css",
      "renderer/templates/citation-graph-standalone.js",
      "renderer/templates/topic-timeline-shared.css",
      "renderer/templates/topic-timeline-shared.js",
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
      "renderer/templates/markdown-renderer.css",
      "renderer/templates/markdown-renderer.js",
      "renderer/templates/citation-graph-synthesis-app.js",
      "renderer/templates/citation-graph-synthesis.css",
      "renderer/templates/citation-graph-synthesis-theme.js",
      "renderer/templates/citation-graph-synthesis-i18n.json",
      "renderer/templates/citation-graph-standalone.css",
      "renderer/templates/citation-graph-standalone.js",
      "renderer/templates/topic-timeline-shared.css",
      "renderer/templates/topic-timeline-shared.js",
    ];
    for (const filePath of requiredGeneratedFiles) {
      await assertFileExists(path.join(skillRoot, filePath));
    }

    const deepReadingCss = await fs.readFile(
      path.join(suiteRoot, "renderer", "templates", "deep-reading.css"),
      "utf8",
    );
    const timelineCss = await fs.readFile(
      path.join(
        suiteRoot,
        "renderer",
        "templates",
        "topic-timeline-shared.css",
      ),
      "utf8",
    );
    for (const root of [suiteRoot, skillRoot]) {
      const citationGraphApp = await fs.readFile(
        path.join(
          root,
          "renderer",
          "templates",
          "citation-graph-synthesis-app.js",
        ),
        "utf8",
      );
      const citationGraphCss = await fs.readFile(
        path.join(
          root,
          "renderer",
          "templates",
          "citation-graph-synthesis.css",
        ),
        "utf8",
      );
      assert.include(citationGraphApp, "has-citation-list");
      assert.include(citationGraphApp, "synthesis-graph-citations-title");
      assert.include(citationGraphCss, ".selected-detail.has-citation-list");
      assert.notInclude(citationGraphCss, "max-height: min(420px, 48vh);");
    }
    assert.notInclude(deepReadingCss, ".topic-timeline {");
    assert.include(timelineCss, ".topic-timeline {");
    assert.include(timelineCss, ".timeline-hover-popover");
    assert.include(deepReadingCss, ".preface-topic-timeline .timeline-scroll");
    assert.include(deepReadingCss, "height: 82px;");
  });

  it("keeps output schemas free of schema title annotations", async function () {
    for (const schemaPath of [
      path.join(suiteRoot, "assets", "output.schema.json"),
      path.join(skillRoot, "assets", "output.schema.json"),
    ]) {
      const schema = JSON.parse(await fs.readFile(schemaPath, "utf8"));
      assert.deepEqual(
        collectStringTitlePaths(schema),
        [],
        `${schemaPath} should not spend output-token context on schema title annotations`,
      );
    }
  });

  it("keeps source and generated schemas compatible with Skill Runner meta-schemas", async function () {
    for (const root of [suiteRoot, skillRoot]) {
      for (const schemaKey of [
        "input",
        "parameter",
        "output",
      ] satisfies AcpSkillSchemaKey[]) {
        const schema = JSON.parse(
          await fs.readFile(
            path.join(root, "assets", `${schemaKey}.schema.json`),
            "utf8",
          ),
        ) as Record<string, unknown>;
        assert.deepEqual(
          [
            ...compileSkillJsonSchema({ schema, schemaKey }),
            ...validateSkillSchemaAnnotations({ schema, schemaKey }),
          ],
          [],
          `${root} ${schemaKey} schema must satisfy Skill Runner meta-schema`,
        );
      }
    }
  });

  it("keeps skill and runner instructions packet-first and gate-driven", async function () {
    const sourceSkill = await fs.readFile(
      path.join(suiteRoot, "templates", "SKILL.md"),
      "utf8",
    );
    const generatedSkill = await fs.readFile(
      path.join(skillRoot, "SKILL.md"),
      "utf8",
    );
    const runner = JSON.parse(
      await fs.readFile(path.join(skillRoot, "assets", "runner.json"), "utf8"),
    );
    const runnerPrompt = String(runner.entrypoint.prompts.common);

    for (const content of [sourceSkill, generatedSkill]) {
      assert.include(content, "## 任务目标");
      assert.include(content, "## 职责分工");
      assert.include(content, "## 通用注意事项");
      assert.include(content, "原文是主角");
      assert.include(content, "译文、topic/context、citation graph");
      assert.include(
        content,
        "不要把本 skill 当作通用综述生成器、纯翻译任务或普通报告生成器",
      );
      assert.include(content, "LLM 必须负责");
      assert.include(content, "runtime 必须负责");
      assert.include(content, "不要手工编辑 `runtime/views/*`");
      assert.include(content, "不要用临时脚本替代 LLM 完成论文摘要");
      assert.include(content, "subagent 只处理单个 runtime batch");
      assert.include(
        content,
        "`batch_id`、`translations[]` 和 `quality_notes[]`",
      );
      assert.include(content, "主 agent 合并 batch 结果后写");
      assert.include(
        content,
        "Stage 10 payload 必须表达明确的外部 context 意图",
      );
      assert.include(content, "Stage 20 payload 必须满足最低内容标准");
      assert.include(
        content,
        "`background`、`baseline`、`contrast`、`component`、`dataset`、`tooling`、`historical`、`uncategorized`",
      );
      assert.include(content, "不要提交单独的 `category` 字段");
      assert.include(
        content,
        "validate 失败时，按错误中的 `block_id` 或字段名定点修复",
      );
      assert.include(content, "stage-10-agent-packet.json");
      assert.include(content, "stage-30-translation-worklist.json");
      assert.include(content, "stage-40-review-packet.json");
      assert.include(
        content,
        "每次 `submit-*` 成功后，必须立即运行对应的 `validate-*` 命令",
      );
      for (const historicalMarker of [
        "旧版",
        "历史协议",
        "deprecated",
        "previous version",
        "changelog",
      ]) {
        assert.notInclude(content, historicalMarker);
      }
      assert.notInclude(
        content,
        "Stage 20 完成后，继续阅读：\n\n- `runtime/views/reading-blocks.json`",
      );
      assert.notInclude(
        content,
        "Stage 30 完成后，继续阅读：\n\n- `runtime/views/translation-view.json`",
      );
    }

    assert.isBelow(runnerPrompt.length, 700);
    assert.include(
      runnerPrompt,
      "Treat SKILL.md as the authoritative procedure",
    );
    assert.include(runnerPrompt, "scripts/deep_reading_runtime.py bootstrap");
    assert.include(runnerPrompt, "runtime/input.json");
    assert.include(runnerPrompt, "stage agent packets");
    assert.include(runnerPrompt, "submit/validate gates");
    assert.include(runnerPrompt, "literature-deep-reading.result.json");
    assert.notInclude(runnerPrompt, "Recommended citation role words");
    assert.notInclude(runnerPrompt, "exactly four preface cards");
    assert.notInclude(runnerPrompt, "Main agent merges batch JSON");
    assert.notInclude(
      runnerPrompt,
      "fixes only the block_ids or fields named by validation errors",
    );
    assert.notInclude(
      runnerPrompt,
      "Next read runtime/views/translation-batches-view.json.",
    );
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
    assert.equal(entry.sourceKind, "official");
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

    const stage10Packet = await readRuntimeView(
      runRoot,
      "stage-10-agent-packet.json",
    );
    assert.equal(
      stage10Packet.stage_id,
      "stage_10_source_reading_context_request",
    );
    assert.equal(
      stage10Packet.payload_path,
      "runtime/payloads/context-request.json",
    );
    assert.include(stage10Packet.submit_command, "submit-context-request");
    assert.include(stage10Packet.validate_command, "validate-context-request");
    assert.property(stage10Packet.trace_paths, "source_reading");
    assert.property(stage10Packet.trace_paths, "diagnostics");
    assert.notInclude(
      JSON.stringify(stage10Packet),
      "This paper introduces a small test method.",
    );

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
    assert.equal(referencesSeed.source, "markdown");
    assert.equal(referencesSeed.reference_count, 2);
    assert.isTrue(
      referencesSeed.raw_items.every(
        (item: Record<string, unknown>) =>
          typeof item.raw_markdown === "string",
      ),
    );
  });

  it("stops bootstrap on remote paper artifact export until the bridge bundle is unpacked", async function () {
    const tempRoot = await fs.mkdtemp(
      path.join(os.tmpdir(), "deep-reading-bootstrap-remote-export-"),
    );
    const bundlePath = await makeSourceBundle(tempRoot);
    const runRoot = path.join(tempRoot, "run");
    await fs.mkdir(path.join(runRoot, "runtime"), { recursive: true });
    await fs.writeFile(
      path.join(runRoot, "runtime", "input.json"),
      JSON.stringify({ source_bundle_path: bundlePath }, null, 2),
      "utf8",
    );
    await installFakeBridge(runRoot, { remoteExportFiltered: "bootstrap" });

    const blocked = runRuntimeAllowFailure(
      ["bootstrap", "--input", "runtime/input.json"],
      runRoot,
    );
    assert.equal(blocked.exitCode, 1);
    assert.equal(blocked.output.status, "failed");
    assert.include(
      blocked.output.error.message,
      "remote bridge-download bundle",
    );
    assert.include(
      blocked.output.error.message,
      "bootstrap-paper-artifacts-export-delivery.json",
    );
    const delivery = JSON.parse(
      await fs.readFile(
        path.join(
          runRoot,
          "runtime",
          "payloads",
          "bootstrap-paper-artifacts-export-delivery.json",
        ),
        "utf8",
      ),
    );
    assert.equal(delivery.delivery.mode, "bridge-download");
    assert.include(
      delivery.delivery.downloadCommand,
      "zotero-bridge file download",
    );

    await writeRemotePaperArtifactsManifest(
      runRoot,
      "runtime/payloads/remote-bootstrap-paper-artifacts-manifest.json",
      ["1:EIMSDEU3"],
      ["digest", "references", "citation_analysis"],
    );
    const bootstrap = runRuntime(
      ["bootstrap", "--input", "runtime/input.json"],
      runRoot,
    );
    assert.equal(bootstrap.kind, "literature_deep_reading_bootstrap");
    const preflight = JSON.parse(
      await fs.readFile(
        path.join(runRoot, "runtime", "views", "host-preflight-view.json"),
        "utf8",
      ),
    );
    assert.equal(preflight.exported_target_artifacts.length, 3);
    assert.isTrue(
      preflight.exported_target_artifacts.every(
        (item: Record<string, unknown>) => item.status === "available",
      ),
    );
    const calls = (
      await fs.readFile(path.join(runRoot, "bridge-calls.jsonl"), "utf8")
    )
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line));
    assert.equal(
      calls.filter(
        (entry) => entry.command === "paper-artifacts export-filtered",
      ).length,
      1,
    );
  });

  it("fails bootstrap validation when the Stage 10 packet is missing", async function () {
    const tempRoot = await fs.mkdtemp(
      path.join(os.tmpdir(), "deep-reading-bootstrap-packet-missing-"),
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
    await fs.rm(
      path.join(runRoot, "runtime", "views", "stage-10-agent-packet.json"),
    );

    const validation = runRuntimeAllowFailure(["validate-bootstrap"], runRoot);
    assert.notEqual(validation.exitCode, 0);
    assert.equal(validation.output.ok, false);
    assert.include(
      validation.output.errors.join("\n"),
      "stage-10-agent-packet.json",
    );
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
      preface_cards: [
        {
          title: "研究领域",
          body: "样例论文用于验证 translator alignment 复用。",
        },
        { title: "研究方向", body: "本次运行关注已有译文对精读流程的衔接。" },
        {
          title: "本文位置",
          body: "样例文本作为当前论文进入 deep reading 渲染链路。",
        },
        {
          title: "核心创新",
          body: "测试重点是复用 alignment 而不重复翻译正文块。",
        },
      ],
      preface_reading_path: ["先看样例"],
      preface_goal: "验证 translator alignment 复用。",
      preface_concepts: [],
      preface_warnings: [],
      preface_questions: [
        {
          question: "为什么不再提交 block translations？",
          answer: "因为 translation view 已由 translator alignment 生成。",
        },
      ],
      section_notes: [
        {
          section_anchor: "sec-sample-paper",
          reading_goal: "理解样例论文。",
          concepts: [],
          misread_warnings: [],
          questions: [
            {
              question: "这个样例验证什么？",
              answer: "验证已有 alignment 可以直接形成 translation view。",
            },
          ],
          citation_note_body: "本节没有额外引用角色需要展开。",
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
    const worklist = await readRuntimeView(
      runRoot,
      "stage-30-translation-worklist.json",
    );
    assert.equal(worklist.summary.source, "translator_alignment");
    assert.equal(worklist.summary.batch_count, 0);
    assert.equal(worklist.required_next_action, "skip_translation_submit");
    const reviewPacket = await readRuntimeView(
      runRoot,
      "stage-40-review-packet.json",
    );
    assert.equal(reviewPacket.required_next_action, "write_final_review");
    assert.equal(
      reviewPacket.summary.translation_source,
      "translator_alignment",
    );
    assert.equal(reviewPacket.summary.translated_count, 2);
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
    await fs.mkdir(path.join(runRoot, ".audit", "literature-deep-reading.1"), {
      recursive: true,
    });
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
      preface_cards: [
        {
          title: "研究领域",
          body: "样例论文用于验证审计输入补齐后的精读流程。",
        },
        {
          title: "研究方向",
          body: "本次运行关注 Host 提供 alignment 后的复用路径。",
        },
        {
          title: "本文位置",
          body: "样例文本作为当前论文进入 deep reading 渲染链路。",
        },
        {
          title: "核心创新",
          body: "测试重点是从 audit manifest 补齐 translator alignment。",
        },
      ],
      preface_reading_path: ["先看样例"],
      preface_goal: "验证 audit manifest 输入补齐。",
      preface_concepts: [],
      preface_warnings: [],
      preface_questions: [
        {
          question: "审计输入为什么重要？",
          answer: "它是 Host 提供 translator alignment 的权威补齐来源。",
        },
      ],
      section_notes: [
        {
          section_anchor: "sec-sample-paper",
          reading_goal: "理解样例论文。",
          concepts: [],
          misread_warnings: [],
          questions: [
            {
              question: "这个样例验证什么？",
              answer:
                "验证 runtime 可以从 audit manifest 恢复 alignment 输入。",
            },
          ],
          citation_note_body: "本节没有额外引用角色需要展开。",
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

  it("keeps post-reference appendix sections out of raw references and hides missing citation graph", async function () {
    const tempRoot = await fs.mkdtemp(
      path.join(os.tmpdir(), "deep-reading-post-ref-appendix-"),
    );
    const bundlePath = await makeSourceBundle(tempRoot, {
      translatorAlignment: postReferencesAppendixAlignment(),
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
    await writeContextRequest(runRoot, {
      main_task: "vision-language transfer",
      method_family: "contrastive pretraining",
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
      preface_cards: [
        { title: "研究领域", body: "视觉语言迁移。" },
        { title: "研究方向", body: "对比式预训练。" },
        { title: "本文位置", body: "该文作为代表性节点。" },
        { title: "核心创新", body: "用自然语言监督迁移视觉模型。" },
      ],
      preface_reading_path: ["先看正文", "再看附录"],
      preface_goal: "区分参考文献和附录。",
      preface_concepts: [],
      preface_warnings: [],
      preface_questions: [
        {
          question: "为什么要看附录？",
          answer: "附录提供实验设置和额外结果。",
        },
      ],
      section_notes: [
        {
          section_anchor: "sec-sample-paper",
          reading_goal: "理解正文主张。",
          concepts: [],
          misread_warnings: [],
          questions: [{ question: "正文讲什么？", answer: "方法主体。" }],
          citation_note_body: "本节没有引用角色需要展开。",
          citation_reference_roles: [],
        },
      ],
      section_roles: [
        {
          section_anchor: "sec-references",
          role: "bibliography",
          reason: "该节包含参考文献条目。",
        },
        {
          section_anchor: "sec-a-linear-probe-evaluation",
          role: "appendix",
          reason: "该节是 References 后的补充实验章节。",
        },
      ],
      concepts: [],
      reference_digest_notes: [],
      summary_fallback_enabled: true,
      summary_fallback_sections: [{ title: "TL;DR", body: "样例。" }],
      extensions: [],
    });
    runRuntime(
      [
        "submit-reading-enrichment",
        "--payload",
        "runtime/payloads/reading-enrichment.json",
      ],
      runRoot,
    );
    await writeFinalReview(runRoot, {
      overall_assessment: "ready",
      quality_observations: [
        {
          severity: "info",
          kind: "structure",
          block_id: "b_002",
          message: "结构分区已检查。",
        },
      ],
    });
    runRuntime(
      [
        "submit-final-review",
        "--payload",
        "runtime/payloads/final-review.json",
      ],
      runRoot,
    );

    const references = await readRuntimeView(runRoot, "references-view.json");
    assert.equal(references.raw_view.items.length, 1);
    assert.include(
      references.raw_view.raw_markdown,
      "Tensorflow: A system for large-scale machine learning",
    );
    assert.notInclude(
      references.raw_view.raw_markdown,
      "linear probe experiments",
    );

    const sections = await readRuntimeView(
      runRoot,
      path.join("..", "..", "result", "sections", "sections.json"),
    );
    assert.equal(sections.appendix_reading_blocks.length, 2);
    assert.include(
      sections.appendix_reading_blocks[0].source_markdown,
      "A. Linear-probe evaluation",
    );
    assert.isFalse(sections.citation_graph.available);
    assert.isFalse(
      sections.navigation.some(
        (item: { anchor?: string }) => item.anchor === "citation-graph",
      ),
    );

    const html = await fs.readFile(
      path.join(runRoot, "result", "deep-reading.html"),
      "utf8",
    );
    assert.match(
      html,
      /<section class="citation-graph-section" data-citation-graph hidden>/,
    );

    const { chromium } = await import("playwright");
    const browser = await chromium.launch();
    try {
      const page = await browser.newPage({
        viewport: { width: 1400, height: 900 },
      });
      await page.goto(
        pathToFileURL(path.join(runRoot, "result", "deep-reading.html")).href,
      );
      await page.waitForFunction(() =>
        document.body.classList.contains("js-ready"),
      );
      const browserState = await page.evaluate(() => {
        const graph = document.querySelector(
          "[data-citation-graph]",
        ) as HTMLElement | null;
        const warning = document.querySelector(
          "[data-zotero-viewer-warning]",
        ) as HTMLElement | null;
        return {
          graphHidden: Boolean(graph?.hidden),
          warningDisplay: warning ? getComputedStyle(warning).display : "",
          warningHidden: warning?.classList.contains("is-hidden") || false,
        };
      });
      assert.isTrue(browserState.graphHidden);
      assert.equal(browserState.warningDisplay, "none");
      assert.isTrue(browserState.warningHidden);
    } finally {
      await browser.close();
    }
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
      quality_observations: [
        {
          severity: "warning",
          kind: "alignment_reuse",
          message:
            "Source-only alignment path has no translation batches to review.",
        },
      ],
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

    const stage20Packet = await readRuntimeView(
      runRoot,
      "stage-20-agent-packet.json",
    );
    assert.equal(stage20Packet.stage_id, "stage_20_reading_enrichment");
    assert.equal(
      stage20Packet.payload_path,
      "runtime/payloads/reading-enrichment.json",
    );
    assert.equal(stage20Packet.summary.topic_id, "computer-vision");
    assert.isAtLeast(stage20Packet.summary.reference_digest_count, 1);
    assert.equal(stage20Packet.summary.citation_layout_status, "ready");
    assert.property(stage20Packet.trace_paths, "host_context");
    assert.property(stage20Packet.trace_paths, "topic_context");

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
        "topics get-context",
        "reference-index get",
        "paper-artifacts manifest",
        "paper-artifacts export-filtered",
        "paper-artifacts resolve-topic-digest",
        "paper-artifacts resolve-topic-digest",
        "paper-artifacts resolve-topic-digest",
        "citation-graph get-slice",
        "citation-graph get-layout",
        "concepts query",
      ],
    );
    const referenceIndexCalls = calls.filter(
      (entry) => entry.command === "reference-index get",
    );
    assert.isTrue(
      referenceIndexCalls.every(
        (entry) =>
          entry.input.includeReferences === true &&
          entry.input.referenceSourceRefs?.[0] === "1:EIMSDEU3",
      ),
    );
    const layoutCall = calls.find(
      (entry) => entry.command === "citation-graph get-layout",
    );
    assert.equal(layoutCall.input.preset, "force");
    assert.equal(layoutCall.input.allowTruncated, true);
    const topicContextCall = calls.find(
      (entry) => entry.command === "topics get-context",
    );
    assert.equal(topicContextCall.input.view, "semantic");

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
    assert.equal(topicContext.view, "semantic");
    assert.equal(
      topicContext.context.semantic.taxonomy.axes[0].axis_type,
      "research_route",
    );
    const candidateDigests = JSON.parse(
      await fs.readFile(
        path.join(
          runRoot,
          "runtime",
          "views",
          "topic-candidate-digests-view.json",
        ),
        "utf8",
      ),
    );
    assert.deepEqual(candidateDigests.items, []);

    const digests = JSON.parse(
      await fs.readFile(
        path.join(runRoot, "runtime", "views", "reference-digests-view.json"),
        "utf8",
      ),
    );
    assert.sameMembers(
      digests.items.map((item: Record<string, unknown>) => item.reference_id),
      ["timeline:1:A", "ref-3", "timeline:1:EIMSDEU3"],
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

  it("stops context collection on remote reference digest export until the bridge bundle is unpacked", async function () {
    const tempRoot = await fs.mkdtemp(
      path.join(os.tmpdir(), "deep-reading-context-remote-export-"),
    );
    const bundlePath = await makeSourceBundle(tempRoot);
    const runRoot = path.join(tempRoot, "run");
    await fs.mkdir(path.join(runRoot, "runtime"), { recursive: true });
    await fs.writeFile(
      path.join(runRoot, "runtime", "input.json"),
      JSON.stringify({ source_bundle_path: bundlePath }, null, 2),
      "utf8",
    );
    await installFakeBridge(runRoot, {
      remoteExportFiltered: "referenceDigests",
    });
    runRuntime(["bootstrap", "--input", "runtime/input.json"], runRoot);
    await writeContextRequest(runRoot);

    const blocked = runRuntimeAllowFailure(
      [
        "submit-context-request",
        "--payload",
        "runtime/payloads/context-request.json",
      ],
      runRoot,
    );
    assert.equal(blocked.exitCode, 1);
    assert.equal(blocked.output.status, "failed");
    assert.include(
      blocked.output.error.message,
      "remote bridge-download bundle",
    );
    assert.include(
      blocked.output.error.message,
      "reference-digests-paper-artifacts-export-delivery.json",
    );
    const delivery = JSON.parse(
      await fs.readFile(
        path.join(
          runRoot,
          "runtime",
          "payloads",
          "reference-digests-paper-artifacts-export-delivery.json",
        ),
        "utf8",
      ),
    );
    assert.equal(delivery.delivery.mode, "bridge-download");

    await writeRemotePaperArtifactsManifest(
      runRoot,
      "runtime/payloads/remote-reference-digests-paper-artifacts-manifest.json",
      ["1:A", "1:B", "1:EIMSDEU3"],
      ["digest"],
    );
    const result = runRuntime(
      [
        "submit-context-request",
        "--payload",
        "runtime/payloads/context-request.json",
      ],
      runRoot,
    );
    assert.equal(result.kind, "literature_deep_reading_context_ready");
    const digests = JSON.parse(
      await fs.readFile(
        path.join(runRoot, "runtime", "views", "reference-digests-view.json"),
        "utf8",
      ),
    );
    assert.isAtLeast(digests.items.length, 3);
    assert.equal(digests.source, "host_paper_artifacts");
    const calls = (
      await fs.readFile(path.join(runRoot, "bridge-calls.jsonl"), "utf8")
    )
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line));
    assert.equal(
      calls.filter(
        (entry) => entry.command === "paper-artifacts export-filtered",
      ).length,
      2,
    );
  });

  it("rejects topic context requests that select outside the candidate list", async function () {
    const tempRoot = await fs.mkdtemp(
      path.join(os.tmpdir(), "deep-reading-topic-candidates-"),
    );
    const bundlePath = await makeSourceBundle(tempRoot);
    const runRoot = path.join(tempRoot, "run");
    await fs.mkdir(path.join(runRoot, "runtime"), { recursive: true });
    await fs.writeFile(
      path.join(runRoot, "runtime", "input.json"),
      JSON.stringify({ source_bundle_path: bundlePath }, null, 2),
      "utf8",
    );
    await installFakeBridge(runRoot, {
      topicCandidates: [
        {
          topic_id: "object-detection",
          title: "Object Detection",
          status: "active",
          matched_paper_refs: ["1:EIMSDEU3"],
        },
        {
          topic_id: "vision-transformers",
          title: "Vision Transformers",
          status: "active",
          matched_paper_refs: ["1:EIMSDEU3"],
        },
      ],
    });
    runRuntime(["bootstrap", "--input", "runtime/input.json"], runRoot);
    await writeContextRequest(runRoot);
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
    assert.include(JSON.stringify(result.output.error), "selected_topic_id");
    assert.include(JSON.stringify(result.output.error), "topic candidates");
  });

  it("uses selected topic semantic context and stores unselected candidate digests", async function () {
    const tempRoot = await fs.mkdtemp(
      path.join(os.tmpdir(), "deep-reading-selected-topic-"),
    );
    const bundlePath = await makeSourceBundle(tempRoot);
    const runRoot = path.join(tempRoot, "run");
    await fs.mkdir(path.join(runRoot, "runtime"), { recursive: true });
    await fs.writeFile(
      path.join(runRoot, "runtime", "input.json"),
      JSON.stringify({ source_bundle_path: bundlePath }, null, 2),
      "utf8",
    );
    await installFakeBridge(runRoot, {
      topicCandidates: [
        {
          topic_id: "object-detection",
          title: "Object Detection",
          status: "active",
          matched_paper_refs: ["1:EIMSDEU3"],
        },
        {
          topic_id: "vision-transformers",
          title: "Vision Transformers",
          status: "active",
          matched_paper_refs: ["1:EIMSDEU3"],
        },
      ],
    });
    runRuntime(["bootstrap", "--input", "runtime/input.json"], runRoot);
    await writeContextRequest(runRoot, {
      main_task: "object detection",
      method_family: "transformer-based direct set prediction",
      external_context_section_anchors: ["sec-1-introduction"],
      request_topic_context: true,
      topic_context_reason: "Use the selected Host topic.",
      selected_topic_id: "object-detection",
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
    });
    runRuntime(
      [
        "submit-context-request",
        "--payload",
        "runtime/payloads/context-request.json",
      ],
      runRoot,
    );

    const topicContext = JSON.parse(
      await fs.readFile(
        path.join(runRoot, "runtime", "views", "topic-context.json"),
        "utf8",
      ),
    );
    assert.equal(topicContext.topic_id, "object-detection");
    assert.equal(topicContext.view, "semantic");
    assert.equal(topicContext.context.semantic.topic.title, "Object Detection");

    const candidateDigests = JSON.parse(
      await fs.readFile(
        path.join(
          runRoot,
          "runtime",
          "views",
          "topic-candidate-digests-view.json",
        ),
        "utf8",
      ),
    );
    assert.equal(candidateDigests.selected_topic_id, "object-detection");
    assert.deepEqual(
      candidateDigests.items.map(
        (item: Record<string, unknown>) => item.topic_id,
      ),
      ["vision-transformers"],
    );
    assert.equal(candidateDigests.items[0].digest.title, "Vision Transformers");

    const calls = (
      await fs.readFile(path.join(runRoot, "bridge-calls.jsonl"), "utf8")
    )
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line));
    assert.equal(
      calls.filter(
        (entry) =>
          entry.command === "topics get-context" &&
          entry.input.view === "semantic",
      ).length,
      1,
    );
    assert.equal(
      calls.filter(
        (entry) =>
          entry.command === "topics get-context" &&
          entry.input.view === "digest",
      ).length,
      1,
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
    assert.equal(references.default_view, "item");
    assert.equal(references.item_view.reference_count, 2);
    assert.equal(references.raw_view.reference_count, 2);
    const itemRef3 = references.item_view.items.find(
      (item: Record<string, unknown>) => item.reference_id === "ref-3",
    );
    const itemRef2 = references.item_view.items.find(
      (item: Record<string, unknown>) => item.reference_id === "ref-2",
    );
    assert.equal(itemRef3.binding_status, "library");
    assert.equal(itemRef3.bound_paper_ref, "1:B");
    assert.equal(itemRef3.digest_modal.available, true);
    assert.equal(
      itemRef3.digest_modal.result.representative_image.status,
      "available",
    );
    assert.equal(itemRef2.binding_status, "external");
    assert.equal(itemRef2.digest_modal.available, false);
    assert.isTrue(
      references.raw_view.items.every(
        (item: Record<string, unknown>) =>
          (item as { digest_modal?: { available?: boolean } }).digest_modal
            ?.available === false,
      ),
    );
    assert.isTrue(
      references.raw_view.items.every(
        (item: Record<string, unknown>) =>
          typeof item.raw_markdown === "string" &&
          !("title" in item) &&
          !("year" in item) &&
          !("authors" in item),
      ),
    );

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
      ["研究领域", "研究方向", "本文位置", "核心创新"],
    );
    assert.lengthOf(preface.cards, 4);
    assert.equal(preface.topic_context.topic_id, "computer-vision");
    assert.equal(preface.topic_context.view, "semantic");
    assert.equal(preface.topic_timeline.available, true);
    assert.include(preface.topic_timeline.current_paper_key, "1:EIMSDEU3");
    assert.isTrue(
      preface.topic_timeline.items.some(
        (item: Record<string, unknown>) => item.is_current_paper === true,
      ),
    );

    const batchView = JSON.parse(
      await fs.readFile(
        path.join(runRoot, "runtime", "views", "translation-batches-view.json"),
        "utf8",
      ),
    );
    const worklist = await readRuntimeView(
      runRoot,
      "stage-30-translation-worklist.json",
    );
    assert.equal(worklist.stage_id, "stage_30_block_translation");
    assert.equal(
      worklist.payload_path,
      "runtime/payloads/block-translations.json",
    );
    assert.equal(worklist.summary.batch_count, batchView.batch_count);
    assert.equal(
      worklist.summary.required_translation_count,
      batchView.required_translation_count,
    );
    assert.sameMembers(
      worklist.work_items.required_block_ids,
      batchView.required_block_ids,
    );
    assert.deepEqual(
      worklist.work_items.batches.map(
        (batch: Record<string, unknown>) => batch.path,
      ),
      batchView.batches.map((batch: Record<string, unknown>) => batch.path),
    );
    assert.notInclude(JSON.stringify(worklist), "translation-source-0-0");
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

    const reviewPacket = await readRuntimeView(
      runRoot,
      "stage-40-review-packet.json",
    );
    assert.equal(reviewPacket.stage_id, "stage_40_final_review_and_render");
    assert.equal(
      reviewPacket.payload_path,
      "runtime/payloads/final-review.json",
    );
    assert.equal(
      reviewPacket.summary.translation_source,
      "agent_block_translations",
    );
    assert.isAtLeast(reviewPacket.summary.translation_item_count, 1);
    assert.property(reviewPacket.summary.status_counts, "available");
    assert.property(reviewPacket.trace_paths, "translation");
    assert.property(reviewPacket.trace_paths, "diagnostics_translation");

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

  it("fails submit-stage validation when agent packet handoffs are missing", async function () {
    const tempRoot = await fs.mkdtemp(
      path.join(os.tmpdir(), "deep-reading-packet-validation-"),
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
    await fs.rm(
      path.join(runRoot, "runtime", "views", "stage-20-agent-packet.json"),
    );
    const contextValidation = runRuntimeAllowFailure(
      ["validate-context-request"],
      runRoot,
    );
    assert.notEqual(contextValidation.exitCode, 0);
    assert.include(
      contextValidation.output.errors.join("\n"),
      "stage-20-agent-packet.json",
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
    await fs.rm(
      path.join(
        runRoot,
        "runtime",
        "views",
        "stage-30-translation-worklist.json",
      ),
    );
    const enrichmentValidation = runRuntimeAllowFailure(
      ["validate-reading-enrichment"],
      runRoot,
    );
    assert.notEqual(enrichmentValidation.exitCode, 0);
    assert.include(
      enrichmentValidation.output.errors.join("\n"),
      "stage-30-translation-worklist.json",
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
    await fs.rm(
      path.join(runRoot, "runtime", "views", "stage-40-review-packet.json"),
    );
    const translationValidation = runRuntimeAllowFailure(
      ["validate-block-translations"],
      runRoot,
    );
    assert.notEqual(translationValidation.exitCode, 0);
    assert.include(
      translationValidation.output.errors.join("\n"),
      "stage-40-review-packet.json",
    );
  });

  it("submits final review and renders a self-contained deep-reading HTML", async function () {
    this.timeout(45000);
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
    assert.equal(
      result.artifact_manifest_path,
      "result/deep-reading-artifacts.json",
    );
    assert.notProperty(result, "db_path");
    assert.notProperty(result, "views");

    const validation = runRuntime(["validate-final-output"], runRoot);
    assert.deepEqual(validation, { ok: true, errors: [] });

    const artifactManifest = JSON.parse(
      await fs.readFile(
        path.join(runRoot, "result", "deep-reading-artifacts.json"),
        "utf8",
      ),
    );
    assert.deepInclude(artifactManifest, {
      deep_reading_html: "result/deep-reading.html",
      deep_reading_manifest: "result/deep-reading-manifest.json",
      final_output_candidate: "result/final-output.candidate.json",
      diagnostics: "result/sections/diagnostics.json",
    });

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
    assert.include(html, '<html lang="zh-CN">');
    assert.include(html, "aligned-block-pair");
    assert.include(html, "data-paper-scroll");
    assert.include(html, "zotero-viewer-warning");
    assert.include(html, "请用浏览器打开以获得完整的交互体验");
    assert.include(html, "当前处于静态阅读模式");
    assert.include(html, "static-citation-graph");
    assert.include(html, "static-cg-svg");
    assert.include(html, "initScrollTracking");
    assert.include(html, "可能的问题");
    assert.include(html, "引用线索");
    assert.include(html, '<h1 id="summary">总结</h1>');
    assert.include(html, '<h1 id="extensions">扩展阅读</h1>');
    assert.include(html, "math-display");
    assert.include(html, "<math");
    assert.notInclude(html, "math-fallback");
    assert.notInclude(html, "<code>\\");
    assert.include(html, "markdown references");
    assert.notInclude(html, "structured references artifact");
    assert.include(html, "核心创新");
    assert.include(html, "topic-timeline");
    assert.include(html, "ZoteroSkillsTopicTimeline");
    assert.include(html, "timeline-current-paper");
    assert.include(html, "legend-icon-current");
    assert.include(html, "阅读指引");
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
    assert.deepEqual(
      sections.preface.cards.map((item: Record<string, unknown>) => item.title),
      ["研究领域", "研究方向", "本文位置", "核心创新"],
    );
    assert.deepInclude(sections.labels, {
      summary: "总结",
      references: "参考文献",
      citation_graph: "引用图谱",
      extensions: "扩展阅读",
      viewer_warning: "请用浏览器打开以获得完整的交互体验。",
      noscript_warning:
        "当前处于静态阅读模式。请用浏览器打开以获得完整的交互体验。",
    });
    assert.equal(sections.preface.topic_timeline.available, true);
    assert.isTrue(
      sections.preface.topic_timeline.items.some(
        (item: Record<string, unknown>) => item.is_current_paper === true,
      ),
    );
    assert.isAtLeast(sections.reading_blocks.length, 1);
    assert.isAtLeast(sections.translation.items.length, 1);
    assert.equal(sections.summary.source, "digest_artifact");
    assert.equal(sections.references.references_source, "markdown");
    assert.equal(sections.references.default_view, "item");
    assert.equal(sections.references.reference_count, 2);
    assert.equal(sections.references.item_view.reference_count, 2);
    assert.equal(sections.references.raw_view.reference_count, 2);
    assert.isTrue(
      sections.references.item_view.items.some(
        (item: Record<string, unknown>) =>
          item.reference_id === "ref-3" &&
          item.binding_status === "library" &&
          (item as { digest_modal?: { available?: boolean } }).digest_modal
            ?.available === true,
      ),
    );
    assert.isTrue(
      sections.references.raw_view.items.every(
        (item: Record<string, unknown>) =>
          typeof item.raw_markdown === "string" &&
          !("title" in item) &&
          !("year" in item) &&
          !("authors" in item),
      ),
    );
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
      sections.references.item_view.items.some(
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
          prefaceTimeline: document.querySelectorAll(
            "[data-preface] .topic-timeline",
          ).length,
          currentPaperMarkers: document.querySelectorAll(
            "[data-preface] .timeline-current-paper",
          ).length,
          timelineButtonMarkers: Array.from(
            document.querySelectorAll("[data-preface] .timeline-marker"),
          ).filter((node) => node.tagName === "BUTTON").length,
          timelinePaperMarkers: document.querySelectorAll(
            '[data-preface] .timeline-marker[data-topic-timeline-kind="paper"]',
          ).length,
          timelinePaperDigestMarkers: document.querySelectorAll(
            '[data-preface] .timeline-marker[data-topic-timeline-kind="paper"][data-digest-ref]',
          ).length,
          currentLegend: document.querySelectorAll(
            "[data-preface] .legend-icon-current",
          ).length,
          currentPaperScale:
            (
              document.querySelector(
                "[data-preface] .timeline-current-paper",
              ) as HTMLElement | null
            )?.style.getPropertyValue("--pin-scale") || "",
          readingGuideText:
            document.querySelector("[data-preface] .reading-guide")
              ?.textContent || "",
          referenceView:
            document
              .querySelector(".structured-references")
              ?.getAttribute("data-reference-active-view") || "",
          referenceToggleCount: document.querySelectorAll(
            "[data-reference-view]",
          ).length,
          libraryBoundReferences: document.querySelectorAll(
            ".reference-item.is-library-bound",
          ).length,
          digestRows: document.querySelectorAll(
            ".reference-item-view.has-digest[data-digest-ref]",
          ).length,
          digestButtons: document.querySelectorAll(".digest-button").length,
        };
      });
      assert.isTrue(browserState.jsReady);
      assert.equal(browserState.zoteroWarningDisplay, "none");
      assert.equal(browserState.staticGraphCount, 0);
      assert.equal(browserState.prefaceCount, 1);
      assert.equal(browserState.prefaceTimeline, 1);
      assert.equal(browserState.currentPaperMarkers, 1);
      assert.isAtLeast(browserState.timelineButtonMarkers, 1);
      assert.isAtLeast(browserState.timelinePaperMarkers, 1);
      assert.equal(
        browserState.timelinePaperDigestMarkers,
        browserState.timelinePaperMarkers,
      );
      assert.equal(browserState.currentLegend, 1);
      assert.equal(browserState.currentPaperScale, "1.5");
      assert.include(browserState.readingGuideText, "阅读指引");
      assert.equal(browserState.referenceView, "item");
      assert.equal(browserState.referenceToggleCount, 2);
      assert.equal(browserState.libraryBoundReferences, 1);
      assert.equal(browserState.digestRows, 1);
      assert.equal(browserState.digestButtons, 0);
      await page.setViewportSize({ width: 2200, height: 1000 });
      await page.waitForFunction(
        () => !document.body.classList.contains("compare-disabled"),
      );
      await page.click('[data-mode="compare"]');
      await page.waitForFunction(
        () =>
          ((
            document.querySelector("[data-reading-flow]") as HTMLElement | null
          )?.getBoundingClientRect().width || 0) > 1120,
      );
      await page.waitForFunction(
        () =>
          ((
            document.querySelector(
              "[data-appendix-reading-flow]",
            ) as HTMLElement | null
          )?.getBoundingClientRect().width || 0) > 1120,
      );
      const compareWidthState = await page.evaluate(() => ({
        modeCompare: document.body.classList.contains("mode-compare"),
        readingFlowWidth:
          (
            document.querySelector("[data-reading-flow]") as HTMLElement | null
          )?.getBoundingClientRect().width || 0,
        appendixReadingFlowWidth:
          (
            document.querySelector(
              "[data-appendix-reading-flow]",
            ) as HTMLElement | null
          )?.getBoundingClientRect().width || 0,
      }));
      assert.isTrue(compareWidthState.modeCompare);
      assert.isAbove(compareWidthState.readingFlowWidth, 1120);
      assert.isAbove(compareWidthState.appendixReadingFlowWidth, 1120);
      await page.click("[data-concept-toggle]");
      const conceptRailState = await page.evaluate(() => {
        const shell = document.querySelector(".shell") as HTMLElement | null;
        const rail = document.querySelector(
          "[data-concept-rail]",
        ) as HTMLElement | null;
        const toc = document.querySelector("[data-toc]") as HTMLElement | null;
        const list = document.querySelector(
          ".concept-list",
        ) as HTMLElement | null;
        const chip = document.querySelector(
          ".concept-chip",
        ) as HTMLElement | null;
        const railRect = rail?.getBoundingClientRect();
        const tocRect = toc?.getBoundingClientRect();
        const chipRect = chip?.getBoundingClientRect();
        const listStyle = list ? getComputedStyle(list) : null;
        return {
          shellOpen: Boolean(shell?.classList.contains("concept-rail-open")),
          railRight: railRect?.right || 0,
          tocLeft: tocRect?.left || 0,
          listPosition: listStyle?.position || "",
          listOverflowY: listStyle?.overflowY || "",
          chipHeight: chipRect?.height || 0,
        };
      });
      assert.isTrue(conceptRailState.shellOpen);
      assert.isAtLeast(
        conceptRailState.tocLeft,
        conceptRailState.railRight - 1,
      );
      assert.equal(conceptRailState.listPosition, "static");
      assert.include(["auto", "scroll"], conceptRailState.listOverflowY);
      assert.isBelow(conceptRailState.chipHeight, 64);
      await page.setViewportSize({ width: 2000, height: 1000 });
      await page.waitForFunction(
        () =>
          !document
            .querySelector("[data-concept-rail]")
            ?.classList.contains("is-open"),
      );
      const conceptAutoCollapseState = await page.evaluate(() => ({
        railOpen: document
          .querySelector("[data-concept-rail]")
          ?.classList.contains("is-open"),
        shellOpen: document
          .querySelector(".shell")
          ?.classList.contains("concept-rail-open"),
        tocCollapsed: document.body.classList.contains("toc-collapsed"),
      }));
      assert.isFalse(conceptAutoCollapseState.railOpen);
      assert.isFalse(conceptAutoCollapseState.shellOpen);
      assert.isFalse(conceptAutoCollapseState.tocCollapsed);
      await page.setViewportSize({ width: 1780, height: 1000 });
      await page.waitForFunction(() =>
        document.body.classList.contains("toc-collapsed"),
      );
      const tocCollapseState = await page.evaluate(() => ({
        tocCollapsed: document.body.classList.contains("toc-collapsed"),
        tocDisplay: getComputedStyle(
          document.querySelector("[data-toc]") as HTMLElement,
        ).display,
        compareDisabled: document.body.classList.contains("compare-disabled"),
      }));
      assert.isTrue(tocCollapseState.tocCollapsed);
      assert.equal(tocCollapseState.tocDisplay, "none");
      assert.isFalse(tocCollapseState.compareDisabled);
      await page.setViewportSize({ width: 1500, height: 1000 });
      await page.waitForFunction(() =>
        document.body.classList.contains("compare-disabled"),
      );
      const compareDisableState = await page.evaluate(() => ({
        modeOriginal: document.body.classList.contains("mode-original"),
        modeCompare: document.body.classList.contains("mode-compare"),
        compareDisabled:
          (
            document.querySelector(
              '[data-mode="compare"]',
            ) as HTMLButtonElement | null
          )?.disabled || false,
      }));
      assert.isTrue(compareDisableState.modeOriginal);
      assert.isFalse(compareDisableState.modeCompare);
      assert.isTrue(compareDisableState.compareDisabled);
      await page.setViewportSize({ width: 2200, height: 1000 });
      await page.waitForFunction(
        () => !document.body.classList.contains("compare-disabled"),
      );
      await page.click('[data-mode="compare"]');
      await page.focus("[data-preface] .timeline-marker");
      const tooltipState = await page.evaluate(() => ({
        tooltipCount: document.querySelectorAll(".timeline-hover-popover")
          .length,
      }));
      assert.equal(tooltipState.tooltipCount, 1);
      await page.focus('[data-preface] [data-topic-paper-ref="1:B"]');
      await page.keyboard.press("Enter");
      const timelineDigestState = await page.evaluate(() => ({
        modal: document.querySelectorAll(".paper-digest-modal").length,
        representativeImage: document.querySelectorAll(
          ".digest-representative-image img",
        ).length,
        text: document.querySelector(".paper-digest-modal")?.textContent || "",
      }));
      assert.equal(timelineDigestState.modal, 1);
      assert.equal(timelineDigestState.representativeImage, 1);
      assert.include(timelineDigestState.text, "Resolved digest");
      await page.keyboard.press("Escape");
      await page.click(".reference-item-view.has-digest[data-digest-ref]");
      const digestModalState = await page.evaluate(() => ({
        modal: document.querySelectorAll(".paper-digest-modal").length,
        dialog: document.querySelectorAll(".paper-digest-dialog").length,
        body: document.querySelectorAll(".paper-digest-body").length,
        scrollBody: document.querySelectorAll(".digest-scroll-body").length,
        representativeImage: document.querySelectorAll(
          ".digest-representative-image img",
        ).length,
        text: document.querySelector(".paper-digest-modal")?.textContent || "",
      }));
      assert.equal(digestModalState.modal, 1);
      assert.equal(digestModalState.dialog, 1);
      assert.equal(digestModalState.body, 1);
      assert.equal(digestModalState.scrollBody, 1);
      assert.equal(digestModalState.representativeImage, 1);
      assert.include(digestModalState.text, "Resolved digest");
      await page.keyboard.press("Escape");
      await page.click('[data-reference-view="raw"]');
      const rawReferenceState = await page.evaluate(() => ({
        referenceView:
          document
            .querySelector(".structured-references")
            ?.getAttribute("data-reference-active-view") || "",
        digestButtons: document.querySelectorAll(".digest-button").length,
        rawItems: document.querySelectorAll(".reference-raw-view").length,
        rawText:
          document.querySelector(".reference-raw-markdown")?.textContent || "",
      }));
      assert.equal(rawReferenceState.referenceView, "raw");
      assert.equal(rawReferenceState.digestButtons, 0);
      assert.equal(rawReferenceState.rawItems, 2);
      assert.include(rawReferenceState.rawText, "Example reference");

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
          prefaceTimeline: document.querySelectorAll(
            "[data-preface] .topic-timeline",
          ).length,
          currentPaperMarkers: document.querySelectorAll(
            "[data-preface] .timeline-current-paper",
          ).length,
          readingGuideText:
            document.querySelector("[data-preface] .reading-guide")
              ?.textContent || "",
          referenceToggleCount: document.querySelectorAll(
            "[data-reference-view]",
          ).length,
          libraryBoundReferences: document.querySelectorAll(
            ".reference-item.is-library-bound",
          ).length,
          digestButtons: document.querySelectorAll(".digest-button").length,
          rawReferenceItems:
            document.querySelectorAll(".reference-item").length,
          staticWarning:
            document.body.textContent?.includes("当前处于静态阅读模式"),
        }));
        assert.isAtLeast(staticState.navItems, 5);
        assert.equal(staticState.preface, 1);
        assert.isAtLeast(staticState.readingBlocks, 1);
        assert.equal(staticState.references, 1);
        assert.equal(staticState.staticGraph, 1);
        assert.equal(staticState.prefaceTimeline, 1);
        assert.equal(staticState.currentPaperMarkers, 1);
        assert.include(staticState.readingGuideText, "阅读指引");
        assert.equal(staticState.referenceToggleCount, 0);
        assert.equal(staticState.libraryBoundReferences, 0);
        assert.equal(staticState.digestButtons, 0);
        assert.equal(staticState.rawReferenceItems, 2);
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
    assert.include(JSON.stringify(result.output.error), "preface_cards");
    assert.include(JSON.stringify(result.output.error), "reading_goal");
    assert.include(JSON.stringify(result.output.error), "requires definition");
    assert.include(
      JSON.stringify(result.output.error),
      "role_in_current_paper",
    );
    assert.include(JSON.stringify(result.output.error), "why_open");
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
    const noHostBridge = path.join(
      tempRoot,
      process.platform === "win32"
        ? "missing-zotero-bridge.cmd"
        : "missing-zotero-bridge",
    );
    await fs.writeFile(
      noHostBridge,
      process.platform === "win32"
        ? [
            "@echo off",
            'echo {"ok":false,"error":{"code":"host_bridge_unavailable","message":"Host Bridge CLI unavailable in test"}}',
            "exit /b 1",
            "",
          ].join("\r\n")
        : [
            "#!/usr/bin/env sh",
            'printf \'%s\\n\' \'{"ok":false,"error":{"code":"host_bridge_unavailable","message":"Host Bridge CLI unavailable in test"}}\'',
            "exit 1",
            "",
          ].join("\n"),
      "utf8",
    );
    if (process.platform !== "win32") {
      await fs.chmod(noHostBridge, 0o755);
    }
    const noHostEnv = {
      ZOTERO_BRIDGE_BIN: noHostBridge,
    };
    runRuntime(
      ["bootstrap", "--input", "runtime/input.json"],
      runRoot,
      noHostEnv,
    );
    await writeContextRequest(runRoot);

    const result = runRuntime(
      [
        "submit-context-request",
        "--payload",
        "runtime/payloads/context-request.json",
      ],
      runRoot,
      noHostEnv,
    );
    assert.equal(result.status, "context_ready");
    assert.include(result.warnings, "topic_context_failed");

    const diagnostics = JSON.parse(
      await fs.readFile(
        path.join(runRoot, "runtime", "views", "diagnostics-host-context.json"),
        "utf8",
      ),
    );
    assert.isTrue(
      diagnostics.diagnostics.some(
        (entry: Record<string, unknown>) =>
          entry.code === "topic_context_failed" ||
          entry.category === "host_bridge",
      ),
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
    const preface = JSON.parse(
      await fs.readFile(
        path.join(runRoot, "runtime", "views", "preface-view.json"),
        "utf8",
      ),
    );
    assert.equal(preface.topic_timeline.available, false);
    const references = JSON.parse(
      await fs.readFile(
        path.join(runRoot, "runtime", "views", "references-view.json"),
        "utf8",
      ),
    );
    assert.equal(references.default_view, "raw");
    assert.equal(references.item_view.reference_count, 0);
    assert.isAtLeast(references.raw_view.reference_count, 1);
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
    assert.include(JSON.stringify(result.output.error), "main_task");
    assert.include(JSON.stringify(result.output.error), "method_family");
  });

  it("rejects context requests that omit required semantic intent", async function () {
    const tempRoot = await fs.mkdtemp(
      path.join(os.tmpdir(), "deep-reading-context-intent-"),
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
      main_task: "object detection",
      method_family: "transformer-based direct set prediction",
      external_context_section_anchors: ["sec-1-introduction"],
      request_topic_context: true,
      topic_context_reason: "",
      selected_topic_id: "",
      request_concept_context: true,
      concept_labels: [],
      request_citation_graph: false,
      citation_graph_depth: 2,
      citation_graph_direction: "both",
      citation_graph_max_nodes: 80,
      citation_graph_max_edges: 160,
      citation_graph_include_low_signal: false,
      reference_digest_policy: "priority_only",
      priority_reference_indices: [],
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
    assert.include(JSON.stringify(result.output.error), "topic_context_reason");
    assert.include(JSON.stringify(result.output.error), "concept_labels");
    assert.include(
      JSON.stringify(result.output.error),
      "priority_reference_indices",
    );
  });

  it("accepts custom non-empty citation reference roles", async function () {
    const tempRoot = await fs.mkdtemp(
      path.join(os.tmpdir(), "deep-reading-custom-citation-role-"),
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

    const payloadPath = path.join(
      runRoot,
      "runtime",
      "payloads",
      "reading-enrichment.json",
    );
    const payload = JSON.parse(await fs.readFile(payloadPath, "utf8"));
    payload.section_notes[0].citation_reference_roles[0].role =
      "theoretical scaffolding for the paper's framing";
    await fs.writeFile(payloadPath, JSON.stringify(payload, null, 2), "utf8");

    const result = runRuntime(
      [
        "submit-reading-enrichment",
        "--payload",
        "runtime/payloads/reading-enrichment.json",
      ],
      runRoot,
    );
    assert.equal(result.status, "enriched");

    const validation = runRuntime(["validate-reading-enrichment"], runRoot);
    assert.deepEqual(validation, { ok: true, errors: [] });
  });

  it("rejects final review payloads with inconsistent assessment severity", async function () {
    const tempRoot = await fs.mkdtemp(
      path.join(os.tmpdir(), "deep-reading-invalid-final-review-"),
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
    await writeBlockTranslations(runRoot);
    runRuntime(
      [
        "submit-block-translations",
        "--payload",
        "runtime/payloads/block-translations.json",
      ],
      runRoot,
    );

    await writeFinalReview(runRoot, {
      overall_assessment: "needs_revision",
      quality_observations: [],
    });
    const needsRevisionResult = runRuntimeAllowFailure(
      [
        "submit-final-review",
        "--payload",
        "runtime/payloads/final-review.json",
      ],
      runRoot,
    );
    assert.equal(needsRevisionResult.exitCode, 1);
    assert.include(
      JSON.stringify(needsRevisionResult.output.error),
      "needs_revision",
    );

    await writeFinalReview(runRoot, {
      overall_assessment: "ready",
      quality_observations: [
        {
          severity: "error",
          kind: "translation_structure",
          block_id: "block-0002",
          message: "A blocking translation issue remains.",
        },
      ],
    });
    const readyResult = runRuntimeAllowFailure(
      [
        "submit-final-review",
        "--payload",
        "runtime/payloads/final-review.json",
      ],
      runRoot,
    );
    assert.equal(readyResult.exitCode, 1);
    assert.include(JSON.stringify(readyResult.output.error), "ready");
    assert.include(JSON.stringify(readyResult.output.error), "error");
  });
});
