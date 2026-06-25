from __future__ import annotations

import hashlib
import json
import math
import re
import shutil
import subprocess
import zipfile
from datetime import datetime, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parent
WORKSPACE = ROOT.parents[1]
USER_SOURCE = Path(r"D:\Workspace\Artifact\Bibliography-test\2020\carion_endtoend-object_2020")
TOPIC_ROOT = Path(
    r"D:\Workspace\Artifact\Zotero-Skills\Zotero_data\zotero-agents\data\synthesis\topics\detr-style-object-detection\current"
)
CITATION_GRAPH_STATE = Path(
    r"D:\Workspace\Artifact\Zotero-Skills\Zotero_data\zotero-agents\data\synthesis\state\citation-graph-snapshot.json"
)
CITATION_GRAPH_LAYOUTS = Path(
    r"D:\Workspace\Artifact\Zotero-Skills\Zotero_data\zotero-agents\data\synthesis\state\citation-graph-layouts.json"
)
DETR_ARTIFACT_ROOT = (
    ROOT.parents[1]
    / "artifact"
    / "topic-synthesis-create-detr-gated-playbook"
    / "workspace"
    / "runtime"
    / "acp"
    / "skill-runs"
    / "acp-skill-detr-create-topic-synthesis"
    / "runtime"
    / "payloads"
    / "artifacts"
    / "1_EIMSDEU3"
)
DETR_TOPIC_SYNTHESIS_ROOT = (
    ROOT.parents[1]
    / "artifact"
    / "topic-synthesis-create-detr-gated-playbook"
    / "workspace"
    / "runtime"
    / "acp"
    / "skill-runs"
    / "acp-skill-detr-create-topic-synthesis"
)
DETR_TOPIC_PAYLOAD_ROOT = DETR_TOPIC_SYNTHESIS_ROOT / "runtime" / "payloads"
DETR_TOPIC_VIEW_ROOT = DETR_TOPIC_SYNTHESIS_ROOT / "runtime" / "views"
DETR_TOPIC_RESULT_ROOT = DETR_TOPIC_SYNTHESIS_ROOT / "result"

SOURCE = ROOT / "source"
RUNTIME = ROOT / "runtime"
RESULT = ROOT / "result"

PAPER_MD = USER_SOURCE / "Carion 等 - 2020 - End-to-End Object Detection with Transformers.md"
PAPER_PDF = USER_SOURCE / "Carion 等 - 2020 - End-to-End Object Detection with Transformers.pdf"
PAPER_IMAGES = USER_SOURCE / "Images_IX5R2J7K"


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def write_json(path: Path, data: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def reset_dir(path: Path) -> None:
    if path.exists():
        shutil.rmtree(path)
    path.mkdir(parents=True, exist_ok=True)


def copy_file(src: Path, dst: Path) -> None:
    dst.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(src, dst)


def slugify(text: str, fallback: str) -> str:
    slug = re.sub(r"[^a-zA-Z0-9]+", "-", text.lower()).strip("-")
    return slug or fallback


def image_refs(markdown: str) -> list[dict[str, object]]:
    refs = []
    for match in re.finditer(r"!\[[^\]]*\]\(([^)]+)\)", markdown):
        refs.append(
            {
                "src": match.group(1),
                "filename": Path(match.group(1)).name,
                "line": markdown.count("\n", 0, match.start()) + 1,
            }
        )
    return refs


def heading_spans(markdown: str) -> list[dict[str, object]]:
    headings = [
        {
            "level": len(match.group(1)),
            "title": match.group(2).strip(),
            "start": match.start(),
            "line": markdown.count("\n", 0, match.start()) + 1,
        }
        for match in re.finditer(r"^(#{1,4})\s+(.+)$", markdown, flags=re.MULTILINE)
    ]
    spans = []
    for idx, heading in enumerate(headings):
        end = len(markdown)
        line_end = markdown.count("\n") + 1
        for nxt in headings[idx + 1 :]:
            if int(nxt["level"]) <= int(heading["level"]):
                end = int(nxt["start"])
                line_end = int(nxt["line"]) - 1
                break
        spans.append({**heading, "end": end, "line_end": line_end})
    return spans


def split_markdown_blocks(markdown: str) -> list[dict[str, object]]:
    blocks: list[dict[str, object]] = []
    current: list[str] = []
    start_line = 1
    in_fence = False
    lines = markdown.splitlines()

    def flush(end_line: int) -> None:
        nonlocal current
        text = "\n".join(current).strip()
        if not text:
            current = []
            return
        if re.match(r"^#{1,6}\s+", text):
            kind = "heading"
        elif text.startswith("!"):
            kind = "image"
        elif text.startswith("<table"):
            kind = "table"
        elif text.startswith("$$") or text.startswith("\\["):
            kind = "formula"
        else:
            kind = "paragraph"
        blocks.append({"kind": kind, "source_markdown": text, "line_start": start_line, "line_end": end_line})
        current = []

    for idx, line in enumerate(lines, start=1):
        if line.startswith("```"):
            in_fence = not in_fence
        if not in_fence and not line.strip():
            flush(idx - 1)
            start_line = idx + 1
            continue
        if not current:
            start_line = idx
        current.append(line)
    flush(len(lines))
    return blocks


def split_reading_and_post_blocks(blocks: list[dict[str, object]]) -> tuple[list[dict[str, object]], list[dict[str, object]]]:
    for idx, block in enumerate(blocks):
        text = str(block.get("source_markdown") or "").strip()
        if re.match(r"^#\s+References\s*$", text, flags=re.I):
            return blocks[:idx], blocks[idx:]
    return blocks, []


def section_anchor_for_line(sections: list[dict[str, object]], line: int) -> str:
    current = str(sections[0]["anchor"]) if sections else ""
    for section in sections:
        if int(section.get("line_start", 0)) <= line:
            current = str(section.get("anchor", current))
        else:
            break
    return current


def image_dimensions(path: Path) -> dict[str, int | None]:
    try:
        from PIL import Image

        with Image.open(path) as im:
            return {"width": im.width, "height": im.height}
    except Exception:
        return {"width": None, "height": None}


def normalize_references(payload: object) -> list[dict[str, object]]:
    if isinstance(payload, dict):
        candidates = payload.get("references", [])
    elif isinstance(payload, list):
        candidates = payload
    else:
        candidates = []

    references = []
    for idx, item in enumerate(candidates, start=1):
        if isinstance(item, str):
            references.append({"id": f"ref-{idx}", "index": idx, "raw": item})
            continue
        if not isinstance(item, dict):
            continue

        ref = {
            "id": str(item.get("id") or f"ref-{idx}"),
            "index": idx,
        }
        for key in [
            "title",
            "authors",
            "year",
            "venue",
            "doi",
            "url",
            "arxiv",
            "citeKey",
            "matchStatus",
            "raw",
        ]:
            value = item.get(key)
            if value not in (None, ""):
                ref[key] = value

        extra = {
            key: value
            for key, value in item.items()
            if key not in ref and key not in {"id"}
            and value not in (None, "")
        }
        if extra:
            ref["extra"] = extra
        references.append(ref)
    return references


def concept_id(label: str) -> str:
    return "concept:" + slugify(label, "unnamed")


def load_json_if_exists(path: Path, fallback: object) -> object:
    if not path.exists():
        return fallback
    return json.loads(read_text(path))


def normalize_concepts() -> dict[str, object]:
    kg = load_json_if_exists(DETR_TOPIC_PAYLOAD_ROOT / "kg-enrichment.json", {})
    proposal = load_json_if_exists(DETR_TOPIC_RESULT_ROOT / "sidecars" / "concept-cards-proposal.json", {})
    candidate_context = load_json_if_exists(DETR_TOPIC_VIEW_ROOT / "concept-candidate-context.json", {})

    cards: list[dict[str, object]] = []
    if isinstance(kg, dict) and isinstance(kg.get("concept_details"), list):
        cards.extend([card for card in kg["concept_details"] if isinstance(card, dict)])
    if isinstance(proposal, dict) and isinstance(proposal.get("cards"), list):
        cards.extend([card for card in proposal["cards"] if isinstance(card, dict)])

    candidates = []
    if isinstance(candidate_context, dict) and isinstance(candidate_context.get("concepts"), list):
        candidates = [str(label) for label in candidate_context["concepts"] if str(label).strip()]
    matching_terms = kg.get("topic_matching_terms") if isinstance(kg, dict) else {}
    alias_terms: list[str] = []
    if isinstance(matching_terms, dict):
        for key in ["include_terms", "methods", "must_have_terms"]:
            values = matching_terms.get(key)
            if isinstance(values, list):
                alias_terms.extend([str(value) for value in values if str(value).strip()])

    by_label: dict[str, dict[str, object]] = {}
    for card in cards:
        label = str(card.get("label") or "").strip()
        if not label:
            continue
        key = label.lower()
        entry = by_label.setdefault(
            key,
            {
                "id": concept_id(label),
                "label": label,
                "aliases": [label],
                "kind": card.get("kind") or "concept",
                "definition": card.get("description") or card.get("definition") or "",
                "source": "topic_synthesis_kg_enrichment",
                "status": "defined",
            },
        )
        if not entry.get("definition") and (card.get("description") or card.get("definition")):
            entry["definition"] = card.get("description") or card.get("definition")

    for label in candidates:
        key = label.lower()
        by_label.setdefault(
            key,
            {
                "id": concept_id(label),
                "label": label,
                "aliases": [label],
                "kind": "candidate",
                "definition": "",
                "source": "concept_candidate_context",
                "status": "label_only",
            },
        )

    for term in alias_terms:
        lower = term.lower()
        matched_key = None
        for key, entry in by_label.items():
            label = str(entry["label"]).lower()
            if lower == label or lower.startswith(label + "-") or label in lower:
                matched_key = key
                break
        if matched_key:
            aliases = by_label[matched_key].setdefault("aliases", [])
            if isinstance(aliases, list) and term not in aliases:
                aliases.append(term)

    reader_concepts = {
        "NMS": ("non-maximum suppression", "传统检测器常用的后处理规则，用来从一组高度重叠的候选框中保留最可信的预测。DETR 的目标之一是在训练目标中学习去重，而不是推理后再用 NMS 清理。"),
        "anchor": ("anchors", "预设在图像位置和尺度上的候选框先验，许多单阶段检测器会相对于 anchor 预测目标框。"),
        "proposal": ("proposals", "两阶段检测器中的候选区域，后续分类和框回归都围绕这些候选区域展开。"),
        "post-processing": ("NMS", "模型输出之后再用规则修正、过滤或合并预测的步骤；DETR 试图把去重能力前移到训练目标和模型结构中。"),
        "set prediction": ("direct set prediction", "直接预测一个无序对象集合；监督时需要处理预测与真实目标之间的匹配，而不能按固定顺序逐项比较。"),
        "bipartite matching": ("Hungarian matching", "在预测集合和真实目标集合之间寻找一对一分配，是 DETR 取消重复预测和 NMS 的训练基础。"),
        "Hungarian algorithm": ("Hungarian matching", "求解二分图最优分配的算法；DETR 用它确定哪个预测负责哪个真实目标。"),
        "Transformer": ("self-attention", "由 self-attention 组成的编码器-解码器架构，在 DETR 中用于建模图像区域和预测槽位之间的全局关系。"),
        "self-attention": ("attention", "让序列中的每个元素根据其他元素更新自身表示；在 DETR 中用于全局图像特征和预测之间的关系建模。"),
        "object detection": ("detection", "为图像中的对象预测类别标签和边界框的任务。"),
        "parallel decoding": ("non-autoregressive decoding", "一次性并行生成多个输出，而不是按顺序逐个生成；DETR 用它并行产生固定数量的预测槽位。"),
        "permutation": ("permutation invariance", "集合元素没有固定顺序，因此训练目标不能依赖某个任意排列。"),
        "assignment": ("matching assignment", "把预测槽位分配给真实目标的过程；DETR 用最优二分匹配替代传统检测器中的启发式分配。"),
        "object query": ("object queries", "DETR decoder 的可学习查询向量，每个 query 对应一个预测槽位；它不是 anchor，也不是候选框。"),
        "positional encoding": ("position encoding", "向 Transformer 输入中注入空间位置信息，使模型知道特征来自图像中的哪个位置。"),
        "FFN": ("feed-forward network", "Transformer 层和预测头中的前馈网络，用于对特征进行逐位置变换或输出类别与边界框。"),
        "Faster R-CNN": ("two-stage detector", "经典两阶段目标检测器，是 DETR 论文中最重要的强基线之一。"),
        "RetinaNet": ("Focal Loss", "代表性的单阶段 anchor-based 检测器，DETR 用它作为现代检测范式的对照。"),
        "COCO": ("MS COCO", "目标检测和全景分割常用基准数据集，DETR 的主要实验结果在 COCO 上报告。"),
        "AP": ("average precision", "COCO 目标检测的核心指标，综合多个 IoU 阈值下的检测精度。"),
        "APs": ("small object AP", "COCO 中小目标的 AP 指标；初版 DETR 在这里明显弱于强基线。"),
        "APl": ("large object AP", "COCO 中大目标的 AP 指标；初版 DETR 在这里相对传统检测器更有优势。"),
        "FPN": ("Feature Pyramid Network", "多尺度特征金字塔，是传统检测器改善小目标检测的重要技术路线。"),
        "backbone": ("CNN backbone", "检测器前端的特征提取网络；DETR 使用 ResNet 提取图像特征。"),
        "encoder-decoder": ("Transformer encoder-decoder", "DETR 的 Transformer 主体结构：encoder 处理图像特征，decoder 用 object queries 产生预测。"),
        "set loss": ("Hungarian loss", "基于集合匹配的训练损失，使预测与真实目标形成唯一配对。"),
        "no-object": ("background class", "DETR 中表示某个预测槽位没有对应真实目标的类别。"),
        "box loss": ("bounding box loss", "用于优化预测框位置和大小的损失，DETR 结合 L1 与 GIoU。"),
        "training schedule": ("long training schedule", "训练轮数和学习率安排；初版 DETR 需要比常规检测器更长的训练。"),
        "convergence": ("training convergence", "训练过程从不稳定预测逐步达到可用性能的过程；初版 DETR 的主要代价之一就是收敛较慢。"),
        "multi-scale": ("multi-scale features", "同时利用不同分辨率特征来处理大小不同的对象，是改善小目标检测的重要手段。"),
        "paradigm": ("detection paradigm", "对检测问题的基本建模方式；DETR 的范式变化是从候选框筛选转向直接集合预测。"),
        "end-to-end": ("end-to-end training", "尽量让模型从输入到最终输出都由统一目标训练，减少独立后处理或手工规则。"),
        "ablation": ("ablation study", "通过移除或替换组件来判断它们对性能的贡献。"),
        "encoder": ("Transformer encoder", "对展平后的图像特征做全局 self-attention 的模块。"),
        "decoder": ("Transformer decoder", "接收 object queries，并从 encoder 输出中提取对象表示的模块。"),
        "panoptic segmentation": ("panoptic prediction", "同时处理可数对象 things 和不可数区域 stuff 的像素级识别任务。"),
        "mask head": ("segmentation head", "在 DETR decoder 输出上增加的分割预测头，用于为每个对象生成 mask。"),
        "PQ": ("panoptic quality", "全景分割的核心评价指标，综合分割质量和识别质量。"),
        "DETR-family": ("DETR variants", "围绕 DETR 范式发展的后续工作，主要解决收敛慢、小目标弱、多尺度和实时化问题。"),
        "Deformable DETR": ("deformable attention", "DETR 后续代表工作之一，通过稀疏可变形注意力改善收敛速度和多尺度建模。"),
        "RT-DETR": ("real-time detection transformer", "将 DETR 范式推向实时目标检测的后续路线。"),
    }
    for label, (alias, definition) in reader_concepts.items():
        key = label.lower()
        entry = by_label.setdefault(
            key,
            {
                "id": concept_id(label),
                "label": label,
                "aliases": [label],
                "kind": "reader_concept",
                "definition": definition,
                "source": "literature_deep_reading_sample",
                "status": "defined",
            },
        )
        aliases = entry.setdefault("aliases", [])
        if isinstance(aliases, list) and alias and alias not in aliases:
            aliases.append(alias)
        if not entry.get("definition"):
            entry["definition"] = definition

    concepts = sorted(by_label.values(), key=lambda item: str(item["label"]).lower())
    return {
        "schema_version": "literature-deep-reading.concept-overlay-view.v0",
        "source": "topic_synthesis_artifacts",
        "enabled": True,
        "concepts": concepts,
        "diagnostics": [],
    }


def markdown_heading_map(markdown: str) -> dict[str, str]:
    sections: dict[str, list[str]] = {}
    current = ""
    for line in markdown.splitlines():
        match = re.match(r"^#{1,6}\s+(.+?)\s*$", line)
        if match:
            current = match.group(1).strip()
            sections.setdefault(current, [])
            continue
        if current:
            sections[current].append(line)
    return {title: "\n".join(lines).strip() for title, lines in sections.items()}


def first_markdown_paragraph(markdown: str) -> str:
    for part in re.split(r"\n\s*\n", markdown.strip()):
        text = part.strip()
        if text:
            return text
    return ""


def markdown_bullets(markdown: str, limit: int = 6) -> list[str]:
    bullets = []
    for line in markdown.splitlines():
        match = re.match(r"^\s*-\s+(.+?)\s*$", line)
        if match:
            bullets.append(match.group(1).strip())
        if len(bullets) >= limit:
            break
    return bullets


def parse_digest_summary(path: Path) -> dict[str, object]:
    if not path.exists():
        return {
            "schema_version": "literature-deep-reading.summary-view.v0",
            "source": "agent_fallback",
            "anchor": "summary",
            "title": "Summary",
            "sections": [
                {
                    "title": "简要总结",
                    "markdown": "DETR 将目标检测表述为直接集合预测问题，用二分匹配损失和 Transformer 编码器-解码器去除 NMS、anchor 等手工组件，并在 COCO 上达到与强 Faster R-CNN 基线相近的性能。",
                }
            ],
            "reading_aid": {
                "goal": "用简短复盘固定论文主张、方法、证据和局限。",
                "terms": ["DETR", "set prediction", "Transformer"],
                "pitfall": "fallback summary 只用于读后回顾，不能替代正文阅读。",
            },
            "diagnostics": [{"severity": "info", "code": "DIGEST_ARTIFACT_MISSING", "message": "Summary used fallback text."}],
        }

    sections = markdown_heading_map(read_text(path))
    summary_sections = []
    for title in ["TL;DR", "研究问题与贡献", "方法要点", "关键结果"]:
        content = sections.get(title, "").strip()
        if content:
            summary_sections.append({"title": title, "markdown": content})
    if not summary_sections:
        summary_sections.append({"title": "简要总结", "markdown": read_text(path).strip()[:1200]})
    return {
        "schema_version": "literature-deep-reading.summary-view.v0",
        "source": "digest_artifact",
        "artifact_path": "artifacts/digest.md",
        "anchor": "summary",
        "title": "Summary",
        "sections": summary_sections,
        "reading_aid": {
            "goal": "复用 literature-digest artifact，将论文的主张、方法和结果压缩成读后回顾。",
            "terms": ["研究问题", "方法要点", "关键结果"],
            "pitfall": "总结只帮助复盘，不替代原文中的定义、公式和实验表格。",
        },
        "diagnostics": [],
    }


def parse_citation_analysis(path: Path) -> dict[str, object]:
    if not path.exists():
        return {
            "source": "none",
            "overall": "",
            "key_references": [],
            "entries": {},
            "diagnostics": [{"severity": "info", "code": "CITATION_ANALYSIS_MISSING", "message": "Citation analysis artifact was not available."}],
        }
    markdown = read_text(path)
    sections = markdown_heading_map(markdown)
    key_refs = []
    for line in sections.get("关键文献", "").splitlines():
        match = re.match(r"^\s*-\s+\[(\d+)\]\s+(.+?)\s+\(([^)]+)\)\s*$", line)
        if match:
            key_refs.append({"ref": f"[{match.group(1)}]", "label": match.group(2).strip(), "role": match.group(3).strip()})

    entries: dict[str, dict[str, str]] = {}
    entry_pattern = re.compile(
        r"- \[(\d+)\]\s+([^\n]+)\n\s+- 标题:\s*([^\n]+)\n\s+- 关键词:\s*([^\n]+)\n\s+- 总结:\s*([^\n]+)",
        flags=re.MULTILINE,
    )
    for match in entry_pattern.finditer(markdown):
        entries[f"[{match.group(1)}]"] = {
            "label": match.group(2).strip(),
            "title": match.group(3).strip(),
            "keywords": match.group(4).strip(),
            "summary": match.group(5).strip(),
        }
    return {
        "source": "citation_analysis_artifact",
        "artifact_path": "artifacts/citation-analysis.md",
        "overall": first_markdown_paragraph(sections.get("总体总结", "")),
        "key_references": key_refs,
        "entries": entries,
        "diagnostics": [],
    }


SECTION_QA = {
    "End-to-End Object Detection with Transformers": [
        ("这篇论文最核心的主张是什么？", "目标检测可以被直接建模为集合预测：模型一次性输出最终对象集合，而不是先产生大量候选再用 NMS 清理。"),
        ("为什么这不是简单地把 Transformer 加进检测器？", "因为本文同时改变了训练目标和输出形式：二分匹配损失负责唯一分配，Transformer decoder 的 object queries 负责并行生成预测槽位。"),
    ],
    "1 Introduction": [
        ("作者为什么反复强调 NMS 和 anchors？", "这些组件代表传统检测器中的手工先验和后处理。DETR 的目标正是让模型直接学会唯一对象集合，推理阶段不再依赖这些规则。"),
        ("Introduction 中的大目标优势和小目标短板意味着什么？", "大目标优势支持全局 self-attention 的价值；小目标短板说明初版 DETR 缺少多尺度细节建模，后续 DETR-family 很多工作都围绕这一点展开。"),
    ],
    "2 Related Work": [
        ("Related Work 的三条线索分别服务什么论证？", "集合预测解释监督形式，Transformer/并行解码解释模型形式，目标检测文献解释 DETR 要去除的传统检测先验。"),
        ("为什么相关工作不是普通背景罗列？", "这些引用共同证明 DETR 的问题定义：需要一种既能做无序集合监督、又能并行输出、还能替代 NMS/anchor 管线的检测框架。"),
    ],
    "2.1 Set Prediction": [
        ("为什么集合预测必须处理排列不变性？", "对象集合没有天然顺序，预测 1 对应哪个真实框不能预先固定；因此训练前必须先求预测与真实目标之间的最优匹配。"),
        ("Hungarian algorithm 在这里解决什么问题？", "它求出预测和真实目标之间的一对一最小代价匹配，使每个真实目标最多对应一个预测，从训练目标上抑制重复预测。"),
    ],
    "2.2 Transformers and Parallel Decoding": [
        ("为什么 DETR 选择并行解码而不是自回归解码？", "检测结果是无序集合，不需要人为规定输出顺序；并行 object queries 更符合集合预测，也能降低逐个生成的推理成本。"),
        ("object query 是 anchor 吗？", "不是。object query 是可学习的解码槽位，不预设空间位置或尺度；它通过 decoder attention 从图像特征中提取对象信息。"),
    ],
    "2.3 Object Detection": [
        ("DETR 与 Faster R-CNN / RetinaNet 的根本差异是什么？", "传统检测器围绕 proposals、anchors 或密集网格做间接预测，再用后处理去重；DETR 直接输出最终集合。"),
        ("为什么去掉 NMS 是一个重要信号？", "这说明模型不再把去重留给外部规则，而是在训练目标和架构中学习唯一预测。"),
    ],
    "3 The DETR Model": [
        ("读方法部分应先抓哪条主线？", "先抓“损失负责唯一匹配，架构负责并行集合输出”这条主线，再看公式和架构图的细节。"),
        ("固定数量 N 个预测会不会限制检测数量？", "N 被设得显著大于通常对象数量；多余预测通过 no-object 类吸收，因此它是预测槽位上限，不是每张图必须输出的对象数。"),
    ],
    "3.1 Object Detection Set Prediction Loss": [
        ("Hungarian loss 和匹配代价是什么关系？", "匹配代价先决定哪个预测负责哪个真实目标；Hungarian loss 再在这些匹配对上计算分类和边界框损失。"),
        ("为什么框损失要结合 L1 和 GIoU？", "L1 提供坐标层面的稳定优化，GIoU 更贴近重叠质量且对尺度更稳健，两者结合更适合直接框预测。"),
    ],
    "3.2 DETR Architecture": [
        ("encoder 和 decoder 分别承担什么职责？", "encoder 对图像特征做全局关系建模；decoder 用 object queries 从这些特征中并行抽取对象表示。"),
        ("辅助损失为什么重要？", "它让 decoder 中间层也获得监督，帮助训练早期形成正确数量的对象预测，缓解收敛慢和匹配不稳定。"),
    ],
    "4 Experiments": [
        ("实验部分应同时看哪些信息？", "既看 DETR 与强基线相当的总体 AP，也看训练周期、小目标 AP 和消融结果，这些决定了初版 DETR 的真实边界。"),
        ("为什么 COCO 是关键验证场景？", "COCO 是目标检测主流复杂基准，包含多类别、多尺度和密集实例；能在 COCO 上竞争，才说明直接集合预测具有实际检测价值。"),
    ],
    "4.1 Comparison with Faster R-CNN and RetinaNet": [
        ("表 1 最重要的对比结论是什么？", "DETR 总体 AP 接近强 Faster R-CNN 基线，大目标明显更强，小目标明显更弱。"),
        ("这个结果如何导向后续工作？", "它把后续改进方向指向多尺度建模、收敛加速和 query 初始化等问题。"),
    ],
    "4.2 Ablations": [
        ("消融实验证明了什么？", "DETR 的性能来自多个组件协同：encoder 全局 self-attention、decoder 层数、FFN、位置编码和辅助损失都不可随意移除。"),
        ("为什么 NMS 在最后层反而降低 AP？", "最后 decoder layer 已经学会抑制重复预测，外部 NMS 会错误移除真阳性，说明 DETR 的去重能力来自模型内部。"),
    ],
    "4.3 DETR for Panoptic Segmentation": [
        ("为什么全景分割扩展适合 DETR？", "DETR 已经输出一组对象表示；给每个对象表示增加 mask head，就能自然扩展到实例和 stuff 区域的统一预测。"),
        ("这一节的贡献边界是什么？", "它主要证明集合预测范式可迁移到像素级任务，而不是把重点放在最复杂的分割工程系统上。"),
    ],
    "5 Conclusion": [
        ("结论中最值得保留的判断是什么？", "DETR 是端到端检测范式的起点：它证明了直接集合预测可行，同时清楚暴露训练慢和小目标弱等后续问题。"),
        ("读完本文后下一步应该读什么？", "如果关注性能瓶颈，读 Deformable DETR；关注 query 设计，读 Conditional/DAB/DN-DETR；关注部署，读 RT-DETR/LW-DETR/RF-DETR。"),
    ],
}


SECTION_CITATION_REFS = {
    "1 Introduction": ["[36]", "[22]", "[21]", "[23]"],
    "2 Related Work": ["[19]", "[42]", "[46]", "[4]", "[16]"],
    "2.1 Set Prediction": ["[19]", "[42]", "[8]"],
    "2.2 Transformers and Parallel Decoding": ["[46]", "[2]", "[7]", "[11]"],
    "2.3 Object Detection": ["[36]", "[22]", "[21]", "[4]", "[16]"],
    "3 The DETR Model": ["[14]", "[19]", "[37]", "[46]"],
    "3.1 Object Detection Set Prediction Loss": ["[19]", "[37]", "[36]"],
    "3.2 DETR Architecture": ["[14]", "[46]", "[1]"],
    "4 Experiments": ["[23]", "[36]", "[22]", "[25]"],
    "4.1 Comparison with Faster R-CNN and RetinaNet": ["[36]", "[22]", "[21]", "[37]"],
    "4.2 Ablations": ["[3]", "[21]", "[46]"],
    "4.3 DETR for Panoptic Segmentation": ["[13]", "[17]", "[50]", "[27]"],
    "5 Conclusion": ["[21]", "[36]", "[46]"],
}


SECTION_CITATION_NOTES = {
    "1 Introduction": "Introduction 用 Faster R-CNN、RetinaNet/Focal Loss、FPN 和 COCO 建立强基线语境：DETR 要挑战的不是弱检测器，而是经过长期优化的主流检测范式。",
    "2 Related Work": "Related Work 将引用组织为三条功能线：集合匹配、Transformer/并行解码、传统检测器与去重机制，目的是证明 DETR 的组合设计有明确来源。",
    "2.1 Set Prediction": "集合预测部分的引用强调 Hungarian matching 和早期端到端检测尝试，说明一对一分配是直接集合预测的监督核心。",
    "2.2 Transformers and Parallel Decoding": "Transformer 部分引用注意力、BERT 和非自回归解码工作，为 DETR 选择并行 decoder 提供技术背景。",
    "2.3 Object Detection": "检测相关工作引用两阶段、单阶段、NMS 替代和 relation network，凸显现有方法仍依赖候选、anchor 或后处理。",
    "3 The DETR Model": "方法部分的引用主要承担组件定位：ResNet 提供 backbone，Transformer 提供全局建模，Hungarian/GIoU 提供集合监督和框优化。",
    "3.1 Object Detection Set Prediction Loss": "损失函数引用 Hungarian method 和 GIoU，分别对应匹配分配和边界框质量约束。",
    "3.2 DETR Architecture": "架构引用 ResNet 与 Transformer，说明 DETR 尽量使用通用深度学习组件，而不是依赖检测专用算子。",
    "4 Experiments": "实验引用 COCO、Faster R-CNN、RetinaNet 和 AdamW，用来固定评测基准、比较对象和训练配置。",
    "4.1 Comparison with Faster R-CNN and RetinaNet": "比较实验中的引用帮助读者判断公平性：作者不只对比原始 Faster R-CNN，也增强了基线训练策略。",
    "4.2 Ablations": "消融部分借 attention augmented convolution 等文献解释 FFN、位置编码和 attention 组件的功能边界。",
    "4.3 DETR for Panoptic Segmentation": "全景分割部分引用 Mask R-CNN、PanopticFPN、UPSNet 和 Dice loss，说明 DETR 的 mask head 是在既有分割路线上的简化扩展。",
    "5 Conclusion": "结论回到 Transformer、强检测基线和 FPN 这几条线，指出初版 DETR 的范式价值与后续改进空间。",
}


def build_preface_view(topic_summary: dict[str, object], topic_stats: dict[str, object], concept_view: dict[str, object], graph_view: dict[str, object]) -> dict[str, object]:
    concepts = [str(item.get("label")) for item in concept_view.get("concepts", []) if isinstance(item, dict) and item.get("label")][:6]
    return {
        "schema_version": "literature-deep-reading.preface-view.v0",
        "source": "topic_synthesis_artifacts",
        "anchor": "preface",
        "title": "阅读前导读",
        "subtitle": "先看清这篇论文解决什么问题、接上哪些文献、又开启了哪些后续工作。",
        "cards": [
            {
                "title": "研究领域",
                "body": "本文位于计算机视觉中的目标检测与全景分割方向，核心问题是如何从图像中预测对象类别、边界框以及可扩展的像素级对象表示。",
            },
            {
                "title": "研究方向",
                "body": "在目标检测内部，DETR 属于端到端集合预测路线：用 object queries、二分匹配和 Transformer decoder 直接产生最终检测集合，尽量减少 anchors、proposals 与 NMS 这类外部规则。",
            },
            {
                "title": "方向关系",
                "body": "它不是和 Faster R-CNN、RetinaNet 完全割裂的路线，而是把检测器中的候选框分配、去重和全局关系建模重新组织起来。后续 DETR-family 主要沿着收敛加速、query 设计、多尺度注意力和实时化继续推进。",
            },
            {
                "title": "文献位置",
                "body": f"从当前文献网络看，DETR 是后续端到端检测论文经常回到的起点之一；同时，它大量吸收了此前的经典检测器、Transformer、自注意力和 Hungarian matching 文献。换句话说，它的价值在于把几条成熟技术线重新组合成一种新的检测问题表述。",
            },
        ],
        "takeaways": list(topic_summary.get("key_takeaways", []))[:4],
        "concepts": concepts,
        "coverage": topic_stats,
        "reading_path": [
            "先读 Introduction，确认作者要消除哪些检测管线先验。",
            "再读 Section 3 的 matching loss 与 architecture，把集合监督和 object queries 连起来。",
            "实验部分重点看大目标优势、小目标短板、训练成本和消融结论。",
            "读后用 Summary、References 和 Citation Graph 决定后续阅读路径。",
        ],
        "reading_aid": {
            "goal": "进入正文前，先确认 DETR 属于哪条研究路线，以及它为什么会成为后续 DETR-family 的起点。",
            "terms": ["DETR", "set prediction", "object queries", "Hungarian matching"],
            "pitfall": "导读只是定位文献关系；具体定义、公式和实验仍以正文为准。",
        },
        "diagnostics": [],
    }


def build_section_insights(sections: list[dict[str, object]], citation_analysis: dict[str, object]) -> dict[str, object]:
    entries = citation_analysis.get("entries", {}) if isinstance(citation_analysis.get("entries"), dict) else {}
    by_anchor: dict[str, dict[str, object]] = {}
    for section in sections:
        title = str(section.get("title") or "")
        anchor = str(section.get("anchor") or "")
        qa = [
            {"id": f"qa-{slugify(title, 'section')}-{idx + 1}", "question": question, "answer": answer, "section_anchor": anchor}
            for idx, (question, answer) in enumerate(SECTION_QA.get(title, []))
        ]
        refs = []
        for ref_id in SECTION_CITATION_REFS.get(title, []):
            entry = entries.get(ref_id, {})
            refs.append(
                {
                    "ref": ref_id,
                    "title": entry.get("title") or "",
                    "keywords": entry.get("keywords") or "",
                    "summary": entry.get("summary") or "",
                }
            )
        by_anchor[anchor] = {
            "section_anchor": anchor,
            "section_title": title,
            "citation_note": SECTION_CITATION_NOTES.get(title, ""),
            "citation_references": refs,
            "questions": qa,
        }
    return {
        "schema_version": "literature-deep-reading.section-insights-view.v0",
        "source": citation_analysis.get("source", "none"),
        "artifact_path": citation_analysis.get("artifact_path", ""),
        "overall_citation_summary": citation_analysis.get("overall", ""),
        "by_anchor": by_anchor,
        "diagnostics": citation_analysis.get("diagnostics", []),
    }


def fallback_citation_graph_slice(warning: str = "") -> dict[str, object]:
    start = "zotero:item:EIMSDEU3"
    max_nodes = 80
    max_edges = 160
    fallback = {
        "ok": False,
        "graph_hash": "",
        "start_node_id": start,
        "nodes": [],
        "edges": [],
        "diagnostics": {
            "snapshot_found": False,
            "depth": 2,
            "node_count": 0,
            "edge_count": 0,
            "truncated": False,
            "limits": {"maxNodes": max_nodes, "maxEdges": max_edges, "maxDepth": 2},
            "warnings": [warning or "citation graph snapshot unavailable"],
        },
    }
    if not CITATION_GRAPH_STATE.exists():
        return fallback
    try:
        state = json.loads(read_text(CITATION_GRAPH_STATE))
    except Exception as exc:
        fallback["diagnostics"]["warnings"] = [warning, f"local citation graph state decode failed: {exc}"]
        return fallback

    all_nodes = [node for node in state.get("nodes", []) if isinstance(node, dict)]
    all_edges = [edge for edge in state.get("edges", []) if isinstance(edge, dict)]
    by_id = {str(node.get("node_id")): node for node in all_nodes if node.get("node_id")}
    if start not in by_id:
        fallback["diagnostics"]["warnings"] = [warning, "start node not found in local citation graph state"]
        return fallback

    adjacency: dict[str, set[str]] = {node_id: set() for node_id in by_id}
    for edge in all_edges:
        source = str(edge.get("source") or "")
        target = str(edge.get("target") or "")
        if source in adjacency and target in adjacency:
            adjacency[source].add(target)
            adjacency[target].add(source)

    depth = {start: 0}
    queue = [start]
    while queue:
        current = queue.pop(0)
        if depth[current] >= 2:
            continue
        for nxt in sorted(adjacency.get(current, [])):
            if nxt not in depth:
                depth[nxt] = depth[current] + 1
                queue.append(nxt)

    def node_priority(node_id: str) -> tuple[int, int, str]:
        node = by_id[node_id]
        kind_rank = 0 if node.get("kind") == "library_paper" else 1
        return (depth.get(node_id, 9), kind_rank, str(node.get("title") or node_id).lower())

    selected_ids = [node_id for node_id in sorted(depth, key=node_priority)[:max_nodes]]
    selected = set(selected_ids)
    selected_edges = [
        edge
        for edge in all_edges
        if str(edge.get("source") or "") in selected and str(edge.get("target") or "") in selected
    ][:max_edges]
    incoming: dict[str, int] = {node_id: 0 for node_id in selected}
    outgoing: dict[str, int] = {node_id: 0 for node_id in selected}
    for edge in all_edges:
        source = str(edge.get("source") or "")
        target = str(edge.get("target") or "")
        if target in incoming:
            incoming[target] += 1
        if source in outgoing:
            outgoing[source] += 1
    nodes = []
    for node_id in selected_ids:
        node = dict(by_id[node_id])
        metrics = dict(node.get("metrics") or {})
        metrics.setdefault("internal_in_degree", incoming.get(node_id, 0))
        metrics.setdefault("internal_out_degree", outgoing.get(node_id, 0))
        node["metrics"] = metrics
        node["visibility"] = node.get("visibility") or "default"
        node["display_tier"] = node.get("display_tier") or ("library" if node.get("kind") == "library_paper" else "shared_external")
        nodes.append(node)
    return {
        "ok": True,
        "graph_hash": state.get("graph_hash", ""),
        "start_node_id": start,
        "nodes": nodes,
        "edges": selected_edges,
        "diagnostics": {
            "snapshot_found": True,
            "source": "local_synthesis_state",
            "depth": 2,
            "node_count": len(nodes),
            "edge_count": len(selected_edges),
            "truncated": len(depth) > len(nodes) or len(selected_edges) >= max_edges,
            "limits": {"maxNodes": max_nodes, "maxEdges": max_edges, "maxDepth": 2},
            "warnings": [warning] if warning else [],
        },
    }


def read_citation_graph_snapshot() -> dict[str, object]:
    request = {
        "paperRef": "1:EIMSDEU3",
        "depth": 2,
        "direction": "both",
        "maxNodes": 80,
        "maxEdges": 160,
    }
    fallback = {
        "ok": False,
        "graph_hash": "",
        "start_node_id": "zotero:item:EIMSDEU3",
        "nodes": [],
        "edges": [],
        "diagnostics": {
            "snapshot_found": False,
            "depth": 2,
            "node_count": 0,
            "edge_count": 0,
            "truncated": False,
            "limits": {"maxNodes": 80, "maxEdges": 160, "maxDepth": 2},
            "warnings": ["citation graph snapshot unavailable"],
        },
    }
    try:
        completed = subprocess.run(
            [
                "zotero-bridge",
                "citation-graph",
                "get-slice",
                "--input",
                json.dumps(request, ensure_ascii=False),
            ],
            check=False,
            capture_output=True,
            text=True,
            encoding="utf-8",
            timeout=30,
        )
    except Exception as exc:
        fallback["diagnostics"]["warnings"] = [f"citation graph snapshot command failed: {exc}"]
        return fallback_citation_graph_slice(str(fallback["diagnostics"]["warnings"][0]))
    if completed.returncode != 0:
        message = completed.stderr.strip() or completed.stdout.strip() or f"exit {completed.returncode}"
        fallback["diagnostics"]["warnings"] = [f"citation graph snapshot command failed: {message}"]
        return fallback_citation_graph_slice(str(fallback["diagnostics"]["warnings"][0]))
    try:
        envelope = json.loads(completed.stdout)
        data = envelope.get("data", {}).get("data") if isinstance(envelope, dict) else None
        return data if isinstance(data, dict) else fallback
    except Exception as exc:
        fallback["diagnostics"]["warnings"] = [f"citation graph snapshot decode failed: {exc}"]
        return fallback_citation_graph_slice(str(fallback["diagnostics"]["warnings"][0]))


def read_local_force_layout(warning: str = "") -> dict[str, object]:
    fallback = {
        "status": "missing",
        "layout_key": "local_synthesis_state:balanced",
        "coordinates": {},
        "diagnostics": [warning] if warning else [],
    }
    if not CITATION_GRAPH_LAYOUTS.exists():
        return fallback
    try:
        payload = json.loads(read_text(CITATION_GRAPH_LAYOUTS))
        layouts = payload.get("layouts", {}) if isinstance(payload, dict) else {}
        layout = layouts.get("balanced") or layouts.get("expanded") or layouts.get("compact")
        if not isinstance(layout, dict):
            fallback["diagnostics"].append("local force layout payload missing")
            return fallback
        nodes = layout.get("nodes", {})
        if not isinstance(nodes, dict):
            fallback["diagnostics"].append("local force layout nodes missing")
            return fallback
        coordinates = {}
        for node_id, point in nodes.items():
            if not isinstance(point, dict):
                continue
            x = point.get("x")
            y = point.get("y")
            if isinstance(x, (int, float)) and isinstance(y, (int, float)):
                coordinates[str(node_id)] = {"x": float(x), "y": float(y)}
        return {
            "status": "available",
            "layout_key": f"local_synthesis_state:{layout.get('preset') or 'balanced'}",
            "graph_hash": layout.get("graph_hash") or payload.get("graph_hash"),
            "layout_hash": layout.get("layout_hash"),
            "updated_at": layout.get("updated_at"),
            "coordinates": coordinates,
            "diagnostics": [warning] if warning else [],
        }
    except Exception as exc:
        fallback["diagnostics"].append(f"local force layout decode failed: {exc}")
        return fallback


def read_host_bridge_force_layout() -> dict[str, object]:
    fallback = {
        "status": "missing",
        "layout_key": "workbench_overview:force",
        "coordinates": {},
        "diagnostics": [],
    }
    try:
        completed = subprocess.run(
            [
                "zotero-bridge",
                "debug",
                "synthesis",
                "snapshot",
                "--input",
                json.dumps({"limit": 20}, ensure_ascii=False),
            ],
            check=False,
            capture_output=True,
            text=True,
            encoding="utf-8",
            timeout=30,
        )
    except Exception as exc:
        fallback["diagnostics"] = [f"force layout command failed: {exc}"]
        return read_local_force_layout(str(fallback["diagnostics"][0]))
    if completed.returncode != 0:
        message = completed.stderr.strip() or completed.stdout.strip() or f"exit {completed.returncode}"
        fallback["diagnostics"] = [f"force layout command failed: {message}"]
        return read_local_force_layout(str(fallback["diagnostics"][0]))
    try:
        envelope = json.loads(completed.stdout)
        data = envelope.get("data", {}).get("data") if isinstance(envelope, dict) else {}
        layouts = data.get("citationLayouts", []) if isinstance(data, dict) else []
        force = next(
            (
                layout
                for layout in layouts
                if isinstance(layout, dict)
                and layout.get("viewKey") == "workbench_overview"
                and layout.get("preset") == "force"
                and layout.get("status") == "ready"
            ),
            None,
        )
        if not force:
            fallback["diagnostics"] = ["workbench_overview force layout is not ready"]
            return fallback
        raw_layout = force.get("layout") or force.get("layoutJson") or force.get("layout_json")
        if isinstance(raw_layout, str):
            raw_layout = json.loads(raw_layout)
        if not isinstance(raw_layout, dict):
            fallback["diagnostics"] = ["force layout payload is not an object"]
            return fallback
        nodes = raw_layout.get("nodes")
        if not isinstance(nodes, dict):
            fallback["diagnostics"] = ["force layout node coordinate map missing"]
            return fallback
        coordinates = {}
        for node_id, point in nodes.items():
            if not isinstance(point, dict):
                continue
            x = point.get("x")
            y = point.get("y")
            if isinstance(x, (int, float)) and isinstance(y, (int, float)):
                coordinates[str(node_id)] = {"x": float(x), "y": float(y)}
        return {
            "status": "available",
            "layout_key": force.get("layoutKey") or force.get("layout_key") or "workbench_overview:force",
            "graph_hash": force.get("graphHash") or force.get("graph_hash") or raw_layout.get("graph_hash"),
            "layout_hash": raw_layout.get("layout_hash") or force.get("layoutHash") or force.get("layout_hash"),
            "updated_at": force.get("updatedAt") or force.get("updated_at"),
            "coordinates": coordinates,
            "diagnostics": [],
        }
    except Exception as exc:
        fallback["diagnostics"] = [f"force layout decode failed: {exc}"]
        return read_local_force_layout(str(fallback["diagnostics"][0]))


def normalize_force_coordinates(
    nodes: list[dict[str, object]],
    coordinates: dict[str, dict[str, float]],
    depth: dict[str, int],
) -> dict[str, dict[str, object]]:
    selected = {
        str(node.get("node_id")): coordinates[str(node.get("node_id"))]
        for node in nodes
        if str(node.get("node_id")) in coordinates
    }
    if not selected:
        return {}
    xs = [point["x"] for point in selected.values()]
    ys = [point["y"] for point in selected.values()]
    min_x, max_x = min(xs), max(xs)
    min_y, max_y = min(ys), max(ys)
    width = max(max_x - min_x, 1)
    height = max(max_y - min_y, 1)
    normalized = {}
    for node_id, point in selected.items():
        normalized[node_id] = {
            "x": round(28 + ((point["x"] - min_x) / width) * 404, 3),
            "y": round(28 + ((point["y"] - min_y) / height) * 404, 3),
            "depth": depth.get(node_id, 2),
        }
    return normalized


TABLE_CELL_TRANSLATIONS = {
    "Model": "模型",
    "Backbone": "骨干网络",
    "#params": "参数量",
    "APs": "小目标 AP",
    "APM": "中目标 AP",
    "APL": "大目标 AP",
    "PQ SQ RQ": "PQ / SQ / RQ",
    "PQth SQth RQth PQst SQst RQst": "things PQ/SQ/RQ 与 stuff PQ/SQ/RQ",
    "PanopticFPN++1": "PanopticFPN++",
}


def translate_table_html(html: str) -> str:
    def replace_cell(match: re.Match[str]) -> str:
        value = match.group(1).strip()
        return f"<td>{TABLE_CELL_TRANSLATIONS.get(value, value)}</td>"

    return re.sub(r"<td>(.*?)</td>", replace_cell, html)


IMAGE_CAPTION_TRANSLATIONS = {
    "Fig. 1": "图 1：DETR 将一个常规 CNN 与 Transformer 架构结合，直接并行预测最终检测集合。训练期间，二分匹配会把预测与真实框唯一配对；没有匹配的预测应输出 no-object 类。",
    "Fig. 2": "图 2：DETR 使用常规 CNN backbone 学习输入图像的二维表示；模型将其展平并加入位置编码后送入 Transformer encoder。Transformer decoder 接收少量固定数量的可学习位置嵌入，即 object queries，并同时关注 encoder 输出。decoder 的每个输出嵌入都会送入共享前馈网络，预测一个检测结果（类别和边界框）或 no-object 类。",
    "Fig. 3": "图 3：一组参考点的 encoder self-attention。encoder 能够分离不同实例。图中预测来自验证图像上的 baseline DETR。",
    "Fig. 4": "图 4：长训练计划 baseline 模型中，每个 decoder layer 之后的 AP 与 AP50 表现。DETR 按设计不需要 NMS；该图也验证了这一点。在最后几层中，NMS 会移除真阳性预测并降低 AP；在前几层中，由于 DETR 尚未具备消除重复预测的能力，NMS 反而会改善结果。",
    "Fig. 5": "图 5：稀有类别的分布外泛化。尽管训练集中没有超过 13 只长颈鹿的图像，DETR 仍能泛化到 24 个及更多实例。",
    "Fig. 6": "图 6：对每个预测对象可视化 decoder attention（图像来自 COCO 数据集）。预测由 DETR-DC5 模型生成。decoder 通常关注对象的局部极端部位，例如腿和头部。",
    "Fig. 7": "图 7：panoptic head 示意图。模型为每个检测到的对象并行生成二值 mask，然后用逐像素 argmax 合并这些 mask。",
    "Fig. 8": "图 8：DETR-R101 生成的全景分割定性结果。DETR 以统一方式为 things 和 stuff 生成对齐的 mask 预测。",
}


def translate_image_caption(markdown: str) -> str:
    for figure, translation in IMAGE_CAPTION_TRANSLATIONS.items():
        if figure in markdown:
            return translation
    caption = re.sub(r"!\[[^\]]*\]\([^)]+\)", "", markdown).strip()
    return caption


def graph_depths(nodes: list[dict[str, object]], edges: list[dict[str, object]], start: str) -> dict[str, int]:
    adjacency: dict[str, set[str]] = {str(node.get("node_id")): set() for node in nodes}
    for edge in edges:
        source = str(edge.get("source") or "")
        target = str(edge.get("target") or "")
        if source in adjacency and target in adjacency:
            adjacency[source].add(target)
            adjacency[target].add(source)
    depth: dict[str, int] = {start: 0}
    queue = [start]
    while queue:
        current = queue.pop(0)
        if depth[current] >= 2:
            continue
        for nxt in sorted(adjacency.get(current, [])):
            if nxt not in depth:
                depth[nxt] = depth[current] + 1
                queue.append(nxt)
    return depth


def radial_graph_layout(
    nodes: list[dict[str, object]],
    edges: list[dict[str, object]],
    start: str,
    depth: dict[str, int],
) -> dict[str, dict[str, object]]:
    rings: dict[int, list[dict[str, object]]] = {0: [], 1: [], 2: []}
    for node in nodes:
        node_id = str(node.get("node_id"))
        rings.setdefault(depth.get(node_id, 2), []).append(node)

    coordinates: dict[str, dict[str, object]] = {}
    for ring_depth, ring_nodes in rings.items():
        ring_nodes.sort(key=lambda item: (str(item.get("kind")), str(item.get("title") or item.get("node_id"))))
        if ring_depth == 0:
            for node in ring_nodes:
                coordinates[str(node.get("node_id"))] = {"x": 230.0, "y": 230.0, "depth": 0}
            continue
        radius = 100 if ring_depth == 1 else 190
        count = max(1, len(ring_nodes))
        for idx, node in enumerate(ring_nodes):
            angle = (-math.pi / 2) + (2 * math.pi * idx / count)
            coordinates[str(node.get("node_id"))] = {
                "x": round(230 + radius * math.cos(angle), 3),
                "y": round(230 + radius * math.sin(angle), 3),
                "depth": ring_depth,
            }
    return coordinates


def graph_layout(snapshot: dict[str, object]) -> dict[str, object]:
    nodes = [node for node in snapshot.get("nodes", []) if isinstance(node, dict)]
    edges = [edge for edge in snapshot.get("edges", []) if isinstance(edge, dict)]
    start = str(snapshot.get("start_node_id") or "zotero:item:EIMSDEU3")
    depth = graph_depths(nodes, edges, start)
    force_layout = read_host_bridge_force_layout()
    coordinates = normalize_force_coordinates(nodes, force_layout.get("coordinates", {}), depth)
    layout_name = "host-bridge-workbench-overview-force"
    source = "host_bridge_force_layout"
    if str(force_layout.get("layout_key") or "").startswith("local_synthesis_state:"):
        layout_name = "local-persisted-force-layout"
        source = "local_persisted_force_layout"
    if len(coordinates) != len(nodes):
        fallback_coordinates = radial_graph_layout(nodes, edges, start, depth)
        for node_id, point in fallback_coordinates.items():
            coordinates.setdefault(node_id, point)
        if force_layout.get("status") != "available":
            layout_name = "deterministic-radial-2hop"
            source = "fallback_radial"
    return {
        "schema_version": "literature-deep-reading.citation-graph-layout.v0",
        "layout": layout_name,
        "source": source,
        "start_node_id": start,
        "view_box": {"min_x": 0, "min_y": 0, "width": 460, "height": 460},
        "host_layout": {
            "status": force_layout.get("status"),
            "layout_key": force_layout.get("layout_key"),
            "graph_hash": force_layout.get("graph_hash"),
            "layout_hash": force_layout.get("layout_hash"),
            "updated_at": force_layout.get("updated_at"),
            "matched_node_count": len([node for node in nodes if str(node.get("node_id")) in force_layout.get("coordinates", {})]),
            "diagnostics": force_layout.get("diagnostics", []),
        },
        "nodes": coordinates,
    }


SECTION_TRANSLATIONS = {
    "End-to-End Object Detection with Transformers": """本文提出一种新的目标检测方法：把目标检测直接看成集合预测问题。传统检测器通常需要锚框、候选区域、窗口中心、非极大值抑制等人为设计的中间机制；这些机制在工程上有效，但也把“预测一个对象集合”拆成了许多间接任务。作者希望把这条管线压缩成一个端到端模型，让网络直接输出最终检测结果。

这套方法称为 DEtection TRansformer，简称 DETR。它的两个核心组成部分是：第一，一个基于二分匹配的集合损失，用来保证每个真实目标只匹配一个预测；第二，一个 Transformer 编码器-解码器结构，用来在全局图像上下文中并行产生固定数量的对象预测。模型输入图像后，先由 CNN 提取特征，再由 Transformer 建模全局关系，最后由一组可学习的 object queries 生成检测框和类别。

DETR 的意义不只是“把 Transformer 用到检测里”。更重要的是，它把检测结果视为一个无序集合，从训练目标上消除了重复预测的需求。因此推理阶段不再需要 NMS，也不需要为每个候选框手工设计先验。实验表明，DETR 在 COCO 上可以达到与强 Faster R-CNN 基线相近的精度和速度，并且可以自然扩展到全景分割。""",
    "1 Introduction": """目标检测的任务，是为图像中每个感兴趣的对象预测一个类别标签和一个边界框。现代检测器通常不是直接预测这个集合，而是先构造大量候选：可能是 proposals、anchors，也可能是窗口中心。之后模型在这些候选上做分类和回归，再用 NMS 等后处理把重复结果合并掉。这种做法很强，但也意味着检测器的表现高度依赖候选设计、目标分配启发式和后处理规则。

作者提出的方向是直接集合预测：模型一次性输出一个对象集合，而不是先输出大量候选再筛选。这个想法在机器翻译、语音识别等结构化预测任务中已经很有影响力，但在目标检测中还没有成为强基线。过去也有一些端到端检测尝试，不过它们往往仍然引入额外先验，或者在困难基准上无法和成熟检测器竞争。本文要解决的正是这个缺口。

DETR 的关键做法，是把 Transformer 的全局建模能力和集合预测损失结合起来。Transformer 的自注意力会显式建模序列元素之间的两两关系，这使它适合处理“多个预测之间不能重复”的约束。训练时，DETR 用集合损失在预测和真实目标之间做一对一匹配；推理时，模型直接输出最终检测集合，不再需要 NMS。

论文的图 1 展示了整体流程：CNN backbone 提取图像特征，Transformer 编码器-解码器在全局范围内推理，固定数量的 object queries 并行产生预测。没有匹配到真实目标的预测会被训练为 no-object 类。这样的设计让 DETR 比传统检测器少了许多手工组件，也更容易在标准深度学习框架中复现。

作者在 COCO 上把 DETR 与经过长期优化的 Faster R-CNN 基线比较。结果显示，DETR 的总体性能具有竞争力，尤其在大目标上表现更好，这可能得益于 Transformer 的非局部计算；但它在小目标上较弱，训练周期也更长。论文后续的实验和消融分析，正是围绕这些优势、代价和必要组件展开。""",
    "2 Related Work": """相关工作部分把本文放在三个背景中理解：集合预测、基于 Transformer 的编码器-解码器与并行解码，以及目标检测方法。读这一节时不要把它当成普通文献清单；它是在说明 DETR 为什么需要同时解决“无序集合监督”“全局关系建模”和“检测管线去手工化”这三个问题。

集合预测解释了为什么普通逐位置监督不适合目标检测：同一组目标没有天然顺序，预测和真实标注之间需要先建立匹配。Transformer 和并行解码解释了为什么模型可以一次性输出多个结果，而不是自回归地一个接一个生成。目标检测相关工作则说明，现有强检测器虽然效果好，但多数仍依赖候选、锚框、NMS 或密集预测网格。""",
    "2.1 Set Prediction": """直接预测集合的困难在于：集合元素没有固定顺序。若模型输出 N 个预测，而图像中有若干真实目标，我们不能简单地把第 i 个预测和第 i 个真实框相减，因为真实框的排列本身没有意义。监督信号必须对预测顺序保持不变，也就是 permutation-invariant。

一个常见办法是先求预测和真实目标之间的最佳一对一分配，再在这个分配上计算损失。Hungarian algorithm 正是用来解决这种二分匹配问题的。它可以保证每个真实目标最多匹配一个预测，每个预测也最多匹配一个真实目标，从而避免多个预测同时追逐同一个目标。

DETR 沿用了这种 matching loss 思路，但不使用自回归序列模型。相比之下，过去一些集合预测方法会一个元素接一个元素地产生输出，或者需要复杂的全局推理。DETR 选择用 Transformer 并行解码固定数量的预测槽位，让每个槽位在注意力机制中相互协调，再由二分匹配损失约束唯一性。""",
    "2.2 Transformers and Parallel Decoding": """Transformer 最初在机器翻译中被提出，核心是自注意力。自注意力让每个位置都可以直接看到其他位置，因此很适合建模长距离依赖和全局关系。对于 DETR 来说，这一点尤其重要：检测并不是孤立地预测一个框，而是要让多个预测共同解释整幅图像，尽量避免重复。

传统序列生成常用自回归解码，即先生成第一个输出，再生成第二个输出。DETR 不采用这种方式，因为检测结果本身是无序集合，不需要人为规定生成顺序。它使用并行解码：一组 object queries 同时进入 decoder，每个 query 最终产生一个候选对象表示。这样的并行结构更符合集合预测的性质。

这里的 object query 不应理解成 anchor box。它不是预先放在图像某个位置上的候选框，也不是从图像裁出的区域。更准确地说，它是一组可学习的解码槽位，模型通过训练学会让不同槽位关注不同对象或 no-object。""",
    "2.3 Object Detection": """目标检测长期由多阶段或单阶段检测器主导。两阶段方法先产生候选区域，再对候选区域分类和回归；单阶段方法则在密集位置或锚框上直接预测类别和框。Faster R-CNN、RetinaNet 等方法经过大量工程优化，在 COCO 等基准上非常强。

但这些方法大多依赖密集候选和后处理。NMS 的存在说明模型本身会产生多个高度重叠的预测，需要用规则把它们压缩成一个结果。锚框和目标分配策略也会把很多人工先验写入检测管线。DETR 与这些方法的区别，不只是网络结构不同，而是把输出从“候选集合再筛选”改成了“直接输出最终集合”。

因此，本文不是简单地把 Faster R-CNN 的某个模块替换成 Transformer。它试图改变检测问题的表述：训练目标直接要求唯一匹配，模型结构负责全局推理，推理阶段不再依赖检测专用的后处理。""",
    "3 The DETR Model": """DETR 的方法可以分成两部分阅读。第一部分是集合预测损失，它回答“怎样训练模型，让多个预测不会重复解释同一个目标”。第二部分是模型架构，它回答“怎样从图像产生固定数量的对象预测”。如果只看架构图，很容易误以为 DETR 的贡献只是加了 Transformer；真正支撑端到端检测的是二分匹配损失和并行解码之间的配合。

模型固定输出 N 个预测，其中 N 远大于一张图中通常出现的对象数量。每个预测包含一个类别分布和一个归一化边界框。训练时，真实目标会和预测集合做最佳匹配；没有匹配到真实目标的预测被监督为 no-object。这样一来，模型学到的是一个完整集合，而不是一堆需要后处理清理的候选框。""",
    "3.1 Object Detection Set Prediction Loss": """这一节是 DETR 的核心。设图像中的真实目标集合为 y，模型输出固定数量 N 个预测。由于 N 通常大于真实目标数，作者把真实集合补齐到 N 个元素，其中额外元素表示 no-object。接着，他们在预测集合和补齐后的真实集合之间寻找一个代价最小的排列，也就是 Hungarian matching。

匹配代价同时考虑分类和边界框。对真实目标而言，预测类别越接近真实类别、预测框越接近真实框，匹配代价越低。求得最优匹配后，DETR 在这个一对一关系上计算最终损失：类别损失负责区分目标类别和 no-object，框损失负责回归边界框位置。

框损失不是只用 L1 距离。作者还加入 generalized IoU，因为单独的 L1 对尺度敏感，而且与检测评价中常用的重叠度不完全一致。L1 和 GIoU 结合后，既能稳定优化坐标，又能鼓励预测框与真实框有更好的空间重叠。

这一机制的关键结果是：每个真实目标只会分配给一个预测。重复预测不会同时获得正样本监督，其余多余预测会被推向 no-object。因此，模型在训练阶段就被迫学习“唯一地解释目标”，而不是在推理阶段再用 NMS 清理重复框。""",
    "3.2 DETR Architecture": """DETR 的架构由 CNN backbone、Transformer encoder、Transformer decoder 和预测头组成。输入图像首先经过 CNN，得到低分辨率、高语义的特征图。作者把这个二维特征图展平成序列，并加入位置编码，使 Transformer 能保留空间位置信息。

Encoder 对整幅图像特征做全局自注意力建模。这样，每个空间位置都可以和其他位置交互，模型能看到对象之间以及对象与背景之间的全局关系。Decoder 接收一组 learned object queries，并通过注意力从 encoder 输出中提取与每个查询相关的信息。每个 query 最终对应一个预测槽位。

预测头很简单：一个前馈网络预测边界框，另一个线性层预测类别。所有 query 共享这些预测头。因为 decoder 的多个 query 是并行处理的，所以 DETR 一次性输出整组检测结果。辅助损失被加在 decoder 的中间层上，用来帮助训练更稳定地收敛。

需要特别注意 object queries 的角色。它们不是锚框，不携带预设尺度或位置；它们也不是候选区域。它们是可学习的查询向量，通过训练分化出不同的对象解释功能。这也是 DETR 和传统检测器在结构直觉上的重要差别。""",
    "4 Experiments": """实验部分验证两件事：DETR 是否能作为目标检测器与强基线竞争，以及这种集合预测框架是否能扩展到全景分割。作者主要在 COCO 上评估检测性能，并与 Faster R-CNN、RetinaNet 等方法比较。

读实验时要同时看正面结果和限制。正面结果是：在没有 NMS、anchor 和候选区域设计的情况下，DETR 可以取得有竞争力的 AP，说明直接集合预测在目标检测上是可行的。限制是：DETR 需要更长训练，小目标性能较弱，对多尺度细节不如带 FPN 的检测器敏感。""",
    "4.1 Comparison with Faster R-CNN and RetinaNet": """与 Faster R-CNN 和 RetinaNet 的比较显示，DETR 的整体 AP 与强基线接近。它在大目标上表现尤其好，这与 Transformer 的全局上下文建模能力相吻合：大目标往往需要整合更大范围的图像信息。

但 DETR 在小目标上明显吃亏。原因可能包括特征图分辨率较低、缺少多尺度金字塔结构，以及初版 DETR 的 attention 计算没有专门针对小目标密集区域优化。这个结果后来直接推动了 Deformable DETR、Conditional DETR、DAB-DETR 等后续工作，它们大多试图改善收敛速度、查询定位或多尺度建模。""",
    "4.2 Ablations": """消融实验用来回答：DETR 的哪些部件是真的必要。结果表明，encoder、decoder、位置编码、辅助损失和集合损失都会影响最终性能。尤其是 encoder 的全局自注意力，对建模对象关系和提升性能有明显帮助。

object queries 的数量也很重要。查询数量需要足够覆盖图像中可能出现的对象，但过多查询也会增加 no-object 学习的压力。辅助解码损失能够让中间层也获得监督，缓解训练初期匹配不稳定的问题。

消融表不应只当作性能列表来读。它们说明 DETR 的端到端性质不是某一个模块单独带来的，而是集合匹配损失、全局特征交互、并行 queries 和稳定训练策略共同形成的。""",
    "4.3 DETR for Panoptic Segmentation": """作者还把 DETR 扩展到全景分割。做法是在检测模型上增加 mask head，让每个 object query 不仅预测类别和框，也预测对应的分割 mask。由于 DETR 本来就输出对象集合，这种扩展比较自然：每个 query 可以对应一个实例或一个区域。

全景分割实验表明，DETR 的集合预测思想不局限于边界框检测。它可以作为更统一的视觉预测框架，把实例级识别和像素级分割放进同一组对象表示中。对本文来说，这一节的重点不是提出最复杂的分割系统，而是证明 DETR 的范式具有可迁移性。""",
    "5 Conclusion": """论文最后总结说，DETR 提供了一种目标检测的新范式：用 Transformer 和二分匹配损失，把检测写成直接集合预测问题。它简化了传统检测管线，移除了 NMS、锚框和候选区域等手工组件，并在 COCO 上达到有竞争力的性能。

同时，初版 DETR 也暴露出明显问题：训练慢，小目标弱，对多尺度结构利用不足。正因为这些问题清晰，DETR 后续形成了庞大的改进谱系。读完本文后，应该把它看成 DETR-family 的起点：它定义了问题表述和基本框架，后续工作则围绕收敛速度、query 设计、多尺度注意力和实时检测不断推进。""",
    "References": """参考文献部分可以作为回溯阅读的路线图。与本文核心论证最相关的线索包括：Faster R-CNN、RetinaNet、FPN 等传统检测器；Transformer 与注意力机制；Hungarian matching 和集合预测；COCO 与全景分割评估。

如果目的是理解 DETR，不需要平均阅读每一条参考文献。更有效的方式是围绕问题回查：想理解它为什么取消 NMS，就回到传统检测器和 matching loss；想理解它为什么小目标弱，就回到 FPN 和多尺度检测；想理解后续 DETR-family，就沿着 Deformable DETR、Conditional DETR、DAB-DETR 等工作继续读。""",
}


READING_AIDS = {
    "End-to-End Object Detection with Transformers": ("先抓住论文主张：目标检测可以被直接表述为集合预测。", ["DETR", "set prediction", "bipartite matching", "Transformer"], "不要把贡献简化成“检测器里用了 Transformer”。"),
    "1 Introduction": ("理解作者为什么认为传统检测器的后处理和手工组件是问题。", ["NMS", "anchor", "proposal", "end-to-end"], "NMS 不是普通工程细节，它说明模型输出还没有天然形成唯一目标集合。"),
    "2 Related Work": ("把 DETR 放进集合预测、Transformer 和目标检测三条背景线。", ["set prediction", "parallel decoding", "object detection"], "相关工作不是文献列表，而是作者为自己的问题定义寻找支撑。"),
    "2.1 Set Prediction": ("看懂为什么集合预测需要处理预测顺序不确定的问题。", ["permutation", "assignment", "Hungarian algorithm"], "预测集合没有顺序，因此不能直接按位置逐项监督。"),
    "2.2 Transformers and Parallel Decoding": ("理解并行解码和注意力为何适合固定数量输出槽位。", ["self-attention", "decoder", "parallel decoding"], "Transformer 在这里不是替代全部视觉特征提取，CNN backbone 仍然存在。"),
    "2.3 Object Detection": ("识别 DETR 与 Faster R-CNN、RetinaNet 等传统检测器的范式差异。", ["Faster R-CNN", "RetinaNet", "post-processing"], "不要只按 one-stage/two-stage 分类理解 DETR。"),
    "3 The DETR Model": ("建立方法总览，再分别读损失函数和架构。", ["set loss", "backbone", "encoder-decoder"], "取消 NMS 的理由主要在一对一匹配损失，而不是架构图本身。"),
    "3.1 Object Detection Set Prediction Loss": ("掌握 DETR 如何用 matching loss 强制唯一预测。", ["Hungarian matching", "no-object", "box loss"], "matching 发生在训练损失中，不是推理阶段的后处理。"),
    "3.2 DETR Architecture": ("看懂 object queries、encoder、decoder 和预测头的角色。", ["object query", "positional encoding", "FFN"], "object query 不是 anchor box，也不是从图像中裁出的候选区域。"),
    "4 Experiments": ("从实验中同时读出可行性和局限。", ["COCO", "AP", "training schedule"], "不要只看最终 AP；训练成本、小目标表现和消融结论同样重要。"),
    "4.1 Comparison with Faster R-CNN and RetinaNet": ("比较 DETR 与强基线的优势和短板。", ["Faster R-CNN", "RetinaNet", "APs", "APl"], "大目标优势不能掩盖小目标短板。"),
    "4.2 Ablations": ("用消融实验确认架构和损失组件的必要性。", ["ablation", "encoder", "decoder"], "消融表应该回到集合预测是否稳定这一主线。"),
    "4.3 DETR for Panoptic Segmentation": ("理解 DETR 如何从检测扩展到更统一的视觉预测任务。", ["panoptic segmentation", "mask head", "PQ"], "全景分割部分是在展示集合预测范式的可迁移性。"),
    "5 Conclusion": ("收束贡献，并把局限转化为后续阅读路径。", ["paradigm", "convergence", "multi-scale"], "DETR 初版不是性能终点，它是后续 DETR-family 的起点。"),
    "References": ("保留引用线索，必要时回溯检测器、Transformer 和评估基准。", ["Faster R-CNN", "RetinaNet", "Transformer"], "参考文献不需要逐条精读，优先回查关键工作。"),
}


PARAGRAPH_TRANSLATIONS = [
    "Nicolas Carion、Francisco Massa、Gabriel Synnaeve、Nicolas Usunier、Alexander Kirillov 和 Sergey Zagoruyko。",
    "1 巴黎多芬大学，法国巴黎。2 Facebook AI，美国门洛帕克。作者联系方式见原文。",
    "本文提出一种新方法，将目标检测视为直接的集合预测问题。该方法简化了检测流水线，有效去除了许多人工设计的组件，例如显式编码任务先验知识的非极大值抑制过程或 anchor 生成。这个新框架称为 DEtection TRansformer，简称 DETR。它的主要组成部分包括：一种基于集合的全局损失，通过二分匹配强制预测唯一；以及一种 Transformer 编码器-解码器架构。给定一组固定数量的可学习 object queries，DETR 会结合对象之间的关系和全局图像上下文，并行地直接输出最终预测集合。这个新模型概念简单，不需要专用库；DETR 在具有挑战性的 COCO 目标检测数据集上表现出与成熟且高度优化的 Faster R-CNN 基线相当的精度和运行时性能。此外，DETR 可以很容易地推广到统一方式的全景分割，并显著超过竞争性基线。训练代码和预训练模型见 https://github.com/facebookresearch/detr。",
    "目标检测的目标，是为每个感兴趣对象预测一组边界框和类别标签。现代检测器通常以间接方式处理这一集合预测任务：它们在大量 proposals、anchors 或窗口中心之上定义替代的回归与分类问题。这些方法的性能显著受到若干因素影响，包括用于合并近似重复预测的后处理步骤、anchor 集合的设计，以及把目标框分配给 anchor 的启发式规则。为了简化这些流水线，本文提出一种直接的集合预测方法，绕过这些代理任务。这种端到端思路在图像分类或语义分割等复杂结构化预测任务中已经取得重要进展，但在目标检测中尚未出现能够与强基线竞争的方法。以往检测器主要依赖候选框、anchors 或窗口中心等人工先验，限制了直接端到端集合预测的形式。",
    "本文通过把目标检测视为直接集合预测问题来简化训练流水线。我们采用基于 Transformer 的编码器-解码器架构，这是一种常用于序列预测的架构。Transformer 的 self-attention 机制能够显式建模序列元素之间的所有两两交互，因此特别适合处理集合预测中的特定约束，例如去除重复预测。",
    "DEtection TRansformer（DETR，见图 1）一次性预测所有对象，并使用集合损失函数端到端训练；该损失函数在预测对象和真实对象之间执行二分匹配。DETR 去掉了多个编码先验知识的人工设计组件，例如空间 anchors 和非极大值抑制，从而简化检测流水线。与多数现有检测方法不同，DETR 不需要任何定制层，因此只要框架中包含标准 CNN 和 Transformer 类，就可以较容易地复现。",
    "与大多数以往的直接集合预测工作相比，DETR 的主要特征在于把二分匹配损失与采用非自回归并行解码的 Transformer 结合起来。相比之下，以往工作侧重于使用 RNN 的自回归解码。我们的匹配损失函数会把一个预测唯一分配给一个真实对象，并且对预测对象的排列保持不变，因此模型可以并行发出这些预测。",
    "我们在最常用的目标检测数据集之一 COCO 上评估 DETR，并将其与竞争力很强的 Faster R-CNN 基线比较。Faster R-CNN 经历了多轮设计迭代，相比最初发表时性能已显著提升。实验表明，我们的新模型取得了相当的性能。更具体地说，DETR 在大目标上表现明显更好，这一结果很可能得益于 Transformer 的非局部计算；但在小目标上性能较低。我们预计，未来工作可以像 FPN 对 Faster R-CNN 的发展那样改善这一方面。",
    "DETR 的训练设置在多个方面不同于标准目标检测器。这个新模型需要额外长的训练计划，并且受益于 Transformer 中的辅助解码损失。我们会系统考察哪些组件对所展示的性能至关重要。",
    "DETR 的设计理念很容易扩展到更复杂的任务。在实验中，我们展示了在预训练 DETR 之上训练一个简单分割头，可以在全景分割这一近年来受到关注且具有挑战性的像素级识别任务上超过竞争性基线。",
    "我们的工作建立在多个领域的既有研究之上：用于集合预测的二分匹配损失、基于 Transformer 的编码器-解码器架构、并行解码，以及目标检测方法。",
    "目前还没有一种公认的深度学习模型可以直接预测集合。最基本的集合预测任务是多标签分类，在计算机视觉语境中可参见相关文献；但其基线方法 one-vs-rest 并不适用于检测这类元素之间存在底层结构的问题，例如近乎相同的边界框。这类任务的第一个困难是避免近似重复。当前多数检测器使用非极大值抑制等后处理来解决这一问题，但直接集合预测不需要后处理。它们需要全局推理机制来建模所有预测元素之间的交互，以避免冗余。对于集合预测，训练损失也应当对预测排列保持不变。常用做法是基于 Hungarian algorithm 在真实对象和预测之间设计一个二分匹配损失，以强制一对一分配。本文采用二分匹配损失；与多数既有工作不同，我们放弃自回归模型，而是使用具备并行解码能力的 Transformer。",
    "Transformer 由 Vaswani 等人提出，是一种用于机器翻译的新型注意力构件。注意力机制是一类神经网络层，用于从整个输入序列聚合信息。Transformer 引入了 self-attention 层；它与 Non-Local Neural Networks 类似，会遍历序列中的每个元素，并通过聚合整个序列的信息来更新该元素。基于注意力模型的主要优势之一是具备全局计算能力，并且相比 RNN 更适合并行化。Transformer 现在已经在自然语言处理、语音处理和计算机视觉等许多问题中取代 RNN。",
    "Transformer 最初用于自回归模型，延续了早期 sequence-to-sequence 模型的方式，逐个生成输出 token。然而，由于推理成本过高，即成本与输出长度成比例且难以批处理，音频、机器翻译、词表示学习以及较新的语音识别等领域发展出了并行序列生成方法。我们同样结合 Transformer 与并行解码，原因是它们在计算成本和执行集合预测所需全局计算能力之间提供了合适折中。",
    "多数现代目标检测方法都相对于某种初始猜测进行预测。两阶段检测器相对于 proposals 预测边界框，而单阶段方法则相对于 anchors 或可能的对象中心网格进行预测。近期工作表明，这些系统的最终性能很大程度上取决于这些初始猜测的具体设置方式。在我们的模型中，可以去除这一人工设计过程，并通过直接预测输入图像中的绝对边界框来简化检测流程。",
    "若干目标检测器使用过二分匹配损失。然而，在这些早期深度学习模型中，不同预测之间的关系只通过卷积层或全连接层建模，并且人工设计的 NMS 后处理能够提升其性能。更近期的检测器则使用真实对象与预测之间的非唯一分配规则，并配合 NMS。",
    "可学习 NMS 方法和 relation networks 使用注意力显式建模不同预测之间的关系。借助直接集合损失，它们不需要任何后处理步骤。不过，这些方法为了高效建模检测之间的关系，会使用额外的人工设计上下文特征，例如 proposal box 坐标；而我们寻找的是减少模型中先验知识编码的方案。",
    "与我们方法最接近的是面向目标检测和实例分割的端到端集合预测方法。与我们类似，它们使用二分匹配损失和基于 CNN 激活的编码器-解码器架构，直接产生一组边界框。然而，这些方法只在小数据集上评估，并未与现代基线比较。尤其是，它们基于自回归模型，更准确地说是 RNN，因此没有利用最新的并行解码 Transformer。",
    "检测中的直接集合预测需要两个要素：（1）一个集合预测损失，强制预测框和真实框之间唯一匹配；",
    "（2）一个能够单次前向预测对象集合并建模对象之间关系的架构。我们在图 2 中详细描述该架构。",
    "DETR 通过 decoder 单次前向推理出固定大小的 $N$ 个预测，其中 $N$ 被设为显著大于一张图像中通常出现的对象数量。训练中的主要困难之一，是根据真实标注为预测对象的类别、位置和尺寸打分。我们的损失先在预测对象和真实对象之间产生最优二分匹配，然后优化对象特定的边界框损失。",
    "记真实对象集合为 $y$，$N$ 个预测的集合为 $\\hat { y } ~ = ~ \\{ \\hat { y } _ { i } \\} _ { i = 1 } ^ { N }$。假设 $N$ 大于图像中的对象数量，我们也把 $y$ 视为大小为 $N$ 的集合，并用 $\\mathcal { O }$（no object）进行填充。为了在这两个集合之间寻找二分匹配，我们搜索一个包含 $N$ 个元素的排列 $\\sigma \\in { \\mathfrak { S } } _ { N }$，使其代价最低：",
    "其中 $\\mathcal { L } _ { \\mathrm { m a t c h } } \\big ( y _ { i } , \\hat { y } _ { \\sigma ( i ) } \\big )$ 是真实对象 $y _ { i }$ 与索引为 $\\sigma ( i )$ 的预测之间的成对匹配代价。按照既有工作，这个最优分配可以用 Hungarian algorithm 高效计算。",
    "匹配代价同时考虑类别预测和预测框与真实框之间的相似度。真实集合中的每个元素 $i$ 可以表示为 $y _ { i } ~ = ~ ( c _ { i } , b _ { i } )$，其中 $c _ { i }$ 是目标类别标签，也可能是 $\\mathcal { O }$；$b _ { i } ~ \\in ~ [ 0 , 1 ] ^ { 4 }$ 是定义真实框中心坐标及其相对于图像尺寸的高度、宽度的向量。对于索引为 $\\sigma ( i )$ 的预测，我们定义类别概率为 $\\hat { p } _ { \\sigma ( i ) } ( c _ { i } )$，预测框为 $\\hat { b } _ { \\sigma ( i ) }$。匹配代价由类别项和框项组成。",
    "寻找匹配的这一过程，与现代检测器中用于把 proposals 或 anchors 匹配到真实对象的启发式分配规则起到相同作用。主要区别在于，直接集合预测为了避免重复，需要寻找一对一匹配。",
    "第二步是对上一步匹配好的所有预测对计算损失函数，即 Hungarian loss。我们用类似常见目标检测器的方式定义该损失：它是类别预测负对数似然与边界框损失 $\\mathcal { L } _ { \\mathrm { b o x } } ( \\cdot , \\cdot )$ 的线性组合；边界框损失将在后文定义：",
    "其中 $\\hat { \\sigma }$ 是第一步中计算得到的最优分配。在实践中，当 $c _ { i } = \\emptyset$ 时，我们将 log-probability 项按因子 10 降权，以处理类别不平衡。这类似于 Faster R-CNN 训练过程中通过子采样平衡正负 proposals 的做法。注意，一个对象与 no-object 的匹配代价不依赖预测，这意味着在这种情况下该代价是常数；在匹配代价中，我们会省略该常数。",
    "边界框损失。匹配代价和 Hungarian loss 的第二部分是用于给边界框打分的 $\\mathcal { L } _ { \\mathrm { b o x } } ( \\cdot )$。与许多检测器相对于某些初始猜测预测框的 $\\varDelta$ 不同，我们直接预测框。虽然这种方法简化了实现，但会带来损失相对尺度的问题。最常用的 $\\ell _ { 1 }$ 损失会让小框和大框即便相对误差相同也产生不同尺度。因此，为了缓解这一问题，我们使用 $\\ell _ { 1 }$ 损失和 generalized IoU 损失的线性组合，后者对框尺度更不敏感。",
    "DETR 的整体架构出乎意料地简单，如图 2 所示。它包含三个主要组件：用于提取紧凑特征表示的 CNN backbone、一个编码器-解码器 Transformer，以及一个用于产生最终检测预测的简单前馈网络（FFN）。",
    "与许多现代检测器不同，DETR 可以在任何提供常规 CNN backbone 和 Transformer 架构实现的深度学习框架中，用几百行代码实现。DETR 的推理代码在 PyTorch 中可以少于 50 行。我们希望这种方法的简单性能够吸引新的研究者进入检测领域。",
    "Backbone。从初始图像 $x _ { \\mathrm { i m g } } ~ \\in ~ \\mathbb { R } ^ { 3 \\times H _ { 0 } \\times W _ { 0 } }$ 出发，其中包含 3 个颜色通道，一个常规 CNN backbone 会生成低分辨率激活图 $f \\in \\mathbb { R } ^ { C \\times H \\times W }$。我们使用的典型取值是 $C = 2048$，且 $H, W = H _ { 0 } / 32, W _ { 0 } / 32$。",
    "Transformer Encoder。首先，一个 $1 \\times 1$ 卷积将高层激活图 $f$ 的通道维度从 $C$ 降到较小维度 $d$，得到新的特征图 $z _ { 0 } \\in \\mathbb { R } ^ { d \\times H \\times W }$。由于 encoder 期望序列作为输入，我们将 $z _ { 0 }$ 的空间维度折叠为一维，得到 $d \\times HW$ 的特征图。每个 encoder layer 都采用标准结构，由 multi-head self-attention 模块和 feed forward network 组成。由于 Transformer 架构对排列不敏感，我们在每个 attention layer 的输入中加入位置编码。",
    "Transformer Decoder。decoder 遵循 Transformer 的标准架构，使用 multi-headed self-attention 和 encoder-decoder attention 机制变换 $N$ 个大小为 $d$ 的嵌入。与原始 Transformer 的区别在于，我们的模型在每个 decoder layer 中并行解码 $N$ 个对象，而 Vaswani 等人的模型是自回归的，会一次预测输出序列中的一个元素。对相关概念不熟悉的读者可参见补充材料。由于 decoder 也是排列不敏感的，所以必须为输入嵌入提供不同的 object queries，使模型能够产生不同预测。",
    "预测前馈网络（FFNs）。最终预测由一个 3 层感知机和一个线性投影层计算；感知机使用 ReLU 激活函数和隐藏维度 $d$。FFN 预测相对于输入图像归一化后的框中心坐标、高度和宽度，线性层使用 softmax 函数预测类别标签。由于我们预测固定大小的 $N$ 个边界框，而 $N$ 通常远大于图像中实际感兴趣对象的数量，因此还使用一个额外的特殊类别标签 $\\emptyset$ 表示该槽位没有检测到对象。这个类别在标准目标检测方法中相当于 background 类。",
    "辅助解码损失。我们发现训练时在 decoder 中使用辅助损失是有帮助的，尤其有助于模型输出每个类别的正确对象数量。每个 decoder layer 的输出先经过共享 layer-norm 归一化，再送入共享预测头，也就是分类头和框预测头。随后我们照常使用 Hungarian loss 进行监督。",
    "我们展示 DETR 在 COCO 的定量评估中相对于 Faster R-CNN 和 RetinaNet 取得了竞争性结果。随后，我们对架构和损失进行详细消融研究，并给出洞察和定性结果。最后，为了说明 DETR 是一个通用模型，我们展示了全景分割结果：只在固定的 DETR 模型上训练一个小扩展模块。",
    "数据集。我们在 COCO 2017 检测和全景分割数据集上进行实验，其中包含 118k 张训练图像和 5k 张验证图像。每张图像都标注有边界框和全景分割。平均每张图像有 7 个实例，训练集中单张图像最多有 63 个实例，同一图像中的对象大小从小到大不等。除非另有说明，我们报告的 AP 指 bbox AP，即多个阈值上的积分指标。为了与其他模型比较，我们也报告 AP50 和 AP75，并报告小目标、中目标、大目标 AP。",
    "技术细节。我们使用 AdamW 训练 DETR，将 Transformer 初始学习率设为 $10^{-4}$，backbone 初始学习率设为 $10^{-5}$，weight decay 设为 $10^{-4}$。所有 Transformer 权重用 Xavier 初始化；backbone 使用 torchvision 中经 ImageNet 预训练的 ResNet 模型，并冻结 batchnorm 层。我们报告两种 backbone 的结果：ResNet-50 和 ResNet-101，对应模型分别称为 DETR 和 DETR-R101。我们还通过在 backbone 最后阶段加入 dilation 提高特征分辨率，得到 DETR-DC5。",
    "我们使用尺度增强，对输入图像进行 resize，使短边至少为 480 像素、至多为 800 像素，同时长边至多为 1333 像素。为了帮助通过 encoder 的 self-attention 学习全局关系，我们还在训练期间使用随机裁剪增强，使性能约提升 1 AP。具体而言，训练图像以 0.5 的概率被裁剪为随机矩形块，然后再次 resize 到 800 到 1333 的范围。Transformer 使用 dropout 训练，dropout rate 为 0.1。",
    "表 1：在 COCO 验证集上，使用 ResNet-50 和 ResNet-101 backbone 比较 DETR、RetinaNet 和 Faster R-CNN。表格上半部分展示 Detectron2 中模型的结果，中间部分展示加入 GIoU、随机裁剪训练增强和长训练计划后的模型结果。DETR 模型取得了与大量调优的 Faster R-CNN 基线相当的结果；其小目标 AP 较低，但大目标 AP 显著提升。FPS 使用 torchscript 模型测量。",
    "Transformer 通常使用 Adam 或 Adagrad 优化器、很长的训练计划和 dropout 进行训练，DETR 也是如此。相比之下，Faster R-CNN 使用 SGD 训练，数据增强较少，我们也不知道 Adam 或 dropout 在 Faster R-CNN 上的成功应用。尽管存在这些差异，我们仍尝试增强基线。为了使其与 DETR 对齐，我们在框损失中加入 generalized IoU，使用相同的随机裁剪增强和已知能提升结果的长训练计划。表 1 表明，这些改动使 Faster R-CNN 基线更强，但 DETR 仍具备竞争力。",
    "Transformer decoder 中的注意力机制是建模不同检测特征表示之间关系的关键组件。在消融分析中，我们研究架构和损失中的其他组件如何影响最终性能。该研究使用基于 ResNet-50 的 DETR 模型，包含 6 个 encoder layer、6 个 decoder layer，宽度为 256。该模型有 41.3M 参数，在短训练计划和长训练计划下分别达到 40.6 AP 和 42.0 AP，并以 28 FPS 运行，速度接近 Faster R-CNN-FPN。",
    "Encoder layer 数量。我们通过改变 encoder layer 数量来评估全局图像级 self-attention 的重要性。没有 encoder layer 时，整体 AP 下降 3.9 点，大目标 AP 的下降更明显，为 6.0 点。我们推测，通过使用全局场景推理，encoder 对区分对象实例很重要。附录给出了结果。图 3 中，我们可视化训练好模型最后一个 encoder layer 的 attention map，聚焦于图像中的若干点。",
    "Decoder layer 数量。我们在每个 decoding layer 后应用辅助损失，因此预测 FFN 按设计会从每个 decoder layer 的输出中预测对象。我们通过评估解码每个阶段可能预测出的对象，分析每个 decoder layer 的重要性（图 4）。AP 和 AP50 在每一层后都会提升；从第一层到最后一层，总提升达到显著的 +8.2 / +9.5 AP。由于中间层存在重复预测，NMS 在早期层会改善结果，但在最后层会降低 AP。",
    "与可视化 encoder attention 类似，我们在图 6 中可视化 decoder attention，并用不同颜色为每个预测对象标出 attention map。我们观察到 decoder attention 相当局部，主要关注对象的极端部位，例如头或腿。我们推测，在 encoder 通过全局 attention 分离实例之后，decoder 只需要关注对象极端部位来提取类别和对象边界。",
    "FFN 的重要性。Transformer 内部的 FFN 可以看作 $1 \\times 1$ 卷积层，使 encoder 类似于 attention augmented convolutional networks。我们尝试完全移除 FFN，只在 Transformer layer 中保留 attention。这样网络参数量从 41.3M 降到 28.7M，Transformer 中只剩 10.8M 参数，性能下降 2.3 AP。因此我们认为 FFN 对取得良好结果很重要。",
    "位置编码的重要性。我们的模型中有两类位置编码：空间位置编码和输出位置编码（object queries）。我们实验了固定编码与可学习编码的多种组合，结果见附录。输出位置编码是必需的，不能移除；因此我们实验了只在 decoder 输入处传入一次，或在每个 decoder attention layer 中都加到 queries 上。第一个实验完全移除空间位置编码，性能显著下降；这表明即使 self-attention 具备全局视野，空间信息仍是必要的。",
    "基于这些消融，我们得出结论：Transformer 组件中的 encoder 全局 self-attention、FFN、多层 decoder 和位置编码，都对最终目标检测性能有显著贡献。",
    "对未见实例数量的泛化。COCO 中某些类别很少以同一类别的大量实例出现在同一图像中。例如，训练集中没有超过 13 只长颈鹿的图像。我们构造一张合成图像来验证 DETR 的泛化能力（见图 5）。我们的模型能够找出图像中的全部 24 只长颈鹿，而这明显超出了训练分布。该实验确认，DETR 的每个 object query 并未强烈专门化到某个类别。",
    "全景分割近年来受到计算机视觉社区广泛关注。类似于 Faster R-CNN 扩展为 Mask R-CNN，DETR 也可以通过在 decoder 输出之上添加 mask head 自然扩展。在本节中，我们展示这样的 head 可以通过统一处理 stuff 类和 thing 类来产生全景分割。实验使用 COCO 数据集的全景标注，其中包含 53 个 stuff 类和 80 个 thing 类。",
    "我们使用相同训练配方训练 DETR，在 COCO 上同时预测 stuff 类和 thing 类周围的边界框。为了能够训练，预测框是必需的，因为 Hungarian matching 要使用框之间的距离计算。我们还加入一个 mask head，为每个预测框预测一个二值 mask，见图 7。它以每个对象的 Transformer decoder 输出为输入，并在 encoder 输出上计算该嵌入的多头 attention 分数。",
    "mask head 可以联合训练，也可以采用两步过程训练：先只训练 DETR 做框检测，然后冻结所有权重，只训练 mask head 25 个 epoch。实验上，这两种方法结果相近；由于后一种方法计算量更小，我们报告后一种方法的结果。",
    "为了预测最终全景分割，我们只需在每个像素处对 mask 分数取 argmax，并把相应类别分配给得到的 mask。这个过程保证最终 mask 没有重叠，因此 DETR 不需要启发式方法来对齐不同 mask。",
    "训练细节。我们按照边界框检测配方训练 DETR、DETR-DC5 和 DETR-R101 模型，在 COCO 数据集中预测 stuff 类和 thing 类周围的框。新的 mask head 训练 25 个 epoch，细节见补充材料。推理期间，我们先过滤置信度低于 85% 的检测，然后计算逐像素 argmax 来确定每个像素属于哪个 mask。随后我们把同一 stuff 类别的不同 mask 预测合并为一个，并移除小的独立区域。",
    "表 2：在 COCO 数据集上与最先进方法 UPSNet 和 Panoptic FPN 比较。为了公平比较，我们用与 DETR 相同的数据增强，以 18x schedule 重新训练 Panoptic FPN。UPSNet 使用标准 schedule，UPSNet-M 是带多尺度测试时增强的版本。",
    "主要结果。定性结果见图 8。表 2 中，我们将统一的全景分割方法与若干分别处理 things 和 stuff 的成熟方法比较。我们报告 Panoptic Quality（PQ）及其在 things（PQ^th）和 stuff（PQ^st）上的分解。我们还报告 mask AP，该指标在 thing 类上计算，并且在任何全景后处理之前计算；在我们的方法中，即逐像素 argmax 之前。结果显示，DETR 超过了若干成熟基线，并且能以统一方式处理 boxes、things 和 stuff。",
    "我们提出了 DETR：一种基于 Transformer 和二分匹配损失的新型目标检测系统设计，用于直接集合预测。该方法在具有挑战性的 COCO 数据集上取得了与优化后的 Faster R-CNN 基线相当的结果。DETR 实现直接，架构灵活，容易扩展到全景分割并取得竞争性结果。此外，它在大目标上取得显著更好的性能，这很可能源于 self-attention 对全局信息的处理。",
    "这种新的检测器设计也带来了新的挑战，尤其体现在训练、优化以及小目标性能方面。当前检测器花费了多年改进才处理好类似问题，我们预计未来工作也会成功为 DETR 解决这些挑战。",
]


def translate_block(block: dict[str, object], section_by_anchor: dict[str, str]) -> str:
    kind = str(block.get("kind") or "")
    text = str(block.get("source_markdown") or "")
    if kind == "heading":
        title = re.sub(r"^#{1,6}\s+", "", text).strip()
        return {
            "End-to-End Object Detection with Transformers": "端到端目标检测：Transformer 方案",
            "1 Introduction": "1 引言",
            "2 Related Work": "2 相关工作",
            "2.1 Set Prediction": "2.1 集合预测",
            "2.2 Transformers and Parallel Decoding": "2.2 Transformer 与并行解码",
            "2.3 Object Detection": "2.3 目标检测",
            "3 The DETR Model": "3 DETR 模型",
            "3.1 Object Detection Set Prediction Loss": "3.1 目标检测的集合预测损失",
            "3.2 DETR Architecture": "3.2 DETR 架构",
            "4 Experiments": "4 实验",
            "4.1 Comparison with Faster R-CNN and RetinaNet": "4.1 与 Faster R-CNN 和 RetinaNet 比较",
            "4.2 Ablations": "4.2 消融实验",
            "4.3 DETR for Panoptic Segmentation": "4.3 用于全景分割的 DETR",
            "5 Conclusion": "5 结论",
        }.get(title, title)
    if kind == "image":
        return translate_image_caption(text)
    if kind == "table":
        return translate_table_html(text)
    if kind == "formula":
        return text
    paragraph_index = int(block.get("paragraph_index", -1))
    if 0 <= paragraph_index < len(PARAGRAPH_TRANSLATIONS):
        return PARAGRAPH_TRANSLATIONS[paragraph_index]
    title = section_by_anchor.get(str(block.get("section_anchor") or ""), "")
    return SECTION_TRANSLATIONS.get(title, "")


def build() -> None:
    reset_dir(SOURCE)
    reset_dir(RUNTIME / "views")
    reset_dir(RUNTIME / "payloads")
    reset_dir(RESULT)
    (SOURCE / "images").mkdir(parents=True, exist_ok=True)
    (SOURCE / "artifacts").mkdir(parents=True, exist_ok=True)
    (RESULT / "assets" / "images").mkdir(parents=True, exist_ok=True)
    (RESULT / "assets" / "vendor").mkdir(parents=True, exist_ok=True)
    (RESULT / "sections").mkdir(parents=True, exist_ok=True)

    original_md = read_text(PAPER_MD)
    refs = image_refs(original_md)
    headings = heading_spans(original_md)

    referenced = {ref["filename"] for ref in refs}
    images = []
    for path in sorted(PAPER_IMAGES.glob("*")):
        if not path.is_file():
            continue
        copy_file(path, SOURCE / "images" / path.name)
        copy_file(path, RESULT / "assets" / "images" / path.name)
        images.append(
            {
                "id": f"img-{len(images) + 1:02d}",
                "filename": path.name,
                "original_src": f"Images_IX5R2J7K/{path.name}",
                "bundle_path": f"images/{path.name}",
                "result_path": f"assets/images/{path.name}",
                "referenced_by_markdown": path.name in referenced,
                "status": "available",
                "sha256": sha256(path),
                "bytes": path.stat().st_size,
                **image_dimensions(path),
            }
        )

    marked_vendor = WORKSPACE / "node_modules" / "marked" / "lib" / "marked.umd.js"
    if marked_vendor.exists():
        copy_file(marked_vendor, RESULT / "assets" / "vendor" / "marked.umd.js")

    md_for_bundle = re.sub(r"!\[([^\]]*)\]\(Images_IX5R2J7K/([^)]+)\)", r"![\1](images/\2)", original_md)
    md_for_html = re.sub(r"!\[([^\]]*)\]\(Images_IX5R2J7K/([^)]+)\)", r"![\1](assets/images/\2)", original_md)
    copy_file(PAPER_PDF, SOURCE / "original.pdf")
    (SOURCE / "source.md").write_text(md_for_bundle, encoding="utf-8")

    sidecar_specs = [
        {
            "artifact_type": "references",
            "payload_type": "references-json",
            "source_filename": "references.json",
            "bundle_path": "artifacts/references.json",
        },
        {
            "artifact_type": "digest",
            "payload_type": "digest-markdown",
            "source_filename": "digest.md",
            "bundle_path": "artifacts/digest.md",
        },
        {
            "artifact_type": "citation_analysis",
            "payload_type": "citation-analysis-markdown",
            "source_filename": "citation-analysis.md",
            "bundle_path": "artifacts/citation-analysis.md",
        },
    ]
    sidecar_artifacts = {}
    artifact_manifest = {
        "schema_version": "literature-deep-reading.sidecar-artifacts.v0",
        "item_key": "EIMSDEU3",
        "source": {
            "kind": "sample_fixture_from_topic_synthesis_export",
            "path": str(DETR_ARTIFACT_ROOT),
        },
        "artifacts": [],
    }
    for spec in sidecar_specs:
        src = DETR_ARTIFACT_ROOT / spec["source_filename"]
        dst = SOURCE / spec["bundle_path"]
        record = {
            "artifact_type": spec["artifact_type"],
            "payload_type": spec["payload_type"],
            "bundle_path": spec["bundle_path"],
            "source_path": str(src),
        }
        if src.exists():
            copy_file(src, dst)
            record.update(
                {
                    "status": "available",
                    "sha256": sha256(dst),
                    "bytes": dst.stat().st_size,
                }
            )
        else:
            record.update({"status": "missing", "reason": "source artifact file not found"})
        artifact_manifest["artifacts"].append(record)
        sidecar_artifacts[spec["artifact_type"]] = record

    write_json(SOURCE / "artifacts" / "artifact-manifest.json", artifact_manifest)

    references_view = {
        "schema_version": "literature-deep-reading.references-view.v0",
        "source": "markdown",
        "references": [],
        "diagnostics": [],
    }
    references_payload = SOURCE / "artifacts" / "references.json"
    if references_payload.exists():
        try:
            references_data = json.loads(read_text(references_payload))
            references_view = {
                "schema_version": "literature-deep-reading.references-view.v0",
                "source": "artifact",
                "artifact_path": "artifacts/references.json",
                "reference_count": len(normalize_references(references_data)),
                "references": normalize_references(references_data),
                "diagnostics": [],
            }
        except Exception as exc:
            references_view["diagnostics"].append(
                {
                    "severity": "warning",
                    "code": "REFERENCES_ARTIFACT_DECODE_FAILED",
                    "message": str(exc),
                }
            )

    sections = []
    for idx, span in enumerate(headings):
        title = str(span["title"])
        anchor = "sec-" + slugify(title, f"s{idx + 1}")
        goal, terms, pitfall = READING_AIDS.get(title, ("阅读本节原文，确认其在论文论证链条中的作用。", [], "优先依据原文判断。"))
        nav_level = 0 if idx == 0 else (2 if re.match(r"^\d+\.\d+", title) else 1)
        sections.append(
            {
                "id": f"section-{idx + 1:02d}",
                "title": title,
                "anchor": anchor,
                "level": span["level"],
                "nav_level": nav_level,
                "line_start": span["line"],
                "line_end": span["line_end"],
                "translation": SECTION_TRANSLATIONS.get(title, ""),
                "reading_aid": {"goal": goal, "terms": terms, "pitfall": pitfall},
            }
        )

    all_blocks = split_markdown_blocks(md_for_html)
    reading_source_blocks, post_source_blocks = split_reading_and_post_blocks(all_blocks)
    section_by_anchor = {str(section["anchor"]): str(section["title"]) for section in sections}
    paragraph_index = 0
    reading_blocks = []
    for idx, block in enumerate(reading_source_blocks, start=1):
        enriched = dict(block)
        anchor = section_anchor_for_line(sections, int(block.get("line_start", 0)))
        enriched["id"] = f"block-{idx:03d}"
        enriched["section_anchor"] = anchor
        if enriched["kind"] == "paragraph":
            enriched["paragraph_index"] = paragraph_index
            paragraph_index += 1
        enriched["translation"] = translate_block(enriched, section_by_anchor)
        reading_blocks.append(enriched)
    post_reading_markdown = "\n\n".join(str(block.get("source_markdown") or "") for block in post_source_blocks).strip()

    topic_summary = json.loads(read_text(TOPIC_ROOT / "sections" / "summary.json"))
    topic_stats = json.loads(read_text(TOPIC_ROOT / "sections" / "statistics.json"))
    concept_view = normalize_concepts()
    citation_graph_snapshot = read_citation_graph_snapshot()
    citation_graph_layout = graph_layout(citation_graph_snapshot)
    citation_graph_view = {
        "schema_version": "literature-deep-reading.citation-graph-view.v0",
        "anchor": "citation-graph",
        "title": "Citation Graph",
        "snapshot": citation_graph_snapshot,
        "layout": citation_graph_layout,
        "default_filters": {
            "show_library": True,
            "show_external": True,
            "show_low_signal": False,
        },
    }
    extensions = [
        {
            "id": "extension-topic",
            "title": "后续阅读：DETR-family 解决了哪些问题",
            "anchor": "extension-topic",
            "translation": "读完原文后，后续 DETR-family 可以按问题来读：第一类工作解决收敛慢，例如 Deformable DETR、Conditional DETR、DAB-DETR 和 DN-DETR；第二类工作改进 object queries 和匹配策略，让训练监督更稳定；第三类工作把端到端检测推向实时部署，例如 RT-DETR、LW-DETR 和 RF-DETR。这样读比按年份平铺更有效，因为每篇后续工作基本都在回应初版 DETR 暴露出的训练成本、小目标、多尺度和工程速度问题。",
            "reading_aid": {
                "goal": "把后续阅读组织成问题链，而不是把 DETR-family 当成论文列表。",
                "terms": ["DETR-family", "object queries", "Deformable DETR", "RT-DETR"],
                "pitfall": "不要把后续工作只看成刷 AP；更重要的是它们分别修补初版 DETR 的哪个瓶颈。",
            },
        },
        {
            "id": "extension-graph",
            "title": "引用网络：DETR 接上了哪些文献",
            "anchor": "extension-graph",
            "translation": "从引用网络看，DETR 一边向前连接大量端到端检测后续论文，一边向后连接三类基础文献：经典目标检测器、Transformer/注意力机制，以及 Hungarian matching / 集合预测。阅读时可以把它看成一个“汇合点”：它不是单独发明所有组件，而是把这些组件组织成新的检测范式。",
            "reading_aid": {
                "goal": "用引用网络区分 DETR 的上游来源和下游影响。",
                "terms": ["Faster R-CNN", "Transformer", "Hungarian matching", "DETR-family"],
                "pitfall": "引用网络只能提示阅读路径；具体技术贡献仍要回到正文和后续论文逐篇判断。",
            },
        },
    ]
    preface_view = build_preface_view(topic_summary, topic_stats, concept_view, extensions[1])
    summary_view = parse_digest_summary(SOURCE / "artifacts" / "digest.md")
    citation_analysis_view = parse_citation_analysis(SOURCE / "artifacts" / "citation-analysis.md")
    section_insights_view = build_section_insights(sections, citation_analysis_view)
    body_navigation = [section for section in sections if section["title"] != "References"]
    references_navigation = [section for section in sections if section["title"] == "References"]
    navigation = [
        {"anchor": preface_view["anchor"], "title": "阅读前导读", "nav_level": 0, "kind": "preface"},
        *[
            {
                "anchor": section["anchor"],
                "title": section["title"],
                "nav_level": section.get("nav_level", 1),
                "kind": "paper_section",
            }
            for section in body_navigation
        ],
        {"anchor": summary_view["anchor"], "title": "Summary 总结", "nav_level": 0, "kind": "summary"},
        *[
            {
                "anchor": section["anchor"],
                "title": section["title"],
                "nav_level": section.get("nav_level", 1),
                "kind": "paper_section",
            }
            for section in references_navigation
        ],
        {"anchor": citation_graph_view["anchor"], "title": "Citation Graph", "nav_level": 0, "kind": "citation_graph"},
        *[
            {"anchor": extension["anchor"], "title": extension["title"], "nav_level": 1, "kind": "extension"}
            for extension in extensions
        ],
    ]
    graph_diagnostics = citation_graph_snapshot.get("diagnostics", {})
    if isinstance(graph_diagnostics, dict) and graph_diagnostics.get("truncated"):
        diagnostics_message = "Citation graph snapshot was truncated by maxNodes/maxEdges limits."
    else:
        diagnostics_message = ""

    diagnostics = [
        {
            "severity": "info",
            "code": "USER_SUPPLIED_MINERU_DIRECTORY",
            "message": "Input Markdown, PDF and images were copied from the user-specified MinerU directory.",
        },
        {
            "severity": "warning",
            "code": "HOST_BRIDGE_PDF_DOWNLOAD_INVALID",
            "message": "A previous Host Bridge PDF download produced an invalid/truncated local copy; this artifact uses the user-specified local PDF.",
        },
        {
            "severity": "warning",
            "code": "TOPICS_GET_CONTEXT_DELETED",
            "message": "Host Bridge topic lookup reported deleted while the local topic artifact exists; the local artifact was read directly.",
        },
    ]
    if diagnostics_message:
        diagnostics.append(
            {
                "severity": "info",
                "code": "CITATION_GRAPH_SNAPSHOT_TRUNCATED",
                "message": diagnostics_message,
            }
        )
    if isinstance(graph_diagnostics, dict) and graph_diagnostics.get("snapshot_found") is False:
        diagnostics.append(
            {
                "severity": "warning",
                "code": "CITATION_GRAPH_SNAPSHOT_UNAVAILABLE",
                "message": "; ".join(str(item) for item in graph_diagnostics.get("warnings", [])) or "Citation graph snapshot unavailable.",
            }
        )
    for record in artifact_manifest["artifacts"]:
        if record["status"] != "available":
            diagnostics.append(
                {
                    "severity": "warning",
                    "code": f"SIDECAR_{record['artifact_type'].upper()}_{record['status'].upper()}",
                    "message": f"Optional {record['artifact_type']} artifact is {record['status']}.",
                }
            )
    diagnostics.extend(references_view.get("diagnostics", []))
    diagnostics.extend(summary_view.get("diagnostics", []))
    diagnostics.extend(section_insights_view.get("diagnostics", []))

    source_manifest = {
        "schema_version": "literature-deep-reading.source-manifest.v0",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "paper": {"item_key": "EIMSDEU3", "title": "End-to-End Object Detection with Transformers", "year": 2020},
        "source_kind": "mineru_markdown",
        "source_directory": str(USER_SOURCE),
        "markdown": {
            "path": "source.md",
            "original_filename": PAPER_MD.name,
            "sha256": sha256(SOURCE / "source.md"),
            "bytes": (SOURCE / "source.md").stat().st_size,
            "image_reference_count": len(refs),
        },
        "pdf": {
            "path": "original.pdf",
            "original_filename": PAPER_PDF.name,
            "sha256": sha256(SOURCE / "original.pdf"),
            "bytes": (SOURCE / "original.pdf").stat().st_size,
        },
        "images": images,
        "sidecar_artifacts": sidecar_artifacts,
        "diagnostics": diagnostics,
    }
    write_json(SOURCE / "source-manifest.json", source_manifest)

    bundle_path = SOURCE / "source_bundle.zip"
    with zipfile.ZipFile(bundle_path, "w", zipfile.ZIP_DEFLATED) as z:
        z.write(SOURCE / "source.md", "source.md")
        z.write(SOURCE / "source-manifest.json", "source-manifest.json")
        z.write(SOURCE / "original.pdf", "original.pdf")
        for img in images:
            z.write(SOURCE / "images" / img["filename"], f"images/{img['filename']}")
        for path in sorted((SOURCE / "artifacts").glob("*")):
            if path.is_file():
                z.write(path, f"artifacts/{path.name}")

    source_manifest["bundle"] = {"path": "source_bundle.zip", "sha256": sha256(bundle_path), "bytes": bundle_path.stat().st_size}
    write_json(SOURCE / "source-manifest.json", source_manifest)

    view = {
        "schema_version": "literature-deep-reading.seamless-scroll.v0",
        "markdown": md_for_html,
        "navigation": navigation,
        "preface": preface_view,
        "sections": sections,
        "reading_blocks": reading_blocks,
        "post_reading_markdown": post_reading_markdown,
        "summary": summary_view,
        "section_insights": section_insights_view,
        "extensions": extensions,
        "references_source": references_view["source"],
        "references": references_view,
        "concepts": concept_view,
        "citation_graph": citation_graph_view,
    }
    write_json(
        RUNTIME / "views" / "source-structure.json",
        {"headings": headings, "section_count": len(sections), "reading_block_count": len(reading_blocks)},
    )
    write_json(RUNTIME / "views" / "image-manifest.json", {"images": images, "markdown_image_refs": refs})
    write_json(RUNTIME / "views" / "section-context.json", view)
    write_json(RUNTIME / "views" / "preface-view.json", preface_view)
    write_json(RUNTIME / "views" / "summary-view.json", summary_view)
    write_json(RUNTIME / "views" / "section-insights-view.json", section_insights_view)
    write_json(RUNTIME / "views" / "topic-context.json", extensions[0])
    write_json(RUNTIME / "views" / "graph-context.json", extensions[1])
    write_json(RUNTIME / "views" / "references-view.json", references_view)
    write_json(RUNTIME / "views" / "concept-overlay-view.json", concept_view)
    write_json(RUNTIME / "views" / "citation-graph-snapshot.json", citation_graph_snapshot)
    write_json(RUNTIME / "views" / "citation-graph-layout.json", citation_graph_layout)
    write_json(RUNTIME / "payloads" / "reading-plan.json", {"navigation": navigation, "sections": sections, "preface": preface_view, "summary": summary_view, "extensions": extensions})
    write_json(RUNTIME / "payloads" / "section-enrichment.json", {"sections": sections, "section_insights": section_insights_view})
    write_json(RUNTIME / "payloads" / "synthesis-extension.json", {"extensions": extensions})
    write_json(RUNTIME / "payloads" / "final-review.json", {"diagnostics": diagnostics})

    write_json(RESULT / "sections" / "sections.json", view)
    write_json(RESULT / "sections" / "source-images.json", {"images": images})
    write_json(RESULT / "sections" / "diagnostics.json", {"diagnostics": diagnostics})
    write_json(
        RESULT / "deep-reading-manifest.json",
        {
            "entrypoint": "deep-reading.html",
            "mode": "seamless-scroll",
            "section_count": len(sections),
            "concept_count": len(concept_view.get("concepts", [])),
            "citation_graph_node_count": len(citation_graph_snapshot.get("nodes", [])),
        },
    )
    write_json(RESULT / "final-output.candidate.json", {"html": "deep-reading.html", "sections": ["sections/sections.json"], "diagnostics": diagnostics})

    css = r"""
:root {
  --bg: #f4f1ea;
  --paper: #fffdf8;
  --ink: #17242b;
  --muted: #657179;
  --line: #d9d2c5;
  --accent: #b84e35;
  --soft: #eef6f4;
  --code: #f7efe5;
  font-family: "Segoe UI", Arial, "Microsoft YaHei", sans-serif;
}
* { box-sizing: border-box; }
html { scroll-behavior: smooth; }
body { margin: 0; background: var(--bg); color: var(--ink); overflow: hidden; }
button { font: inherit; }
.topbar {
  height: 58px; display: grid; grid-template-columns: minmax(280px, 1fr) auto; gap: 16px; align-items: center;
  padding: 9px 16px; border-bottom: 1px solid var(--line); background: #f7f3eb;
}
.brand strong { display: block; font-size: 15px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.brand span { display: block; color: var(--muted); font-size: 12px; margin-top: 2px; }
.modes { display: flex; gap: 6px; align-items: center; }
.modes button {
  border: 1px solid var(--line); background: var(--paper); color: var(--ink); border-radius: 6px; min-height: 34px; padding: 6px 10px; cursor: pointer;
}
.modes button.active { background: var(--ink); color: white; border-color: var(--ink); }
.shell { height: calc(100vh - 58px); display: grid; grid-template-columns: 44px 244px minmax(0, 1fr) 360px; min-width: 0; }
.concept-rail { position: relative; border-right: 1px solid var(--line); background: #e9eee8; z-index: 12; }
.concept-rail:not(.is-open) { overflow: hidden; padding: 8px 6px; }
.concept-rail.is-open { width: 260px; overflow: visible; padding: 12px; box-shadow: 12px 0 26px rgba(23, 36, 43, .14); }
.concept-rail.is-open .concept-list { position: absolute; left: 44px; top: 0; bottom: 0; width: 216px; overflow: auto; padding: 54px 12px 12px; background: #e9eee8; border-right: 1px solid var(--line); box-shadow: 12px 0 26px rgba(23, 36, 43, .14); }
.concept-rail-header { display: flex; justify-content: space-between; gap: 8px; align-items: center; margin-bottom: 10px; }
.concept-rail:not(.is-open) .concept-rail-header { display: block; margin: 0; }
.concept-rail-header strong { font-size: 13px; color: #25443a; }
.concept-rail:not(.is-open) .concept-rail-header strong { writing-mode: vertical-rl; transform: rotate(180deg); display: block; margin: 8px auto; letter-spacing: .04em; }
.concept-toggle {
  border: 1px solid #bfd1ca; background: #f8fcfa; color: #25443a; border-radius: 999px; min-height: 26px; padding: 3px 8px; cursor: pointer; font-size: 12px;
}
.concept-toggle.is-off { color: var(--muted); background: #f2eee7; border-color: var(--line); }
.concept-rail:not(.is-open) .concept-toggle { width: 30px; height: 30px; padding: 0; border-radius: 8px; font-size: 0; }
.concept-rail:not(.is-open) .concept-toggle::after { content: "C"; font-size: 13px; font-weight: 760; }
.concept-list { display: grid; gap: 7px; }
.concept-rail:not(.is-open) .concept-list { display: none; }
.concept-chip {
  border: 1px solid #bfd1ca; background: #fbfffc; color: #25443a; border-radius: 6px; padding: 8px 9px; cursor: pointer; text-align: left;
}
.concept-chip strong { display: block; font-size: 12px; line-height: 1.25; overflow-wrap: anywhere; }
.concept-chip span { display: block; color: var(--muted); font-size: 11px; margin-top: 3px; }
.concept-mention {
  color: #0f6f61; background: #e6f4ef; border-bottom: 1px dotted #0f6f61; border-radius: 3px; padding: 0 2px; cursor: help;
}
.concept-bubble {
  position: fixed; z-index: 20; width: min(300px, calc(100vw - 24px)); background: #fbfffc; border: 1px solid #bfd1ca; border-radius: 8px;
  box-shadow: 0 12px 26px rgba(23, 36, 43, .18); padding: 12px; color: var(--ink);
}
.concept-bubble strong { display: block; font-size: 14px; margin-bottom: 6px; }
.concept-bubble p { margin: 7px 0 0; color: #31443f; font-size: 13px; line-height: 1.55; }
.concept-bubble-meta { display: flex; flex-wrap: wrap; gap: 6px; }
.toc { border-right: 1px solid var(--line); overflow: auto; padding: 12px; background: #eee8dc; }
.toc a {
  display: block; color: var(--ink); text-decoration: none; border: 1px solid var(--line); background: var(--paper);
  border-radius: 6px; padding: 8px 10px; margin-bottom: 7px; font-size: 13px; line-height: 1.25;
}
.toc a.level-0 { font-weight: 760; background: #fffaf0; }
.toc a.level-1 { font-weight: 650; }
.toc a.level-2 { margin-left: 18px; width: calc(100% - 18px); font-size: 12px; color: #415057; background: #faf7ef; border-left: 3px solid #c8bda9; padding-left: 10px; }
.toc a.active { background: var(--ink); color: white; border-color: var(--ink); }
.paper-scroll { overflow: auto; min-width: 0; padding: 28px 34px 60px; }
.paper, .reading-flow, .preface-section, .summary-section, .post-reading { max-width: 1120px; margin: 0 auto; }
.preface-section, .summary-section {
  background: var(--paper); border: 1px solid var(--line); border-radius: 8px; padding: 30px 42px; overflow-wrap: anywhere;
}
.preface-section { margin-bottom: 18px; }
.summary-section { margin-top: 18px; }
.preface-section h1, .summary-section h1 { margin: 0 0 8px; font-size: 30px; line-height: 1.18; color: var(--ink); }
.preface-section .kicker, .summary-section .kicker { margin: 0 0 18px; color: var(--muted); font-size: 14px; line-height: 1.55; }
.preface-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin: 18px 0; }
.preface-card { border: 1px solid var(--line); border-radius: 8px; background: #fffaf1; padding: 14px 16px; }
.preface-card h2 { margin: 0 0 7px; font-size: 16px; color: var(--ink); }
.preface-card p { margin: 0; color: #26353a; line-height: 1.62; font-size: 14px; }
.preface-section h2, .summary-section h2 { margin: 24px 0 10px; font-size: 20px; line-height: 1.22; color: var(--ink); }
.preface-section ul, .summary-section ul { margin: 8px 0 0; padding-left: 22px; }
.preface-section li, .summary-section li { line-height: 1.65; font-size: 14px; margin: 4px 0; }
.summary-block { border-top: 1px solid var(--line); padding-top: 16px; margin-top: 16px; }
.summary-block:first-of-type { border-top: 0; padding-top: 0; }
.reading-flow { position: relative; display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); column-gap: 18px; row-gap: 0; }
.reading-flow::before, .reading-flow::after {
  content: ""; position: absolute; top: 0; bottom: 0; width: calc((100% - 18px) / 2);
  background: var(--paper); border: 1px solid var(--line); border-radius: 8px; box-sizing: border-box;
  pointer-events: none; z-index: 0;
}
.reading-flow::before { left: 0; }
.reading-flow::after { right: 0; }
.aligned-block-pair { display: contents; }
.aligned-source, .aligned-translation {
  position: relative; z-index: 1; min-width: 0; background: transparent; border: 0; padding: 0 28px; overflow-wrap: anywhere;
}
.aligned-source { grid-column: 1; }
.aligned-translation { grid-column: 2; }
.aligned-block-pair:first-child .aligned-source, .aligned-block-pair:first-child .aligned-translation { padding-top: 30px; }
.aligned-block-pair:last-child .aligned-source, .aligned-block-pair:last-child .aligned-translation { padding-bottom: 30px; }
.aligned-source > :first-child, .aligned-translation > :first-child { margin-top: 0; }
.aligned-source > :last-child, .aligned-translation > :last-child { margin-bottom: 16px; }
.paper { background: var(--paper); border: 1px solid var(--line); border-radius: 8px; padding: 30px 42px; overflow-wrap: anywhere; }
.post-reading { margin-top: 18px; background: var(--paper); border: 1px solid var(--line); border-radius: 8px; padding: 30px 42px; overflow-wrap: anywhere; }
.paper h1, .paper h2, .paper h3, .paper h4, .aligned-source h1, .aligned-source h2, .aligned-source h3, .aligned-source h4, .post-reading h1, .post-reading h2, .post-reading h3, .post-reading h4 { scroll-margin-top: 22px; color: var(--ink); line-height: 1.18; overflow-wrap: anywhere; }
.paper h1 { font-size: 34px; margin: 0 0 22px; }
.paper h2 { font-size: 25px; margin: 34px 0 14px; border-top: 1px solid var(--line); padding-top: 24px; }
.paper h3 { font-size: 20px; margin: 26px 0 10px; }
.aligned-source h1, .aligned-translation h1 { font-size: 31px; margin: 0 0 22px; line-height: 1.18; }
.aligned-source h2, .aligned-translation h2 { font-size: 22px; margin: 28px 0 12px; line-height: 1.2; }
.aligned-source h3, .aligned-translation h3 { font-size: 18px; margin: 22px 0 10px; line-height: 1.22; }
.paper p, .paper li, .aligned-source p, .aligned-source li, .aligned-translation p, .post-reading p, .post-reading li { line-height: 1.72; font-size: 15px; }
.paper img, .aligned-source img, .post-reading img { display: block; max-width: 100%; height: auto; margin: 18px auto; border: 1px solid var(--line); border-radius: 4px; background: white; }
.paper table, .aligned-source table, .aligned-translation table, .post-reading table { width: 100%; border-collapse: collapse; margin: 18px 0; font-size: 13px; overflow-wrap: anywhere; }
.paper th, .paper td, .aligned-source th, .aligned-source td, .aligned-translation th, .aligned-translation td, .post-reading th, .post-reading td { border: 1px solid var(--line); padding: 7px 8px; vertical-align: top; }
.paper th, .aligned-source th, .aligned-translation th, .post-reading th { background: #f1eadf; }
.paper code, .aligned-source code, .post-reading code { background: var(--code); border-radius: 4px; padding: 1px 4px; }
.paper pre, .aligned-source pre, .post-reading pre { overflow: auto; background: var(--code); border: 1px solid var(--line); border-radius: 6px; padding: 12px; }
.paper .math, .paper .katex, .aligned-source .math, .aligned-source .katex, .aligned-translation .math, .aligned-translation .katex, .post-reading .math, .post-reading .katex { overflow-x: auto; overflow-y: hidden; }
.structured-references {
  margin: 14px 0 8px; border: 1px solid var(--line); border-radius: 8px; background: #fffaf1; overflow: hidden;
}
.references-summary {
  display: flex; justify-content: space-between; gap: 12px; align-items: center;
  border-bottom: 1px solid var(--line); padding: 12px 14px; background: #f4ecde;
}
.references-summary strong { font-size: 15px; }
.references-summary span { color: var(--muted); font-size: 13px; }
.reference-list { display: grid; gap: 0; }
.reference-item {
  display: grid; grid-template-columns: 54px minmax(0, 1fr) 76px; gap: 12px; align-items: start;
  padding: 13px 14px; border-bottom: 1px solid var(--line);
}
.reference-item:last-child { border-bottom: 0; }
.reference-index {
  display: inline-flex; align-items: center; justify-content: center; min-width: 38px; height: 28px;
  border-radius: 999px; background: var(--ink); color: white; font-size: 12px; font-weight: 700;
}
.reference-title { margin: 0 0 5px; font-size: 14px; line-height: 1.45; font-weight: 700; overflow-wrap: anywhere; }
.reference-meta { color: var(--muted); font-size: 13px; line-height: 1.45; overflow-wrap: anywhere; }
.reference-year { color: var(--accent); font-weight: 700; font-size: 13px; text-align: right; }
.reference-details { grid-column: 2 / 4; margin-top: 6px; font-size: 12px; color: var(--muted); }
.reference-details summary { cursor: pointer; color: #415057; }
.reference-details dl { display: grid; grid-template-columns: 88px minmax(0, 1fr); gap: 4px 8px; margin: 8px 0 0; }
.reference-details dt { font-weight: 700; color: #415057; }
.reference-details dd { margin: 0; overflow-wrap: anywhere; }
.translation-paper { max-width: 980px; margin: 0 auto; background: var(--paper); border: 1px solid var(--line); border-radius: 8px; padding: 30px 42px; }
.translation-paper h1, .translation-paper h2 { line-height: 1.22; color: var(--ink); }
.translation-paper h1 { font-size: 32px; margin: 0 0 22px; }
.translation-paper h2 { font-size: 23px; margin: 30px 0 10px; border-top: 1px solid var(--line); padding-top: 22px; }
.translation-paper p { line-height: 1.75; font-size: 15px; }
.translation-section { margin: 0; }
.translation-section h1, .translation-section h2 { scroll-margin-top: 74px; }
.translation-section p { margin: 0 0 12px; }
.translation-section p:last-child { margin-bottom: 0; }
.translation-section + .translation-section h2 { margin-top: 30px; }
.extensions { max-width: 980px; margin: 18px auto 0; display: grid; gap: 14px; }
.extension { background: var(--paper); border: 1px solid var(--line); border-radius: 8px; padding: 20px 24px; }
.extension h2 { margin: 0 0 10px; font-size: 22px; }
.extension p, .extension li { line-height: 1.7; font-size: 15px; }
.citation-graph-section {
  max-width: 980px; margin: 18px auto 0; background: var(--paper); border: 1px solid var(--line); border-radius: 8px; padding: 20px 24px;
}
.citation-graph-header { display: flex; justify-content: space-between; gap: 12px; align-items: start; margin-bottom: 12px; }
.citation-graph-header h2 { margin: 0 0 6px; font-size: 22px; }
.citation-graph-header p { margin: 0; color: var(--muted); font-size: 13px; line-height: 1.5; }
.graph-badges { display: flex; flex-wrap: wrap; gap: 6px; justify-content: flex-end; }
.graph-badge { border: 1px solid #cbded9; background: var(--soft); color: #17433f; border-radius: 999px; padding: 4px 8px; font-size: 12px; white-space: nowrap; }
.graph-badge.warn { border-color: #e1b486; background: #fff3df; color: #7c421e; }
.graph-toolbar { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin: 12px 0; }
.graph-toolbar input {
  flex: 1 1 220px; min-height: 34px; border: 1px solid var(--line); border-radius: 6px; padding: 6px 9px; background: #fffdf8; color: var(--ink);
}
.graph-toolbar button {
  border: 1px solid var(--line); background: #fffdf8; color: var(--ink); border-radius: 6px; min-height: 34px; padding: 6px 10px; cursor: pointer;
}
.graph-toolbar button.active { background: var(--ink); color: white; border-color: var(--ink); }
.graph-legend { display: flex; flex-wrap: wrap; gap: 8px 12px; align-items: center; margin: 0 0 12px; color: var(--muted); font-size: 12px; }
.graph-legend-item { display: inline-flex; align-items: center; gap: 5px; white-space: nowrap; }
.graph-legend-dot { width: 10px; height: 10px; border-radius: 999px; display: inline-block; border: 1px solid #fffdf8; box-shadow: 0 0 0 1px rgba(23, 36, 43, .12); }
.graph-legend-line { width: 20px; height: 2px; display: inline-block; border-radius: 999px; }
.graph-legend-halo { width: 12px; height: 12px; border-radius: 999px; display: inline-block; border: 2px solid rgba(37, 99, 235, .52); box-shadow: 0 0 0 3px rgba(37, 99, 235, .18); }
.graph-layout { display: grid; grid-template-columns: minmax(0, 1fr) 260px; gap: 14px; align-items: stretch; }
.graph-canvas { position: relative; min-height: 460px; border: 1px solid var(--line); border-radius: 8px; background: #fbfaf5; overflow: hidden; }
.graph-canvas svg { display: block; width: 100%; height: 460px; }
.graph-edge { stroke-width: 1.05; opacity: .92; cursor: pointer; stroke-linecap: round; }
.graph-node { cursor: pointer; stroke: #fffdf8; stroke-width: 1.15; }
.graph-node.is-active { stroke: #17242b; stroke-width: 1.65; }
.graph-importance-halo-soft, .graph-importance-halo { fill: none; pointer-events: none; }
.graph-label { font-size: 11px; fill: #17242b; paint-order: stroke; stroke: #fffdf8; stroke-width: 3px; stroke-linejoin: round; pointer-events: none; }
.graph-detail { border: 1px solid var(--line); border-radius: 8px; background: #fbf8f1; padding: 13px; min-width: 0; }
.graph-detail h3 { margin: 0 0 8px; font-size: 15px; }
.graph-detail dl { display: grid; grid-template-columns: 76px minmax(0, 1fr); gap: 6px 8px; margin: 0; font-size: 12px; }
.graph-detail dt { color: var(--muted); font-weight: 700; }
.graph-detail dd { margin: 0; overflow-wrap: anywhere; }
.side { border-left: 1px solid var(--line); background: #fbf8f1; overflow: auto; padding: 18px; }
.side section { border-bottom: 1px solid var(--line); padding-bottom: 10px; margin-bottom: 10px; }
.side section:last-child { border-bottom: 0; }
.side h2 { margin: 0 0 6px; font-size: 12px; color: var(--accent); text-transform: uppercase; letter-spacing: .045em; }
.side p, .side li { line-height: 1.45; font-size: 13px; margin: 4px 0; }
.side h3 { margin: 8px 0 3px; font-size: 13px; line-height: 1.25; color: var(--ink); }
.side details { margin-top: 7px; border: 1px solid var(--line); border-radius: 6px; background: #fffaf1; padding: 7px 9px; }
.side summary { cursor: pointer; color: #2f4742; font-weight: 700; font-size: 13px; }
.side .qa-item { margin: 8px 0 0; }
.side .qa-item p { margin: 3px 0 0; }
.translation { white-space: pre-wrap; background: var(--soft); border: 1px solid #cbded9; border-radius: 6px; padding: 12px; }
.chips { display: flex; flex-wrap: wrap; gap: 5px; }
.chip { border: 1px solid #c8d8d4; background: #f5fbfa; color: #17433f; border-radius: 999px; padding: 3px 7px; font-size: 12px; font-weight: 650; }
.side-concept-chip { cursor: help; font-family: inherit; }
.side-concept-chip.has-concept { background: #e6f4ef; border-color: #99cbbd; color: #0f5d52; }
.extra { white-space: pre-wrap; color: #26353a; font-size: 13px; line-height: 1.6; }
body.mode-original .translation-block, body.mode-original .translation-paper, body.mode-original .aligned-translation { display: none; }
body.mode-original .reading-flow, body.mode-focus .reading-flow { display: block; max-width: 980px; }
body.mode-original .reading-flow::before, body.mode-focus .reading-flow::before { display: block; left: 0; right: auto; width: 100%; }
body.mode-original .reading-flow::after, body.mode-focus .reading-flow::after { display: none; }
body.mode-original .aligned-block-pair { display: block; }
body.mode-original .aligned-source, body.mode-focus .aligned-source { background: transparent; border: 0; }
body.mode-compare .translation-block, body.mode-translated .translation-block { display: none; }
body.mode-compare .paper, body.mode-compare .translation-paper { display: none; }
body.mode-translated .reading-flow, body.mode-translated .paper { display: none; }
body.mode-translated .translation-paper { display: block; }
body.mode-focus .translation-paper, body.mode-focus .aligned-translation { display: none; }
body.mode-focus .aligned-block-pair { display: block; }
body.mode-focus .side { display: none; }
body.mode-focus .shell { grid-template-columns: 44px 244px minmax(0, 1fr); }
@media (max-width: 980px) {
  html, body { width: 100%; max-width: 100vw; overflow-x: hidden; }
  body { overflow-y: auto; }
  .topbar { height: auto; grid-template-columns: minmax(0, 1fr); width: 100%; max-width: 100vw; overflow: hidden; }
  .modes { flex-wrap: wrap; }
  .shell { height: auto; display: block; width: 100%; max-width: 100vw; overflow-x: hidden; }
  .concept-rail, .concept-rail.is-open { display: flex; gap: 8px; align-items: center; overflow-x: auto; overflow-y: hidden; border-right: 0; border-bottom: 1px solid var(--line); padding: 10px; width: 100%; max-width: 100vw; box-shadow: none; }
  .concept-rail-header { flex: 0 0 auto; margin: 0; }
  .concept-rail:not(.is-open) .concept-rail-header strong { writing-mode: initial; transform: none; margin: 0; }
  .concept-rail.is-open .concept-list, .concept-list { position: static; display: flex; gap: 7px; width: auto; padding: 0; overflow: visible; border: 0; box-shadow: none; background: transparent; }
  .concept-chip { flex: 0 0 150px; }
  .toc { display: flex; overflow-x: auto; overflow-y: hidden; border-right: 0; border-bottom: 1px solid var(--line); padding: 10px; width: 100%; max-width: 100vw; }
  .toc a, .toc a.level-2 { flex: 0 0 190px; width: auto; margin: 0 7px 0 0; }
  .paper-scroll { padding: 14px 10px 24px; overflow: hidden; width: 100vw; max-width: 100vw; }
  .paper, .translation-paper, .preface-section, .summary-section { padding: 18px 14px; width: calc(100vw - 20px); max-width: calc(100vw - 20px); margin-left: 0; margin-right: 0; overflow-wrap: anywhere; word-break: break-word; }
  .preface-grid { grid-template-columns: minmax(0, 1fr); }
  .reading-flow { display: block; }
  .reading-flow::before, .reading-flow::after { display: none; }
  .aligned-block-pair { display: block; }
  .aligned-source, .aligned-translation { padding: 18px 14px; background: var(--paper); border: 1px solid var(--line); border-radius: 8px; margin-bottom: 10px; }
  body.mode-compare .translation-paper { display: none; }
  .paper h1 { font-size: 26px; }
  .paper h2 { font-size: 21px; }
  .paper p, .paper li { font-size: 14px; overflow-wrap: anywhere; }
  .reference-item { grid-template-columns: 44px minmax(0, 1fr); gap: 8px; }
  .reference-year { grid-column: 2; text-align: left; }
  .reference-details { grid-column: 1 / 3; }
  .citation-graph-section { width: calc(100vw - 20px); max-width: calc(100vw - 20px); margin: 14px 0 0; padding: 16px 12px; }
  .citation-graph-header { display: block; }
  .graph-badges { justify-content: flex-start; margin-top: 8px; }
  .graph-layout { display: block; }
  .graph-canvas { min-height: 360px; }
  .graph-canvas svg { height: 360px; }
  .graph-detail { margin-top: 10px; }
  .side { border-left: 0; border-top: 1px solid var(--line); }
}
"""
    js = r"""
const data = JSON.parse(document.getElementById("data").textContent);
const body = document.body;
const conceptRail = document.querySelector("[data-concept-rail]");
const toc = document.querySelector("[data-toc]");
const preface = document.querySelector("[data-preface]");
const paper = document.querySelector("[data-paper]");
const translationPaper = document.querySelector("[data-translation-paper]");
const summary = document.querySelector("[data-summary]");
const postReading = document.querySelector("[data-post-reading]");
const side = document.querySelector("[data-side]");
const graphSection = document.querySelector("[data-citation-graph]");
const extensions = document.querySelector("[data-extensions]");
const paperScroll = document.querySelector("[data-paper-scroll]");
const graphState = { search: "", showLibrary: true, showExternal: true, showLowSignal: false, hoveredId: "", hoverLabelId: "", selected: null };
let graphHoverClearTimer = 0;
const GRAPH_LIBRARY_BASE_NODE_SIZE = 4.6;
const GRAPH_SHARED_EXTERNAL_BASE_NODE_SIZE = 3;
const GRAPH_SINGLE_EXTERNAL_BASE_NODE_SIZE = 2;
const GRAPH_LIBRARY_NODE_SIZE_CAP = 8;
const GRAPH_EXTERNAL_NODE_SIZE_CAP = 4.8;
const GRAPH_IMPORTANCE_HALO_TOP_RATIO = 0.1;
const GRAPH_IMPORTANCE_HALO_MAX = 8;
const GRAPH_LIBRARY_IMPORTANCE_HALO_LIGHT = "rgba(37, 99, 235, 0.52)";
const GRAPH_LIBRARY_IMPORTANCE_HALO_LIGHT_SOFT = "rgba(37, 99, 235, 0.22)";
const GRAPH_EXTERNAL_IMPORTANCE_HALO_LIGHT = "rgba(180, 83, 9, 0.56)";
const GRAPH_EXTERNAL_IMPORTANCE_HALO_LIGHT_SOFT = "rgba(180, 83, 9, 0.22)";
const CITATION_GRAPH_INCOMING_EDGE_COLOR = "#d97706";
const CITATION_GRAPH_OUTGOING_EDGE_COLOR = "#7c3aed";
const CITATION_GRAPH_START_NODE_COLOR = "#dc2626";
const GRAPH_NODE_COLORS = {
  library_paper: "#1967b3",
  external_reference: "#7a861f"
};
let conceptOverlayEnabled = data.concepts?.enabled !== false;
let conceptBubbleTimer = 0;

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
}
function escapeRegex(value) {
  return String(value ?? "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function setMode(mode) {
  body.classList.remove("mode-original", "mode-translated", "mode-compare", "mode-focus");
  body.classList.add(`mode-${mode}`);
  document.querySelectorAll("[data-mode]").forEach(btn => btn.classList.toggle("active", btn.dataset.mode === mode));
}
function sectionByAnchor(anchor) {
  return (data.sections || []).find(section => section.anchor === anchor) || null;
}
function extensionByAnchor(anchor) {
  return (data.extensions || []).find(extension => extension.anchor === anchor) || null;
}
function navReadingAid(item) {
  if (item.kind === "preface") return data.preface?.reading_aid || {};
  if (item.kind === "summary") return data.summary?.reading_aid || {};
  if (item.kind === "extension") return extensionByAnchor(item.anchor)?.reading_aid || {};
  if (item.kind === "citation_graph") return data.extensions?.find(ext => ext.id === "extension-graph")?.reading_aid || {};
  return sectionByAnchor(item.anchor)?.reading_aid || {};
}
function conceptForTerm(term) {
  const normalized = String(term || "").trim().toLowerCase();
  if (!normalized) return null;
  return (data.concepts?.concepts || []).find(concept => {
    const labels = [concept.label, ...(concept.aliases || [])].map(value => String(value || "").trim().toLowerCase()).filter(Boolean);
    return labels.some(label => label === normalized || normalized.includes(label) || label.includes(normalized));
  }) || null;
}
function conceptChipHtml(term) {
  const concept = conceptForTerm(term);
  if (!concept) return `<span class="chip side-concept-chip">${esc(term)}</span>`;
  return `<button type="button" class="chip side-concept-chip has-concept" data-side-concept-id="${esc(concept.id)}">${esc(term)}</button>`;
}
function bindSideConceptChips() {
  side.querySelectorAll("[data-side-concept-id]").forEach(button => {
    const concept = (data.concepts?.concepts || []).find(item => item.id === button.getAttribute("data-side-concept-id"));
    if (!concept) return;
    const open = () => showConceptBubble(button, concept);
    button.addEventListener("mouseenter", open);
    button.addEventListener("focus", open);
    button.addEventListener("mouseleave", scheduleConceptBubbleClose);
    button.addEventListener("blur", scheduleConceptBubbleClose);
    button.addEventListener("click", () => {
      const mention = paper.querySelector(`[data-concept-id="${CSS.escape(concept.id)}"]`);
      if (mention) mention.scrollIntoView({ block: "center" });
      showConceptBubble(button, concept);
    });
  });
}
function renderInsight(insight) {
  if (!insight) return "";
  const citationRefs = (insight.citation_references || []).filter(ref => ref.title || ref.summary);
  const citationHtml = insight.citation_note || citationRefs.length ? `
    <section>
      <h2>引用线索</h2>
      ${insight.citation_note ? `<p>${esc(insight.citation_note)}</p>` : ""}
      ${citationRefs.slice(0, 4).map(ref => `
        <details>
          <summary>${esc(ref.ref)} ${esc(ref.title || "引用文献")}</summary>
          ${ref.keywords ? `<p>${esc(ref.keywords)}</p>` : ""}
          ${ref.summary ? `<p>${esc(ref.summary)}</p>` : ""}
        </details>
      `).join("")}
    </section>
  ` : "";
  const qaHtml = (insight.questions || []).length ? `
    <section>
      <h2>可能的问题</h2>
      ${insight.questions.map(item => `
        <div class="qa-item" id="${esc(item.id)}">
          <h3>${esc(item.question)}</h3>
          <p>${esc(item.answer)}</p>
        </div>
      `).join("")}
    </section>
  ` : "";
  return qaHtml + citationHtml;
}
function renderSide(item) {
  const aid = navReadingAid(item);
  const extra = aid.extra ? JSON.stringify(aid.extra, null, 2) : "";
  const insight = data.section_insights?.by_anchor?.[item.anchor];
  side.innerHTML = `
    <section><h2>当前位置</h2><p>${esc(item.title)}</p></section>
    <section><h2>阅读目标</h2><p>${esc(aid.goal || "")}</p></section>
    <section><h2>相关概念</h2><div class="chips">${(aid.terms || []).map(t => conceptChipHtml(t)).join("")}</div></section>
    <section><h2>误读提醒</h2><p>${esc(aid.pitfall || "")}</p></section>
    ${renderInsight(insight)}
    ${extra ? `<section><h2>拓展上下文</h2><div class="extra">${esc(extra)}</div></section>` : ""}
  `;
  bindSideConceptChips();
}
function renderExtensions() {
  extensions.innerHTML = data.extensions.map(ext => `
    <article class="extension" id="${esc(ext.anchor)}">
      <h2>${esc(ext.title)}</h2>
      <p>${esc(ext.translation)}</p>
    </article>
  `).join("");
}
function conceptLabel(concept) {
  return concept?.label || concept?.aliases?.[0] || concept?.id || "Concept";
}
function renderConceptRail() {
  const concepts = data.concepts?.concepts || [];
  if (!conceptRail || !concepts.length) {
    if (conceptRail) conceptRail.style.display = "none";
    return;
  }
  conceptRail.classList.toggle("is-open", conceptOverlayEnabled && conceptRail.classList.contains("is-open"));
  conceptRail.innerHTML = `
    <div class="concept-rail-header">
      <strong>Concepts</strong>
      <button type="button" class="concept-toggle ${conceptOverlayEnabled ? "" : "is-off"}" data-concept-toggle>${conceptRail.classList.contains("is-open") ? "收起" : "展开"}</button>
    </div>
    <div class="concept-list">
      ${concepts.map(concept => `
        <button type="button" class="concept-chip" data-concept-chip="${esc(concept.id)}">
          <strong>${esc(conceptLabel(concept))}</strong>
          <span>${esc(concept.kind || concept.status || "concept")}</span>
        </button>
      `).join("")}
    </div>
  `;
  conceptRail.querySelector("[data-concept-toggle]")?.addEventListener("click", () => {
    conceptOverlayEnabled = true;
    conceptRail.classList.toggle("is-open");
    renderConceptRail();
    rerenderPaper();
  });
  conceptRail.querySelectorAll("[data-concept-chip]").forEach(button => {
    const concept = concepts.find(item => item.id === button.getAttribute("data-concept-chip"));
    if (!concept) return;
    const open = () => showConceptBubble(button, concept);
    button.addEventListener("mouseenter", open);
    button.addEventListener("focus", open);
    button.addEventListener("mouseleave", scheduleConceptBubbleClose);
    button.addEventListener("blur", scheduleConceptBubbleClose);
    button.addEventListener("click", () => {
      const mention = paper.querySelector(`[data-concept-id="${CSS.escape(concept.id)}"]`);
      if (mention) mention.scrollIntoView({ block: "center" });
      showConceptBubble(button, concept);
    });
  });
}
function closeConceptBubble() {
  if (conceptBubbleTimer) window.clearTimeout(conceptBubbleTimer);
  conceptBubbleTimer = 0;
  document.querySelectorAll(".concept-bubble").forEach(node => node.remove());
}
function scheduleConceptBubbleClose() {
  if (conceptBubbleTimer) window.clearTimeout(conceptBubbleTimer);
  conceptBubbleTimer = window.setTimeout(closeConceptBubble, 120);
}
function showConceptBubble(anchor, concept) {
  closeConceptBubble();
  const bubble = document.createElement("div");
  bubble.className = "concept-bubble";
  bubble.setAttribute("role", "dialog");
  const aliases = (concept.aliases || []).filter(alias => alias && alias !== concept.label).slice(0, 3);
  bubble.innerHTML = `
    <strong>${esc(conceptLabel(concept))}</strong>
    <div class="concept-bubble-meta">
      ${concept.kind ? `<span class="chip">${esc(concept.kind)}</span>` : ""}
      ${concept.status ? `<span class="chip">${esc(concept.status)}</span>` : ""}
      ${aliases.map(alias => `<span class="chip">${esc(alias)}</span>`).join("")}
    </div>
    <p>${esc(concept.definition || concept.description || "当前概念只有标签，暂无定义。")}</p>
  `;
  bubble.addEventListener("mouseenter", () => {
    if (conceptBubbleTimer) window.clearTimeout(conceptBubbleTimer);
  });
  bubble.addEventListener("mouseleave", scheduleConceptBubbleClose);
  document.body.appendChild(bubble);
  const rect = anchor.getBoundingClientRect();
  bubble.style.left = `${Math.max(12, Math.min(rect.left, window.innerWidth - 312))}px`;
  bubble.style.top = `${Math.min(rect.bottom + 8, window.innerHeight - bubble.offsetHeight - 12)}px`;
}
function applyConceptOverlay(root) {
  if (!conceptOverlayEnabled) return;
  const concepts = data.concepts?.concepts || [];
  const aliasRows = [];
  concepts.forEach(concept => {
    (concept.aliases || [concept.label]).forEach(alias => {
      const clean = String(alias || "").trim();
      if (clean.length >= 3) aliasRows.push({ alias: clean, concept });
    });
  });
  aliasRows.sort((left, right) => right.alias.length - left.alias.length);
  if (!aliasRows.length) return;
  const pattern = new RegExp(`\\b(${aliasRows.map(row => escapeRegex(row.alias)).join("|")})\\b`, "gi");
  const byAlias = new Map(aliasRows.map(row => [row.alias.toLowerCase(), row.concept]));
  const skipSelector = "a, pre, code, script, style, table, .katex, .math, .structured-references, .concept-mention, .concept-bubble, .citation-graph-section";
  const linked = new Set();
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const textNodes = [];
  while (walker.nextNode()) {
    const node = walker.currentNode;
    if (node.parentElement?.closest(skipSelector)) continue;
    if (node.nodeValue && pattern.test(node.nodeValue)) textNodes.push(node);
    pattern.lastIndex = 0;
  }
  textNodes.forEach(textNode => {
    const text = textNode.nodeValue || "";
    const fragment = document.createDocumentFragment();
    let lastIndex = 0;
    text.replace(pattern, (match, _alias, offset) => {
      const concept = byAlias.get(match.toLowerCase());
      if (!concept || linked.has(concept.id)) return match;
      fragment.appendChild(document.createTextNode(text.slice(lastIndex, offset)));
      const span = document.createElement("span");
      span.className = "concept-mention";
      span.tabIndex = 0;
      span.dataset.conceptId = concept.id;
      span.textContent = match;
      const open = () => showConceptBubble(span, concept);
      span.addEventListener("mouseenter", open);
      span.addEventListener("focus", open);
      span.addEventListener("mouseleave", scheduleConceptBubbleClose);
      span.addEventListener("blur", scheduleConceptBubbleClose);
      fragment.appendChild(span);
      linked.add(concept.id);
      lastIndex = offset + match.length;
      return match;
    });
    fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
    textNode.parentNode?.replaceChild(fragment, textNode);
  });
}
function paragraphsHtml(text) {
  return String(text || "")
    .split(/\n\s*\n/g)
    .map(part => part.trim())
    .filter(Boolean)
    .map(part => `<p>${esc(part)}</p>`)
    .join("");
}
function blockSourceHtml(block) {
  const html = marked.parse(block.source_markdown || "");
  if (block.kind !== "heading") return html;
  return html.replace(/<(h[1-6])([^>]*)>/i, `<$1$2 id="${esc(block.section_anchor || block.id)}">`);
}
function blockTranslationHtml(block) {
  const tag = block.kind === "heading" ? (String(block.source_markdown || "").startsWith("# ") ? "h1" : "h2") : "";
  if (tag) return `<${tag} id="zh-${esc(block.section_anchor || block.id)}">${esc(block.translation || "")}</${tag}>`;
  if (block.kind === "formula" || block.kind === "table" || block.kind === "image") return marked.parse(block.translation || "");
  return paragraphsHtml(block.translation || "");
}
function renderPreface() {
  if (!preface || !data.preface) return;
  const cards = data.preface.cards || [];
  preface.id = data.preface.anchor || "preface";
  preface.innerHTML = `
    <h1>${esc(data.preface.title || "Preface")}</h1>
    <p class="kicker">${esc(data.preface.subtitle || "")}</p>
    <div class="preface-grid">
      ${cards.map(card => `
        <article class="preface-card">
          <h2>${esc(card.title)}</h2>
          <p>${esc(card.body)}</p>
        </article>
      `).join("")}
    </div>
    ${(data.preface.reading_path || []).length ? `
      <h2>阅读路线</h2>
      <ul>${data.preface.reading_path.map(item => `<li>${esc(item)}</li>`).join("")}</ul>
    ` : ""}
    ${(data.preface.takeaways || []).length ? `
      <h2>主题提示</h2>
      <ul>${data.preface.takeaways.map(item => `<li>${esc(item)}</li>`).join("")}</ul>
    ` : ""}
  `;
}
function renderReadingFlow() {
  const blocks = data.reading_blocks || [];
  paper.innerHTML = blocks.map(block => `
    <section class="aligned-block-pair block-${esc(block.kind || "text")}" data-block-id="${esc(block.id)}" data-section-anchor="${esc(block.section_anchor || "")}">
      <div class="aligned-source">${blockSourceHtml(block)}</div>
      <div class="aligned-translation">${blockTranslationHtml(block)}</div>
    </section>
  `).join("");
}
function renderTranslationPaper() {
  const blocks = data.reading_blocks || [];
  translationPaper.innerHTML = blocks.map(block => `
    <section class="translation-section" data-translation-anchor="${esc(block.section_anchor || block.id)}">
      ${blockTranslationHtml(block)}
    </section>
  `).join("");
}
function renderSummary() {
  if (!summary || !data.summary) return;
  summary.id = data.summary.anchor || "summary";
  summary.innerHTML = `
    <h1>${esc(data.summary.title || "Summary")}</h1>
    <p class="kicker">${data.summary.source === "digest_artifact" ? "基于 literature-digest artifact 生成。" : "未找到 digest artifact，使用简短 fallback 总结。"}</p>
    ${(data.summary.sections || []).map(section => `
      <section class="summary-block">
        <h2>${esc(section.title)}</h2>
        <div>${marked.parse(section.markdown || "")}</div>
      </section>
    `).join("")}
  `;
}
function renderPostReading() {
  if (!postReading) return;
  postReading.innerHTML = marked.parse(data.post_reading_markdown || "");
  data.sections.forEach(section => {
    const heading = [...postReading.querySelectorAll("h1,h2,h3,h4")].find(el => el.textContent.trim() === section.title);
    if (heading) heading.id = section.anchor;
  });
  renderStructuredReferences(postReading);
}
function buildParallelSections() {
  // Block pairs are aligned by construction.
}
function referenceDetailRows(ref) {
  const rows = [];
  const fields = [
    ["venue", "Venue"],
    ["doi", "DOI"],
    ["url", "URL"],
    ["arxiv", "arXiv"],
    ["citeKey", "CiteKey"],
    ["matchStatus", "Match"],
    ["raw", "Raw"]
  ];
  fields.forEach(([key, label]) => {
    if (ref[key]) rows.push(`<dt>${esc(label)}</dt><dd>${esc(ref[key])}</dd>`);
  });
  if (ref.extra) rows.push(`<dt>Extra</dt><dd>${esc(JSON.stringify(ref.extra, null, 2))}</dd>`);
  return rows;
}
function renderStructuredReferences(root = document) {
  if (data.references_source !== "artifact" || !data.references || !Array.isArray(data.references.references)) return;
  const refs = data.references.references;
  const sectionIndex = data.sections.findIndex(section => section.title === "References");
  if (sectionIndex < 0) return;
  const section = data.sections[sectionIndex];
  const heading = root.querySelector(`#${CSS.escape(section.anchor)}`);
  if (!heading) return;
  const nextSection = data.sections.slice(sectionIndex + 1).map(item => root.querySelector(`#${CSS.escape(item.anchor)}`)).find(Boolean) || null;
  while (heading.nextSibling && heading.nextSibling !== nextSection) {
    heading.nextSibling.remove();
  }
  const panel = document.createElement("section");
  panel.className = "structured-references";
  panel.innerHTML = `
    <div class="references-summary">
      <strong>结构化参考文献</strong>
      <span>${refs.length} 篇</span>
    </div>
    <div class="reference-list">
      ${refs.map(ref => {
        const detailRows = referenceDetailRows(ref);
        return `
          <article class="reference-item">
            <span class="reference-index">${esc(ref.id || ("ref-" + ref.index))}</span>
            <div>
              <p class="reference-title">${esc(ref.title || ref.raw || "Untitled reference")}</p>
              <div class="reference-meta">${esc(ref.authors || "Unknown authors")}</div>
            </div>
            <div class="reference-year">${esc(ref.year || "")}</div>
            ${detailRows.length ? `<details class="reference-details"><summary>补充字段</summary><dl>${detailRows.join("")}</dl></details>` : ""}
          </article>
        `;
      }).join("")}
    </div>
  `;
  heading.parentNode.insertBefore(panel, nextSection);
}
function graphNodes() {
  return data.citation_graph?.snapshot?.nodes || [];
}
function graphEdges() {
  return data.citation_graph?.snapshot?.edges || [];
}
function graphViewBox() {
  const box = data.citation_graph?.layout?.view_box || {};
  return {
    minX: Number(box.min_x ?? 0),
    minY: Number(box.min_y ?? 0),
    width: Number(box.width ?? 460),
    height: Number(box.height ?? 460)
  };
}
function graphLayoutNode(nodeId) {
  return data.citation_graph?.layout?.nodes?.[nodeId] || { x: 230, y: 230, depth: 2 };
}
function graphNodeId(node) {
  return node.node_id || node.id || "";
}
function graphNodeTitle(node) {
  return node.title || graphNodeId(node);
}
function graphNodeVisible(node) {
  if (!graphState.showLowSignal && node.low_signal) return false;
  if (!graphState.showLibrary && node.kind === "library_paper") return false;
  if (!graphState.showExternal && node.kind !== "library_paper") return false;
  return true;
}
function graphNodeMatches(node) {
  const query = graphState.search.trim().toLowerCase();
  if (!query) return false;
  return `${graphNodeTitle(node)} ${node.year || ""} ${graphNodeId(node)}`.toLowerCase().includes(query);
}
function graphNeighbors(nodeId, edges) {
  const ids = new Set([nodeId]);
  edges.forEach(edge => {
    if (edge.source === nodeId) ids.add(edge.target);
    if (edge.target === nodeId) ids.add(edge.source);
  });
  return ids;
}
function graphIncomingDegree(node, fallbackIncomingDegrees) {
  const metrics = node.metrics || {};
  const metricDegree = Number(metrics.internal_in_degree);
  if (Number.isFinite(metricDegree)) return Math.max(0, Math.floor(metricDegree));
  return fallbackIncomingDegrees.get(graphNodeId(node)) || 0;
}
function graphFallbackIncomingDegrees(nodes, edges) {
  const ids = new Set(nodes.map(graphNodeId));
  const incoming = new Map();
  edges.forEach(edge => {
    if (ids.has(edge.target)) incoming.set(edge.target, (incoming.get(edge.target) || 0) + 1);
  });
  return incoming;
}
function graphNodeBaseSize(node) {
  if (node.kind === "library_paper") return GRAPH_LIBRARY_BASE_NODE_SIZE;
  if (node.display_tier === "single_external") return GRAPH_SINGLE_EXTERNAL_BASE_NODE_SIZE;
  return GRAPH_SHARED_EXTERNAL_BASE_NODE_SIZE;
}
function graphNodeSizeCap(node) {
  return node.kind === "library_paper" ? GRAPH_LIBRARY_NODE_SIZE_CAP : GRAPH_EXTERNAL_NODE_SIZE_CAP;
}
function graphNodeColor(node, importance) {
  if (importance?.halo) {
    if (node.kind === "library_paper") return "#2f7df6";
    if (node.display_tier === "single_external") return "#c4ca5d";
    return "#94a51f";
  }
  if (node.display_tier === "single_external") return "#b6bd74";
  return GRAPH_NODE_COLORS[node.kind] || GRAPH_NODE_COLORS.external_reference;
}
function graphNodeZIndex(node, importance) {
  const importanceZIndex = importance?.halo ? 8 : 0;
  if (node.kind === "library_paper") return Math.max(4, importanceZIndex);
  if (node.display_tier === "shared_external") return Math.max(2, importanceZIndex);
  if (node.visibility === "hover_only") return Math.max(1, importanceZIndex);
  return Math.max(2, importanceZIndex);
}
function buildGraphNodeImportance(nodes, edges) {
  const fallbackIncomingDegrees = graphFallbackIncomingDegrees(nodes, edges);
  const entries = nodes
    .map(node => ({ node, incomingDegree: graphIncomingDegree(node, fallbackIncomingDegrees) }))
    .filter(entry => entry.incomingDegree > 0);
  const degreeRanks = Array.from(new Set(entries.map(entry => entry.incomingDegree))).sort((left, right) => left - right);
  const rankByDegree = new Map(degreeRanks.map((degree, index) => [
    degree,
    degreeRanks.length <= 1 ? 1 : index / (degreeRanks.length - 1)
  ]));
  const haloCount = Math.min(
    GRAPH_IMPORTANCE_HALO_MAX,
    Math.max(1, Math.ceil(entries.length * GRAPH_IMPORTANCE_HALO_TOP_RATIO))
  );
  const haloNodeIds = new Set(entries
    .slice()
    .sort((left, right) =>
      right.incomingDegree - left.incomingDegree ||
      graphNodeId(left.node).localeCompare(graphNodeId(right.node))
    )
    .slice(0, haloCount)
    .map(entry => graphNodeId(entry.node)));
  return new Map(entries.map(entry => [
    graphNodeId(entry.node),
    {
      incomingDegree: entry.incomingDegree,
      percentile: rankByDegree.get(entry.incomingDegree) || 0,
      halo: haloNodeIds.has(graphNodeId(entry.node))
    }
  ]));
}
function graphNodeSize(node, importance) {
  const base = graphNodeBaseSize(node);
  if (!importance || importance.incomingDegree <= 0) return base;
  const cap = graphNodeSizeCap(node);
  return Math.min(cap, base + (cap - base) * importance.percentile);
}
function graphSearchText(node) {
  return `${graphNodeTitle(node)} ${node.year || ""} ${graphNodeId(node)} ${(node.aliases || []).join(" ")} ${(node.metrics?.synthesis_role_hints || []).join(" ")}`.toLowerCase();
}
function graphNodeMatchesSearchText(text, query) {
  const normalized = query.trim().toLowerCase();
  return !!normalized && String(text || "").includes(normalized);
}
function graphNodeVisual(node, importance, stateInfo) {
  const nodeId = graphNodeId(node);
  const baseSize = graphNodeSize(node, importance);
  const isStartNode = nodeId === stateInfo.startNodeId;
  const withinStartOneHop = Number(graphLayoutNode(nodeId).depth ?? 2) <= 1;
  const baseColor = isStartNode ? CITATION_GRAPH_START_NODE_COLOR : graphNodeColor(node, importance);
  const query = graphState.search.trim();
  const searchActive = !!query;
  const searchMatch = graphNodeMatchesSearchText(graphSearchText(node), query);
  if (!stateInfo.activeNodeId) {
    return {
      color: searchActive ? (searchMatch ? "#0ea5e9" : "#d3d8de") : baseColor,
      size: searchActive && searchMatch ? Math.max(baseSize * 1.35, baseSize + 1) : baseSize,
      zIndex: searchActive && searchMatch
        ? Math.max(30, graphNodeZIndex(node, importance))
        : isStartNode
          ? Math.max(12, graphNodeZIndex(node, importance))
          : graphNodeZIndex(node, importance),
      highlighted: Boolean(importance?.halo && (!searchActive || searchMatch)),
      label: searchActive && searchMatch ? graphNodeTitle(node) : "",
      active: false
    };
  }
  const neighbor = stateInfo.neighborIds.has(nodeId);
  const directlyHovered = nodeId === graphState.hoveredId;
  const activeNode = nodeId === stateInfo.activeNodeId;
  const activeNodeIsStart = stateInfo.activeNodeId === stateInfo.startNodeId;
  const selectedStart = graphState.selected?.kind === "node" && graphState.selected.id === stateInfo.startNodeId;
  const startOneHop = isStartNode || stateInfo.startOneHopIds.has(nodeId);
  const libraryTitleFromStart = activeNodeIsStart && startOneHop && node.kind === "library_paper";
  const activeLibraryTitle = activeNode && startOneHop && node.kind === "library_paper";
  const externalTitleFromPinnedStart =
    selectedStart &&
    startOneHop &&
    node.kind !== "library_paper" &&
    nodeId === stateInfo.hoverLabelId;
  const showHoverLabel =
    searchMatch ||
    (withinStartOneHop &&
      (isStartNode ||
        libraryTitleFromStart ||
        activeLibraryTitle ||
        externalTitleFromPinnedStart));
  return {
    color: searchActive && searchMatch ? "#0ea5e9" : neighbor ? baseColor : "#d3d8de",
    size: searchActive && searchMatch
      ? Math.max(baseSize * 1.35, baseSize + 1)
      : neighbor || node.visibility !== "hover_only"
        ? baseSize
        : Math.max(1, baseSize * 0.6),
    zIndex: searchActive && searchMatch
      ? Math.max(30, graphNodeZIndex(node, importance))
      : neighbor
        ? Math.max(10, graphNodeZIndex(node, importance))
        : isStartNode
          ? Math.max(12, graphNodeZIndex(node, importance))
          : graphNodeZIndex(node, importance),
    highlighted: Boolean(importance?.halo && (searchMatch || neighbor)),
    label: showHoverLabel ? graphNodeTitle(node) : "",
    active: activeNode || nodeId === graphState.selected?.id
  };
}
function graphHaloSvg(node, point, visual) {
  if (!visual.highlighted) return "";
  const library = node.kind === "library_paper";
  const soft = library ? GRAPH_LIBRARY_IMPORTANCE_HALO_LIGHT_SOFT : GRAPH_EXTERNAL_IMPORTANCE_HALO_LIGHT_SOFT;
  const strong = library ? GRAPH_LIBRARY_IMPORTANCE_HALO_LIGHT : GRAPH_EXTERNAL_IMPORTANCE_HALO_LIGHT;
  const radius = Math.max(5, visual.size) + 3;
  return `
    <circle class="graph-importance-halo-soft" cx="${point.x}" cy="${point.y}" r="${radius + 1}" stroke="${soft}" stroke-width="4"></circle>
    <circle class="graph-importance-halo" cx="${point.x}" cy="${point.y}" r="${radius}" stroke="${strong}" stroke-width="2"></circle>
  `;
}
function graphEdgeVisible(edge, activeNodeId, activeEdgeId) {
  if (activeEdgeId === edge.edge_id) return true;
  if (!activeNodeId) return false;
  return edge.source === activeNodeId || edge.target === activeNodeId;
}
function graphEdgeColor(edge, activeNodeId) {
  return activeNodeId && edge.target === activeNodeId
    ? CITATION_GRAPH_INCOMING_EDGE_COLOR
    : CITATION_GRAPH_OUTGOING_EDGE_COLOR;
}
function graphSelectedHoverNode(nodes) {
  if (graphState.selected?.kind !== "node") return "";
  const selectedId = graphState.selected.id || "";
  return nodes.some(node => graphNodeId(node) === selectedId) ? selectedId : "";
}
function cancelGraphHoverClear() {
  if (graphHoverClearTimer) {
    window.clearTimeout(graphHoverClearTimer);
    graphHoverClearTimer = 0;
  }
}
function scheduleGraphHoverClear(pinnedNodeId) {
  cancelGraphHoverClear();
  graphHoverClearTimer = window.setTimeout(() => {
    graphHoverClearTimer = 0;
    graphState.hoveredId = pinnedNodeId || "";
    graphState.hoverLabelId = "";
    renderCitationGraph();
  }, 80);
}
function updateGraphHover(nodeId) {
  const visibleNodes = graphNodes().filter(graphNodeVisible);
  const pinnedNode = graphSelectedHoverNode(visibleNodes);
  const currentEdges = graphEdges().filter(edge => {
    const ids = new Set(visibleNodes.map(graphNodeId));
    return ids.has(edge.source) && ids.has(edge.target);
  });
  cancelGraphHoverClear();
  let nextHovered = nodeId;
  let nextHoverLabel = "";
  if (pinnedNode && nodeId !== pinnedNode) {
    nextHovered = pinnedNode;
    nextHoverLabel = graphNeighbors(pinnedNode, currentEdges).has(nodeId) ? nodeId : "";
  }
  if (graphState.hoveredId === nextHovered && graphState.hoverLabelId === nextHoverLabel) return;
  graphState.hoveredId = nextHovered;
  graphState.hoverLabelId = nextHoverLabel;
  renderCitationGraph();
}
function graphDetailHtml() {
  const nodesById = new Map(graphNodes().map(node => [graphNodeId(node), node]));
  if (!graphState.selected) {
    return `<h3>Selection</h3><p class="muted">点击节点或连线查看引用细节。</p>`;
  }
  if (graphState.selected.kind === "edge") {
    const edge = graphEdges().find(item => item.edge_id === graphState.selected.id);
    if (!edge) return `<h3>Selection</h3><p class="muted">未找到所选连线。</p>`;
    return `
      <h3>${esc(edge.primary_role || "citation")}</h3>
      <dl>
        <dt>Source</dt><dd>${esc(nodesById.get(edge.source)?.title || edge.source)}</dd>
        <dt>Target</dt><dd>${esc(nodesById.get(edge.target)?.title || edge.target)}</dd>
        <dt>Mentions</dt><dd>${esc(edge.mention_count || 0)}</dd>
        <dt>ID</dt><dd>${esc(edge.edge_id)}</dd>
      </dl>
    `;
  }
  const node = nodesById.get(graphState.selected.id);
  if (!node) return `<h3>Selection</h3><p class="muted">未找到所选节点。</p>`;
  const metrics = node.metrics || {};
  return `
    <h3>${esc(graphNodeTitle(node))}</h3>
    <dl>
      <dt>Type</dt><dd>${esc(node.kind || "-")}</dd>
      <dt>Year</dt><dd>${esc(node.year || "-")}</dd>
      <dt>In</dt><dd>${esc(metrics.internal_in_degree ?? "-")}</dd>
      <dt>Out</dt><dd>${esc(metrics.internal_out_degree ?? "-")}</dd>
      <dt>Role</dt><dd>${esc((metrics.synthesis_role_hints || []).join(", ") || "-")}</dd>
      <dt>ID</dt><dd>${esc(graphNodeId(node))}</dd>
    </dl>
  `;
}
function renderCitationGraph() {
  if (!graphSection) return;
  const snapshot = data.citation_graph?.snapshot || {};
  const diagnostics = snapshot.diagnostics || {};
  const viewBox = graphViewBox();
  const nodes = graphNodes().filter(graphNodeVisible);
  const visibleIds = new Set(nodes.map(graphNodeId));
  const edges = graphEdges().filter(edge => visibleIds.has(edge.source) && visibleIds.has(edge.target));
  const pinnedNodeId = graphSelectedHoverNode(nodes);
  const activeNodeId = pinnedNodeId || graphState.hoveredId;
  const activeEdgeId = graphState.selected?.kind === "edge" ? graphState.selected.id : "";
  const neighborIds = activeNodeId ? graphNeighbors(activeNodeId, edges) : new Set();
  const startId = snapshot.start_node_id || "zotero:item:EIMSDEU3";
  const startOneHopIds = graphNeighbors(startId, edges);
  const importanceByNodeId = buildGraphNodeImportance(nodes, edges);
  const stateInfo = { activeNodeId, activeEdgeId, neighborIds, hoverLabelId: graphState.hoverLabelId, startNodeId: startId, startOneHopIds };
  const svgEdges = edges.filter(edge => graphEdgeVisible(edge, activeNodeId, activeEdgeId)).map(edge => {
    const source = graphLayoutNode(edge.source);
    const target = graphLayoutNode(edge.target);
    const color = graphEdgeColor(edge, activeNodeId);
    const marker = color === CITATION_GRAPH_INCOMING_EDGE_COLOR ? "graph-arrow-in" : "graph-arrow-out";
    return `<line class="graph-edge" x1="${source.x}" y1="${source.y}" x2="${target.x}" y2="${target.y}" stroke="${color}" marker-end="url(#${marker})" data-edge-id="${esc(edge.edge_id)}"></line>`;
  }).join("");
  const nodeRows = nodes.map(node => {
    const nodeId = graphNodeId(node);
    const point = graphLayoutNode(nodeId);
    const importance = importanceByNodeId.get(nodeId);
    const visual = graphNodeVisual(node, importance, stateInfo);
    const label = visual.label;
    return `
      <g data-z-index="${visual.zIndex}">
        ${graphHaloSvg(node, point, visual)}
        <circle class="graph-node ${visual.active ? "is-active" : ""}" cx="${point.x}" cy="${point.y}" r="${visual.size}" fill="${visual.color}" data-node-id="${esc(nodeId)}"></circle>
        ${label ? `<text class="graph-label" x="${point.x + visual.size + 4}" y="${point.y - visual.size - 3}">${esc(label.slice(0, 42))}</text>` : ""}
      </g>
    `;
  });
  const svgNodes = nodeRows.sort((left, right) => {
    const leftZ = Number((left.match(/data-z-index="([^"]+)"/) || [])[1] || 0);
    const rightZ = Number((right.match(/data-z-index="([^"]+)"/) || [])[1] || 0);
    return leftZ - rightZ;
  }).join("");
  const truncated = diagnostics.truncated ? `<span class="graph-badge warn">truncated</span>` : "";
  graphSection.innerHTML = `
    <div class="citation-graph-header">
      <div>
        <h2 id="${esc(data.citation_graph?.anchor || "citation-graph")}">Citation Graph</h2>
        <p>以 DETR 为中心的 2-hop 引用网络。节点和连线来自固化 snapshot。</p>
      </div>
      <div class="graph-badges">
        <span class="graph-badge">${esc(nodes.length)} nodes</span>
        <span class="graph-badge">${esc(edges.length)} edges</span>
        ${truncated}
      </div>
    </div>
    <div class="graph-toolbar">
      <input type="search" data-graph-search placeholder="Search graph" value="${esc(graphState.search)}">
      <button type="button" data-graph-filter="library" class="${graphState.showLibrary ? "active" : ""}">Library</button>
      <button type="button" data-graph-filter="external" class="${graphState.showExternal ? "active" : ""}">External</button>
      <button type="button" data-graph-filter="low" class="${graphState.showLowSignal ? "active" : ""}">Low signal</button>
      <button type="button" data-graph-reset>Reset</button>
    </div>
    <div class="graph-legend" aria-label="Citation graph legend">
      <span class="graph-legend-item"><span class="graph-legend-dot" style="background:${CITATION_GRAPH_START_NODE_COLOR}"></span>目标论文</span>
      <span class="graph-legend-item"><span class="graph-legend-dot" style="background:${GRAPH_NODE_COLORS.library_paper}"></span>库内文献</span>
      <span class="graph-legend-item"><span class="graph-legend-dot" style="background:${GRAPH_NODE_COLORS.external_reference}"></span>库外引用</span>
      <span class="graph-legend-item"><span class="graph-legend-halo"></span>高引用权重</span>
      <span class="graph-legend-item"><span class="graph-legend-line" style="background:${CITATION_GRAPH_INCOMING_EDGE_COLOR}"></span>指向当前节点</span>
      <span class="graph-legend-item"><span class="graph-legend-line" style="background:${CITATION_GRAPH_OUTGOING_EDGE_COLOR}"></span>当前节点引用</span>
    </div>
    <div class="graph-layout">
      <div class="graph-canvas">
        <svg viewBox="${viewBox.minX} ${viewBox.minY} ${viewBox.width} ${viewBox.height}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="2-hop citation graph">
          <defs>
            <marker id="graph-arrow-in" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="4.5" markerHeight="4.5" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="${CITATION_GRAPH_INCOMING_EDGE_COLOR}"></path>
            </marker>
            <marker id="graph-arrow-out" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="4.5" markerHeight="4.5" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="${CITATION_GRAPH_OUTGOING_EDGE_COLOR}"></path>
            </marker>
          </defs>
          ${svgEdges}
          ${svgNodes}
        </svg>
      </div>
      <aside class="graph-detail">${graphDetailHtml()}</aside>
    </div>
  `;
  graphSection.querySelector("[data-graph-search]")?.addEventListener("input", event => {
    graphState.search = event.target.value || "";
    renderCitationGraph();
  });
  graphSection.querySelector('[data-graph-filter="library"]')?.addEventListener("click", () => {
    graphState.showLibrary = !graphState.showLibrary;
    renderCitationGraph();
  });
  graphSection.querySelector('[data-graph-filter="external"]')?.addEventListener("click", () => {
    graphState.showExternal = !graphState.showExternal;
    renderCitationGraph();
  });
  graphSection.querySelector('[data-graph-filter="low"]')?.addEventListener("click", () => {
    graphState.showLowSignal = !graphState.showLowSignal;
    renderCitationGraph();
  });
  graphSection.querySelector("[data-graph-reset]")?.addEventListener("click", () => {
    graphState.search = "";
    graphState.showLibrary = true;
    graphState.showExternal = true;
    graphState.showLowSignal = false;
    graphState.hoveredId = "";
    graphState.hoverLabelId = "";
    graphState.selected = null;
    renderCitationGraph();
  });
  graphSection.querySelectorAll("[data-node-id]").forEach(node => {
    node.addEventListener("mouseenter", () => {
      updateGraphHover(node.getAttribute("data-node-id") || "");
    });
    node.addEventListener("mouseleave", () => {
      graphState.hoverLabelId = "";
      scheduleGraphHoverClear(graphSelectedHoverNode(graphNodes().filter(graphNodeVisible)));
    });
    node.addEventListener("click", () => {
      const nodeId = node.getAttribute("data-node-id") || "";
      cancelGraphHoverClear();
      graphState.selected = { kind: "node", id: nodeId };
      graphState.hoveredId = nodeId;
      graphState.hoverLabelId = "";
      renderCitationGraph();
    });
  });
  const graphCanvas = graphSection.querySelector(".graph-canvas");
  graphCanvas?.addEventListener("pointermove", event => {
    const node = event.target?.closest?.("[data-node-id]");
    if (node) {
      updateGraphHover(node.getAttribute("data-node-id") || "");
      return;
    }
    scheduleGraphHoverClear(graphSelectedHoverNode(graphNodes().filter(graphNodeVisible)));
  });
  graphCanvas?.addEventListener("mouseleave", () => {
    scheduleGraphHoverClear(graphSelectedHoverNode(graphNodes().filter(graphNodeVisible)));
  });
  graphCanvas?.addEventListener("click", event => {
    if (event.target?.closest?.("[data-node-id], [data-edge-id]")) return;
    cancelGraphHoverClear();
    graphState.hoveredId = "";
    graphState.hoverLabelId = "";
    graphState.selected = null;
    renderCitationGraph();
  });
  graphSection.querySelectorAll("[data-edge-id]").forEach(edge => {
    edge.addEventListener("click", () => {
      cancelGraphHoverClear();
      graphState.selected = { kind: "edge", id: edge.getAttribute("data-edge-id") || "" };
      graphState.hoveredId = "";
      graphState.hoverLabelId = "";
      renderCitationGraph();
    });
  });
}
function renderMath() {
  if (typeof renderMathInElement !== "function") return;
  [preface, paper, translationPaper, summary, postReading].filter(Boolean).forEach(root => renderMathInElement(root, {
    delimiters: [
      { left: "$$", right: "$$", display: true },
      { left: "$", right: "$", display: false },
      { left: "\\\\(", right: "\\\\)", display: false },
      { left: "\\\\[", right: "\\\\]", display: true }
    ],
    throwOnError: false,
    ignoredTags: ["script", "noscript", "style", "textarea", "pre", "code"]
  }));
}
function rerenderPaper() {
  closeConceptBubble();
  renderReadingFlow();
  renderPostReading();
  renderMath();
  applyConceptOverlay(paper);
  buildParallelSections();
}
marked.setOptions({ gfm: true, breaks: false, mangle: false, headerIds: false });
renderConceptRail();
renderPreface();
rerenderPaper();
renderTranslationPaper();
renderSummary();
renderMath();
renderCitationGraph();
toc.innerHTML = (data.navigation || data.sections || []).map(item => `<a href="#${esc(item.anchor)}" data-anchor="${esc(item.anchor)}" class="level-${esc(item.nav_level ?? 1)}">${esc(item.title)}</a>`).join("");
renderExtensions();
let current = (data.navigation || data.sections || [])[0];
renderSide(current);

const headingByAnchor = new Map((data.navigation || data.sections || []).map(item => [item.anchor, document.getElementById(item.anchor)]));
function updateCurrent() {
  const navigation = data.navigation || data.sections || [];
  let best = navigation[0];
  let bestTop = -Infinity;
  for (const item of navigation) {
    const el = headingByAnchor.get(item.anchor);
    if (!el) continue;
    const top = el.getBoundingClientRect().top;
    if (top <= 120 && top > bestTop) {
      best = item;
      bestTop = top;
    }
  }
  current = best;
  document.querySelectorAll("[data-anchor]").forEach(link => link.classList.toggle("active", link.dataset.anchor === best.anchor));
  renderSide(best);
}
paperScroll.addEventListener("scroll", updateCurrent, { passive: true });
window.addEventListener("scroll", updateCurrent, { passive: true });
document.querySelectorAll("[data-mode]").forEach(btn => btn.addEventListener("click", () => setMode(btn.dataset.mode)));
const hashMode = location.hash.startsWith("#mode=") ? location.hash.slice("#mode=".length) : null;
const initialMode = new URLSearchParams(location.search).get("mode") || hashMode;
setMode(["original", "translated", "compare", "focus"].includes(initialMode) ? initialMode : "compare");
updateCurrent();
"""
    (RESULT / "assets" / "deep-reading.css").write_text(css.strip() + "\n", encoding="utf-8")
    (RESULT / "assets" / "deep-reading.js").write_text(js.strip() + "\n", encoding="utf-8")

    embedded = json.dumps(view, ensure_ascii=False).replace("</", "<\\/")
    html = f"""<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>DETR 文献精读</title>
  <link rel="stylesheet" href="assets/deep-reading.css?v=20260611e">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.22/dist/katex.min.css">
</head>
<body class="mode-compare">
  <header class="topbar">
    <div class="brand">
      <strong>End-to-End Object Detection with Transformers</strong>
      <span>Nicolas Carion et al., 2020</span>
    </div>
    <nav class="modes" aria-label="阅读模式">
      <button type="button" data-mode="original">原文</button>
      <button type="button" data-mode="translated">译文</button>
      <button type="button" data-mode="compare">对照</button>
      <button type="button" data-mode="focus">专注</button>
    </nav>
  </header>
  <main class="shell">
    <aside class="concept-rail" data-concept-rail aria-label="概念导航"></aside>
    <nav class="toc" data-toc aria-label="论文目录"></nav>
    <section class="paper-scroll" data-paper-scroll>
      <section class="preface-section" data-preface></section>
      <section class="reading-flow markdown-body" data-paper></section>
      <article class="translation-paper" data-translation-paper></article>
      <section class="summary-section markdown-body" data-summary></section>
      <section class="post-reading markdown-body" data-post-reading></section>
      <section class="citation-graph-section" data-citation-graph></section>
      <section class="extensions" data-extensions></section>
    </section>
    <aside class="side" data-side></aside>
  </main>
  <script id="data" type="application/json">{embedded}</script>
  <script src="assets/vendor/marked.umd.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/katex@0.16.22/dist/katex.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/katex@0.16.22/dist/contrib/auto-render.min.js"></script>
  <script src="assets/deep-reading.js?v=20260611e"></script>
</body>
</html>
"""
    (RESULT / "deep-reading.html").write_text(html, encoding="utf-8")

    print(
        json.dumps(
            {
                "root": str(ROOT),
                "mode": "seamless-scroll",
                "sections": len(sections),
                "extensions": len(extensions),
                "images": len(images),
                "referenced_images": len(refs),
                "bundle": str(bundle_path),
            },
            ensure_ascii=False,
        )
    )


if __name__ == "__main__":
    build()
