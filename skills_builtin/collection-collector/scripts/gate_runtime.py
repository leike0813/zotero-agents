from __future__ import annotations

import argparse
import json
import shlex
import sys
from pathlib import Path

from stage_runtime import (
    DB_RELATIVE_PATH,
    current_stage,
    initialize_db,
    next_assessment_packet,
    run_current_command_stage,
    run_root_from_db,
    submit_current_payload_stage,
)


def command_text(parts: list[str]) -> str:
    return " ".join(shlex.quote(part) for part in parts)


def base_parts(args: argparse.Namespace) -> list[str]:
    parts = [sys.executable, str(Path(__file__).resolve()), "--db", str(Path(args.db).resolve())]
    if args.input:
        parts.extend(["--input", str(Path(args.input).resolve())])
    return parts


def gate_state(args: argparse.Namespace) -> dict[str, object]:
    conn = initialize_db(args.db)
    try:
        stage = current_stage(conn)
        run_root = run_root_from_db(args.db)
        if stage == "completed":
            result_path = run_root / "collection-collector.result.json"
            return {
                "stage": "completed",
                "stage_kind": "terminal",
                "status": "completed",
                "needs_payload": False,
                "next_action": "return_final_output",
                "result_path": str(result_path.resolve()),
            }
        if stage in {
            "stage_00_runtime_setup",
            "stage_10_inventory_collect",
            "stage_30_candidate_prepare",
            "stage_50_render_result",
        }:
            return {
                "stage": stage,
                "stage_kind": "command",
                "status": "pending",
                "needs_payload": False,
                "next_action": "run_stage",
                "command": command_text([*base_parts(args), "--run-stage"]),
            }
        if stage == "stage_20_scope_plan":
            payload_path = run_root / "runtime/payloads/scope-plan.json"
            schema_path = (
                Path(__file__).resolve().parent.parent
                / "assets/schemas/scope-plan.schema.json"
            )
            required_reads = [
                run_root / "runtime/views/01-input.json",
                run_root / "runtime/views/02-topic-inventory.json",
                run_root / "runtime/views/03-inventory-summary.json",
            ]
        elif stage == "stage_40_paper_assessment":
            packet_id = next_assessment_packet(conn)
            payload_path = run_root / f"runtime/payloads/paper-assessment-{packet_id}.json"
            schema_path = (
                Path(__file__).resolve().parent.parent
                / "assets/schemas/paper-assessment.schema.json"
            )
            required_reads = [
                run_root / f"runtime/views/paper-assessment-{packet_id}.json"
            ]
        else:
            raise RuntimeError(f"unsupported gate stage: {stage}")
        return {
            "stage": stage,
            "stage_kind": "payload",
            "status": "pending",
            "needs_payload": True,
            "next_action": "submit_stage_payload",
            "required_reads": [str(path.resolve()) for path in required_reads],
            "payload_path": str(payload_path.resolve()),
            "payload_schema": str(schema_path.resolve()),
            "submit_command": command_text(
                [
                    *base_parts(args),
                    "--submit-stage-payload",
                    str(payload_path.resolve()),
                ]
            ),
        }
    finally:
        conn.close()


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--db", default=str(DB_RELATIVE_PATH))
    parser.add_argument("--input")
    parser.add_argument("--run-stage", action="store_true")
    parser.add_argument("--submit-stage-payload")
    args = parser.parse_args()
    try:
        if args.run_stage:
            result = run_current_command_stage(args.db, args.input)
        elif args.submit_stage_payload:
            result = submit_current_payload_stage(
                args.db, args.submit_stage_payload
            )
        else:
            result = gate_state(args)
        print(json.dumps(result, ensure_ascii=False, indent=2))
        return 0
    except Exception as error:
        print(
            json.dumps(
                {
                    "kind": "collection_collector_runtime_failed",
                    "error": str(error),
                },
                ensure_ascii=False,
                indent=2,
            ),
            file=sys.stderr,
        )
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
