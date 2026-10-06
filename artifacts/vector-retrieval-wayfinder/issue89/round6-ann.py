"""Isolated ANN experiment, not a production retrieval implementation."""

import argparse
import json
import sqlite3
import time
from pathlib import Path

import faiss
import numpy as np


def reference_distances(vectors, query):
    """Sequential float64 accumulation, checked bitwise against Rust exports."""
    if vectors.ndim != 2 or query.shape != (vectors.shape[1],):
        raise ValueError("dimension_mismatch")
    y = vectors.astype(np.float64)
    q = query.astype(np.float64)
    an = np.cumsum(q * q)[-1]
    bn = np.cumsum(y * y, axis=1)[:, -1]
    if not np.isfinite(an) or an <= 0 or np.any(~np.isfinite(bn)) or np.any(bn <= 0):
        raise ValueError("invalid_vector")
    dot = np.cumsum(y * q, axis=1)[:, -1]
    return (1 - dot / (np.sqrt(an) * np.sqrt(bn))).astype(np.float32)


def ranked(ids, distances):
    return ids[np.lexsort((ids, distances[ids]))]


def document_best(ids, distances, docs):
    ids = ranked(ids, distances)
    _, positions = np.unique(docs[ids], return_index=True)
    return ids[np.sort(positions)]


def tie_recall(returned, exact, universe, distances):
    if not len(exact):
        return None
    threshold = distances[exact[-1]]
    required = universe[distances[universe] < threshold]
    hit_below = np.intersect1d(returned, required).size
    hit_at = np.count_nonzero(distances[returned] == threshold)
    return float((hit_below + min(hit_at, len(exact) - len(required))) / len(exact))


def metrics(candidates, allowed, distances, docs, k):
    if not np.isin(candidates, allowed).all():
        raise ValueError("out_of_scope")
    candidates = np.unique(candidates)
    exact_fragments = ranked(allowed, distances)[:k]
    got_fragments = ranked(candidates, distances)[:k]
    all_best = document_best(allowed, distances, docs)
    exact_docs = all_best[:k]
    got_docs = document_best(candidates, distances, docs)[:k]

    def recall(a, b):
        return float(np.intersect1d(a, b).size / len(b)) if len(b) else None

    best_distance = np.full(int(docs.max()) + 1, np.inf, dtype=np.float32)
    best_distance[docs[all_best]] = distances[all_best]
    return {
        "k": k,
        "fragment_recall": recall(got_fragments, exact_fragments),
        "fragment_tie_recall": tie_recall(
            got_fragments, exact_fragments, allowed, distances
        ),
        "document_recall": recall(docs[got_docs], docs[exact_docs]),
        "document_tie_recall": tie_recall(
            docs[got_docs], docs[exact_docs], docs[all_best], best_distance
        ),
        "best_fragment_coverage": recall(candidates, exact_docs),
        "winner_identity_recall": recall(got_docs, exact_docs),
        "fragment_returned": len(got_fragments),
        "fragment_expected": len(exact_fragments),
        "document_returned": len(got_docs),
        "document_expected": len(exact_docs),
        "fragment_boundary_ties": int(
            np.count_nonzero(distances[allowed] == distances[exact_fragments[-1]])
        )
        if len(exact_fragments)
        else 0,
        "document_boundary_ties": int(
            np.count_nonzero(distances[all_best] == distances[exact_docs[-1]])
        )
        if len(exact_docs)
        else 0,
        "candidate_count": len(candidates),
        "candidate_document_count": len(np.unique(docs[candidates])),
        "filter_violations": 0,
    }


def eligible(db, filters, count=None):
    clauses, args = [], []
    if count is not None:
        clauses.append("v.id<=?")
        args.append(count)
    columns = {
        "libraries": "library_id",
        "kinds": "kind",
        "types": "item_type",
        "sections": "section",
    }
    tables = {
        "items": "row_items",
        "tags": "row_tags",
        "collections": "row_collections",
    }
    for key, values in filters.items():
        if not values:
            clauses.append("0")
            continue
        placeholders = ",".join("?" for _ in values)
        if key in columns:
            clauses.append(f"v.{columns[key]} IN ({placeholders})")
        elif key in tables:
            clauses.append(
                f"EXISTS(SELECT 1 FROM {tables[key]} m WHERE m.row_id=v.id AND m.value IN ({placeholders}))"
            )
        else:
            raise ValueError("unknown_filter")
        args.extend(values)
    where = " AND ".join(clauses) or "1"
    return np.array(
        [
            r[0] - 1
            for r in db.execute(
                f"SELECT v.id FROM vectors v WHERE {where} ORDER BY v.id", args
            )
        ],
        dtype=np.int64,
    )


def search(index, query, allowed, budget, ef):
    if not len(allowed):
        return np.array([], dtype=np.int64)
    params = faiss.SearchParametersHNSW(
        efSearch=max(ef, budget), sel=faiss.IDSelectorBatch(allowed)
    )
    _, ids = index.search(query, min(budget, len(allowed)), params=params)
    return ids[0][ids[0] >= 0]


def observation():
    values = {}
    for line in Path("/proc/self/status").read_text().splitlines():
        name, _, value = line.partition(":")
        if name in ["VmRSS", "VmHWM", "RssAnon", "RssFile"]:
            values[name + "_kib"] = int(value.split()[0])
    return values


def fetch_rerank(db, candidates, query, expected, docs):
    if not len(candidates):
        return
    placeholders = ",".join("?" for _ in candidates)
    rows = list(
        db.execute(
            f"SELECT id,vector FROM vectors WHERE id IN ({placeholders}) ORDER BY id",
            [int(i) + 1 for i in candidates],
        )
    )
    ids = np.array([r[0] - 1 for r in rows], dtype=np.int64)
    if not np.array_equal(ids, np.sort(candidates)):
        raise ValueError("candidate_row_missing")
    actual = reference_distances(
        np.stack([np.frombuffer(r[1], dtype="<f4") for r in rows]), query
    )
    if not np.array_equal(actual.view(np.uint32), expected[ids].view(np.uint32)):
        raise ValueError("candidate_bits_mismatch")
    order = np.lexsort((ids, actual))
    _, positions = np.unique(docs[ids[order]], return_index=True)
    return ids[order[np.sort(positions)]][:100]


def run(args):
    faiss.omp_set_num_threads(1)
    db = sqlite3.connect(Path(args.database).resolve().as_uri() + "?mode=ro", uri=True)
    db.execute("PRAGMA query_only=ON")
    db.execute("BEGIN")
    started = time.perf_counter()
    vectors = np.empty((args.rows, args.dimension), dtype=np.float32)
    docs = np.empty(args.rows, dtype=np.int64)
    seen = 0
    for i, doc, blob in db.execute(
        "SELECT id,document_id,vector FROM vectors WHERE id<=? ORDER BY id",
        (args.rows,),
    ):
        if i != seen + 1:
            raise ValueError("noncontiguous_stable_ids")
        vectors[seen] = np.frombuffer(blob, dtype="<f4")
        docs[seen] = doc
        seen += 1
    if seen != args.rows:
        raise ValueError("row_count_mismatch")
    queries = np.fromfile(args.queries, dtype="<f4").reshape(-1, args.dimension)
    oracle = np.fromfile(args.oracle, dtype="<f4").reshape(len(queries), args.rows)
    load_ms = (time.perf_counter() - started) * 1000
    checked = 0
    for qi, q in enumerate(queries):
        for offset in range(0, len(vectors), 128):
            actual = reference_distances(vectors[offset : offset + 128], q)
            expected = oracle[qi, offset : offset + 128]
            if not np.array_equal(actual.view(np.uint32), expected.view(np.uint32)):
                raise ValueError("rust_distance_bits_mismatch")
            checked += len(actual)
    print(json.dumps({"phase": "bitwise_verified", "distances": checked}), flush=True)
    started = time.perf_counter()
    normalized = vectors.copy()
    faiss.normalize_L2(normalized)
    query_normalized = queries.copy()
    faiss.normalize_L2(query_normalized)
    normalize_ms = (time.perf_counter() - started) * 1000
    index = faiss.IndexHNSWFlat(args.dimension, 16, faiss.METRIC_INNER_PRODUCT)
    index.hnsw.efConstruction = 100
    index.hnsw.rng = faiss.RandomGenerator(89)
    started = time.perf_counter()
    index.add(normalized)
    build_ms = (time.perf_counter() - started) * 1000
    faiss.write_index(index, str(Path(args.private) / "index.faiss"))
    index_bytes = (Path(args.private) / "index.faiss").stat().st_size
    del normalized
    del vectors
    print(
        json.dumps({"phase": "built", "rows": args.rows, "build_ms": build_ms}),
        flush=True,
    )
    source = db.execute(
        "SELECT library_id,item_type FROM vectors WHERE kind<3 AND id<=? LIMIT 1",
        (args.rows,),
    ).fetchone()
    tag = db.execute(
        "SELECT value FROM row_tags WHERE row_id<=? GROUP BY value ORDER BY count(*),value LIMIT 1",
        (args.rows,),
    ).fetchone()[0]
    collection = db.execute(
        "SELECT value FROM row_collections WHERE row_id<=? GROUP BY value ORDER BY count(*),value LIMIT 1",
        (args.rows,),
    ).fetchone()[0]
    item = db.execute(
        "SELECT value FROM row_items WHERE row_id<=? ORDER BY value LIMIT 1",
        (args.rows,),
    ).fetchone()[0]
    section = db.execute(
        "SELECT section FROM vectors WHERE kind=3 AND id<=? ORDER BY id LIMIT 1",
        (args.rows,),
    ).fetchone()[0]
    scopes = [
        ("all", {}),
        ("library", {"libraries": [source[0]]}),
        ("fulltext", {"kinds": [1]}),
        ("analysis", {"kinds": [2]}),
        ("item_type", {"types": [source[1]]}),
        ("item_refs", {"items": [item]}),
        ("tag", {"tags": [tag]}),
        ("collection", {"collections": [collection]}),
        (
            "intersection",
            {
                "libraries": [source[0]],
                "kinds": [1],
                "tags": [tag],
                "collections": [collection],
            },
        ),
        ("topics", {"kinds": [3]}),
        ("topic_section", {"kinds": [3], "sections": [section]}),
        ("empty_items", {"items": []}),
        ("empty_kinds", {"kinds": []}),
        ("missing_library", {"libraries": [-1]}),
        ("disjoint", {"kinds": [3], "tags": [tag]}),
    ]
    result = {
        "format": "issue89-round6-ann-v1",
        "rows": args.rows,
        "documents": len(np.unique(docs)),
        "queries": len(queries),
        "dimension": args.dimension,
        "faiss_version": faiss.__version__,
        "compile_options": faiss.get_compile_options().strip(),
        "threads": 1,
        "M": 16,
        "efConstruction": 100,
        "seed": 89,
        "load_ms": load_ms,
        "normalize_ms": normalize_ms,
        "build_ms": build_ms,
        "index_bytes": index_bytes,
        "distance_bits_checked": checked,
        "post_build_memory": observation(),
        "scopes": [],
        "cases": [],
    }
    # ponytail: fixed small grid, no optimizer; enlarge only on independent queries.
    configs = (
        [(100, 64), (100, 256), (100, 1024), (400, 256), (1600, 1024)]
        if args.rows < 20000
        else [(100, 256), (400, 256), (1600, 1024)]
    )
    all_ids = np.arange(args.rows, dtype=np.int64)
    candidate_records = []
    for scope_name, filters in scopes:
        started = time.perf_counter()
        allowed = eligible(db, filters, args.rows)
        scope_ms = (time.perf_counter() - started) * 1000
        result["scopes"].append(
            {
                "scope": scope_name,
                "eligible": len(allowed),
                "eligible_documents": len(np.unique(docs[allowed])),
                "fraction": len(allowed) / args.rows,
                "prepare_ms": scope_ms,
            }
        )
        if len(allowed) <= 4096:
            fallback = []
            for qi in range(len(queries)):
                started = time.perf_counter()
                winners = fetch_rerank(db, allowed, queries[qi], oracle[qi], docs)
                duration = (time.perf_counter() - started) * 1000
                if len(allowed) and not np.array_equal(
                    winners, document_best(allowed, oracle[qi], docs)[:100]
                ):
                    raise ValueError("fallback_winners_mismatch")
                fallback.append({"query": qi, "fetch_rerank_aggregate_ms": duration})
            result["scopes"][-1]["exact_fallback"] = fallback
        for budget, ef in configs:
            for route in ["in_search", "post_filter", "exact_fragment_budget_control"]:
                trials = []
                for qi, q in enumerate(query_normalized):
                    if route == "exact_fragment_budget_control":
                        candidates = ranked(allowed, oracle[qi])[:budget]
                    else:
                        candidates = search(
                            index,
                            q[None, :],
                            allowed if route == "in_search" else all_ids,
                            budget,
                            ef,
                        )
                        if route == "post_filter":
                            candidates = candidates[np.isin(candidates, allowed)]
                    for k in [25, 100]:
                        trials.append(
                            {
                                "query": qi,
                                **metrics(candidates, allowed, oracle[qi], docs, k),
                            }
                        )
                    candidate_records.append(
                        {
                            "scope": scope_name,
                            "budget": budget,
                            "ef": max(ef, budget),
                            "route": route,
                            "query": qi,
                            "ids": candidates.tolist(),
                        }
                    )
                case = {
                    "scope": scope_name,
                    "route": route,
                    "budget": budget,
                    "ef_requested": ef,
                    "ef_effective": max(ef, budget),
                    "quality": trials,
                }
                # Empty and narrow scopes still expose raw ANN behavior above.
                # SQLite fetch + recomputation uses actual stored vectors, not oracle lookup.
                if route == "in_search" and scope_name in [
                    "all",
                    "fulltext",
                    "tag",
                    "item_refs",
                    "topic_section",
                ]:
                    timings = []
                    for repeat in range(3):
                        for qi in np.roll(np.arange(len(queries)), repeat):
                            started = time.perf_counter()
                            candidates = search(
                                index,
                                query_normalized[qi : qi + 1],
                                allowed,
                                budget,
                                ef,
                            )
                            ann_end = time.perf_counter()
                            fetch_rerank(db, candidates, queries[qi], oracle[qi], docs)
                            done = time.perf_counter()
                            timings.append(
                                {
                                    "query": int(qi),
                                    "repeat": repeat,
                                    "ann_ms": (ann_end - started) * 1000,
                                    "fetch_rerank_aggregate_ms": (done - ann_end)
                                    * 1000,
                                    "total_ms": (done - started) * 1000,
                                    "candidates": len(candidates),
                                }
                            )
                    case["timings"] = timings
                result["cases"].append(case)
        print(
            json.dumps(
                {
                    "phase": "scope_complete",
                    "scope": scope_name,
                    "eligible": len(allowed),
                }
            ),
            flush=True,
        )
    result["final_memory"] = observation()
    Path(args.output).write_text(json.dumps(result, indent=2) + "\n")
    (Path(args.private) / "candidates-private.json").write_text(
        json.dumps(candidate_records)
    )
    print(json.dumps({"phase": "complete", "cases": len(result["cases"])}), flush=True)


def self_check():
    x = np.array([[1, 0], [1, 0], [0, 1], [-1, 0]], dtype=np.float32)
    q = x[0]
    assert np.array_equal(reference_distances(x, q), [0, 0, 1, 2])
    distances = reference_distances(x, q)
    assert ranked(np.array([1, 0, 2]), distances).tolist() == [0, 1, 2]
    docs = np.array([0, 0, 1, 2])
    assert document_best(np.array([2, 1, 0]), distances, docs).tolist() == [0, 2]
    result = metrics(np.array([1, 2]), np.arange(4), distances, docs, 1)
    assert result["fragment_recall"] == 0
    assert result["fragment_tie_recall"] == 1
    assert result["document_recall"] == 1
    assert result["document_tie_recall"] == 1
    assert result["best_fragment_coverage"] == 0
    assert result["winner_identity_recall"] == 0
    assert (
        metrics(
            np.array([], dtype=np.int64),
            np.array([], dtype=np.int64),
            distances,
            docs,
            25,
        )["fragment_recall"]
        is None
    )
    assert (
        metrics(np.array([0]), np.arange(4), distances, docs, 100)["document_returned"]
        == 1
    )
    c = sqlite3.connect(":memory:")
    c.executescript(
        "CREATE TABLE vectors(id INTEGER PRIMARY KEY,document_id,library_id,kind,item_type,section);CREATE TABLE row_items(row_id,value);CREATE TABLE row_tags(row_id,value);CREATE TABLE row_collections(row_id,value);INSERT INTO vectors VALUES(1,0,1,1,31,0),(2,1,2,2,31,0),(3,2,1,3,0,7);INSERT INTO row_tags VALUES(1,7),(1,8),(2,8);INSERT INTO row_collections VALUES(1,3),(2,4);INSERT INTO row_items VALUES(1,0),(2,1);"
    )
    assert eligible(c, {}).tolist() == [0, 1, 2]
    assert eligible(
        c, {"libraries": [1, 2], "tags": [7, 8], "collections": [3]}
    ).tolist() == [0]
    assert eligible(c, {"items": []}).size == 0
    assert eligible(c, {"kinds": []}).size == 0
    assert eligible(c, {"libraries": [1], "kinds": [3], "sections": [7]}).tolist() == [
        2
    ]
    faiss.omp_set_num_threads(1)
    index = faiss.IndexHNSWFlat(2, 8, faiss.METRIC_INNER_PRODUCT)
    index.add(x)
    out = search(index, q[None, :], np.array([2]), 4, 64)
    assert out.tolist() == [2]
    assert search(index, q[None, :], np.array([], dtype=np.int64), 4, 64).size == 0
    try:
        metrics(np.array([3]), np.array([0]), distances, docs, 1)
    except ValueError:
        pass
    else:
        raise AssertionError("out_of_scope_not_rejected")
    for invalid in [
        np.zeros((1, 2), dtype=np.float32),
        np.array([[np.nan, 1]], dtype=np.float32),
    ]:
        try:
            reference_distances(invalid, q)
        except ValueError:
            pass
        else:
            raise AssertionError("invalid_vector_not_rejected")
    print("round6 behavior checks passed", flush=True)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--self-test", action="store_true")
    parser.add_argument("--database")
    parser.add_argument("--queries")
    parser.add_argument("--oracle")
    parser.add_argument("--output")
    parser.add_argument("--private")
    parser.add_argument("--rows", type=int)
    parser.add_argument("--dimension", type=int, default=1024)
    options = parser.parse_args()
    if options.self_test:
        self_check()
    else:
        run(options)
