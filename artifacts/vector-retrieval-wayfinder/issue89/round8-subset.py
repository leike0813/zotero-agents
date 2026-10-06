"""Frozen subset-search experiment; no production caching or lifecycle."""

import argparse
import gc
import importlib.util
import json
import sqlite3
import time
from pathlib import Path

spec = importlib.util.spec_from_file_location(
    "round7", Path(__file__).with_name("round7-adaptive.py")
)
previous = importlib.util.module_from_spec(spec)
spec.loader.exec_module(previous)
reference = previous.reference
np, faiss = previous.np, previous.faiss


def map_ids(ids, mapping):
    if np.any(mapping < 0) or np.any(np.diff(mapping) <= 0):
        raise ValueError("invalid_mapping")
    if np.any(ids < -1) or np.any(ids >= len(mapping)):
        raise ValueError("invalid_local_id")
    if len(np.unique(ids[ids >= 0])) != np.count_nonzero(ids >= 0):
        raise ValueError("duplicate_local_id")
    return mapping[ids[ids >= 0]]


def subset_search(index, query, mapping, budget, route):
    if not len(mapping):
        return np.array([], dtype=np.int64)
    count = min(budget, len(mapping))
    if route == "subset_hnsw":
        params = faiss.SearchParametersHNSW(efSearch=max(256, budget))
        _, ids = index.search(query, count, params=params)
    elif route == "subset_flat":
        _, ids = faiss.downcast_index(index.storage).search(query, count)
    else:
        raise ValueError("unknown_route")
    return map_ids(ids[0], mapping)


def build_subset(db, global_index, allowed, folder):
    folder.mkdir()
    started = time.perf_counter()
    vectors = np.empty((len(allowed), global_index.d), dtype=np.float32)
    for offset in range(0, len(allowed), 512):
        chunk = allowed[offset : offset + 512]
        placeholders = ",".join("?" for _ in chunk)
        rows = list(
            db.execute(
                f"SELECT id,vector FROM vectors WHERE id IN ({placeholders}) ORDER BY id",
                [int(i) + 1 for i in chunk],
            )
        )
        if [r[0] - 1 for r in rows] != chunk.tolist():
            raise ValueError("subset_row_missing")
        vectors[offset : offset + len(chunk)] = np.stack(
            [np.frombuffer(r[1], dtype="<f4") for r in rows]
        )
    loaded = time.perf_counter()
    if not np.isfinite(vectors).all() or np.any(np.sum(vectors * vectors, axis=1) <= 0):
        raise ValueError("invalid_subset_vector")
    faiss.normalize_L2(vectors)
    normalized = time.perf_counter()
    # Same stored coordinates: changing topology, not representation.
    for offset in range(0, len(allowed), 512):
        chunk = allowed[offset : offset + 512]
        original = global_index.reconstruct_batch(chunk)
        if not np.array_equal(
            vectors[offset : offset + len(chunk)].view(np.uint32),
            original.view(np.uint32),
        ):
            raise ValueError("normalized_coordinate_mismatch")
    checked = time.perf_counter()
    index = faiss.IndexHNSWFlat(global_index.d, 16, faiss.METRIC_INNER_PRODUCT)
    index.hnsw.efConstruction = 100
    index.hnsw.rng = faiss.RandomGenerator(89)
    index.add(vectors)
    if (
        index.ntotal != len(allowed)
        or index.hnsw.nb_neighbors(0) != 32
        or index.hnsw.efConstruction != 100
    ):
        raise ValueError("subset_configuration_mismatch")
    built = time.perf_counter()
    faiss.write_index(index, str(folder / "index.faiss"))
    np.save(folder / "mapping.npy", allowed)
    saved = time.perf_counter()
    info = {
        "load_vectors_ms": (loaded - started) * 1000,
        "validate_normalize_ms": (normalized - loaded) * 1000,
        "coordinate_check_ms": (checked - normalized) * 1000,
        "build_ms": (built - checked) * 1000,
        "save_ms": (saved - built) * 1000,
        "build_work_ms": (
            (loaded - started) + (normalized - loaded) + (built - checked)
        )
        * 1000,
        "measured_setup_ms": (saved - started) * 1000,
        "index_bytes": (folder / "index.faiss").stat().st_size,
        "mapping_array_bytes": allowed.nbytes,
        "mapping_file_bytes": (folder / "mapping.npy").stat().st_size,
        "normalized_coordinates_checked": int(vectors.size),
        "post_build_memory": reference.observation(),
    }
    del vectors
    gc.collect()
    info["post_release_memory"] = reference.observation()
    return index, info


def run(args):
    faiss.omp_set_num_threads(1)
    root, output = Path(args.previous), Path(args.output)
    if output.exists() or not output.parent.is_dir():
        raise ValueError("output_not_fresh")
    count = 248806
    loc = json.loads((root / "locations-private.json").read_text())
    db = sqlite3.connect(
        Path(loc["databases"]["2000"]).resolve().as_uri() + "?mode=ro", uri=True
    )
    db.execute("PRAGMA query_only=ON")
    db.execute("BEGIN")
    started = time.perf_counter()
    index = faiss.read_index(str(root / "pressure-owned" / "index.faiss"))
    index_loaded = time.perf_counter()
    meta = previous.metadata(db, count)
    loaded = time.perf_counter()
    queries = np.fromfile(loc["queries"], dtype="<f4").reshape(-1, index.d)
    normalized = queries.copy()
    faiss.normalize_L2(normalized)
    oracle = np.fromfile(root / "pressure" / "distances.f32", dtype="<f4").reshape(
        len(queries), count
    )
    if index.ntotal != count or index.d != 1024 or len(queries) != 12:
        raise ValueError("frozen_input_shape_mismatch")
    docs = meta[:, 1]
    anchor = db.execute(
        "SELECT v.library_id,v.item_type,t.value,c.value FROM vectors v JOIN row_tags t ON t.row_id=v.id JOIN row_collections c ON c.row_id=v.id WHERE v.kind=1 AND v.id<=? ORDER BY v.id,t.value,c.value LIMIT 1",
        (12646,),
    ).fetchone()
    scopes = [
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
        "format": "issue89-round8-v1",
        "baseline": "84b3028dba8f5f3b8437f3aa237bf0fec2e68820",
        "rows": count,
        "dimension": index.d,
        "queries": len(queries),
        "faiss_version": faiss.__version__,
        "sqlite_version": sqlite3.sqlite_version,
        "threads": 1,
        "M": 16,
        "efConstruction": 100,
        "seed": 89,
        "global_index_load_ms": (index_loaded - started) * 1000,
        "metadata_ms": (loaded - index_loaded) * 1000,
        "metadata_bytes": meta.nbytes,
        "post_load_memory": reference.observation(),
        "scopes": [],
        "cases": [],
        "formal_distance_bits_checked": 0,
    }
    routes = ["global_bitmap", "subset_hnsw", "subset_flat"]
    for scope, filters in scopes:
        allowed = previous.fast_eligible(db, filters, meta)
        if not np.array_equal(
            allowed, reference.eligible(db, filters, count)
        ) or not np.array_equal(allowed, previous.indexed_eligible(db, filters, count)):
            raise ValueError("scope_identity_mismatch")
        subset, setup = build_subset(db, index, allowed, output.parent / scope)
        started = time.perf_counter()
        reloaded = faiss.read_index(str(output.parent / scope / "index.faiss"))
        mapping = np.load(output.parent / scope / "mapping.npy")
        if not np.array_equal(mapping, allowed):
            raise ValueError("mapping_reload_mismatch")
        for qi in range(len(queries)):
            q = normalized[qi : qi + 1]
            if not np.array_equal(
                subset_search(subset, q, allowed, 400, "subset_hnsw"),
                subset_search(reloaded, q, mapping, 400, "subset_hnsw"),
            ):
                raise ValueError("index_reload_mismatch")
        setup["reload_and_identity_check_ms"] = (time.perf_counter() - started) * 1000
        setup["reload_queries_checked"] = len(queries)
        del reloaded, mapping
        gc.collect()
        result["scopes"].append(
            {
                "scope": scope,
                "eligible": len(allowed),
                "objects": len(np.unique(docs[allowed])),
                "setup": setup,
            }
        )
        print(
            json.dumps(
                {
                    "phase": "scope_built",
                    "scope": scope,
                    "rows": len(allowed),
                    "build_ms": setup["build_ms"],
                }
            ),
            flush=True,
        )
        for budget in [400, 1600, 6400, 16384]:
            records = {route: [] for route in routes}
            cache = {}
            for route in routes:
                # Warm the full actual fetch/recompute/aggregate path once.
                warm_ids = (
                    previous.bitmap_search(
                        index, normalized[:1], allowed, count, budget, max(256, budget)
                    )
                    if route == "global_bitmap"
                    else subset_search(subset, normalized[:1], allowed, budget, route)
                )
                previous.winners(previous.rescore(db, warm_ids, queries[0]), docs, 100)
            for repeat in range(3):
                for qi in np.roll(np.arange(len(queries)), repeat):
                    for ri in np.roll(np.arange(3), (repeat + int(qi)) % 3):
                        route = routes[int(ri)]
                        started = time.perf_counter()
                        current = previous.fast_eligible(db, filters, meta)
                        prepared = time.perf_counter()
                        if not np.array_equal(current, allowed):
                            raise ValueError("scope_changed")
                        q = normalized[qi : qi + 1]
                        candidates = (
                            previous.bitmap_search(
                                index, q, current, count, budget, max(256, budget)
                            )
                            if route == "global_bitmap"
                            else subset_search(subset, q, current, budget, route)
                        )
                        searched = time.perf_counter()
                        if not np.isin(candidates, current).all():
                            raise ValueError("out_of_scope")
                        pool = previous.rescore(db, candidates, queries[qi])
                        rescored = time.perf_counter()
                        top = previous.winners(pool, docs, 100)
                        done = time.perf_counter()
                        ids = np.array(list(pool), dtype=np.int64)
                        scores = np.array(list(pool.values()), dtype=np.float32)
                        if not np.array_equal(
                            scores.view(np.uint32), oracle[qi, ids].view(np.uint32)
                        ):
                            raise ValueError("distance_bits_mismatch")
                        result["formal_distance_bits_checked"] += len(ids)
                        key = (route, int(qi))
                        if key not in cache:
                            if not np.array_equal(
                                top,
                                reference.document_best(ids, oracle[qi], docs)[:100],
                            ):
                                raise ValueError("winner_identity_mismatch")
                            quality = {
                                str(k): reference.metrics(
                                    ids, current, oracle[qi], docs, k
                                )
                                for k in [25, 100]
                            }
                            cache[key] = (ids, quality, top)
                        else:
                            prior_ids, quality, prior_top = cache[key]
                            if not np.array_equal(ids, prior_ids) or not np.array_equal(
                                top, prior_top
                            ):
                                raise ValueError("repeat_identity_changed")
                        records[route].append(
                            {
                                "query": int(qi),
                                "repeat": repeat,
                                "prepare_ms": (prepared - started) * 1000,
                                "search_ms": (searched - prepared) * 1000,
                                "rescore_ms": (rescored - searched) * 1000,
                                "aggregate_ms": (done - rescored) * 1000,
                                "total_ms": (done - started) * 1000,
                                "quality": quality,
                            }
                        )
            result["cases"].extend(
                {
                    "scope": scope,
                    "budget": budget,
                    "efSearch": max(256, budget) if route != "subset_flat" else None,
                    "route": route,
                    "records": records[route],
                }
                for route in routes
            )
            print(
                json.dumps(
                    {"phase": "budget_complete", "scope": scope, "budget": budget}
                ),
                flush=True,
            )
        del subset
        gc.collect()
    result["final_memory"] = reference.observation()
    with output.open("x") as f:
        json.dump(result, f, indent=2)
    db.rollback()
    db.close()
    print(
        json.dumps(
            {
                "phase": "complete",
                "cases": len(result["cases"]),
                "bits_checked": result["formal_distance_bits_checked"],
            }
        ),
        flush=True,
    )


def self_check():
    previous.self_check()
    mapping = np.array([1, 4, 9], dtype=np.int64)
    assert np.array_equal(map_ids(np.array([2, -1, 0]), mapping), [9, 1])
    assert len(map_ids(np.array([-1, -1]), mapping)) == 0
    for ids, lookup in [
        ([3], mapping),
        ([-2], mapping),
        ([0, 0], mapping),
        ([0], np.array([1, 1])),
    ]:
        try:
            map_ids(np.array(ids), lookup)
        except ValueError:
            pass
        else:
            raise AssertionError("invalid_mapping_accepted")
    vectors = np.array([[1, 0], [0, 1], [-1, 0]], dtype=np.float32)
    index = faiss.IndexHNSWFlat(2, 16, faiss.METRIC_INNER_PRODUCT)
    index.add(vectors)
    for route in ["subset_hnsw", "subset_flat"]:
        candidates = subset_search(index, vectors[:1], mapping, 20, route)
        assert set(candidates) == set(mapping)
        assert (
            len(
                subset_search(
                    index, vectors[:1], np.array([], dtype=np.int64), 400, route
                )
            )
            == 0
        )
    single = faiss.IndexHNSWFlat(2, 16, faiss.METRIC_INNER_PRODUCT)
    single.add(vectors[:1])
    assert np.array_equal(
        subset_search(single, vectors[:1], np.array([9]), 400, "subset_hnsw"), [9]
    )
    print("round8 mapping and subset-search checks passed", flush=True)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--self-test", action="store_true")
    parser.add_argument("--previous")
    parser.add_argument("--output")
    args = parser.parse_args()
    if args.self_test:
        self_check()
    else:
        run(args)
