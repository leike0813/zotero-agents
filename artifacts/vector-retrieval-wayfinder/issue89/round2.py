"""Second-round isolated benchmark preparation; all content outputs stay ignored."""

import argparse
import json
import os
import shutil
import time
from pathlib import Path

import numpy as np
import requests

from corpus import (
    MODEL,
    QUERIES,
    QUERY_PREFIX,
    endpoint_embed,
    reduce_vectors,
    write_json,
)


SMALL_MODEL = "qwen3-embedding:0.6b"
CANDIDATES = {"small-1024": (SMALL_MODEL, 1024), "large-1024": (MODEL, 1024)}


def ignored_root(root):
    root = root.resolve()
    allowed = Path(".scaffold/test").resolve()
    if not root.is_relative_to(allowed):
        raise ValueError("experiment_root_must_be_under_scaffold_test")
    return root


def prepare(args):
    root = ignored_root(args.root)
    root.mkdir(parents=True, exist_ok=False)
    previous = args.previous.resolve()
    shutil.copyfile(previous / "chunks-0.json", root / "chunks.json")
    original = json.loads((previous / "manifest-0.json").read_text())
    # This private manifest is copied as data, never used to mutate the original DB.
    write_json(root / "original-manifest.json", original)
    count = len(original["rows"])
    original_vectors = np.memmap(
        previous / "vectors-0.f32", dtype="<f4", mode="r", shape=(count, 2560)
    )
    original_queries = np.fromfile(
        previous / "queries-frozen.f32", dtype="<f4"
    ).reshape(len(QUERIES), 2560)
    for name, (model, dimension) in CANDIDATES.items():
        candidate = root / name
        candidate.mkdir()
        if model == MODEL:
            reduce_vectors(original_vectors, dimension).tofile(
                candidate / "vectors.f32"
            )
            reduce_vectors(original_queries, dimension).tofile(
                candidate / "queries.f32"
            )
        manifest = dict(original)
        manifest.update(
            model=model,
            dimension=dimension,
            vectors_file=str(candidate / "vectors.f32"),
            queries_file=str(candidate / "queries.f32"),
            encoding={
                **original["encoding"],
                "output_dimensions": dimension,
                "reduction": "MRL_prefix_then_L2" if model == MODEL else "native",
            },
        )
        write_json(candidate / "manifest.json", manifest)
    baseline = dict(original)
    baseline.update(
        vectors_file=str(previous / "vectors-0.f32"),
        queries_file=str(previous / "queries-frozen.f32"),
    )
    write_json(root / "baseline-2560.json", baseline)
    print(json.dumps({"fragments": count, "queries": len(QUERIES), "prepared": True}))


def embed(args):
    root = ignored_root(args.root)
    candidate = root / "small-1024"
    destination = candidate / "vectors.f32"
    query_file = candidate / "queries.f32"
    if destination.exists() or query_file.exists():
        raise FileExistsError("fresh_candidate_required")
    rows = json.loads((root / "chunks.json").read_text())
    options = {"num_ctx": 4096}
    with destination.open("xb") as stream:
        for start in range(0, len(rows), args.batch):
            batch = rows[start : start + args.batch]
            vectors, metric = endpoint_embed(
                args.endpoint,
                [r["text"] for r in batch],
                options=options,
                model=SMALL_MODEL,
                dimension=1024,
            )
            stream.write(vectors.tobytes())
            stream.flush()
            with (candidate / "embedding.jsonl").open("a") as log:
                log.write(
                    json.dumps({"start": start, "count": len(batch), **metric}) + "\n"
                )
            if start % (args.batch * 20) == 0:
                print(
                    json.dumps({"completed": start + len(batch), "total": len(rows)}),
                    flush=True,
                )
    queries, metric = endpoint_embed(
        args.endpoint,
        [QUERY_PREFIX + q for q in QUERIES],
        options=options,
        model=SMALL_MODEL,
        dimension=1024,
    )
    queries.tofile(query_file)
    write_json(candidate / "query-embedding.json", metric)
    print(json.dumps({"embedded": len(rows), "query_metric": metric}), flush=True)


def quality(args):
    root = ignored_root(args.root)
    rows = json.loads((root / "chunks.json").read_text())
    by_candidate = {}
    for name in [*CANDIDATES, "baseline-2560"]:
        file = (
            root / name / "manifest.json"
            if name in CANDIDATES
            else root / (name + ".json")
        )
        manifest = json.loads(file.read_text())
        dimension = manifest["dimension"]
        vectors = np.memmap(
            manifest["vectors_file"],
            dtype="<f4",
            mode="r",
            shape=(len(rows), dimension),
        ).astype(np.float64)
        vectors /= np.linalg.norm(vectors, axis=1, keepdims=True)
        queries = (
            np.fromfile(manifest["queries_file"], dtype="<f4")
            .reshape(len(QUERIES), dimension)
            .astype(np.float64)
        )
        queries /= np.linalg.norm(queries, axis=1, keepdims=True)
        distances = 1 - queries @ vectors.T
        result = []
        for qi, query in enumerate(QUERIES):
            best = {}
            for index, row in enumerate(rows):
                if row["kind"] == 3:
                    continue
                hit = (float(distances[qi, index]), index)
                if row["document"] not in best or hit < best[row["document"]]:
                    best[row["document"]] = hit
            ranked = sorted(best.items(), key=lambda pair: pair[1])[:10]
            result.append(
                {
                    "query": query,
                    "results": [
                        {
                            "document": document,
                            "distance": score,
                            "fragment_index": index,
                            **rows[index],
                        }
                        for document, (score, index) in ranked
                    ],
                }
            )
        by_candidate[name] = result
    write_json(root / "quality-private.json", by_candidate)
    summary = {"gold_labels": "not_human_confirmed", "query_count": len(QUERIES)}
    summary["paired_top5"] = {
        name: [
            len(
                {r["document"] for r in results[i]["results"][:5]}
                & {r["document"] for r in results[i + 1]["results"][:5]}
            )
            for i in range(0, len(QUERIES), 2)
        ]
        for name, results in by_candidate.items()
    }
    summary["large_1024_vs_2560_top5"] = [
        len(
            {r["document"] for r in a["results"][:5]}
            & {r["document"] for r in b["results"][:5]}
        )
        for a, b in zip(by_candidate["large-1024"], by_candidate["baseline-2560"])
    ]
    summary["small_vs_large_1024_top5"] = [
        len(
            {r["document"] for r in a["results"][:5]}
            & {r["document"] for r in b["results"][:5]}
        )
        for a, b in zip(by_candidate["small-1024"], by_candidate["large-1024"])
    ]
    write_json(root / "quality-summary.json", summary)
    print(json.dumps(summary))


def hardware(args):
    root = ignored_root(args.root)
    rows = json.loads((root / "chunks.json").read_text())
    documents = [r["text"] for r in rows if r["kind"] == 1 and len(r["text"]) > 1000][
        :4
    ]
    query = [QUERY_PREFIX + QUERIES[0]]
    output = root / ("hardware-" + args.label + ".json")
    if output.exists():
        raise FileExistsError(output)
    endpoint = args.endpoint.rstrip("/")
    before = requests.get(endpoint + "/api/ps", timeout=10).json()
    records = []
    try:
        for model in [SMALL_MODEL, MODEL]:
            options = {"num_ctx": 4096, "num_thread": 14}
            if args.cpu:
                options["num_gpu"] = 0
            for workload, inputs in [
                ("four_documents", documents),
                ("single_query", query),
            ]:
                _, warm = endpoint_embed(endpoint, inputs, options, model, 1024)
                samples = []
                for _ in range(args.samples):
                    _, metric = endpoint_embed(endpoint, inputs, options, model, 1024)
                    samples.append(metric)
                    record = {
                        "model": model,
                        "dimension": 1024,
                        "workload": workload,
                        "options": options,
                        "warmup": warm,
                        "samples": samples,
                        "characters": sum(map(len, inputs)),
                        "allocation": requests.get(
                            endpoint + "/api/ps", timeout=10
                        ).json(),
                        "driver_host_load_average": list(os.getloadavg()),
                    }
                    write_json(output, records + [record])
                    print(
                        json.dumps(
                            {
                                "model": model,
                                "workload": workload,
                                "sample": len(samples),
                                "wall_ms": metric["wall_ms"],
                                "load_ms": metric["load_ms"],
                            }
                        ),
                        flush=True,
                    )
                records.append(record)
    finally:
        # Restore only pre-existing GPU model owners. If none were loaded, release ours.
        for model in before.get("models", []):
            if model.get("size_vram", 0) > 0 and model["name"] in [SMALL_MODEL, MODEL]:
                dimension = 1024 if model["name"] == SMALL_MODEL else 2560
                endpoint_embed(
                    endpoint,
                    ["restore"],
                    options={"num_ctx": model.get("context_length", 4096)},
                    model=model["name"],
                    dimension=dimension,
                )
        if not before.get("models"):
            for model in [SMALL_MODEL, MODEL]:
                requests.post(
                    endpoint + "/api/embed",
                    json={"model": model, "input": [], "keep_alive": 0},
                    timeout=60,
                ).raise_for_status()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("action", choices=["prepare", "embed", "quality", "hardware"])
    parser.add_argument("--root", type=Path, required=True)
    parser.add_argument("--previous", type=Path)
    parser.add_argument("--endpoint", default="http://192.168.13.11:11434")
    parser.add_argument("--batch", type=int, default=24)
    parser.add_argument("--samples", type=int, default=8)
    parser.add_argument("--label", choices=["p4", "cpu", "4090"])
    parser.add_argument("--cpu", action="store_true")
    args = parser.parse_args()
    started = time.monotonic()
    globals()[args.action](args)
    print(
        json.dumps({"action": args.action, "wall_seconds": time.monotonic() - started})
    )


if __name__ == "__main__":
    main()
