#!/usr/bin/env python3
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

SCHEMA = "zotero-librarian.notification-service.v1"


class ServiceError(Exception):
    def __init__(self, code: str, message: str, details: dict[str, Any] | None = None):
        super().__init__(message)
        self.code = code
        self.details = details or {}


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def state_dir() -> Path:
    override = os.environ.get("ZOTERO_LIBRARIAN_STATE_DIR")
    if override:
        return Path(override).expanduser()
    hermes_home = os.environ.get("HERMES_HOME")
    if hermes_home:
        return Path(hermes_home).expanduser() / "zotero-librarian"
    return Path.home() / ".hermes" / "zotero-librarian"


def db_path(args: argparse.Namespace) -> Path:
    raw = getattr(args, "db", None)
    return Path(raw).expanduser() if raw else state_dir() / "index.sqlite"


def stable_json(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def connect(path: Path) -> sqlite3.Connection:
    path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(path)
    conn.row_factory = sqlite3.Row
    conn.executescript(
        """
        CREATE TABLE IF NOT EXISTS notifications (
          event_id TEXT PRIMARY KEY,
          workflow_run_id TEXT NOT NULL DEFAULT '',
          skill_run_id TEXT NOT NULL DEFAULT '',
          event_type TEXT NOT NULL DEFAULT '',
          acknowledged INTEGER NOT NULL DEFAULT 0,
          payload_json TEXT NOT NULL,
          seen_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
        """
    )
    conn.commit()
    return conn


def call_bridge(bridge: str, argv: list[str]) -> Any:
    proc = subprocess.run([bridge, *argv], text=True, capture_output=True, check=False)
    if proc.returncode != 0:
        raise ServiceError(
            "bridge_command_failed",
            proc.stderr.strip() or proc.stdout.strip() or "zotero-bridge failed",
            {"command": argv, "returncode": proc.returncode},
        )
    output = proc.stdout.strip()
    return json.loads(output) if output else {}


def unwrap_bridge_data(raw: Any) -> Any:
    current = raw
    for _ in range(8):
        if not isinstance(current, dict):
            return current
        if any(key in current for key in ["events", "notifications", "items"]):
            return current
        if isinstance(current.get("result"), (dict, list)):
            current = current["result"]
            continue
        if isinstance(current.get("data"), (dict, list)):
            current = current["data"]
            continue
        return current
    return current


def event_list(raw: Any) -> list[dict[str, Any]]:
    data = unwrap_bridge_data(raw)
    if isinstance(data, list):
        return [entry for entry in data if isinstance(entry, dict)]
    if isinstance(data, dict):
        for key in ["events", "notifications", "items", "results"]:
            value = data.get(key)
            if isinstance(value, list):
                return [entry for entry in value if isinstance(entry, dict)]
    return []


def event_id(event: dict[str, Any]) -> str:
    for key in ["eventId", "id", "notificationId"]:
        value = event.get(key)
        if value:
            return str(value)
    return hashlib.sha256(stable_json(event).encode("utf-8")).hexdigest()


def event_value(event: dict[str, Any], *keys: str) -> str:
    for key in keys:
        value = event.get(key)
        if value not in (None, ""):
            return str(value)
    return ""


def store_events(conn: sqlite3.Connection, events: list[dict[str, Any]]) -> tuple[int, int]:
    inserted = updated = 0
    now = utc_now()
    with conn:
        for event in events:
            ident = event_id(event)
            payload = stable_json(event)
            previous = conn.execute("SELECT payload_json FROM notifications WHERE event_id = ?", (ident,)).fetchone()
            if previous is None:
                inserted += 1
            elif previous["payload_json"] != payload:
                updated += 1
            conn.execute(
                """
                INSERT INTO notifications(event_id, workflow_run_id, skill_run_id, event_type, acknowledged, payload_json, seen_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(event_id) DO UPDATE SET
                  workflow_run_id = excluded.workflow_run_id,
                  skill_run_id = excluded.skill_run_id,
                  event_type = excluded.event_type,
                  acknowledged = excluded.acknowledged,
                  payload_json = excluded.payload_json,
                  updated_at = excluded.updated_at
                """,
                (
                    ident,
                    event_value(event, "workflowRunId", "workflow_run_id"),
                    event_value(event, "skillRunId", "skill_run_id"),
                    event_value(event, "type", "eventType", "state"),
                    1 if event.get("acknowledged") is True else 0,
                    payload,
                    now,
                    now,
                ),
            )
    return inserted, updated


def sync(args: argparse.Namespace) -> int:
    command = ["run", "notification", "list", "--acknowledged", "false", "--limit", str(args.limit)]
    raw = call_bridge(args.bridge, command)
    events = event_list(raw)
    inserted, updated = store_events(connect(db_path(args)), events)
    result = {
        "schema": SCHEMA,
        "generatedAt": utc_now(),
        "fetched": len(events),
        "inserted": inserted,
        "updated": updated,
        "unchanged": len(events) - inserted - updated,
    }
    if not args.report_empty and inserted == 0 and updated == 0:
        print("[SILENT]")
    else:
        print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0


def row_to_event(row: sqlite3.Row) -> dict[str, Any]:
    return {
        "eventId": row["event_id"],
        "workflowRunId": row["workflow_run_id"],
        "skillRunId": row["skill_run_id"],
        "type": row["event_type"],
        "acknowledged": bool(row["acknowledged"]),
        "seenAt": row["seen_at"],
        "updatedAt": row["updated_at"],
        "payload": json.loads(row["payload_json"]),
    }


def inbox(args: argparse.Namespace) -> int:
    conn = connect(db_path(args))
    where = "" if args.all else "WHERE acknowledged = 0"
    rows = conn.execute(
        f"SELECT * FROM notifications {where} ORDER BY updated_at DESC LIMIT ?",
        (args.limit,),
    ).fetchall()
    if not rows and not args.report_empty:
        print("[SILENT]")
    else:
        print(
            json.dumps(
                {"schema": SCHEMA, "generatedAt": utc_now(), "events": [row_to_event(row) for row in rows]},
                ensure_ascii=False,
                indent=2,
            )
        )
    return 0


def summary(args: argparse.Namespace) -> int:
    conn = connect(db_path(args))
    rows = conn.execute(
        "SELECT event_type, acknowledged, COUNT(*) AS count FROM notifications GROUP BY event_type, acknowledged"
    ).fetchall()
    payload = [
        {"type": row["event_type"], "acknowledged": bool(row["acknowledged"]), "count": row["count"]}
        for row in rows
    ]
    if not payload and not args.report_empty:
        print("[SILENT]")
    else:
        print(json.dumps({"schema": SCHEMA, "generatedAt": utc_now(), "counts": payload}, ensure_ascii=False, indent=2))
    return 0


def ack(args: argparse.Namespace) -> int:
    call_bridge(args.bridge, ["run", "notification", "ack", *sum([["--event", event] for event in args.event], [])])
    conn = connect(db_path(args))
    with conn:
        for event in args.event:
            conn.execute(
                "UPDATE notifications SET acknowledged = 1, updated_at = ? WHERE event_id = ?",
                (utc_now(), event),
            )
    print(json.dumps({"schema": SCHEMA, "acknowledged": args.event}, ensure_ascii=False, indent=2))
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Zotero Librarian notification inbox helper")
    parser.add_argument("--db", help="SQLite database path")
    parser.add_argument("--bridge", default="zotero-bridge", help="zotero-bridge executable")
    sub = parser.add_subparsers(dest="command", required=True)

    sync_parser = sub.add_parser("sync")
    sync_parser.add_argument("--limit", type=int, default=100)
    sync_parser.add_argument("--report-empty", action="store_true")
    sync_parser.set_defaults(func=sync)

    inbox_parser = sub.add_parser("inbox")
    inbox_parser.add_argument("--limit", type=int, default=25)
    inbox_parser.add_argument("--all", action="store_true")
    inbox_parser.add_argument("--report-empty", action="store_true")
    inbox_parser.set_defaults(func=inbox)

    summary_parser = sub.add_parser("summary")
    summary_parser.add_argument("--report-empty", action="store_true")
    summary_parser.set_defaults(func=summary)

    ack_parser = sub.add_parser("ack")
    ack_parser.add_argument("--event", required=True, action="append")
    ack_parser.set_defaults(func=ack)
    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    try:
        return args.func(args)
    except ServiceError as error:
        print(
            json.dumps(
                {"schema": SCHEMA, "ok": False, "error": {"code": error.code, "message": str(error), "details": error.details}},
                ensure_ascii=False,
                indent=2,
            )
        )
        return 2


if __name__ == "__main__":
    sys.exit(main())
