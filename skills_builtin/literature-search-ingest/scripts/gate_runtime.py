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
    record_ingest_receipt,
    run_root_for_state,
    terminal_artifacts,
    validated_prepared_payload,
)
from batch_runtime import (
    admit_agent_review,
    ordered_assignment_items,
    prepare_agent_batches,
)


REFERENCE_BY_STAGE = {
    "stage_10_search_plan": ["search-planning-and-discovery.md"],
    "stage_20_discovery": ["search-planning-and-discovery.md"],
    "stage_30_ingest_scope": ["search-planning-and-discovery.md"],
    "stage_40_delegated_research": [
        "metadata-resolution.md",
        "pdf-probe.md",
        "ingest-output-recovery.md",
    ],
    "stage_70_ingest": ["ingest-output-recovery.md"],
    "completed": ["ingest-output-recovery.md"],
}

ALLOWED_ACTIONS_BY_STAGE = {
    "stage_10_search_plan": ["approve_search_plan", "cancel_workflow"],
    "stage_20_discovery": ["record_discovery"],
    "stage_30_ingest_scope": [
        "approve_ingest_scope",
        "request_discovery_expansion",
        "cancel_workflow",
    ],
    "stage_40_delegated_research": [
        "prepare_agent_batches",
        "delegate_agent_research",
        "review_agent_result",
    ],
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


def reference_paths(stage: str) -> list[str]:
    reference_root = Path(__file__).resolve().parent.parent / "references"
    return [
        reference_root.joinpath(filename).as_posix()
        for filename in REFERENCE_BY_STAGE[stage]
    ]


def action_schema() -> str:
    return (
        Path(__file__)
        .resolve()
        .parent.parent.joinpath("assets", "runtime-action.schema.json")
        .as_posix()
    )


def schema_document() -> dict:
    return json.loads(Path(action_schema()).read_text(encoding="utf-8"))


def resolve_schema_ref(document: dict, schema_ref: str) -> dict:
    fragment = schema_ref.split("#", 1)[-1]
    value: object = document
    for part in fragment.lstrip("/").split("/"):
        if not part:
            continue
        if not isinstance(value, dict) or part not in value:
            raise ContractError("invalid_schema", f"Unknown schema ref {schema_ref}")
        value = value[part]
    if not isinstance(value, dict):
        raise ContractError(
            "invalid_schema", f"Schema ref {schema_ref} is not an object"
        )
    return value


def example_for_schema(document: dict, schema: dict) -> dict:
    examples = schema.get("examples")
    if isinstance(examples, list) and examples and isinstance(examples[0], dict):
        return examples[0]
    schema_ref = schema.get("$ref")
    if isinstance(schema_ref, str):
        return example_for_schema(document, resolve_schema_ref(document, schema_ref))
    for keyword in ("oneOf", "anyOf"):
        branches = schema.get(keyword)
        if isinstance(branches, list):
            for branch in branches:
                if isinstance(branch, dict):
                    example = example_for_schema(document, branch)
                    if example:
                        return example
    return {}


def enums_for_schema(
    document: dict,
    schema: dict,
    *,
    prefix: str = "",
    seen: set[str] | None = None,
) -> dict[str, list[object]]:
    seen = seen or set()
    schema_ref = schema.get("$ref")
    if isinstance(schema_ref, str):
        if schema_ref in seen:
            return {}
        seen.add(schema_ref)
        return enums_for_schema(
            document,
            resolve_schema_ref(document, schema_ref),
            prefix=prefix,
            seen=seen,
        )
    result: dict[str, list[object]] = {}
    if isinstance(schema.get("enum"), list):
        result[prefix or "$"] = list(schema["enum"])
    elif "const" in schema:
        result[prefix or "$"] = [schema["const"]]
    properties = schema.get("properties")
    if isinstance(properties, dict):
        for name, child in properties.items():
            if isinstance(child, dict):
                child_prefix = f"{prefix}.{name}" if prefix else name
                result.update(
                    enums_for_schema(
                        document,
                        child,
                        prefix=child_prefix,
                        seen=set(seen),
                    )
                )
    items = schema.get("items")
    if isinstance(items, dict):
        result.update(
            enums_for_schema(
                document,
                items,
                prefix=f"{prefix}[]" if prefix else "[]",
                seen=set(seen),
            )
        )
    for keyword in ("oneOf", "anyOf", "allOf"):
        branches = schema.get(keyword)
        if isinstance(branches, list):
            for branch in branches:
                if isinstance(branch, dict):
                    result.update(
                        enums_for_schema(
                            document,
                            branch,
                            prefix=prefix,
                            seen=set(seen),
                        )
                    )
    return result


def payload_contract(definition: str) -> dict:
    document = schema_document()
    fragment = f"#/$defs/{definition}"
    schema = resolve_schema_ref(document, fragment)
    return {
        "payload_schema_ref": f"{action_schema()}{fragment}",
        "payload_template": example_for_schema(document, schema),
        "payload_enums": enums_for_schema(document, schema),
    }


def submit_command(state_path: str, input_path: str, target: Path) -> str:
    return command_text(
        [
            *base_command(state_path, input_path),
            "--submit-stage-payload",
            target.resolve(),
        ]
    )


def prepare_agent_batches_command(state_path: str, input_path: str) -> str:
    return command_text([*base_command(state_path, input_path), "--prepare-agent-batches"])


def submit_agent_review_command(
    state_path: str,
    input_path: str,
    review_path: str | Path,
) -> str:
    return command_text(
        [*base_command(state_path, input_path), "--submit-agent-review", review_path]
    )


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
        "required_reads": reference_paths(stage),
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
    schema_definition: str,
    payload_variants: dict[str, str] | None = None,
) -> dict:
    target = payload_path(state_path, name)
    gate = {
        **base_gate(state_path, input_path, state),
        "stage": stage,
        "next_action": "await_user_input"
        if interaction is not None
        else "submit_stage_payload",
        "required_reads": reference_paths(stage),
        "payload_path": target.as_posix(),
        "payload_schema": action_schema(),
        "submit_command": submit_command(state_path, input_path, target),
        **payload_contract(schema_definition),
    }
    if payload_variants:
        gate["payload_variants"] = {
            name: payload_contract(definition)
            for name, definition in payload_variants.items()
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
            schema_definition="searchPlanApprovePayload",
            payload_variants={
                "approve": "searchPlanApprovePayload",
                "cancel": "searchPlanCancelPayload",
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
            schema_definition="discoveryPayload",
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
            schema_definition="scopeApprovePayload",
            payload_variants={
                "approve": "scopeApprovePayload",
                "expand": "scopeExpandPayload",
                "cancel": "scopeCancelPayload",
            },
        )
    if stage == "stage_40_delegated_research":
        if not state.get("agent_batches_prepared"):
            return {
                **base_gate(state_path, input_path, state),
                "next_action": "prepare_agent_batches",
                "required_reads": reference_paths(stage),
                "command": prepare_agent_batches_command(state_path, input_path),
            }
        batches = state.get("agent_batches", {})
        ordered_assignments = ordered_assignment_items(state)
        pending = [
            (assignment_id, entry)
            for assignment_id, entry in ordered_assignments
            if not entry.get("imported")
        ]
        if not pending:
            return blocked_gate(
                state_path,
                input_path=input_path,
                state=state,
                code="invalid_agent_batch",
                message="All agent batches are imported but Stage 70 is not ready",
            )
        result_ready = [
            (batch_id, entry)
            for batch_id, entry in pending
            if Path(entry["result_path"]).is_file()
        ]
        result_missing = [
            (batch_id, entry)
            for batch_id, entry in pending
            if not Path(entry["result_path"]).is_file()
        ]
        batch_statuses = [
            {
                "assignment_id": batch_id,
                "status": (
                    "reviewed"
                    if entry.get("imported")
                    else "result_ready"
                    if Path(entry["result_path"]).is_file()
                    else "result_missing"
                ),
                "result_path": entry["result_path"],
            }
            for batch_id, entry in ordered_assignments
        ]
        if result_missing:
            assignments = [
                {
                    "assignment_id": batch_id,
                    "worker_spec_path": entry["spec_path"],
                    "status": "result_missing",
                }
                for batch_id, entry in result_missing
            ]
            return {
                **base_gate(state_path, input_path, state),
                "next_action": "delegate_agent_research",
                "required_reads": reference_paths(stage),
                "dispatch_plan": {
                    "mode": "parallel",
                    "dispatch_all_before_wait": True,
                    "expected_batch_count": len(batches),
                    "assignments": assignments,
                },
                "result_ready_assignment_ids": [
                    batch_id for batch_id, _entry in result_ready
                ],
                "batch_statuses": batch_statuses,
            }
        next_assignment_id, next_assignment = result_ready[0]
        review_path = Path(next_assignment["review_path"])
        schema_ref = f"{action_schema()}#/$defs/researchReviewPayload"
        schema = resolve_schema_ref(schema_document(), schema_ref)
        return {
            **base_gate(state_path, input_path, state),
            "next_action": "review_agent_result",
            "required_reads": reference_paths(stage),
            "assignment_id": next_assignment_id,
            "batch_statuses": batch_statuses,
            "raw_result_path": next_assignment["result_path"],
            "payload_path": review_path.as_posix(),
            "payload_schema_ref": schema_ref,
            "payload_template": example_for_schema(schema_document(), schema),
            "submit_command": submit_agent_review_command(
                state_path,
                input_path,
                review_path,
            ),
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
            "required_reads": reference_paths(stage),
            "candidate_id": candidate_id,
            "ingest_payload_path": prepared["payload_path"],
            "ingest_payload_hash": prepared["payload_hash"],
            "receipt_path": receipt_path.as_posix(),
            "receipt_contract": {
                "success": "<exact Zotero Bridge JSON response>",
                "fatal": {
                    "failure": "host_unavailable",
                    "message": "<why the mutation could not start>",
                },
            },
            "command": mutation,
            "submit_command": receipt_submit_command(
                state_path,
                input_path,
                receipt_path,
            ),
        }
    _, final_output = terminal_artifacts(state_path, input_path)
    terminal_cancellation = state.get("cancellation", {})
    terminal = {
        **base_gate(state_path, input_path, state),
        "stage": "completed",
        "status": state.get("status", "completed"),
        "kind": terminal_kind(state),
        "next_action": "return_final_output",
        "required_reads": reference_paths("completed"),
        "terminal": {
            "kind": terminal_kind(state),
            "status": state.get("status", "completed"),
            "cancellation": terminal_cancellation,
        },
        "search_ledger_path": (
            run_root_for_state(state_path) / "result" / "search-ledger.json"
        ).as_posix(),
        "final_output": final_output,
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
    parser.add_argument("--submit-agent-review")
    parser.add_argument("--submit-ingest-receipt")
    parser.add_argument("--prepare-agent-batches", action="store_true")
    args = parser.parse_args()
    try:
        selected = sum(
            bool(value)
            for value in (
                args.submit_stage_payload,
                args.submit_agent_review,
                args.submit_ingest_receipt,
                args.prepare_agent_batches,
            )
        )
        if selected > 1:
            raise ContractError("invalid_command", "Choose exactly one gate action")
        if args.submit_stage_payload:
            apply_stage_payload(args.state, args.input, args.submit_stage_payload)
        elif args.submit_agent_review:
            admit_agent_review(args.state, args.input, args.submit_agent_review)
        elif args.submit_ingest_receipt:
            record_ingest_receipt(args.state, args.input, args.submit_ingest_receipt)
        elif args.prepare_agent_batches:
            prepare_agent_batches(args.state, args.input)
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
