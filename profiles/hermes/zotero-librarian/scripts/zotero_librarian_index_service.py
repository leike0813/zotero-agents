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

SCHEMA = "zotero-librarian.index.v1"
SNAPSHOT_COMMAND_LABEL = "library snapshot"
WORKFLOW_DESCRIBE_LABEL = "workflow describe"
TERMINAL_RUN_STATES = {"succeeded", "failed", "canceled", "cancelled"}


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
    if raw:
        return Path(raw).expanduser()
    return state_dir() / "index.sqlite"


def connect(path: Path) -> sqlite3.Connection:
    path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(path)
    conn.row_factory = sqlite3.Row
    init_db(conn)
    return conn


def init_db(conn: sqlite3.Connection) -> None:
    conn.executescript(
        """
        CREATE TABLE IF NOT EXISTS meta (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS items (
          library_id INTEGER NOT NULL,
          key TEXT NOT NULL,
          id INTEGER NOT NULL,
          item_type TEXT NOT NULL,
          title TEXT NOT NULL,
          creators_json TEXT NOT NULL,
          year TEXT NOT NULL,
          date TEXT NOT NULL,
          publication_title TEXT NOT NULL,
          doi TEXT NOT NULL,
          isbn TEXT NOT NULL,
          issn TEXT NOT NULL,
          url TEXT NOT NULL,
          tags_json TEXT NOT NULL,
          collections_json TEXT NOT NULL,
          note_count INTEGER NOT NULL,
          attachment_count INTEGER NOT NULL,
          deleted INTEGER NOT NULL DEFAULT 0,
          updated_at TEXT NOT NULL,
          PRIMARY KEY (library_id, key)
        );
        CREATE TABLE IF NOT EXISTS workflows (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          schema_hash TEXT NOT NULL,
          summary_json TEXT NOT NULL,
          detail_json TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS runs (
          run_id TEXT PRIMARY KEY,
          workflow_id TEXT NOT NULL,
          state TEXT NOT NULL,
          payload_json TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
        """
    )
    conn.execute(
        "INSERT OR REPLACE INTO meta(key, value) VALUES (?, ?)",
        ("schema", SCHEMA),
    )
    conn.commit()


def stable_json(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def sha256_json(value: Any) -> str:
    return hashlib.sha256(stable_json(value).encode("utf-8")).hexdigest()


def call_bridge(bridge: str, argv: list[str]) -> Any:
    proc = subprocess.run(
        [bridge, *argv],
        text=True,
        capture_output=True,
        check=False,
    )
    if proc.returncode != 0:
        raise RuntimeError(proc.stderr.strip() or proc.stdout.strip() or "zotero-bridge failed")
    output = proc.stdout.strip()
    if not output:
        return {}
    return json.loads(output)


def unwrap_bridge_data(raw: Any) -> Any:
    current = raw
    for _ in range(6):
        if not isinstance(current, dict):
            return current
        if "items" in current or "workflows" in current or "run" in current:
            return current
        if "result" in current:
            current = current["result"]
            continue
        if "data" in current:
            current = current["data"]
            continue
        return current
    return current


def snapshot_payload(args: argparse.Namespace, cursor: str) -> dict[str, Any]:
    payload: dict[str, Any] = {"limit": args.limit}
    if cursor:
        payload["cursor"] = cursor
    for key in ["library_id", "collection_id", "collection_key", "tag", "item_type", "query"]:
        value = getattr(args, key, None)
        if value in (None, ""):
            continue
        camel = "".join([key.split("_")[0], *[part.title() for part in key.split("_")[1:]]])
        payload[camel] = value
    return payload


def normalize_item(entry: dict[str, Any], now: str) -> tuple[Any, ...]:
    return (
        int(entry.get("libraryId") or 0),
        str(entry.get("key") or ""),
        int(entry.get("id") or 0),
        str(entry.get("itemType") or ""),
        str(entry.get("title") or ""),
        stable_json(entry.get("creators") or []),
        str(entry.get("year") or ""),
        str(entry.get("date") or ""),
        str(entry.get("publicationTitle") or ""),
        str(entry.get("DOI") or ""),
        str(entry.get("ISBN") or ""),
        str(entry.get("ISSN") or ""),
        str(entry.get("url") or ""),
        stable_json(entry.get("tags") or []),
        stable_json(entry.get("collections") or []),
        int(entry.get("noteCount") or 0),
        int(entry.get("attachmentCount") or 0),
        0,
        now,
    )


def refresh(args: argparse.Namespace) -> int:
    path = db_path(args)
    conn = connect(path)
    cursor = ""
    seen: set[tuple[int, str]] = set()
    added = changed = 0
    now = utc_now()

    with conn:
        while True:
            payload = snapshot_payload(args, cursor)
            raw = call_bridge(
                args.bridge,
                ["library", "snapshot", "--input", json.dumps(payload, ensure_ascii=False)],
            )
            page = unwrap_bridge_data(raw)
            items = page.get("items", []) if isinstance(page, dict) else []
            for item in items:
                if not isinstance(item, dict):
                    continue
                row = normalize_item(item, now)
                identity = (row[0], row[1])
                seen.add(identity)
                previous = conn.execute(
                    "SELECT * FROM items WHERE library_id = ? AND key = ?",
                    identity,
                ).fetchone()
                next_hash = sha256_json(row[:-2])
                previous_hash = sha256_json(tuple(previous)[0:17]) if previous else ""
                if previous is None:
                    added += 1
                elif next_hash != previous_hash or previous["deleted"]:
                    changed += 1
                conn.execute(
                    """
                    INSERT INTO items (
                      library_id, key, id, item_type, title, creators_json, year, date,
                      publication_title, doi, isbn, issn, url, tags_json, collections_json,
                      note_count, attachment_count, deleted, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT(library_id, key) DO UPDATE SET
                      id = excluded.id,
                      item_type = excluded.item_type,
                      title = excluded.title,
                      creators_json = excluded.creators_json,
                      year = excluded.year,
                      date = excluded.date,
                      publication_title = excluded.publication_title,
                      doi = excluded.doi,
                      isbn = excluded.isbn,
                      issn = excluded.issn,
                      url = excluded.url,
                      tags_json = excluded.tags_json,
                      collections_json = excluded.collections_json,
                      note_count = excluded.note_count,
                      attachment_count = excluded.attachment_count,
                      deleted = 0,
                      updated_at = excluded.updated_at
                    """,
                    row,
                )
            cursor = str(page.get("nextCursor") or "") if isinstance(page, dict) else ""
            if not (isinstance(page, dict) and page.get("hasMore") and cursor):
                break

        deleted = 0
        if not any(
            getattr(args, name, None)
            for name in ["collection_id", "collection_key", "tag", "item_type", "query"]
        ):
            rows = conn.execute("SELECT library_id, key FROM items WHERE deleted = 0").fetchall()
            for row in rows:
                identity = (int(row["library_id"]), str(row["key"]))
                if identity not in seen:
                    deleted += 1
                    conn.execute(
                        "UPDATE items SET deleted = 1, updated_at = ? WHERE library_id = ? AND key = ?",
                        (now, identity[0], identity[1]),
                    )
        conn.execute("INSERT OR REPLACE INTO meta(key, value) VALUES (?, ?)", ("last_refresh", now))

    if added == 0 and changed == 0 and deleted == 0:
        print("[SILENT]")
    else:
        print(json.dumps({"added": added, "changed": changed, "deleted": deleted}, ensure_ascii=False))
    return 0


def row_to_item(row: sqlite3.Row) -> dict[str, Any]:
    return {
        "libraryId": row["library_id"],
        "key": row["key"],
        "id": row["id"],
        "itemType": row["item_type"],
        "title": row["title"],
        "creators": json.loads(row["creators_json"]),
        "year": row["year"],
        "date": row["date"],
        "publicationTitle": row["publication_title"],
        "DOI": row["doi"],
        "ISBN": row["isbn"],
        "ISSN": row["issn"],
        "url": row["url"],
        "tags": json.loads(row["tags_json"]),
        "collections": json.loads(row["collections_json"]),
        "noteCount": row["note_count"],
        "attachmentCount": row["attachment_count"],
        "deleted": bool(row["deleted"]),
    }


def search(args: argparse.Namespace) -> int:
    conn = connect(db_path(args))
    needle = f"%{args.query}%"
    rows = conn.execute(
        """
        SELECT * FROM items
        WHERE deleted = 0 AND (
          title LIKE ? OR creators_json LIKE ? OR doi LIKE ? OR isbn LIKE ? OR
          issn LIKE ? OR url LIKE ? OR tags_json LIKE ? OR collections_json LIKE ?
        )
        ORDER BY title COLLATE NOCASE
        LIMIT ?
        """,
        (needle, needle, needle, needle, needle, needle, needle, needle, args.limit),
    ).fetchall()
    if not rows:
        print("[SILENT]")
        return 0
    print(json.dumps([row_to_item(row) for row in rows], ensure_ascii=False, indent=2))
    return 0


def item(args: argparse.Namespace) -> int:
    conn = connect(db_path(args))
    row = conn.execute(
        "SELECT * FROM items WHERE key = ? OR CAST(id AS TEXT) = ? ORDER BY deleted ASC LIMIT 1",
        (args.ref, args.ref),
    ).fetchone()
    if row is None:
        print("[SILENT]")
        return 0
    print(json.dumps(row_to_item(row), ensure_ascii=False, indent=2))
    return 0


def stats(args: argparse.Namespace) -> int:
    conn = connect(db_path(args))
    payload = {
        "schema": SCHEMA,
        "database": str(db_path(args)),
        "items": conn.execute("SELECT COUNT(*) FROM items WHERE deleted = 0").fetchone()[0],
        "deletedItems": conn.execute("SELECT COUNT(*) FROM items WHERE deleted = 1").fetchone()[0],
        "workflows": conn.execute("SELECT COUNT(*) FROM workflows").fetchone()[0],
        "activeRuns": conn.execute(
            "SELECT COUNT(*) FROM runs WHERE state NOT IN ('succeeded','failed','canceled','cancelled')"
        ).fetchone()[0],
        "lastRefresh": (
            conn.execute("SELECT value FROM meta WHERE key = 'last_refresh'").fetchone() or [None]
        )[0],
    }
    print(json.dumps(payload, ensure_ascii=False, indent=2))
    return 0


def workflow_entries(raw: Any) -> list[dict[str, Any]]:
    data = unwrap_bridge_data(raw)
    if isinstance(data, list):
        return [entry for entry in data if isinstance(entry, dict)]
    if isinstance(data, dict):
        for key in ["workflows", "items", "results"]:
            value = data.get(key)
            if isinstance(value, list):
                return [entry for entry in value if isinstance(entry, dict)]
    return []


def workflow_id(entry: dict[str, Any]) -> str:
    return str(entry.get("id") or entry.get("workflow") or entry.get("name") or "")


def workflow_refresh(args: argparse.Namespace) -> int:
    conn = connect(db_path(args))
    listed = workflow_entries(call_bridge(args.bridge, ["workflow", "list"]))
    changed: list[str] = []
    now = utc_now()
    with conn:
        for entry in listed:
            ident = workflow_id(entry)
            if not ident:
                continue
            summary_hash = sha256_json(entry)
            previous = conn.execute("SELECT schema_hash FROM workflows WHERE id = ?", (ident,)).fetchone()
            if previous and previous["schema_hash"] == summary_hash:
                continue
            detail = unwrap_bridge_data(
                call_bridge(args.bridge, ["workflow", "describe", "--workflow", ident])
            )
            conn.execute(
                """
                INSERT INTO workflows(id, name, schema_hash, summary_json, detail_json, updated_at)
                VALUES (?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                  name = excluded.name,
                  schema_hash = excluded.schema_hash,
                  summary_json = excluded.summary_json,
                  detail_json = excluded.detail_json,
                  updated_at = excluded.updated_at
                """,
                (
                    ident,
                    str(entry.get("name") or ident),
                    summary_hash,
                    stable_json(entry),
                    stable_json(detail),
                    now,
                ),
            )
            changed.append(ident)
    print("[SILENT]" if not changed else json.dumps({"changed": changed}, ensure_ascii=False))
    return 0


def workflow_show(args: argparse.Namespace) -> int:
    conn = connect(db_path(args))
    row = conn.execute("SELECT detail_json FROM workflows WHERE id = ?", (args.workflow_id,)).fetchone()
    if row is None:
        print("[SILENT]")
        return 0
    print(json.dumps(json.loads(row["detail_json"]), ensure_ascii=False, indent=2))
    return 0


def run_register(args: argparse.Namespace) -> int:
    payload = json.loads(args.payload) if args.payload else {}
    run_id = args.run_id or str(payload.get("runId") or payload.get("id") or "")
    if not run_id:
        raise SystemExit("run-register requires --run-id or payload.runId")
    workflow = args.workflow_id or str(payload.get("workflowId") or payload.get("workflow") or "")
    state = args.state or str(payload.get("state") or payload.get("status") or "running")
    conn = connect(db_path(args))
    with conn:
        conn.execute(
            """
            INSERT INTO runs(run_id, workflow_id, state, payload_json, updated_at)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(run_id) DO UPDATE SET
              workflow_id = excluded.workflow_id,
              state = excluded.state,
              payload_json = excluded.payload_json,
              updated_at = excluded.updated_at
            """,
            (run_id, workflow, state, stable_json(payload), utc_now()),
        )
    print(json.dumps({"registered": run_id, "state": state}, ensure_ascii=False))
    return 0


def run_state(raw: Any) -> tuple[str, dict[str, Any]]:
    data = unwrap_bridge_data(raw)
    if isinstance(data, dict):
        nested = data.get("run") if isinstance(data.get("run"), dict) else data
        state = str(nested.get("state") or nested.get("status") or "running")
        return state, nested
    return "running", {"raw": data}


def run_watch(args: argparse.Namespace) -> int:
    conn = connect(db_path(args))
    rows = conn.execute(
        "SELECT * FROM runs WHERE state NOT IN ('succeeded','failed','canceled','cancelled')"
    ).fetchall()
    changes: list[dict[str, Any]] = []
    with conn:
        for row in rows:
            state, payload = run_state(call_bridge(args.bridge, ["workflow", "run", row["run_id"]]))
            should_report = state != row["state"] or state in {"waiting", *TERMINAL_RUN_STATES}
            conn.execute(
                "UPDATE runs SET state = ?, payload_json = ?, updated_at = ? WHERE run_id = ?",
                (state, stable_json(payload), utc_now(), row["run_id"]),
            )
            if should_report:
                changes.append({"runId": row["run_id"], "workflowId": row["workflow_id"], "state": state})
    print("[SILENT]" if not changes else json.dumps({"runs": changes}, ensure_ascii=False, indent=2))
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Zotero Librarian local index service")
    parser.add_argument("--db", help="SQLite database path")
    parser.add_argument("--bridge", default="zotero-bridge", help="zotero-bridge executable")
    sub = parser.add_subparsers(dest="command", required=True)

    refresh_parser = sub.add_parser("refresh")
    refresh_parser.add_argument("--limit", type=int, default=200)
    refresh_parser.add_argument("--library-id")
    refresh_parser.add_argument("--collection-id")
    refresh_parser.add_argument("--collection-key")
    refresh_parser.add_argument("--tag")
    refresh_parser.add_argument("--item-type")
    refresh_parser.add_argument("--query")
    refresh_parser.set_defaults(func=refresh)

    search_parser = sub.add_parser("search")
    search_parser.add_argument("query")
    search_parser.add_argument("--limit", type=int, default=25)
    search_parser.set_defaults(func=search)

    item_parser = sub.add_parser("item")
    item_parser.add_argument("ref")
    item_parser.set_defaults(func=item)

    stats_parser = sub.add_parser("stats")
    stats_parser.set_defaults(func=stats)

    workflow_refresh_parser = sub.add_parser("workflow-refresh")
    workflow_refresh_parser.set_defaults(func=workflow_refresh)

    workflow_show_parser = sub.add_parser("workflow-show")
    workflow_show_parser.add_argument("workflow_id")
    workflow_show_parser.set_defaults(func=workflow_show)

    run_register_parser = sub.add_parser("run-register")
    run_register_parser.add_argument("--run-id")
    run_register_parser.add_argument("--workflow-id")
    run_register_parser.add_argument("--state")
    run_register_parser.add_argument("--payload")
    run_register_parser.set_defaults(func=run_register)

    run_watch_parser = sub.add_parser("run-watch")
    run_watch_parser.set_defaults(func=run_watch)

    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    return args.func(args)


if __name__ == "__main__":
    sys.exit(main())
