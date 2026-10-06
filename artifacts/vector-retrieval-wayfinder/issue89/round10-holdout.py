"""Unseen-query candidate-budget experiment on frozen private inputs."""

import argparse
import importlib.util
import json
import sqlite3
import time
from pathlib import Path

spec = importlib.util.spec_from_file_location(
    "round9", Path(__file__).with_name("round9-flat.py")
)
previous = importlib.util.module_from_spec(spec)
spec.loader.exec_module(previous)
common, reference = previous.common, previous.reference
np, faiss = previous.np, previous.faiss
BUDGETS = (1600, 6400, 16384)


def execute(db, index, query, raw_query, meta, filters, budget):
    if not isinstance(budget, int) or budget <= 0:
        raise ValueError("invalid_budget")
    started = time.perf_counter()
    allowed = common.fast_eligible(db, filters, meta)
    prepared = time.perf_counter()
    scores = previous.subset_scores(index, query, allowed)
    candidates = previous.select_scores(allowed, scores, budget)
    if (
        len(candidates) != min(budget, len(allowed))
        or len(np.unique(candidates)) != len(candidates)
        or not np.isin(candidates, allowed).all()
    ):
        raise ValueError("candidate_count_or_scope")
    searched = time.perf_counter()
    pool = common.rescore(db, candidates, raw_query)
    rescored = time.perf_counter()
    top = common.winners(pool, meta[:, 1], 100)
    aggregated = time.perf_counter()
    del scores, candidates
    cleaned = time.perf_counter()
    return (
        pool,
        top,
        allowed,
        {
            "prepare_ms": (prepared - started) * 1000,
            "search_ms": (searched - prepared) * 1000,
            "rescore_ms": (rescored - searched) * 1000,
            "aggregate_ms": (aggregated - rescored) * 1000,
            "cleanup_ms": (cleaned - aggregated) * 1000,
            "total_ms": (cleaned - started) * 1000,
        },
    )


def run(args):
    root = Path(args.private)
    if Path(args.output).exists():
        raise ValueError("output_not_fresh")
    manifest = json.loads((root / "queries-private.json").read_text())
    entries = manifest["queries"]
    if len(entries) != 32 or [q["id"] for q in entries] != list(range(1, 33)):
        raise ValueError("query_manifest_shape")
    queries = np.fromfile(root / "queries.f32", dtype="<f4").reshape(32, 1024)
    if not np.isfinite(queries).all() or np.any(np.linalg.norm(queries, axis=1) <= 0):
        raise ValueError("invalid_query_vectors")
    normalized = queries.copy()
    faiss.normalize_L2(normalized)
    faiss.omp_set_num_threads(1)
    started = time.perf_counter()
    index = faiss.read_index(args.flat_file)
    if (
        index.ntotal != 248806
        or index.d != 1024
        or index.metric_type != faiss.METRIC_INNER_PRODUCT
    ):
        raise ValueError("resident_identity_mismatch")
    loaded = time.perf_counter()
    db, _ = previous.open_database(Path(args.previous))
    meta = common.metadata(db, index.ntotal)
    ready = time.perf_counter()
    oracle = np.fromfile(root / "distances.f32", dtype="<f4").reshape(32, len(meta))
    if not np.isfinite(oracle).all():
        raise ValueError("invalid_oracle")
    anchor = db.execute(
        "SELECT v.library_id,v.item_type,t.value,c.value FROM vectors v JOIN row_tags t ON t.row_id=v.id JOIN row_collections c ON c.row_id=v.id WHERE v.kind=1 AND v.id<=? ORDER BY v.id,t.value,c.value LIMIT 1",
        (12646,),
    ).fetchone()
    scopes = [
        ("all", {}),
        (
            "intersection",
            {
                "libraries": [anchor[0]],
                "types": [anchor[1]],
                "kinds": [1],
                "tags": [anchor[2]],
                "collections": [anchor[3]],
            },
        ),
        (
            "union_intersection",
            {
                "libraries": [anchor[0]],
                "kinds": [1, 2],
                "tags": [anchor[2], anchor[2] + 1],
                "collections": [anchor[3], anchor[3] + 1],
            },
        ),
    ]
    result = {
        "format": "issue89-round10-v1",
        "baseline": "84b3028dba8f5f3b8437f3aa237bf0fec2e68820",
        "query_manifest": [
            {k: q[k] for k in ["id", "language", "category"]} for q in entries
        ],
        "rows": len(meta),
        "dimension": 1024,
        "budgets": BUDGETS,
        "repeats": 2,
        "faiss_version": faiss.__version__,
        "sqlite_version": sqlite3.sqlite_version,
        "threads": faiss.omp_get_max_threads(),
        "resident_load_ms": (loaded - started) * 1000,
        "metadata_and_connection_ms": (ready - loaded) * 1000,
        "resident_vector_payload_bytes": index.ntotal * index.d * 4,
        "metadata_bytes": meta.nbytes,
        "oracle_bytes": oracle.nbytes,
        "post_load_memory": reference.observation(),
        "distance_bits_checked": 0,
        "cases": [],
    }
    for scope, filters in scopes:
        allowed = common.fast_eligible(db, filters, meta)
        for actual in [
            reference.eligible(db, filters, len(meta)),
            common.indexed_eligible(db, filters, len(meta)),
        ]:
            if not np.array_equal(allowed, actual):
                raise ValueError("scope_identity_mismatch")
        cases = {
            budget: {
                "scope": scope,
                "budget": budget,
                "eligible": len(allowed),
                "objects": len(np.unique(meta[allowed, 1])),
                "records": [],
            }
            for budget in BUDGETS
        }
        for budget in BUDGETS:
            execute(db, index, normalized[:1], queries[0], meta, filters, budget)
        cache = {}
        for repeat in range(2):
            for budget in BUDGETS if repeat == 0 else reversed(BUDGETS):
                for qi in np.roll(np.arange(32), repeat):
                    pool, top, current, timing = execute(
                        db,
                        index,
                        normalized[qi : qi + 1],
                        queries[qi],
                        meta,
                        filters,
                        budget,
                    )
                    ids = np.array(list(pool), dtype=np.int64)
                    scores = np.array(list(pool.values()), dtype=np.float32)
                    if not np.array_equal(current, allowed) or not np.array_equal(
                        scores.view(np.uint32), oracle[qi, ids].view(np.uint32)
                    ):
                        raise ValueError("scope_or_distance_bits_mismatch")
                    result["distance_bits_checked"] += len(ids)
                    if not np.array_equal(
                        top, reference.document_best(ids, oracle[qi], meta[:, 1])[:100]
                    ):
                        raise ValueError("winner_identity_mismatch")
                    key = (budget, int(qi))
                    if repeat == 0:
                        quality = {
                            str(k): reference.metrics(
                                ids, allowed, oracle[qi], meta[:, 1], k
                            )
                            for k in [25, 100]
                        }
                        cache[key] = (ids, top, quality)
                    else:
                        # Quality belongs to repeat 0; repeat 1 checks identity.
                        old_ids, old_top, quality = cache[key]
                        if not np.array_equal(ids, old_ids) or not np.array_equal(
                            top, old_top
                        ):
                            raise ValueError("repeat_identity_changed")
                    cases[budget]["records"].append(
                        {
                            "query": int(qi) + 1,
                            "repeat": repeat,
                            **timing,
                            "quality": quality,
                        }
                    )
                print(
                    json.dumps(
                        {
                            "phase": "budget_complete",
                            "scope": scope,
                            "budget": budget,
                            "repeat": repeat,
                        }
                    ),
                    flush=True,
                )
        result["cases"].extend(cases.values())
    result["final_memory"] = reference.observation()
    with Path(args.output).open("x") as f:
        json.dump(result, f, indent=2)
    db.rollback()
    db.close()
    print(
        json.dumps(
            {"phase": "complete", "bits_checked": result["distance_bits_checked"]}
        ),
        flush=True,
    )


def self_check():
    previous.self_check()
    vectors = np.array([[1, 0], [1, 0], [0, 1]], dtype=np.float32)
    index = faiss.IndexFlatIP(2)
    index.add(vectors)
    db = sqlite3.connect(":memory:")
    db.execute("CREATE TABLE vectors(id INTEGER PRIMARY KEY, vector BLOB)")
    db.executemany(
        "INSERT INTO vectors VALUES (?,?)",
        [(i + 1, row.tobytes()) for i, row in enumerate(vectors)],
    )
    meta = np.zeros((3, 6), dtype=np.int64)
    meta[:, 0], meta[:, 1] = [1, 2, 3], [0, 0, 1]
    query = np.array([[1, 0]], dtype=np.float32)
    pool, top, allowed, timing = execute(db, index, query, query[0], meta, {}, 2)
    assert list(pool) == [0, 1] and top.tolist() == [0]
    assert (
        reference.metrics(
            np.array(list(pool)),
            allowed,
            np.array([0, 0, 1], dtype=np.float32),
            meta[:, 1],
            2,
        )["best_fragment_coverage"]
        == 0.5
    )
    pool, top, _, _ = execute(db, index, query, query[0], meta, {}, 3)
    assert top.tolist() == [0, 2]
    assert (
        timing["total_ms"]
        >= sum(
            timing[k]
            for k in [
                "prepare_ms",
                "search_ms",
                "rescore_ms",
                "aggregate_ms",
                "cleanup_ms",
            ]
        )
        - 1e-9
    )
    pool, top, allowed, _ = execute(
        db, index, query, query[0], meta, {"libraries": []}, 3
    )
    assert not pool and not len(top) and not len(allowed)
    try:
        execute(db, index, query, query[0], meta, {}, 0)
    except ValueError:
        pass
    else:
        raise AssertionError("invalid_budget_accepted")
    db.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--self-test", action="store_true")
    parser.add_argument("--private")
    parser.add_argument("--previous")
    parser.add_argument("--flat-file")
    parser.add_argument("--output")
    args = parser.parse_args()
    if args.self_test:
        self_check()
        print("self-check passed")
    else:
        run(args)
