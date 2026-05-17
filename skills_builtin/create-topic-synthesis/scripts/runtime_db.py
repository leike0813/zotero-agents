"""Run-local SQLite state for create-topic-synthesis.

The SQLite database is the only run-local process state. Prompt memory and
loose files are not valid state. This runtime never writes plugin canonical
assets or Zotero note shards.
"""

from __future__ import annotations

import hashlib
import json
import re
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable

SCHEMA_VERSION = "topic-synthesis-skill-runtime/4"
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
    "stage_0_bootstrap",
    "stage_1_topic_intent",
    "stage_2_resolver",
    "stage_3_paper_workset",
    "stage_4_per_paper_analysis",
    "stage_5_cross_paper_synthesis",
    "stage_6_render_and_validate",
    "stage_7_completed",
)

REQUIRED_FULL_SECTIONS = (
    "topic",
    "summary",
    "claims",
    "timeline_events",
    "paper_evidence",
    "external_literature_analysis",
    "coverage",
    "gaps",
    "source_artifacts",
    "diagnostics",
)

ARTIFACT_TYPES = ("digest", "references", "citation_analysis")

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
        create table if not exists paper_analysis (
          paper_ref text primary key,
          analysis_json text not null
        );
        create table if not exists section_payloads (
          section_name text primary key,
          value_json text not null
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
    row = conn.execute("select state from stages where stage = ?", (stage,)).fetchone()
    return row["state"] if row else "pending"


def completed_stages(conn: sqlite3.Connection) -> set[str]:
    return {
        row["stage"]
        for row in conn.execute("select stage from stages where state = 'completed'")
    }


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
    put_key_value(conn, "topic_intent", "payload", payload)
    if "topic_definition" in payload:
        put_key_value(conn, "topic_intent", "topic_definition", payload["topic_definition"])
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
    conn.commit()
    return {"stored_keys": sorted(payload.keys())}


def _paper_ref_from_value(value: object) -> str:
    if isinstance(value, str):
        return value
    if isinstance(value, dict):
        for key in ("paper_ref", "ref", "id", "item_key", "itemKey", "citekey"):
            candidate = value.get(key)
            if isinstance(candidate, str) and candidate:
                return candidate
    raise ValueError(f"paper entry does not contain a stable paper_ref: {value!r}")


def persist_paper_workset(conn: sqlite3.Connection, payload: dict) -> dict:
    papers = payload.get("papers")
    if papers is None:
        resolved = payload.get("resolved_paper_set", {})
        papers = resolved.get("papers") if isinstance(resolved, dict) else None
    if not isinstance(papers, list):
        raise ValueError("persist_paper_workset payload must contain papers[] or resolved_paper_set.papers[]")

    conn.execute("delete from paper_workset")
    conn.execute("delete from paper_artifact_locators")
    conn.execute("delete from paper_artifact_bundles")
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


def missing_paper_artifact_bundle_refs(conn: sqlite3.Connection) -> list[str]:
    bundled = set(artifact_bundle_refs(conn))
    return [ref for ref in paper_refs(conn) if ref not in bundled]


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
        ("persist_paper_artifact_bundle", "persist_paper_artifact_bundles"),
    )
    return [ref for ref in paper_refs(conn) if ref not in bundled or ref not in receipted]


def missing_paper_analysis_receipt_refs(conn: sqlite3.Connection) -> list[str]:
    analyzed = set(analyzed_paper_refs(conn))
    receipted = action_receipt_paper_refs(
        conn,
        ("persist_paper_analysis", "persist_paper_analyses"),
    )
    return [ref for ref in paper_refs(conn) if ref not in analyzed or ref not in receipted]


def require_stage4_action_receipts_complete(conn: sqlite3.Connection) -> None:
    missing_bundles = missing_paper_artifact_bundle_receipt_refs(conn)
    missing_analysis = missing_paper_analysis_receipt_refs(conn)
    errors: list[str] = []
    if missing_bundles:
        errors.append("missing_paper_artifact_bundle_action_receipts: " + ", ".join(missing_bundles))
    if missing_analysis:
        errors.append("missing_paper_analysis_action_receipts: " + ", ".join(missing_analysis))
    if errors:
        raise ValueError("; ".join(errors))


def _artifact_rows_from_payload(payload: dict) -> list[dict]:
    result = payload.get("result")
    if isinstance(result, dict) and isinstance(result.get("artifacts"), list):
        return [entry for entry in result["artifacts"] if isinstance(entry, dict)]
    structured = payload.get("structuredContent")
    if isinstance(structured, dict):
        structured_result = structured.get("result")
        if isinstance(structured_result, dict) and isinstance(structured_result.get("artifacts"), list):
            return [entry for entry in structured_result["artifacts"] if isinstance(entry, dict)]
    artifacts = payload.get("artifacts")
    if isinstance(artifacts, list):
        return [entry for entry in artifacts if isinstance(entry, dict)]
    raise ValueError("paper artifact bundle payload must contain artifacts[] from synthesis.read_paper_artifacts")


def _normalize_artifact_bundle(paper_ref: str, payload: dict) -> dict:
    exported_by = str(payload.get("exported_by") or payload.get("exportedBy") or "").strip()
    if exported_by and exported_by != "synthesis.export_paper_artifact_bundle":
        raise ValueError("paper artifact bundle must be exported by synthesis.export_paper_artifact_bundle")
    rows = _artifact_rows_from_payload(payload)
    by_type: dict[str, dict] = {}
    diagnostics: list[str] = []
    payload_diagnostics = payload.get("diagnostics")
    if isinstance(payload_diagnostics, list):
        diagnostics.extend(str(entry) for entry in payload_diagnostics)
    for row in rows:
        raw_artifact_type = str(row.get("artifact_type") or row.get("artifactType") or "").strip()
        artifact_type = ARTIFACT_TYPE_ALIASES.get(raw_artifact_type, "")
        if artifact_type not in ARTIFACT_TYPES:
            continue
        row_ref = str(row.get("paper_ref") or row.get("paperRef") or "").strip()
        if row_ref and row_ref != paper_ref:
            continue
        probe_source = str(row.get("probe_source") or row.get("probeSource") or "").strip()
        if probe_source != "synthesis.read_paper_artifacts":
            raise ValueError(
                f"paper artifact row for {paper_ref}:{artifact_type} must come from synthesis.read_paper_artifacts"
            )
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
        for content_key in ("payload", "markdown", "decoded_text", "decodedText"):
            if content_key in row:
                normalized[content_key] = row[content_key]
        by_type[artifact_type] = normalized
    missing_types = [artifact_type for artifact_type in ARTIFACT_TYPES if artifact_type not in by_type]
    if missing_types:
        raise ValueError(
            "paper artifact bundle must include host status rows for all artifact types: "
            + ", ".join(missing_types)
        )
    return {
        "paper_ref": paper_ref,
        "source_tool": "synthesis.export_paper_artifact_bundle",
        "probe_source_tool": "synthesis.read_paper_artifacts",
        "artifacts": [by_type[artifact_type] for artifact_type in ARTIFACT_TYPES],
        "diagnostics": diagnostics,
    }


def persist_paper_artifact_bundle(conn: sqlite3.Connection, paper_ref: str, payload: dict) -> dict:
    if paper_ref not in set(paper_refs(conn)):
        raise ValueError(f"paper_ref is not in paper_workset: {paper_ref}")
    payload_ref = payload.get("paper_ref") or payload.get("paperRef")
    if payload_ref and payload_ref != paper_ref:
        raise ValueError(f"payload paper_ref {payload_ref!r} does not match --paper-ref {paper_ref!r}")
    bundle = _normalize_artifact_bundle(paper_ref, payload)
    conn.execute(
        """
        insert or replace into paper_artifact_bundles(paper_ref, bundle_json, created_at)
        values (?, ?, ?)
        """,
        (paper_ref, json.dumps(bundle, ensure_ascii=False, sort_keys=True), now_iso()),
    )
    conn.commit()
    return {
        "paper_ref": paper_ref,
        "bundle_count": len(artifact_bundle_refs(conn)),
        "paper_count": len(paper_refs(conn)),
        "missing_bundle_refs": missing_paper_artifact_bundle_refs(conn),
        "artifact_statuses": {
            entry["artifact_type"]: entry["status"] for entry in bundle["artifacts"]
        },
    }


def _manifest_payload_entries(payload: dict) -> list[dict]:
    entries = payload.get("payload_files")
    if isinstance(entries, list):
        return [entry for entry in entries if isinstance(entry, dict)]
    bundles = payload.get("bundles")
    if isinstance(bundles, list):
        return [entry for entry in bundles if isinstance(entry, dict)]
    analyses = payload.get("analyses")
    if isinstance(analyses, list):
        return [entry for entry in analyses if isinstance(entry, dict)]
    raise ValueError("batch payload must contain payload_files[], bundles[], or analyses[]")


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


def persist_paper_artifact_bundles(
    conn: sqlite3.Connection,
    payload: dict,
    *,
    run_root: str | Path = ".",
) -> dict:
    entries = _manifest_payload_entries(payload)
    known_refs = set(paper_refs(conn))
    normalized: list[dict] = []
    for entry in entries:
        paper_ref, value = _load_payload_entry(run_root, entry)
        if paper_ref not in known_refs:
            raise ValueError(f"paper_ref is not in paper_workset: {paper_ref}")
        payload_ref = value.get("paper_ref") or value.get("paperRef")
        if payload_ref and payload_ref != paper_ref:
            raise ValueError(f"payload paper_ref {payload_ref!r} does not match manifest paper_ref {paper_ref!r}")
        normalized.append(_normalize_artifact_bundle(paper_ref, value))
    if not normalized:
        raise ValueError("persist_paper_artifact_bundles requires at least one payload")
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


def persist_paper_analysis(conn: sqlite3.Connection, paper_ref: str, payload: dict) -> dict:
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
    missing = missing_paper_analysis_refs(conn)
    return {
        "paper_ref": paper_ref,
        "analyzed_count": len(analyzed_paper_refs(conn)),
        "paper_count": len(paper_refs(conn)),
        "missing_paper_refs": missing,
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
    entries = _manifest_payload_entries(payload)
    normalized: list[tuple[str, dict]] = []
    for entry in entries:
        paper_ref, value = _load_payload_entry(run_root, entry)
        normalized.append((paper_ref, _normalized_paper_analysis(conn, paper_ref, value)))
    if not normalized:
        raise ValueError("persist_paper_analyses requires at least one payload")
    for paper_ref, value in normalized:
        conn.execute(
            "insert or replace into paper_analysis(paper_ref, analysis_json) values (?, ?)",
            (paper_ref, json.dumps(value, ensure_ascii=False, sort_keys=True)),
        )
    conn.commit()
    return {
        "paper_refs": [paper_ref for paper_ref, _ in normalized],
        "analyzed_count": len(analyzed_paper_refs(conn)),
        "paper_count": len(paper_refs(conn)),
        "missing_paper_refs": missing_paper_analysis_refs(conn),
    }


def _section_payloads_from_input(payload: dict) -> dict:
    if isinstance(payload.get("sections"), dict):
        return payload["sections"]
    return {key: payload[key] for key in REQUIRED_FULL_SECTIONS if key in payload}


def persist_cross_paper_synthesis(conn: sqlite3.Connection, payload: dict) -> dict:
    require_stage4_action_receipts_complete(conn)
    expected_path = get_meta(conn, "source_context_path", "")
    expected_hash = get_meta(conn, "source_context_hash", "")
    source_path = str(payload.get("source_context_path") or "").strip()
    source_hash = str(payload.get("source_context_hash") or "").strip()
    if not expected_path or not expected_hash:
        raise ValueError("export_cross_paper_context must run before persist_cross_paper_synthesis")
    if source_path != expected_path:
        raise ValueError(f"source_context_path mismatch: expected {expected_path}, got {source_path}")
    if source_hash != expected_hash:
        raise ValueError(f"source_context_hash mismatch: expected {expected_hash}, got {source_hash}")
    sections = inject_section_digest_refs(conn, _section_payloads_from_input(payload))
    if not sections:
        raise ValueError("persist_cross_paper_synthesis requires a sections object or section keys")
    validate_topic_section_contract(
        conn,
        sections,
        require_complete=all(section in sections for section in REQUIRED_FULL_SECTIONS),
    )
    for section_name, value in sections.items():
        conn.execute(
            """
            insert or replace into section_payloads(section_name, value_json)
            values (?, ?)
            """,
            (section_name, json.dumps(value, ensure_ascii=False, sort_keys=True)),
        )
    for meta_key in ("artifact_metadata", "base_hashes", "read_section_hashes", "changed_sections"):
        if meta_key in payload:
            set_meta(conn, meta_key, payload[meta_key])
    conn.commit()
    return {"section_names": sorted(sections.keys())}


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


def inject_digest_locator_from_bundle(
    conn: sqlite3.Connection,
    paper_ref: str,
    analysis: dict,
) -> None:
    bundle = paper_artifact_bundle_value(conn, paper_ref)
    digest = _artifact_for_type(bundle, "digest")
    if digest.get("status") != "available":
        if analysis.get("digest_locator"):
            raise ValueError(f"paper_analysis must not include digest_locator when digest is missing: {paper_ref}")
        return
    expected_hash = str(digest.get("payload_hash") or "").strip()
    assert_valid_sha256_hash(expected_hash, f"artifact {paper_ref}:digest payload_hash")
    locator = analysis.get("digest_locator")
    if isinstance(locator, dict):
        supplied_type = str(locator.get("payload_type") or "digest-markdown").strip()
        supplied_hash = str(locator.get("payload_hash") or "").strip()
        if supplied_type != "digest-markdown":
            raise ValueError(f"paper_analysis.digest_locator.payload_type must be digest-markdown: {paper_ref}")
        if supplied_hash and supplied_hash != expected_hash:
            raise ValueError(f"paper_analysis.digest_locator.payload_hash mismatch: {paper_ref}")
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
        rows = value.get(section_name)
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
        rows = sections.get(section_name, [])
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


def build_cross_paper_context(conn: sqlite3.Connection) -> dict:
    require_stage4_action_receipts_complete(conn)
    bundles = paper_artifact_bundle_values(conn)
    analyses = paper_analysis_values(conn)
    return {
        "schema_id": "synthesis.cross_paper_context",
        "schema_version": "1.0.0",
        "paper_count": len(paper_refs(conn)),
        "bundle_receipt_count": len(bundles),
        "analysis_count": len(analyses),
        "artifact_counts": artifact_status_counts(bundles),
        "paper_workset": strip_hash_fields(paper_workset_values(conn)),
        "paper_artifact_bundles": strip_hash_fields(bundles),
        "paper_analysis": strip_hash_fields(analyses),
        "diagnostics": {
            "missing_bundle_refs": missing_paper_artifact_bundle_refs(conn),
            "missing_analysis_refs": missing_paper_analysis_refs(conn),
            "missing_bundle_action_receipt_refs": missing_paper_artifact_bundle_receipt_refs(conn),
            "missing_analysis_action_receipt_refs": missing_paper_analysis_receipt_refs(conn),
        },
    }


def section_names(conn: sqlite3.Connection) -> list[str]:
    rows = conn.execute("select section_name from section_payloads order by section_name").fetchall()
    return [row["section_name"] for row in rows]


def section_payload(conn: sqlite3.Connection, section_name: str) -> object:
    row = conn.execute(
        "select value_json from section_payloads where section_name = ?",
        (section_name,),
    ).fetchone()
    if not row:
        raise KeyError(section_name)
    return json.loads(row["value_json"])


def missing_required_sections(conn: sqlite3.Connection, *, operation: str) -> list[str]:
    present = set(section_names(conn))
    if operation == "update_patch":
        changed = get_meta(conn, "changed_sections", None)
        if not changed:
            changed = section_names(conn)
        return [section for section in changed if section not in present]
    return [section for section in REQUIRED_FULL_SECTIONS if section not in present]


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
    stage: str = "stage_6_render_and_validate",
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
    required = {manifest_path, "result/result.json"}
    rows = conn.execute("select path from artifact_registry where validated = 1").fetchall()
    registered = {row["path"] for row in rows}
    return required.issubset(registered)


def paper_workset_values(conn: sqlite3.Connection) -> list[dict]:
    rows = conn.execute("select value_json from paper_workset order by paper_ref").fetchall()
    return [json.loads(row["value_json"]) for row in rows]


def paper_analysis_values(conn: sqlite3.Connection) -> list[dict]:
    rows = conn.execute("select analysis_json from paper_analysis order by paper_ref").fetchall()
    return [json.loads(row["analysis_json"]) for row in rows]
