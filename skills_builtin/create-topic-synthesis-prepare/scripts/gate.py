from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from topic_synthesis_db import (
    build_current_instruction,
    infer_skill_id,
    run_current_command_stage,
    submit_current_payload_stage,
)


def _configure_stdio() -> None:
    for stream_name in ("stdout", "stderr"):
        stream = getattr(sys, stream_name, None)
        reconfigure = getattr(stream, "reconfigure", None)
        if callable(reconfigure):
            reconfigure(encoding="utf-8")


def _print_json(value: dict) -> None:
    print(json.dumps(value, ensure_ascii=False, sort_keys=True))


def main() -> int:
    _configure_stdio()

    parser = argparse.ArgumentParser(
        description="Topic synthesis generated package gate/runtime entrypoint."
    )
    parser.add_argument("--db", required=True, help="Run-local SQLite path.")
    parser.add_argument("--input", help="Initial workflow input JSON path.")
    parser.add_argument("--payload", help="Stage payload JSON path.")
    parser.add_argument(
        "--action",
        default="gate",
        choices=["gate", "run", "submit", "cancel", "audit"],
        help="Gate action. Omit for the next instruction.",
    )
    args = parser.parse_args()

    skill_root = Path(__file__).resolve().parents[1]
    skill_id = infer_skill_id(skill_root)

    try:
        if args.action == "gate":
            _print_json(
                build_current_instruction(
                    skill_root=skill_root,
                    db_path=args.db,
                    input_path=args.input,
                )
            )
            return 0
        if args.action == "run":
            _print_json(
                run_current_command_stage(
                    skill_root=skill_root,
                    db_path=args.db,
                    input_path=args.input,
                )
            )
            return 0
        if args.action == "submit":
            if not args.payload:
                raise ValueError("--payload is required for --action submit")
            _print_json(
                submit_current_payload_stage(
                    skill_root=skill_root,
                    db_path=args.db,
                    payload_path=args.payload,
                    input_path=args.input,
                )
            )
            return 0
        if args.action == "cancel":
            _print_json(
                {
                    "__SKILL_DONE__": True,
                    "kind": "topic_synthesis_canceled",
                    "status": "canceled",
                    "reason": "user_cancelled",
                    "message": "Topic synthesis was canceled.",
                    "skill_id": skill_id,
                }
            )
            return 0
        if args.action == "audit":
            _print_json(
                build_current_instruction(
                    skill_root=skill_root,
                    db_path=args.db,
                    input_path=args.input,
                    audit=True,
                )
            )
            return 0
        raise AssertionError(f"unsupported action: {args.action}")
    except Exception as error:
        _print_json(
            {
                "error": {
                    "code": "topic_synthesis_gate_failed",
                    "message": str(error),
                },
                "skill_id": skill_id,
                "db_path": args.db,
            }
        )
        return 2


if __name__ == "__main__":
    sys.exit(main())
