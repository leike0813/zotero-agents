"""Frozen-snapshot experiment. No production index or lifecycle implementation."""

import argparse
import importlib.util
import json
import sqlite3
import time
from pathlib import Path

spec = importlib.util.spec_from_file_location(
    "round6", Path(__file__).with_name("round6-ann.py")
)
reference = importlib.util.module_from_spec(spec)
spec.loader.exec_module(reference)
np, faiss = reference.np, reference.faiss


META_COLUMNS = ("id", "document_id", "library_id", "kind", "item_type", "section")
SCALARS = {
    "libraries": "library_id",
    "kinds": "kind",
    "types": "item_type",
    "sections": "section",
}
MEMBERS = {"items": "row_items", "tags": "row_tags", "collections": "row_collections"}


def metadata(db, count):
    data = np.asarray(
        db.execute(
            f"SELECT {','.join(META_COLUMNS)} FROM vectors WHERE id<=? ORDER BY id",
            (count,),
        ).fetchall(),
        dtype=np.int64,
    )
    if data.shape != (count, len(META_COLUMNS)) or not np.array_equal(
        data[:, 0], np.arange(1, count + 1)
    ):
        raise ValueError("metadata_shape_or_identity")
    return data


def indexed_eligible(db, filters, count):
    clauses, args = ["v.id<=?"], [count]
    for key, values in filters.items():
        if key not in SCALARS and key not in MEMBERS:
            raise ValueError("unknown_filter")
        if not values:
            clauses.append("0")
            continue
        placeholders = ",".join("?" for _ in values)
        if key in SCALARS:
            clauses.append(f"v.{SCALARS[key]} IN ({placeholders})")
        else:
            clauses.append(
                f"v.id IN (SELECT row_id FROM {MEMBERS[key]} WHERE row_id<=? AND value IN ({placeholders}))"
            )
            args.append(count)
        args.extend(values)
    return np.fromiter(
        (
            r[0] - 1
            for r in db.execute(
                f"SELECT v.id FROM vectors v WHERE {' AND '.join(clauses)} ORDER BY v.id",
                args,
            )
        ),
        dtype=np.int64,
    )


def fast_eligible(db, filters, meta):
    mask = np.ones(len(meta), dtype=bool)
    for key, values in filters.items():
        if key not in SCALARS and key not in MEMBERS:
            raise ValueError("unknown_filter")
        if not values:
            return np.array([], dtype=np.int64)
        if key in SCALARS:
            mask &= np.isin(meta[:, META_COLUMNS.index(SCALARS[key])], values)
        else:
            placeholders = ",".join("?" for _ in values)
            ids = np.fromiter(
                (
                    r[0] - 1
                    for r in db.execute(
                        f"SELECT row_id FROM {MEMBERS[key]} WHERE row_id<=? AND value IN ({placeholders})",
                        (len(meta), *values),
                    )
                ),
                dtype=np.int64,
            )
            membership = np.zeros(len(meta), dtype=bool)
            membership[ids] = True
            mask &= membership
    return np.flatnonzero(mask)


def bitmap_search(index, query, allowed, size, budget, ef):
    if not len(allowed):
        return np.array([], dtype=np.int64)
    mask = np.zeros(size, dtype=bool)
    mask[allowed] = True
    bitmap = np.packbits(mask, bitorder="little")
    selector = faiss.IDSelectorBitmap(len(bitmap), faiss.swig_ptr(bitmap))
    params = faiss.SearchParametersHNSW(efSearch=max(ef, budget), sel=selector)
    _, ids = index.search(query, min(budget, len(allowed)), params=params)
    return ids[0][ids[0] >= 0]


def stopping(mode, current, previous, target):
    if len(current) < target:
        return None
    if mode == "count":
        return "count"
    if (
        mode == "stable"
        and previous is not None
        and len(previous) >= 2
        and all(np.array_equal(current, p) for p in previous[-2:])
    ):
        return "stable"
    return None


def should_exact(rows, objects, k):
    return rows <= 4096 or (objects <= k and rows <= 16384)


def rescore(db, ids, query):
    """No oracle input: stopping uses only scores actually computed here."""
    ids = np.sort(ids)
    out = {}
    for offset in range(0, len(ids), 128):
        chunk = ids[offset : offset + 128]
        placeholders = ",".join("?" for _ in chunk)
        rows = list(
            db.execute(
                f"SELECT id,vector FROM vectors WHERE id IN ({placeholders}) ORDER BY id",
                [int(i) + 1 for i in chunk],
            )
        )
        if [r[0] - 1 for r in rows] != chunk.tolist():
            raise ValueError("candidate_row_missing")
        vectors = np.stack([np.frombuffer(r[1], dtype="<f4") for r in rows])
        scores = reference.reference_distances(vectors, query)
        out.update(zip((r[0] - 1 for r in rows), scores, strict=True))
    return out


def winners(pool, docs, k):
    ids = np.array(list(pool), dtype=np.int64)
    scores = np.array(list(pool.values()), dtype=np.float32)
    order = np.lexsort((ids, scores))
    _, positions = np.unique(docs[ids[order]], return_index=True)
    return ids[order[np.sort(positions)]][:k]


def execute(db, index, queries, normalized, qi, allowed, docs, k, mode):
    pool, history, trace = {}, [], []
    target = min(k, len(np.unique(docs[allowed])))
    if mode == "exact":
        pool = rescore(db, allowed, queries[qi])
        winners(pool, docs, k)
        return pool, {
            "reason": "exact",
            "rounds": 0,
            "final_budget": len(allowed),
            "trace": [],
        }
    # ponytail: four bounded rounds; stability is a heuristic, not a completeness proof.
    budgets = [1600] if mode == "fixed" else [400, 1600, 6400, 16384]
    if mode == "diverse":
        budgets = [400] * 4
    remaining = allowed
    reason = "cap"
    for budget in budgets:
        if not len(remaining):
            reason = "exhausted"
            break
        ef = 1600 if mode in ["fixed", "diverse"] else max(256, budget)
        got = bitmap_search(
            index, normalized[qi : qi + 1], remaining, len(docs), budget, ef
        )
        if not np.isin(got, remaining).all():
            raise ValueError("out_of_scope")
        added = np.array([int(i) for i in got if int(i) not in pool], dtype=np.int64)
        pool.update(rescore(db, added, queries[qi]))
        top = winners(pool, docs, k)
        trace.append(
            {
                "budget": budget,
                "ef": max(ef, budget),
                "returned": len(got),
                "added": len(added),
                "pool": len(pool),
                "objects": len(np.unique(docs[list(pool)])),
                "top_count": len(top),
            }
        )
        candidate_stop = stopping(
            "stable" if mode == "diverse" else mode, top, history, target
        )
        if candidate_stop:
            reason = candidate_stop
            break
        history.append(top)
        if mode == "diverse":
            remaining = allowed[~np.isin(docs[allowed], docs[list(pool)])]
        elif budget >= len(allowed):
            reason = "eligible_budget"
            break
    return pool, {
        "reason": reason,
        "rounds": len(trace),
        "final_budget": trace[-1]["budget"] if trace else 0,
        "trace": trace,
    }


def run(args):
    faiss.omp_set_num_threads(1)
    root = Path(args.previous)
    name = args.corpus
    count = {"real": 12646, "pressure": 248806}[name]
    loc = json.loads((root / "locations-private.json").read_text())
    db = sqlite3.connect(
        Path(loc["databases"]["2000"]).resolve().as_uri() + "?mode=ro", uri=True
    )
    db.execute("PRAGMA query_only=ON")
    db.execute("BEGIN")
    started = time.perf_counter()
    index = faiss.read_index(str(root / (name + "-owned") / "index.faiss"))
    load_ms = (time.perf_counter() - started) * 1000
    started = time.perf_counter()
    meta = metadata(db, count)
    metadata_ms = (time.perf_counter() - started) * 1000
    docs = meta[:, 1]
    queries = np.fromfile(loc["queries"], dtype="<f4").reshape(-1, index.d)
    normalized = queries.copy()
    faiss.normalize_L2(normalized)
    oracle = np.fromfile(root / name / "distances.f32", dtype="<f4").reshape(
        len(queries), count
    )
    tag = db.execute(
        "SELECT value FROM row_tags WHERE row_id<=? GROUP BY value ORDER BY count(*),value LIMIT 1",
        (count,),
    ).fetchone()[0]
    item = db.execute(
        "SELECT value FROM row_items WHERE row_id<=? ORDER BY value LIMIT 1", (count,)
    ).fetchone()[0]
    section = db.execute(
        "SELECT section FROM vectors WHERE kind=3 AND id<=? ORDER BY id LIMIT 1",
        (count,),
    ).fetchone()[0]
    anchor = db.execute(
        "SELECT v.library_id,v.item_type,t.value,c.value FROM vectors v JOIN row_tags t ON t.row_id=v.id JOIN row_collections c ON c.row_id=v.id WHERE v.kind=1 ORDER BY v.id,t.value,c.value LIMIT 1"
    ).fetchone()
    scopes = [
        ("all", {}),
        ("fulltext", {"kinds": [1]}),
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
        ("item_refs", {"items": [item]}),
        ("tag", {"tags": [tag]}),
        ("topics", {"kinds": [3]}),
        ("topic_section", {"kinds": [3], "sections": [section]}),
        ("empty", {"items": []}),
    ]
    result = {
        "format": "issue89-round7-v1",
        "corpus": name,
        "rows": count,
        "dimension": index.d,
        "queries": len(queries),
        "faiss_version": faiss.__version__,
        "load_index_ms": load_ms,
        "metadata_ms": metadata_ms,
        "metadata_bytes": meta.nbytes,
        "post_load_memory": reference.observation(),
        "scope_profiles": [],
        "selector_pairs": [],
        "cases": [],
        "formal_distance_bits_checked": 0,
    }
    for scope, filters in scopes:
        expected = reference.eligible(db, filters, count)
        for fn in [indexed_eligible, fast_eligible]:
            actual = fn(db, filters, count if fn is indexed_eligible else meta)
            if not np.array_equal(actual, expected):
                raise ValueError("scope_identity_mismatch")
        samples = []
        for repeat in range(3):
            routes = [
                ("original", lambda: reference.eligible(db, filters, count)),
                ("indexed", lambda: indexed_eligible(db, filters, count)),
                ("projection", lambda: fast_eligible(db, filters, meta)),
            ]
            if repeat % 2:
                routes.reverse()
            for route, fn in routes:
                started = time.perf_counter()
                actual = fn()
                duration = (time.perf_counter() - started) * 1000
                if not np.array_equal(actual, expected):
                    raise ValueError("scope_identity_mismatch")
                samples.append({"route": route, "repeat": repeat, "ms": duration})
        result["scope_profiles"].append(
            {
                "scope": scope,
                "eligible": len(expected),
                "objects": len(np.unique(docs[expected])),
                "samples": samples,
            }
        )
        if scope in ["all", "intersection"]:
            for repeat in range(3):
                for qi in np.roll(np.arange(len(queries)), repeat):
                    methods = [
                        (
                            "batch",
                            lambda: reference.search(
                                index, normalized[qi : qi + 1], expected, 1600, 1600
                            ),
                        ),
                        (
                            "bitmap",
                            lambda: bitmap_search(
                                index,
                                normalized[qi : qi + 1],
                                expected,
                                count,
                                1600,
                                1600,
                            ),
                        ),
                    ]
                    if (repeat + int(qi)) % 2:
                        methods.reverse()
                    times, ids = {}, {}
                    for route, fn in methods:
                        started = time.perf_counter()
                        ids[route] = fn()
                        times[route] = (time.perf_counter() - started) * 1000
                    if not np.array_equal(ids["batch"], ids["bitmap"]):
                        raise ValueError("selector_identity_mismatch")
                    result["selector_pairs"].append(
                        {"scope": scope, "query": int(qi), "repeat": repeat, **times}
                    )
        for k in [25, 100]:
            exact = should_exact(len(expected), len(np.unique(docs[expected])), k)
            modes = ["exact"] if exact else ["fixed", "count", "stable", "diverse"]
            for mode in modes:
                records = []
                quality_by_query = {}
                # Warm once; all formal timings independently prepare eligible IDs.
                execute(db, index, queries, normalized, 0, expected, docs, k, mode)
                for repeat in range(3):
                    for qi in np.roll(np.arange(len(queries)), repeat):
                        started = time.perf_counter()
                        allowed = fast_eligible(db, filters, meta)
                        prepared = time.perf_counter()
                        pool, decision = execute(
                            db,
                            index,
                            queries,
                            normalized,
                            int(qi),
                            allowed,
                            docs,
                            k,
                            mode,
                        )
                        done = time.perf_counter()
                        candidates = np.array(list(pool), dtype=np.int64)
                        actual = np.array(list(pool.values()), dtype=np.float32)
                        if not np.array_equal(
                            actual.view(np.uint32),
                            oracle[qi, candidates].view(np.uint32),
                        ):
                            raise ValueError("distance_bits_mismatch")
                        result["formal_distance_bits_checked"] += len(candidates)
                        cached = quality_by_query.get(int(qi))
                        if cached is not None and np.array_equal(
                            np.sort(candidates), cached[0]
                        ):
                            metric = cached[1]
                        else:
                            metric = reference.metrics(
                                candidates, allowed, oracle[qi], docs, k
                            )
                            quality_by_query[int(qi)] = (np.sort(candidates), metric)
                        if not np.array_equal(
                            winners(pool, docs, k),
                            reference.document_best(candidates, oracle[qi], docs)[:k],
                        ):
                            raise ValueError("winner_identity_mismatch")
                        if (
                            mode == "exact"
                            and metric["document_recall"] is not None
                            and (
                                metric["document_recall"] != 1
                                or metric["best_fragment_coverage"] != 1
                            )
                        ):
                            raise ValueError("exact_incomplete")
                        records.append(
                            {
                                "query": int(qi),
                                "repeat": repeat,
                                "prepare_ms": (prepared - started) * 1000,
                                "query_ms": (done - prepared) * 1000,
                                "total_ms": (done - started) * 1000,
                                **decision,
                                **metric,
                            }
                        )
                result["cases"].append(
                    {"scope": scope, "k": k, "mode": mode, "records": records}
                )
        print(
            json.dumps(
                {
                    "phase": "scope_complete",
                    "corpus": name,
                    "scope": scope,
                    "eligible": len(expected),
                }
            ),
            flush=True,
        )
    result["final_memory"] = reference.observation()
    with Path(args.output).open("x") as f:
        json.dump(result, f, indent=2)
    print(
        json.dumps(
            {
                "phase": "complete",
                "corpus": name,
                "cases": len(result["cases"]),
                "bits_checked": result["formal_distance_bits_checked"],
            }
        ),
        flush=True,
    )


def self_check():
    reference.self_check()
    db = sqlite3.connect(":memory:")
    db.executescript(
        "CREATE TABLE vectors(id INTEGER PRIMARY KEY,document_id,library_id,kind,item_type,section,vector BLOB);CREATE TABLE row_items(row_id,value);CREATE INDEX items_value_row ON row_items(value,row_id);CREATE TABLE row_tags(row_id,value);CREATE INDEX tags_value_row ON row_tags(value,row_id);CREATE TABLE row_collections(row_id,value);CREATE INDEX collections_value_row ON row_collections(value,row_id);INSERT INTO vectors(id,document_id,library_id,kind,item_type,section) VALUES(1,0,1,1,31,0),(2,1,2,2,31,0),(3,2,1,3,0,7);INSERT INTO row_tags VALUES(1,7),(1,8),(2,8);INSERT INTO row_collections VALUES(1,3),(2,4);INSERT INTO row_items VALUES(1,0),(2,1);"
    )
    meta = metadata(db, 3)
    for filters in [
        {},
        {"libraries": [1, 2], "tags": [7, 8], "collections": [3]},
        {"items": []},
        {"kinds": []},
        {"libraries": [1], "kinds": [3], "sections": [7]},
        {"tags": [8], "collections": [4]},
        {"libraries": [-1]},
    ]:
        expected = reference.eligible(db, filters, 3)
        assert np.array_equal(indexed_eligible(db, filters, 3), expected)
        assert np.array_equal(fast_eligible(db, filters, meta), expected)
    vectors = np.eye(13, dtype=np.float32)
    index = faiss.IndexHNSWFlat(13, 8, faiss.METRIC_INNER_PRODUCT)
    index.add(vectors)
    allowed = np.array([0, 8, 12], dtype=np.int64)
    assert np.array_equal(
        np.sort(bitmap_search(index, vectors[:1], allowed, 13, 13, 100)), allowed
    )
    assert (
        bitmap_search(
            index, vectors[:1], np.array([], dtype=np.int64), 13, 13, 100
        ).size
        == 0
    )
    assert stopping("count", np.array([0, 1]), None, 2) == "count"
    assert stopping("stable", np.array([0, 1]), None, 2) is None
    assert stopping("stable", np.array([0, 1]), [np.array([0, 1])], 2) is None
    assert (
        stopping("stable", np.array([0, 1]), [np.array([0, 1]), np.array([0, 1])], 2)
        == "stable"
    )
    assert should_exact(4096, 200, 25)
    assert should_exact(12646, 90, 100)
    assert not should_exact(200000, 1, 100)
    distances = np.array([0.3, 0.4, 0.1, 0.2], dtype=np.float32)
    result = reference.metrics(
        np.array([0, 1]), np.arange(4), distances, np.arange(4), 2
    )
    assert (
        result["document_recall"] == 0
    )  # Both count and stability can stop before unseen winners.
    evidence = reference.metrics(
        np.array([0, 2]),
        np.arange(3),
        np.array([0.4, 0.1, 0.2], dtype=np.float32),
        np.array([0, 0, 1]),
        2,
    )
    assert evidence["document_recall"] == 1
    assert evidence["best_fragment_coverage"] == 0.5
    print("round7 scope, bitmap and stopping counterexample checks passed", flush=True)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--self-test", action="store_true")
    parser.add_argument("--previous")
    parser.add_argument("--corpus", choices=["real", "pressure"])
    parser.add_argument("--output")
    args = parser.parse_args()
    if args.self_test:
        self_check()
    else:
        run(args)
