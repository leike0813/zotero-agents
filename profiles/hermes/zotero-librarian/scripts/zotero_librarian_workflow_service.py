#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
import sqlite3
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

SCHEMA = "zotero-librarian.workflow-service.v1"
DEFAULT_BATCH_SIZE = 1


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


def connect(path: Path) -> sqlite3.Connection:
    path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(path)
    conn.row_factory = sqlite3.Row
    conn.executescript(
        """
        CREATE TABLE IF NOT EXISTS runs (
          run_id TEXT PRIMARY KEY,
          workflow_id TEXT NOT NULL,
          state TEXT NOT NULL,
          payload_json TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
        """
    )
    conn.commit()
    return conn


def stable_json(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def read_json_arg(raw: str | None, default: Any = None) -> Any:
    if raw in (None, ""):
        return default
    if raw == "-":
        return json.loads(sys.stdin.read())
    source = raw[1:] if raw.startswith("@") else raw
    path = Path(source).expanduser()
    if path.exists():
        return json.loads(path.read_text(encoding="utf-8"))
    return json.loads(raw)


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
        if any(key in current for key in ["items", "events", "selectedItems", "workflowRunId", "agentRunId"]):
            return current
        if isinstance(current.get("result"), (dict, list)):
            current = current["result"]
            continue
        if isinstance(current.get("data"), (dict, list)):
            current = current["data"]
            continue
        return current
    return current


def item_ref_payload(item: dict[str, Any]) -> dict[str, Any]:
    key = str(item.get("key") or "").strip()
    library_id = item.get("libraryId") or item.get("libraryID")
    item_id = item.get("id")
    if key:
        payload: dict[str, Any] = {"key": key}
        if library_id not in (None, ""):
            payload["libraryId"] = int(library_id)
        return payload
    if item_id not in (None, ""):
        return {"id": int(item_id)}
    raise ServiceError("invalid_item_ref", "item ref must include key or id", {"item": item})


def item_ref_label(item: dict[str, Any]) -> str:
    key = str(item.get("key") or "").strip()
    library_id = item.get("libraryId") or item.get("libraryID")
    if key and library_id not in (None, ""):
        return f"{int(library_id)}:{key}"
    if key:
        return key
    if item.get("id") not in (None, ""):
        return str(item["id"])
    return ""


def parse_item_ref(value: Any) -> dict[str, Any]:
    if isinstance(value, dict):
        return item_ref_payload(value)
    raw = str(value or "").strip()
    if not raw:
        raise ServiceError("invalid_item_ref", "empty item ref")
    if ":" in raw:
        left, key = raw.split(":", 1)
        if left.isdigit() and key:
            return {"libraryId": int(left), "key": key}
    if raw.isdigit():
        return {"id": int(raw)}
    return {"key": raw}


def item_get_args(ref: dict[str, Any]) -> list[str]:
    if ref.get("key"):
        args = ["library", "item", "get", "--key", str(ref["key"])]
        if ref.get("libraryId") not in (None, ""):
            args.extend(["--library-id", str(ref["libraryId"])])
        return args
    if ref.get("id") not in (None, ""):
        return ["library", "item", "get", "--id", str(ref["id"])]
    raise ServiceError("invalid_item_ref", "item ref must include key or id", {"ref": ref})


def detail_for_ref(bridge: str, value: Any) -> dict[str, Any]:
    if isinstance(value, dict) and value.get("itemType"):
        return value
    return unwrap_bridge_data(call_bridge(bridge, item_get_args(parse_item_ref(value))))


def parent_ref_from_item(bridge: str, value: Any) -> tuple[dict[str, Any] | None, dict[str, Any]]:
    source = detail_for_ref(bridge, value)
    if not isinstance(source, dict):
        return None, {"source": value, "reason": "item detail is not an object"}
    parent = source.get("parent")
    if isinstance(parent, dict) and (parent.get("key") or parent.get("id")):
        parent_ref = item_ref_payload(
            {
                "key": parent.get("key"),
                "id": parent.get("id"),
                "libraryId": source.get("libraryId") or source.get("libraryID"),
            }
        )
        return parent_ref, {"source": item_ref_label(source), "parent": item_ref_label(parent_ref)}
    try:
        return item_ref_payload(source), {"source": item_ref_label(source), "parent": item_ref_label(source)}
    except ServiceError as error:
        return None, {"source": value, "reason": error.code}


def selected_items_from_context(raw: Any) -> list[Any]:
    data = unwrap_bridge_data(raw)
    if isinstance(data, dict):
        if isinstance(data.get("selectedItems"), list):
            return data["selectedItems"]
        current = data.get("currentView")
        if isinstance(current, dict) and isinstance(current.get("selectedItems"), list):
            return current["selectedItems"]
        selection = data.get("selection")
        if isinstance(selection, dict) and isinstance(selection.get("selectedItems"), list):
            return selection["selectedItems"]
        if isinstance(data.get("items"), list):
            return data["items"]
    return []


def coerce_items(raw: Any) -> list[Any]:
    if raw is None:
        return []
    if isinstance(raw, list):
        return raw
    if isinstance(raw, dict) and isinstance(raw.get("items"), list):
        return raw["items"]
    raise ServiceError("invalid_items_payload", "items payload must be an array or object with items[]")


def build_parent_selection(bridge: str, items: list[Any]) -> dict[str, Any]:
    parent_refs: list[dict[str, Any]] = []
    seen: set[str] = set()
    source_refs: list[dict[str, Any]] = []
    unresolved: list[dict[str, Any]] = []
    for item in items:
        parent, trace = parent_ref_from_item(bridge, item)
        if parent is None:
            unresolved.append(trace)
            continue
        label = item_ref_label(parent)
        source_refs.append(trace)
        if label not in seen:
            seen.add(label)
            parent_refs.append(parent)
    return {
        "schema": SCHEMA,
        "generatedAt": utc_now(),
        "parentItemRefs": parent_refs,
        "sourceRefs": source_refs,
        "unresolved": unresolved,
    }


def parent_selection(args: argparse.Namespace) -> int:
    if args.from_context:
        items = selected_items_from_context(call_bridge(args.bridge, ["context", "selection", "get"]))
    else:
        items = coerce_items(read_json_arg(args.items))
    result = build_parent_selection(args.bridge, items)
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0 if not result["unresolved"] else 2


def readiness_command(check: str) -> str:
    mapping = {
        "missing-pdf": "missing-pdf",
        "missing-markdown": "missing-markdown",
        "missing-analysis": "missing-analysis",
    }
    if check not in mapping:
        raise ServiceError("unsupported_readiness_check", "unsupported readiness check", {"check": check})
    return mapping[check]


def default_workflow_for_check(check: str, requested: str | None) -> str:
    if requested:
        return requested
    if check == "missing-analysis":
        return "literature-analysis"
    if check == "missing-markdown":
        return "mineru"
    return "literature-search-ingest"


def chunked(values: list[Any], size: int) -> list[list[Any]]:
    step = max(1, size)
    return [values[index : index + step] for index in range(0, len(values), step)]


def readiness_plan(args: argparse.Namespace) -> int:
    payload = read_json_arg(args.input, {})
    command = readiness_command(args.check)
    raw = call_bridge(
        args.bridge,
        ["library", "readiness", command, "--input", json.dumps(payload, ensure_ascii=False)],
    )
    data = unwrap_bridge_data(raw)
    items = coerce_items(data if isinstance(data, list) else data.get("items") if isinstance(data, dict) else [])
    parents = build_parent_selection(args.bridge, items)
    batches = [
        {"index": index, "items": batch}
        for index, batch in enumerate(chunked(parents["parentItemRefs"], args.batch_size), start=1)
    ]
    result = {
        "schema": SCHEMA,
        "generatedAt": utc_now(),
        "check": args.check,
        "workflowId": default_workflow_for_check(args.check, args.workflow),
        "batchSize": args.batch_size,
        "batches": batches,
        "totalItems": len(parents["parentItemRefs"]),
        "unresolved": parents["unresolved"],
    }
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0


def workflow_options_args(args: argparse.Namespace) -> list[str]:
    extra: list[str] = []
    if getattr(args, "workflow_options", None):
        extra.extend(["--workflow-options", args.workflow_options])
    if getattr(args, "provider_profile", None):
        extra.extend(["--provider-profile", args.provider_profile])
    return extra


def workflow_selection_from_args(args: argparse.Namespace) -> tuple[str, list[dict[str, Any]], dict[str, Any] | None]:
    if args.none:
        return "none", [], None
    if args.from_context:
        parents = build_parent_selection(
            args.bridge,
            selected_items_from_context(call_bridge(args.bridge, ["context", "selection", "get"])),
        )
    else:
        parents = build_parent_selection(args.bridge, coerce_items(read_json_arg(args.items)))
    if not parents["parentItemRefs"]:
        raise ServiceError("empty_workflow_selection", "workflow selection resolved to no parent items", parents)
    return "items", parents["parentItemRefs"], parents


def plan(args: argparse.Namespace) -> int:
    if args.mode == "agent" and (args.workflow_options or args.provider_profile):
        raise ServiceError(
            "agent_run_options_not_supported",
            "workflow agent-run does not accept workflow options or provider profiles",
        )
    selection_kind, items, parent_projection = workflow_selection_from_args(args)
    submissions = (
        [{"index": 1, "selectionKind": "none", "items": []}]
        if selection_kind == "none"
        else [
            {"index": index, "selectionKind": "items", "items": [item]}
            for index, item in enumerate(items, start=1)
        ]
    )
    validation: Any = None
    if args.mode == "host":
        command = ["workflow", "validate", "--workflow", args.workflow]
        if selection_kind == "none":
            command.append("--none")
        else:
            command.extend(["--items", json.dumps(items, ensure_ascii=False)])
        command.extend(workflow_options_args(args))
        validation = unwrap_bridge_data(call_bridge(args.bridge, command))
    result = {
        "schema": SCHEMA,
        "generatedAt": utc_now(),
        "workflowId": args.workflow,
        "mode": args.mode,
        "defaultConcurrency": 1,
        "selectionKind": selection_kind,
        "parentSelection": parent_projection,
        "workflowOptions": read_json_arg(args.workflow_options, {}) if args.workflow_options else {},
        "providerProfile": read_json_arg(args.provider_profile, {}) if args.provider_profile else {},
        "submissions": submissions,
        "validation": validation,
        "requiresConcurrencyConfirmation": len(submissions) > 1,
    }
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0


def extract_handle(data: Any, names: list[str]) -> str:
    if isinstance(data, dict):
        for name in names:
            value = data.get(name)
            if value:
                return str(value)
        for key in ["run", "workflowRun", "result", "data"]:
            if isinstance(data.get(key), dict):
                found = extract_handle(data[key], names)
                if found:
                    return found
    return ""


def register_run(args: argparse.Namespace, run_id: str, workflow_id: str, state: str, payload: Any) -> None:
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
            (run_id, workflow_id, state, stable_json(payload), utc_now()),
        )


def submit_command_for(plan_data: dict[str, Any], submission: dict[str, Any], output_dir: str | None) -> list[str]:
    workflow_id = str(plan_data["workflowId"])
    mode = str(plan_data["mode"])
    command = ["workflow", "agent-run" if mode == "agent" else "submit", "--workflow", workflow_id]
    if submission.get("selectionKind") == "none":
        command.append("--none")
    else:
        command.extend(["--items", json.dumps(submission.get("items") or [], ensure_ascii=False)])
    if mode == "host":
        workflow_options = plan_data.get("workflowOptions") or {}
        provider_profile = plan_data.get("providerProfile") or {}
        if workflow_options:
            command.extend(["--workflow-options", json.dumps(workflow_options, ensure_ascii=False)])
        if provider_profile:
            command.extend(["--provider-profile", json.dumps(provider_profile, ensure_ascii=False)])
    elif output_dir:
        command.extend(["--output-dir", output_dir])
    return command


def submit(args: argparse.Namespace) -> int:
    plan_data = read_json_arg(args.plan)
    if not isinstance(plan_data, dict) or plan_data.get("schema") != SCHEMA:
        raise ServiceError("invalid_plan", "plan must be produced by zotero_librarian_workflow_service.py plan")
    if args.concurrency > 1 and not args.confirm_concurrency:
        raise ServiceError(
            "concurrency_confirmation_required",
            "concurrency greater than 1 requires --confirm-concurrency",
            {"concurrency": args.concurrency},
        )
    submissions = [entry for entry in plan_data.get("submissions", []) if isinstance(entry, dict)]
    launch_count = min(max(1, args.concurrency), len(submissions))
    launched: list[dict[str, Any]] = []
    output_dir = str(args.output_dir or (state_dir() / "agent-runs"))
    if plan_data.get("mode") == "agent":
        Path(output_dir).mkdir(parents=True, exist_ok=True)
    for submission in submissions[:launch_count]:
        raw = call_bridge(args.bridge, submit_command_for(plan_data, submission, output_dir))
        data = unwrap_bridge_data(raw)
        if plan_data.get("mode") == "host":
            run_id = extract_handle(data, ["workflowRunId", "runId", "id"])
            if run_id:
                register_run(args, run_id, str(plan_data["workflowId"]), str(data.get("state") or "running"), data)
            launched.append({"index": submission.get("index"), "workflowRunId": run_id, "response": data})
        else:
            launched.append(
                {
                    "index": submission.get("index"),
                    "agentRunId": extract_handle(data, ["agentRunId", "id"]),
                    "download": data.get("download") if isinstance(data, dict) else None,
                    "response": data,
                }
            )
    result = {
        "schema": SCHEMA,
        "generatedAt": utc_now(),
        "workflowId": plan_data["workflowId"],
        "mode": plan_data["mode"],
        "launched": launched,
        "launchedCount": len(launched),
        "remainingSubmissions": max(0, len(submissions) - launch_count),
        "nextAction": "notification-sync" if plan_data.get("mode") == "host" else "complete-agent-handoff",
    }
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Zotero Librarian workflow helper")
    parser.add_argument("--db", help="SQLite database path")
    parser.add_argument("--bridge", default="zotero-bridge", help="zotero-bridge executable")
    sub = parser.add_subparsers(dest="command", required=True)

    parent = sub.add_parser("parent-selection")
    parent_group = parent.add_mutually_exclusive_group(required=True)
    parent_group.add_argument("--items")
    parent_group.add_argument("--from-context", action="store_true")
    parent.add_argument("--workflow")
    parent.set_defaults(func=parent_selection)

    readiness = sub.add_parser("readiness-plan")
    readiness.add_argument("--check", required=True, choices=["missing-pdf", "missing-markdown", "missing-analysis"])
    readiness.add_argument("--input", default="{}")
    readiness.add_argument("--workflow")
    readiness.add_argument("--batch-size", type=int, default=DEFAULT_BATCH_SIZE)
    readiness.set_defaults(func=readiness_plan)

    plan_parser = sub.add_parser("plan")
    plan_parser.add_argument("--workflow", required=True)
    plan_parser.add_argument("--mode", choices=["host", "agent"], required=True)
    group = plan_parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--items")
    group.add_argument("--from-context", action="store_true")
    group.add_argument("--none", action="store_true")
    plan_parser.add_argument("--workflow-options")
    plan_parser.add_argument("--provider-profile")
    plan_parser.set_defaults(func=plan)

    submit_parser = sub.add_parser("submit")
    submit_parser.add_argument("--plan", required=True)
    submit_parser.add_argument("--concurrency", type=int, default=1)
    submit_parser.add_argument("--confirm-concurrency", action="store_true")
    submit_parser.add_argument("--output-dir")
    submit_parser.set_defaults(func=submit)
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
