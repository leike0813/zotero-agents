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
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

RECEIPT_SCHEMA = "zotero-librarian.operation-receipt.v1"
STATE_SCHEMA = "zotero-librarian.state.v2"
WORKFLOW_PLAN_SCHEMA = "zotero-librarian.workflow-plan.v2"
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


def state_path(raw: str | None) -> Path:
    if raw:
        return Path(raw).expanduser()
    base = os.environ.get("ZOTERO_LIBRARIAN_STATE_DIR")
    if base:
        return Path(base).expanduser() / "state.sqlite"
    hermes_home = os.environ.get("HERMES_HOME")
    if hermes_home:
        return Path(hermes_home).expanduser() / "zotero-librarian" / "state.sqlite"
    return Path.home() / ".hermes" / "zotero-librarian" / "state.sqlite"


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
        CREATE TABLE IF NOT EXISTS workflow_plans (
          plan_id TEXT PRIMARY KEY, plan_digest TEXT NOT NULL UNIQUE,
          workflow_id TEXT NOT NULL, workflow_description_digest TEXT NOT NULL,
          plan_json TEXT NOT NULL, output_path TEXT NOT NULL,
          state TEXT NOT NULL, default_concurrency INTEGER NOT NULL,
          created_at TEXT NOT NULL, updated_at TEXT NOT NULL, submitted_at TEXT
        );
        CREATE TABLE IF NOT EXISTS workflow_plan_entries (
          plan_id TEXT NOT NULL, ordinal INTEGER NOT NULL,
          item_refs_json TEXT NOT NULL, entry_digest TEXT NOT NULL,
          state TEXT NOT NULL, workflow_run_id TEXT UNIQUE,
          submit_receipt_json TEXT, last_error_json TEXT,
          created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
          PRIMARY KEY(plan_id, ordinal),
          FOREIGN KEY(plan_id) REFERENCES workflow_plans(plan_id) ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS workflow_plan_entries_state
          ON workflow_plan_entries(plan_id, state, ordinal);
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
    conn.commit()
    return conn


def call_bridge(bridge: str, argv: list[str]) -> Any:
    proc = subprocess.run([bridge, *argv], text=True, capture_output=True, check=False)
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
    key = str(item.get("key") or "").strip()
    if not key:
        raise ServiceError("invalid_snapshot", "library item is missing key", {"item": item})
    return int(item.get("libraryId") or item.get("libraryID") or 0), key


def index_refresh(args: argparse.Namespace) -> dict[str, Any]:
    conn = connect(state_path(args.db))
    changed = added = updated = 0
    seen: set[tuple[int, str]] = set()
    with conn:
        cursor = ""
        while True:
            query: dict[str, Any] = {"limit": args.limit}
            if cursor:
                query["cursor"] = cursor
            page = unwrap(call_bridge(args.bridge, ["library", "snapshot", "--input", stable_json(query)]))
            if not isinstance(page, dict):
                raise ServiceError("invalid_snapshot", "library snapshot must be an object")
            entries = page.get("items", [])
            if not isinstance(entries, list):
                raise ServiceError("invalid_snapshot", "library snapshot items must be an array")
            for item in entries:
                if not isinstance(item, dict):
                    continue
                library_id, key = item_identity(item)
                seen.add((library_id, key))
                item_digest = digest(item)
                previous = conn.execute("SELECT digest FROM library_items WHERE library_id = ? AND item_key = ?", (library_id, key)).fetchone()
                if previous is None:
                    added += 1
                elif previous["digest"] != item_digest:
                    updated += 1
                else:
                    continue
                changed += 1
                conn.execute("""INSERT INTO library_items(library_id,item_key,item_id,item_type,title,payload_json,digest,updated_at)
                    VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(library_id,item_key) DO UPDATE SET item_id=excluded.item_id,item_type=excluded.item_type,title=excluded.title,payload_json=excluded.payload_json,digest=excluded.digest,updated_at=excluded.updated_at""",
                    (library_id, key, int(item.get("id") or 0), str(item.get("itemType") or ""), str(item.get("title") or ""), stable_json(item), item_digest, now()))
            cursor = str(page.get("nextCursor") or "")
            if not (page.get("hasMore") and cursor):
                break
        deleted = 0
        for row in conn.execute("SELECT library_id, item_key FROM library_items").fetchall():
            if (row["library_id"], row["item_key"]) not in seen:
                conn.execute("DELETE FROM library_items WHERE library_id = ? AND item_key = ?", (row["library_id"], row["item_key"]))
                deleted += 1
        conn.execute("INSERT OR REPLACE INTO meta(key,value) VALUES(?,?)", ("last_index_refresh", now()))
    return receipt("index.refresh", "changed" if changed or deleted else "unchanged", {"added": added, "updated": updated, "deleted": deleted, "total": len(seen)})


def index_search(args: argparse.Namespace) -> dict[str, Any]:
    rows = connect(state_path(args.db)).execute("SELECT payload_json FROM library_items WHERE lower(title) LIKE ? OR lower(payload_json) LIKE ? ORDER BY title LIMIT ?", (f"%{args.query.lower()}%", f"%{args.query.lower()}%", args.limit)).fetchall()
    items = [json.loads(row["payload_json"]) for row in rows]
    return receipt("index.search", "ok", {"items": items})


def index_item(args: argparse.Namespace) -> dict[str, Any]:
    row = connect(state_path(args.db)).execute("SELECT payload_json FROM library_items WHERE item_key = ? OR item_id = ? LIMIT 1", (args.ref, args.ref)).fetchone()
    if not row:
        raise ServiceError("item_not_found", "cached item was not found", {"ref": args.ref})
    return receipt("index.item", "ok", {"item": json.loads(row["payload_json"])})


def index_stats(args: argparse.Namespace) -> dict[str, Any]:
    conn = connect(state_path(args.db))
    count = conn.execute("SELECT COUNT(*) AS count FROM library_items").fetchone()["count"]
    refreshed = conn.execute("SELECT value FROM meta WHERE key = 'last_index_refresh'").fetchone()
    return receipt("index.stats", "ok", {"itemCount": count, "lastRefresh": refreshed["value"] if refreshed else None})


def workflow_catalog_refresh(args: argparse.Namespace) -> dict[str, Any]:
    conn = connect(state_path(args.db))
    data = unwrap(call_bridge(args.bridge, ["workflow", "list"]))
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
            detail = unwrap(call_bridge(args.bridge, ["workflow", "describe", "--workflow", workflow_id]))
            conn.execute("INSERT INTO workflow_catalog(workflow_id,payload_json,digest,updated_at) VALUES(?,?,?,?) ON CONFLICT(workflow_id) DO UPDATE SET payload_json=excluded.payload_json,digest=excluded.digest,updated_at=excluded.updated_at", (workflow_id, stable_json(detail), current, now()))
    return receipt("workflow.catalog-refresh", "changed" if changed else "unchanged", {"updated": changed})


def workflow_show(args: argparse.Namespace) -> dict[str, Any]:
    row = connect(state_path(args.db)).execute("SELECT payload_json FROM workflow_catalog WHERE workflow_id = ?", (args.workflow_id,)).fetchone()
    if not row:
        raise ServiceError("workflow_not_found", "cached workflow was not found", {"workflowId": args.workflow_id})
    return receipt("workflow.show", "ok", {"workflow": json.loads(row["payload_json"])})


def workflow_description(bridge: str, workflow_id: str) -> dict[str, Any]:
    value = unwrap(
        call_bridge(bridge, ["workflow", "describe", "--workflow", workflow_id])
    )
    if not isinstance(value, dict):
        raise ServiceError(
            "invalid_workflow_description",
            "workflow describe must return an object",
            {"workflowId": workflow_id},
        )
    return value


def workflow_input_unit(description: dict[str, Any]) -> str:
    selection = description.get("selection")
    if not isinstance(selection, dict):
        raise ServiceError(
            "unsupported_workflow_selection",
            "workflow description does not declare a selection contract",
        )
    unit = str(selection.get("inputUnit") or "").strip()
    if unit not in {"attachment", "parent", "item"}:
        raise ServiceError(
            "unsupported_workflow_selection",
            "resident planning supports attachment, parent, or item selection only",
            {"inputUnit": unit},
        )
    return unit


def selection_refs(
    bridge: str, from_context: bool, input_unit: str
) -> list[dict[str, Any]]:
    if not from_context:
        return []
    data = unwrap(call_bridge(bridge, ["context", "selection", "get"]))
    selected = data.get("selectedItems", []) if isinstance(data, dict) else []
    refs: list[dict[str, Any]] = []
    labels: set[str] = set()
    for item in selected:
        if not isinstance(item, dict):
            continue
        item_type = str(item.get("itemType") or "")
        if input_unit == "attachment":
            if item_type != "attachment":
                continue
            target = item
        elif input_unit == "parent":
            target = (
                item.get("parent")
                if isinstance(item.get("parent"), dict)
                else item
            )
        else:
            target = item
        key = str(target.get("key") or "").strip()
        library_id = item.get("libraryId") or item.get("libraryID")
        if not key:
            continue
        ref = {"key": key}
        if library_id is not None:
            ref["libraryId"] = int(library_id)
        label = stable_json(ref)
        if label not in labels:
            labels.add(label)
            refs.append(ref)
    return refs


def validate_workflow_entry(
    bridge: str, workflow_id: str, item_refs: list[dict[str, Any]]
) -> dict[str, Any]:
    validation = unwrap(
        call_bridge(
            bridge,
            [
                "workflow",
                "validate",
                "--workflow",
                workflow_id,
                "--selection",
                stable_json(item_refs),
            ],
        )
    )
    if not isinstance(validation, dict):
        raise ServiceError(
            "workflow_validation_failed",
            "workflow validation did not return an object",
            {"workflowId": workflow_id, "itemRefs": item_refs},
        )
    if validation.get("ready") is False:
        raise ServiceError(
            "workflow_validation_failed",
            "workflow validation failed",
            {
                "workflowId": workflow_id,
                "itemRefs": item_refs,
                "validation": validation,
            },
        )
    return validation


def plan_without_digest(plan: dict[str, Any]) -> dict[str, Any]:
    return {key: value for key, value in plan.items() if key != "planDigest"}


def parse_plan_file(raw_path: str) -> tuple[Path, dict[str, Any]]:
    path = Path(raw_path).expanduser()
    if not path.is_absolute():
        raise ServiceError(
            "absolute_plan_required",
            "workflow submit --plan must be an absolute file path",
            {"plan": raw_path},
        )
    path = path.resolve()
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        raise ServiceError(
            "invalid_plan",
            "workflow plan could not be read as JSON",
            {"plan": str(path), "reason": str(error)},
        ) from error
    if not isinstance(value, dict):
        raise ServiceError("invalid_plan", "workflow plan must be an object")
    if value.get("schema") != WORKFLOW_PLAN_SCHEMA:
        raise ServiceError(
            "invalid_plan",
            "workflow plan schema is invalid",
            {"schema": value.get("schema")},
        )
    return path, value


def workflow_plan(args: argparse.Namespace) -> dict[str, Any]:
    description = workflow_description(args.bridge, args.workflow)
    input_unit = workflow_input_unit(description)
    refs = selection_refs(args.bridge, args.from_context, input_unit)
    if not refs:
        raise ServiceError(
            "empty_selection",
            "workflow plan requires a current selection matching the workflow input unit",
            {"fromContext": args.from_context, "inputUnit": input_unit},
        )
    submissions = []
    for ref in refs:
        item_refs = [ref]
        validate_workflow_entry(args.bridge, args.workflow, item_refs)
        submissions.append({"itemRefs": item_refs})
    output = Path(args.output).expanduser()
    if not output.is_absolute():
        raise ServiceError("absolute_output_required", "workflow plan --output must be an absolute file path", {"output": args.output})
    output = output.resolve()
    created_at = now()
    description_digest = digest(description)
    plan_id = f"plan-{digest({'workflowId': args.workflow, 'output': str(output), 'createdAt': created_at, 'submissions': submissions})[:24]}"
    plan: dict[str, Any] = {
        "schema": WORKFLOW_PLAN_SCHEMA,
        "planId": plan_id,
        "workflowId": args.workflow,
        "createdAt": created_at,
        "workflowDescriptionDigest": description_digest,
        "defaultConcurrency": 1,
        "submissions": submissions,
    }
    plan["planDigest"] = digest(plan_without_digest(plan))
    try:
        output.parent.mkdir(parents=True, exist_ok=True)
        with tempfile.NamedTemporaryFile("w", encoding="utf-8", dir=output.parent, prefix=f".{output.name}.", suffix=".tmp", delete=False) as handle:
            handle.write(json.dumps(plan, ensure_ascii=False, sort_keys=True, indent=2) + "\n")
            temporary = Path(handle.name)
        os.replace(temporary, output)
    except OSError as error:
        raise ServiceError("plan_write_failed", "workflow plan output could not be written", {"output": str(output), "reason": str(error)}) from error
    conn = connect(state_path(args.db))
    timestamp = now()
    try:
        with conn:
            conn.execute(
                """INSERT INTO workflow_plans(
                    plan_id,plan_digest,workflow_id,workflow_description_digest,
                    plan_json,output_path,state,default_concurrency,
                    created_at,updated_at,submitted_at
                ) VALUES(?,?,?,?,?,?,?,?,?,?,NULL)""",
                (
                    plan_id,
                    plan["planDigest"],
                    args.workflow,
                    description_digest,
                    stable_json(plan),
                    str(output),
                    "prepared",
                    1,
                    created_at,
                    timestamp,
                ),
            )
            for ordinal, entry in enumerate(submissions):
                conn.execute(
                    """INSERT INTO workflow_plan_entries(
                        plan_id,ordinal,item_refs_json,entry_digest,state,
                        workflow_run_id,submit_receipt_json,last_error_json,
                        created_at,updated_at
                    ) VALUES(?,?,?,?,?,NULL,NULL,NULL,?,?)""",
                    (
                        plan_id,
                        ordinal,
                        stable_json(entry["itemRefs"]),
                        digest(entry),
                        "pending",
                        created_at,
                        timestamp,
                    ),
                )
    except sqlite3.Error as error:
        raise ServiceError(
            "plan_register_failed",
            "workflow plan file was written but could not be registered",
            {"output": str(output), "reason": str(error)},
        ) from error
    return receipt(
        "workflow.plan",
        "changed",
        {
            "selectionRefs": refs,
            "inputUnit": input_unit,
            "plan": plan,
            "path": str(output),
        },
    )


def workflow_submit(args: argparse.Namespace) -> dict[str, Any]:
    if not args.allow_submit:
        raise ServiceError("submit_authority_required", "workflow submit requires --allow-submit and is never cron-default")
    if args.concurrency < 1:
        raise ServiceError(
            "invalid_concurrency", "workflow submit --concurrency must be positive"
        )
    path, plan = parse_plan_file(args.plan)
    entries = plan.get("submissions")
    if not isinstance(entries, list) or not entries:
        raise ServiceError("invalid_plan", "workflow plan contains no submissions")
    plan_id = str(plan.get("planId") or "")
    workflow_id = str(plan.get("workflowId") or "")
    plan_digest = str(plan.get("planDigest") or "")
    calculated_digest = digest(plan_without_digest(plan))
    if not plan_id or not workflow_id or plan_digest != calculated_digest:
        raise ServiceError(
            "plan_identity_mismatch",
            "workflow plan identity or digest does not match its contents",
        )
    launched: list[dict[str, Any]] = []
    conn = connect(state_path(args.db))
    blocked = conn.execute(
        "SELECT value FROM meta WHERE key = 'submission_blocked'"
    ).fetchone()
    if blocked:
        raise ServiceError(
            "state_requires_attention",
            "workflow submission is blocked because resident state contains unclassified journal data",
            {"reason": blocked["value"]},
        )
    registered = conn.execute(
        "SELECT * FROM workflow_plans WHERE plan_id = ?", (plan_id,)
    ).fetchone()
    if (
        not registered
        or registered["plan_digest"] != plan_digest
        or registered["workflow_id"] != workflow_id
        or registered["output_path"] != str(path)
        or registered["plan_json"] != stable_json(plan)
    ):
        raise ServiceError(
            "plan_identity_mismatch",
            "workflow plan does not match the registered immutable plan",
            {"planId": plan_id, "path": str(path)},
        )
    description = workflow_description(args.bridge, workflow_id)
    if digest(description) != registered["workflow_description_digest"]:
        with conn:
            conn.execute(
                "UPDATE workflow_plans SET state = 'invalid', updated_at = ? WHERE plan_id = ?",
                (now(), plan_id),
            )
        raise ServiceError(
            "workflow_contract_changed",
            "workflow description changed after the plan was prepared",
            {"workflowId": workflow_id},
        )
    with conn:
        conn.execute(
            "UPDATE workflow_plan_entries SET state = 'unknown', updated_at = ?, last_error_json = ? WHERE plan_id = ? AND state = 'launching'",
            (
                now(),
                stable_json(
                    {
                        "code": "stale_launch_reservation",
                        "message": "A prior invocation ended after reserving this entry.",
                    }
                ),
                plan_id,
            ),
        )
        conn.execute(
            "UPDATE workflow_plans SET state = 'attention', updated_at = ? WHERE plan_id = ? AND EXISTS(SELECT 1 FROM workflow_plan_entries WHERE plan_id = ? AND state = 'unknown')",
            (now(), plan_id, plan_id),
        )
    pending = conn.execute(
        "SELECT * FROM workflow_plan_entries WHERE plan_id = ? AND state = 'pending' ORDER BY ordinal LIMIT ?",
        (plan_id, args.concurrency),
    ).fetchall()
    if not pending:
        raise ServiceError(
            "plan_no_pending_entries",
            "workflow plan has no pending entries eligible for submission",
            {"planId": plan_id},
        )
    for row in pending:
        item_refs = json.loads(row["item_refs_json"])
        validate_workflow_entry(args.bridge, workflow_id, item_refs)
        with conn:
            updated = conn.execute(
                "UPDATE workflow_plan_entries SET state = 'launching', updated_at = ? WHERE plan_id = ? AND ordinal = ? AND state = 'pending'",
                (now(), plan_id, row["ordinal"]),
            ).rowcount
            if updated != 1:
                raise ServiceError(
                    "plan_entry_not_pending",
                    "workflow plan entry is no longer pending",
                    {"planId": plan_id, "ordinal": row["ordinal"]},
                )
        try:
            raw = unwrap(
                call_bridge(
                    args.bridge,
                    [
                        "workflow",
                        "submit",
                        "--workflow",
                        workflow_id,
                        "--items",
                        stable_json(item_refs),
                    ],
                )
            )
            run_id = (
                str(raw.get("workflowRunId") or "")
                if isinstance(raw, dict)
                else ""
            )
            if not run_id:
                raise ServiceError(
                    "submit_result_unknown",
                    "workflow submit did not return workflowRunId",
                    {"result": raw},
                )
        except ServiceError as error:
            error_payload = {
                "code": error.code,
                "message": str(error),
                "details": error.details,
            }
            with conn:
                conn.execute(
                    "UPDATE workflow_plan_entries SET state = 'unknown', last_error_json = ?, updated_at = ? WHERE plan_id = ? AND ordinal = ?",
                    (stable_json(error_payload), now(), plan_id, row["ordinal"]),
                )
                conn.execute(
                    "UPDATE workflow_plans SET state = 'attention', updated_at = ?, submitted_at = COALESCE(submitted_at, ?) WHERE plan_id = ?",
                    (now(), now(), plan_id),
                )
            return receipt(
                "workflow.submit",
                "attention",
                {
                    "planId": plan_id,
                    "launched": launched,
                    "unknown": {
                        "ordinal": row["ordinal"],
                        "itemRefs": item_refs,
                        "error": error_payload,
                    },
                    "remaining": conn.execute(
                        "SELECT COUNT(*) AS count FROM workflow_plan_entries WHERE plan_id = ? AND state = 'pending'",
                        (plan_id,),
                    ).fetchone()["count"],
                },
                "Submission may have changed remote state; inspect live recent runs before any new plan.",
            )
        timestamp = now()
        with conn:
            conn.execute(
                "UPDATE workflow_plan_entries SET state = 'launched', workflow_run_id = ?, submit_receipt_json = ?, last_error_json = NULL, updated_at = ? WHERE plan_id = ? AND ordinal = ?",
                (run_id, stable_json(raw), timestamp, plan_id, row["ordinal"]),
            )
            conn.execute(
                "INSERT INTO watched_runs(run_id,workflow_id,state,payload_json,updated_at) VALUES(?,?,?,?,?) ON CONFLICT(run_id) DO UPDATE SET workflow_id=excluded.workflow_id,state=excluded.state,payload_json=excluded.payload_json,updated_at=excluded.updated_at",
                (
                    run_id,
                    workflow_id,
                    str(raw.get("state") or "running"),
                    stable_json(raw),
                    timestamp,
                ),
            )
            conn.execute(
                "UPDATE workflow_plans SET state = 'partial', updated_at = ?, submitted_at = COALESCE(submitted_at, ?) WHERE plan_id = ?",
                (timestamp, timestamp, plan_id),
            )
        launched.append(raw)
    remaining = conn.execute(
        "SELECT COUNT(*) AS count FROM workflow_plan_entries WHERE plan_id = ? AND state = 'pending'",
        (plan_id,),
    ).fetchone()["count"]
    unknown = conn.execute(
        "SELECT COUNT(*) AS count FROM workflow_plan_entries WHERE plan_id = ? AND state = 'unknown'",
        (plan_id,),
    ).fetchone()["count"]
    with conn:
        conn.execute(
            "UPDATE workflow_plans SET state = ?, updated_at = ? WHERE plan_id = ?",
            ("complete" if remaining == 0 and unknown == 0 else "partial", now(), plan_id),
        )
    return receipt(
        "workflow.submit",
        "changed",
        {"planId": plan_id, "launched": launched, "remaining": remaining},
    )


def run_register(args: argparse.Namespace) -> dict[str, Any]:
    conn = connect(state_path(args.db))
    with conn:
        conn.execute("INSERT OR REPLACE INTO watched_runs(run_id,workflow_id,state,payload_json,updated_at) VALUES(?,?,?,?,?)", (args.run_id, args.workflow_id, args.state, "{}", now()))
    return receipt("run.register", "changed", {"runId": args.run_id})


def run_watch(args: argparse.Namespace) -> dict[str, Any]:
    conn = connect(state_path(args.db))
    rows = conn.execute("SELECT * FROM watched_runs WHERE state NOT IN ('succeeded','failed','canceled','cancelled','completed')").fetchall()
    changed = 0
    states: list[dict[str, Any]] = []
    with conn:
        for row in rows:
            data = unwrap(call_bridge(args.bridge, ["run", "get", row["run_id"]]))
            state = str(data.get("state") or row["state"]) if isinstance(data, dict) else row["state"]
            if state != row["state"]:
                changed += 1
                conn.execute("UPDATE watched_runs SET state = ?, payload_json = ?, updated_at = ? WHERE run_id = ?", (state, stable_json(data), now(), row["run_id"]))
            states.append({"runId": row["run_id"], "state": state})
    return receipt("run.watch", "changed" if changed else "unchanged", {"runs": states})


def event_id(event: dict[str, Any]) -> str:
    return str(event.get("eventId") or event.get("id") or hashlib.sha256(stable_json(event).encode("utf-8")).hexdigest())


def notification_sync(args: argparse.Namespace) -> dict[str, Any]:
    data = unwrap(call_bridge(args.bridge, ["run", "notification", "list", "--acknowledged", "false", "--limit", str(args.limit)]))
    events = data.get("events", []) if isinstance(data, dict) else []
    inserted = updated = 0
    conn = connect(state_path(args.db))
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
    rows = connect(state_path(args.db)).execute("SELECT * FROM notifications WHERE acknowledged = 0 ORDER BY updated_at DESC LIMIT ?", (args.limit,)).fetchall()
    events = [{"eventId": row["event_id"], "workflowRunId": row["workflow_run_id"], "type": row["event_type"], "payload": json.loads(row["payload_json"])} for row in rows]
    return receipt("notification.inbox", "ok", {"events": events})


def notification_summary(args: argparse.Namespace) -> dict[str, Any]:
    rows = connect(state_path(args.db)).execute("SELECT event_type, COUNT(*) AS count FROM notifications WHERE acknowledged = 0 GROUP BY event_type").fetchall()
    counts = [{"type": row["event_type"], "count": row["count"]} for row in rows]
    return receipt("notification.summary", "ok", {"counts": counts})


def notification_ack(args: argparse.Namespace) -> dict[str, Any]:
    call_bridge(args.bridge, ["run", "notification", "ack", *sum((["--event", value] for value in args.event), [])])
    conn = connect(state_path(args.db))
    with conn:
        conn.executemany("UPDATE notifications SET acknowledged = 1, updated_at = ? WHERE event_id = ?", [(now(), event) for event in args.event])
    return receipt("notification.ack", "changed", {"acknowledged": args.event})


def maintenance_workflow_status(args: argparse.Namespace) -> dict[str, Any]:
    rows = connect(state_path(args.db)).execute("SELECT run_id, workflow_id, state FROM watched_runs WHERE state NOT IN ('succeeded','completed') ORDER BY updated_at DESC").fetchall()
    records = [{"runId": row["run_id"], "workflowId": row["workflow_id"], "state": row["state"]} for row in rows]
    return receipt("maintenance.workflow-status", "attention" if records else "unchanged", {"runs": records})


def maintenance_library_hygiene(args: argparse.Namespace) -> dict[str, Any]:
    rows = connect(state_path(args.db)).execute("SELECT title, GROUP_CONCAT(item_key) AS keys, COUNT(*) AS count FROM library_items WHERE title <> '' GROUP BY lower(title) HAVING COUNT(*) > 1").fetchall()
    candidates = [{"title": row["title"], "itemKeys": row["keys"].split(","), "reason": "duplicate_title"} for row in rows]
    return receipt("maintenance.library-hygiene", "attention" if candidates else "unchanged", {"candidates": candidates})


def synthesis_attention_queue(args: argparse.Namespace) -> dict[str, Any]:
    data = unwrap(call_bridge(args.bridge, ["synthesis", "insight", "attention-queue"]))
    items = data.get("items", []) if isinstance(data, dict) else []
    return receipt("synthesis.attention-queue", "attention" if items else "unchanged", {"items": items})


def parser() -> argparse.ArgumentParser:
    result = argparse.ArgumentParser(description="One-pass Zotero Librarian resident service")
    result.add_argument("--db", help="state.sqlite path")
    result.add_argument("--bridge", default="zotero-bridge")
    result.add_argument("--quiet", action="store_true", help="emit [SILENT] for unchanged receipts")
    domains = result.add_subparsers(dest="domain", required=True)

    index = domains.add_parser("index").add_subparsers(dest="action", required=True)
    p = index.add_parser("refresh"); p.add_argument("--limit", type=int, default=200); p.set_defaults(func=index_refresh, operation="index.refresh")
    p = index.add_parser("search"); p.add_argument("query"); p.add_argument("--limit", type=int, default=25); p.set_defaults(func=index_search, operation="index.search")
    p = index.add_parser("item"); p.add_argument("ref"); p.set_defaults(func=index_item, operation="index.item")
    index.add_parser("stats").set_defaults(func=index_stats, operation="index.stats")

    workflow = domains.add_parser("workflow").add_subparsers(dest="action", required=True)
    workflow.add_parser("catalog-refresh").set_defaults(func=workflow_catalog_refresh, operation="workflow.catalog-refresh")
    p = workflow.add_parser("show"); p.add_argument("workflow_id"); p.set_defaults(func=workflow_show, operation="workflow.show")
    p = workflow.add_parser("plan"); p.add_argument("--workflow", required=True); p.add_argument("--from-context", action="store_true"); p.add_argument("--output", required=True); p.set_defaults(func=workflow_plan, operation="workflow.plan")
    p = workflow.add_parser("submit"); p.add_argument("--plan", required=True); p.add_argument("--allow-submit", action="store_true"); p.add_argument("--concurrency", type=int, default=1); p.set_defaults(func=workflow_submit, operation="workflow.submit")

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
        return emit(args.func(args), args.quiet)
    except ServiceError as error:
        return emit({"schema": RECEIPT_SCHEMA, "operation": getattr(args, "operation", "unknown"), "status": "failed", "generatedAt": now(), "error": {"code": error.code, "message": str(error), "details": error.details}}, False)


if __name__ == "__main__":
    raise SystemExit(main())
