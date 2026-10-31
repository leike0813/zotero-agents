"""Dynamic Flat candidate experiment on frozen inputs, not production storage."""

import argparse
import gc
import importlib.util
import json
import sqlite3
import time
from pathlib import Path

spec = importlib.util.spec_from_file_location(
    "round8", Path(__file__).with_name("round8-subset.py")
)
previous = importlib.util.module_from_spec(spec)
spec.loader.exec_module(previous)
reference = previous.reference
np, faiss = previous.np, previous.faiss
common = previous.previous


def validate_allowed(ids, count):
    if ids.ndim != 1 or ids.dtype != np.int64 or not ids.flags.c_contiguous:
        raise ValueError("invalid_id_array")
    if len(ids) and (ids[0] < 0 or ids[-1] >= count or np.any(np.diff(ids) <= 0)):
        raise ValueError("invalid_subset")


def subset_scores(index, query, ids):
    validate_allowed(ids, index.ntotal)
    if (
        query.shape != (1, index.d)
        or query.dtype != np.float32
        or not query.flags.c_contiguous
        or not np.isfinite(query).all()
    ):
        raise ValueError("invalid_query_array")
    scores = np.empty(len(ids), dtype=np.float32)
    if len(ids):
        index.compute_distance_subset(
            1,
            faiss.swig_ptr(query),
            len(ids),
            faiss.swig_ptr(scores),
            faiss.swig_ptr(ids),
        )
    return scores


def select_scores(ids, scores, budget):
    if budget <= 0 or scores.shape != ids.shape or not np.isfinite(scores).all():
        raise ValueError("invalid_scores_or_budget")
    return ids[np.lexsort((ids, -scores))[:budget]]


def sqlite_vectors(db, ids, dimension):
    vectors = np.empty((len(ids), dimension), dtype=np.float32)
    for offset in range(0, len(ids), 512):
        chunk = ids[offset : offset + 512]
        placeholders = ",".join("?" for _ in chunk)
        rows = list(
            db.execute(
                f"SELECT id,vector FROM vectors WHERE id IN ({placeholders}) ORDER BY id",
                [int(i) + 1 for i in chunk],
            )
        )
        if [r[0] - 1 for r in rows] != chunk.tolist() or any(
            len(r[1]) != dimension * 4 for r in rows
        ):
            raise ValueError("missing_row_or_blob_dimension")
        block = np.stack([np.frombuffer(r[1], dtype="<f4") for r in rows])
        if not np.isfinite(block).all() or np.any(np.sum(block * block, axis=1) <= 0):
            raise ValueError("invalid_vector")
        faiss.normalize_L2(block)
        vectors[offset : offset + len(chunk)] = block
    return vectors


def open_database(root):
    loc = json.loads((root / "locations-private.json").read_text())
    db = sqlite3.connect(
        Path(loc["databases"]["2000"]).resolve().as_uri() + "?mode=ro", uri=True
    )
    db.execute("PRAGMA query_only=ON")
    db.execute("BEGIN")
    return db, loc


def export_flat(args):
    root, target = Path(args.previous), Path(args.export_flat)
    if target.exists() or Path(args.output).exists():
        raise ValueError("output_not_fresh")
    faiss.omp_set_num_threads(1)
    started = time.perf_counter()
    graph = faiss.read_index(str(root / "pressure-owned" / "index.faiss"))
    loaded = time.perf_counter()
    storage = faiss.downcast_index(graph.storage)
    faiss.write_index(storage, str(target))
    saved = time.perf_counter()
    flat = faiss.read_index(str(target))
    reloaded = time.perf_counter()
    if (
        flat.ntotal != 248806
        or flat.d != 1024
        or flat.metric_type != faiss.METRIC_INNER_PRODUCT
    ):
        raise ValueError("flat_identity_mismatch")
    db, _ = open_database(root)
    coordinates = 0
    for offset in range(0, flat.ntotal, 512):
        ids = np.arange(offset, min(offset + 512, flat.ntotal), dtype=np.int64)
        vectors = flat.reconstruct_batch(ids)
        for original in [graph.reconstruct_batch(ids), sqlite_vectors(db, ids, flat.d)]:
            if not np.array_equal(vectors.view(np.uint32), original.view(np.uint32)):
                raise ValueError("flat_coordinate_mismatch")
        coordinates += vectors.size
    done = time.perf_counter()
    result = {
        "graph_load_ms": (loaded - started) * 1000,
        "export_ms": (saved - loaded) * 1000,
        "flat_reload_ms": (reloaded - saved) * 1000,
        "coordinate_check_ms": (done - reloaded) * 1000,
        "flat_bytes": target.stat().st_size,
        "vector_payload_bytes": flat.ntotal * flat.d * 4,
        "coordinates_checked_per_comparison": coordinates,
        "comparisons": ["original_graph", "sqlite_normalized"],
        "final_memory": reference.observation(),
    }
    with Path(args.output).open("x") as f:
        json.dump(result, f, indent=2)
    db.rollback()
    db.close()
    print(
        json.dumps(
            {"phase": "export_checked", "coordinates_per_comparison": coordinates}
        ),
        flush=True,
    )


def execute(
    db, resident, dimension, query, raw_query, meta, filters, route, capture=False
):
    memories = []

    def observe(phase):
        if capture:
            memories.append({"phase": phase, **reference.observation()})

    observe("before_request")
    started = time.perf_counter()
    allowed = common.fast_eligible(db, filters, meta)
    prepared = time.perf_counter()
    validate_allowed(allowed, len(meta))
    vectors, local, scores, flat_distances, local_ids = None, None, None, None, None
    if route == "sqlite_flat":
        vectors = sqlite_vectors(db, allowed, dimension)
    elif route == "resident_copy":
        vectors = resident.reconstruct_batch(allowed)
    elif route != "resident_subset":
        raise ValueError("unknown_route")
    observe("materialized")
    materialized = time.perf_counter()
    explicit_vector_bytes = 0
    if vectors is not None:
        local = faiss.IndexFlatIP(dimension)
        local.add(vectors)
        explicit_vector_bytes = vectors.nbytes + local.ntotal * local.d * 4
        observe("temporary_index_added")
        del vectors
    indexed = time.perf_counter()
    if not len(allowed):
        candidates = np.array([], dtype=np.int64)
    elif route == "resident_subset":
        scores = subset_scores(resident, query, allowed)
        candidates = select_scores(allowed, scores, 6400)
    else:
        flat_distances, local_ids = local.search(query, min(6400, len(allowed)))
        candidates = previous.map_ids(local_ids[0], allowed)
    observe("candidates_ready")
    searched = time.perf_counter()
    if (
        len(candidates) != min(6400, len(allowed))
        or len(np.unique(candidates)) != len(candidates)
        or not np.isin(candidates, allowed).all()
    ):
        raise ValueError("candidate_count_or_scope")
    pool = common.rescore(db, candidates, raw_query)
    rescored = time.perf_counter()
    top = common.winners(pool, meta[:, 1], 100)
    aggregated = time.perf_counter()
    observe("result_ready")
    del local, scores, candidates, flat_distances, local_ids
    cleaned = time.perf_counter()
    observe("candidate_temporaries_released")
    return (
        pool,
        top,
        allowed,
        {
            "prepare_ms": (prepared - started) * 1000,
            "materialize_ms": (materialized - prepared) * 1000,
            "temporary_index_ms": (indexed - materialized) * 1000,
            "search_ms": (searched - indexed) * 1000,
            "rescore_ms": (rescored - searched) * 1000,
            "aggregate_ms": (aggregated - rescored) * 1000,
            "cleanup_ms": (cleaned - aggregated) * 1000,
            "total_ms": (cleaned - started) * 1000,
            "explicit_temporary_vector_bytes": explicit_vector_bytes,
            "subset_score_bytes": len(allowed) * 4 if route == "resident_subset" else 0,
            "memories": memories,
        },
    )


def run(args):
    root = Path(args.previous)
    if Path(args.output).exists():
        raise ValueError("output_not_fresh")
    faiss.omp_set_num_threads(1)
    resident = None
    started = time.perf_counter()
    if args.route != "sqlite_flat":
        resident = faiss.read_index(args.flat_file)
        if (
            resident.ntotal != 248806
            or resident.d != 1024
            or resident.metric_type != faiss.METRIC_INNER_PRODUCT
        ):
            raise ValueError("resident_identity_mismatch")
    loaded = time.perf_counter()
    db, loc = open_database(root)
    meta = common.metadata(db, 248806)
    ready = time.perf_counter()
    queries = np.fromfile(loc["queries"], dtype="<f4").reshape(12, 1024)
    normalized = queries.copy()
    faiss.normalize_L2(normalized)
    oracle = np.fromfile(root / "pressure" / "distances.f32", dtype="<f4").reshape(
        12, 248806
    )
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
        "format": "issue89-round9-v1",
        "baseline": "84b3028dba8f5f3b8437f3aa237bf0fec2e68820",
        "route": args.route,
        "rows": len(meta),
        "dimension": 1024,
        "budget": 6400,
        "queries": 12,
        "faiss_version": faiss.__version__,
        "sqlite_version": sqlite3.sqlite_version,
        "threads": faiss.omp_get_max_threads(),
        "resident_flat_load_ms": (loaded - started) * 1000,
        "metadata_and_connection_ms": (ready - loaded) * 1000,
        "metadata_bytes": meta.nbytes,
        "resident_vector_payload_bytes": resident.ntotal * resident.d * 4
        if resident is not None
        else 0,
        "post_load_memory": reference.observation(),
        "cases": [],
        "formal_distance_bits_checked": 0,
    }
    for scope, filters in scopes:
        allowed = common.fast_eligible(db, filters, meta)
        if not np.array_equal(
            allowed, reference.eligible(db, filters, len(meta))
        ) or not np.array_equal(
            allowed, common.indexed_eligible(db, filters, len(meta))
        ):
            raise ValueError("scope_identity_mismatch")
        common_count = len(np.unique(meta[allowed, 1]))
        execute(
            db, resident, 1024, normalized[:1], queries[0], meta, filters, args.route
        )
        records, cache = [], {}
        for repeat in range(3):
            for qi in np.roll(np.arange(12), repeat):
                pool, top, current, timing = execute(
                    db,
                    resident,
                    1024,
                    normalized[qi : qi + 1],
                    queries[qi],
                    meta,
                    filters,
                    args.route,
                )
                ids = np.array(list(pool), dtype=np.int64)
                scores = np.array(list(pool.values()), dtype=np.float32)
                if not np.array_equal(current, allowed) or not np.array_equal(
                    scores.view(np.uint32), oracle[qi, ids].view(np.uint32)
                ):
                    raise ValueError("scope_or_distance_bits_mismatch")
                result["formal_distance_bits_checked"] += len(ids)
                if int(qi) not in cache:
                    if not np.array_equal(
                        top, reference.document_best(ids, oracle[qi], meta[:, 1])[:100]
                    ):
                        raise ValueError("winner_identity_mismatch")
                    quality = {
                        str(k): reference.metrics(
                            ids, current, oracle[qi], meta[:, 1], k
                        )
                        for k in [25, 100]
                    }
                    cache[int(qi)] = (ids, top, quality)
                else:
                    old_ids, old_top, quality = cache[int(qi)]
                    if not np.array_equal(ids, old_ids) or not np.array_equal(
                        top, old_top
                    ):
                        raise ValueError("repeat_identity_changed")
                del timing["memories"]
                records.append(
                    {"query": int(qi), "repeat": repeat, **timing, "quality": quality}
                )
        result["cases"].append(
            {
                "scope": scope,
                "eligible": len(allowed),
                "objects": common_count,
                "records": records,
            }
        )
        print(
            json.dumps(
                {
                    "phase": "scope_complete",
                    "route": args.route,
                    "scope": scope,
                    "eligible": len(allowed),
                }
            ),
            flush=True,
        )
    # Probes follow all formal scopes, so they cannot warm a later formal timing.
    for case, (_, filters) in zip(result["cases"], scopes, strict=True):
        gc.collect()
        probe_start = time.perf_counter()
        pool, top, current, probe = execute(
            db,
            resident,
            1024,
            normalized[:1],
            queries[0],
            meta,
            filters,
            args.route,
            capture=True,
        )
        probe["wall_ms_with_observations"] = (time.perf_counter() - probe_start) * 1000
        case["memory_probe"] = probe
    result["final_memory"] = reference.observation()
    with Path(args.output).open("x") as f:
        json.dump(result, f, indent=2)
    db.rollback()
    db.close()
    print(
        json.dumps(
            {
                "phase": "complete",
                "route": args.route,
                "bits_checked": result["formal_distance_bits_checked"],
            }
        ),
        flush=True,
    )


def self_check():
    previous.self_check()
    faiss.omp_set_num_threads(1)
    vectors = np.array([[1, 0], [0, 1], [1, 0], [-1, 0]], dtype=np.float32)
    index = faiss.IndexFlatIP(2)
    index.add(vectors)
    ids = np.array([0, 2, 3], dtype=np.int64)
    scores = subset_scores(index, vectors[:1], ids)
    assert np.array_equal(scores, [1, 1, -1])
    assert np.array_equal(select_scores(ids, scores, 1), [0])
    assert len(subset_scores(index, vectors[:1], np.array([], dtype=np.int64))) == 0
    assert np.array_equal(select_scores(np.array([3]), np.array([-1.0]), 6400), [3])
    for bad in [
        np.array([-1]),
        np.array([4]),
        np.array([0, 0]),
        np.arange(4, dtype=np.int64)[::2],
    ]:
        try:
            subset_scores(index, vectors[:1], bad)
        except ValueError:
            pass
        else:
            raise AssertionError("invalid_subset_accepted")
    for invalid, budget in [(np.array([np.nan]), 1), (np.array([1.0]), 0)]:
        try:
            select_scores(np.array([0]), invalid, budget)
        except ValueError:
            pass
        else:
            raise AssertionError("invalid_selection_accepted")
    db = sqlite3.connect(":memory:")
    db.execute("CREATE TABLE vectors(id INTEGER PRIMARY KEY,vector BLOB)")
    db.executemany(
        "INSERT INTO vectors VALUES (?,?)",
        [(i + 1, row.tobytes()) for i, row in enumerate(vectors)],
    )
    loaded = sqlite_vectors(db, ids, 2)
    assert np.array_equal(loaded, vectors[ids])
    for labels, dim in [(np.array([4]), 2), (ids, 3)]:
        try:
            sqlite_vectors(db, labels, dim)
        except ValueError:
            pass
        else:
            raise AssertionError("invalid_blob_or_missing_row_accepted")
    db.execute(
        "INSERT INTO vectors VALUES (?,?)", (5, np.zeros(2, dtype=np.float32).tobytes())
    )
    try:
        sqlite_vectors(db, np.array([4]), 2)
    except ValueError:
        pass
    else:
        raise AssertionError("zero_vector_accepted")
    meta = np.zeros((4, 6), dtype=np.int64)
    meta[:, 0] = np.arange(1, 5)
    meta[:, 1] = np.arange(4)
    for route in ["sqlite_flat", "resident_copy", "resident_subset"]:
        pool, top, allowed, timing = execute(
            db, index, 2, vectors[:1], vectors[0], meta, {"items": []}, route
        )
        assert len(pool) == len(top) == len(allowed) == 0
        pool, top, allowed, timing = execute(
            db, index, 2, vectors[:1], vectors[0], meta, {}, route
        )
        assert set(pool) == set(range(4)) and top[0] == 0
    print("round9 direct scores, stable tie and SQLite boundaries passed", flush=True)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--self-test", action="store_true")
    parser.add_argument("--previous")
    parser.add_argument("--export-flat")
    parser.add_argument("--flat-file")
    parser.add_argument(
        "--route", choices=["sqlite_flat", "resident_copy", "resident_subset"]
    )
    parser.add_argument("--output")
    args = parser.parse_args()
    if args.self_test:
        self_check()
    elif args.export_flat:
        export_flat(args)
    else:
        run(args)
