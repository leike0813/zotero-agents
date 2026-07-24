from __future__ import annotations

from copy import deepcopy
from pathlib import Path
from typing import Any

from stage_runtime import (
    ContractError,
    apply_metadata,
    apply_pdf,
    atomic_write_json,
    derive_stage,
    load_state,
    metadata_qualified_ids,
    project_ingest_payload,
    read_json,
    run_root_for_state,
    stable_hash,
)


SEARCH_LIMITS = {
    "metadata_queries": 3,
    "metadata_pages": 4,
    "pdf_queries": 4,
    "pdf_pages": 6,
}


def _contained(path: Path, root: Path, *, label: str) -> Path:
    resolved = path.resolve()
    try:
        resolved.relative_to(root.resolve())
    except ValueError as error:
        raise ContractError(
            "invalid_agent_batch_path",
            f"{label} must remain below the runner runtime directory",
        ) from error
    return resolved


def ordered_assignment_items(state: dict[str, Any]) -> list[tuple[str, dict[str, Any]]]:
    approved_order = {
        candidate_id: index
        for index, candidate_id in enumerate(state.get("approved_candidate_ids", []))
    }
    return sorted(
        state.get("agent_batches", {}).items(),
        key=lambda item: approved_order.get(
            item[1].get("candidate_id"), len(approved_order)
        ),
    )


def prepare_agent_batches(state_path: str | Path, input_path: str | Path) -> dict[str, Any]:
    state = load_state(state_path, input_path)
    if derive_stage(state) != "stage_40_delegated_research":
        raise ContractError(
            "invalid_stage_action", "Worker assignments are not ready to prepare"
        )
    if state.get("agent_batches_prepared"):
        return state

    runtime_root = run_root_for_state(state_path) / "runtime"
    assignment_root = runtime_root / "agent-batches"
    approved_ids = list(state.get("approved_candidate_ids", []))
    if not approved_ids:
        raise ContractError("invalid_state", "Approved ingest scope is empty")

    assignments: dict[str, Any] = {}
    for index, candidate_id in enumerate(approved_ids, start=1):
        assignment_id = f"paper-{index}"
        root = _contained(
            assignment_root / f"batch-{index:03d}",
            runtime_root,
            label="worker assignment directory",
        )
        result_path = _contained(root / "result.json", root, label="worker result path")
        review_path = _contained(
            runtime_root / "payloads" / f"research-review-{index:03d}.json",
            runtime_root,
            label="main-agent review path",
        )
        spec = {
            "assignment_id": assignment_id,
            "candidate": {
                "candidate_id": candidate_id,
                **deepcopy(state["candidates"][candidate_id]),
            },
            "search_limits": deepcopy(SEARCH_LIMITS),
            "result_path": result_path.as_posix(),
        }
        spec_path = root / "spec.json"
        atomic_write_json(spec_path, spec)
        assignments[assignment_id] = {
            "candidate_id": candidate_id,
            "spec_path": spec_path.resolve().as_posix(),
            "result_path": result_path.as_posix(),
            "review_path": review_path.as_posix(),
            "imported": False,
        }

    state["agent_batches_prepared"] = True
    state["agent_batches"] = assignments
    state["stage"] = derive_stage(state)
    atomic_write_json(state_path, state)
    return state


def _assemble_canonical_ingest_payloads(state: dict[str, Any], runtime_root: Path) -> None:
    collection = str(state.get("parameter", {}).get("targetCollection") or "").strip()
    prepared: dict[str, Any] = {}
    for index, candidate_id in enumerate(metadata_qualified_ids(state), start=1):
        ingest_payload = project_ingest_payload(
            state["metadata"][candidate_id],
            state["pdf"][candidate_id],
            collection,
        )
        target = _contained(
            runtime_root / "payloads" / f"ingest-paper-{index:03d}.json",
            runtime_root,
            label="canonical ingest payload",
        )
        atomic_write_json(target, ingest_payload)
        prepared[candidate_id] = {
            "payload_path": target.as_posix(),
            "payload_hash": stable_hash(ingest_payload),
        }
    state["prepared"] = prepared
    state["ingest_prepared"] = True


def admit_agent_review(
    state_path: str | Path,
    input_path: str | Path,
    review_path: str | Path,
) -> dict[str, Any]:
    state = load_state(state_path, input_path)
    batches = state.get("agent_batches", {})
    if not state.get("agent_batches_prepared") or not isinstance(batches, dict):
        raise ContractError("invalid_stage_action", "Worker assignments are not prepared")
    if any(not Path(entry["result_path"]).is_file() for entry in batches.values()):
        raise ContractError(
            "agent_batch_results_incomplete",
            "Every worker assignment must reach a terminal result before review",
        )

    pending = [
        entry
        for _assignment_id, entry in ordered_assignment_items(state)
        if not entry.get("imported")
    ]
    if not pending:
        return state
    entry = pending[0]
    expected_review = Path(entry["review_path"]).resolve()
    if Path(review_path).resolve() != expected_review:
        raise ContractError(
            "invalid_agent_batch_path",
            f"Main-agent review must use the gate-issued path: {expected_review}",
        )

    review = read_json(expected_review)
    if not isinstance(review, dict) or not set(review).issubset({"metadata", "pdf"}):
        raise ContractError("invalid_agent_batch", "Main-agent review is invalid")
    if "metadata" not in review:
        raise ContractError("invalid_agent_batch", "Main-agent review requires metadata")

    candidate_id = entry["candidate_id"]
    worker_state = {
        "approved_candidate_ids": [candidate_id],
        "candidates": {candidate_id: deepcopy(state["candidates"][candidate_id])},
        "metadata": {},
        "pdf": {},
    }
    apply_metadata(worker_state, review["metadata"], expected_review)
    metadata_entry = worker_state["metadata"][candidate_id]
    if metadata_entry["status"] == "qualified":
        if "pdf" not in review:
            raise ContractError(
                "invalid_agent_batch", "Qualified metadata requires a PDF review"
            )
        apply_pdf(worker_state, review["pdf"], expected_review)
    elif "pdf" in review:
        raise ContractError(
            "invalid_agent_batch", "Unresolved metadata must not submit a PDF review"
        )

    runtime_root = run_root_for_state(state_path) / "runtime"
    next_state = deepcopy(state)
    canonical_index = next_state["approved_candidate_ids"].index(candidate_id) + 1
    metadata_path = runtime_root / "payloads" / f"metadata-{canonical_index:03d}.json"
    atomic_write_json(metadata_path, review["metadata"])
    accepted_metadata = deepcopy(metadata_entry)
    accepted_metadata["payload_path"] = metadata_path.resolve().as_posix()
    next_state["metadata"][candidate_id] = accepted_metadata

    if metadata_entry["status"] == "qualified":
        pdf_path = runtime_root / "payloads" / f"pdf-probe-{canonical_index:03d}.json"
        atomic_write_json(pdf_path, review["pdf"])
        accepted_pdf = deepcopy(worker_state["pdf"][candidate_id])
        accepted_pdf["payload_path"] = pdf_path.resolve().as_posix()
        next_state["pdf"][candidate_id] = accepted_pdf

    next_state["agent_batches"][entry_key(next_state, entry)]["imported"] = True
    if all(batch.get("imported") for batch in next_state["agent_batches"].values()):
        _assemble_canonical_ingest_payloads(next_state, runtime_root)
    next_state["stage"] = derive_stage(next_state)
    atomic_write_json(state_path, next_state)
    return next_state


def entry_key(state: dict[str, Any], target: dict[str, Any]) -> str:
    for key, value in state["agent_batches"].items():
        if value.get("review_path") == target.get("review_path"):
            return key
    raise ContractError("invalid_agent_batch", "Worker assignment is missing from state")
