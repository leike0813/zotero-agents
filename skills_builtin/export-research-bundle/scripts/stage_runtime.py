from __future__ import annotations

import json
import math
import os
import shutil
import sqlite3
import subprocess
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable


SKILL_ID = "export-research-bundle"
DB_RELATIVE_PATH = Path("runtime/export-research-bundle.sqlite")
STAGES = [
    "stage_00_runtime_setup",
    "stage_10_intent_query_plan",
    "stage_20_discovery_collect",
    "stage_30_topic_assessment",
    "stage_40_evidence_prepare",
    "stage_50_paper_assessment",
    "stage_60_enrich_and_select",
    "stage_70_render_result",
]
RELATED_THRESHOLD = 0.45
ASSESSMENT_BATCH_SIZE = 20


class ExternalActionRequired(RuntimeError):
    pass


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def clean(value: Any) -> str:
    return str(value or "").strip()


def posix(path: Path) -> str:
    return path.resolve().as_posix()


def write_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(value, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )


def read_json(path: Path, default: Any = None) -> Any:
    if not path.exists():
        return default
    return json.loads(path.read_text(encoding="utf-8"))


def run_root_from_db(db_path: str | Path) -> Path:
    resolved = Path(db_path).resolve()
    if resolved.parent.name != "runtime":
        raise ValueError("database must be located directly under the run runtime directory")
    return resolved.parent.parent


def connect(db_path: str | Path) -> sqlite3.Connection:
    path = Path(db_path).resolve()
    path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(path)
    conn.row_factory = sqlite3.Row
    return conn


def initialize_db(db_path: str | Path) -> sqlite3.Connection:
    conn = connect(db_path)
    conn.executescript(
        """
        CREATE TABLE IF NOT EXISTS meta (
          key TEXT PRIMARY KEY,
          value_json TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS stage_state (
          stage_id TEXT PRIMARY KEY,
          status TEXT NOT NULL,
          result_json TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS queries (
          query_text TEXT PRIMARY KEY,
          focus TEXT NOT NULL,
          ordinal INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS topic_candidates (
          topic_id TEXT PRIMARY KEY,
          row_json TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS selected_topics (
          topic_id TEXT PRIMARY KEY,
          relevance REAL NOT NULL,
          reason TEXT NOT NULL,
          source_paper_refs_json TEXT NOT NULL DEFAULT '[]'
        );
        CREATE TABLE IF NOT EXISTS paper_candidates (
          paper_ref TEXT PRIMARY KEY,
          metadata_json TEXT NOT NULL,
          sources_json TEXT NOT NULL,
          topic_ids_json TEXT NOT NULL,
          digest_path TEXT NOT NULL DEFAULT '',
          abstract_text TEXT NOT NULL DEFAULT ''
        );
        CREATE TABLE IF NOT EXISTS paper_assessments (
          paper_ref TEXT PRIMARY KEY,
          batch_id TEXT NOT NULL,
          semantic_relevance REAL NOT NULL,
          matched_topic_ids_json TEXT NOT NULL,
          reason TEXT NOT NULL,
          evidence_basis_json TEXT NOT NULL,
          caveats_json TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS graph_metrics (
          paper_ref TEXT PRIMARY KEY,
          graph_available INTEGER NOT NULL,
          graph_status TEXT NOT NULL,
          graph_hash TEXT NOT NULL,
          metric_json TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS material_readiness (
          paper_ref TEXT PRIMARY KEY,
          readiness REAL NOT NULL,
          evidence_json TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS diagnostics (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          severity TEXT NOT NULL,
          code TEXT NOT NULL,
          message TEXT NOT NULL,
          details_json TEXT NOT NULL,
          created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS action_receipts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          stage_id TEXT NOT NULL,
          action TEXT NOT NULL,
          status TEXT NOT NULL,
          details_json TEXT NOT NULL,
          created_at TEXT NOT NULL
        );
        """
    )
    conn.commit()
    return conn


def set_meta(conn: sqlite3.Connection, key: str, value: Any) -> None:
    conn.execute(
        "INSERT INTO meta(key, value_json) VALUES(?, ?) "
        "ON CONFLICT(key) DO UPDATE SET value_json=excluded.value_json",
        (key, json.dumps(value, ensure_ascii=False, sort_keys=True)),
    )
    conn.commit()


def get_meta(conn: sqlite3.Connection, key: str, default: Any = None) -> Any:
    row = conn.execute("SELECT value_json FROM meta WHERE key=?", (key,)).fetchone()
    return json.loads(row[0]) if row else default


def record_stage(conn: sqlite3.Connection, stage_id: str, result: dict[str, Any]) -> None:
    conn.execute(
        "INSERT INTO stage_state(stage_id,status,result_json,updated_at) VALUES(?,?,?,?) "
        "ON CONFLICT(stage_id) DO UPDATE SET status=excluded.status,result_json=excluded.result_json,updated_at=excluded.updated_at",
        (stage_id, "completed", json.dumps(result, ensure_ascii=False, sort_keys=True), utc_now()),
    )
    conn.commit()


def record_receipt(
    conn: sqlite3.Connection,
    stage_id: str,
    action: str,
    status: str,
    details: Any,
) -> None:
    conn.execute(
        "INSERT INTO action_receipts(stage_id,action,status,details_json,created_at) VALUES(?,?,?,?,?)",
        (stage_id, action, status, json.dumps(details, ensure_ascii=False, sort_keys=True), utc_now()),
    )
    conn.commit()


def add_diagnostic(
    conn: sqlite3.Connection,
    code: str,
    message: str,
    *,
    severity: str = "warning",
    details: Any = None,
) -> None:
    conn.execute(
        "INSERT INTO diagnostics(severity,code,message,details_json,created_at) VALUES(?,?,?,?,?)",
        (severity, code, message, json.dumps(details or {}, ensure_ascii=False, sort_keys=True), utc_now()),
    )
    conn.commit()


def diagnostics(conn: sqlite3.Connection) -> list[dict[str, Any]]:
    return [
        {
            "severity": row["severity"],
            "code": row["code"],
            "message": row["message"],
            "details": json.loads(row["details_json"]),
        }
        for row in conn.execute(
            "SELECT severity,code,message,details_json FROM diagnostics ORDER BY id"
        )
    ]


def completed_stages(conn: sqlite3.Connection) -> set[str]:
    return {
        str(row[0])
        for row in conn.execute("SELECT stage_id FROM stage_state WHERE status='completed'")
    }


def load_input(run_root: Path, input_path: str | None) -> dict[str, Any]:
    candidates: list[Path] = []
    if input_path:
        candidates.append(Path(input_path) if Path(input_path).is_absolute() else run_root / input_path)
    candidates.append(run_root / "runtime/input.json")
    for manifest_root in [run_root / ".acp", run_root / ".audit"]:
        candidates.extend(sorted(manifest_root.glob(f"{SKILL_ID}*/input_manifest.json")))
        candidates.extend(sorted(manifest_root.glob("*/input_manifest.json")))
    seen: set[Path] = set()
    for candidate in candidates:
        resolved = candidate.resolve()
        if resolved in seen:
            continue
        seen.add(resolved)
        value = read_json(resolved, None)
        if isinstance(value, dict):
            return value
    return {}


def input_parameters(value: dict[str, Any]) -> dict[str, Any]:
    for source in [
        value.get("parameter"),
        value.get("parameters"),
        (value.get("request") or {}).get("parameter") if isinstance(value.get("request"), dict) else None,
        value,
    ]:
        if isinstance(source, dict) and (source.get("paperTitle") or source.get("researchContent")):
            return source
    return {}


def normalize_intent_and_limits(parameters: dict[str, Any]) -> tuple[dict[str, Any], dict[str, int]]:
    title = clean(parameters.get("paperTitle"))
    content = clean(parameters.get("researchContent"))
    if not title or not content:
        raise ValueError("paperTitle and researchContent are required")

    def bounded(name: str, fallback: int, minimum: int, maximum: int) -> int:
        raw = parameters.get(name, fallback)
        if isinstance(raw, bool):
            raise ValueError(f"{name} must be an integer")
        try:
            parsed = int(raw)
        except (TypeError, ValueError) as exc:
            raise ValueError(f"{name} must be an integer") from exc
        return min(maximum, max(minimum, parsed))

    intent = {
        "paper_title": title,
        "article_type": clean(parameters.get("articleType")) or "original research",
        "research_content": content,
    }
    limits = {
        "max_topics": bounded("maxTopics", 5, 0, 5),
        "max_core_papers": bounded("maxCorePapers", 20, 1, 20),
        "max_related_papers": bounded("maxRelatedPapers", 80, 1, 80),
    }
    return intent, limits


def bridge_executable(run_root: Path) -> Path:
    candidates: list[Path] = []
    if clean(os.environ.get("ZOTERO_BRIDGE_BIN")):
        candidates.append(Path(str(os.environ["ZOTERO_BRIDGE_BIN"])))
    bridge_dir = run_root / ".zotero-bridge/bin"
    candidates.extend(
        [bridge_dir / "zotero-bridge.cmd", bridge_dir / "zotero-bridge.exe", bridge_dir / "zotero-bridge"]
    )
    for candidate in candidates:
        if candidate.exists():
            return candidate.resolve()
    found = shutil.which("zotero-bridge")
    if found:
        return Path(found).resolve()
    raise FileNotFoundError("Host Bridge CLI was not found in the run workspace, ZOTERO_BRIDGE_BIN, or PATH")


def unwrap_bridge(value: Any) -> Any:
    current = value
    if isinstance(current, dict) and current.get("ok") is False:
        raise RuntimeError(json.dumps(current.get("error") or current, ensure_ascii=False))
    if isinstance(current, dict) and "data" in current:
        current = current["data"]
    if isinstance(current, dict) and current.get("ok") is False:
        raise RuntimeError(json.dumps(current.get("error") or current, ensure_ascii=False))
    if isinstance(current, dict) and "data" in current and (
        len(current) == 1 or "approval" in current or "capability" in current
    ):
        current = current["data"]
    if isinstance(current, dict) and isinstance(current.get("result"), dict):
        current = current["result"]
    return current


def run_bridge_args(
    run_root: Path,
    command: list[str],
    call_name: str,
) -> Any:
    bridge = bridge_executable(run_root)
    host_dir = run_root / "runtime/host"
    host_dir.mkdir(parents=True, exist_ok=True)
    args = [str(bridge), *command]
    completed = subprocess.run(
        args,
        cwd=run_root,
        capture_output=True,
        encoding="utf-8",
        text=True,
        check=False,
    )
    if completed.returncode != 0:
        raise RuntimeError((completed.stdout or completed.stderr or "Host Bridge command failed").strip())
    parsed = json.loads((completed.stdout or "{}").strip())
    write_json(host_dir / f"{call_name}.output.json", parsed)
    return unwrap_bridge(parsed)


def run_bridge_query(
    run_root: Path,
    command: list[str],
    query: dict[str, Any],
    call_name: str,
) -> Any:
    host_dir = run_root / "runtime/host"
    host_dir.mkdir(parents=True, exist_ok=True)
    input_path = host_dir / f"{call_name}.input.json"
    write_json(input_path, query)
    relative = input_path.relative_to(run_root).as_posix()
    return run_bridge_args(run_root, [*command, "--query", f"@{relative}"], call_name)


def next_page_cursor(data: Any, current_cursor: str) -> str | None:
    if not isinstance(data, dict) or data.get("hasMore") is not True:
        return None
    next_cursor = clean(data.get("nextCursor"))
    if not next_cursor or next_cursor == current_cursor:
        raise RuntimeError("Host Bridge paged response declared hasMore without a new nextCursor")
    return next_cursor


def page_topic_inventory(run_root: Path) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    cursor = "0"
    page = 0
    while True:
        data = run_bridge_query(
            run_root,
            ["synthesis", "topic", "list"],
            {"cursor": cursor, "limit": 100},
            f"stage20-topic-list-{page + 1}",
        )
        if not isinstance(data, dict):
            break
        rows.extend(entry for entry in data.get("topics", []) if isinstance(entry, dict))
        next_cursor = next_page_cursor(data, cursor)
        if next_cursor is None:
            break
        cursor = next_cursor
        page += 1
    return rows


def paper_ref_from_row(row: dict[str, Any]) -> str:
    direct = clean(row.get("paper_ref") or row.get("paperRef"))
    if direct:
        return direct
    key = clean(row.get("key") or row.get("item_key") or row.get("itemKey"))
    library = row.get("libraryId", row.get("library_id", row.get("libraryID")))
    try:
        library_id = int(library)
    except (TypeError, ValueError):
        return ""
    return f"{library_id}:{key}" if library_id > 0 and key else ""


def collect_paper_refs(value: Any) -> set[str]:
    refs: set[str] = set()
    if isinstance(value, dict):
        for key, child in value.items():
            if key in {"paper_ref", "paperRef"}:
                ref = clean(child)
                if ref:
                    refs.add(ref)
            elif key in {"paper_refs", "paperRefs"} and isinstance(child, list):
                refs.update(clean(entry) for entry in child if clean(entry))
            else:
                refs.update(collect_paper_refs(child))
    elif isinstance(value, list):
        for child in value:
            refs.update(collect_paper_refs(child))
    return refs


def upsert_candidate(
    candidates: dict[str, dict[str, Any]],
    paper_ref: str,
    *,
    metadata: dict[str, Any] | None = None,
    source: str,
    topic_id: str = "",
) -> None:
    if not paper_ref:
        return
    entry = candidates.setdefault(
        paper_ref,
        {"paper_ref": paper_ref, "metadata": {}, "sources": [], "topic_ids": []},
    )
    if metadata:
        entry["metadata"] = {**entry["metadata"], **metadata}
    if source not in entry["sources"]:
        entry["sources"].append(source)
    if topic_id and topic_id not in entry["topic_ids"]:
        entry["topic_ids"].append(topic_id)


def save_candidates(conn: sqlite3.Connection, candidates: Iterable[dict[str, Any]]) -> None:
    conn.execute("DELETE FROM paper_candidates")
    for row in candidates:
        conn.execute(
            "INSERT INTO paper_candidates(paper_ref,metadata_json,sources_json,topic_ids_json,digest_path,abstract_text) VALUES(?,?,?,?,?,?)",
            (
                row["paper_ref"],
                json.dumps(row.get("metadata") or {}, ensure_ascii=False, sort_keys=True),
                json.dumps(sorted(set(row.get("sources") or [])), ensure_ascii=False),
                json.dumps(sorted(set(row.get("topic_ids") or [])), ensure_ascii=False),
                clean(row.get("digest_path")),
                clean(row.get("abstract_text")),
            ),
        )
    conn.commit()


def load_candidates(conn: sqlite3.Connection) -> list[dict[str, Any]]:
    return [
        {
            "paper_ref": row["paper_ref"],
            "metadata": json.loads(row["metadata_json"]),
            "sources": json.loads(row["sources_json"]),
            "topic_ids": json.loads(row["topic_ids_json"]),
            "digest_path": row["digest_path"],
            "abstract_text": row["abstract_text"],
        }
        for row in conn.execute("SELECT * FROM paper_candidates ORDER BY paper_ref")
    ]


def render_resume_view(conn: sqlite3.Connection, run_root: Path) -> None:
    completed = completed_stages(conn)
    intent = get_meta(conn, "intent", {})
    selected = [dict(row) for row in conn.execute("SELECT topic_id,relevance,reason FROM selected_topics ORDER BY relevance DESC, topic_id")]
    candidate_count = conn.execute("SELECT COUNT(*) FROM paper_candidates").fetchone()[0]
    assessed_count = conn.execute("SELECT COUNT(*) FROM paper_assessments").fetchone()[0]
    body = [
        "# Export Research Bundle Resume",
        "",
        f"- Title: {intent.get('paper_title', '')}",
        f"- Completed stages: {', '.join(stage for stage in STAGES if stage in completed) or 'none'}",
        f"- Selected topics: {len(selected)}",
        f"- Paper candidates: {candidate_count}",
        f"- Assessed papers: {assessed_count}",
        "",
        "SQLite is the runtime source of truth. Do not edit this view.",
    ]
    path = run_root / "runtime/views/01-resume.md"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("\n".join(body) + "\n", encoding="utf-8")


def write_canceled(run_root: Path, reason: str, message: str) -> dict[str, Any]:
    result = {
        "kind": "research_bundle_canceled",
        "status": "canceled",
        "reason": reason,
        "message": message,
    }
    write_json(run_root / "result/export-research-bundle-artifacts.json", {})
    write_json(run_root / "export-research-bundle.result.json", result)
    return result


def run_stage_00(conn: sqlite3.Connection, run_root: Path, input_path: str | None) -> dict[str, Any]:
    try:
        intent, limits = normalize_intent_and_limits(input_parameters(load_input(run_root, input_path)))
    except ValueError as exc:
        result = write_canceled(run_root, "invalid_input", str(exc))
        set_meta(conn, "final_output", result)
        record_stage(conn, "stage_00_runtime_setup", {"status": "canceled"})
        return result
    set_meta(conn, "intent", intent)
    set_meta(conn, "limits", limits)
    set_meta(
        conn,
        "runtime_policy",
        {
            "related_threshold": RELATED_THRESHOLD,
            "assessment_batch_size": ASSESSMENT_BATCH_SIZE,
            "candidate_budget": min(250, max(50, 2 * limits["max_related_papers"])),
        },
    )
    try:
        status = run_bridge_args(run_root, ["bridge", "status"], "stage00-bridge-status")
    except Exception as exc:  # noqa: BLE001
        add_diagnostic(conn, "host_bridge_unavailable", str(exc), severity="error")
        result = write_canceled(run_root, "host_unavailable", "Required Zotero Host Bridge access is unavailable.")
        set_meta(conn, "final_output", result)
        record_stage(conn, "stage_00_runtime_setup", {"status": "canceled"})
        return result
    result = {"status": "ready", "intent": intent, "limits": limits, "bridge": status}
    record_stage(conn, "stage_00_runtime_setup", result)
    render_resume_view(conn, run_root)
    return result


def require_finite(value: Any, label: str) -> float:
    try:
        parsed = float(value)
    except (TypeError, ValueError) as exc:
        raise ValueError(f"{label} must be a number") from exc
    if not math.isfinite(parsed) or parsed < 0 or parsed > 1:
        raise ValueError(f"{label} must be finite and between 0 and 1")
    return parsed


def submit_stage_10(conn: sqlite3.Connection, run_root: Path, payload: dict[str, Any]) -> dict[str, Any]:
    dimensions = payload.get("research_dimensions")
    queries = payload.get("queries")
    if not isinstance(dimensions, list) or not 1 <= len(dimensions) <= 12:
        raise ValueError("research_dimensions must contain 1-12 entries")
    normalized_dimensions = [clean(value) for value in dimensions]
    if any(not value for value in normalized_dimensions) or len(set(normalized_dimensions)) != len(normalized_dimensions):
        raise ValueError("research_dimensions must be unique non-empty strings")
    if not isinstance(queries, list) or not 2 <= len(queries) <= 8:
        raise ValueError("queries must contain 2-8 entries")
    normalized_queries: list[dict[str, str]] = []
    seen: set[str] = set()
    for entry in queries:
        if not isinstance(entry, dict):
            raise ValueError("each query must be an object")
        query = clean(entry.get("query"))
        focus = clean(entry.get("focus"))
        if not query or not focus or len(query) > 500:
            raise ValueError("each query requires query and focus")
        key = query.casefold()
        if key in seen:
            raise ValueError("queries must be unique")
        seen.add(key)
        normalized_queries.append({"query": query, "focus": focus})
    conn.execute("DELETE FROM queries")
    for index, row in enumerate(normalized_queries):
        conn.execute("INSERT INTO queries VALUES(?,?,?)", (row["query"], row["focus"], index))
    conn.commit()
    plan = {"research_dimensions": normalized_dimensions, "queries": normalized_queries}
    set_meta(conn, "query_plan", plan)
    record_stage(conn, "stage_10_intent_query_plan", plan)
    write_json(run_root / "runtime/views/02-query-plan.json", plan)
    render_resume_view(conn, run_root)
    return plan


def run_stage_20(conn: sqlite3.Connection, run_root: Path) -> dict[str, Any]:
    try:
        topics = page_topic_inventory(run_root)
    except Exception as exc:  # noqa: BLE001
        topics = []
        add_diagnostic(conn, "topic_inventory_unavailable", str(exc))
    conn.execute("DELETE FROM topic_candidates")
    for topic in topics:
        topic_id = clean(topic.get("topic_id") or topic.get("topicId") or topic.get("id"))
        if topic_id:
            conn.execute(
                "INSERT OR REPLACE INTO topic_candidates VALUES(?,?)",
                (topic_id, json.dumps(topic, ensure_ascii=False, sort_keys=True)),
            )
    search_candidates: dict[str, dict[str, Any]] = {}
    successful_searches = 0
    for index, row in enumerate(conn.execute("SELECT query_text FROM queries ORDER BY ordinal")):
        query = row[0]
        try:
            result = run_bridge_query(
                run_root,
                ["library", "item", "search"],
                {"query": query, "limit": 50},
                f"stage20-library-search-{index + 1}",
            )
            successful_searches += 1
            items = result if isinstance(result, list) else result.get("items", []) if isinstance(result, dict) else []
            for item in items:
                if isinstance(item, dict):
                    upsert_candidate(search_candidates, paper_ref_from_row(item), metadata=item, source=f"query:{query}")
        except Exception as exc:  # noqa: BLE001
            add_diagnostic(conn, "library_search_failed", str(exc), details={"query": query})
    set_meta(conn, "search_candidates", list(search_candidates.values()))
    topic_rows = [json.loads(row[0]) for row in conn.execute("SELECT row_json FROM topic_candidates ORDER BY topic_id")]
    write_json(run_root / "runtime/views/03-topic-candidates.json", {"topics": topic_rows})
    write_json(run_root / "runtime/views/04-library-search-candidates.json", {"papers": list(search_candidates.values())})
    result = {"topic_count": len(topic_rows), "search_candidate_count": len(search_candidates), "successful_searches": successful_searches}
    record_stage(conn, "stage_20_discovery_collect", result)
    limits = get_meta(conn, "limits", {})
    if int(limits.get("max_topics", 5)) == 0 or not topic_rows:
        conn.execute("DELETE FROM selected_topics")
        conn.commit()
        record_stage(conn, "stage_30_topic_assessment", {"topics": [], "automatic_library_only": True})
    render_resume_view(conn, run_root)
    return result


def submit_stage_30(conn: sqlite3.Connection, run_root: Path, payload: dict[str, Any]) -> dict[str, Any]:
    topics = payload.get("topics")
    if not isinstance(topics, list):
        raise ValueError("topics must be an array")
    limits = get_meta(conn, "limits", {})
    if len(topics) > int(limits.get("max_topics", 5)):
        raise ValueError("topics exceeds maxTopics")
    available = {row[0] for row in conn.execute("SELECT topic_id FROM topic_candidates")}
    normalized: list[dict[str, Any]] = []
    seen: set[str] = set()
    for entry in topics:
        if not isinstance(entry, dict):
            raise ValueError("topic assessment rows must be objects")
        topic_id = clean(entry.get("topic_id"))
        reason = clean(entry.get("reason"))
        relevance = require_finite(entry.get("relevance"), "topic relevance")
        if not topic_id or topic_id not in available or topic_id in seen or not reason:
            raise ValueError("topic assessments must use unique inventory topic ids and non-empty reasons")
        seen.add(topic_id)
        normalized.append({"topic_id": topic_id, "relevance": relevance, "reason": reason})
    normalized.sort(key=lambda row: (-row["relevance"], row["topic_id"]))
    conn.execute("DELETE FROM selected_topics")
    for row in normalized:
        conn.execute(
            "INSERT INTO selected_topics(topic_id,relevance,reason,source_paper_refs_json) VALUES(?,?,?,?)",
            (row["topic_id"], row["relevance"], row["reason"], "[]"),
        )
    conn.commit()
    record_stage(conn, "stage_30_topic_assessment", {"topics": normalized})
    write_json(run_root / "runtime/views/05-selected-topics.json", {"topics": normalized})
    render_resume_view(conn, run_root)
    return {"topics": normalized}


def graph_library_candidates(graph: Any) -> list[dict[str, Any]]:
    if not isinstance(graph, dict):
        return []
    rows = []
    for node in graph.get("nodes", []):
        if not isinstance(node, dict) or clean(node.get("kind")) != "library_paper":
            continue
        ref = paper_ref_from_row(node)
        if ref:
            rows.append({"paper_ref": ref, "metadata": node})
    return rows


def manifest_digest_paths(run_root: Path, manifest_path: Path) -> dict[str, str]:
    manifest = read_json(manifest_path, {})
    result: dict[str, str] = {}
    for paper in manifest.get("papers", []) if isinstance(manifest, dict) else []:
        if not isinstance(paper, dict):
            continue
        ref = clean(paper.get("paper_ref"))
        for artifact in paper.get("artifacts", []):
            if not isinstance(artifact, dict) or clean(artifact.get("artifact_type")) != "digest":
                continue
            content_file = clean(artifact.get("content_file"))
            target = run_root / content_file
            if ref and content_file and target.is_file():
                result[ref] = posix(target)
                break
    return result


def prepare_assessment_packets(conn: sqlite3.Connection, run_root: Path) -> list[str]:
    packet_dir = run_root / "runtime/views/stage-50-batches"
    packet_dir.mkdir(parents=True, exist_ok=True)
    candidates = load_candidates(conn)
    packet_paths: list[str] = []
    intent = get_meta(conn, "intent", {})
    topics = [dict(row) for row in conn.execute("SELECT topic_id,relevance,reason FROM selected_topics ORDER BY relevance DESC, topic_id")]
    for offset in range(0, len(candidates), ASSESSMENT_BATCH_SIZE):
        batch = candidates[offset : offset + ASSESSMENT_BATCH_SIZE]
        batch_id = f"batch-{offset // ASSESSMENT_BATCH_SIZE + 1:03d}"
        rows = []
        for candidate in batch:
            digest_excerpt = ""
            digest_path = clean(candidate.get("digest_path"))
            if digest_path and Path(digest_path).is_file():
                digest_excerpt = Path(digest_path).read_text(encoding="utf-8", errors="replace")[:12000]
            rows.append({**candidate, "digest_excerpt": digest_excerpt})
        packet = {
            "schema_id": "research_bundle.paper_assessment_packet",
            "batch_id": batch_id,
            "intent": intent,
            "selected_topics": topics,
            "candidates": rows,
        }
        path = packet_dir / f"{batch_id}.json"
        write_json(path, packet)
        packet_paths.append(posix(path))
    set_meta(conn, "assessment_packets", packet_paths)
    return packet_paths


def run_stage_40(conn: sqlite3.Connection, run_root: Path) -> dict[str, Any]:
    pending = get_meta(conn, "pending_delivery", {})
    if pending:
        manifest_path = run_root / clean(pending.get("manifest_file"))
        if not manifest_path.is_file():
            raise ExternalActionRequired(clean(pending.get("message")) or "Remote artifact delivery must be downloaded and unpacked")
        digest_paths = manifest_digest_paths(run_root, manifest_path)
        for ref, digest_path in digest_paths.items():
            conn.execute("UPDATE paper_candidates SET digest_path=? WHERE paper_ref=?", (digest_path, ref))
        conn.commit()
        set_meta(conn, "pending_delivery", {})
        packets = prepare_assessment_packets(conn, run_root)
        result = {"candidate_count": len(load_candidates(conn)), "assessment_batches": len(packets), "resumed_delivery": True}
        record_stage(conn, "stage_40_evidence_prepare", result)
        render_resume_view(conn, run_root)
        return result

    candidates: dict[str, dict[str, Any]] = {}
    for row in get_meta(conn, "search_candidates", []):
        if isinstance(row, dict):
            upsert_candidate(
                candidates,
                clean(row.get("paper_ref")),
                metadata=row.get("metadata") if isinstance(row.get("metadata"), dict) else {},
                source="library_search",
            )
            for source in row.get("sources", []):
                if clean(source):
                    upsert_candidate(candidates, clean(row.get("paper_ref")), source=clean(source))

    selected_rows = list(conn.execute("SELECT topic_id FROM selected_topics ORDER BY relevance DESC, topic_id"))
    for index, topic_row in enumerate(selected_rows):
        topic_id = topic_row[0]
        try:
            review = run_bridge_query(
                run_root,
                ["synthesis", "topic", "get-review-input"],
                {"topicId": topic_id, "maxGraphNodes": 100, "maxGraphEdges": 200, "maxChars": 20000, "includePaperArtifacts": False},
                f"stage40-topic-review-{index + 1}",
            )
            resolved_set = (
                review.get("resolved_paper_set")
                or review.get("resolvedPaperSet")
                or {}
            ) if isinstance(review, dict) else {}
            refs = sorted(collect_paper_refs(resolved_set))
            conn.execute(
                "UPDATE selected_topics SET source_paper_refs_json=? WHERE topic_id=?",
                (json.dumps(refs, ensure_ascii=False), topic_id),
            )
            for ref in refs:
                upsert_candidate(candidates, ref, source=f"topic:{topic_id}", topic_id=topic_id)
        except Exception as exc:  # noqa: BLE001
            add_diagnostic(conn, "topic_review_input_unavailable", str(exc), details={"topic_id": topic_id})
    conn.commit()

    seed_refs = sorted(candidates)
    if seed_refs:
        try:
            graph = run_bridge_query(
                run_root,
                ["synthesis", "graph", "query-cluster"],
                {"source_paper_refs": seed_refs[:250], "cluster_policy": "bounded_external", "max_external_nodes": 0, "max_nodes": 500, "max_edges": 1000},
                "stage40-graph-cluster",
            )
            for row in graph_library_candidates(graph):
                upsert_candidate(candidates, row["paper_ref"], metadata=row["metadata"], source="graph_cluster")
        except Exception as exc:  # noqa: BLE001
            add_diagnostic(conn, "graph_cluster_unavailable", str(exc))

    policy = get_meta(conn, "runtime_policy", {})
    budget = int(policy.get("candidate_budget", 160))
    ranked = sorted(
        candidates.values(),
        key=lambda row: (
            -int(any(clean(source).startswith("topic:") for source in row.get("sources", []))),
            -len(row.get("sources", [])),
            row["paper_ref"],
        ),
    )
    if len(ranked) > budget:
        add_diagnostic(conn, "candidate_pool_truncated", "Candidate pool exceeded the deterministic assessment budget.", details={"available": len(ranked), "budget": budget})
    ranked = ranked[:budget]
    save_candidates(conn, ranked)
    refs = [row["paper_ref"] for row in ranked]

    if refs:
        try:
            cursor = "0"
            page = 0
            while True:
                index_data = run_bridge_query(
                    run_root,
                    ["synthesis", "index", "reference", "get"],
                    {"sourceRefs": refs, "cursor": cursor, "limit": 100},
                    f"stage40-reference-index-{page + 1}",
                )
                next_cursor = next_page_cursor(index_data, cursor)
                if next_cursor is None:
                    break
                cursor = next_cursor
                page += 1
        except Exception as exc:  # noqa: BLE001
            add_diagnostic(conn, "reference_index_unavailable", str(exc))

        try:
            export = run_bridge_query(
                run_root,
                ["synthesis", "artifact", "export-filtered"],
                {"run_root": str(run_root), "paper_refs": refs, "artifact_types": ["digest"]},
                "stage40-artifact-export",
            )
            if not isinstance(export, dict):
                export = {}
            delivery = export.get("delivery") if isinstance(export.get("delivery"), dict) else {}
            manifest_file = clean(export.get("manifest_file")) or "runtime/payloads/paper-artifacts-manifest.json"
            if clean(delivery.get("mode")) == "bridge-download":
                delivery_path = run_root / "runtime/payloads/paper-artifacts-export-delivery.json"
                write_json(delivery_path, {"delivery": delivery, "export_data": export})
                message = "; ".join(
                    value
                    for value in [
                        "Remote paper artifact bundle must be downloaded and unpacked",
                        clean(delivery.get("downloadCommand")),
                        clean(delivery.get("unpackHint")),
                    ]
                    if value
                )
                set_meta(conn, "pending_delivery", {"manifest_file": manifest_file, "delivery_path": posix(delivery_path), "message": message})
                raise ExternalActionRequired(message)
            manifest_path = run_root / manifest_file
            digest_paths = manifest_digest_paths(run_root, manifest_path)
            for ref, digest_path in digest_paths.items():
                conn.execute("UPDATE paper_candidates SET digest_path=? WHERE paper_ref=?", (digest_path, ref))
            conn.commit()
        except ExternalActionRequired:
            raise
        except Exception as exc:  # noqa: BLE001
            add_diagnostic(conn, "digest_export_unavailable", str(exc))

    for index, candidate in enumerate(load_candidates(conn)):
        if clean(candidate.get("digest_path")):
            continue
        ref = candidate["paper_ref"]
        library_id, key = ref.split(":", 1)
        try:
            detail = run_bridge_args(
                run_root,
                ["library", "item", "get", "--key", key, "--library-id", library_id],
                f"stage40-item-detail-{index + 1}",
            )
            if isinstance(detail, dict):
                abstract_text = clean((detail.get("fields") or {}).get("abstractNote") if isinstance(detail.get("fields"), dict) else "")
                metadata = {**candidate.get("metadata", {}), **detail}
                conn.execute(
                    "UPDATE paper_candidates SET metadata_json=?,abstract_text=? WHERE paper_ref=?",
                    (json.dumps(metadata, ensure_ascii=False, sort_keys=True), abstract_text, ref),
                )
        except Exception as exc:  # noqa: BLE001
            add_diagnostic(conn, "item_detail_unavailable", str(exc), details={"paper_ref": ref})
    conn.commit()
    packets = prepare_assessment_packets(conn, run_root)
    result = {"candidate_count": len(load_candidates(conn)), "assessment_batches": len(packets)}
    record_stage(conn, "stage_40_evidence_prepare", result)
    render_resume_view(conn, run_root)
    return result


def next_assessment_packet(conn: sqlite3.Connection) -> str:
    assessed = {row[0] for row in conn.execute("SELECT paper_ref FROM paper_assessments")}
    for packet_path in get_meta(conn, "assessment_packets", []):
        packet = read_json(Path(packet_path), {})
        refs = {clean(row.get("paper_ref")) for row in packet.get("candidates", []) if isinstance(row, dict)}
        if refs - assessed:
            return packet_path
    return ""


def submit_stage_50(conn: sqlite3.Connection, run_root: Path, payload: dict[str, Any]) -> dict[str, Any]:
    packet_path = next_assessment_packet(conn)
    if not packet_path:
        raise ValueError("no paper assessment batch is pending")
    packet = read_json(Path(packet_path), {})
    batch_id = clean(payload.get("batch_id"))
    if batch_id != clean(packet.get("batch_id")):
        raise ValueError("batch_id does not match the pending packet")
    expected = [clean(row.get("paper_ref")) for row in packet.get("candidates", [])]
    assessments = payload.get("assessments")
    if not isinstance(assessments, list) or len(assessments) != len(expected):
        raise ValueError("assessments must cover every candidate in the pending batch exactly once")
    selected_topics = {row[0] for row in conn.execute("SELECT topic_id FROM selected_topics")}
    allowed_evidence = {"metadata", "abstract", "digest", "topic_context"}
    normalized: list[dict[str, Any]] = []
    seen: set[str] = set()
    for row in assessments:
        if not isinstance(row, dict):
            raise ValueError("assessment rows must be objects")
        ref = clean(row.get("paper_ref"))
        relevance = require_finite(row.get("semantic_relevance"), "semantic_relevance")
        matched = row.get("matched_topic_ids")
        evidence = row.get("evidence_basis")
        caveats = row.get("caveats")
        reason = clean(row.get("reason"))
        if ref not in expected or ref in seen or not reason:
            raise ValueError("assessment paper refs must uniquely match the pending packet")
        if not isinstance(matched, list) or any(clean(topic) not in selected_topics for topic in matched):
            raise ValueError("matched_topic_ids must contain only selected topic ids")
        matched_ids = sorted({clean(topic) for topic in matched if clean(topic)})
        if not isinstance(evidence, list) or not evidence or any(clean(value) not in allowed_evidence for value in evidence):
            raise ValueError("evidence_basis contains an unsupported value")
        if not isinstance(caveats, list) or any(not clean(value) for value in caveats):
            raise ValueError("caveats must be an array of non-empty strings")
        seen.add(ref)
        normalized.append(
            {
                "paper_ref": ref,
                "semantic_relevance": relevance,
                "matched_topic_ids": matched_ids,
                "reason": reason,
                "evidence_basis": sorted({clean(value) for value in evidence}),
                "caveats": [clean(value) for value in caveats],
            }
        )
    if seen != set(expected):
        raise ValueError("assessment batch coverage is incomplete")
    for row in normalized:
        conn.execute(
            "INSERT OR REPLACE INTO paper_assessments VALUES(?,?,?,?,?,?,?)",
            (
                row["paper_ref"],
                batch_id,
                row["semantic_relevance"],
                json.dumps(row["matched_topic_ids"], ensure_ascii=False),
                row["reason"],
                json.dumps(row["evidence_basis"], ensure_ascii=False),
                json.dumps(row["caveats"], ensure_ascii=False),
            ),
        )
    conn.commit()
    remaining = next_assessment_packet(conn)
    if not remaining:
        record_stage(conn, "stage_50_paper_assessment", {"assessment_count": conn.execute("SELECT COUNT(*) FROM paper_assessments").fetchone()[0]})
    render_resume_view(conn, run_root)
    return {"batch_id": batch_id, "accepted": len(normalized), "remaining_packet": remaining}


def clamp01(value: Any) -> float:
    try:
        parsed = float(value)
    except (TypeError, ValueError):
        return 0.0
    return min(1.0, max(0.0, parsed)) if math.isfinite(parsed) else 0.0


def graph_importance(metric: dict[str, Any]) -> float:
    return max(
        clamp01(metric.get("foundation_score")),
        clamp01(metric.get("frontier_score")),
        clamp01(metric.get("pagerank_norm")),
        clamp01(metric.get("in_degree_norm")),
    )


def paper_score(semantic: float, graph: float, topic: float, readiness: float, graph_available: bool) -> float:
    if not graph_available:
        return semantic * 0.80 + topic * 0.15 + readiness * 0.05
    return semantic * 0.60 + graph * 0.20 + topic * 0.15 + readiness * 0.05


def page_graph_metrics(run_root: Path, refs: list[str]) -> tuple[dict[str, dict[str, Any]], str, str, bool]:
    items: dict[str, dict[str, Any]] = {}
    cursor = "0"
    graph_hash = ""
    status = "missing"
    available = False
    page = 0
    while True:
        data = run_bridge_query(
            run_root,
            ["synthesis", "graph", "get-metrics"],
            {"paperRefs": refs, "cursor": cursor, "limit": 100},
            f"stage60-graph-metrics-{page + 1}",
        )
        if not isinstance(data, dict):
            break
        status = clean(data.get("status")) or "missing"
        graph_hash = clean(data.get("graph_hash"))
        available = bool(data.get("ok")) and status == "ready" and not bool((data.get("diagnostics") or {}).get("stale"))
        for row in data.get("metrics", []):
            if isinstance(row, dict) and clean(row.get("paper_ref")):
                items[clean(row.get("paper_ref"))] = row
        next_cursor = next_page_cursor(data, cursor)
        if next_cursor is None:
            break
        cursor = next_cursor
        page += 1
    return items, status, graph_hash, available


def readiness_for_paper(run_root: Path, paper_ref: str, ordinal: int) -> tuple[float, dict[str, Any]]:
    library_id, key = paper_ref.split(":", 1)
    result = run_bridge_query(
        run_root,
        ["library", "readiness", "audit"],
        {"libraryId": int(library_id), "query": key, "checks": ["pdf", "markdown"], "limit": 10},
        f"stage60-readiness-{ordinal}",
    )
    items = result.get("items", []) if isinstance(result, dict) else []
    exact = next(
        (
            row
            for row in items
            if isinstance(row, dict)
            and clean(row.get("key")) == key
            and int(row.get("libraryId", row.get("library_id", 0)) or 0) == int(library_id)
        ),
        None,
    )
    if not exact:
        return 0.0, {"status": "missing", "paper_ref": paper_ref}
    readiness = exact.get("readiness") if isinstance(exact.get("readiness"), dict) else {}
    markdown = clean(readiness.get("markdown")) == "present"
    pdf = clean(readiness.get("pdf")) == "present"
    return (1.0 if markdown else 0.8 if pdf else 0.0), {"status": "available", "readiness": readiness, "evidence": exact.get("evidence") or {}}


def run_stage_60(conn: sqlite3.Connection, run_root: Path) -> dict[str, Any]:
    rows = list(
        conn.execute(
            "SELECT a.*,c.sources_json,c.topic_ids_json FROM paper_assessments a JOIN paper_candidates c USING(paper_ref) WHERE a.semantic_relevance>=?",
            (RELATED_THRESHOLD,),
        )
    )
    refs = sorted(row["paper_ref"] for row in rows)
    metrics: dict[str, dict[str, Any]] = {}
    graph_status = "missing"
    graph_hash = ""
    graph_ready = False
    if refs:
        try:
            metrics, graph_status, graph_hash, graph_ready = page_graph_metrics(run_root, refs)
        except Exception as exc:  # noqa: BLE001
            add_diagnostic(conn, "graph_metrics_unavailable", str(exc))
    if refs and not graph_ready:
        add_diagnostic(conn, "graph_metrics_fallback", "Citation graph metrics are missing or stale; fallback score weights were used.", details={"status": graph_status})

    topic_ids = {row[0] for row in conn.execute("SELECT topic_id FROM selected_topics")}
    papers: list[dict[str, Any]] = []
    for ordinal, row in enumerate(rows, start=1):
        ref = row["paper_ref"]
        metric = metrics.get(ref, {})
        per_paper_graph = graph_ready and bool(metric)
        importance = graph_importance(metric) if per_paper_graph else 0.0
        try:
            material, readiness_evidence = readiness_for_paper(run_root, ref, ordinal)
        except Exception as exc:  # noqa: BLE001
            material, readiness_evidence = 0.0, {"status": "unavailable", "message": str(exc)}
            add_diagnostic(conn, "material_readiness_unavailable", str(exc), details={"paper_ref": ref})
        source_topics = set(json.loads(row["topic_ids_json"]))
        semantic_topics = set(json.loads(row["matched_topic_ids_json"]))
        matched_topics = sorted((source_topics | semantic_topics) & topic_ids)
        topic_coverage = len(matched_topics) / len(topic_ids) if topic_ids else 0.0
        semantic = float(row["semantic_relevance"])
        score = paper_score(semantic, importance, topic_coverage, material, per_paper_graph)
        papers.append(
            {
                "paper_ref": ref,
                "semantic_relevance": semantic,
                "matched_topic_ids": matched_topics,
                "topic_coverage": topic_coverage,
                "candidate_sources": json.loads(row["sources_json"]),
                "graph_available": per_paper_graph,
                "graph_status": graph_status if per_paper_graph else "unavailable",
                "graph_hash": graph_hash if per_paper_graph else "",
                "graph_importance": importance,
                "graph_metrics": metric if per_paper_graph else {},
                "material_readiness": material,
                "readiness_evidence": readiness_evidence,
                "score": score,
                "reason": row["reason"],
                "evidence_basis": json.loads(row["evidence_basis_json"]),
                "caveats": json.loads(row["caveats_json"]),
            }
        )
        conn.execute(
            "INSERT OR REPLACE INTO graph_metrics VALUES(?,?,?,?,?)",
            (ref, 1 if per_paper_graph else 0, graph_status if per_paper_graph else "unavailable", graph_hash if per_paper_graph else "", json.dumps(metric if per_paper_graph else {}, ensure_ascii=False, sort_keys=True)),
        )
        conn.execute(
            "INSERT OR REPLACE INTO material_readiness VALUES(?,?,?)",
            (ref, material, json.dumps(readiness_evidence, ensure_ascii=False, sort_keys=True)),
        )
    conn.commit()
    papers.sort(key=lambda row: (-row["score"], row["paper_ref"]))
    limits = get_meta(conn, "limits", {})
    papers = papers[: int(limits.get("max_related_papers", 80))]
    max_core = int(limits.get("max_core_papers", 20))
    for index, paper in enumerate(papers):
        paper["role"] = "core" if index < max_core else "related"
    topics = [
        {"topic_id": row[0], "relevance": row[1], "reason": row[2]}
        for row in conn.execute("SELECT topic_id,relevance,reason FROM selected_topics ORDER BY relevance DESC, topic_id")
    ]
    selection = {
        "schema_id": "research_bundle.selection",
        "schema_version": "1.0.0",
        "intent": get_meta(conn, "intent", {}),
        "limits": limits,
        "query_plan": get_meta(conn, "query_plan", {}),
        "topics": topics,
        "papers": papers,
        "diagnostics": diagnostics(conn),
    }
    set_meta(conn, "selection", selection)
    record_stage(conn, "stage_60_enrich_and_select", {"related_count": len(papers), "core_count": sum(1 for paper in papers if paper["role"] == "core")})
    write_json(run_root / "runtime/views/06-selection-preview.json", selection)
    render_resume_view(conn, run_root)
    return {"related_count": len(papers), "core_count": sum(1 for paper in papers if paper["role"] == "core")}


def validate_selection(selection: Any) -> None:
    if not isinstance(selection, dict) or selection.get("schema_id") != "research_bundle.selection":
        raise ValueError("selection schema_id is invalid")
    intent = selection.get("intent")
    limits = selection.get("limits")
    papers = selection.get("papers")
    topics = selection.get("topics")
    if not isinstance(intent, dict) or not clean(intent.get("paper_title")) or not clean(intent.get("research_content")):
        raise ValueError("selection intent is incomplete")
    if not isinstance(limits, dict) or not isinstance(papers, list) or not isinstance(topics, list):
        raise ValueError("selection limits, topics, and papers are required")
    if len(topics) > int(limits.get("max_topics", 5)) or len(papers) > int(limits.get("max_related_papers", 80)):
        raise ValueError("selection exceeds configured limits")
    refs: set[str] = set()
    core_count = 0
    prior_key: tuple[float, str] | None = None
    for index, paper in enumerate(papers):
        if not isinstance(paper, dict):
            raise ValueError("selection papers must be objects")
        ref = clean(paper.get("paper_ref"))
        semantic = require_finite(paper.get("semantic_relevance"), "semantic_relevance")
        score = float(paper.get("score"))
        if not ref or ref in refs or semantic < RELATED_THRESHOLD or not math.isfinite(score):
            raise ValueError("selection paper identity, threshold, or score is invalid")
        refs.add(ref)
        key = (-score, ref)
        if prior_key is not None and key < prior_key:
            raise ValueError("selection papers are not stably score-sorted")
        prior_key = key
        if paper.get("role") == "core":
            if index != core_count:
                raise ValueError("core papers must be the highest-scoring prefix")
            core_count += 1
        elif paper.get("role") != "related":
            raise ValueError("selection paper role is invalid")
    if core_count > int(limits.get("max_core_papers", 20)):
        raise ValueError("selection exceeds maxCorePapers")


def run_stage_70(conn: sqlite3.Connection, run_root: Path) -> dict[str, Any]:
    selection = get_meta(conn, "selection", {})
    validate_selection(selection)
    papers = selection.get("papers", []) if isinstance(selection, dict) else []
    if not papers:
        result = write_canceled(run_root, "no_related_literature", "No related Zotero literature met the relevance threshold.")
        set_meta(conn, "final_output", result)
        record_stage(conn, "stage_70_render_result", {"status": "canceled"})
        render_resume_view(conn, run_root)
        return result
    result_dir = run_root / "result"
    selection_path = result_dir / "research-selection.json"
    audit_path = result_dir / "research-selection-audit.json"
    artifact_path = result_dir / "export-research-bundle-artifacts.json"
    write_json(selection_path, selection)
    write_json(
        audit_path,
        {
            "schema_id": "research_bundle.selection_audit",
            "schema_version": "1.0.0",
            "runtime_policy": get_meta(conn, "runtime_policy", {}),
            "completed_stages": sorted(completed_stages(conn) | {"stage_70_render_result"}),
            "diagnostics": selection.get("diagnostics", []),
        },
    )
    write_json(
        artifact_path,
        {
            "selection_manifest": posix(selection_path),
            "selection_audit": posix(audit_path),
        },
    )
    intent = selection["intent"]
    result = {
        "kind": "research_bundle_selection",
        "title": intent["paper_title"],
        "article_type": intent["article_type"],
        "topic_count": len(selection.get("topics", [])),
        "core_paper_count": sum(1 for paper in papers if paper.get("role") == "core"),
        "related_paper_count": len(papers),
        "selection_manifest_path": posix(selection_path),
        "artifact_manifest_path": posix(artifact_path),
    }
    write_json(run_root / "export-research-bundle.result.json", result)
    set_meta(conn, "final_output", result)
    record_stage(conn, "stage_70_render_result", {"status": "completed", "result": result})
    render_resume_view(conn, run_root)
    return result


def current_stage(conn: sqlite3.Connection) -> str:
    if get_meta(conn, "final_output", None) is not None:
        return "completed"
    completed = completed_stages(conn)
    if "stage_40_evidence_prepare" in completed and "stage_50_paper_assessment" not in completed:
        if not next_assessment_packet(conn):
            record_stage(conn, "stage_50_paper_assessment", {"assessment_count": 0})
            completed.add("stage_50_paper_assessment")
    for stage in STAGES:
        if stage not in completed:
            return stage
    return "completed"


def run_current_command_stage(db_path: str, input_path: str | None) -> dict[str, Any]:
    run_root = run_root_from_db(db_path)
    conn = initialize_db(db_path)
    try:
        stage = current_stage(conn)
        handlers = {
            "stage_00_runtime_setup": lambda: run_stage_00(conn, run_root, input_path),
            "stage_20_discovery_collect": lambda: run_stage_20(conn, run_root),
            "stage_40_evidence_prepare": lambda: run_stage_40(conn, run_root),
            "stage_60_enrich_and_select": lambda: run_stage_60(conn, run_root),
            "stage_70_render_result": lambda: run_stage_70(conn, run_root),
        }
        if stage not in handlers:
            raise ValueError(f"current stage {stage} requires a payload or is already completed")
        try:
            result = handlers[stage]()
            record_receipt(conn, stage, "run", "completed", result)
            return {"stage": stage, "result": result}
        except ExternalActionRequired as exc:
            record_receipt(conn, stage, "run", "external_action_required", {"message": str(exc)})
            raise
    finally:
        conn.close()


def submit_current_payload_stage(
    db_path: str,
    payload_path: str,
    input_path: str | None,
) -> dict[str, Any]:
    del input_path
    run_root = run_root_from_db(db_path)
    conn = initialize_db(db_path)
    try:
        stage = current_stage(conn)
        payload = read_json(Path(payload_path).resolve(), None)
        if not isinstance(payload, dict):
            raise ValueError("payload must be a JSON object")
        handlers = {
            "stage_10_intent_query_plan": lambda: submit_stage_10(conn, run_root, payload),
            "stage_30_topic_assessment": lambda: submit_stage_30(conn, run_root, payload),
            "stage_50_paper_assessment": lambda: submit_stage_50(conn, run_root, payload),
        }
        if stage not in handlers:
            raise ValueError(f"current stage {stage} does not accept a payload")
        result = handlers[stage]()
        record_receipt(conn, stage, "submit", "completed", {"payload_path": posix(Path(payload_path)), "result": result})
        return {"stage": stage, "result": result}
    finally:
        conn.close()
