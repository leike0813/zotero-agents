from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from stage_runtime import (
    ExternalActionRequired,
    connect,
    current_stage,
    get_meta,
    next_assessment_packet,
    run_current_command_stage,
    run_root_from_db,
    submit_current_payload_stage,
)


STAGE_CONTRACT = {
    "stage_00_runtime_setup": {
        "kind": "command",
        "task": "Normalize workflow input, initialize SQLite, and verify Host Bridge access.",
    },
    "stage_10_intent_query_plan": {
        "kind": "payload",
        "task": "Derive research dimensions and 2-8 precise Zotero library queries from the manuscript intent.",
        "payload": "runtime/payloads/intent-query-plan.json",
        "schema": "assets/schemas/stage-10-intent-query-plan.schema.json",
        "required_reads": [],
    },
    "stage_20_discovery_collect": {
        "kind": "command",
        "task": "Page through Topic inventory and execute the submitted bounded library queries.",
    },
    "stage_30_topic_assessment": {
        "kind": "payload",
        "task": "Select only existing relevant Topics, bounded by maxTopics; an empty list is valid.",
        "payload": "runtime/payloads/topic-assessment.json",
        "schema": "assets/schemas/stage-30-topic-assessment.schema.json",
        "required_reads": ["runtime/views/03-topic-candidates.json", "runtime/views/04-library-search-candidates.json"],
    },
    "stage_40_evidence_prepare": {
        "kind": "command",
        "task": "Collect Topic review inputs, graph neighbors, reference diagnostics, digests, and assessment packets.",
    },
    "stage_50_paper_assessment": {
        "kind": "payload",
        "task": "Assess every paper in the current packet semantically; do not assign graph values, scores, or roles.",
        "payload": "runtime/payloads/paper-assessment.json",
        "schema": "assets/schemas/stage-50-paper-assessment.schema.json",
        "required_reads": [],
    },
    "stage_60_enrich_and_select": {
        "kind": "command",
        "task": "Read graph metrics and material readiness, calculate scores, and assign related/core roles deterministically.",
    },
    "stage_70_render_result": {
        "kind": "command",
        "task": "Render and validate the selection, audit, artifact manifest, and business result from SQLite.",
    },
}


def json_print(value: dict) -> None:
    print(json.dumps(value, ensure_ascii=False, sort_keys=True))


def script_command(
    db_path: str,
    input_path: str | None,
    action: str,
    payload_path: str = "",
) -> str:
    script = Path(__file__).resolve()
    parts = [f'python "{script.as_posix()}"', f'--db "{Path(db_path).resolve().as_posix()}"']
    if input_path:
        parts.append(f'--input "{Path(input_path).resolve().as_posix()}"')
    parts.append(f"--action {action}")
    if payload_path:
        parts.append(f'--payload "{Path(payload_path).resolve().as_posix()}"')
    return " ".join(parts)


def instruction(db_path: str, input_path: str | None) -> dict:
    db = Path(db_path).resolve()
    run_root = run_root_from_db(db)
    if not db.exists():
        stage = "stage_00_runtime_setup"
        final_output = None
        pending_delivery = {}
    else:
        conn = connect(db)
        try:
            stage = current_stage(conn)
            final_output = get_meta(conn, "final_output", None)
            pending_delivery = get_meta(conn, "pending_delivery", {})
            packet_path = next_assessment_packet(conn) if stage == "stage_50_paper_assessment" else ""
        finally:
            conn.close()
    base = {
        "schema_id": "research_bundle.gate_instruction",
        "schema_version": "1.0.0",
        "db_path": db.as_posix(),
        "resume_packet": (run_root / "runtime/views/01-resume.md").as_posix(),
        "discipline": "Execute only this gate instruction, write payloads only at payload_path, and rerun gate after every successful command.",
    }
    if stage == "completed":
        return {
            **base,
            "stage": "completed",
            "status": "completed",
            "needs_payload": False,
            "next_action": "return_final_output",
            "output": final_output,
        }
    contract = STAGE_CONTRACT[stage]
    if pending_delivery and stage == "stage_40_evidence_prepare":
        return {
            **base,
            "stage": stage,
            "stage_kind": "command",
            "status": "external_action_required",
            "needs_payload": False,
            "next_action": "complete_bridge_download",
            "task": pending_delivery.get("message"),
            "required_reads": [pending_delivery.get("delivery_path")],
            "blockers": [pending_delivery],
            "command": script_command(str(db), input_path, "run"),
        }
    result = {
        **base,
        "stage": stage,
        "stage_kind": contract["kind"],
        "status": "ready",
        "needs_payload": contract["kind"] == "payload",
        "next_action": "submit_stage_payload" if contract["kind"] == "payload" else "run_stage",
        "task": contract["task"],
        "blockers": [],
    }
    if contract["kind"] == "command":
        result["command"] = script_command(str(db), input_path, "run")
    else:
        relative_payload = contract["payload"]
        if stage == "stage_50_paper_assessment" and packet_path:
            batch_id = Path(packet_path).stem
            relative_payload = f"runtime/payloads/paper-assessment-{batch_id}.json"
            result["required_reads"] = [packet_path]
        else:
            result["required_reads"] = [
                (run_root / value).resolve().as_posix()
                for value in contract.get("required_reads", [])
            ]
        payload_path = (run_root / relative_payload).resolve().as_posix()
        result["payload_path"] = payload_path
        result["payload_schema"] = (
            Path(__file__).resolve().parents[1] / contract["schema"]
        ).resolve().as_posix()
        result["submit_command"] = script_command(str(db), input_path, "submit", payload_path)
    return result


def main() -> int:
    for stream_name in ["stdout", "stderr"]:
        stream = getattr(sys, stream_name, None)
        if hasattr(stream, "reconfigure"):
            stream.reconfigure(encoding="utf-8")
    parser = argparse.ArgumentParser(description="Export Research Bundle SQLite gate")
    parser.add_argument("--db", required=True)
    parser.add_argument("--input")
    parser.add_argument("--payload")
    parser.add_argument("--action", choices=["gate", "run", "submit"], default="gate")
    args = parser.parse_args()
    try:
        if args.action == "gate":
            json_print(instruction(args.db, args.input))
        elif args.action == "run":
            json_print(run_current_command_stage(args.db, args.input))
        else:
            if not args.payload:
                raise ValueError("--payload is required for --action submit")
            json_print(submit_current_payload_stage(args.db, args.payload, args.input))
        return 0
    except ExternalActionRequired as exc:
        json_print({"error": {"code": "external_action_required", "message": str(exc)}, "gate": instruction(args.db, args.input)})
        return 3
    except Exception as exc:  # noqa: BLE001
        json_print({"error": {"code": "research_bundle_runtime_failed", "message": str(exc)}, "db_path": Path(args.db).resolve().as_posix()})
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
