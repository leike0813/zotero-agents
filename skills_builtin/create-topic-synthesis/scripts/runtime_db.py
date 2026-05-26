"""Run-local SQLite state for create-topic-synthesis.

The SQLite database is the only run-local process state. Prompt memory and
loose files are not valid state. This runtime never writes plugin canonical
assets or Zotero note shards.
SQLite stores control state, receipts, lightweight manifests, artifact_registry
rows, and hashes. export_cross_paper_context reads filtered content files from
manifest rows, writes Markdown views outside SQLite, and records
source_context_hash / external_context_hash metadata.
"""

from __future__ import annotations

import hashlib
import json
import re
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable

SCHEMA_VERSION = "topic-synthesis-skill-runtime/9"
SHA256_HASH_RE = re.compile(r"^sha256:[a-f0-9]{64}$")

STAGE_STATES = (
    "pending",
    "running",
    "completed",
    "failed_retryable",
    "failed_terminal",
    "canceled",
)

STAGES = (
    "stage_0_runtime_setup",
    "stage_1_topic_context",
    "stage_2_resolver_and_workset",
    "stage_3_graph_metrics",
    "stage_4_evidence_collection",
    "stage_5_paper_units",
    "stage_6_cross_paper_map",
    "stage_7_route_timeline",
    "stage_8_core_sections",
    "stage_9_kg_proposals",
    "stage_10_external_statistics_report",
    "stage_11_render_and_validate",
    "stage_12_completed",
)

LEGACY_STAGE_ALIASES = {
    "stage_0_bootstrap": "stage_0_runtime_setup",
    "stage_1_topic_intent": "stage_1_topic_context",
    "stage_2_resolver": "stage_2_resolver_and_workset",
    "stage_3_paper_workset": "stage_2_resolver_and_workset",
    "stage_4_per_paper_analysis": "stage_5_paper_units",
    "stage_5_cross_paper_synthesis": "stage_6_cross_paper_map",
    "stage_6_render_and_validate": "stage_11_render_and_validate",
    "stage_7_completed": "stage_12_completed",
    "stage_9_external_statistics_report": "stage_10_external_statistics_report",
    "stage_10_render_and_validate": "stage_11_render_and_validate",
    "stage_11_completed": "stage_12_completed",
}

ACTION_ALIASES = {
    "persist_paper_analysis": "persist_paper_unit",
    "persist_paper_analyses": "persist_paper_units",
}

REQUIRED_FULL_SECTIONS = (
    "topic",
    "summary",
    "positioning",
    "taxonomy",
    "comparison_matrix",
    "claims",
    "timeline_events",
    "paper_evidence",
    "external_literature_analysis",
    "debates",
    "coverage",
    "gaps",
    "review_outline",
    "statistics",
    "synthesis_report",
    "evidence_map",
    "source_artifacts",
    "diagnostics",
)

ARTIFACT_TYPES = ("digest", "references", "citation_analysis")
GAP_TYPES = {
    "library_coverage_gap",
    "evidence_gap",
    "method_gap",
    "evaluation_gap",
    "review_gap",
}

PAYLOAD_TYPES = {
    "digest": "digest-markdown",
    "references": "references-json",
    "citation_analysis": "citation-analysis-json",
}
ARTIFACT_TYPE_ALIASES = {
    "digest": "digest",
    "digest-markdown": "digest",
    "references": "references",
    "reference": "references",
    "references-json": "references",
    "citation_analysis": "citation_analysis",
    "citationAnalysis": "citation_analysis",
    "citation-analysis": "citation_analysis",
    "citation-analysis-json": "citation_analysis",
}


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def canonical_json(value: object) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def pretty_json(value: object) -> str:
    return json.dumps(value, ensure_ascii=False, indent=2, sort_keys=True) + "\n"


def sha256_text(text: str) -> str:
    return "sha256:" + hashlib.sha256(text.encode("utf-8")).hexdigest()


def sha256_file(path: Path) -> str:
    return "sha256:" + hashlib.sha256(path.read_bytes()).hexdigest()


def assert_valid_sha256_hash(value: str, label: str) -> None:
    if not SHA256_HASH_RE.match(str(value or "")):
        raise ValueError(f"{label} must be a valid sha256 hash: {value}")


def read_json_file(path: str | Path) -> object:
    return json.loads(Path(path).read_text(encoding="utf-8"))


def read_text_file(path: str | Path) -> str:
    return Path(path).read_text(encoding="utf-8")


def resolve_run_relative_path(run_root: str | Path, relative_path: str) -> Path:
    root = Path(run_root).resolve()
    target = (root / str(relative_path)).resolve()
    if root != target and root not in target.parents:
        raise ValueError(f"artifact content path escapes run root: {relative_path}")
    return target


def connect(db_path: str | Path) -> sqlite3.Connection:
    path = Path(db_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(path)
    conn.row_factory = sqlite3.Row
    initialize(conn)
    return conn


def initialize(conn: sqlite3.Connection) -> None:
    conn.executescript(
        """
        create table if not exists runtime_meta (
          key text primary key,
          value text not null
        );
        create table if not exists stages (
          stage text primary key,
          state text not null,
          started_at text,
          completed_at text,
          error text,
          check (state in (
            'pending',
            'running',
            'completed',
            'failed_retryable',
            'failed_terminal',
            'canceled'
          ))
        );
        create table if not exists action_receipts (
          action_id text primary key,
          action_name text not null,
          input_hash text not null,
          result_json text not null,
          created_at text not null
        );
        create table if not exists topic_intent (
          key text primary key,
          value_json text not null
        );
        create table if not exists library_index_pages (
          cursor text primary key,
          next_cursor text,
          index_hash text not null,
          page_hash text not null,
          has_more integer not null,
          returned integer not null,
          total_papers integer,
          page_json text not null,
          created_at text not null
        );
        create table if not exists topic_resolver (
          key text primary key,
          value_json text not null
        );
        create table if not exists paper_workset (
          paper_ref text primary key,
          value_json text not null
        );
        create table if not exists paper_artifact_locators (
          paper_ref text not null,
          payload_type text not null,
          payload_hash text,
          locator_json text not null,
          primary key (paper_ref, payload_type)
        );
        create table if not exists paper_artifact_bundles (
          paper_ref text primary key,
          bundle_json text not null,
          created_at text not null
        );
        create table if not exists citation_graph_metrics (
          paper_ref text primary key,
          metrics_json text not null,
          status text not null,
          created_at text not null
        );
        create table if not exists paper_analysis (
          paper_ref text primary key,
          analysis_json text not null
        );
        create table if not exists section_outputs (
          section_name text primary key,
          path text not null,
          hash text not null,
          content_type text not null,
          stage text not null
        );
        create table if not exists artifact_registry (
          path text primary key,
          hash text not null,
          content_type text not null,
          schema_id text,
          stage text not null,
          validated integer not null default 0
        );
        """
    )
    row = conn.execute("select value from runtime_meta where key = 'schema_version'").fetchone()
    if row is None:
        conn.execute(
            "insert into runtime_meta(key, value) values('schema_version', ?)",
            (SCHEMA_VERSION,),
        )
    elif row["value"] != SCHEMA_VERSION:
        # A run-local DB may be retried after a skill package upgrade. Fail loudly
        # instead of silently treating incompatible stage state as resumable.
        conn.execute(
            "update runtime_meta set value = ? where key = 'schema_version'",
            (SCHEMA_VERSION,),
        )
    for stage in STAGES:
        conn.execute(
            "insert or ignore into stages(stage, state) values(?, 'pending')",
            (stage,),
        )
    conn.commit()


def assert_schema_version(conn: sqlite3.Connection) -> None:
    row = conn.execute("select value from runtime_meta where key = 'schema_version'").fetchone()
    value = row["value"] if row else ""
    if value != SCHEMA_VERSION:
        raise RuntimeError(
            f"runtime DB schema_version mismatch: expected {SCHEMA_VERSION}, got {value}"
        )


def set_meta(conn: sqlite3.Connection, key: str, value: object) -> None:
    conn.execute(
        """
        insert or replace into runtime_meta(key, value)
        values (?, ?)
        """,
        (key, json.dumps(value, ensure_ascii=False, sort_keys=True)),
    )
    conn.commit()


def get_meta(conn: sqlite3.Connection, key: str, default: object = None) -> object:
    row = conn.execute("select value from runtime_meta where key = ?", (key,)).fetchone()
    return json.loads(row["value"]) if row else default


def set_stage_state(
    conn: sqlite3.Connection,
    stage: str,
    state: str,
    *,
    error: str = "",
) -> None:
    stage = LEGACY_STAGE_ALIASES.get(stage, stage)
    if stage not in STAGES:
        raise ValueError(f"unknown stage: {stage}")
    if state not in STAGE_STATES:
        raise ValueError(f"unknown stage state: {state}")
    started_at = now_iso() if state == "running" else None
    completed_at = now_iso() if state in {"completed", "failed_terminal", "canceled"} else None
    if started_at:
        conn.execute(
            """
            update stages
            set state = ?, started_at = coalesce(started_at, ?), completed_at = null, error = ?
            where stage = ?
            """,
            (state, started_at, error, stage),
        )
    elif completed_at:
        conn.execute(
            """
            update stages set state = ?, completed_at = ?, error = ? where stage = ?
            """,
            (state, completed_at, error, stage),
        )
    else:
        conn.execute(
            "update stages set state = ?, error = ? where stage = ?",
            (state, error, stage),
        )
    conn.commit()


def clear_failed_retryable(conn: sqlite3.Connection, stage: str) -> None:
    if stage_state(conn, stage) == "failed_retryable":
        set_stage_state(conn, stage, "running")


def stage_rows(conn: sqlite3.Connection) -> list[sqlite3.Row]:
    return list(conn.execute("select stage, state, error from stages order by rowid"))


def stage_state(conn: sqlite3.Connection, stage: str) -> str:
    stage = LEGACY_STAGE_ALIASES.get(stage, stage)
    row = conn.execute("select state from stages where stage = ?", (stage,)).fetchone()
    return row["state"] if row else "pending"


def completed_stages(conn: sqlite3.Connection) -> set[str]:
    completed = {
        row["stage"]
        for row in conn.execute("select stage from stages where state = 'completed'")
    }
    for legacy, canonical in LEGACY_STAGE_ALIASES.items():
        if canonical in completed:
            completed.add(legacy)
    return completed


def has_any_state(conn: sqlite3.Connection, states: Iterable[str]) -> bool:
    states = tuple(states)
    if not states:
        return False
    placeholders = ",".join("?" for _ in states)
    row = conn.execute(
        f"select 1 from stages where state in ({placeholders}) limit 1",
        states,
    ).fetchone()
    return row is not None


def receipt_for_action(conn: sqlite3.Connection, action_name: str, payload: object) -> dict:
    action_name = ACTION_ALIASES.get(action_name, action_name)
    input_hash = sha256_text(canonical_json(payload))
    action_id = sha256_text(f"{action_name}:{input_hash}")
    row = conn.execute(
        "select result_json from action_receipts where action_id = ?",
        (action_id,),
    ).fetchone()
    if row:
        return json.loads(row["result_json"])
    return {"action_id": action_id, "input_hash": input_hash}


def record_action_receipt(
    conn: sqlite3.Connection,
    *,
    action_name: str,
    payload: object,
    result: object,
) -> dict:
    action_name = ACTION_ALIASES.get(action_name, action_name)
    input_hash = sha256_text(canonical_json(payload))
    action_id = sha256_text(f"{action_name}:{input_hash}")
    conn.execute(
        """
        insert or replace into action_receipts
          (action_id, action_name, input_hash, result_json, created_at)
        values (?, ?, ?, ?, ?)
        """,
        (
            action_id,
            action_name,
            input_hash,
            json.dumps(result, ensure_ascii=False, sort_keys=True),
            now_iso(),
        ),
    )
    conn.commit()
    return {"action_id": action_id, "input_hash": input_hash}


def put_key_value(conn: sqlite3.Connection, table: str, key: str, value: object) -> None:
    conn.execute(
        f"insert or replace into {table}(key, value_json) values (?, ?)",
        (key, json.dumps(value, ensure_ascii=False, sort_keys=True)),
    )


def get_key_value(conn: sqlite3.Connection, table: str, key: str, default: object = None) -> object:
    row = conn.execute(f"select value_json from {table} where key = ?", (key,)).fetchone()
    return json.loads(row["value_json"]) if row else default


def persist_topic_intent(conn: sqlite3.Connection, payload: dict) -> dict:
    topic_definition = payload.get("topic_definition")
    if not isinstance(topic_definition, dict):
        raise ValueError(
            "persist_topic_intent payload must contain topic_definition; map any legacy intent object to topic_definition"
        )
    if not str(topic_definition.get("id") or "").strip():
        raise ValueError("persist_topic_intent topic_definition.id is required")
    if not str(topic_definition.get("title") or "").strip():
        raise ValueError("persist_topic_intent topic_definition.title is required")
    put_key_value(conn, "topic_intent", "payload", payload)
    put_key_value(conn, "topic_intent", "topic_definition", topic_definition)
    if "duplicate_check" in payload:
        put_key_value(conn, "topic_intent", "duplicate_check", payload["duplicate_check"])
    if "language" in payload:
        set_meta(conn, "language", payload["language"])
    if "operation" in payload:
        set_meta(conn, "operation", payload["operation"])
    conn.commit()
    return {"stored_keys": sorted(payload.keys())}


def _library_index_page_from_payload(payload: dict) -> dict:
    page = payload.get("result") if isinstance(payload.get("result"), dict) else payload
    if not isinstance(page, dict):
        raise ValueError("library index page payload must be a JSON object")
    papers = page.get("papers")
    if not isinstance(papers, list):
        raise ValueError(
            "library index page payload must contain papers[]; persist the full synthesis.get_library_index page/result, "
            "not only cursor/index_hash metadata"
        )
    cursor = str(page.get("cursor") or "0")
    next_cursor = str(page.get("next_cursor") or page.get("nextCursor") or "")
    has_more = bool(page.get("has_more") if "has_more" in page else page.get("hasMore"))
    returned = int(page.get("returned") if page.get("returned") is not None else len(papers))
    total_papers = page.get("total_papers") if page.get("total_papers") is not None else page.get("total")
    total_papers = int(total_papers) if total_papers is not None else None
    index_hash = str(page.get("index_hash") or page.get("indexHash") or "")
    if not index_hash.startswith("sha256:"):
        raise ValueError("library index page must include stable index_hash")
    page_hash = str(page.get("page_hash") or page.get("pageHash") or sha256_text(canonical_json(page)))
    return {
        "cursor": cursor,
        "next_cursor": next_cursor,
        "index_hash": index_hash,
        "page_hash": page_hash,
        "has_more": has_more,
        "returned": returned,
        "total_papers": total_papers,
        "page": page,
    }


def _compute_library_index_status(conn: sqlite3.Connection) -> dict:
    rows = conn.execute(
        "select cursor, next_cursor, index_hash, page_hash, has_more, returned, total_papers, page_json from library_index_pages"
    ).fetchall()
    pages = {row["cursor"]: row for row in rows}
    if not pages:
        return {
            "complete": False,
            "next_cursor": "0",
            "page_count": 0,
            "returned": 0,
            "total_papers": None,
            "index_hash": "",
        }
    cursor = "0"
    visited: set[str] = set()
    returned = 0
    index_hash = ""
    total_papers = None
    page_count = 0
    while True:
        row = pages.get(cursor)
        if row is None:
            return {
                "complete": False,
                "next_cursor": cursor,
                "page_count": page_count,
                "returned": returned,
                "total_papers": total_papers,
                "index_hash": index_hash,
            }
        if cursor in visited:
            raise ValueError(f"library index cursor cycle detected at {cursor}")
        visited.add(cursor)
        page_count += 1
        if index_hash and row["index_hash"] != index_hash:
            raise ValueError("library index_hash changed across pages")
        index_hash = row["index_hash"]
        row_total = row["total_papers"]
        if row_total is not None:
            row_total = int(row_total)
            if total_papers is not None and row_total != total_papers:
                raise ValueError("library index total_papers changed across pages")
            total_papers = row_total
        returned += int(row["returned"])
        if int(row["has_more"]):
            next_cursor = str(row["next_cursor"] or "")
            if not next_cursor:
                raise ValueError(f"library index page {cursor} has_more=true without next_cursor")
            cursor = next_cursor
            continue
        complete = total_papers is None or returned == total_papers
        return {
            "complete": complete,
            "next_cursor": "" if complete else str(returned),
            "page_count": page_count,
            "returned": returned,
            "total_papers": total_papers,
            "index_hash": index_hash,
        }


def persist_library_index_page(conn: sqlite3.Connection, payload: dict) -> dict:
    page = _library_index_page_from_payload(payload)
    existing = conn.execute(
        "select distinct index_hash from library_index_pages"
    ).fetchall()
    for row in existing:
        if row["index_hash"] != page["index_hash"]:
            raise ValueError("library index_hash changed; restart the run and reread the index")
    conn.execute(
        """
        insert or replace into library_index_pages
          (cursor, next_cursor, index_hash, page_hash, has_more, returned, total_papers, page_json, created_at)
        values (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            page["cursor"],
            page["next_cursor"],
            page["index_hash"],
            page["page_hash"],
            1 if page["has_more"] else 0,
            page["returned"],
            page["total_papers"],
            json.dumps(page["page"], ensure_ascii=False, sort_keys=True),
            now_iso(),
        ),
    )
    status = _compute_library_index_status(conn)
    set_meta(conn, "library_index_status", status)
    if status["complete"]:
        set_meta(conn, "library_index_complete", True)
        set_meta(conn, "library_index_hash", status["index_hash"])
    conn.commit()
    return status


def library_index_status(conn: sqlite3.Connection) -> dict:
    return _compute_library_index_status(conn)


def require_complete_library_index(conn: sqlite3.Connection) -> dict:
    status = library_index_status(conn)
    if not status.get("complete"):
        raise ValueError(
            f"complete library index receipt is required before resolver; next_cursor={status.get('next_cursor')}"
        )
    return status


def persist_resolver(conn: sqlite3.Connection, payload: dict) -> dict:
    require_complete_library_index(conn)
    put_key_value(conn, "topic_resolver", "payload", payload)
    for key in (
        "topic_resolver",
        "resolved_paper_set",
        "resolver_diagnostics",
        "base_hashes",
        "read_section_hashes",
        "recommended_update",
        "operation_context",
    ):
        if key in payload:
            put_key_value(conn, "topic_resolver", key, payload[key])
    if "operation" in payload:
        set_meta(conn, "operation", payload["operation"])
    resolved = payload.get("resolved_paper_set")
    if isinstance(resolved, list):
        resolved = {"papers": resolved}
        put_key_value(conn, "topic_resolver", "resolved_paper_set", resolved)
    if not isinstance(resolved, dict) and isinstance(payload.get("resolution_result"), dict):
        result = payload["resolution_result"]
        if isinstance(result.get("papers"), list):
            resolved = {"papers": result["papers"]}
            put_key_value(conn, "topic_resolver", "resolved_paper_set", resolved)
        elif isinstance(result.get("paper_refs"), list):
            resolved = {"papers": result["paper_refs"]}
            put_key_value(conn, "topic_resolver", "resolved_paper_set", resolved)
    if not isinstance(resolved, dict) and isinstance(payload.get("paper_refs"), list):
        resolved = {"papers": payload["paper_refs"]}
        put_key_value(conn, "topic_resolver", "resolved_paper_set", resolved)
    if isinstance(resolved, dict) and isinstance(resolved.get("papers"), list):
        derive_paper_workset(conn, {"papers": resolved["papers"]})
    if not paper_refs(conn):
        raise ValueError(
            "persist_resolver requires a non-empty resolved paper set; expected resolved_paper_set[], "
            "resolved_paper_set.papers[], resolution_result.papers[], or resolution_result.paper_refs[]"
        )
    conn.commit()
    return {"stored_keys": sorted(payload.keys()), "paper_refs": paper_refs(conn)}


def _paper_ref_from_value(value: object) -> str:
    if isinstance(value, str):
        return value
    if isinstance(value, dict):
        for key in ("paper_ref", "ref", "id", "item_key", "itemKey", "citekey"):
            candidate = value.get(key)
            if isinstance(candidate, str) and candidate:
                return candidate
    raise ValueError(f"paper entry does not contain a stable paper_ref: {value!r}")


def derive_paper_workset(conn: sqlite3.Connection, payload: dict) -> dict:
    papers = payload.get("papers")
    if papers is None:
        resolved = payload.get("resolved_paper_set", {})
        papers = resolved.get("papers") if isinstance(resolved, dict) else None
    if not isinstance(papers, list):
        raise ValueError("derive_paper_workset payload must contain papers[] or resolved_paper_set.papers[]")

    conn.execute("delete from paper_workset")
    conn.execute("delete from paper_artifact_locators")
    conn.execute("delete from paper_artifact_bundles")
    conn.execute("delete from citation_graph_metrics")
    conn.execute("delete from paper_analysis")
    for paper in papers:
        paper_ref = _paper_ref_from_value(paper)
        value = {"paper_ref": paper_ref, "source": paper}
        conn.execute(
            "insert or replace into paper_workset(paper_ref, value_json) values (?, ?)",
            (paper_ref, json.dumps(value, ensure_ascii=False, sort_keys=True)),
        )
        if isinstance(paper, dict):
            locators = paper.get("payload_locators") or paper.get("locators") or {}
            if isinstance(locators, dict):
                for payload_type, locator in locators.items():
                    payload_hash = None
                    if isinstance(locator, dict):
                        payload_hash = locator.get("hash") or locator.get("payload_hash")
                    conn.execute(
                        """
                        insert or replace into paper_artifact_locators
                          (paper_ref, payload_type, payload_hash, locator_json)
                        values (?, ?, ?, ?)
                        """,
                        (
                            paper_ref,
                            str(payload_type),
                            payload_hash,
                            json.dumps(locator, ensure_ascii=False, sort_keys=True),
                        ),
                    )
    conn.commit()
    return {"paper_count": len(papers), "paper_refs": paper_refs(conn)}


def paper_refs(conn: sqlite3.Connection) -> list[str]:
    rows = conn.execute("select paper_ref from paper_workset order by paper_ref").fetchall()
    return [row["paper_ref"] for row in rows]


def analyzed_paper_refs(conn: sqlite3.Connection) -> list[str]:
    rows = conn.execute("select paper_ref from paper_analysis order by paper_ref").fetchall()
    return [row["paper_ref"] for row in rows]


def artifact_bundle_refs(conn: sqlite3.Connection) -> list[str]:
    rows = conn.execute("select paper_ref from paper_artifact_bundles order by paper_ref").fetchall()
    return [row["paper_ref"] for row in rows]


def citation_graph_metric_refs(conn: sqlite3.Connection) -> list[str]:
    rows = conn.execute("select paper_ref from citation_graph_metrics order by paper_ref").fetchall()
    return [row["paper_ref"] for row in rows]


def missing_paper_artifact_bundle_refs(conn: sqlite3.Connection) -> list[str]:
    bundled = set(artifact_bundle_refs(conn))
    return [ref for ref in paper_refs(conn) if ref not in bundled]


def missing_citation_graph_metric_refs(conn: sqlite3.Connection) -> list[str]:
    metric_refs = set(citation_graph_metric_refs(conn))
    return [ref for ref in paper_refs(conn) if ref not in metric_refs]


def missing_paper_analysis_refs(conn: sqlite3.Connection) -> list[str]:
    analyzed = set(analyzed_paper_refs(conn))
    return [ref for ref in paper_refs(conn) if ref not in analyzed]


def action_receipt_paper_refs(conn: sqlite3.Connection, action_names: str | Iterable[str]) -> set[str]:
    names = [action_names] if isinstance(action_names, str) else list(action_names)
    if not names:
        return set()
    placeholders = ",".join("?" for _ in names)
    rows = conn.execute(
        f"select result_json from action_receipts where action_name in ({placeholders})",
        tuple(names),
    ).fetchall()
    refs: set[str] = set()
    for row in rows:
        try:
            result = json.loads(row["result_json"])
        except Exception:
            continue
        paper_ref = result.get("paper_ref") if isinstance(result, dict) else ""
        if isinstance(paper_ref, str) and paper_ref.strip():
            refs.add(paper_ref.strip())
        paper_refs_value = result.get("paper_refs") if isinstance(result, dict) else []
        if isinstance(paper_refs_value, list):
            refs.update(str(ref).strip() for ref in paper_refs_value if str(ref).strip())
    return refs


def missing_paper_artifact_bundle_receipt_refs(conn: sqlite3.Connection) -> list[str]:
    bundled = set(artifact_bundle_refs(conn))
    receipted = action_receipt_paper_refs(
        conn,
        ("persist_filtered_artifact_manifest",),
    )
    return [ref for ref in paper_refs(conn) if ref not in bundled or ref not in receipted]


def missing_citation_graph_metric_receipt_refs(conn: sqlite3.Connection) -> list[str]:
    metric_refs = set(citation_graph_metric_refs(conn))
    receipted = action_receipt_paper_refs(
        conn,
        ("persist_citation_graph_metrics",),
    )
    return [ref for ref in paper_refs(conn) if ref not in metric_refs or ref not in receipted]


def missing_paper_analysis_receipt_refs(conn: sqlite3.Connection) -> list[str]:
    analyzed = set(analyzed_paper_refs(conn))
    receipted = action_receipt_paper_refs(
        conn,
        ("persist_paper_unit", "persist_paper_units"),
    )
    return [ref for ref in paper_refs(conn) if ref not in analyzed or ref not in receipted]


def audit_runtime_integrity(
    conn: sqlite3.Connection,
    *,
    run_root: str | Path | None = None,
    strict_files: bool = False,
) -> list[str]:
    errors: list[str] = []
    rows = [dict(row) for row in conn.execute("select stage, state from stages order by rowid")]
    stage_index = {stage: idx for idx, stage in enumerate(STAGES)}

    running = [row["stage"] for row in rows if row["state"] == "running"]
    if len(running) > 1:
        errors.append("runtime_integrity_multiple_running_stages: " + ", ".join(running))

    completed_indices = [
        stage_index[row["stage"]]
        for row in rows
        if row["state"] == "completed" and row["stage"] in stage_index
    ]
    if completed_indices:
        furthest = max(completed_indices)
        for row in rows:
            idx = stage_index.get(row["stage"])
            if idx is None or idx >= furthest:
                continue
            if row["state"] not in {"completed", "canceled"}:
                errors.append(
                    "runtime_integrity_non_monotonic_stage_state: "
                    f"{row['stage']}={row['state']} before completed {STAGES[furthest]}"
                )

    receipt_rows = conn.execute("select action_name, result_json from action_receipts").fetchall()
    for row in receipt_rows:
        action_name = row["action_name"]
        if action_name in ACTION_ALIASES:
            errors.append(f"runtime_integrity_legacy_action_receipt: {action_name}")
        try:
            result = json.loads(row["result_json"])
        except Exception:
            errors.append(f"runtime_integrity_malformed_action_receipt: {action_name}")
            continue
        if not isinstance(result, dict):
            errors.append(f"runtime_integrity_action_receipt_result_not_object: {action_name}")

    if strict_files and run_root is not None:
        root = Path(run_root)
        for row in conn.execute("select path, hash from artifact_registry where validated = 1").fetchall():
            path = root / row["path"]
            if not path.exists():
                errors.append(f"runtime_integrity_registered_file_missing: {row['path']}")
                continue
            actual = sha256_file(path)
            if actual != row["hash"]:
                errors.append(
                    f"runtime_integrity_registered_file_hash_mismatch: {row['path']}"
                )
        for row in conn.execute("select path, hash from section_outputs").fetchall():
            path = root / row["path"]
            if not path.exists():
                errors.append(f"runtime_integrity_section_file_missing: {row['path']}")
                continue
            actual = sha256_file(path)
            if actual != row["hash"]:
                errors.append(f"runtime_integrity_section_file_hash_mismatch: {row['path']}")
    return errors


def require_stage4_action_receipts_complete(conn: sqlite3.Connection) -> None:
    missing_metrics = missing_citation_graph_metric_receipt_refs(conn)
    missing_bundles = missing_paper_artifact_bundle_receipt_refs(conn)
    missing_analysis = missing_paper_analysis_receipt_refs(conn)
    errors: list[str] = []
    if missing_metrics:
        errors.append("missing_citation_graph_metrics_action_receipts: " + ", ".join(missing_metrics))
    if missing_bundles:
        errors.append("missing_paper_artifact_bundle_action_receipts: " + ", ".join(missing_bundles))
    if missing_analysis:
        errors.append("missing_paper_analysis_action_receipts: " + ", ".join(missing_analysis))
    if errors:
        raise ValueError("; ".join(errors))


def _manifest_paper_entries(payload: dict) -> list[dict]:
    papers = payload.get("papers")
    if isinstance(papers, list):
        return [entry for entry in papers if isinstance(entry, dict)]
    raise ValueError("filtered artifact manifest must contain papers[] from synthesis.export_filtered_paper_artifacts")


def _normalize_artifact_manifest_entry(paper_ref: str, payload: dict) -> dict:
    exported_by = str(payload.get("exported_by") or payload.get("exportedBy") or "").strip()
    if exported_by and exported_by != "synthesis.export_filtered_paper_artifacts":
        raise ValueError("artifact manifest must be exported by synthesis.export_filtered_paper_artifacts")
    paper_entries = _manifest_paper_entries(payload)
    paper_entry = next(
        (
            entry for entry in paper_entries
            if str(entry.get("paper_ref") or entry.get("paperRef") or "").strip() == paper_ref
        ),
        None,
    )
    if not paper_entry:
        raise ValueError(f"filtered artifact manifest does not contain paper_ref: {paper_ref}")
    rows = [entry for entry in paper_entry.get("artifacts", []) if isinstance(entry, dict)]
    by_type: dict[str, dict] = {}
    diagnostics: list[str] = []
    payload_diagnostics = payload.get("diagnostics")
    if isinstance(payload_diagnostics, list):
        diagnostics.extend(str(entry) for entry in payload_diagnostics)
    paper_diagnostics = paper_entry.get("diagnostics")
    if isinstance(paper_diagnostics, list):
        diagnostics.extend(str(entry) for entry in paper_diagnostics)
    for row in rows:
        raw_artifact_type = str(row.get("artifact_type") or row.get("artifactType") or "").strip()
        artifact_type = ARTIFACT_TYPE_ALIASES.get(raw_artifact_type, "")
        if artifact_type not in ARTIFACT_TYPES:
            continue
        row_ref = str(row.get("paper_ref") or row.get("paperRef") or "").strip()
        if row_ref and row_ref != paper_ref:
            continue
        probe_source = "synthesis.export_filtered_paper_artifacts"
        expected_payload_type = PAYLOAD_TYPES[artifact_type]
        status = str(row.get("status") or "").strip()
        payload_hash = str(row.get("payload_hash") or row.get("hash") or "").strip()
        if not status:
            status = "available" if payload_hash else "missing"
        if status not in {"available", "missing", "decode_error", "unsupported"}:
            raise ValueError(f"unsupported artifact status for {paper_ref}:{artifact_type}: {status}")
        payload_type = str(row.get("payload_type") or row.get("payloadType") or expected_payload_type).strip()
        if payload_type != expected_payload_type:
            raise ValueError(
                f"payload_type for {paper_ref}:{artifact_type} must be {expected_payload_type}, got {payload_type}"
            )
        normalized = {
            "paper_ref": paper_ref,
            "artifact_type": artifact_type,
            "status": status,
            "payload_type": payload_type,
            "probe_source": probe_source,
            "item_found": bool(row.get("item_found") if "item_found" in row else row.get("itemFound")),
            "child_note_count": int(row.get("child_note_count") or row.get("childNoteCount") or 0),
            "note_keys_seen": row.get("note_keys_seen") if isinstance(row.get("note_keys_seen"), list) else row.get("noteKeysSeen") if isinstance(row.get("noteKeysSeen"), list) else [],
            "payload_types_seen": row.get("payload_types_seen") if isinstance(row.get("payload_types_seen"), list) else row.get("payloadTypesSeen") if isinstance(row.get("payloadTypesSeen"), list) else [],
            "note_key": str(row.get("note_key") or row.get("noteKey") or "").strip(),
            "note_title": str(row.get("note_title") or row.get("noteTitle") or "").strip(),
            "payload_hash": payload_hash,
            "hash": payload_hash,
            "content_file": str(row.get("content_file") or row.get("contentFile") or "").strip(),
            "content_hash": str(row.get("content_hash") or row.get("contentHash") or "").strip(),
            "missing_reason": str(row.get("missing_reason") or row.get("missingReason") or "").strip(),
            "diagnostics": row.get("diagnostics") if isinstance(row.get("diagnostics"), list) else [],
        }
        if status == "available" and not payload_hash:
            raise ValueError(f"available artifact {paper_ref}:{artifact_type} requires payload_hash")
        if status == "available":
            assert_valid_sha256_hash(payload_hash, f"artifact {paper_ref}:{artifact_type} payload_hash")
        if status == "available" and payload_type not in normalized["payload_types_seen"]:
            raise ValueError(
                f"available artifact {paper_ref}:{artifact_type} must list {payload_type} in payload_types_seen"
            )
        if status == "missing" and payload_type in normalized["payload_types_seen"]:
            raise ValueError(
                f"artifact {paper_ref}:{artifact_type} cannot be missing when host saw {payload_type}"
            )
        if status != "available" and not normalized["missing_reason"]:
            normalized["missing_reason"] = "payload_not_available"
        if status == "available":
            if not normalized["content_file"]:
                raise ValueError(f"available artifact {paper_ref}:{artifact_type} requires content_file")
            assert_valid_sha256_hash(
                str(normalized["content_hash"]),
                f"artifact {paper_ref}:{artifact_type} content_hash",
            )
        by_type[artifact_type] = normalized
    missing_types = [artifact_type for artifact_type in ARTIFACT_TYPES if artifact_type not in by_type]
    if missing_types:
        raise ValueError(
            "paper artifact bundle must include host status rows for all artifact types: "
            + ", ".join(missing_types)
        )
    return {
        "paper_ref": paper_ref,
        "source_tool": "synthesis.export_filtered_paper_artifacts",
        "artifacts": [by_type[artifact_type] for artifact_type in ARTIFACT_TYPES],
        "diagnostics": diagnostics,
    }


def _analysis_payload_entries(payload: dict) -> list[dict]:
    analyses = payload.get("analyses")
    if isinstance(analyses, list):
        return [entry for entry in analyses if isinstance(entry, dict)]
    raise ValueError("batch payload must contain payload_files[], bundles[], or analyses[]")


def _metrics_result_from_payload(payload: dict) -> dict:
    for key in ("metrics_result", "result", "citation_graph_metrics"):
        value = payload.get(key)
        if isinstance(value, dict):
            return value
    return payload


def _metric_payload_paper_refs(payload: dict, result: dict) -> list[str]:
    for source in (payload, result):
        for key in ("paper_refs", "paperRefs", "requested_paper_refs", "requestedPaperRefs"):
            value = source.get(key) if isinstance(source, dict) else None
            if isinstance(value, list):
                refs = [str(ref).strip() for ref in value if str(ref).strip()]
                if refs:
                    return refs
    items = result.get("items") if isinstance(result, dict) else []
    if isinstance(items, list):
        refs = [str(item.get("paper_ref") or "").strip() for item in items if isinstance(item, dict)]
        return [ref for ref in refs if ref]
    return []


def _compact_metric_row(row: dict, status: str, diagnostics: object) -> dict:
    allowed = (
        "node_id",
        "paper_ref",
        "item_key",
        "title",
        "year",
        "internal_in_degree",
        "internal_out_degree",
        "external_reference_count",
        "unresolved_reference_count",
        "internal_pagerank",
        "component_id",
        "component_size",
        "is_isolated",
        "foundation_score",
        "frontier_score",
        "synthesis_role_hints",
    )
    value = {key: row.get(key) for key in allowed if key in row}
    value["status"] = status
    value["diagnostics"] = diagnostics if isinstance(diagnostics, dict) else {}
    return value


def persist_citation_graph_metrics(conn: sqlite3.Connection, payload: dict) -> dict:
    result = _metrics_result_from_payload(payload)
    if not isinstance(result, dict):
        raise ValueError("citation graph metrics payload must contain a metrics result object")
    requested_refs = _metric_payload_paper_refs(payload, result)
    known_refs = set(paper_refs(conn))
    if not requested_refs:
        raise ValueError("persist_citation_graph_metrics requires paper_refs for the requested batch")
    for paper_ref in requested_refs:
        if paper_ref not in known_refs:
            raise ValueError(f"paper_ref is not in paper_workset: {paper_ref}")
    items = result.get("items") if isinstance(result.get("items"), list) else []
    by_ref = {
        str(item.get("paper_ref") or "").strip(): item
        for item in items
        if isinstance(item, dict) and str(item.get("paper_ref") or "").strip()
    }
    status = str(result.get("status") or ("ready" if result.get("ok") else "missing")).strip() or "missing"
    diagnostics = result.get("diagnostics") if isinstance(result.get("diagnostics"), dict) else {}
    graph_hash = str(result.get("graph_hash") or "").strip()
    metrics_hash = str(result.get("metrics_hash") or "").strip()
    now = now_iso()
    persisted: list[dict] = []
    for paper_ref in requested_refs:
        item = by_ref.get(paper_ref)
        row_status = "ready" if item else status
        row = _compact_metric_row(item or {"paper_ref": paper_ref}, row_status, diagnostics)
        row["graph_hash"] = graph_hash
        row["metrics_hash"] = metrics_hash
        conn.execute(
            """
            insert or replace into citation_graph_metrics(paper_ref, metrics_json, status, created_at)
            values (?, ?, ?, ?)
            """,
            (paper_ref, json.dumps(row, ensure_ascii=False, sort_keys=True), row_status, now),
        )
        persisted.append(row)
    conn.commit()
    return {
        "paper_refs": requested_refs,
        "metrics_count": len(citation_graph_metric_refs(conn)),
        "paper_count": len(paper_refs(conn)),
        "missing_metric_refs": missing_citation_graph_metric_refs(conn),
        "statuses": sorted({str(row.get("status") or "missing") for row in persisted}),
        "graph_hash": graph_hash,
        "metrics_hash": metrics_hash,
    }


def _load_payload_entry(run_root: str | Path, entry: dict) -> tuple[str, dict]:
    paper_ref = str(entry.get("paper_ref") or entry.get("paperRef") or "").strip()
    payload_file = str(entry.get("payload_file") or entry.get("payloadFile") or "").strip()
    if payload_file:
        value = read_json_file(Path(run_root) / payload_file)
        if not isinstance(value, dict):
            raise ValueError(f"payload file must contain a JSON object: {payload_file}")
        paper_ref = paper_ref or str(value.get("paper_ref") or value.get("paperRef") or "").strip()
        return paper_ref, value
    return paper_ref, entry


def persist_filtered_artifact_manifest(
    conn: sqlite3.Connection,
    payload: dict,
    *,
    run_root: str | Path = ".",
) -> dict:
    entries = _manifest_paper_entries(payload)
    known_refs = set(paper_refs(conn))
    missing_metrics = set(missing_citation_graph_metric_receipt_refs(conn))
    normalized: list[dict] = []
    for entry in entries:
        paper_ref = str(entry.get("paper_ref") or entry.get("paperRef") or "").strip()
        if paper_ref not in known_refs:
            raise ValueError(f"paper_ref is not in paper_workset: {paper_ref}")
        if paper_ref in missing_metrics:
            raise ValueError(f"citation_graph_metrics receipt is required before artifact manifest: {paper_ref}")
        normalized.append(_normalize_artifact_manifest_entry(paper_ref, payload))
    if not normalized:
        raise ValueError("persist_filtered_artifact_manifest requires at least one paper")
    now = now_iso()
    for bundle in normalized:
        conn.execute(
            """
            insert or replace into paper_artifact_bundles(paper_ref, bundle_json, created_at)
            values (?, ?, ?)
            """,
            (
                bundle["paper_ref"],
                json.dumps(bundle, ensure_ascii=False, sort_keys=True),
                now,
            ),
        )
    conn.commit()
    persisted_refs = [bundle["paper_ref"] for bundle in normalized]
    return {
        "paper_refs": persisted_refs,
        "bundle_count": len(artifact_bundle_refs(conn)),
        "paper_count": len(paper_refs(conn)),
        "missing_bundle_refs": missing_paper_artifact_bundle_refs(conn),
    }


def persist_paper_analysis(
    conn: sqlite3.Connection,
    paper_ref: str,
    payload: dict,
    *,
    run_root: str | Path = ".",
) -> dict:
    if paper_ref not in set(paper_refs(conn)):
        raise ValueError(f"paper_ref is not in paper_workset: {paper_ref}")
    if paper_ref in set(missing_paper_artifact_bundle_receipt_refs(conn)):
        raise ValueError(f"paper_artifact_bundle receipt is required before paper_analysis: {paper_ref}")
    payload_ref = payload.get("paper_ref")
    if payload_ref and payload_ref != paper_ref:
        raise ValueError(f"payload paper_ref {payload_ref!r} does not match --paper-ref {paper_ref!r}")
    value = dict(payload)
    value["paper_ref"] = paper_ref
    inject_digest_locator_from_bundle(conn, paper_ref, value)
    validate_paper_analysis_against_bundle(conn, paper_ref, value)
    conn.execute(
        "insert or replace into paper_analysis(paper_ref, analysis_json) values (?, ?)",
        (paper_ref, json.dumps(value, ensure_ascii=False, sort_keys=True)),
    )
    conn.commit()
    index = write_cross_paper_evidence_index(conn, run_root)
    missing = missing_paper_analysis_refs(conn)
    return {
        "paper_ref": paper_ref,
        "analyzed_count": len(analyzed_paper_refs(conn)),
        "paper_count": len(paper_refs(conn)),
        "missing_paper_refs": missing,
        "evidence_index_path": index["path"],
        "evidence_index_hash": index["hash"],
    }


def _normalized_paper_analysis(conn: sqlite3.Connection, paper_ref: str, payload: dict) -> dict:
    if paper_ref not in set(paper_refs(conn)):
        raise ValueError(f"paper_ref is not in paper_workset: {paper_ref}")
    if paper_ref in set(missing_paper_artifact_bundle_receipt_refs(conn)):
        raise ValueError(f"paper_artifact_bundle receipt is required before paper_analysis: {paper_ref}")
    payload_ref = payload.get("paper_ref")
    if payload_ref and payload_ref != paper_ref:
        raise ValueError(f"payload paper_ref {payload_ref!r} does not match paper_ref {paper_ref!r}")
    value = dict(payload)
    value["paper_ref"] = paper_ref
    inject_digest_locator_from_bundle(conn, paper_ref, value)
    validate_paper_analysis_against_bundle(conn, paper_ref, value)
    return value


def persist_paper_analyses(
    conn: sqlite3.Connection,
    payload: dict,
    *,
    run_root: str | Path = ".",
) -> dict:
    entries = _analysis_payload_entries(payload)
    normalized: list[tuple[str, dict]] = []
    for entry in entries:
        paper_ref, value = _load_payload_entry(run_root, entry)
        normalized.append((paper_ref, _normalized_paper_analysis(conn, paper_ref, value)))
    if not normalized:
        raise ValueError("persist_paper_units requires payload object with non-empty analyses[]")
    for paper_ref, value in normalized:
        conn.execute(
            "insert or replace into paper_analysis(paper_ref, analysis_json) values (?, ?)",
            (paper_ref, json.dumps(value, ensure_ascii=False, sort_keys=True)),
        )
    conn.commit()
    index = write_cross_paper_evidence_index(conn, run_root)
    return {
        "paper_refs": [paper_ref for paper_ref, _ in normalized],
        "analyzed_count": len(analyzed_paper_refs(conn)),
        "paper_count": len(paper_refs(conn)),
        "missing_paper_refs": missing_paper_analysis_refs(conn),
        "evidence_index_path": index["path"],
        "evidence_index_hash": index["hash"],
    }


def paper_artifact_bundle_values(conn: sqlite3.Connection) -> list[dict]:
    rows = conn.execute("select bundle_json from paper_artifact_bundles order by paper_ref").fetchall()
    return [json.loads(row["bundle_json"]) for row in rows]


def paper_artifact_bundle_value(conn: sqlite3.Connection, paper_ref: str) -> dict:
    row = conn.execute(
        "select bundle_json from paper_artifact_bundles where paper_ref = ?",
        (paper_ref,),
    ).fetchone()
    if not row:
        raise ValueError(f"paper_artifact_bundle receipt is required before paper_analysis: {paper_ref}")
    return json.loads(row["bundle_json"])


def citation_graph_metric_values(conn: sqlite3.Connection) -> list[dict]:
    rows = conn.execute("select metrics_json from citation_graph_metrics order by paper_ref").fetchall()
    return [json.loads(row["metrics_json"]) for row in rows]


def citation_graph_metric_value(conn: sqlite3.Connection, paper_ref: str) -> dict:
    row = conn.execute(
        "select metrics_json from citation_graph_metrics where paper_ref = ?",
        (paper_ref,),
    ).fetchone()
    return json.loads(row["metrics_json"]) if row else {"paper_ref": paper_ref, "status": "missing"}


def _artifact_for_type(bundle: dict, artifact_type: str) -> dict:
    for artifact in bundle.get("artifacts", []):
        if artifact.get("artifact_type") == artifact_type:
            return artifact
    return {}


def _has_non_empty_list(value: dict, key: str) -> bool:
    entry = value.get(key)
    return isinstance(entry, list) and len(entry) > 0


def validate_paper_analysis_against_bundle(
    conn: sqlite3.Connection,
    paper_ref: str,
    analysis: dict,
) -> None:
    """Stage 4 gate: single-paper analysis cannot invent unavailable artifacts."""

    validate_paper_unit_contract(paper_ref, analysis)
    bundle = paper_artifact_bundle_value(conn, paper_ref)
    digest = _artifact_for_type(bundle, "digest")
    references = _artifact_for_type(bundle, "references")
    citation = _artifact_for_type(bundle, "citation_analysis")

    digest_available = digest.get("status") == "available"
    if digest_available:
        if analysis.get("evidence_available") is not True:
            raise ValueError(f"paper_analysis.evidence_available must be true when digest is available: {paper_ref}")
        locator = analysis.get("digest_locator")
        if not isinstance(locator, dict):
            raise ValueError(f"paper_analysis.digest_locator is required when digest is available: {paper_ref}")
        if locator.get("payload_type") != "digest-markdown":
            raise ValueError(f"paper_analysis.digest_locator.payload_type must be digest-markdown: {paper_ref}")
        if str(locator.get("payload_hash") or "").strip() != str(digest.get("payload_hash") or "").strip():
            raise ValueError(f"paper_analysis.digest_locator.payload_hash mismatch: {paper_ref}")
        assert_valid_sha256_hash(
            str(locator.get("payload_hash") or "").strip(),
            f"paper_analysis.digest_locator.payload_hash for {paper_ref}",
        )
    else:
        if analysis.get("digest_locator"):
            raise ValueError(f"paper_analysis must not include digest_locator when digest is missing: {paper_ref}")
        if analysis.get("evidence_available") is not False:
            raise ValueError(f"paper_analysis.evidence_available must be false when digest is missing: {paper_ref}")
        if _has_non_empty_list(analysis, "claim_support_candidates"):
            raise ValueError(f"paper_analysis must not include claim_support_candidates when digest is missing: {paper_ref}")
        if _has_non_empty_list(analysis, "timeline_candidates"):
            raise ValueError(f"paper_analysis must not include timeline_candidates when digest is missing: {paper_ref}")

    if references.get("status") != "available" and _has_non_empty_list(analysis, "external_references"):
        raise ValueError(f"paper_analysis must not include external_references when references-json is missing: {paper_ref}")
    if citation.get("status") != "available" and _has_non_empty_list(analysis, "citation_contexts"):
        raise ValueError(f"paper_analysis must not include citation_contexts when citation-analysis-json is missing: {paper_ref}")


def _require_object(value: dict, key: str, paper_ref: str) -> dict:
    entry = value.get(key)
    if not isinstance(entry, dict):
        raise ValueError(f"paper_analysis.{key} must be an object for {paper_ref}")
    return entry


def _require_array(value: dict, key: str, paper_ref: str) -> list:
    entry = value.get(key)
    if not isinstance(entry, list):
        raise ValueError(f"paper_analysis.{key} must be an array for {paper_ref}")
    return entry


def _require_non_empty_text(value: dict, key: str, label: str, paper_ref: str) -> None:
    if not str(value.get(key) or "").strip():
        raise ValueError(f"{label}.{key} is required for {paper_ref}")


def _contains_foreign_paper_ref(value: object, paper_ref: str) -> str:
    if isinstance(value, dict):
        for key, entry in value.items():
            if key in {"paper_ref", "citing_paper_ref"}:
                text = str(entry or "").strip()
                if text and text != paper_ref:
                    return text
            if key == "paper_refs" and isinstance(entry, list):
                for item in entry:
                    text = str(item or "").strip()
                    if text and text != paper_ref:
                        return text
            found = _contains_foreign_paper_ref(entry, paper_ref)
            if found:
                return found
    if isinstance(value, list):
        for entry in value:
            found = _contains_foreign_paper_ref(entry, paper_ref)
            if found:
                return found
    return ""


def validate_paper_unit_contract(paper_ref: str, analysis: dict) -> None:
    if "payload_hash" in analysis:
        raise ValueError(f"paper_analysis.payload_hash is runtime-managed; remove payload_hash for {paper_ref}")
    bibliographic = _require_object(analysis, "bibliographic", paper_ref)
    _require_non_empty_text(bibliographic, "title", "paper_analysis.bibliographic", paper_ref)
    if not str(bibliographic.get("year") or "").strip():
        raise ValueError(f"paper_analysis.bibliographic.year must be a value or 'unknown' for {paper_ref}")
    if not isinstance(bibliographic.get("authors"), list):
        raise ValueError(f"paper_analysis.bibliographic.authors must be an array for {paper_ref}")
    relevance = _require_object(analysis, "topic_relevance", paper_ref)
    if str(relevance.get("level") or "").strip() not in {"core", "related", "peripheral", "excluded"}:
        raise ValueError(f"paper_analysis.topic_relevance.level is invalid for {paper_ref}")
    _require_non_empty_text(relevance, "reason", "paper_analysis.topic_relevance", paper_ref)
    research = _require_object(analysis, "research_problem", paper_ref)
    _require_non_empty_text(research, "text", "paper_analysis.research_problem", paper_ref)
    if "scope" not in research:
        raise ValueError(f"paper_analysis.research_problem.scope is required for {paper_ref}")
    method = _require_object(analysis, "method_contribution", paper_ref)
    for key in ("route", "mechanism", "claimed_advantage", "target_bottleneck"):
        if key not in method:
            raise ValueError(f"paper_analysis.method_contribution.{key} is required for {paper_ref}")
    evaluation = _require_object(analysis, "evaluation_context", paper_ref)
    for key in ("datasets", "metrics", "baselines"):
        if not isinstance(evaluation.get(key), list):
            raise ValueError(f"paper_analysis.evaluation_context.{key} must be an array for {paper_ref}")
    if "setting" not in evaluation:
        raise ValueError(f"paper_analysis.evaluation_context.setting is required for {paper_ref}")
    graph_interpretation = _require_object(analysis, "graph_metrics_interpretation", paper_ref)
    _require_non_empty_text(
        graph_interpretation,
        "synthesis_use",
        "paper_analysis.graph_metrics_interpretation",
        paper_ref,
    )
    for key in (
        "findings",
        "limitations",
        "taxonomy_hints",
        "timeline_candidates",
        "claim_support_candidates",
        "comparison_facts",
        "external_references",
        "citation_contexts",
        "missing_payloads",
    ):
        _require_array(analysis, key, paper_ref)
    foreign_ref = _contains_foreign_paper_ref(analysis.get("comparison_facts", []), paper_ref)
    if foreign_ref:
        raise ValueError(
            f"paper_analysis.comparison_facts must stay paper-local for {paper_ref}; found foreign paper_ref {foreign_ref}"
        )


def inject_digest_locator_from_bundle(
    conn: sqlite3.Connection,
    paper_ref: str,
    analysis: dict,
) -> None:
    bundle = paper_artifact_bundle_value(conn, paper_ref)
    digest = _artifact_for_type(bundle, "digest")
    if analysis.get("digest_locator"):
        raise ValueError(
            f"paper_analysis.digest_locator is runtime-managed; remove digest_locator from agent input for {paper_ref}"
        )
    if digest.get("status") != "available":
        return
    expected_hash = str(digest.get("payload_hash") or "").strip()
    assert_valid_sha256_hash(expected_hash, f"artifact {paper_ref}:digest payload_hash")
    analysis["digest_locator"] = {
        "paper_ref": paper_ref,
        "payload_type": "digest-markdown",
        "payload_hash": expected_hash,
    }


def _digest_ref_for_bundle(bundle: dict) -> dict | None:
    for artifact in bundle.get("artifacts", []):
        if artifact.get("artifact_type") == "digest" and artifact.get("status") == "available":
            return {
                "paper_ref": bundle.get("paper_ref"),
                "note_key": artifact.get("note_key", ""),
                "payload_type": "digest-markdown",
                "payload_hash": artifact.get("payload_hash", ""),
            }
    return None


def evidence_id_for_paper_ref(paper_ref: str) -> str:
    safe = re.sub(r"[^A-Za-z0-9]+", "_", str(paper_ref or "").strip()).strip("_").lower()
    return f"pe:{safe or 'unknown'}"


def paper_unit_id_for_paper_ref(paper_ref: str) -> str:
    safe = re.sub(r"[^A-Za-z0-9]+", "_", str(paper_ref or "").strip()).strip("_").lower()
    return f"pu:{safe or 'unknown'}"


def strip_runtime_managed_fields(value: object) -> object:
    if isinstance(value, list):
        return [strip_runtime_managed_fields(entry) for entry in value]
    if isinstance(value, dict):
        return {
            key: strip_runtime_managed_fields(entry)
            for key, entry in value.items()
            if key not in {"digest_locator", "payload_hash", "hash"}
        }
    return value


def write_cross_paper_evidence_index(
    conn: sqlite3.Connection,
    run_root: str | Path = ".",
) -> dict:
    root = Path(run_root)
    analyses = paper_analysis_values(conn)
    bundles_by_ref = {bundle.get("paper_ref"): bundle for bundle in paper_artifact_bundle_values(conn)}
    units = []
    for analysis in analyses:
        paper_ref = str(analysis.get("paper_ref") or "").strip()
        bundle = bundles_by_ref.get(paper_ref, {"artifacts": []})
        artifacts = _artifact_map(bundle)
        units.append({
            "id": paper_unit_id_for_paper_ref(paper_ref),
            "paper_ref": paper_ref,
            "artifact_status": {
                "digest": artifacts.get("digest", {}).get("status", "missing"),
                "references": artifacts.get("references", {}).get("status", "missing"),
                "citation_analysis": artifacts.get("citation_analysis", {}).get("status", "missing"),
            },
            "analysis": strip_runtime_managed_fields(analysis),
        })
    index = {
        "schema_id": "synthesis.cross_paper_evidence_index",
        "schema_version": "1.0.0",
        "paper_count": len(paper_refs(conn)),
        "paper_unit_count": len(units),
        "paper_units": units,
        "diagnostics": {
            "missing_paper_refs": missing_paper_analysis_refs(conn),
        },
    }
    relative_path = "runtime/views/cross-paper-evidence-index.json"
    target = root / relative_path
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(pretty_json(index), encoding="utf-8")
    hash_value = sha256_file(target)
    register_artifact(
        conn,
        path=relative_path,
        hash_value=hash_value,
        content_type="json",
        schema_id="synthesis.cross_paper_evidence_index",
        stage="stage_5_paper_units",
        validated=True,
    )
    return {"path": relative_path, "hash": hash_value, "paper_unit_count": len(units)}


def _timeline_events_rows(sections: dict) -> list:
    timeline = sections.get("timeline_events")
    if isinstance(timeline, dict):
        events = timeline.get("events")
        return events if isinstance(events, list) else []
    if isinstance(timeline, list):
        return timeline
    return []


def _set_timeline_events_rows(sections: dict, rows: list) -> None:
    timeline = sections.get("timeline_events")
    if isinstance(timeline, dict):
        next_timeline = dict(timeline)
        next_timeline["events"] = rows
        sections["timeline_events"] = next_timeline
    elif isinstance(timeline, list):
        sections["timeline_events"] = rows


def inject_paper_evidence_ids_and_refs(sections: dict) -> dict:
    """Normalize LLM-authored evidence IDs to deterministic runtime IDs.

    The agent may cite paper_ref values or temporary evidence IDs in claims and
    timeline rows. Runtime rewrites paper_evidence[].id from paper_ref and then
    rewrites evidence_refs to the final deterministic IDs before validation and
    render.
    """

    value = dict(sections)
    paper_evidence = value.get("paper_evidence")
    if not isinstance(paper_evidence, list):
        return value
    ref_map: dict[str, str] = {}
    normalized_evidence: list[object] = []
    for entry in paper_evidence:
        if not isinstance(entry, dict):
            normalized_evidence.append(entry)
            continue
        row = dict(entry)
        old_id = _clean_text(row.get("id"))
        paper_ref = _clean_text(row.get("paper_ref"))
        if not paper_ref:
            paper_ref = old_id
            if paper_ref:
                row["paper_ref"] = paper_ref
        evidence_id = evidence_id_for_paper_ref(paper_ref)
        if old_id:
            ref_map[old_id] = evidence_id
        if paper_ref:
            ref_map[paper_ref] = evidence_id
        row["id"] = evidence_id
        normalized_evidence.append(row)
    value["paper_evidence"] = normalized_evidence

    for section_name in ("claims", "timeline_events"):
        rows = _timeline_events_rows(value) if section_name == "timeline_events" else value.get(section_name)
        if not isinstance(rows, list):
            continue
        normalized_rows: list[object] = []
        for row in rows:
            if not isinstance(row, dict):
                normalized_rows.append(row)
                continue
            next_row = dict(row)
            refs = next_row.get("evidence_refs")
            if isinstance(refs, list):
                next_row["evidence_refs"] = [
                    ref_map.get(_clean_text(ref), _clean_text(ref))
                    for ref in refs
                    if _clean_text(ref)
                ]
            normalized_rows.append(next_row)
        if section_name == "timeline_events":
            _set_timeline_events_rows(value, normalized_rows)
        else:
            value[section_name] = normalized_rows
    return value


def inject_paper_evidence_digest_refs(conn: sqlite3.Connection, paper_evidence: object) -> object:
    if not isinstance(paper_evidence, list):
        return paper_evidence
    digest_refs = {
        bundle.get("paper_ref"): _digest_ref_for_bundle(bundle)
        for bundle in paper_artifact_bundle_values(conn)
    }
    normalized: list[object] = []
    for entry in paper_evidence:
        if not isinstance(entry, dict):
            normalized.append(entry)
            continue
        value = dict(entry)
        paper_ref = str(value.get("paper_ref") or value.get("id") or "").strip()
        supplied = value.get("digest_ref")
        bundle_digest = digest_refs.get(paper_ref)
        if isinstance(supplied, dict):
            supplied_hash = str(supplied.get("payload_hash") or "").strip()
            if supplied_hash and (not bundle_digest or supplied_hash != bundle_digest.get("payload_hash")):
                raise ValueError(f"paper_evidence.digest_ref.payload_hash mismatch for {paper_ref}")
            supplied_type = str(supplied.get("payload_type") or "digest-markdown").strip()
            if supplied_type != "digest-markdown":
                raise ValueError(f"paper_evidence.digest_ref.payload_type must be digest-markdown for {paper_ref}")
        if bundle_digest:
            value["digest_ref"] = bundle_digest
        normalized.append(value)
    return normalized


def inject_section_digest_refs(conn: sqlite3.Connection, sections: dict) -> dict:
    value = inject_paper_evidence_ids_and_refs(sections)
    if "paper_evidence" in value:
        value["paper_evidence"] = inject_paper_evidence_digest_refs(conn, value["paper_evidence"])
    return value


def validate_paper_evidence_against_bundles(conn: sqlite3.Connection, paper_evidence: object) -> None:
    if not isinstance(paper_evidence, list):
        raise ValueError("paper_evidence section must be an array")
    digest_refs = {
        bundle.get("paper_ref"): _digest_ref_for_bundle(bundle)
        for bundle in paper_artifact_bundle_values(conn)
    }
    for entry in paper_evidence:
        if not isinstance(entry, dict):
            raise ValueError("paper_evidence entries must be objects")
        paper_ref = str(entry.get("paper_ref") or entry.get("id") or "").strip()
        digest_ref = entry.get("digest_ref")
        if not isinstance(digest_ref, dict):
            raise ValueError(f"paper_evidence.digest_ref is required for {paper_ref}")
        if digest_ref.get("payload_type") != "digest-markdown":
            raise ValueError(f"paper_evidence.digest_ref.payload_type must be digest-markdown for {paper_ref}")
        payload_hash = str(digest_ref.get("payload_hash") or "").strip()
        if not payload_hash:
            raise ValueError(f"paper_evidence.digest_ref.payload_hash is required for {paper_ref}")
        assert_valid_sha256_hash(payload_hash, f"paper_evidence.digest_ref.payload_hash for {paper_ref}")
        bundle_digest = digest_refs.get(paper_ref)
        if not bundle_digest:
            raise ValueError(f"paper_evidence {paper_ref} has no available digest artifact bundle")
        if payload_hash != bundle_digest.get("payload_hash"):
            raise ValueError(f"paper_evidence.digest_ref.payload_hash mismatch for {paper_ref}")


def _clean_text(value: object) -> str:
    return str(value or "").strip()


def _candidate_ids(rows: object) -> set[str]:
    return {
        _clean_text(row.get("id"))
        for row in rows
        if isinstance(row, dict) and _clean_text(row.get("id"))
    } if isinstance(rows, list) else set()


def _validate_unit_refs(
    rows: object,
    *,
    key: str,
    known_units: set[str],
    label: str,
    require_non_empty: bool,
) -> None:
    if not isinstance(rows, list):
        raise ValueError(f"cross_paper_evidence_map.{label} must be an array")
    for row in rows:
        if not isinstance(row, dict):
            raise ValueError(f"cross_paper_evidence_map.{label} entries must be objects")
        row_id = _clean_text(row.get("id"))
        refs = row.get(key)
        if not isinstance(refs, list):
            raise ValueError(f"cross_paper_evidence_map.{label}.{row_id}.{key} must be an array")
        cleaned = [_clean_text(ref) for ref in refs if _clean_text(ref)]
        if require_non_empty and not cleaned:
            raise ValueError(f"cross_paper_evidence_map.{label}.{row_id}.{key} must not be empty")
        for ref in cleaned:
            if ref not in known_units:
                raise ValueError(f"cross_paper_evidence_map.{label}.{row_id} references unknown paper unit {ref}")


def validate_cross_paper_evidence_map(
    conn: sqlite3.Connection,
    evidence_map: dict,
) -> dict:
    if evidence_map.get("schema_id") != "synthesis.cross_paper_evidence_map":
        raise ValueError("cross_paper_evidence_map.schema_id must be synthesis.cross_paper_evidence_map")
    required = (
        "schema_version",
        "evidence_limits",
        "taxonomy_candidates",
        "comparison_dimensions",
        "claim_candidates",
        "debate_candidates",
        "gap_candidates",
        "review_outline_seeds",
        "diagnostics",
    )
    for key in required:
        if key not in evidence_map:
            raise ValueError(f"cross_paper_evidence_map.{key} is required")
    known_units = {paper_unit_id_for_paper_ref(ref) for ref in paper_refs(conn)}
    _validate_unit_refs(
        evidence_map.get("taxonomy_candidates"),
        key="paper_unit_refs",
        known_units=known_units,
        label="taxonomy_candidates",
        require_non_empty=True,
    )
    _validate_unit_refs(
        evidence_map.get("claim_candidates"),
        key="supporting_paper_unit_refs",
        known_units=known_units,
        label="claim_candidates",
        require_non_empty=True,
    )
    _validate_unit_refs(
        evidence_map.get("comparison_dimensions"),
        key="coverage_refs",
        known_units=known_units,
        label="comparison_dimensions",
        require_non_empty=False,
    )
    debates = evidence_map.get("debate_candidates")
    if not isinstance(debates, list):
        raise ValueError("cross_paper_evidence_map.debate_candidates must be an array")
    for row in debates:
        if not isinstance(row, dict):
            raise ValueError("cross_paper_evidence_map.debate_candidates entries must be objects")
        if not _clean_text(row.get("evidence_type")):
            raise ValueError(f"cross_paper_evidence_map.debate_candidates.{_clean_text(row.get('id'))}.evidence_type is required")
    gaps = evidence_map.get("gap_candidates")
    if not isinstance(gaps, list):
        raise ValueError("cross_paper_evidence_map.gap_candidates must be an array")
    for row in gaps:
        if not isinstance(row, dict):
            raise ValueError("cross_paper_evidence_map.gap_candidates entries must be objects")
        if _clean_text(row.get("gap_type")) not in GAP_TYPES:
            raise ValueError(f"cross_paper_evidence_map.gap_candidates.{_clean_text(row.get('id'))}.gap_type is invalid")
    candidate_ids = set()
    for key in (
        "taxonomy_candidates",
        "claim_candidates",
        "comparison_dimensions",
        "debate_candidates",
        "gap_candidates",
        "review_outline_seeds",
    ):
        candidate_ids.update(_candidate_ids(evidence_map.get(key)))
    if not candidate_ids:
        raise ValueError("cross_paper_evidence_map must contain at least one candidate id")
    return {
        "candidate_ids": sorted(candidate_ids),
        "candidate_counts": {
            key: len(evidence_map.get(key, [])) if isinstance(evidence_map.get(key), list) else 0
            for key in (
                "taxonomy_candidates",
                "comparison_dimensions",
                "claim_candidates",
                "debate_candidates",
                "gap_candidates",
                "review_outline_seeds",
            )
        },
    }


def persist_cross_paper_evidence_map(
    conn: sqlite3.Connection,
    payload: dict,
    *,
    run_root: str | Path = ".",
) -> dict:
    validated = validate_cross_paper_evidence_map(conn, payload)
    relative_path = "runtime/payloads/cross-paper-evidence-map.json"
    target = Path(run_root) / relative_path
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(pretty_json(payload), encoding="utf-8")
    hash_value = sha256_file(target)
    register_artifact(
        conn,
        path=relative_path,
        hash_value=hash_value,
        content_type="json",
        schema_id="synthesis.cross_paper_evidence_map",
        stage="stage_6_cross_paper_map",
        validated=True,
    )
    set_meta(conn, "cross_paper_evidence_map_path", relative_path)
    set_meta(conn, "cross_paper_evidence_map_hash", hash_value)
    set_meta(conn, "cross_paper_evidence_map_candidate_ids", sorted(validated["candidate_ids"]))
    set_meta(conn, "cross_paper_evidence_map_candidate_counts", validated["candidate_counts"])
    return {
        "evidence_map_path": relative_path,
        "evidence_map_hash": hash_value,
        "candidate_ids": validated["candidate_ids"],
        "candidate_counts": validated["candidate_counts"],
    }


def _evidence_map_candidate_ids(conn: sqlite3.Connection) -> set[str]:
    ids = get_meta(conn, "cross_paper_evidence_map_candidate_ids", [])
    if isinstance(ids, list):
        return {_clean_text(value) for value in ids if _clean_text(value)}
    return set()


def _section_evidence_map_ids(sections: dict) -> set[str]:
    evidence_map = sections.get("evidence_map")
    if not isinstance(evidence_map, dict):
        return set()
    ids = {
        _clean_text(value)
        for value in evidence_map.get("candidate_ids", [])
        if _clean_text(value)
    } if isinstance(evidence_map.get("candidate_ids"), list) else set()
    candidates = evidence_map.get("candidates")
    if isinstance(candidates, dict):
        ids.update(_clean_text(key) for key in candidates if _clean_text(key))
    return ids


def _validate_evidence_map_refs(section_name: str, rows: object, known_candidates: set[str]) -> None:
    if not isinstance(rows, list):
        return
    for row in rows:
        if not isinstance(row, dict):
            continue
        row_id = _clean_text(row.get("id") or row.get("title") or row.get("text"))
        refs = row.get("evidence_map_refs")
        if not isinstance(refs, list) or not [_clean_text(ref) for ref in refs if _clean_text(ref)]:
            raise ValueError(f"{section_name} {row_id} requires evidence_map_refs")
        for ref in refs:
            cleaned = _clean_text(ref)
            if cleaned not in known_candidates:
                raise ValueError(f"{section_name} {row_id} references missing evidence_map candidate {cleaned}")


def _validate_nested_evidence_map_refs(section_name: str, value: object, known_candidates: set[str]) -> None:
    if isinstance(value, dict):
        if "evidence_map_refs" in value:
            refs = value.get("evidence_map_refs")
            row_id = _clean_text(value.get("id") or value.get("title") or section_name)
            if not isinstance(refs, list) or not [_clean_text(ref) for ref in refs if _clean_text(ref)]:
                raise ValueError(f"{section_name} {row_id} requires evidence_map_refs")
            for ref in refs:
                cleaned = _clean_text(ref)
                if cleaned not in known_candidates:
                    raise ValueError(f"{section_name} {row_id} references missing evidence_map candidate {cleaned}")
        for entry in value.values():
            _validate_nested_evidence_map_refs(section_name, entry, known_candidates)
    elif isinstance(value, list):
        for entry in value:
            _validate_nested_evidence_map_refs(section_name, entry, known_candidates)


def _has_text(value: dict, keys: Iterable[str]) -> bool:
    for key in keys:
        entry = value.get(key)
        if isinstance(entry, str) and entry.strip():
            return True
        if isinstance(entry, list) and entry:
            return True
        if isinstance(entry, dict) and entry:
            return True
    return False


def _first_text(value: dict, keys: Iterable[str]) -> str:
    for key in keys:
        entry = value.get(key)
        if isinstance(entry, str) and entry.strip():
            return entry.strip()
    return ""


def _schema_file_path(name: str) -> Path:
    return Path(__file__).resolve().parents[1] / "assets" / "schemas" / name


def _schema_path(path: str) -> str:
    return path or "$"


def _schema_type_matches(value: object, expected: str) -> bool:
    if expected == "object":
        return isinstance(value, dict)
    if expected == "array":
        return isinstance(value, list)
    if expected == "string":
        return isinstance(value, str)
    if expected == "integer":
        return isinstance(value, int) and not isinstance(value, bool)
    if expected == "number":
        return isinstance(value, (int, float)) and not isinstance(value, bool)
    if expected == "boolean":
        return isinstance(value, bool)
    if expected == "null":
        return value is None
    return True


def _resolve_schema_ref(schema_root: dict, ref: str) -> dict:
    if not ref.startswith("#/"):
        raise ValueError(f"unsupported schema ref: {ref}")
    current: object = schema_root
    for part in ref[2:].split("/"):
        if not isinstance(current, dict) or part not in current:
            raise ValueError(f"unresolved schema ref: {ref}")
        current = current[part]
    if not isinstance(current, dict):
        raise ValueError(f"schema ref does not resolve to object: {ref}")
    return current


def _validate_json_schema_subset(
    value: object,
    schema: dict,
    schema_root: dict,
    *,
    path: str = "$",
) -> list[str]:
    errors: list[str] = []
    if "$ref" in schema:
        return _validate_json_schema_subset(
            value,
            _resolve_schema_ref(schema_root, str(schema["$ref"])),
            schema_root,
            path=path,
        )

    if "anyOf" in schema:
        any_of = schema.get("anyOf")
        if not isinstance(any_of, list):
            errors.append(f"{_schema_path(path)} schema anyOf must be an array")
        else:
            branch_errors = [
                _validate_json_schema_subset(value, branch, schema_root, path=path)
                for branch in any_of
                if isinstance(branch, dict)
            ]
            if not any(not branch for branch in branch_errors):
                errors.append(f"{_schema_path(path)} must match at least one allowed schema")

    if "not" in schema and isinstance(schema["not"], dict):
        not_errors = _validate_json_schema_subset(value, schema["not"], schema_root, path=path)
        if not not_errors:
            errors.append(f"{_schema_path(path)} contains a forbidden schema shape")

    if "const" in schema and value != schema["const"]:
        errors.append(f"{_schema_path(path)} must be {schema['const']!r}")
    if "enum" in schema and value not in schema.get("enum", []):
        errors.append(f"{_schema_path(path)} must be one of {schema.get('enum')}")

    expected_type = schema.get("type")
    if expected_type is not None:
        expected_types = expected_type if isinstance(expected_type, list) else [expected_type]
        if not any(_schema_type_matches(value, str(entry)) for entry in expected_types):
            errors.append(f"{_schema_path(path)} must be type {expected_types}")
            return errors

    if isinstance(value, str):
        min_length = schema.get("minLength")
        if isinstance(min_length, int) and len(value) < min_length:
            errors.append(f"{_schema_path(path)} must contain at least {min_length} characters")
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        minimum = schema.get("minimum")
        maximum = schema.get("maximum")
        if isinstance(minimum, (int, float)) and value < minimum:
            errors.append(f"{_schema_path(path)} must be >= {minimum}")
        if isinstance(maximum, (int, float)) and value > maximum:
            errors.append(f"{_schema_path(path)} must be <= {maximum}")
    if isinstance(value, list):
        min_items = schema.get("minItems")
        if isinstance(min_items, int) and len(value) < min_items:
            errors.append(f"{_schema_path(path)} must contain at least {min_items} items")
        item_schema = schema.get("items")
        if isinstance(item_schema, dict):
            for index, entry in enumerate(value):
                errors.extend(
                    _validate_json_schema_subset(
                        entry,
                        item_schema,
                        schema_root,
                        path=f"{path}[{index}]",
                    )
                )
    if isinstance(value, dict):
        required = schema.get("required")
        if isinstance(required, list):
            for key in required:
                if key not in value:
                    errors.append(f"{_schema_path(path)}.{key} is required")
        min_properties = schema.get("minProperties")
        if isinstance(min_properties, int) and len(value) < min_properties:
            errors.append(f"{_schema_path(path)} must contain at least {min_properties} properties")
        properties = schema.get("properties")
        if isinstance(properties, dict):
            for key, prop_schema in properties.items():
                if key in value and isinstance(prop_schema, dict):
                    errors.extend(
                        _validate_json_schema_subset(
                            value[key],
                            prop_schema,
                            schema_root,
                            path=f"{path}.{key}",
                        )
                    )
        additional = schema.get("additionalProperties")
        if isinstance(additional, dict):
            declared = set(properties.keys()) if isinstance(properties, dict) else set()
            for key, entry in value.items():
                if key not in declared:
                    errors.extend(
                        _validate_json_schema_subset(
                            entry,
                            additional,
                            schema_root,
                            path=f"{path}.{key}",
                        )
                    )
    return errors


def validate_topic_synthesis_artifact_schema(artifact: dict) -> None:
    schema = read_json_file(_schema_file_path("topic_synthesis_artifact.schema.json"))
    if not isinstance(schema, dict):
        raise ValueError("topic_synthesis_artifact schema must be a JSON object")
    errors = _validate_json_schema_subset(artifact, schema, schema)
    if errors:
        raise ValueError("topic_synthesis_artifact_schema_failed: " + "; ".join(errors[:25]))


def _statistics_paper_count(sections: dict) -> int:
    statistics = sections.get("statistics", {})
    if isinstance(statistics, dict):
        try:
            return int(statistics.get("paper_count") or 0)
        except Exception:
            return 0
    return 0


def _paragraph_count(text: str) -> int:
    return len([entry for entry in re.split(r"\n\s*\n+", text.strip()) if entry.strip()])


def _report_dimension_errors(sections: dict) -> list[str]:
    errors: list[str] = []
    topic = sections.get("topic", {})
    if not isinstance(topic, dict) or not (
        _clean_text(topic.get("definition"))
        and _has_text(topic, ("discipline", "field", "research_field", "research_area"))
        and (isinstance(topic.get("scope_boundary"), dict) or _clean_text(topic.get("scope")))
    ):
        errors.append("topic definition/scope")

    taxonomy = sections.get("taxonomy", {})
    if not isinstance(taxonomy, dict) or not (
        isinstance(taxonomy.get("summary"), dict)
        and _has_text(taxonomy["summary"], ("text", "analysis", "overview"))
        and isinstance(taxonomy.get("nodes"), list)
        and taxonomy.get("nodes")
    ):
        errors.append("research routes")

    timeline = sections.get("timeline_events", {})
    if not isinstance(timeline, dict) or not (
        isinstance(timeline.get("summary"), dict)
        and _has_text(timeline["summary"], ("text", "analysis", "overview"))
        and isinstance(timeline.get("events"), list)
        and timeline.get("events")
    ):
        errors.append("historical progression")

    claims = sections.get("claims")
    if not isinstance(claims, list) or not claims:
        errors.append("core findings")

    comparison = sections.get("comparison_matrix", {})
    debates = sections.get("debates", [])
    comparison_rows = comparison.get("rows") if isinstance(comparison, dict) else None
    if not ((isinstance(comparison_rows, list) and comparison_rows) or (isinstance(debates, list) and debates)):
        errors.append("comparison/debates")

    coverage = sections.get("coverage", {})
    if not isinstance(coverage, dict) or not (
        _clean_text(coverage.get("coverage_verdict"))
        and _has_text(coverage, ("route_coverage_summary", "claim_coverage_summary", "timeline_coverage_summary"))
    ):
        errors.append("gaps/coverage")

    external = sections.get("external_literature_analysis", {})
    if not isinstance(external, dict) or not (
        _clean_text(external.get("summary"))
        and isinstance(external.get("themes"), list)
        and external.get("themes")
        and isinstance(external.get("suggested_additions"), list)
    ):
        errors.append("external literature/collection suggestion")
    return errors


def _validate_synthesis_report_depth(sections: dict) -> None:
    report = sections.get("synthesis_report", {})
    if not isinstance(report, dict):
        raise ValueError("synthesis_report must be an object")
    if not _clean_text(report.get("title")):
        raise ValueError("synthesis_report.title is required")
    body = _first_text(report, ("body", "markdown", "text", "report"))
    paper_count = _statistics_paper_count(sections)
    min_length = 400 if paper_count and paper_count < 5 else 800
    if len(body) < min_length:
        raise ValueError(
            f"synthesis_report body must contain at least {min_length} characters of substantive continuous prose"
        )
    if paper_count >= 5 and _paragraph_count(body) < 3:
        raise ValueError("synthesis_report body must contain multiple paragraphs for medium/large topics")
    missing_dimensions = _report_dimension_errors(sections)
    if missing_dimensions:
        raise ValueError(
            "synthesis_report source dimensions incomplete: "
            + ", ".join(missing_dimensions)
        )
    source_chapters = report.get("source_section_chapters")
    if not isinstance(source_chapters, dict):
        raise ValueError("synthesis_report.source_section_chapters is required")
    if source_chapters.get("research_routes") != "taxonomy.summary":
        raise ValueError("synthesis_report.source_section_chapters.research_routes must be taxonomy.summary")
    if source_chapters.get("historical_progression") != "timeline_events.summary":
        raise ValueError("synthesis_report.source_section_chapters.historical_progression must be timeline_events.summary")


def _validate_content_depth(sections: dict) -> None:
    topic = sections.get("topic", {})
    if isinstance(topic, dict):
        if not _has_text(topic, ("discipline", "field", "research_field", "research_area")):
            raise ValueError("topic requires discipline/research field metadata")
        if not (isinstance(topic.get("scope_boundary"), dict) or _clean_text(topic.get("scope"))):
            raise ValueError("topic requires scope_boundary or scope")

    taxonomy = sections.get("taxonomy", {})
    if isinstance(taxonomy, dict):
        if not _clean_text(taxonomy.get("primary_axis") or taxonomy.get("axis")):
            raise ValueError("taxonomy requires primary_axis")
        summary = taxonomy.get("summary")
        if not isinstance(summary, dict):
            raise ValueError("taxonomy.summary is required")
        if not _has_text(summary, ("text", "analysis", "overview")):
            raise ValueError("taxonomy.summary requires text/analysis")
        nodes = taxonomy.get("nodes")
        if not isinstance(nodes, list) or not nodes:
            raise ValueError("taxonomy.nodes requires at least one research route")
        required_route_fields = {
            "definition": ("definition", "route_definition", "description"),
            "core_problem": ("core_problem", "problem", "target_problem"),
            "mechanism": ("mechanism", "technical_mechanism", "core_mechanism"),
            "representative_papers": ("representative_papers", "paper_refs", "evidence_refs"),
            "strengths": ("strengths", "advantages"),
            "limitations": ("limitations", "weaknesses"),
            "maturity": ("maturity", "status", "development_stage"),
        }
        for node in nodes:
            if not isinstance(node, dict):
                continue
            node_id = _first_text(node, ("id", "title", "label", "name")) or "(unknown)"
            for field, aliases in required_route_fields.items():
                if not _has_text(node, aliases):
                    raise ValueError(f"taxonomy route {node_id} requires {field}")

    for claim in sections.get("claims", []) if isinstance(sections.get("claims"), list) else []:
        if not isinstance(claim, dict):
            continue
        claim_id = _first_text(claim, ("id", "text", "claim"))
        if not _has_text(claim, ("analysis", "rationale", "argument", "explanation")):
            raise ValueError(f"claim {claim_id} requires analysis/rationale")
        if not _has_text(claim, ("limitations", "scope", "applicability")):
            raise ValueError(f"claim {claim_id} requires limitations or scope")

    timeline_section = sections.get("timeline_events")
    if not isinstance(timeline_section, dict):
        raise ValueError("timeline_events must be an object with summary and events")
    timeline_summary = timeline_section.get("summary")
    if not isinstance(timeline_summary, dict):
        raise ValueError("timeline_events.summary is required")
    if not _has_text(timeline_summary, ("text", "analysis", "overview")):
        raise ValueError("timeline_events.summary requires text/analysis")
    timeline_events = timeline_section.get("events")
    if not isinstance(timeline_events, list) or not timeline_events:
        raise ValueError("timeline_events.events requires at least one event")
    for event in timeline_events:
        if not isinstance(event, dict):
            continue
        event_id = _first_text(event, ("id", "label", "title"))
        if not _has_text(event, ("description", "analysis", "why_it_matters")):
            raise ValueError(f"timeline {event_id} requires description/analysis")
        if not _has_text(event, ("phase", "stage", "progression_logic", "follow_on_effect")):
            raise ValueError(f"timeline {event_id} requires phase or progression logic")

    external = sections.get("external_literature_analysis", {})
    if isinstance(external, dict):
        if not isinstance(external.get("themes"), list) or not external.get("themes"):
            raise ValueError("external_literature_analysis themes are required")
        if not isinstance(external.get("representative_references"), list):
            raise ValueError("external_literature_analysis representative_references are required")
        if not _has_text(external, ("coverage_verdict", "coverage_judgment")):
            raise ValueError("external_literature_analysis coverage_verdict is required")
        if not isinstance(external.get("suggested_additions"), list):
            raise ValueError("external_literature_analysis suggested_additions are required")

    statistics = sections.get("statistics", {})
    if not isinstance(statistics, dict):
        raise ValueError("statistics must be an object")
    for key in ("paper_count", "time_span", "route_coverage", "coverage_verdict"):
        if key not in statistics:
            raise ValueError(f"statistics.{key} is required")

    report = sections.get("synthesis_report", {})
    if not isinstance(report, dict):
        raise ValueError("synthesis_report must be an object")
    _validate_synthesis_report_depth(sections)


def validate_topic_section_contract(
    conn: sqlite3.Connection,
    sections: dict,
    *,
    require_complete: bool,
) -> None:
    """Mirror host structured-artifact checks before render/apply.

    This catches agent-written cross-section reference errors in the skill
    runtime instead of letting host apply fail after a long run.
    """

    if require_complete:
        missing = [name for name in REQUIRED_FULL_SECTIONS if name not in sections]
        if missing:
            raise ValueError("missing_required_sections: " + ", ".join(missing))
        if not _evidence_map_candidate_ids(conn):
            raise ValueError("cross_paper_evidence_map must be validated before final sections")
        _validate_content_depth(sections)

    paper_evidence = sections.get("paper_evidence", [])
    if "paper_evidence" in sections or require_complete:
        validate_paper_evidence_against_bundles(conn, paper_evidence)
        if not isinstance(paper_evidence, list):
            raise ValueError("paper_evidence section must be an array")
    else:
        paper_evidence = []

    known_evidence: set[str] = set()
    for entry in paper_evidence if isinstance(paper_evidence, list) else []:
        if not isinstance(entry, dict):
            raise ValueError("paper_evidence entries must be objects")
        evidence_id = _clean_text(entry.get("id"))
        if not evidence_id:
            raise ValueError("paper_evidence.id is required after runtime evidence-id injection")
        known_evidence.add(evidence_id)

    def validate_refs(section_name: str, label: str) -> None:
        if section_name not in sections and not require_complete:
            return
        rows = _timeline_events_rows(sections) if section_name == "timeline_events" else sections.get(section_name, [])
        if not isinstance(rows, list):
            raise ValueError(f"{section_name} section must be an array")
        for row in rows:
            if not isinstance(row, dict):
                continue
            row_id = _clean_text(row.get("id") or row.get("claim") or row.get("event"))
            refs = [_clean_text(ref) for ref in row.get("evidence_refs", [])] if isinstance(row.get("evidence_refs"), list) else []
            if not refs:
                raise ValueError(f"{label} {row_id} requires evidence_refs")
            for ref in refs:
                if ref.startswith("external:"):
                    raise ValueError(f"{label} {row_id} must not use external references as library paper evidence")
                if ref not in known_evidence:
                    raise ValueError(f"{label} {row_id} references missing paper_evidence {ref}")

    if known_evidence:
        validate_refs("claims", "claim")
        validate_refs("timeline_events", "timeline")
    elif require_complete:
        # With no primary evidence, claims/timeline must be empty or absent from the
        # semantic output. They cannot cite paper refs that are not evidence ids.
        validate_refs("claims", "claim")
        validate_refs("timeline_events", "timeline")

    external = sections.get("external_literature_analysis")
    if require_complete or "external_literature_analysis" in sections:
        if not isinstance(external, dict):
            raise ValueError("external_literature_analysis must be an object")
        if "summary" not in external:
            raise ValueError("external_literature_analysis summary is required")

    known_candidates = _evidence_map_candidate_ids(conn)
    final_candidates = _section_evidence_map_ids(sections)
    if require_complete or known_candidates or final_candidates:
        if require_complete and not final_candidates:
            raise ValueError("evidence_map.candidate_ids is required and must not be empty")
        if known_candidates and not known_candidates.issubset(final_candidates):
            missing_from_final = sorted(known_candidates - final_candidates)
            raise ValueError(
                "evidence_map.candidate_ids missing validated candidates: "
                + ", ".join(missing_from_final)
            )
        if not final_candidates:
            final_candidates = known_candidates
        evidence_map_section = sections.get("evidence_map", {})
        if not isinstance(evidence_map_section, dict):
            raise ValueError("evidence_map must be an object")
        _validate_evidence_map_refs("claims", sections.get("claims", []), final_candidates)
        _validate_evidence_map_refs("timeline_events", _timeline_events_rows(sections), final_candidates)
        _validate_nested_evidence_map_refs("taxonomy", sections.get("taxonomy", {}), final_candidates)
        _validate_nested_evidence_map_refs("comparison_matrix", sections.get("comparison_matrix", {}), final_candidates)
        _validate_evidence_map_refs("debates", sections.get("debates", []), final_candidates)
        _validate_evidence_map_refs("gaps", sections.get("gaps", []), final_candidates)
        _validate_nested_evidence_map_refs("review_outline", sections.get("review_outline", {}), final_candidates)
    for gap in sections.get("gaps", []) if isinstance(sections.get("gaps"), list) else []:
        if isinstance(gap, dict) and _clean_text(gap.get("gap_type")) not in GAP_TYPES:
            raise ValueError(f"gaps {_clean_text(gap.get('id'))} requires a valid gap_type")
    for event in _timeline_events_rows(sections):
        if isinstance(event, dict) and _clean_text(event.get("year")).lower() == "unknown" and _clean_text(event.get("time_basis")) != "inferred_phase":
            raise ValueError(f"timeline {_clean_text(event.get('id'))} with unknown year must use time_basis=inferred_phase")


def artifact_status_counts(bundles: list[dict]) -> dict:
    counts = {
        artifact_type: {"available": 0, "missing": 0, "decode_error": 0, "unsupported": 0}
        for artifact_type in ARTIFACT_TYPES
    }
    for bundle in bundles:
        for artifact in bundle.get("artifacts", []):
            artifact_type = artifact.get("artifact_type")
            status = artifact.get("status")
            if artifact_type in counts and status in counts[artifact_type]:
                counts[artifact_type][status] += 1
    return counts


def strip_hash_fields(value: object) -> object:
    if isinstance(value, list):
        return [strip_hash_fields(entry) for entry in value]
    if isinstance(value, dict):
        return {
            key: strip_hash_fields(entry)
            for key, entry in value.items()
            if key not in {"payload_hash", "hash"}
        }
    return value


def _artifact_map(bundle: dict) -> dict[str, dict]:
    return {
        artifact.get("artifact_type"): artifact
        for artifact in bundle.get("artifacts", [])
        if isinstance(artifact, dict) and artifact.get("artifact_type")
    }


def _paper_title_year(workset_row: dict) -> tuple[str, str]:
    source = workset_row.get("source") if isinstance(workset_row.get("source"), dict) else {}
    title = _clean_text(workset_row.get("title") or source.get("title"))
    year = _clean_text(workset_row.get("year") or source.get("year"))
    return title, year


def _markdown_escape_cell(value: object) -> str:
    text = _clean_text(value).replace("\r", " ").replace("\n", " ")
    return text.replace("|", "\\|")


def _compact_authors(value: object) -> str:
    if isinstance(value, list):
        authors = [_clean_text(entry) for entry in value if _clean_text(entry)]
        if len(authors) > 2:
            return "; ".join(authors[:2]) + "; et al."
        return "; ".join(authors)
    return _clean_text(value)


def _artifact_text_from_file(run_root: str | Path, artifact: dict) -> str:
    if artifact.get("status") != "available":
        return ""
    content_file = str(artifact.get("content_file") or "").strip()
    if not content_file:
        return ""
    path = resolve_run_relative_path(run_root, content_file)
    expected_hash = str(artifact.get("content_hash") or "").strip()
    if expected_hash:
        actual_hash = sha256_file(path)
        if actual_hash != expected_hash:
            raise ValueError(
                f"artifact content_hash mismatch for {content_file}: expected {expected_hash}, got {actual_hash}"
            )
    return read_text_file(path)


def filter_digest_for_cross_paper_context(markdown: str) -> tuple[str, dict]:
    """Keep the first four top-level ## sections without truncation.

    The filter is heading-order based rather than title based so multilingual
    digest headings remain stable. It deliberately drops later sections such as
    limitations/reproducibility clues and chapter-by-chapter summaries.
    """

    lines = str(markdown or "").splitlines()
    kept: list[str] = []
    kept_headings: list[str] = []
    dropped_headings: list[str] = []
    top_level_index = 0
    keep_current = True
    for line in lines:
        if re.match(r"^##\s+", line):
            top_level_index += 1
            keep_current = top_level_index <= 4
            if keep_current:
                kept_headings.append(line.strip())
            else:
                dropped_headings.append(line.strip())
        if keep_current:
            kept.append(line)
    return "\n".join(kept).strip(), {
        "kept_top_level_sections": kept_headings,
        "dropped_top_level_sections": dropped_headings,
        "policy": "keep first four top-level ## sections without truncation",
    }


def compact_reference_row(reference: dict) -> str:
    """Render one external reference with only id/year/authors/title.

    references raw fields, parser internals, confidence scores, and matching
    metadata are intentionally excluded from LLM-facing contexts.
    """

    ref_id = _markdown_escape_cell(reference.get("id"))
    year = _markdown_escape_cell(reference.get("year"))
    authors = _markdown_escape_cell(_compact_authors(reference.get("author") or reference.get("authors")))
    title = _markdown_escape_cell(reference.get("title"))
    return f"| {ref_id} | {year} | {authors} | {title} |"


def _artifact_references(run_root: str | Path, artifact: dict) -> list[dict]:
    if artifact.get("status") != "available":
        return []
    content_file = str(artifact.get("content_file") or "").strip()
    if not content_file:
        return []
    payload = read_json_file(resolve_run_relative_path(run_root, content_file))
    if not isinstance(payload, dict):
        return []
    refs = payload.get("references")
    return [entry for entry in refs if isinstance(entry, dict)] if isinstance(refs, list) else []


def _citation_report_md(run_root: str | Path, artifact: dict) -> str:
    return _artifact_text_from_file(run_root, artifact).strip()


def _analysis_markdown(analysis: dict) -> str:
    lines = [
        "### Per-Paper Analysis",
        f"- Topic relevance: {_clean_text(analysis.get('topic_relevance')) or 'unknown'}",
        f"- Method contribution: {_clean_text(analysis.get('method_contribution')) or 'unknown'}",
        f"- Evidence available: {str(bool(analysis.get('evidence_available'))).lower()}",
    ]
    graph_interpretation = analysis.get("graph_metrics_interpretation")
    if isinstance(graph_interpretation, dict):
        synthesis_use = _clean_text(graph_interpretation.get("synthesis_use"))
        caveat = _clean_text(graph_interpretation.get("caveat"))
        if synthesis_use:
            lines.append(f"- Graph metrics use: {synthesis_use}")
        if caveat:
            lines.append(f"- Graph metrics caveat: {caveat}")
    for label, key in (
        ("Findings", "findings"),
        ("Limitations", "limitations"),
    ):
        value = _clean_text(analysis.get(key))
        if value:
            lines.append(f"- {label}: {value}")
    return "\n".join(lines)


def _paper_heading(paper_ref: str, title: str, year: str) -> str:
    suffix = f" — {title}" if title else ""
    year_part = f" ({year})" if year else ""
    return f"## Paper {paper_ref}{year_part}{suffix}"


def _metric_number(value: object) -> str:
    if isinstance(value, (int, float)):
        return f"{value:.6g}"
    return "unknown"


def _metric_role_hints(metric: dict) -> list[str]:
    hints = metric.get("synthesis_role_hints")
    return [str(hint) for hint in hints if str(hint).strip()] if isinstance(hints, list) else []


def _metric_markdown(metric: dict) -> str:
    if not metric or metric.get("status") != "ready":
        return f"- Metrics status: {_clean_text(metric.get('status')) or 'missing'}"
    hints = _metric_role_hints(metric)
    return "\n".join([
        "- Metrics status: ready",
        f"- Role hints: {', '.join(hints) if hints else 'none'}",
        f"- Internal degree: in={metric.get('internal_in_degree', 0)}, out={metric.get('internal_out_degree', 0)}",
        f"- PageRank: {_metric_number(metric.get('internal_pagerank'))}",
        f"- Scores: foundation={_metric_number(metric.get('foundation_score'))}, frontier={_metric_number(metric.get('frontier_score'))}",
        f"- Component: {metric.get('component_id', 'unknown')} size={metric.get('component_size', 'unknown')} isolated={str(bool(metric.get('is_isolated'))).lower()}",
        f"- External/unresolved references: external={metric.get('external_reference_count', 0)}, unresolved={metric.get('unresolved_reference_count', 0)}",
    ])


def _top_metric_refs(metrics: list[dict], role: str, score_key: str, limit: int = 8) -> list[str]:
    rows = [
        metric
        for metric in metrics
        if metric.get("status") == "ready" and role in _metric_role_hints(metric)
    ]
    rows.sort(key=lambda row: (float(row.get(score_key) or 0), str(row.get("paper_ref") or "")), reverse=True)
    return [str(row.get("paper_ref") or "").strip() for row in rows[:limit] if str(row.get("paper_ref") or "").strip()]


def _metrics_summary_markdown(metrics: list[dict]) -> list[str]:
    status_counts: dict[str, int] = {}
    for metric in metrics:
        status = str(metric.get("status") or "missing")
        status_counts[status] = status_counts.get(status, 0) + 1
    return [
        "",
        "## Citation Graph Metrics Summary",
        "",
        "Use these graph-derived metrics only as auxiliary structure signals; they are not evidence for claims or timeline events.",
        f"- Status counts: {json.dumps(status_counts, ensure_ascii=False, sort_keys=True)}",
        f"- Core candidates: {', '.join(_top_metric_refs(metrics, 'core', 'foundation_score')) or 'none'}",
        f"- Foundation candidates: {', '.join(_top_metric_refs(metrics, 'foundation', 'foundation_score')) or 'none'}",
        f"- Frontier candidates: {', '.join(_top_metric_refs(metrics, 'frontier', 'frontier_score')) or 'none'}",
        f"- Isolated papers: {', '.join(_top_metric_refs(metrics, 'isolated', 'foundation_score', 12)) or 'none'}",
        f"- External-heavy papers: {', '.join(_top_metric_refs(metrics, 'external-heavy', 'foundation_score', 12)) or 'none'}",
    ]


def build_cross_paper_context_views(conn: sqlite3.Connection, run_root: str | Path = ".") -> dict:
    """Build filtered LLM-facing Markdown contexts and a small manifest.

    The Markdown views are allowlist renderings. They must not expose raw payload
    bodies, raw HTML, note HTML, full artifact payload objects, or references raw
    fields to the agent.
    """

    require_stage4_action_receipts_complete(conn)
    bundles = paper_artifact_bundle_values(conn)
    analyses = paper_analysis_values(conn)
    metrics = citation_graph_metric_values(conn)
    workset = paper_workset_values(conn)
    bundles_by_ref = {bundle.get("paper_ref"): bundle for bundle in bundles}
    analyses_by_ref = {analysis.get("paper_ref"): analysis for analysis in analyses}
    metrics_by_ref = {metric.get("paper_ref"): metric for metric in metrics}
    workset_by_ref = {row.get("paper_ref"): row for row in workset}
    paper_manifest: list[dict] = []
    main_lines = [
        "# Cross-Paper Synthesis Context",
        "",
        "Use this context for overview, claims, timeline, paper evidence, coverage, and gaps.",
        "External references and citation reports are intentionally separated into external-literature-context.md.",
    ]
    main_lines.extend(_metrics_summary_markdown(metrics))
    external_lines = [
        "# External Literature Context",
        "",
        "Use this context only for external_literature_analysis.",
        "Each paper groups compact references with that paper's citation analysis report.",
    ]

    for paper_ref in paper_refs(conn):
        bundle = bundles_by_ref.get(paper_ref, {"artifacts": []})
        analysis = analyses_by_ref.get(paper_ref, {"paper_ref": paper_ref})
        title, year = _paper_title_year(workset_by_ref.get(paper_ref, {"paper_ref": paper_ref}))
        artifacts = _artifact_map(bundle)
        digest = artifacts.get("digest", {})
        references = artifacts.get("references", {})
        citation = artifacts.get("citation_analysis", {})
        metric = metrics_by_ref.get(paper_ref, {"paper_ref": paper_ref, "status": "missing"})

        digest_markdown = _artifact_text_from_file(run_root, digest)
        digest_filter = {
            "policy": "host exported filtered digest content with demoted headings",
        }
        main_lines.extend([
            "",
            _paper_heading(paper_ref, title, year),
            "",
            f"- Paper ref: {paper_ref}",
            f"- Title: {title or 'unknown'}",
            f"- Year: {year or 'unknown'}",
            "",
            "### Citation Graph Metrics",
            _metric_markdown(metric),
            "",
            _analysis_markdown(analysis),
            "",
            "### Filtered Digest",
            digest_markdown or "_Digest artifact missing or empty._",
        ])

        refs = _artifact_references(run_root, references)
        report_md = _citation_report_md(run_root, citation)
        external_lines.extend([
            "",
            _paper_heading(paper_ref, title, year),
            "",
            f"- Paper ref: {paper_ref}",
            f"- Title: {title or 'unknown'}",
            f"- Year: {year or 'unknown'}",
            "",
        ])
        if metric.get("status") == "ready" and (
            "external-heavy" in _metric_role_hints(metric)
            or int(metric.get("external_reference_count") or 0) > 0
            or int(metric.get("unresolved_reference_count") or 0) > 0
        ):
            external_lines.extend([
                "### Citation Graph External Dependency Hint",
                f"- Role hints: {', '.join(_metric_role_hints(metric)) or 'none'}",
                f"- External/unresolved references: external={metric.get('external_reference_count', 0)}, unresolved={metric.get('unresolved_reference_count', 0)}",
                "",
            ])
        external_lines.append("### Compact References")
        if refs:
            external_lines.extend([
                "| id | year | authors | title |",
                "| --- | --- | --- | --- |",
                *[compact_reference_row(ref) for ref in refs],
            ])
        else:
            external_lines.append("_No references artifact rows available._")
        external_lines.extend([
            "",
            "### Citation Analysis Report",
            report_md or "_No citation analysis report available._",
        ])

        paper_manifest.append({
            "paper_ref": paper_ref,
            "title": title,
            "year": year,
            "digest_status": digest.get("status", "missing"),
            "references_status": references.get("status", "missing"),
            "citation_analysis_status": citation.get("status", "missing"),
            "reference_count": len(refs),
            "citation_report_present": bool(report_md),
            "digest_filter": digest_filter,
            "citation_graph_metrics_status": metric.get("status", "missing"),
            "citation_graph_role_hints": _metric_role_hints(metric),
        })

    manifest = {
        "schema_id": "synthesis.cross_paper_context_manifest",
        "schema_version": "1.0.0",
        "paper_count": len(paper_refs(conn)),
        "bundle_receipt_count": len(bundles),
        "analysis_count": len(analyses),
        "artifact_counts": artifact_status_counts(bundles),
        "context_paths": {
            "main": "runtime/views/cross-paper-context.md",
            "external_literature": "runtime/views/external-literature-context.md",
            "manifest": "runtime/views/cross-paper-context.manifest.json",
        },
        "filtering": {
            "digest": "Keep the first four top-level ## sections without truncation.",
            "references": "Keep only id/year/authors/title; exclude references raw fields and parser internals.",
            "citation_analysis": "Keep only citation_analysis.report_md without truncation.",
            "security": "Expose only renderer allowlist fields; exclude raw note bodies and artifact internals.",
        },
        "papers": paper_manifest,
        "diagnostics": {
            "missing_bundle_refs": missing_paper_artifact_bundle_refs(conn),
            "missing_analysis_refs": missing_paper_analysis_refs(conn),
            "missing_citation_graph_metric_refs": missing_citation_graph_metric_refs(conn),
            "missing_citation_graph_metric_action_receipt_refs": missing_citation_graph_metric_receipt_refs(conn),
            "missing_bundle_action_receipt_refs": missing_paper_artifact_bundle_receipt_refs(conn),
            "missing_analysis_action_receipt_refs": missing_paper_analysis_receipt_refs(conn),
        },
    }
    return {
        "main_markdown": "\n".join(main_lines).strip() + "\n",
        "external_markdown": "\n".join(external_lines).strip() + "\n",
        "manifest": manifest,
    }


def register_artifact(
    conn: sqlite3.Connection,
    *,
    path: str,
    hash_value: str,
    content_type: str,
    schema_id: str,
    stage: str,
    validated: bool,
) -> None:
    conn.execute(
        """
        insert or replace into artifact_registry
          (path, hash, content_type, schema_id, stage, validated)
        values (?, ?, ?, ?, ?, ?)
        """,
        (path, hash_value, content_type, schema_id, stage, 1 if validated else 0),
    )
    conn.commit()


def register_section_output(
    conn: sqlite3.Connection,
    *,
    section_name: str,
    path: str,
    hash_value: str,
    content_type: str = "json",
    stage: str = "stage_11_render_and_validate",
) -> None:
    conn.execute(
        """
        insert or replace into section_outputs(section_name, path, hash, content_type, stage)
        values (?, ?, ?, ?, ?)
        """,
        (section_name, path, hash_value, content_type, stage),
    )
    conn.commit()


def artifact_hash(conn: sqlite3.Connection, path: str) -> str | None:
    row = conn.execute("select hash from artifact_registry where path = ?", (path,)).fetchone()
    return row["hash"] if row else None


def all_required_final_artifacts_registered(conn: sqlite3.Connection, *, operation: str = "create") -> bool:
    manifest_path = (
        "result/topic-analysis.patch.json"
        if operation == "update_patch"
        else "result/topic-analysis.json"
    )
    required = {
        manifest_path,
        "result/result.json",
        "result/sidecars/concept-cards-proposal.json",
        "result/sidecars/topic-graph-relation-proposals.json",
    }
    rows = conn.execute("select path from artifact_registry where validated = 1").fetchall()
    registered = {row["path"] for row in rows}
    return required.issubset(registered)


def paper_workset_values(conn: sqlite3.Connection) -> list[dict]:
    rows = conn.execute("select value_json from paper_workset order by paper_ref").fetchall()
    return [json.loads(row["value_json"]) for row in rows]


def paper_analysis_values(conn: sqlite3.Connection) -> list[dict]:
    rows = conn.execute("select analysis_json from paper_analysis order by paper_ref").fetchall()
    return [json.loads(row["analysis_json"]) for row in rows]
