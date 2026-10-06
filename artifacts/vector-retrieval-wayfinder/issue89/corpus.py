"""Issue 89 experiment only. Private data stays in the supplied ignored run root."""

import argparse
import json
import re
import shutil
import sqlite3
import subprocess
import time
import tempfile
import unittest
from collections import Counter
from pathlib import Path

import numpy as np
import requests


MODEL = "qwen3-embedding:4b"
QUERY_PREFIX = (
    "Instruct: Given a research question, retrieve relevant scholarly passages.\nQuery:"
)
QUERIES = [
    "完全基于注意力机制的序列转导模型",
    "sequence transduction using only attention without recurrence",
    "目标检测中如何直接预测一组对象而不使用非极大值抑制",
    "object detection as direct set prediction without non maximum suppression",
    "自监督视觉表征与对比学习",
    "self supervised visual representation and contrastive learning",
    "多模态大语言模型的视觉理解能力",
    "visual understanding with multimodal large language models",
    "图像分割的通用提示与零样本泛化",
    "promptable image segmentation and zero shot transfer",
    "检索增强生成中的文档检索",
    "document retrieval for retrieval augmented generation",
]


def write_json(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2), encoding="utf-8")


def snapshot_database(source, target):
    if target.exists():
        raise FileExistsError(target)
    with sqlite3.connect(source.resolve().as_uri() + "?mode=ro", uri=True) as original:
        original.execute("PRAGMA query_only=ON")
        with sqlite3.connect(target) as copy:
            original.backup(copy)


def chunks(text, maximum=1200, overlap=0):
    if maximum < 16 or overlap < 0 or overlap >= maximum:
        raise ValueError("invalid_chunk_size")
    offsets = [0]
    for c in text:
        offsets.append(offsets[-1] + (2 if ord(c) > 0xFFFF else 1))
    boundaries = sorted({m.end() for m in re.finditer(r"\n\s*\n|\n(?=#{1,6} )", text)})
    a = 0
    while a < len(text):
        limit = min(a + maximum, len(text))
        candidates = [b for b in boundaries if a + maximum // 3 <= b <= limit]
        b = max(candidates) if candidates and limit < len(text) else limit
        if not candidates and limit < len(text):
            breaks = [
                m.end() + a for m in re.finditer(r"[。！？.!?]\s*|\s+", text[a:limit])
            ]
            acceptable = [x for x in breaks if x >= a + maximum // 3]
            if acceptable:
                b = max(acceptable)
        if text[a:b].strip():
            yield a, b, offsets[a], offsets[b]
        if b == len(text):
            break
        a = max(a + 1, b - overlap)


def validate_vectors(response, count, dimension=2560):
    try:
        vectors = np.asarray(response.get("embeddings"), dtype="<f4")
    except (TypeError, ValueError) as exc:
        raise ValueError("invalid_vectors") from exc
    if vectors.shape != (count, dimension) or not np.isfinite(vectors).all():
        raise ValueError("invalid_vector_shape_or_values")
    if (np.linalg.norm(vectors.astype(np.float64), axis=1) == 0).any():
        raise ValueError("zero_vector")
    return vectors


def reduce_vectors(vectors, dimension):
    values = np.asarray(vectors, dtype=np.float64)
    if (
        values.ndim != 2
        or dimension <= 0
        or dimension > values.shape[1]
        or not np.isfinite(values).all()
    ):
        raise ValueError("invalid_reduction_dimensions_or_values")
    prefix = values[:, :dimension]
    lengths = np.linalg.norm(prefix, axis=1, keepdims=True)
    if (lengths == 0).any():
        raise ValueError("zero_reduced_vector")
    return np.asarray(prefix / lengths, dtype="<f4")


class CorpusTests(unittest.TestCase):
    def test_mrl_reduction_renormalizes_and_rejects_invalid_prefix(self):
        reduced = reduce_vectors([[3.0, 4.0, 12.0]], 2)
        np.testing.assert_allclose(reduced, [[0.6, 0.8]], atol=1e-6)
        self.assertEqual(reduced.dtype, np.dtype("<f4"))
        for vectors, dimension in [
            ([[0.0, 0.0, 1.0]], 2),
            ([[1.0, float("nan"), 0.0]], 2),
            ([[1.0, 0.0]], 3),
            ([[1.0, 0.0]], 0),
        ]:
            with self.subTest(vectors=vectors, dimension=dimension):
                with self.assertRaises(ValueError):
                    reduce_vectors(vectors, dimension)

    def test_reuse_requires_same_source_and_actual_encoding_text(self):
        old = [{"source": 1, "text": "same"}, {"source": 2, "text": "other"}]
        new = [
            {"source": 1, "text": "same"},
            {"source": 3, "text": "same"},
            {"source": 2, "text": "changed"},
        ]
        self.assertEqual(reuse_indices(old, new), [0, None, None])

    def test_snapshot_is_consistent_and_does_not_mutate_source(self):
        with tempfile.TemporaryDirectory() as directory:
            source = Path(directory) / "source.sqlite"
            target = Path(directory) / "copy.sqlite"
            with sqlite3.connect(source) as db:
                db.execute("CREATE TABLE sample(value)")
                db.execute("INSERT INTO sample VALUES(7)")
            before = source.read_bytes()
            snapshot_database(source, target)
            with sqlite3.connect(target) as db:
                self.assertEqual(
                    db.execute("SELECT value FROM sample").fetchone(), (7,)
                )
                db.execute("DELETE FROM sample")
            self.assertEqual(source.read_bytes(), before)
            with self.assertRaises(FileExistsError):
                snapshot_database(source, target)

    def test_unicode_ranges_cover_original_and_respect_bound(self):
        text = "# 标题\n\n" + "测试🧠句子。" * 50 + "\n\nFin."
        pieces = list(chunks(text, 60))
        self.assertTrue(pieces)
        coverage = set()
        for a, b, start, end in pieces:
            self.assertLessEqual(b - a, 60)
            self.assertEqual(
                text.encode("utf-16-le")[start * 2 : end * 2].decode("utf-16-le"),
                text[a:b],
            )
            coverage.update(range(a, b))
        self.assertTrue(
            all(i in coverage for i, c in enumerate(text) if not c.isspace())
        )

    def test_response_rejects_partial_wrong_dimension_and_invalid_values(self):
        for vectors in [
            [[1.0, 0.0]],
            [[1.0]],
            [[float("nan"), 1.0], [1.0, 0.0]],
            [[0.0, 0.0], [1.0, 0.0]],
        ]:
            with self.subTest(vectors=vectors), self.assertRaises(ValueError):
                validate_vectors({"embeddings": vectors}, 2, 2)
        self.assertEqual(
            validate_vectors({"embeddings": [[1.0, 0.0], [0.0, 1.0]]}, 2, 2).shape,
            (2, 2),
        )


def endpoint_embed(endpoint, inputs, options=None, model=MODEL, dimension=2560):
    started = time.perf_counter()
    response = requests.post(
        endpoint.rstrip("/") + "/api/embed",
        json={
            "model": model,
            "input": inputs,
            "truncate": False,
            "dimensions": dimension,
            **({"options": options} if options else {}),
        },
        timeout=120,
    )
    if not response.ok:
        raise RuntimeError("embedding_http_" + str(response.status_code))
    data = response.json()
    vectors = validate_vectors(data, len(inputs), dimension)
    return vectors, {
        "wall_ms": (time.perf_counter() - started) * 1000,
        "total_ms": data.get("total_duration", 0) / 1e6,
        "load_ms": data.get("load_duration", 0) / 1e6,
        "tokens": data.get("prompt_eval_count"),
    }


def text_fields(value, path=""):
    if isinstance(value, str) and value.strip():
        yield path, value
    elif isinstance(value, list):
        for i, entry in enumerate(value):
            yield from text_fields(entry, path + "/" + str(i))
    elif isinstance(value, dict):
        for key, entry in value.items():
            if key not in {
                "id",
                "schema_id",
                "schema_version",
                "paper_ref",
                "digest_ref",
                "sourceRefs",
                "source_refs",
                "ref",
                "path",
                "locator",
                "url",
                "doi",
            }:
                yield from text_fields(entry, path + "/" + key)


def extract(args):
    root = args.root.resolve()
    source = args.source.resolve()
    if not root.is_relative_to(Path(".scaffold/test").resolve()):
        raise ValueError("private_root_must_be_ignored_test_directory")
    root.mkdir(parents=True, exist_ok=True)
    for original, target in [
        (source / "zotero.sqlite", root / "zotero.sqlite"),
        (source / "zotero-agents/state/synthesis.db", root / "synthesis.sqlite"),
    ]:
        if not target.exists():
            snapshot_database(original, target)
    db = sqlite3.connect(root / "zotero.sqlite")
    db.row_factory = sqlite3.Row
    papers = db.execute("""SELECT i.itemID,i.key,i.libraryID,t.typeName FROM items i
        JOIN itemTypes t USING(itemTypeID) LEFT JOIN deletedItems d USING(itemID)
        LEFT JOIN itemAttachments a USING(itemID) LEFT JOIN itemNotes n USING(itemID)
        LEFT JOIN itemAnnotations an USING(itemID)
        WHERE d.itemID IS NULL AND a.itemID IS NULL AND n.itemID IS NULL AND an.itemID IS NULL
        ORDER BY i.libraryID,i.key""").fetchall()
    paper_map = {p["itemID"]: i for i, p in enumerate(papers)}
    sources = []
    missing = Counter()

    def add(
        document,
        kind,
        field,
        text,
        private_identity,
        tags=(),
        collections=(),
        library=1,
        section=0,
    ):
        if text.strip():
            sources.append(
                {
                    "document": document,
                    "source": len(sources),
                    "kind": kind,
                    "field": field,
                    "text": text,
                    "identity": private_identity,
                    "library": library,
                    "section": section,
                    "tags": list(tags),
                    "collections": list(collections),
                }
            )

    for p in papers:
        d = paper_map[p["itemID"]]
        fields = dict(
            db.execute(
                "SELECT f.fieldName,v.value FROM itemData x JOIN fields f USING(fieldID) JOIN itemDataValues v USING(valueID) WHERE x.itemID=?",
                (p["itemID"],),
            ).fetchall()
        )
        tags = [
            r[0]
            for r in db.execute(
                "SELECT tagID FROM itemTags WHERE itemID=?", (p["itemID"],)
            )
        ]
        collections = [
            r[0]
            for r in db.execute(
                "SELECT collectionID FROM collectionItems WHERE itemID=?",
                (p["itemID"],),
            )
        ]
        metadata = "\n".join(
            k + ": " + fields[k]
            for k in ["title", "abstractNote", "publicationTitle", "date"]
            if fields.get(k)
        )
        add(d, 0, "metadata", metadata, p["key"], tags, collections, p["libraryID"])
        for a in db.execute(
            """SELECT i.key,a.path,a.contentType FROM itemAttachments a JOIN items i USING(itemID)
                LEFT JOIN deletedItems del USING(itemID) WHERE a.parentItemID=? AND del.itemID IS NULL
                AND a.contentType='text/markdown' """,
            (p["itemID"],),
        ):
            path = (
                source / "storage" / a["key"] / a["path"][8:]
                if a["path"].startswith("storage:")
                else Path(a["path"])
            )
            if not path.is_file():
                missing["fulltext_missing"] += 1
                continue
            copy = root / "attachments" / a["key"] / path.name
            copy.parent.mkdir(parents=True, exist_ok=True)
            before = path.stat()
            shutil.copy2(path, copy)
            after = path.stat()
            if (before.st_size, before.st_mtime_ns) != (
                after.st_size,
                after.st_mtime_ns,
            ):
                raise RuntimeError("source_changed_during_copy")
            add(
                d,
                1,
                "markdown",
                copy.read_text(encoding="utf-8"),
                a["key"],
                tags,
                collections,
                p["libraryID"],
            )
    # Decode copied note attachments with the existing production codec in tsx.
    notes = []
    for n in db.execute("""SELECT n.itemID,n.parentItemID,n.note FROM itemNotes n LEFT JOIN deletedItems d USING(itemID)
                           WHERE d.itemID IS NULL"""):
        if n["parentItemID"] not in paper_map:
            continue
        attachments = []
        for a in db.execute(
            "SELECT i.key,a.path FROM itemAttachments a JOIN items i USING(itemID) WHERE a.parentItemID=?",
            (n["itemID"],),
        ):
            if not a["path"]:
                continue
            path = (
                source / "storage" / a["key"] / a["path"][8:]
                if a["path"].startswith("storage:")
                else Path(a["path"])
            )
            if path.is_file() and path.stat().st_size <= 1024 * 1024:
                copy = root / "attachments" / a["key"] / path.name
                copy.parent.mkdir(parents=True, exist_ok=True)
                if not copy.exists():
                    shutil.copy2(path, copy)
                attachments.append(str(copy))
        notes.append(
            {
                "document": paper_map[n["parentItemID"]],
                "html": n["note"],
                "attachments": attachments,
            }
        )
    write_json(root / "note-input.json", notes)
    helper = root / "decode.mts"
    codec = (Path("src/modules/zoteroHost/notePayloadCodec.ts").resolve()).as_uri()
    helper.write_text(
        "import fs from 'node:fs';\nimport {listNotePayloadBlocks,parseEmbeddedNotePayloadBlock} from "
        + json.dumps(codec)
        + ";\nconst rows=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));const out=[];for(const row of rows){const blocks=listNotePayloadBlocks(row.html);for(const file of row.attachments){const b=parseEmbeddedNotePayloadBlock(new Uint8Array(fs.readFileSync(file)));if(b)blocks.push(b);}for(const b of blocks)if(!b.errors?.length&&['digest-markdown','citation-analysis-json'].includes(b.payloadType))out.push({document:row.document,type:b.payloadType,payload:b.markdown??b.payload});}fs.writeFileSync(process.argv[3],JSON.stringify(out));\n",
        encoding="utf-8",
    )
    subprocess.run(
        [
            "node",
            "--import",
            "tsx",
            str(helper),
            str(root / "note-input.json"),
            str(root / "analysis.json"),
        ],
        check=True,
    )
    seen = set()
    for a in json.loads((root / "analysis.json").read_text()):
        # Narrative projections; identity/confidence/bibliographic bookkeeping is not a passage.
        payload = a["payload"]
        if a["type"] == "citation-analysis-json":
            content = payload.get("citation_analysis", {})
            payload = {
                k: content[k]
                for k in ["summary", "report_md"]
                if isinstance(content.get(k), str)
            }
        for field, text in text_fields(payload):
            key = (a["document"], a["type"], field, text)
            if key in seen:
                continue
            seen.add(key)
            p = papers[a["document"]]
            tags = [
                r[0]
                for r in db.execute(
                    "SELECT tagID FROM itemTags WHERE itemID=?", (p["itemID"],)
                )
            ]
            cols = [
                r[0]
                for r in db.execute(
                    "SELECT collectionID FROM collectionItems WHERE itemID=?",
                    (p["itemID"],),
                )
            ]
            add(
                a["document"],
                2,
                a["type"] + field,
                text,
                p["key"],
                tags,
                cols,
                p["libraryID"],
            )
    topicroot = source / "zotero-agents/data/synthesis/topics"
    topic_count = 0
    section_ids = {}
    for file in sorted(topicroot.rglob("artifact.json")):
        local = root / "topics" / str(topic_count) / "artifact.json"
        local.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(file, local)
        value = json.loads(local.read_text(encoding="utf-8"))
        for section in [
            "topic",
            "summary",
            "claims",
            "debates",
            "future_directions",
            "taxonomy",
            "timeline_events",
            "synthesis_report",
            "review_outline",
            "improvement_dimensions",
            "coverage",
        ]:
            section_ids.setdefault(section, len(section_ids) + 1)
            for field, text in text_fields(value.get(section)):
                add(
                    len(papers) + topic_count,
                    3,
                    section + field,
                    text,
                    "topic-" + str(topic_count),
                    section=section_ids[section],
                )
        topic_count += 1
    write_json(root / "sources.json", sources)
    counts = {}
    for overlap in [0, 120]:
        rows = []
        for src in sources:
            for a, b, start, end in chunks(src["text"], args.maximum, overlap):
                rows.append(
                    {
                        **{k: v for k, v in src.items() if k != "text"},
                        "text": src["text"][a:b],
                        "start": start,
                        "end": end,
                    }
                )
        write_json(root / ("chunks-" + str(overlap) + ".json"), rows)
        counts[str(overlap)] = {
            "fragments": len(rows),
            "by_kind": dict(Counter(r["kind"] for r in rows)),
            "encoded_chars": sum(len(r["text"]) for r in rows),
        }
    summary = {
        "regular_documents": len(papers),
        "item_types": dict(Counter(p["typeName"] for p in papers)),
        "topics": topic_count,
        "sources": len(sources),
        "sources_by_kind": dict(Counter(s["kind"] for s in sources)),
        "text_chars": sum(len(s["text"]) for s in sources),
        "maximum_characters": args.maximum,
        "length_strategy": "conservative_unicode_characters_not_exact_tokens",
        "overlap_variants": counts,
        "missing": dict(missing),
        "sections": section_ids,
    }
    write_json(root / "corpus-summary.json", summary)
    print(json.dumps(summary))


def embed(args):
    root = args.root.resolve()
    rows = json.loads((root / f"chunks-{args.overlap}.json").read_text())
    destination = root / f"vectors-{args.overlap}.f32"
    completed = destination.stat().st_size // (2560 * 4) if destination.exists() else 0
    if destination.exists() and destination.stat().st_size % (2560 * 4):
        raise ValueError("incomplete_vector_file")
    metrics = []
    reuse = [None] * len(rows)
    previous_vectors = None
    if args.overlap != 0 and (root / "manifest-0.json").exists():
        previous = json.loads((root / "manifest-0.json").read_text())
        if (
            previous.get("model") == MODEL
            and previous.get("encoding")
            == {"query_prefix": QUERY_PREFIX, "document_prefix": "", "truncate": False}
            and previous["dimension"] == 2560
        ):
            old = json.loads((root / "chunks-0.json").read_text())
            reuse = reuse_indices(old, rows)
            previous_vectors = np.memmap(
                root / "vectors-0.f32", dtype="<f4", mode="r", shape=(len(old), 2560)
            )
    with destination.open("ab") as stream:
        for start in range(completed, len(rows), args.batch):
            batch = rows[start : start + args.batch]
            needed = [i for i in range(len(batch)) if reuse[start + i] is None]
            vectors = np.empty((len(batch), 2560), dtype="<f4")
            metric = {"wall_ms": 0, "total_ms": 0, "load_ms": 0, "tokens": 0}
            if needed:
                fresh, metric = endpoint_embed(
                    args.endpoint, [batch[i]["text"] for i in needed]
                )
                vectors[needed] = fresh
            for i in range(len(batch)):
                if reuse[start + i] is not None:
                    vectors[i] = previous_vectors[reuse[start + i]]
            metric["encoded"] = len(needed)
            metric["reused"] = len(batch) - len(needed)
            stream.write(vectors.tobytes())
            stream.flush()
            metrics.append({"start": start, "count": len(batch), **metric})
            with (root / f"embedding-{args.overlap}.jsonl").open("a") as log:
                log.write(json.dumps(metrics[-1]) + "\n")
            if start % (args.batch * 10) == 0:
                print(
                    json.dumps(
                        {
                            "completed": start + len(batch),
                            "total": len(rows),
                            "last_wall_ms": round(metric["wall_ms"]),
                        }
                    ),
                    flush=True,
                )
    query_file = root / "queries-0.f32"
    if args.overlap != 0 and query_file.exists():
        metric = {"reused_query_vectors": True}
    else:
        query_vectors, metric = endpoint_embed(
            args.endpoint, [QUERY_PREFIX + q for q in QUERIES]
        )
        query_vectors.tofile(query_file)
    write_json(root / "queries-private.json", QUERIES)
    prepare(args)
    print(json.dumps({"embedded": len(rows), "query_metric": metric}), flush=True)


def reuse_indices(old, new):
    lookup = {(r["source"], r["text"]): i for i, r in enumerate(old)}
    return [lookup.get((r["source"], r["text"])) for r in new]


def prepare(args):
    root = args.root.resolve()
    rows = json.loads((root / f"chunks-{args.overlap}.json").read_text())
    summary = json.loads((root / "corpus-summary.json").read_text())
    with sqlite3.connect(root / "zotero.sqlite") as db:
        item_types = [
            r[0]
            for r in db.execute("""SELECT i.itemTypeID FROM items i
            LEFT JOIN deletedItems d USING(itemID)
            LEFT JOIN itemAttachments a USING(itemID) LEFT JOIN itemNotes n USING(itemID)
            LEFT JOIN itemAnnotations an USING(itemID)
            WHERE d.itemID IS NULL AND a.itemID IS NULL AND n.itemID IS NULL AND an.itemID IS NULL
            ORDER BY i.libraryID,i.key""")
        ]
    destination = root / f"vectors-{args.overlap}.f32"
    if destination.stat().st_size != len(rows) * 2560 * 4:
        raise ValueError("embedding_not_complete")
    manifest = {
        "dimension": 2560,
        "vectors_file": str(destination),
        "queries_file": str(root / "queries-0.f32"),
        "query_count": len(QUERIES),
        "document_count": max(r["document"] for r in rows) + 1,
        "regular_document_count": summary["regular_documents"],
        "topic_count": summary["topics"],
        "model": MODEL,
        "encoding": {
            "query_prefix": QUERY_PREFIX,
            "document_prefix": "",
            "truncate": False,
        },
        "splitting": {
            "maximum_characters": summary["maximum_characters"],
            "overlap_characters": args.overlap,
        },
        "rows": [
            {
                "item_type": item_types[r["document"]] if r["kind"] < 3 else 0,
                "item_refs": [r["document"]] if r["kind"] < 3 else [],
                "start_utf16": r["start"],
                "end_utf16": r["end"],
                **{
                    k: r[k]
                    for k in [
                        "document",
                        "source",
                        "library",
                        "kind",
                        "section",
                        "tags",
                        "collections",
                    ]
                },
            }
            for r in rows
        ],
    }
    write_json(root / f"manifest-{args.overlap}.json", manifest)


def hardware(args):
    root = args.root.resolve()
    rows = json.loads((root / "chunks-0.json").read_text())
    inputs = [r["text"] for r in rows if r["kind"] == 1 and len(r["text"]) > 1000][:4]
    if len(inputs) != 4:
        raise ValueError("four_long_inputs_required")
    endpoint = args.endpoint.rstrip("/")
    label = args.label or ("cpu" if args.cpu else "gpu")
    if not re.fullmatch(r"[a-zA-Z0-9_-]+", label):
        raise ValueError("invalid_hardware_label")
    output = root / ("hardware-" + label + ".json")
    results = []
    before = requests.get(endpoint + "/api/ps", timeout=10).json()
    restore_gpu = args.cpu and any(
        m["name"] == MODEL and m.get("size_vram", 0) > 0 for m in before["models"]
    )
    try:
        for sample in range(args.samples):
            _, metric = endpoint_embed(
                endpoint, inputs, {"num_gpu": 0, "num_thread": 14} if args.cpu else None
            )
            allocation = requests.get(endpoint + "/api/ps", timeout=10).json()
            result = {
                "sample": sample,
                "inputs": len(inputs),
                "characters": sum(map(len, inputs)),
                **metric,
                "allocation": [
                    {k: m.get(k) for k in ["size_vram", "context_length"]}
                    for m in allocation["models"]
                    if m["name"] == MODEL
                ],
            }
            results.append(result)
            write_json(output, results)
            print(json.dumps(result), flush=True)
    finally:
        if restore_gpu:
            endpoint_embed(endpoint, inputs, {"num_gpu": -1})


def quality(args):
    # Paired-query diagnostics are observable evidence, not human-approved relevance labels.
    root = args.root.resolve()
    rows = json.loads((root / f"chunks-{args.overlap}.json").read_text())
    vectors = np.memmap(
        root / f"vectors-{args.overlap}.f32",
        dtype="<f4",
        mode="r",
        shape=(len(rows), 2560),
    )
    vectors = vectors.astype(np.float64)
    vectors /= np.linalg.norm(vectors, axis=1, keepdims=True)
    queries = (
        np.fromfile(root / "queries-0.f32", dtype="<f4")
        .reshape(-1, 2560)
        .astype(np.float64)
    )
    queries /= np.linalg.norm(queries, axis=1, keepdims=True)
    distances = 1 - queries @ vectors.T
    rankings = []
    for qi, query in enumerate(QUERIES):
        best = {}
        for i, row in enumerate(rows):
            if row["kind"] == 3:
                continue
            candidate = (float(distances[qi, i]), i)
            if row["document"] not in best or candidate < best[row["document"]]:
                best[row["document"]] = candidate
        ranked = sorted(best.items(), key=lambda entry: entry[1])[:10]
        rankings.append(
            {
                "query": query,
                "results": [
                    {
                        "document": doc,
                        "distance": score,
                        "kind": rows[i]["kind"],
                        "source": rows[i]["source"],
                        "start": rows[i]["start"],
                        "end": rows[i]["end"],
                        "text": rows[i]["text"],
                    }
                    for doc, (score, i) in ranked
                ],
            }
        )
    write_json(root / f"quality-private-{args.overlap}.json", rankings)
    summary = {
        "query_count": len(rankings),
        "gold_labels": "not_human_confirmed",
        "paired_top5_intersection": [
            len(
                {r["document"] for r in rankings[i]["results"][:5]}
                & {r["document"] for r in rankings[i + 1]["results"][:5]}
            )
            for i in range(0, len(rankings), 2)
        ],
    }
    write_json(root / f"quality-summary-{args.overlap}.json", summary)
    print(json.dumps(summary))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "action", choices=["extract", "embed", "prepare", "hardware", "quality", "test"]
    )
    parser.add_argument("--root", type=Path)
    parser.add_argument("--source", type=Path)
    parser.add_argument("--maximum", type=int, default=1200)
    parser.add_argument("--overlap", type=int, default=0)
    parser.add_argument("--endpoint", default="http://192.168.13.11:11434")
    parser.add_argument("--batch", type=int, default=16)
    parser.add_argument("--cpu", action="store_true")
    parser.add_argument("--samples", type=int, default=4)
    parser.add_argument("--label")
    args = parser.parse_args()
    if args.action == "test":
        unittest.main(argv=["corpus.py"])
    elif args.action == "extract":
        extract(args)
    elif args.action == "prepare":
        prepare(args)
    elif args.action == "hardware":
        hardware(args)
    elif args.action == "quality":
        quality(args)
    else:
        embed(args)


if __name__ == "__main__":
    main()
