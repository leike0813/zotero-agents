from __future__ import annotations

import argparse
import json
from pathlib import Path
import shlex
import sys

from stage_runtime import (
    ContractError,
    apply_stage_payload,
    derive_stage,
    load_state,
    pending_ingest_candidate,
    pending_metadata_candidate,
    pending_pdf_candidate,
    prepare_ingest_payloads,
    record_ingest_receipt,
    run_root_for_state,
    validated_prepared_payload,
)


REFERENCE_BY_STAGE = {
    "stage_10_search_plan": "search-planning-and-discovery.md",
    "stage_20_discovery": "search-planning-and-discovery.md",
    "stage_30_ingest_scope": "search-planning-and-discovery.md",
    "stage_40_metadata_resolution": "metadata-resolution.md",
    "stage_50_pdf_probe": "pdf-probe.md",
    "stage_60_ingest_prepare": "ingest-output-recovery.md",
    "stage_70_ingest": "ingest-output-recovery.md",
    "completed": "ingest-output-recovery.md",
}

ALLOWED_ACTIONS_BY_STAGE = {
    "stage_10_search_plan": ["approve_search_plan", "cancel_workflow"],
    "stage_20_discovery": ["record_discovery"],
    "stage_30_ingest_scope": [
        "approve_ingest_scope",
        "request_discovery_expansion",
        "cancel_workflow",
    ],
    "stage_40_metadata_resolution": ["record_metadata"],
    "stage_50_pdf_probe": ["record_pdf_probe"],
    "stage_60_ingest_prepare": ["run_stage"],
    "stage_70_ingest": ["execute_ingest", "record_ingest_receipt"],
    "completed": ["return_final_output"],
}


def payload_path(state_path: str, name: str) -> Path:
    return run_root_for_state(state_path) / "runtime" / "payloads" / f"{name}.json"


def command_text(parts: list[str | Path]) -> str:
    return " ".join(shlex.quote(str(part)) for part in parts)


def base_command(state_path: str, input_path: str) -> list[str | Path]:
    return [
        sys.executable,
        Path(__file__).resolve(),
        "--state",
        Path(state_path).resolve(),
        "--input",
        Path(input_path).resolve(),
    ]


def gate_command(state_path: str, input_path: str) -> str:
    return command_text(base_command(state_path, input_path))


def reference_path(stage: str) -> str:
    filename = REFERENCE_BY_STAGE[stage]
    return (
        Path(__file__)
        .resolve()
        .parent.parent.joinpath("references", filename)
        .as_posix()
    )


def action_schema() -> str:
    return (
        Path(__file__)
        .resolve()
        .parent.parent.joinpath("assets", "runtime-action.schema.json")
        .as_posix()
    )


def submit_command(state_path: str, input_path: str, target: Path) -> str:
    return command_text(
        [
            *base_command(state_path, input_path),
            "--submit-stage-payload",
            target.resolve(),
        ]
    )


def run_stage_command(state_path: str, input_path: str) -> str:
    return command_text([*base_command(state_path, input_path), "--run-stage"])


def receipt_submit_command(
    state_path: str,
    input_path: str,
    receipt_path: Path,
) -> str:
    return command_text(
        [
            *base_command(state_path, input_path),
            "--submit-ingest-receipt",
            receipt_path.resolve(),
        ]
    )


def terminal_kind(state: dict) -> str:
    if state.get("status") == "canceled":
        return "literature_search_ingest_canceled"
    return "literature_search_ingest"


def base_gate(state_path: str, input_path: str, state: dict) -> dict:
    stage = derive_stage(state)
    candidates = state.get("candidates", {})
    return {
        "state_path": Path(state_path).resolve().as_posix(),
        "status": state.get("status", "running"),
        "kind": terminal_kind(state) if stage == "completed" else "",
        "stage": stage,
        "next_action": "",
        "allowed_actions": ALLOWED_ACTIONS_BY_STAGE.get(stage, []),
        "discovery_round": state.get("discovery_round", 1),
        "required_reads": [reference_path(stage)],
        "blockers": [],
        "initial_gate_command": gate_command(state_path, input_path),
        "resume_packet": {
            "search_plan_approved": bool(state.get("search_plan_approved")),
            "discovery_round": state.get("discovery_round", 1),
            "completed_discovery_rounds": [
                entry.get("discovery_round")
                for entry in state.get("discovery_rounds", [])
                if isinstance(entry, dict)
            ],
            "candidate_ids": list(candidates),
            "approved_candidate_ids": state.get("approved_candidate_ids", []),
            "metadata_completed_ids": list(state.get("metadata", {})),
            "pdf_completed_ids": list(state.get("pdf", {})),
            "prepared_candidate_ids": list(state.get("prepared", {})),
            "receipt_candidate_ids": list(state.get("receipts", {})),
            "cancellation": state.get("cancellation", {}),
        },
    }


def payload_gate(
    state_path: str,
    input_path: str,
    state: dict,
    *,
    stage: str,
    name: str,
    interaction: dict | None = None,
    candidate_id: str = "",
) -> dict:
    target = payload_path(state_path, name)
    gate = {
        **base_gate(state_path, input_path, state),
        "stage": stage,
        "next_action": "await_user_input"
        if interaction is not None
        else "submit_stage_payload",
        "required_reads": [reference_path(stage)],
        "payload_path": target.as_posix(),
        "payload_schema": action_schema(),
        "submit_command": submit_command(state_path, input_path, target),
    }
    if interaction is not None:
        gate["interaction"] = interaction
    if candidate_id:
        gate["candidate_id"] = candidate_id
    return gate


def blocked_gate(
    state_path: str,
    *,
    code: str,
    message: str,
    state: dict | None = None,
    input_path: str = "",
) -> dict:
    if state is None:
        return {
            "state_path": Path(state_path).resolve().as_posix(),
            "status": "blocked",
            "kind": "",
            "stage": "blocked",
            "next_action": "blocked",
            "allowed_actions": [],
            "discovery_round": 0,
            "required_reads": [],
            "blockers": [{"code": code, "message": message}],
            "initial_gate_command": "",
            "resume_packet": {},
        }
    return {
        **base_gate(state_path, input_path, state),
        "status": "blocked",
        "next_action": "blocked",
        "allowed_actions": [],
        "blockers": [{"code": code, "message": message}],
    }


def build_gate(state_path: str, input_path: str) -> dict:
    try:
        state = load_state(state_path, input_path)
        stage = derive_stage(state)
    except ContractError as error:
        return blocked_gate(
            state_path,
            code="invalid_state",
            message=str(error),
        )
    if stage == "stage_10_search_plan":
        return payload_gate(
            state_path,
            input_path,
            state,
            stage=stage,
            name="search-plan-decision",
            interaction={
                "kind": "search_plan_decision",
                "decision": "approve_or_cancel",
                "external_discovery_allowed": False,
            },
        )
    if stage == "stage_20_discovery":
        discovery_round = state["discovery_round"]
        return payload_gate(
            state_path,
            input_path,
            state,
            stage=stage,
            name=f"discovery-round-{discovery_round:03d}",
        )
    if stage == "stage_30_ingest_scope":
        discovery_round = state["discovery_round"]
        return payload_gate(
            state_path,
            input_path,
            state,
            stage=stage,
            name=f"ingest-scope-decision-round-{discovery_round:03d}",
            interaction={
                "kind": "ingest_scope_decision",
                "decision": "approve_expand_or_cancel",
                "automatic_after_approval": True,
            },
        )
    if stage == "stage_40_metadata_resolution":
        candidate_id = pending_metadata_candidate(state)
        return payload_gate(
            state_path,
            input_path,
            state,
            stage=stage,
            name=f"metadata-{len(state.get('metadata', {})) + 1:03d}",
            candidate_id=candidate_id,
        )
    if stage == "stage_50_pdf_probe":
        candidate_id = pending_pdf_candidate(state)
        gate = payload_gate(
            state_path,
            input_path,
            state,
            stage=stage,
            name=f"pdf-probe-{len(state.get('pdf', {})) + 1:03d}",
            candidate_id=candidate_id,
        )
        gate["required_pdf_routes"] = state["metadata"][candidate_id][
            "required_pdf_routes"
        ]
        return gate
    if stage == "stage_60_ingest_prepare":
        return {
            **base_gate(state_path, input_path, state),
            "next_action": "run_stage",
            "required_reads": [reference_path(stage)],
            "command": run_stage_command(state_path, input_path),
        }
    if stage == "stage_70_ingest":
        candidate_id = pending_ingest_candidate(state)
        prepared = state["prepared"][candidate_id]
        try:
            validated_prepared_payload(state, candidate_id)
        except ContractError as error:
            return blocked_gate(
                state_path,
                input_path=input_path,
                state=state,
                code=error.code,
                message=str(error),
            )
        receipt_path = (
            run_root_for_state(state_path)
            / "runtime"
            / "host"
            / f"ingest-{len(state.get('receipts', {})) + 1:03d}.json"
        )
        mutation = command_text(
            [
                "zotero-bridge",
                "mutation",
                "literature-ingest",
                "--input",
                f"@{prepared['payload_path']}",
            ]
        )
        return {
            **base_gate(state_path, input_path, state),
            "next_action": "execute_ingest",
            "required_reads": [reference_path(stage)],
            "candidate_id": candidate_id,
            "ingest_payload_path": prepared["payload_path"],
            "ingest_payload_hash": prepared["payload_hash"],
            "receipt_path": receipt_path.as_posix(),
            "receipt_contract": {
                "candidate_id": candidate_id,
                "ingest_payload_hash": prepared["payload_hash"],
                "host_response": "<exact Zotero Bridge JSON response>",
            },
            "command": mutation,
            "submit_command": receipt_submit_command(
                state_path,
                input_path,
                receipt_path,
            ),
        }
    terminal_cancellation = state.get("cancellation", {})
    terminal = {
        **base_gate(state_path, input_path, state),
        "stage": "completed",
        "status": state.get("status", "completed"),
        "kind": terminal_kind(state),
        "next_action": "return_final_output",
        "required_reads": [reference_path("completed")],
        "terminal": {
            "kind": terminal_kind(state),
            "status": state.get("status", "completed"),
            "cancellation": terminal_cancellation,
        },
    }
    if state.get("status") == "canceled":
        terminal["reason"] = terminal_cancellation.get("reason", "")
        terminal["message"] = terminal_cancellation.get("message", "")
    return terminal


def emit(value: dict, status: int = 0) -> None:
    print(json.dumps(value, ensure_ascii=False, sort_keys=True))
    raise SystemExit(status)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--state", required=True)
    parser.add_argument("--input", required=True)
    parser.add_argument("--submit-stage-payload")
    parser.add_argument("--submit-ingest-receipt")
    parser.add_argument("--run-stage", action="store_true")
    args = parser.parse_args()
    try:
        selected = sum(
            bool(value)
            for value in (
                args.submit_stage_payload,
                args.submit_ingest_receipt,
                args.run_stage,
            )
        )
        if selected > 1:
            raise ContractError("invalid_command", "Choose exactly one gate action")
        if args.submit_stage_payload:
            apply_stage_payload(args.state, args.input, args.submit_stage_payload)
        elif args.submit_ingest_receipt:
            record_ingest_receipt(args.state, args.input, args.submit_ingest_receipt)
        elif args.run_stage:
            prepare_ingest_payloads(args.state, args.input)
        emit(build_gate(args.state, args.input))
    except ContractError as error:
        emit(
            {
                "status": "failed",
                "error": {"code": error.code, "message": str(error)},
            },
            1,
        )
    except Exception as error:
        emit(
            {
                "status": "failed",
                "error": {"code": "runtime_error", "message": str(error)},
            },
            1,
        )


if __name__ == "__main__":
    main()
