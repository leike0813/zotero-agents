from __future__ import annotations

import json
import math
import os
import re
import shutil
import sqlite3
import subprocess
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable


SKILL_ID = "collection-collector"
DB_RELATIVE_PATH = Path("runtime/collection-collector.sqlite")
CANDIDATE_LIMIT = 250
BATCH_SIZE = 20
INCLUSION_THRESHOLD = 0.65
PAPER_REF_RE = re.compile(r"^([1-9][0-9]*):([A-Za-z0-9]+)$")
EXCLUDED_ITEM_TYPES = {"attachment", "note", "annotation"}


class HostUnavailableError(RuntimeError):
    pass


class TargetCollectionNotFoundError(RuntimeError):
    pass


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def clean(value: Any) -> str:
    return str(value or "").strip()


def write_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(
        json.dumps(value, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    temporary.replace(path)


def read_json(path: Path, default: Any = None) -> Any:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError:
        return default


def run_root_from_db(db_path: str | Path) -> Path:
    path = Path(db_path).resolve()
    if path.parent.name == "runtime":
        return path.parent.parent
    return Path.cwd().resolve()


def connect(db_path: str | Path) -> sqlite3.Connection:
    path = Path(db_path)
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
          result_json TEXT NOT NULL,
          completed_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS inventory (
          paper_ref TEXT PRIMARY KEY,
          item_json TEXT NOT NULL,
          existing INTEGER NOT NULL DEFAULT 0
        );
        CREATE TABLE IF NOT EXISTS topics (
          topic_id TEXT PRIMARY KEY,
          topic_json TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS selected_topics (
          topic_id TEXT PRIMARY KEY,
          relevance REAL NOT NULL,
          reason TEXT NOT NULL,
          source_refs_json TEXT NOT NULL DEFAULT '[]'
        );
        CREATE TABLE IF NOT EXISTS candidates (
          paper_ref TEXT PRIMARY KEY,
          rank_score REAL NOT NULL,
          matched_terms_json TEXT NOT NULL,
          matched_topics_json TEXT NOT NULL,
          packet_id TEXT,
          ordinal INTEGER NOT NULL,
          item_json TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS assessments (
          paper_ref TEXT PRIMARY KEY,
          semantic_relevance REAL NOT NULL,
          evidence_basis_json TEXT NOT NULL,
          matched_topics_json TEXT NOT NULL,
          reason TEXT NOT NULL,
          caveats_json TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS diagnostics (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          code TEXT NOT NULL,
          details_json TEXT NOT NULL,
          created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS action_receipts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          operation TEXT NOT NULL,
          request_json TEXT NOT NULL,
          response_json TEXT NOT NULL,
          created_at TEXT NOT NULL
        );
        """
    )
    conn.commit()
    return conn


def set_meta(conn: sqlite3.Connection, key: str, value: Any) -> None:
    conn.execute(
        "INSERT OR REPLACE INTO meta(key, value_json) VALUES (?, ?)",
        (key, json.dumps(value, ensure_ascii=False)),
    )
    conn.commit()


def get_meta(conn: sqlite3.Connection, key: str, default: Any = None) -> Any:
    row = conn.execute("SELECT value_json FROM meta WHERE key = ?", (key,)).fetchone()
    return json.loads(row[0]) if row else default


def record_stage(conn: sqlite3.Connection, stage_id: str, result: Any) -> None:
    conn.execute(
        "INSERT OR REPLACE INTO stage_state(stage_id, result_json, completed_at) VALUES (?, ?, ?)",
        (stage_id, json.dumps(result, ensure_ascii=False), utc_now()),
    )
    conn.commit()


def completed_stages(conn: sqlite3.Connection) -> set[str]:
    return {
        str(row[0])
        for row in conn.execute("SELECT stage_id FROM stage_state").fetchall()
    }


def add_diagnostic(conn: sqlite3.Connection, code: str, **details: Any) -> None:
    conn.execute(
        "INSERT INTO diagnostics(code, details_json, created_at) VALUES (?, ?, ?)",
        (code, json.dumps(details, ensure_ascii=False), utc_now()),
    )
    conn.commit()


def diagnostics(conn: sqlite3.Connection) -> list[dict[str, Any]]:
    rows = conn.execute(
        "SELECT code, details_json FROM diagnostics ORDER BY id"
    ).fetchall()
    return [
        {"code": row["code"], **json.loads(row["details_json"])} for row in rows
    ]


def load_input(run_root: Path, input_path: str | None) -> dict[str, Any]:
    candidates: list[Path] = []
    if input_path:
        candidates.append(Path(input_path))
    candidates.append(run_root / "runtime/input.json")
    candidates.extend(sorted(run_root.glob(".acp/*/input_manifest.json")))
    candidates.extend(sorted(run_root.glob(".audit/*/input_manifest.json")))
    for path in candidates:
        value = read_json(path)
        if isinstance(value, dict):
            return value
    return {}


def input_parameters(value: dict[str, Any]) -> dict[str, Any]:
    for candidate in (
        value.get("parameter"),
        value.get("request", {}).get("parameter")
        if isinstance(value.get("request"), dict)
        else None,
    ):
        if isinstance(candidate, dict):
            return candidate
    return {}


def normalize_input(value: dict[str, Any]) -> dict[str, Any]:
    parameters = input_parameters(value)
    collection = clean(parameters.get("collection"))
    collection_scope = clean(parameters.get("collectionScope"))
    match = PAPER_REF_RE.fullmatch(collection)
    if not match or not collection_scope:
        raise ValueError("collection and collectionScope are required")
    return {
        "collection": collection,
        "collection_scope": collection_scope,
        "library_id": int(match.group(1)),
        "collection_key": match.group(2),
    }


def bridge_executable(run_root: Path) -> Path:
    configured = clean(os.environ.get("ZOTERO_BRIDGE_BIN"))
    candidates = [
        Path(configured) if configured else None,
        run_root / ".zotero-bridge/bin/zotero-bridge",
        run_root / ".zotero-bridge/bin/zotero-bridge.exe",
    ]
    located = shutil.which("zotero-bridge")
    if located:
        candidates.append(Path(located))
    for candidate in candidates:
        if candidate and candidate.exists():
            return candidate.resolve()
    raise HostUnavailableError("zotero-bridge executable is unavailable")


def unwrap_bridge(value: Any) -> Any:
    current = value
    for _ in range(3):
        if not isinstance(current, dict):
            break
        if "data" in current and isinstance(current["data"], (dict, list)):
            current = current["data"]
            continue
        if "result" in current and isinstance(current["result"], (dict, list)):
            current = current["result"]
            continue
        break
    return current


def run_bridge(
    conn: sqlite3.Connection,
    run_root: Path,
    operation: str,
    args: list[str],
    payload: dict[str, Any] | None = None,
) -> Any:
    executable = bridge_executable(run_root)
    command = [str(executable), *args]
    request = {"command": command, "payload": payload or {}}
    if payload is not None:
        command.extend(["--query", json.dumps(payload, ensure_ascii=False)])
    completed = subprocess.run(
        command,
        cwd=run_root,
        capture_output=True,
        text=True,
        encoding="utf-8",
        check=False,
    )
    if completed.returncode != 0:
        raise RuntimeError(
            clean(completed.stderr) or clean(completed.stdout) or f"{operation} failed"
        )
    try:
        response = json.loads(completed.stdout)
    except json.JSONDecodeError as error:
        raise RuntimeError(f"{operation} returned invalid JSON") from error
    conn.execute(
        "INSERT INTO action_receipts(operation, request_json, response_json, created_at) VALUES (?, ?, ?, ?)",
        (
            operation,
            json.dumps(request, ensure_ascii=False),
            json.dumps(response, ensure_ascii=False),
            utc_now(),
        ),
    )
    conn.commit()
    receipt_id = conn.execute("SELECT last_insert_rowid()").fetchone()[0]
    write_json(run_root / f"runtime/host/{receipt_id:04d}-{operation}.json", response)
    return unwrap_bridge(response)


def rows_from_page(value: Any, keys: Iterable[str]) -> list[dict[str, Any]]:
    if isinstance(value, list):
        return [row for row in value if isinstance(row, dict)]
    if not isinstance(value, dict):
        return []
    for key in keys:
        rows = value.get(key)
        if isinstance(rows, list):
            return [row for row in rows if isinstance(row, dict)]
    return []


def page_cursor(value: Any) -> tuple[bool, Any]:
    if not isinstance(value, dict):
        return False, None
    has_more = value.get("hasMore") is True
    next_cursor = value.get("nextCursor")
    return has_more and next_cursor is not None, next_cursor


def page_bridge(
    conn: sqlite3.Connection,
    run_root: Path,
    operation: str,
    args: list[str],
    base_payload: dict[str, Any],
    row_keys: Iterable[str],
) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    cursor: Any = "0"
    for _ in range(10000):
        payload = {**base_payload, "cursor": cursor, "limit": 100}
        page = run_bridge(conn, run_root, operation, args, payload)
        rows.extend(rows_from_page(page, row_keys))
        has_more, cursor = page_cursor(page)
        if not has_more:
            break
    else:
        raise RuntimeError(f"{operation} exceeded pagination guard")
    return rows


def item_type(row: dict[str, Any]) -> str:
    return clean(row.get("itemType", row.get("item_type")))


def paper_ref_from_row(row: dict[str, Any], fallback_library_id: int = 0) -> str:
    direct = clean(row.get("paperRef", row.get("paper_ref")))
    if PAPER_REF_RE.fullmatch(direct):
        return direct
    library_id = int(row.get("libraryId", row.get("library_id", fallback_library_id)) or 0)
    key = clean(row.get("key", row.get("itemKey", row.get("item_key"))))
    return f"{library_id}:{key}" if library_id > 0 and key else ""


def topic_id_from_row(row: dict[str, Any]) -> str:
    return clean(row.get("topicId", row.get("topic_id", row.get("id"))))


def compact_inventory_item(row: dict[str, Any], paper_ref: str) -> dict[str, Any]:
    return {
        **row,
        "paper_ref": paper_ref,
        "title": clean(row.get("title")) or paper_ref,
        "item_type": item_type(row),
    }


def write_canceled(run_root: Path, reason: str, message: str) -> dict[str, Any]:
    result = {
        "kind": "collection_collector_canceled",
        "status": "canceled",
        "reason": reason,
        "message": message,
    }
    write_json(run_root / "collection-collector.result.json", result)
    return result


def run_stage_00(
    conn: sqlite3.Connection, run_root: Path, input_path: str | None
) -> dict[str, Any]:
    try:
        normalized = normalize_input(load_input(run_root, input_path))
    except ValueError as error:
        result = write_canceled(run_root, "invalid_input", str(error))
        set_meta(conn, "terminal", True)
        record_stage(conn, "stage_00_runtime_setup", result)
        return result
    try:
        run_bridge(conn, run_root, "bridge-status", ["bridge", "status"])
    except Exception as error:
        result = write_canceled(run_root, "host_unavailable", clean(error))
        set_meta(conn, "terminal", True)
        record_stage(conn, "stage_00_runtime_setup", result)
        return result
    set_meta(conn, "input", normalized)
    write_json(run_root / "runtime/views/01-input.json", normalized)
    result = {"status": "ready", **normalized}
    record_stage(conn, "stage_00_runtime_setup", result)
    return result


def run_stage_10(conn: sqlite3.Connection, run_root: Path) -> dict[str, Any]:
    value = get_meta(conn, "input", {})
    library_id = int(value["library_id"])
    collection_key = value["collection_key"]
    try:
        collection_rows = page_bridge(
            conn,
            run_root,
            "collection-items",
            ["library", "items", "list"],
            {"libraryId": library_id, "collectionKey": collection_key},
            ("items",),
        )
    except Exception as error:
        result = write_canceled(
            run_root, "target_collection_not_found", clean(error)
        )
        set_meta(conn, "terminal", True)
        record_stage(conn, "stage_10_inventory_collect", result)
        return result

    inventory_rows = page_bridge(
        conn,
        run_root,
        "library-snapshot",
        ["library", "snapshot"],
        {"libraryId": library_id},
        ("items",),
    )
    existing_refs = {
        paper_ref_from_row(row, library_id) for row in collection_rows
    }
    existing_refs.discard("")
    conn.execute("DELETE FROM inventory")
    for row in inventory_rows:
        paper_ref = paper_ref_from_row(row, library_id)
        if not paper_ref or item_type(row).lower() in EXCLUDED_ITEM_TYPES:
            continue
        compact = compact_inventory_item(row, paper_ref)
        conn.execute(
            "INSERT OR REPLACE INTO inventory(paper_ref, item_json, existing) VALUES (?, ?, ?)",
            (
                paper_ref,
                json.dumps(compact, ensure_ascii=False),
                1 if paper_ref in existing_refs else 0,
            ),
        )
    conn.commit()

    topic_rows: list[dict[str, Any]] = []
    try:
        topic_rows = page_bridge(
            conn,
            run_root,
            "topic-list",
            ["synthesis", "topic", "list"],
            {},
            ("topics", "items"),
        )
    except Exception as error:
        add_diagnostic(conn, "topic_inventory_unavailable", error=clean(error))
    conn.execute("DELETE FROM topics")
    normalized_topics = []
    for topic in topic_rows:
        topic_id = topic_id_from_row(topic)
        if not topic_id:
            continue
        normalized = {**topic, "topic_id": topic_id}
        normalized_topics.append(normalized)
        conn.execute(
            "INSERT OR REPLACE INTO topics(topic_id, topic_json) VALUES (?, ?)",
            (topic_id, json.dumps(normalized, ensure_ascii=False)),
        )
    conn.commit()
    inventory_count = conn.execute("SELECT COUNT(*) FROM inventory").fetchone()[0]
    existing_count = conn.execute(
        "SELECT COUNT(*) FROM inventory WHERE existing = 1"
    ).fetchone()[0]
    write_json(run_root / "runtime/views/02-topic-inventory.json", normalized_topics)
    summary = {
        "collection": value["collection"],
        "collection_scope": value["collection_scope"],
        "inventory_count": inventory_count,
        "existing_count": existing_count,
        "topic_count": len(normalized_topics),
    }
    write_json(run_root / "runtime/views/03-inventory-summary.json", summary)
    record_stage(conn, "stage_10_inventory_collect", summary)
    return summary


def unique_strings(value: Any, label: str, minimum: int, maximum: int) -> list[str]:
    if not isinstance(value, list):
        raise ValueError(f"{label} must be an array")
    normalized: list[str] = []
    seen: set[str] = set()
    for item in value:
        text = clean(item)
        folded = text.casefold()
        if not text or folded in seen:
            continue
        seen.add(folded)
        normalized.append(text)
    if len(normalized) < minimum or len(normalized) > maximum:
        raise ValueError(f"{label} must contain {minimum}-{maximum} unique values")
    return normalized


def require_score(value: Any, label: str) -> float:
    score = float(value)
    if not math.isfinite(score) or score < 0 or score > 1:
        raise ValueError(f"{label} must be finite and between 0 and 1")
    return score


def submit_stage_20(
    conn: sqlite3.Connection, run_root: Path, payload: dict[str, Any]
) -> dict[str, Any]:
    dimensions = unique_strings(payload.get("scope_dimensions"), "scope_dimensions", 1, 12)
    positive_terms = unique_strings(payload.get("positive_terms"), "positive_terms", 1, 30)
    negative_terms = unique_strings(payload.get("negative_terms", []), "negative_terms", 0, 20)
    selected = payload.get("selected_topics")
    if not isinstance(selected, list) or len(selected) > 10:
        raise ValueError("selected_topics must be an array with at most 10 entries")
    known_topics = {
        str(row[0]) for row in conn.execute("SELECT topic_id FROM topics").fetchall()
    }
    normalized_topics: list[dict[str, Any]] = []
    seen: set[str] = set()
    for index, row in enumerate(selected):
        if not isinstance(row, dict):
            raise ValueError(f"selected_topics[{index}] must be an object")
        topic_id = clean(row.get("topic_id"))
        if topic_id not in known_topics or topic_id in seen:
            raise ValueError(f"selected_topics[{index}].topic_id is unknown or duplicate")
        reason = clean(row.get("reason"))
        if not reason:
            raise ValueError(f"selected_topics[{index}].reason is required")
        seen.add(topic_id)
        normalized_topics.append(
            {
                "topic_id": topic_id,
                "relevance": require_score(row.get("relevance"), "topic relevance"),
                "reason": reason,
            }
        )
    plan = {
        "scope_dimensions": dimensions,
        "positive_terms": positive_terms,
        "negative_terms": negative_terms,
        "selected_topics": normalized_topics,
    }
    set_meta(conn, "scope_plan", plan)
    conn.execute("DELETE FROM selected_topics")
    for topic in normalized_topics:
        conn.execute(
            "INSERT INTO selected_topics(topic_id, relevance, reason) VALUES (?, ?, ?)",
            (topic["topic_id"], topic["relevance"], topic["reason"]),
        )
    conn.commit()
    record_stage(conn, "stage_20_scope_plan", plan)
    return plan


def collect_paper_refs(value: Any) -> set[str]:
    refs: set[str] = set()
    if isinstance(value, dict):
        for item in value.values():
            refs.update(collect_paper_refs(item))
    elif isinstance(value, list):
        for item in value:
            refs.update(collect_paper_refs(item))
    elif isinstance(value, str) and PAPER_REF_RE.fullmatch(value.strip()):
        refs.add(value.strip())
    return refs


def collect_topic_source_refs(value: Any) -> set[str]:
    if not isinstance(value, dict):
        return set()
    refs: set[str] = set()
    for key in ("source_papers", "sourcePapers", "paper_refs", "paperRefs"):
        if key in value:
            refs.update(collect_paper_refs(value[key]))
    for key in ("data", "topic", "artifact", "context"):
        if isinstance(value.get(key), dict):
            refs.update(collect_topic_source_refs(value[key]))
    return refs


def row_haystacks(item: dict[str, Any]) -> dict[str, str]:
    title = clean(item.get("title")).casefold()
    tags_value = item.get("tags", [])
    tags = " ".join(
        clean(tag.get("tag")) if isinstance(tag, dict) else clean(tag)
        for tag in tags_value
        if tag
    ).casefold()
    creators_value = item.get("creators", [])
    creators = " ".join(
        clean(creator.get("name", creator.get("lastName")))
        if isinstance(creator, dict)
        else clean(creator)
        for creator in creators_value
    ).casefold()
    other = " ".join(
        clean(item.get(key))
        for key in ("publicationTitle", "venue", "abstractNote", "abstract", "DOI")
    ).casefold()
    return {"title": title, "tags": tags, "other": f"{creators} {other}"}


def candidate_rank(
    item: dict[str, Any],
    positive_terms: list[str],
    negative_terms: list[str],
    topic_ids: list[str],
) -> tuple[float, list[str]]:
    fields = row_haystacks(item)
    matched: list[str] = []
    score = 100.0 * len(topic_ids)
    for term in positive_terms:
        folded = term.casefold()
        hit = False
        if folded in fields["title"]:
            score += 10
            hit = True
        if folded in fields["tags"]:
            score += 7
            hit = True
        if folded in fields["other"]:
            score += 3
            hit = True
        if hit:
            matched.append(term)
    for term in negative_terms:
        folded = term.casefold()
        if any(folded in value for value in fields.values()):
            score -= 12
    return score, matched


def item_detail(
    conn: sqlite3.Connection,
    run_root: Path,
    paper_ref: str,
    fallback: dict[str, Any],
) -> dict[str, Any]:
    match = PAPER_REF_RE.fullmatch(paper_ref)
    if not match:
        return fallback
    try:
        detail = run_bridge(
            conn,
            run_root,
            "item-detail",
            [
                "library",
                "item",
                "get",
                "--key",
                match.group(2),
                "--library-id",
                match.group(1),
            ],
        )
        if isinstance(detail, dict):
            return {**fallback, **detail, "paper_ref": paper_ref}
    except Exception as error:
        add_diagnostic(conn, "item_detail_unavailable", paper_ref=paper_ref, error=clean(error))
    return fallback


def run_stage_30(conn: sqlite3.Connection, run_root: Path) -> dict[str, Any]:
    input_value = get_meta(conn, "input", {})
    plan = get_meta(conn, "scope_plan", {})
    source_topics_by_ref: dict[str, list[str]] = {}
    selected_rows = conn.execute(
        "SELECT topic_id FROM selected_topics ORDER BY topic_id"
    ).fetchall()
    for row in selected_rows:
        topic_id = str(row["topic_id"])
        refs: set[str] = set()
        try:
            context = run_bridge(
                conn,
                run_root,
                "topic-context",
                ["synthesis", "topic", "get-context"],
                {"topicId": topic_id},
            )
            refs = collect_topic_source_refs(context)
        except Exception as error:
            add_diagnostic(conn, "topic_context_unavailable", topic_id=topic_id, error=clean(error))
        conn.execute(
            "UPDATE selected_topics SET source_refs_json = ? WHERE topic_id = ?",
            (json.dumps(sorted(refs)), topic_id),
        )
        for paper_ref in refs:
            source_topics_by_ref.setdefault(paper_ref, []).append(topic_id)
    conn.commit()

    ranked: list[tuple[float, str, list[str], list[str], dict[str, Any]]] = []
    for row in conn.execute(
        "SELECT paper_ref, item_json FROM inventory WHERE existing = 0"
    ).fetchall():
        paper_ref = str(row["paper_ref"])
        item = json.loads(row["item_json"])
        matched_topics = sorted(source_topics_by_ref.get(paper_ref, []))
        score, matched_terms = candidate_rank(
            item,
            plan.get("positive_terms", []),
            plan.get("negative_terms", []),
            matched_topics,
        )
        if score > 0 and (matched_terms or matched_topics):
            ranked.append((score, paper_ref, matched_terms, matched_topics, item))
    ranked.sort(key=lambda row: (-row[0], row[1]))
    eligible_count = len(ranked)
    selected = ranked[:CANDIDATE_LIMIT]
    if eligible_count > CANDIDATE_LIMIT:
        add_diagnostic(
            conn,
            "candidate_truncated",
            eligible_count=eligible_count,
            assessed_limit=CANDIDATE_LIMIT,
        )
    conn.execute("DELETE FROM candidates")
    conn.execute("DELETE FROM assessments")
    packets: dict[str, list[dict[str, Any]]] = {}
    for ordinal, (score, paper_ref, terms, topics, item) in enumerate(selected):
        packet_id = f"batch-{ordinal // BATCH_SIZE + 1:03d}"
        detailed = item_detail(conn, run_root, paper_ref, item)
        conn.execute(
            "INSERT INTO candidates(paper_ref, rank_score, matched_terms_json, matched_topics_json, packet_id, ordinal, item_json) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (
                paper_ref,
                score,
                json.dumps(terms, ensure_ascii=False),
                json.dumps(topics, ensure_ascii=False),
                packet_id,
                ordinal,
                json.dumps(detailed, ensure_ascii=False),
            ),
        )
        packets.setdefault(packet_id, []).append(
            {
                "paper_ref": paper_ref,
                "metadata": detailed,
                "matched_scope_terms": terms,
                "matched_topic_ids": topics,
            }
        )
    conn.commit()
    for packet_id, papers in packets.items():
        write_json(
            run_root / f"runtime/views/paper-assessment-{packet_id}.json",
            {
                "batch_id": packet_id,
                "collection_scope": input_value["collection_scope"],
                "scope_dimensions": plan.get("scope_dimensions", []),
                "papers": papers,
            },
        )
    if not selected:
        record_stage(conn, "stage_40_paper_assessment", {"assessment_count": 0})
    result = {
        "eligible_count": eligible_count,
        "candidate_count": len(selected),
        "packet_count": len(packets),
    }
    set_meta(conn, "eligible_count", eligible_count)
    record_stage(conn, "stage_30_candidate_prepare", result)
    return result


def next_assessment_packet(conn: sqlite3.Connection) -> str:
    row = conn.execute(
        """
        SELECT c.packet_id
        FROM candidates c
        LEFT JOIN assessments a ON a.paper_ref = c.paper_ref
        WHERE a.paper_ref IS NULL
        ORDER BY c.ordinal
        LIMIT 1
        """
    ).fetchone()
    return str(row[0]) if row else ""


def submit_stage_40(
    conn: sqlite3.Connection, run_root: Path, payload: dict[str, Any]
) -> dict[str, Any]:
    packet_id = next_assessment_packet(conn)
    if not packet_id:
        raise ValueError("no paper assessment packet is pending")
    if clean(payload.get("batch_id")) != packet_id:
        raise ValueError("batch_id does not match the current packet")
    expected_rows = conn.execute(
        "SELECT paper_ref, matched_topics_json FROM candidates WHERE packet_id = ? ORDER BY ordinal",
        (packet_id,),
    ).fetchall()
    expected = [str(row["paper_ref"]) for row in expected_rows]
    allowed_topics = {
        str(row[0])
        for row in conn.execute("SELECT topic_id FROM selected_topics").fetchall()
    }
    assessments = payload.get("assessments")
    if not isinstance(assessments, list):
        raise ValueError("assessments must be an array")
    actual = [clean(row.get("paper_ref")) for row in assessments if isinstance(row, dict)]
    if actual != expected:
        raise ValueError("assessments must cover the current packet exactly in packet order")
    for index, row in enumerate(assessments):
        if not isinstance(row, dict):
            raise ValueError(f"assessments[{index}] must be an object")
        score = require_score(row.get("semantic_relevance"), "semantic_relevance")
        evidence = unique_strings(row.get("evidence_basis"), "evidence_basis", 1, 3)
        if any(value not in {"metadata", "tags", "topic"} for value in evidence):
            raise ValueError("evidence_basis contains an unsupported value")
        matched_topics = unique_strings(
            row.get("matched_topic_ids", []), "matched_topic_ids", 0, 10
        )
        if any(topic not in allowed_topics for topic in matched_topics):
            raise ValueError("matched_topic_ids contains an unknown topic")
        reason = clean(row.get("reason"))
        if not reason:
            raise ValueError("assessment reason is required")
        caveats = unique_strings(row.get("caveats", []), "caveats", 0, 20)
        conn.execute(
            "INSERT INTO assessments(paper_ref, semantic_relevance, evidence_basis_json, matched_topics_json, reason, caveats_json) VALUES (?, ?, ?, ?, ?, ?)",
            (
                expected[index],
                score,
                json.dumps(evidence, ensure_ascii=False),
                json.dumps(matched_topics, ensure_ascii=False),
                reason,
                json.dumps(caveats, ensure_ascii=False),
            ),
        )
    conn.commit()
    remaining = next_assessment_packet(conn)
    count = conn.execute("SELECT COUNT(*) FROM assessments").fetchone()[0]
    if not remaining:
        record_stage(conn, "stage_40_paper_assessment", {"assessment_count": count})
    return {"batch_id": packet_id, "assessment_count": count, "remaining": bool(remaining)}


def run_stage_50(conn: sqlite3.Connection, run_root: Path) -> dict[str, Any]:
    input_value = get_meta(conn, "input", {})
    selected_items: list[dict[str, Any]] = []
    rows = conn.execute(
        """
        SELECT c.paper_ref, c.item_json, a.semantic_relevance,
               a.evidence_basis_json, a.matched_topics_json,
               a.reason, a.caveats_json
        FROM candidates c
        JOIN assessments a ON a.paper_ref = c.paper_ref
        WHERE a.semantic_relevance >= ?
        ORDER BY a.semantic_relevance DESC, c.paper_ref ASC
        """,
        (INCLUSION_THRESHOLD,),
    ).fetchall()
    for row in rows:
        item = json.loads(row["item_json"])
        selected_items.append(
            {
                "paper_ref": row["paper_ref"],
                "title": clean(item.get("title")) or row["paper_ref"],
                "semantic_relevance": row["semantic_relevance"],
                "evidence_basis": json.loads(row["evidence_basis_json"]),
                "matched_topic_ids": json.loads(row["matched_topics_json"]),
                "reason": row["reason"],
                "caveats": json.loads(row["caveats_json"]),
            }
        )
    inventory_count = conn.execute("SELECT COUNT(*) FROM inventory").fetchone()[0]
    existing_count = conn.execute(
        "SELECT COUNT(*) FROM inventory WHERE existing = 1"
    ).fetchone()[0]
    assessed_count = conn.execute("SELECT COUNT(*) FROM assessments").fetchone()[0]
    result = {
        "kind": "collection_membership_selection",
        "collection": input_value["collection"],
        "collection_scope": input_value["collection_scope"],
        "inventory_count": inventory_count,
        "existing_count": existing_count,
        "eligible_count": int(get_meta(conn, "eligible_count", 0)),
        "assessed_count": assessed_count,
        "selected_count": len(selected_items),
        "selected_items": selected_items,
        "diagnostics": diagnostics(conn),
    }
    write_json(run_root / "collection-collector.result.json", result)
    set_meta(conn, "terminal", True)
    record_stage(conn, "stage_50_render_result", result)
    return result


def current_stage(conn: sqlite3.Connection) -> str:
    if get_meta(conn, "terminal", False):
        return "completed"
    completed = completed_stages(conn)
    for stage in (
        "stage_00_runtime_setup",
        "stage_10_inventory_collect",
        "stage_20_scope_plan",
        "stage_30_candidate_prepare",
        "stage_40_paper_assessment",
        "stage_50_render_result",
    ):
        if stage not in completed:
            return stage
    return "completed"


def run_current_command_stage(
    db_path: str, input_path: str | None = None
) -> dict[str, Any]:
    conn = initialize_db(db_path)
    try:
        stage = current_stage(conn)
        commands = {
            "stage_00_runtime_setup": lambda: run_stage_00(conn, run_root_from_db(db_path), input_path),
            "stage_10_inventory_collect": lambda: run_stage_10(conn, run_root_from_db(db_path)),
            "stage_30_candidate_prepare": lambda: run_stage_30(conn, run_root_from_db(db_path)),
            "stage_50_render_result": lambda: run_stage_50(conn, run_root_from_db(db_path)),
        }
        if stage not in commands:
            raise ValueError(f"stage {stage} does not accept a command action")
        return {"stage": stage, "result": commands[stage]()}
    finally:
        conn.close()


def submit_current_payload_stage(db_path: str, payload_path: str) -> dict[str, Any]:
    conn = initialize_db(db_path)
    try:
        stage = current_stage(conn)
        payload = read_json(Path(payload_path))
        if not isinstance(payload, dict):
            raise ValueError("payload must be a JSON object")
        if stage == "stage_20_scope_plan":
            result = submit_stage_20(conn, run_root_from_db(db_path), payload)
        elif stage == "stage_40_paper_assessment":
            result = submit_stage_40(conn, run_root_from_db(db_path), payload)
        else:
            raise ValueError(f"stage {stage} does not accept a payload action")
        return {"stage": stage, "result": result}
    finally:
        conn.close()
