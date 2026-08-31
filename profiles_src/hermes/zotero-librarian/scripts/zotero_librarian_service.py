#!/usr/bin/env python3
"""Bounded, one-pass resident operations for the Zotero Librarian profile."""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import sqlite3
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from zotero_librarian_workspace import WorkspaceError, prepare_workspace, resolve_workspace

RECEIPT_SCHEMA = "zotero-librarian.operation-receipt.v1"
STATE_SCHEMA = "zotero-librarian.state.v4"
SNAPSHOT_SCHEMA = "zotero-agents.library-full-index.v1"
SNAPSHOT_SCOPE = "top-level-regular"
SNAPSHOT_ORDER = "stable_identity"
TERMINAL_STATES = {"succeeded", "failed", "canceled", "cancelled", "completed"}


class ServiceError(Exception):
    def __init__(self, code: str, message: str, details: dict[str, Any] | None = None):
        super().__init__(message)
        self.code = code
        self.details = details or {}


def now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def stable_json(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def state_path(args: argparse.Namespace) -> Path:
    return args.workspace.database


def connect(path: Path) -> sqlite3.Connection:
    path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    conn.executescript(
        """
        CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS library_items (
          library_id INTEGER NOT NULL, item_key TEXT NOT NULL, item_id INTEGER NOT NULL,
          item_type TEXT NOT NULL, title TEXT NOT NULL, payload_json TEXT NOT NULL,
          digest TEXT NOT NULL, updated_at TEXT NOT NULL, PRIMARY KEY(library_id, item_key)
        );
        CREATE TABLE IF NOT EXISTS library_index_generations (
          generation_id TEXT PRIMARY KEY, snapshot_id TEXT NOT NULL, library_id INTEGER NOT NULL,
          status TEXT NOT NULL CHECK(status IN ('staging','current')), content_digest TEXT NOT NULL DEFAULT '',
          total_items INTEGER NOT NULL DEFAULT 0, total_batches INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL, promoted_at TEXT NOT NULL DEFAULT ''
        );
        CREATE TABLE IF NOT EXISTS library_generation_items (
          generation_id TEXT NOT NULL REFERENCES library_index_generations(generation_id) ON DELETE CASCADE,
          library_id INTEGER NOT NULL, item_key TEXT NOT NULL, item_id INTEGER NOT NULL,
          item_type TEXT NOT NULL, title TEXT NOT NULL, payload_json TEXT NOT NULL,
          digest TEXT NOT NULL, updated_at TEXT NOT NULL,
          PRIMARY KEY(generation_id, library_id, item_key)
        );
        CREATE INDEX IF NOT EXISTS library_generation_items_title
          ON library_generation_items(generation_id, title);
        CREATE TABLE IF NOT EXISTS workflow_catalog (
          workflow_id TEXT PRIMARY KEY, payload_json TEXT NOT NULL, digest TEXT NOT NULL, updated_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS watched_runs (
          run_id TEXT PRIMARY KEY, workflow_id TEXT NOT NULL, state TEXT NOT NULL,
          payload_json TEXT NOT NULL, updated_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS notifications (
          event_id TEXT PRIMARY KEY, workflow_run_id TEXT NOT NULL DEFAULT '',
          event_type TEXT NOT NULL DEFAULT '', acknowledged INTEGER NOT NULL DEFAULT 0,
          payload_json TEXT NOT NULL, updated_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS automation_journal (
          journal_id TEXT PRIMARY KEY, operation TEXT NOT NULL, payload_json TEXT NOT NULL, created_at TEXT NOT NULL
        );
        """
    )
    journal_count = conn.execute(
        "SELECT COUNT(*) AS count FROM automation_journal"
    ).fetchone()["count"]
    if journal_count == 0:
        conn.execute("DROP TABLE automation_journal")
        conn.execute("DELETE FROM meta WHERE key = 'submission_blocked'")
    else:
        conn.execute(
            "INSERT OR REPLACE INTO meta(key, value) VALUES (?, ?)",
            ("submission_blocked", "nonempty_automation_journal"),
        )
    conn.execute("INSERT OR REPLACE INTO meta(key, value) VALUES (?, ?)", ("schema", STATE_SCHEMA))
    current_generation = conn.execute(
        "SELECT value FROM meta WHERE key = 'current_library_generation'"
    ).fetchone()
    legacy_count = conn.execute("SELECT COUNT(*) AS count FROM library_items").fetchone()["count"]
    if current_generation is None and legacy_count:
        generation_id = "legacy-v3"
        created_at = now()
        conn.execute(
            "INSERT OR IGNORE INTO library_index_generations(generation_id,snapshot_id,library_id,status,total_items,created_at,promoted_at) VALUES(?,?,?,?,?,?,?)",
            (generation_id, generation_id, 0, "current", legacy_count, created_at, created_at),
        )
        conn.execute(
            """INSERT OR IGNORE INTO library_generation_items(
                 generation_id,library_id,item_key,item_id,item_type,title,payload_json,digest,updated_at)
               SELECT ?,library_id,item_key,item_id,item_type,title,payload_json,digest,updated_at
               FROM library_items""",
            (generation_id,),
        )
        conn.execute(
            "INSERT OR REPLACE INTO meta(key,value) VALUES('current_library_generation',?)",
            (generation_id,),
        )
    conn.commit()
    return conn


def call_bridge(bridge: str, argv: list[str], profile_prefix: list[str] | None = None) -> Any:
    proc = subprocess.run([bridge, *(profile_prefix or []), *argv], text=True, capture_output=True, check=False)
    if proc.returncode:
        raise ServiceError("bridge_command_failed", proc.stderr.strip() or proc.stdout.strip() or "zotero-bridge failed", {"command": argv, "returncode": proc.returncode})
    try:
        return json.loads(proc.stdout) if proc.stdout.strip() else {}
    except json.JSONDecodeError as error:
        raise ServiceError("invalid_bridge_json", "zotero-bridge returned invalid JSON", {"command": argv}) from error


def unwrap(value: Any) -> Any:
    current = value
    for _ in range(8):
        if not isinstance(current, dict):
            return current
        if isinstance(current.get("result"), (dict, list)):
            current = current["result"]
        elif isinstance(current.get("data"), (dict, list)):
            current = current["data"]
        else:
            return current
    return current


def digest(value: Any) -> str:
    return hashlib.sha256(stable_json(value).encode("utf-8")).hexdigest()


def receipt(operation: str, status: str, data: Any = None, summary: str | None = None) -> dict[str, Any]:
    result: dict[str, Any] = {"schema": RECEIPT_SCHEMA, "operation": operation, "status": status, "generatedAt": now()}
    if summary:
        result["summary"] = summary
    if data is not None:
        result["data"] = data
    return result


def emit(value: dict[str, Any], quiet: bool = False) -> int:
    if quiet and value["status"] == "unchanged":
        print("[SILENT]")
    else:
        print(json.dumps(value, ensure_ascii=False, indent=2))
    return 0 if value["status"] != "failed" else 1


def item_identity(item: dict[str, Any]) -> tuple[int, str]:
    ref = item.get("ref") if isinstance(item.get("ref"), dict) else {}
    key = str(ref.get("key") or item.get("key") or "").strip()
    if not key:
        raise ServiceError("invalid_snapshot", "library item is missing key", {"item": item})
    library_id = int(ref.get("libraryId") or item.get("libraryId") or item.get("libraryID") or 0)
    if library_id <= 0:
        raise ServiceError("invalid_snapshot", "library item has an invalid library identity")
    return library_id, key


def snapshot_page(value: Any, *, library_id: int, snapshot_id: str, batch_index: int) -> dict[str, Any]:
    if not isinstance(value, dict):
        raise ServiceError("invalid_snapshot", "library snapshot must be an object")
    if value.get("schema") != SNAPSHOT_SCHEMA or value.get("scope") != SNAPSHOT_SCOPE or value.get("order") != SNAPSHOT_ORDER:
        raise ServiceError("invalid_snapshot", "library snapshot basis is invalid")
    if int(value.get("libraryId") or 0) != library_id:
        raise ServiceError("invalid_snapshot", "library snapshot changed library identity")
    current_snapshot_id = str(value.get("snapshotId") or "")
    if not current_snapshot_id or (snapshot_id and current_snapshot_id != snapshot_id):
        raise ServiceError("invalid_snapshot", "library snapshot identity changed")
    if int(value.get("batchIndex") if value.get("batchIndex") is not None else -1) != batch_index:
        raise ServiceError("invalid_snapshot", "library snapshot batch order is invalid")
    entries = value.get("items")
    if not isinstance(entries, list) or int(value.get("returned") if value.get("returned") is not None else -1) != len(entries):
        raise ServiceError("invalid_snapshot", "library snapshot item coverage is invalid")
    outcome = value.get("outcome")
    cursor = value.get("nextCursor")
    if outcome == "active":
        if value.get("hasMore") is not True or not isinstance(cursor, str) or not cursor:
            raise ServiceError("incomplete_snapshot", "active library snapshot has no continuation")
    elif outcome == "completed":
        if value.get("hasMore") is not False or cursor is not None or not isinstance(value.get("completionEvidence"), dict):
            raise ServiceError("invalid_snapshot", "completed library snapshot has invalid terminal state")
    else:
        raise ServiceError("incomplete_snapshot", "library snapshot did not complete")
    return value


def current_generation_id(conn: sqlite3.Connection) -> str:
    row = conn.execute("SELECT value FROM meta WHERE key = 'current_library_generation'").fetchone()
    return str(row["value"]) if row else ""


def index_refresh(args: argparse.Namespace) -> dict[str, Any]:
    conn = connect(state_path(args))
    library_id = args.library_id
    snapshot_id = ""
    generation_id = ""
    cursor = ""
    batch_index = 0
    delivered_items = 0
    while True:
        query: dict[str, Any] = {"libraryId": library_id, "batchSize": args.limit}
        if cursor:
            query.update({"snapshotId": snapshot_id, "cursor": cursor})
        page = snapshot_page(
            unwrap(call_bridge(args.bridge, ["library", "snapshot", "--input", stable_json(query)], args.profile_prefix)),
            library_id=library_id,
            snapshot_id=snapshot_id,
            batch_index=batch_index,
        )
        if not snapshot_id:
            snapshot_id = str(page["snapshotId"])
            generation_id = f"generation-{digest({'snapshotId': snapshot_id, 'startedAt': now()})[:24]}"
            with conn:
                conn.execute(
                    "INSERT INTO library_index_generations(generation_id,snapshot_id,library_id,status,created_at) VALUES(?,?,?,?,?)",
                    (generation_id, snapshot_id, library_id, "staging", now()),
                )
        entries = page["items"]
        with conn:
            for item in entries:
                if not isinstance(item, dict):
                    raise ServiceError("invalid_snapshot", "library snapshot item must be an object")
                item_library_id, key = item_identity(item)
                if item_library_id != library_id:
                    raise ServiceError("invalid_snapshot", "library snapshot item changed library identity")
                conn.execute(
                    """INSERT INTO library_generation_items(
                         generation_id,library_id,item_key,item_id,item_type,title,payload_json,digest,updated_at)
                       VALUES(?,?,?,?,?,?,?,?,?)""",
                    (generation_id, library_id, key, int(item.get("id") or 0), str(item.get("itemType") or ""), str(item.get("title") or ""), stable_json(item), digest(item), now()),
                )
        delivered_items += len(entries)
        if int(page.get("deliveredItems") or 0) != delivered_items or int(page.get("deliveredBatches") or 0) != batch_index + 1:
            raise ServiceError("invalid_snapshot", "library snapshot delivery counters are invalid")
        if page["outcome"] == "completed":
            evidence = page["completionEvidence"]
            content_digest = str(evidence.get("contentDigest") or "")
            if (
                evidence.get("snapshotId") != snapshot_id
                or evidence.get("schema") != SNAPSHOT_SCHEMA
                or int(evidence.get("libraryId") or 0) != library_id
                or evidence.get("scope") != SNAPSHOT_SCOPE
                or evidence.get("order") != SNAPSHOT_ORDER
                or int(evidence.get("totalItems") if evidence.get("totalItems") is not None else -1) != delivered_items
                or int(evidence.get("totalBatches") if evidence.get("totalBatches") is not None else -1) != batch_index + 1
                or not content_digest.startswith("sha256:")
                or len(content_digest) != 71
                or any(char not in "0123456789abcdef" for char in content_digest[7:])
            ):
                raise ServiceError("invalid_snapshot", "library snapshot completion evidence is invalid")
            break
        cursor = str(page["nextCursor"])
        batch_index += 1

    previous_generation = current_generation_id(conn)
    previous = {
        (row["library_id"], row["item_key"]): row["digest"]
        for row in conn.execute(
            "SELECT library_id,item_key,digest FROM library_generation_items WHERE generation_id=?",
            (previous_generation,),
        ).fetchall()
    }
    staged = {
        (row["library_id"], row["item_key"]): row["digest"]
        for row in conn.execute(
            "SELECT library_id,item_key,digest FROM library_generation_items WHERE generation_id=?",
            (generation_id,),
        ).fetchall()
    }
    added = sum(key not in previous for key in staged)
    updated = sum(key in previous and previous[key] != value for key, value in staged.items())
    deleted = sum(key not in staged for key in previous)
    promoted_at = now()
    with conn:
        promotion = conn.execute(
            "UPDATE library_index_generations SET status='current',content_digest=?,total_items=?,total_batches=?,promoted_at=? WHERE generation_id=? AND status='staging'",
            (content_digest, delivered_items, batch_index + 1, promoted_at, generation_id),
        )
        if promotion.rowcount != 1:
            raise ServiceError("index_promotion_failed", "staging generation could not be promoted")
        conn.execute(
            "INSERT OR REPLACE INTO meta(key,value) VALUES('current_library_generation',?)",
            (generation_id,),
        )
        conn.execute("DELETE FROM library_index_generations WHERE generation_id<>?", (generation_id,))
        conn.execute("INSERT OR REPLACE INTO meta(key,value) VALUES(?,?)", ("last_index_refresh", promoted_at))
    changed = added + updated + deleted
    return receipt("index.refresh", "changed" if changed else "unchanged", {"added": added, "updated": updated, "deleted": deleted, "total": delivered_items, "generationId": generation_id, "snapshotId": snapshot_id})


def index_search(args: argparse.Namespace) -> dict[str, Any]:
    conn = connect(state_path(args))
    rows = conn.execute("SELECT payload_json FROM library_generation_items WHERE generation_id=? AND (lower(title) LIKE ? OR lower(payload_json) LIKE ?) ORDER BY title LIMIT ?", (current_generation_id(conn), f"%{args.query.lower()}%", f"%{args.query.lower()}%", args.limit)).fetchall()
    items = [json.loads(row["payload_json"]) for row in rows]
    return receipt("index.search", "ok", {"items": items})


def index_item(args: argparse.Namespace) -> dict[str, Any]:
    conn = connect(state_path(args))
    row = conn.execute("SELECT payload_json FROM library_generation_items WHERE generation_id=? AND (item_key = ? OR item_id = ?) LIMIT 1", (current_generation_id(conn), args.ref, args.ref)).fetchone()
    if not row:
        raise ServiceError("item_not_found", "cached item was not found", {"ref": args.ref})
    return receipt("index.item", "ok", {"item": json.loads(row["payload_json"])})


def index_stats(args: argparse.Namespace) -> dict[str, Any]:
    conn = connect(state_path(args))
    generation_id = current_generation_id(conn)
    count = conn.execute("SELECT COUNT(*) AS count FROM library_generation_items WHERE generation_id=?", (generation_id,)).fetchone()["count"]
    staging_count = conn.execute("SELECT COUNT(*) AS count FROM library_index_generations WHERE status='staging'").fetchone()["count"]
    refreshed = conn.execute("SELECT value FROM meta WHERE key = 'last_index_refresh'").fetchone()
    return receipt("index.stats", "ok", {"itemCount": count, "lastRefresh": refreshed["value"] if refreshed else None, "currentGenerationId": generation_id or None, "stagingGenerationCount": staging_count})


def workflow_catalog_refresh(args: argparse.Namespace) -> dict[str, Any]:
    conn = connect(state_path(args))
    data = unwrap(call_bridge(args.bridge, ["workflow", "list"], args.profile_prefix))
    entries = data.get("workflows", []) if isinstance(data, dict) else []
    changed = 0
    with conn:
        for entry in entries:
            if not isinstance(entry, dict):
                continue
            workflow_id = str(entry.get("id") or entry.get("workflowId") or "")
            if not workflow_id:
                continue
            current = digest(entry)
            prior = conn.execute("SELECT digest FROM workflow_catalog WHERE workflow_id = ?", (workflow_id,)).fetchone()
            if prior and prior["digest"] == current:
                continue
            changed += 1
            detail = unwrap(call_bridge(args.bridge, ["workflow", "describe", "--workflow", workflow_id], args.profile_prefix))
            conn.execute("INSERT INTO workflow_catalog(workflow_id,payload_json,digest,updated_at) VALUES(?,?,?,?) ON CONFLICT(workflow_id) DO UPDATE SET payload_json=excluded.payload_json,digest=excluded.digest,updated_at=excluded.updated_at", (workflow_id, stable_json(detail), current, now()))
    return receipt("workflow.catalog-refresh", "changed" if changed else "unchanged", {"updated": changed})


def workflow_show(args: argparse.Namespace) -> dict[str, Any]:
    row = connect(state_path(args)).execute("SELECT payload_json FROM workflow_catalog WHERE workflow_id = ?", (args.workflow_id,)).fetchone()
    if not row:
        raise ServiceError("workflow_not_found", "cached workflow was not found", {"workflowId": args.workflow_id})
    return receipt("workflow.show", "ok", {"workflow": json.loads(row["payload_json"])})


def run_register(args: argparse.Namespace) -> dict[str, Any]:
    conn = connect(state_path(args))
    with conn:
        conn.execute("INSERT OR REPLACE INTO watched_runs(run_id,workflow_id,state,payload_json,updated_at) VALUES(?,?,?,?,?)", (args.run_id, args.workflow_id, args.state, "{}", now()))
    return receipt("run.register", "changed", {"runId": args.run_id})


def run_watch(args: argparse.Namespace) -> dict[str, Any]:
    conn = connect(state_path(args))
    rows = conn.execute("SELECT * FROM watched_runs WHERE state NOT IN ('succeeded','failed','canceled','cancelled','completed')").fetchall()
    changed = 0
    states: list[dict[str, Any]] = []
    with conn:
        for row in rows:
            data = unwrap(call_bridge(args.bridge, ["run", "get", row["run_id"]], args.profile_prefix))
            state = str(data.get("state") or row["state"]) if isinstance(data, dict) else row["state"]
            if state != row["state"]:
                changed += 1
                conn.execute("UPDATE watched_runs SET state = ?, payload_json = ?, updated_at = ? WHERE run_id = ?", (state, stable_json(data), now(), row["run_id"]))
            states.append({"runId": row["run_id"], "state": state})
    return receipt("run.watch", "changed" if changed else "unchanged", {"runs": states})


def event_id(event: dict[str, Any]) -> str:
    return str(event.get("eventId") or event.get("id") or hashlib.sha256(stable_json(event).encode("utf-8")).hexdigest())


def notification_sync(args: argparse.Namespace) -> dict[str, Any]:
    data = unwrap(call_bridge(args.bridge, ["run", "notification", "list", "--acknowledged", "false", "--limit", str(args.limit)], args.profile_prefix))
    events = data.get("events", []) if isinstance(data, dict) else []
    inserted = updated = 0
    conn = connect(state_path(args))
    with conn:
        for event in events if isinstance(events, list) else []:
            if not isinstance(event, dict):
                continue
            ident, payload = event_id(event), stable_json(event)
            previous = conn.execute("SELECT payload_json FROM notifications WHERE event_id = ?", (ident,)).fetchone()
            inserted += previous is None
            updated += previous is not None and previous["payload_json"] != payload
            conn.execute("INSERT INTO notifications(event_id,workflow_run_id,event_type,acknowledged,payload_json,updated_at) VALUES(?,?,?,?,?,?) ON CONFLICT(event_id) DO UPDATE SET workflow_run_id=excluded.workflow_run_id,event_type=excluded.event_type,acknowledged=excluded.acknowledged,payload_json=excluded.payload_json,updated_at=excluded.updated_at", (ident, str(event.get("workflowRunId") or ""), str(event.get("type") or ""), int(event.get("acknowledged") is True), payload, now()))
    return receipt("notification.sync", "changed" if inserted or updated else "unchanged", {"inserted": inserted, "updated": updated, "fetched": len(events) if isinstance(events, list) else 0})


def notification_inbox(args: argparse.Namespace) -> dict[str, Any]:
    rows = connect(state_path(args)).execute("SELECT * FROM notifications WHERE acknowledged = 0 ORDER BY updated_at DESC LIMIT ?", (args.limit,)).fetchall()
    events = [{"eventId": row["event_id"], "workflowRunId": row["workflow_run_id"], "type": row["event_type"], "payload": json.loads(row["payload_json"])} for row in rows]
    return receipt("notification.inbox", "ok", {"events": events})


def notification_summary(args: argparse.Namespace) -> dict[str, Any]:
    rows = connect(state_path(args)).execute("SELECT event_type, COUNT(*) AS count FROM notifications WHERE acknowledged = 0 GROUP BY event_type").fetchall()
    counts = [{"type": row["event_type"], "count": row["count"]} for row in rows]
    return receipt("notification.summary", "ok", {"counts": counts})


def notification_ack(args: argparse.Namespace) -> dict[str, Any]:
    call_bridge(args.bridge, ["run", "notification", "ack", *sum((["--event", value] for value in args.event), [])], args.profile_prefix)
    conn = connect(state_path(args))
    with conn:
        conn.executemany("UPDATE notifications SET acknowledged = 1, updated_at = ? WHERE event_id = ?", [(now(), event) for event in args.event])
    return receipt("notification.ack", "changed", {"acknowledged": args.event})


def maintenance_workflow_status(args: argparse.Namespace) -> dict[str, Any]:
    rows = connect(state_path(args)).execute("SELECT run_id, workflow_id, state FROM watched_runs WHERE state NOT IN ('succeeded','completed') ORDER BY updated_at DESC").fetchall()
    records = [{"runId": row["run_id"], "workflowId": row["workflow_id"], "state": row["state"]} for row in rows]
    return receipt("maintenance.workflow-status", "attention" if records else "unchanged", {"runs": records})


def maintenance_library_hygiene(args: argparse.Namespace) -> dict[str, Any]:
    conn = connect(state_path(args))
    rows = conn.execute("SELECT title, GROUP_CONCAT(item_key) AS keys, COUNT(*) AS count FROM library_generation_items WHERE generation_id=? AND title <> '' GROUP BY lower(title) HAVING COUNT(*) > 1", (current_generation_id(conn),)).fetchall()
    candidates = [{"title": row["title"], "itemKeys": row["keys"].split(","), "reason": "duplicate_title"} for row in rows]
    return receipt("maintenance.library-hygiene", "attention" if candidates else "unchanged", {"candidates": candidates})


def synthesis_attention_queue(args: argparse.Namespace) -> dict[str, Any]:
    data = unwrap(call_bridge(args.bridge, ["synthesis", "insight", "attention-queue"], args.profile_prefix))
    items = data.get("items", []) if isinstance(data, dict) else []
    return receipt("synthesis.attention-queue", "attention" if items else "unchanged", {"items": items})


def parser() -> argparse.ArgumentParser:
    result = argparse.ArgumentParser(description="One-pass Zotero Librarian resident service")
    result.add_argument("--db", help="diagnostic state.sqlite path inside the active workspace")
    result.add_argument("--profile", help="connection profile path; defaults to ZOTERO_BRIDGE_PROFILE or the well-known profile")
    result.add_argument("--bridge", help="zotero-bridge executable; defaults to the active workspace binary or PATH")
    result.add_argument("--quiet", action="store_true", help="emit [SILENT] for unchanged receipts")
    domains = result.add_subparsers(dest="domain", required=True)

    index = domains.add_parser("index").add_subparsers(dest="action", required=True)
    p = index.add_parser("refresh"); p.add_argument("--limit", type=int, default=500, choices=range(1, 1001), metavar="1..1000"); p.add_argument("--library-id", type=int, default=1); p.set_defaults(func=index_refresh, operation="index.refresh")
    p = index.add_parser("search"); p.add_argument("query"); p.add_argument("--limit", type=int, default=25); p.set_defaults(func=index_search, operation="index.search")
    p = index.add_parser("item"); p.add_argument("ref"); p.set_defaults(func=index_item, operation="index.item")
    index.add_parser("stats").set_defaults(func=index_stats, operation="index.stats")

    workflow = domains.add_parser("workflow").add_subparsers(dest="action", required=True)
    workflow.add_parser("catalog-refresh").set_defaults(func=workflow_catalog_refresh, operation="workflow.catalog-refresh")
    p = workflow.add_parser("show"); p.add_argument("workflow_id"); p.set_defaults(func=workflow_show, operation="workflow.show")

    run = domains.add_parser("run").add_subparsers(dest="action", required=True)
    p = run.add_parser("register"); p.add_argument("--run-id", required=True); p.add_argument("--workflow-id", required=True); p.add_argument("--state", default="running"); p.set_defaults(func=run_register, operation="run.register")
    run.add_parser("watch").set_defaults(func=run_watch, operation="run.watch")

    notification = domains.add_parser("notification").add_subparsers(dest="action", required=True)
    p = notification.add_parser("sync"); p.add_argument("--limit", type=int, default=100); p.set_defaults(func=notification_sync, operation="notification.sync")
    p = notification.add_parser("inbox"); p.add_argument("--limit", type=int, default=25); p.set_defaults(func=notification_inbox, operation="notification.inbox")
    notification.add_parser("summary").set_defaults(func=notification_summary, operation="notification.summary")
    p = notification.add_parser("ack"); p.add_argument("--event", action="append", required=True); p.set_defaults(func=notification_ack, operation="notification.ack")

    maintenance = domains.add_parser("maintenance").add_subparsers(dest="action", required=True)
    maintenance.add_parser("workflow-status").set_defaults(func=maintenance_workflow_status, operation="maintenance.workflow-status")
    maintenance.add_parser("library-hygiene").set_defaults(func=maintenance_library_hygiene, operation="maintenance.library-hygiene")
    synthesis = domains.add_parser("synthesis").add_subparsers(dest="action", required=True)
    synthesis.add_parser("attention-queue").set_defaults(func=synthesis_attention_queue, operation="synthesis.attention-queue")
    return result


def main() -> int:
    args = parser().parse_args()
    try:
        workspace = resolve_workspace(args.profile, args.db)
        prepare_workspace(workspace)
        args.workspace = workspace
        args.profile_prefix = workspace.bridge_prefix
        if not args.bridge:
            binary_name = "zotero-bridge.exe" if os.name == "nt" else "zotero-bridge"
            local = workspace.workspace / ".zotero-bridge" / "bin" / binary_name
            args.bridge = str(local) if local.exists() else "zotero-bridge"
        return emit(args.func(args), args.quiet)
    except WorkspaceError as error:
        return emit({"schema": RECEIPT_SCHEMA, "operation": getattr(args, "operation", "unknown"), "status": "failed", "generatedAt": now(), "error": {"code": error.code, "message": str(error), "details": error.details}}, False)
    except ServiceError as error:
        return emit({"schema": RECEIPT_SCHEMA, "operation": getattr(args, "operation", "unknown"), "status": "failed", "generatedAt": now(), "error": {"code": error.code, "message": str(error), "details": error.details}}, False)


if __name__ == "__main__":
    raise SystemExit(main())
