"""Isolated final-batch runner for the Rust candidate-scoring experiment (issue 91).

One frozen batch: per-scale disk/memory preflight, normalize build, replacement
build, backup copyfiles, oracle preparation, resource-watched subprocesses,
formal statistics, quality gates and a de-identified summary.

Usage:
  uv run --project="$HOME/.ar" --locked --no-sync -- python issue91-run.py \
      --binary /abs/issue91-final --root /abs/private/issue91-batch
  uv run --project="$HOME/.ar" --locked --no-sync -- python issue91-run.py --self-test

Exit codes: 0 verdict reached (full/limited/rejected), 2 batch stopped with
insufficient evidence, 1 refusal or preflight error.
"""

from __future__ import annotations

import argparse
import json
import os
import shutil
import signal
import statistics
import subprocess
import sys
import time
from pathlib import Path

GIB = 1024**3
KIB = 1024

DATA_ROOT = Path("/mnt/HotData/tmp/issue89-round3-qrbctjv3")
RECOVERY_ROOT = Path("/mnt/HotData/tmp/issue91-20261006T032556Z/rebuild")
SESSION_ROOT = RECOVERY_ROOT.parent
BUILD_ROOT = Path("/mnt/HotData/tmp/issue91-final-20261006")
ORACLE_BINARY = (
    RECOVERY_ROOT / "build" / "target" / "release" / "issue91-recovery-oracle"
)
QUERIES = RECOVERY_ROOT / "queries-44.f32"
REUSABLE_ORACLES = {"2000": RECOVERY_ROOT / "oracle-2k-44.f32"}

DIMENSION = 1024
QUERY_COUNT = 44
REPEATS = 3
FORMAL_SAMPLES = QUERY_COUNT * REPEATS
SCOPES = ("all", "intersection", "union_intersection", "topic_section")
SCALES = (
    {"name": "2000", "rows": 248806, "directory": "issue89-run-1791136634103922860"},
    {"name": "10000", "rows": 1239322, "directory": "issue89-run-1791137172340591976"},
    {"name": "25000", "rows": 3097688, "directory": "issue89-run-1791139967598740899"},
)
FIRST_SCALE = SCALES[0]["name"]

BUILD_LIMIT_KIB = 32 * GIB // KIB
RUN_LIMIT_KIB = 16 * GIB // KIB
WALL_SECONDS = 600.0
POLL_SECONDS = 0.1
KILL_GRACE_SECONDS = 5.0
MEM_MARGIN_KIB = 256 * 1024
DISK_BUDGET_BYTES = 128 * GIB
DISK_MARGIN_BYTES = 1 * GIB

P95_INDEX = 125  # sorted 132 formal samples: index 125 is the 126th item
P95_LIMIT_MS = 2500.0
P95_TARGET_MS = 1000.0
QUALITY_KEYS = ("25", "100")
GATED_METRICS = ("object_recall", "best_fragment_coverage")
ALL_METRICS = ("object_recall", "best_fragment_coverage", "winner_identity_recall")
EXTENDED_MACRO_MIN = 0.99
EXTENDED_WORST_MIN = 0.95


def matrix_bytes(rows: int) -> int:
    return rows * DIMENSION * 4


def oracle_bytes(rows: int) -> int:
    return rows * QUERY_COUNT * 4


def write_json(path: Path, payload: object) -> None:
    with open(path, "x", encoding="utf-8") as stream:
        json.dump(payload, stream, ensure_ascii=False, indent=2)
        stream.write("\n")


def read_json(path: Path) -> dict:
    with open(path, encoding="utf-8") as stream:
        return json.load(stream)


def mem_available_kib() -> int:
    for line in Path("/proc/meminfo").read_text(encoding="utf-8").splitlines():
        if line.startswith("MemAvailable:"):
            return int(line.split()[1])
    raise RuntimeError("meminfo has no MemAvailable")


def memory_check(phase: str, need_kib: int) -> dict:
    available = mem_available_kib()
    required = need_kib + MEM_MARGIN_KIB
    return {
        "phase": phase,
        "mem_available_kib": available,
        "required_kib": required,
        "ok": available >= required,
    }


def proc_rss_kib(pid: int) -> int | None:
    try:
        text = Path(f"/proc/{pid}/status").read_text(encoding="utf-8")
        values = {}
        for line in text.splitlines():
            key, _, rest = line.partition(":")
            if key in ("VmRSS", "VmHWM") and rest.split():
                values[key] = int(rest.split()[0])
    except (OSError, ValueError):
        return None
    if values.get("VmHWM"):
        return values["VmHWM"]
    return values.get("VmRSS") or None


def terminate_group(proc: subprocess.Popen) -> None:
    try:
        os.killpg(proc.pid, signal.SIGTERM)
    except ProcessLookupError:
        return
    grace = time.monotonic() + KILL_GRACE_SECONDS
    while proc.poll() is None and time.monotonic() < grace:
        time.sleep(POLL_SECONDS)
    if proc.poll() is None:
        try:
            os.killpg(proc.pid, signal.SIGKILL)
        except ProcessLookupError:
            pass


def run_watched(
    argv: list[str],
    *,
    limit_kib: int,
    log_path: Path,
    err_path: Path,
    env: dict,
    cwd: Path,
) -> dict:
    started = time.monotonic()
    with open(log_path, "xb") as out, open(err_path, "xb") as err:
        try:
            proc = subprocess.Popen(
                argv,
                cwd=str(cwd),
                env=env,
                stdout=out,
                stderr=err,
                start_new_session=True,
            )
        except OSError as error:
            return {
                "wall": round(time.monotonic() - started, 3),
                "RSSpeak": 0,
                "rss_limit": limit_kib,
                "deadline": WALL_SECONDS,
                "exit": None,
                "signal": None,
                "stop_reason": f"spawn_error({error.errno})",
            }
    peak = 0
    stop_reason = None
    while True:
        rss = proc_rss_kib(proc.pid)
        if rss is not None and rss > peak:
            peak = rss
        if proc.poll() is not None:
            break
        if stop_reason is None:
            if rss is not None and rss > limit_kib:
                stop_reason = "rss_limit"
            elif time.monotonic() - started > WALL_SECONDS:
                stop_reason = "wall_deadline"
        if stop_reason is not None:
            terminate_group(proc)
            break
        time.sleep(POLL_SECONDS)
    proc.wait()
    if stop_reason is None:
        stop_reason = "completed" if proc.returncode == 0 else "nonzero_exit"
    exit_code = proc.returncode
    signal_number = None
    if exit_code is not None and exit_code < 0:
        signal_number = -exit_code
        exit_code = None
    return {
        "wall": round(time.monotonic() - started, 3),
        "RSSpeak": peak,
        "rss_limit": limit_kib,
        "deadline": WALL_SECONDS,
        "exit": exit_code,
        "signal": signal_number,
        "stop_reason": stop_reason,
    }


def logical_bytes(path: Path, exclude: Path | None = None) -> int:
    # ponytail: logical st_size walk; swap for a du call if the tree ever grows.
    if not path.exists():
        return 0
    if path.is_file():
        return path.stat().st_size
    total = 0
    stack = [path]
    while stack:
        current = stack.pop()
        if exclude is not None and current == exclude:
            continue
        try:
            with os.scandir(current) as entries:
                for entry in entries:
                    if entry.is_dir(follow_symlinks=False):
                        stack.append(Path(entry.path))
                    elif entry.is_file(follow_symlinks=False):
                        total += entry.stat(follow_symlinks=False).st_size
        except OSError:
            raise
    return total


def existing_bytes(root: Path) -> int:
    paths = {DATA_ROOT, SESSION_ROOT, BUILD_ROOT, root}
    return sum(
        logical_bytes(p)
        for p in paths
        if not any(p != q and p.is_relative_to(q) for q in paths)
    )


def disk_projection(scale: dict) -> dict:
    rows = scale["rows"]
    database = DATA_ROOT / scale["directory"] / "rust.sqlite"
    reusable = REUSABLE_ORACLES.get(scale["name"])
    projection = {
        "matrices": 3 * matrix_bytes(rows),
        "database_backup": database.stat().st_size,
        "oracle": 0
        if reusable is not None and reusable.is_file()
        else oracle_bytes(rows),
        "margin": DISK_MARGIN_BYTES,
    }
    projection["total"] = sum(projection.values())
    return projection


def summarize_output(doc: dict, limit: int = 8192) -> dict:
    text = json.dumps(doc, ensure_ascii=False)
    if len(text) <= limit:
        return doc
    return {"keys": sorted(doc), "bytes": len(text)}


def load_output(
    path: Path, expected_mode: str | None
) -> tuple[dict | None, str | None]:
    try:
        doc = read_json(path)
    except (OSError, json.JSONDecodeError):
        return None, f"output_unreadable:{path.name}"
    if not isinstance(doc, dict) or (
        expected_mode and doc.get("mode") != expected_mode
    ):
        return None, f"output_shape:{path.name}"
    return doc, None


def verify_matrix(path: Path, rows: int) -> str | None:
    try:
        actual = path.stat().st_size
    except OSError:
        return f"matrix_missing:{path.name}"
    if actual != matrix_bytes(rows):
        return f"matrix_size_mismatch:{path.name}:{actual}"
    return None


def formal_statistics(records: list[dict]) -> dict:
    totals = sorted(float(record["total_ms"]) for record in records)
    if len(totals) != FORMAL_SAMPLES:
        raise ValueError(f"formal sample count {len(totals)}")
    return {
        "samples": len(totals),
        "p50_ms": statistics.median(totals),
        "p95_ms": totals[P95_INDEX],
        "min_ms": totals[0],
        "max_ms": totals[-1],
    }


def quality_statistics(records: list[dict]) -> dict:
    first = [record for record in records if record["repeat"] == 0]
    summary = {}
    for key in QUALITY_KEYS:
        for metric in ALL_METRICS:
            values = [float(record["quality"][key][metric]) for record in first]
            summary[f"{metric}@{key}"] = {
                "macro": sum(values) / len(values),
                "min": min(values),
            }
    return summary


def evaluate_gate(
    scale_name: str,
    stats: dict,
    quality: dict,
    records: list[dict],
    mismatches: dict,
) -> dict:
    mismatch_zero = all(value == 0 for value in mismatches.values())
    exact_route_ok = all(
        float(record["quality"][key][metric]) == 1.0
        for record in records
        if record["repeat"] == 0 and record["exact_route"]
        for key in QUALITY_KEYS
        for metric in GATED_METRICS
    )
    if scale_name == FIRST_SCALE:
        quality_rule = "macro==1.0,min==1.0"
        quality_ok = exact_route_ok and all(
            quality[f"{metric}@{key}"]["macro"] == 1.0
            and quality[f"{metric}@{key}"]["min"] == 1.0
            for key in QUALITY_KEYS
            for metric in GATED_METRICS
        )
    else:
        quality_rule = f"macro>={EXTENDED_MACRO_MIN},min>={EXTENDED_WORST_MIN}"
        quality_ok = exact_route_ok and all(
            quality[f"{metric}@{key}"]["macro"] >= EXTENDED_MACRO_MIN
            and quality[f"{metric}@{key}"]["min"] >= EXTENDED_WORST_MIN
            for key in QUALITY_KEYS
            for metric in GATED_METRICS
        )
    p95 = stats["p95_ms"]
    return {
        "mismatch_zero": mismatch_zero,
        "quality_rule": quality_rule,
        "exact_route_metrics_ok": exact_route_ok,
        "quality_ok": quality_ok,
        "latency_limit_met": p95 <= P95_LIMIT_MS,
        "latency_target_met": p95 <= P95_TARGET_MS,
        "pass": mismatch_zero and quality_ok and p95 <= P95_LIMIT_MS,
    }


def validate_run_doc(doc: dict, scale: dict, scope: str) -> list[str]:
    problems = []
    if doc.get("mode") != "run":
        problems.append("mode")
    if doc.get("scope") != scope:
        problems.append("scope")
    if doc.get("rows") != scale["rows"]:
        problems.append("rows")
    if doc.get("dimension") != DIMENSION:
        problems.append("dimension")
    for key in ("candidate_bits_mismatches", "scope_mismatches", "stable_mismatches"):
        if doc.get(key) != 0:
            problems.append(key)
    for key in (
        "eligible_count",
        "object_count",
        "matrix_load_ms",
        "metadata_ms",
        "oracle_load_ms",
        "first_request_ms",
        "warmup_ms",
        "distance_bits_checked",
        "peak_rss_kib",
    ):
        value = doc.get(key)
        if isinstance(value, bool) or not isinstance(value, (int, float)):
            problems.append(key)
    records = doc.get("records")
    if not isinstance(records, list) or len(records) != FORMAL_SAMPLES:
        problems.append("records")
        return problems
    seen = set()
    for record in records:
        if not isinstance(record, dict):
            problems.append("record_shape")
            return problems
        try:
            repeat = int(record["repeat"])
            query_index = int(record["query_index"])
            total_ms = float(record["total_ms"])
            candidate_count = int(record["candidate_count"])
            exact_route = record["exact_route"]
            quality = record["quality"]
        except (KeyError, TypeError, ValueError):
            problems.append("record_shape")
            return problems
        if not 0 <= repeat < REPEATS or not 0 <= query_index < QUERY_COUNT:
            problems.append("record_index")
            return problems
        if total_ms < 0 or candidate_count < 0 or not isinstance(exact_route, bool):
            problems.append("record_value")
            return problems
        key = (repeat, query_index)
        if key in seen:
            problems.append("record_duplicate")
            return problems
        seen.add(key)
        if repeat == 0:
            if not isinstance(quality, dict) or any(
                k not in quality for k in QUALITY_KEYS
            ):
                problems.append("quality_shape")
                return problems
        elif quality is not None:
            problems.append("quality_nonfirst")
            return problems
    if len(seen) != FORMAL_SAMPLES:
        problems.append("record_coverage")
    return problems


def log_progress(path: Path) -> dict:
    lines = path.read_text(encoding="utf-8", errors="replace").splitlines()
    json_lines = 0
    for line in lines:
        stripped = line.strip()
        if not stripped:
            continue
        try:
            json.loads(stripped)
        except json.JSONDecodeError:
            continue
        json_lines += 1
    return {"total_lines": len(lines), "json_lines": json_lines}


def run_case(
    root: Path,
    scale: dict,
    scope: str,
    binary: Path,
    env: dict,
    cwd: Path,
    oracle_path: Path,
) -> tuple[dict | None, str | None]:
    name = scale["name"]
    rows = scale["rows"]
    scope_dir = root / name / scope
    scope_dir.mkdir()
    config = {
        "mode": "run",
        "database": str(DATA_ROOT / scale["directory"] / "rust.sqlite"),
        "matrix": str(root / name / "normalized.f32"),
        "output": str(scope_dir / "run.json"),
        "queries": str(QUERIES),
        "oracle": str(oracle_path),
        "rows": rows,
        "dimension": DIMENSION,
        "scope": scope,
    }
    config_path = scope_dir / "config.json"
    write_json(config_path, config)
    runner = {
        "scale": name,
        "scope": scope,
        "config": str(config_path),
        "matrix": config["matrix"],
        "oracle": config["oracle"],
    }
    check = memory_check("run", min(matrix_bytes(rows) // KIB, RUN_LIMIT_KIB))
    runner["mem_check"] = check
    if not check["ok"]:
        runner["stop_reason"] = "insufficient_memory"
        runner["verdict"] = "aborted"
        write_json(scope_dir / "runner.json", runner)
        return None, f"insufficient_memory:run:{name}:{scope}"

    watch = run_watched(
        [str(binary), str(config_path)],
        limit_kib=RUN_LIMIT_KIB,
        log_path=scope_dir / "progress.log",
        err_path=scope_dir / "stderr.log",
        env=env,
        cwd=cwd,
    )
    runner.update(watch)
    if watch["stop_reason"] != "completed":
        runner["verdict"] = "aborted"
        write_json(scope_dir / "runner.json", runner)
        return None, f"run_aborted:{name}:{scope}:{watch['stop_reason']}"

    doc, failure = load_output(Path(config["output"]), "run")
    if failure is None and doc is not None:
        problems = validate_run_doc(doc, scale, scope)
        if problems:
            failure = f"run_doc:{problems[0]}"
    if failure is not None or doc is None:
        runner["failure"] = failure
        runner["verdict"] = "failed"
        write_json(scope_dir / "runner.json", runner)
        return None, f"run_failed:{name}:{scope}:{failure}"

    records = doc["records"]
    if max(watch["RSSpeak"], doc["peak_rss_kib"]) > RUN_LIMIT_KIB:
        runner["stop_reason"] = "reported_rss_limit"
        write_json(scope_dir / "runner.json", runner)
        return None, f"run_aborted:{name}:{scope}:reported_rss_limit"
    stats = formal_statistics(records)
    quality = quality_statistics(records)
    mismatches = {
        key: doc[key]
        for key in (
            "candidate_bits_mismatches",
            "scope_mismatches",
            "stable_mismatches",
        )
    }
    gate = evaluate_gate(name, stats, quality, records, mismatches)
    runner.update(
        {
            "child_peak_rss_kib": doc["peak_rss_kib"],
            "p95_ms": stats["p95_ms"],
            "mismatches": mismatches,
            "gate": gate,
            "verdict": "pass" if gate["pass"] else "gate_failed",
        }
    )
    write_json(scope_dir / "runner.json", runner)
    case = {
        "scale": name,
        "scope": scope,
        "runner": str(scope_dir / "runner.json"),
        "output": config["output"],
        "statistics": stats,
        "quality": quality,
        "mismatches": mismatches,
        "exact_route_records": sum(1 for record in records if record["exact_route"]),
        "eligible_count": doc["eligible_count"],
        "object_count": doc["object_count"],
        "matrix_load_ms": doc["matrix_load_ms"],
        "metadata_ms": doc["metadata_ms"],
        "oracle_load_ms": doc["oracle_load_ms"],
        "first_request_ms": doc["first_request_ms"],
        "warmup_ms": doc["warmup_ms"],
        "distance_bits_checked": doc["distance_bits_checked"],
        "child_peak_rss_kib": doc["peak_rss_kib"],
        "watch": watch,
        "progress": log_progress(scope_dir / "progress.log"),
        "gate": gate,
        "pass": gate["pass"],
    }
    return case, None


def prepare_scale(
    root: Path,
    scale: dict,
    binary: Path,
    env: dict,
    cwd: Path,
    record: dict,
) -> str | None:
    name = scale["name"]
    rows = scale["rows"]
    database = DATA_ROOT / scale["directory"] / "rust.sqlite"
    scale_dir = root / name
    scale_dir.mkdir()
    normalized = scale_dir / "normalized.f32"
    staging = scale_dir / "normalized-staging.f32"
    normalized_backup = scale_dir / "normalized-backup.f32"
    database_backup = scale_dir / "database-backup.sqlite"
    record.update(
        {
            "database": str(database),
            "matrix": str(normalized),
            "staging": str(staging),
            "normalized_backup": str(normalized_backup),
            "database_backup": str(database_backup),
        }
    )
    payload_kib = matrix_bytes(rows) // KIB

    check = memory_check("build", min(payload_kib, BUILD_LIMIT_KIB))
    record["mem_checks"].append(check)
    if not check["ok"]:
        return "insufficient_memory:build"
    build_config = scale_dir / "build.config.json"
    write_json(
        build_config,
        {
            "mode": "build",
            "database": str(database),
            "matrix": str(normalized),
            "output": str(scale_dir / "build.json"),
            "rows": rows,
            "dimension": DIMENSION,
        },
    )
    watch = run_watched(
        [str(binary), str(build_config)],
        limit_kib=BUILD_LIMIT_KIB,
        log_path=scale_dir / "build.log",
        err_path=scale_dir / "build.err",
        env=env,
        cwd=cwd,
    )
    record["prepare"]["build"] = watch
    if watch["stop_reason"] != "completed":
        return f"build_failed:{watch['stop_reason']}"
    failure = verify_matrix(normalized, rows)
    if failure is not None:
        return failure
    doc, failure = load_output(scale_dir / "build.json", None)
    if failure is not None:
        return failure
    record["prepare"]["build_output"] = summarize_output(doc)
    if doc["peak_rss_kib"] > BUILD_LIMIT_KIB:
        return "build_failed:reported_rss_limit"

    check = memory_check("replace", min(2 * payload_kib, BUILD_LIMIT_KIB))
    record["mem_checks"].append(check)
    if not check["ok"]:
        return "insufficient_memory:replace"
    replace_config = scale_dir / "replace.config.json"
    write_json(
        replace_config,
        {
            "mode": "build",
            "database": str(database),
            "matrix": str(staging),
            "output": str(scale_dir / "replace.json"),
            "rows": rows,
            "dimension": DIMENSION,
            "old_matrix": str(normalized),
        },
    )
    watch = run_watched(
        [str(binary), str(replace_config)],
        limit_kib=BUILD_LIMIT_KIB,
        log_path=scale_dir / "replace.log",
        err_path=scale_dir / "replace.err",
        env=env,
        cwd=cwd,
    )
    record["prepare"]["replace"] = watch
    if watch["stop_reason"] != "completed":
        return f"replace_failed:{watch['stop_reason']}"
    failure = verify_matrix(staging, rows)
    if failure is not None:
        return failure
    doc, failure = load_output(scale_dir / "replace.json", None)
    if failure is not None:
        return failure
    record["prepare"]["replace_output"] = summarize_output(doc)
    if doc["peak_rss_kib"] > BUILD_LIMIT_KIB:
        return "replace_failed:reported_rss_limit"

    check = memory_check("copy", 0)
    record["mem_checks"].append(check)
    if not check["ok"]:
        return "insufficient_memory:copy"
    # Real copies: the retained coexistence cost is the frozen disk evidence.
    for label, source, target in [
        ("database", database, database_backup),
        ("matrix", normalized, normalized_backup),
    ]:
        watch = run_watched(
            [
                sys.executable,
                "-c",
                "import shutil,sys; shutil.copyfile(sys.argv[1],sys.argv[2])",
                str(source),
                str(target),
            ],
            limit_kib=BUILD_LIMIT_KIB,
            log_path=scale_dir / f"copy-{label}.log",
            err_path=scale_dir / f"copy-{label}.err",
            env=env,
            cwd=cwd,
        )
        record["prepare"][f"copy-{label}"] = {
            **watch,
            "bytes": target.stat().st_size if target.exists() else 0,
        }
        if watch["stop_reason"] != "completed":
            return f"copy_failed:{label}:{watch['stop_reason']}"
        if target.stat().st_size != source.stat().st_size:
            return f"copy_size_mismatch:{label}"

    expected_oracle = oracle_bytes(rows)
    oracle_path = REUSABLE_ORACLES.get(name)
    if (
        oracle_path is not None
        and oracle_path.is_file()
        and oracle_path.stat().st_size == expected_oracle
    ):
        record["oracle_source"] = "recovery_root"
    else:
        check = memory_check("oracle", min(expected_oracle // KIB, BUILD_LIMIT_KIB))
        record["mem_checks"].append(check)
        if not check["ok"]:
            return "insufficient_memory:oracle"
        generated = scale_dir / "oracle-44.f32"
        watch = run_watched(
            [
                str(ORACLE_BINARY),
                str(database),
                str(QUERIES),
                str(generated),
                str(rows),
                str(DIMENSION),
                str(QUERY_COUNT),
            ],
            limit_kib=BUILD_LIMIT_KIB,
            log_path=scale_dir / "oracle.log",
            err_path=scale_dir / "oracle.err",
            env=env,
            cwd=cwd,
        )
        record["prepare"]["oracle"] = watch
        if watch["stop_reason"] != "completed":
            return f"oracle_failed:{watch['stop_reason']}"
        if not generated.is_file() or generated.stat().st_size != expected_oracle:
            return "oracle_size_mismatch"
        oracle_path = generated
        record["oracle_source"] = "generated"
    record["oracle"] = str(oracle_path)
    return None


def batch_verdict(cases: list[dict]) -> str:
    if len(cases) == len(SCALES) * len(SCOPES) and all(case["pass"] for case in cases):
        return "full_recommendation"
    first = [case for case in cases if case["scale"] == FIRST_SCALE]
    if len(first) == len(SCOPES) and not any(case["pass"] for case in first):
        return "rejected"
    if any(case["pass"] for case in cases):
        return "limited_recommendation"
    return "evidence_insufficient"


def preflight(binary: Path) -> list[str]:
    failures = []
    if (
        not binary.is_absolute()
        or not binary.is_file()
        or not os.access(binary, os.X_OK)
    ):
        failures.append(f"binary not executable: {binary}")
    if not QUERIES.is_file() or QUERIES.stat().st_size != QUERY_COUNT * DIMENSION * 4:
        failures.append(f"queries not usable: {QUERIES}")
    for scale in SCALES:
        database = DATA_ROOT / scale["directory"] / "rust.sqlite"
        if not database.is_file() or database.stat().st_size == 0:
            failures.append(f"database missing: {database}")
    if not ORACLE_BINARY.is_file() or not os.access(ORACLE_BINARY, os.X_OK):
        failures.append(f"oracle binary not executable: {ORACLE_BINARY}")
    return failures


def run_batch(binary: Path, root: Path) -> int:
    cwd = Path.cwd()
    failures = preflight(binary)
    if failures:
        for failure in failures:
            print(f"preflight failure: {failure}", file=sys.stderr)
        return 1
    if root.exists() and any(root.iterdir()):
        print(f"refusing to overwrite non-empty root: {root}", file=sys.stderr)
        return 1
    root.mkdir(parents=True, exist_ok=True, mode=0o700)
    (root / "tmp").mkdir()
    (root / "pycache").mkdir()
    env = dict(os.environ)
    env["TMPDIR"] = str(root / "tmp")
    env["PYTHONPYCACHEPREFIX"] = str(root / "pycache")
    summary = {
        "format": "issue91-run-v1",
        "binary": str(binary),
        "root": str(root),
        "cwd": str(cwd),
        "queries": {
            "path": str(QUERIES),
            "count": QUERY_COUNT,
            "batch": (
                "new frozen 44-query batch; first-scale quality is a "
                "full-coverage regression boundary, not historical reproduction"
            ),
        },
        "thresholds": {
            "disk_budget_bytes": DISK_BUDGET_BYTES,
            "disk_margin_bytes": DISK_MARGIN_BYTES,
            "memory_margin_kib": MEM_MARGIN_KIB,
            "build_replace_rss_limit_kib": BUILD_LIMIT_KIB,
            "run_rss_limit_kib": RUN_LIMIT_KIB,
            "wall_seconds": WALL_SECONDS,
            "poll_seconds": POLL_SECONDS,
            "formal_samples": FORMAL_SAMPLES,
            "p95_index": P95_INDEX,
            "p95_limit_ms": P95_LIMIT_MS,
            "p95_target_ms": P95_TARGET_MS,
            "quality_keys": list(QUALITY_KEYS),
            "gated_metrics": list(GATED_METRICS),
            "first_scale_rule": "macro==1.0,min==1.0",
            "extended_scale_rule": (
                f"macro>={EXTENDED_MACRO_MIN},min>={EXTENDED_WORST_MIN}"
            ),
            "exact_route_rule": "gated metrics==1.0",
        },
        "scales": [],
        "cases": [],
        "untested": [],
        "verdict": None,
    }
    stop = None
    try:
        for scale in SCALES:
            name = scale["name"]
            record = {
                "name": name,
                "rows": scale["rows"],
                "status": "not_started",
                "mem_checks": [],
                "prepare": {},
            }
            summary["scales"].append(record)
            if stop is not None:
                summary["untested"].append({"scale": name, "reason": stop})
                continue
            existing = existing_bytes(root)
            projection = disk_projection(scale)
            total = existing + projection["total"]
            record["status"] = "preparing"
            record["disk"] = {
                "existing_bytes": existing,
                "projection": projection,
                "total_bytes": total,
                "budget_bytes": DISK_BUDGET_BYTES,
                "ok": total <= DISK_BUDGET_BYTES,
                "fs_available_bytes": shutil.disk_usage(root).free,
            }
            if (
                not record["disk"]["ok"]
                or record["disk"]["fs_available_bytes"] < projection["total"]
            ):
                record["status"] = "blocked"
                record["reason"] = "insufficient_disk"
                stop = "insufficient_disk"
                print(f"[{name}] blocked: insufficient_disk", file=sys.stderr)
                summary["untested"].append({"scale": name, "reason": stop})
                continue
            failure = prepare_scale(root, scale, binary, env, cwd, record)
            if failure is not None:
                record["status"] = "incomplete"
                record["reason"] = failure
                stop = failure
                print(f"[{name}] prepare failed: {failure}", file=sys.stderr)
                summary["untested"].append({"scale": name, "reason": failure})
                continue
            record["status"] = "running"
            print(f"[{name}] prepared: staging + backups + oracle retained")
            for scope in SCOPES:
                case, failure = run_case(
                    root, scale, scope, binary, env, cwd, Path(record["oracle"])
                )
                if failure is not None:
                    record["status"] = "aborted"
                    record["reason"] = failure
                    stop = failure
                    print(f"[{name} {scope}] aborted: {failure}", file=sys.stderr)
                    break
                summary["cases"].append(case)
                outcome = "pass" if case["pass"] else "gate_failed"
                print(
                    f"[{name} {scope}] {outcome} p95_ms={case['statistics']['p95_ms']:.3f}"
                    f" wall_s={case['watch']['wall']}"
                )
            if stop is not None:
                break
            passed = all(
                case["pass"] for case in summary["cases"] if case["scale"] == name
            )
            record["status"] = "passed" if passed else "gate_failed"
            if not passed:
                record["reason"] = f"gate_failed:{name}"
                stop = record["reason"]
            elif name == FIRST_SCALE:
                print(f"[{name}] all four scopes passed, scaling up")
    except Exception as error:  # noqa: BLE001 - the batch must still publish evidence
        stop = f"runner_error:{type(error).__name__}"
        summary["error"] = f"{type(error).__name__}: {error}"
        print(f"runner error: {summary['error']}", file=sys.stderr)
    summary["stop"] = stop
    summary["retained_disk_bytes"] = existing_bytes(root)
    measured = {(case["scale"], case["scope"]) for case in summary["cases"]}
    summary["not_measured_configurations"] = [
        {"scale": scale["name"], "scope": scope, "reason": stop}
        for scale in SCALES
        for scope in SCOPES
        if (scale["name"], scope) not in measured
    ]
    summary["verdict"] = batch_verdict(summary["cases"])
    write_json(root / "summary.json", summary)
    print(f"verdict: {summary['verdict']} cases={len(summary['cases'])} stop={stop}")
    if summary["verdict"] == "evidence_insufficient":
        return 2
    return 0


def synthetic_records(value: float, exact: bool = False) -> list[dict]:
    records = []
    for repeat in range(REPEATS):
        for query_index in range(QUERY_COUNT):
            quality = None
            if repeat == 0:
                quality = {
                    key: dict.fromkeys(ALL_METRICS, value) for key in QUALITY_KEYS
                }
            records.append(
                {
                    "repeat": repeat,
                    "query_index": query_index,
                    "total_ms": float(repeat * QUERY_COUNT + query_index),
                    "prepare_ms": 0.0,
                    "search_ms": 0.0,
                    "rescore_ms": 0.0,
                    "aggregate_ms": 0.0,
                    "cleanup_ms": 0.0,
                    "candidate_count": 1,
                    "exact_route": exact,
                    "quality": quality,
                }
            )
    return records


def self_test() -> None:
    assert P95_INDEX == 125
    records = synthetic_records(1.0)
    stats = formal_statistics(records)
    assert stats["samples"] == FORMAL_SAMPLES == 132
    assert stats["p95_ms"] == 125.0  # sorted index 125 of the synthetic series
    assert stats["p50_ms"] == 65.5
    assert stats["min_ms"] == 0.0 and stats["max_ms"] == 131.0
    quality = quality_statistics(records)
    for key in QUALITY_KEYS:
        for metric in ALL_METRICS:
            assert quality[f"{metric}@{key}"] == {"macro": 1.0, "min": 1.0}
    clean = {
        "candidate_bits_mismatches": 0,
        "scope_mismatches": 0,
        "stable_mismatches": 0,
    }
    assert evaluate_gate(FIRST_SCALE, stats, quality, records, clean)["pass"]
    exact_good = synthetic_records(1.0, exact=True)
    assert evaluate_gate(FIRST_SCALE, stats, quality, exact_good, clean)["pass"]

    # First scale demands exact 100%; extended scales tolerate macro .99 / min .95.
    one_short = synthetic_records(1.0)
    one_short[0]["quality"]["25"]["object_recall"] = 0.98
    short_quality = quality_statistics(one_short)
    assert not evaluate_gate(FIRST_SCALE, stats, short_quality, one_short, clean)[
        "quality_ok"
    ]
    assert evaluate_gate("10000", stats, short_quality, one_short, clean)["quality_ok"]

    # Narrow exact-route records must stay exactly 1.0 even on extended scales.
    exact_bad = synthetic_records(1.0, exact=True)
    exact_bad[5]["quality"]["100"]["best_fragment_coverage"] = 0.9999
    assert not evaluate_gate(
        "10000", stats, quality_statistics(exact_bad), exact_bad, clean
    )["quality_ok"]

    flagged = dict(clean, scope_mismatches=1)
    assert not evaluate_gate("10000", stats, quality, records, flagged)["pass"]
    slow = synthetic_records(1.0)
    for record in slow:
        record["total_ms"] = 2501.0
    slow_stats = formal_statistics(slow)
    assert not evaluate_gate("10000", slow_stats, quality, slow, clean)[
        "latency_limit_met"
    ]
    for record in slow:
        record["total_ms"] = 1000.0
    assert evaluate_gate("10000", formal_statistics(slow), quality, slow, clean)[
        "latency_target_met"
    ]

    # Verdict precedence: full / rejected / limited / evidence_insufficient.
    def cases(passed: list[bool]) -> list[dict]:
        return [
            {
                "scale": SCALES[index // len(SCOPES)]["name"],
                "scope": SCOPES[index % len(SCOPES)],
                "pass": passed[index],
            }
            for index in range(len(passed))
        ]

    assert batch_verdict(cases([True] * 12)) == "full_recommendation"
    assert batch_verdict(cases([False] * 4)) == "rejected"
    assert batch_verdict(cases([True, False, True, False])) == "limited_recommendation"
    assert batch_verdict([]) == "evidence_insufficient"

    doc = {
        "mode": "run",
        "scope": "all",
        "rows": SCALES[0]["rows"],
        "dimension": DIMENSION,
        **clean,
        "eligible_count": 1,
        "object_count": 1,
        "matrix_load_ms": 1.0,
        "metadata_ms": 1.0,
        "oracle_load_ms": 1.0,
        "first_request_ms": 1.0,
        "warmup_ms": 1.0,
        "distance_bits_checked": 0,
        "peak_rss_kib": 1,
        "records": synthetic_records(1.0),
    }
    assert validate_run_doc(doc, SCALES[0], "all") == []
    duplicated = json.loads(json.dumps(doc))
    duplicated["records"][1] = dict(duplicated["records"][0])
    assert validate_run_doc(duplicated, SCALES[0], "all") == ["record_duplicate"]
    assert proc_rss_kib(os.getpid()) > 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--binary", type=Path)
    parser.add_argument("--root", type=Path)
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args(argv)
    if args.self_test:
        self_test()
        print("self-test ok")
        return 0
    if args.binary is None or args.root is None:
        parser.error("--binary and --root are required")
    if not args.binary.is_absolute() or not args.root.is_absolute():
        parser.error("--binary and --root must be absolute paths")
    return run_batch(args.binary, args.root)


if __name__ == "__main__":
    sys.exit(main())
