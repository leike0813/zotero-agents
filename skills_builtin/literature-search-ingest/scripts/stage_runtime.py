from __future__ import annotations

from copy import deepcopy
import hashlib
import json
from pathlib import Path
import re
import tempfile
import unicodedata
from typing import Any


SEARCH_MODES = {
    "guided",
    "topic_expansion",
    "paper_seed_expansion",
    "targeted_ingest",
}
QUERY_LANES = {"core", "multilingual", "seed", "gap"}
DISCOVERY_ATTEMPT_STATUSES = {"completed", "unavailable", "error"}
CANDIDATE_TIERS = {"ready", "needs_curation", "lead_only"}
PDF_ROUTE_ORDER = [
    "authoritative_landing",
    "open_access",
    "web_search",
]
PDF_TERMINAL_STATUSES = {
    "found",
    "not_found",
    "restricted",
    "unavailable",
    "mismatch",
    "error",
}
METADATA_NOT_ATTEMPTED_REASONS = {
    "identity_not_verified",
    "material_conflict_unresolved",
    "authoritative_metadata_unavailable",
    "tool_unavailable",
}
FATAL_INGEST_REASONS = {
    "host_unavailable",
    "approval_denied",
    "execution_blocked",
}
INGEST_STATUSES = {"created", "existing", "failed"}
IDENTIFIER_ORDER = ["doi", "pmid", "arxiv", "isbn"]


class ContractError(RuntimeError):
    def __init__(self, code: str, message: str):
        super().__init__(message)
        self.code = code


def canonical_json(value: Any) -> str:
    return json.dumps(
        value,
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":"),
    )


def stable_hash(value: Any) -> str:
    return f"sha256:{hashlib.sha256(canonical_json(value).encode()).hexdigest()}"


def read_json(path: str | Path) -> Any:
    target = Path(path)
    try:
        return json.loads(target.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        raise ContractError(
            "invalid_json", f"Cannot read JSON {target}: {error}"
        ) from error


def atomic_write_json(path: str | Path, value: Any) -> None:
    target = Path(path)
    target.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(
        "w",
        encoding="utf-8",
        dir=target.parent,
        delete=False,
    ) as stream:
        stream.write(json.dumps(value, ensure_ascii=False, indent=2, sort_keys=True))
        stream.write("\n")
        temporary = Path(stream.name)
    temporary.replace(target)


def run_root_for_state(state_path: str | Path) -> Path:
    state = Path(state_path).resolve()
    if state.parent.name != "runtime":
        raise ContractError(
            "invalid_state_path",
            "Gate state must be stored directly under the runner runtime directory",
        )
    return state.parent.parent


def ensure_object(value: Any, label: str) -> dict[str, Any]:
    if not isinstance(value, dict):
        raise ContractError("invalid_stage_payload", f"{label} must be an object")
    return value


def ensure_array(value: Any, label: str) -> list[Any]:
    if not isinstance(value, list):
        raise ContractError("invalid_stage_payload", f"{label} must be an array")
    return value


def ensure_text(value: Any, label: str, *, allow_empty: bool = False) -> str:
    if not isinstance(value, str) or (not allow_empty and not value.strip()):
        qualifier = "a string" if allow_empty else "a non-empty string"
        raise ContractError("invalid_stage_payload", f"{label} must be {qualifier}")
    return value.strip() if not allow_empty else value


def ensure_exact_keys(
    value: dict[str, Any],
    *,
    required: set[str],
    optional: set[str] | None = None,
    label: str,
) -> None:
    optional = optional or set()
    missing = required - value.keys()
    unknown = value.keys() - required - optional
    if missing:
        raise ContractError(
            "invalid_stage_payload",
            f"{label} is missing: {', '.join(sorted(missing))}",
        )
    if unknown:
        raise ContractError(
            "invalid_stage_payload",
            f"{label} contains unknown fields: {', '.join(sorted(unknown))}",
        )


def normalize_text(value: Any) -> str:
    text = unicodedata.normalize("NFKC", str(value or ""))
    return " ".join(text.casefold().split())


def normalize_identifier(kind: str, value: Any) -> str:
    text = normalize_text(value)
    if kind == "doi":
        text = re.sub(r"^(?:https?://(?:dx\.)?doi\.org/|doi:\s*)", "", text)
    elif kind == "pmid":
        text = re.sub(r"^pmid:\s*", "", text)
    elif kind == "arxiv":
        text = re.sub(r"^(?:https?://arxiv\.org/(?:abs|pdf)/|arxiv:\s*)", "", text)
        text = re.sub(r"\.pdf$", "", text)
    elif kind == "isbn":
        text = re.sub(r"[^0-9x]", "", text)
    return text.strip()


def normalize_identifiers(value: Any) -> dict[str, str]:
    identifiers = ensure_object(value, "identifiers")
    unknown = identifiers.keys() - set(IDENTIFIER_ORDER)
    if unknown:
        raise ContractError(
            "invalid_stage_payload",
            f"identifiers contains unknown fields: {', '.join(sorted(unknown))}",
        )
    normalized: dict[str, str] = {}
    for kind in IDENTIFIER_ORDER:
        if kind not in identifiers:
            continue
        normalized_value = normalize_identifier(kind, identifiers[kind])
        if not normalized_value:
            raise ContractError(
                "invalid_stage_payload",
                f"identifiers.{kind} must be non-empty",
            )
        normalized[kind] = normalized_value
    return normalized


def strong_candidate_id(identifiers: dict[str, str]) -> str:
    for kind in IDENTIFIER_ORDER:
        if identifiers.get(kind):
            return f"{kind}:{identifiers[kind]}"
    return ""


def weak_identity(candidate: dict[str, Any]) -> str:
    creators = ensure_array(candidate.get("creators_display"), "creators_display")
    first_creator = creators[0] if creators else ""
    parts = [
        normalize_text(candidate.get("title")),
        normalize_text(candidate.get("year")),
        normalize_text(first_creator),
        normalize_text(candidate.get("container")),
    ]
    return "|".join(parts)


def derived_candidate_id(candidate: dict[str, Any]) -> tuple[str, dict[str, str], str]:
    identifiers = normalize_identifiers(candidate.get("identifiers"))
    strong = strong_candidate_id(identifiers)
    weak = weak_identity(candidate)
    if strong:
        return strong, identifiers, weak
    digest = hashlib.sha256(weak.encode()).hexdigest()[:20]
    return f"source:{digest}", identifiers, weak


def parameter_from_input(input_value: Any) -> dict[str, Any]:
    root = ensure_object(input_value, "runtime input")
    parameter = root.get("parameter", root)
    return ensure_object(parameter, "runtime input parameter")


def initial_state(input_value: Any) -> dict[str, Any]:
    return {
        "schema_version": 1,
        "input_hash": stable_hash(input_value),
        "parameter": deepcopy(parameter_from_input(input_value)),
        "status": "running",
        "stage": "stage_10_search_plan",
        "discovery_round": 1,
        "search_plan_approved": False,
        "plan": {},
        "discovery_rounds": [],
        "discovery_expansions": [],
        "candidates": {},
        "approved_candidate_ids": [],
        "excluded_candidate_ids": [],
        "scope_approved": False,
        "metadata": {},
        "pdf": {},
        "prepared": {},
        "ingest_prepared": False,
        "receipts": {},
        "events": [],
        "cancellation": {},
    }


def validate_state_shape(state: Any) -> dict[str, Any]:
    if not isinstance(state, dict):
        raise ContractError("invalid_state", "Gate state must be a JSON object")
    required = {
        "input_hash",
        "parameter",
        "status",
        "discovery_round",
        "search_plan_approved",
        "discovery_rounds",
        "candidates",
        "approved_candidate_ids",
        "metadata",
        "pdf",
        "prepared",
        "receipts",
        "events",
    }
    missing = required - state.keys()
    if missing:
        raise ContractError(
            "invalid_state",
            f"Gate state is missing: {', '.join(sorted(missing))}",
        )
    if state.get("status") not in {"running", "completed", "canceled"}:
        raise ContractError("invalid_state", "Gate state has an invalid status")
    if (
        not isinstance(state.get("discovery_round"), int)
        or state["discovery_round"] < 1
    ):
        raise ContractError(
            "invalid_state", "Gate state has an invalid discovery round"
        )
    for key in (
        "parameter",
        "candidates",
        "metadata",
        "pdf",
        "prepared",
        "receipts",
    ):
        if not isinstance(state.get(key), dict):
            raise ContractError("invalid_state", f"Gate state {key} must be an object")
    for key in (
        "discovery_rounds",
        "approved_candidate_ids",
        "events",
    ):
        if not isinstance(state.get(key), list):
            raise ContractError("invalid_state", f"Gate state {key} must be an array")
    return state


def load_state(state_path: str | Path, input_path: str | Path) -> dict[str, Any]:
    input_value = read_json(input_path)
    target = Path(state_path)
    if not target.exists():
        state = initial_state(input_value)
        atomic_write_json(target, state)
        return state
    try:
        state = validate_state_shape(read_json(target))
    except ContractError as error:
        raise ContractError("invalid_state", str(error)) from error
    if state.get("input_hash") != stable_hash(input_value):
        raise ContractError(
            "input_drift", "Runner input changed after gate initialization"
        )
    return state


def metadata_qualified_ids(state: dict[str, Any]) -> list[str]:
    return [
        candidate_id
        for candidate_id in state.get("approved_candidate_ids", [])
        if state.get("metadata", {}).get(candidate_id, {}).get("status") == "qualified"
    ]


def derive_stage(state: dict[str, Any]) -> str:
    if state.get("status") in {"canceled", "completed"}:
        return "completed"
    if not state.get("search_plan_approved"):
        return "stage_10_search_plan"
    completed_rounds = {
        entry.get("discovery_round")
        for entry in state.get("discovery_rounds", [])
        if isinstance(entry, dict)
    }
    if state.get("discovery_round") not in completed_rounds:
        return "stage_20_discovery"
    if not state.get("scope_approved"):
        return "stage_30_ingest_scope"
    for candidate_id in state.get("approved_candidate_ids", []):
        if candidate_id not in state.get("metadata", {}):
            return "stage_40_metadata_resolution"
    for candidate_id in metadata_qualified_ids(state):
        if candidate_id not in state.get("pdf", {}):
            return "stage_50_pdf_probe"
    if not state.get("ingest_prepared"):
        return "stage_60_ingest_prepare"
    for candidate_id in metadata_qualified_ids(state):
        if candidate_id not in state.get("receipts", {}):
            return "stage_70_ingest"
    state["status"] = "completed"
    return "completed"


def pending_metadata_candidate(state: dict[str, Any]) -> str:
    for candidate_id in state.get("approved_candidate_ids", []):
        if candidate_id not in state.get("metadata", {}):
            return candidate_id
    raise ContractError("invalid_state", "No metadata candidate is pending")


def pending_pdf_candidate(state: dict[str, Any]) -> str:
    for candidate_id in metadata_qualified_ids(state):
        if candidate_id not in state.get("pdf", {}):
            return candidate_id
    raise ContractError("invalid_state", "No PDF candidate is pending")


def pending_ingest_candidate(state: dict[str, Any]) -> str:
    for candidate_id in metadata_qualified_ids(state):
        if candidate_id not in state.get("receipts", {}):
            return candidate_id
    raise ContractError("invalid_state", "No ingest candidate is pending")


def event_key_for_payload(
    state: dict[str, Any], payload: dict[str, Any]
) -> tuple[str, str]:
    stage = derive_stage(state)
    if stage == "stage_10_search_plan":
        decision = ensure_text(payload.get("decision"), "decision")
        action = "approve_search_plan" if decision == "approve" else "cancel_workflow"
        return action, f"{action}:stage_10_search_plan"
    if stage == "stage_20_discovery":
        return "record_discovery", f"record_discovery:{state['discovery_round']}"
    if stage == "stage_30_ingest_scope":
        decision = ensure_text(payload.get("decision"), "decision")
        actions = {
            "approve": "approve_ingest_scope",
            "expand": "request_discovery_expansion",
            "cancel": "cancel_workflow",
        }
        if decision not in actions:
            raise ContractError(
                "invalid_stage_payload",
                "Stage 30 decision must be approve, expand, or cancel",
            )
        action = actions[decision]
        return action, f"{action}:{state['discovery_round']}"
    if stage == "stage_40_metadata_resolution":
        return "record_metadata", f"record_metadata:{pending_metadata_candidate(state)}"
    if stage == "stage_50_pdf_probe":
        return "record_pdf_probe", f"record_pdf_probe:{pending_pdf_candidate(state)}"
    raise ContractError("invalid_stage_action", f"Stage {stage} accepts no payload")


def replay_result(
    state: dict[str, Any],
    *,
    action_key: str,
    payload_hash: str,
) -> bool:
    for event in state.get("events", []):
        if not isinstance(event, dict) or event.get("action_key") != action_key:
            continue
        if event.get("payload_hash") == payload_hash:
            return True
        raise ContractError(
            "conflicting_replay",
            f"{action_key} was already accepted with different content",
        )
    return False


def record_event(
    state: dict[str, Any],
    *,
    action: str,
    action_key: str,
    payload: dict[str, Any],
    payload_path: str | Path,
) -> None:
    state["events"].append(
        {
            "action": action,
            "action_key": action_key,
            "payload_hash": stable_hash(payload),
            "payload_path": Path(payload_path).resolve().as_posix(),
        }
    )


def normalize_plan_payload(payload: dict[str, Any], state: dict[str, Any]) -> None:
    ensure_exact_keys(
        payload,
        required={"decision", "plan"},
        label="search plan decision",
    )
    if payload.get("decision") != "approve":
        raise ContractError(
            "invalid_stage_payload", "Stage 10 decision must be approve"
        )
    plan = ensure_object(payload.get("plan"), "plan")
    plan_required = {
        "search_mode",
        "objective",
        "discipline_or_application",
        "scope",
        "local_coverage",
        "seed_artifacts",
        "query_lanes",
        "source_lanes",
        "inclusion_criteria",
        "exclusion_criteria",
        "batch_size",
        "stop_conditions",
    }
    ensure_exact_keys(plan, required=plan_required, label="plan")
    if plan.get("search_mode") not in SEARCH_MODES:
        raise ContractError("invalid_stage_payload", "plan.search_mode is invalid")
    ensure_text(plan.get("objective"), "plan.objective")
    if not isinstance(plan.get("batch_size"), int) or plan["batch_size"] < 1:
        raise ContractError("invalid_stage_payload", "plan.batch_size must be positive")
    query_lanes = ensure_array(plan.get("query_lanes"), "plan.query_lanes")
    source_lanes = ensure_array(plan.get("source_lanes"), "plan.source_lanes")
    if not query_lanes or not source_lanes:
        raise ContractError(
            "invalid_stage_payload",
            "Search plan requires query and source lanes",
        )
    for lane in query_lanes:
        lane_value = ensure_object(lane, "query lane")
        ensure_exact_keys(
            lane_value,
            required={"lane", "queries", "rationale"},
            label="query lane",
        )
        if lane_value.get("lane") not in QUERY_LANES:
            raise ContractError("invalid_stage_payload", "query lane is invalid")
        if not ensure_array(lane_value.get("queries"), "query lane queries"):
            raise ContractError("invalid_stage_payload", "query lane requires queries")
        ensure_text(lane_value.get("rationale"), "query lane rationale")
    for lane in source_lanes:
        lane_value = ensure_object(lane, "source lane")
        ensure_exact_keys(
            lane_value,
            required={"source", "purpose", "fallback_sources"},
            label="source lane",
        )
        ensure_text(lane_value.get("source"), "source lane source")
        ensure_text(lane_value.get("purpose"), "source lane purpose")
        ensure_array(lane_value.get("fallback_sources"), "source lane fallback_sources")
    normalized = deepcopy(plan)
    normalized["breadth"] = str(
        state.get("parameter", {}).get("searchBreadth") or "broad"
    )
    normalized["candidate_policy"] = {
        "tiers": ["ready", "needs_curation", "lead_only"],
        "material_conflict": "keep_separate",
    }
    normalized["pdf_policy"] = "three_route_public_identity_matched"
    state["plan"] = normalized
    state["search_plan_approved"] = True


def merge_unique(existing: list[Any], additions: list[Any]) -> list[Any]:
    result = deepcopy(existing)
    seen = {canonical_json(value) for value in result}
    for value in additions:
        key = canonical_json(value)
        if key not in seen:
            result.append(deepcopy(value))
            seen.add(key)
    return result


def validate_candidate(candidate: dict[str, Any]) -> tuple[str, dict[str, Any]]:
    required = {
        "tier",
        "title",
        "alternate_titles",
        "creators_display",
        "year",
        "container",
        "original_language",
        "material_version",
        "identifiers",
        "landing_url",
        "discovery_sources",
        "matching_notes",
        "library_note",
        "missing_fields",
        "recommendation_reason",
    }
    ensure_exact_keys(
        candidate,
        required=required,
        optional={"candidate_id"},
        label="candidate",
    )
    if candidate.get("tier") not in CANDIDATE_TIERS:
        raise ContractError("invalid_stage_payload", "candidate tier is invalid")
    ensure_text(candidate.get("title"), "candidate.title")
    ensure_text(candidate.get("material_version"), "candidate.material_version")
    ensure_text(
        candidate.get("recommendation_reason"),
        "candidate.recommendation_reason",
    )
    for key in (
        "alternate_titles",
        "creators_display",
        "matching_notes",
        "missing_fields",
    ):
        ensure_array(candidate.get(key), f"candidate.{key}")
    sources = ensure_array(candidate.get("discovery_sources"), "discovery_sources")
    if not sources:
        raise ContractError(
            "invalid_stage_payload",
            "candidate.discovery_sources must not be empty",
        )
    for source in sources:
        evidence = ensure_object(source, "discovery source")
        ensure_exact_keys(
            evidence,
            required={"source", "url", "lane", "reason", "facts"},
            label="discovery source",
        )
        if evidence.get("lane") not in QUERY_LANES:
            raise ContractError(
                "invalid_stage_payload", "discovery source lane is invalid"
            )
        ensure_text(evidence.get("source"), "discovery source source")
        ensure_text(evidence.get("url"), "discovery source url")
        ensure_text(evidence.get("reason"), "discovery source reason")
        if not ensure_array(evidence.get("facts"), "discovery source facts"):
            raise ContractError(
                "invalid_stage_payload",
                "discovery source facts must not be empty",
            )
    generated_id, identifiers, weak = derived_candidate_id(candidate)
    normalized = deepcopy(candidate)
    normalized.pop("candidate_id", None)
    normalized["candidate_id"] = generated_id
    normalized["identifiers"] = identifiers
    normalized["identity"] = {
        "strong_keys": [generated_id] if not generated_id.startswith("source:") else [],
        "weak_key": weak,
    }
    return generated_id, normalized


def merge_candidate(
    state: dict[str, Any],
    submitted: dict[str, Any],
) -> tuple[str, bool]:
    submitted_id = str(submitted.get("candidate_id") or "").strip()
    generated_id, normalized = validate_candidate(submitted)
    if submitted_id:
        if submitted_id not in state["candidates"]:
            raise ContractError(
                "invalid_stage_payload",
                f"candidate_id {submitted_id} is not gate-issued",
            )
        candidate_id = submitted_id
    else:
        candidate_id = generated_id
    existing = state["candidates"].get(candidate_id)
    if existing is None:
        if submitted_id and submitted_id != generated_id:
            raise ContractError(
                "invalid_stage_payload",
                "New candidate identity does not match its candidate_id",
            )
        normalized["candidate_id"] = candidate_id
        state["candidates"][candidate_id] = normalized
        return candidate_id, True
    anchors = (
        "title",
        "year",
        "container",
        "material_version",
        "original_language",
    )
    if any(
        normalize_text(existing.get(key)) != normalize_text(normalized.get(key))
        for key in anchors
    ):
        raise ContractError(
            "invalid_stage_payload",
            f"Candidate update changes direct-work identity for {candidate_id}",
        )
    existing_identifiers = existing.get("identifiers", {})
    if existing_identifiers != normalized.get("identifiers", {}):
        raise ContractError(
            "invalid_stage_payload",
            f"Candidate update changes identifiers for {candidate_id}",
        )
    for key in (
        "alternate_titles",
        "discovery_sources",
        "matching_notes",
        "missing_fields",
    ):
        existing[key] = merge_unique(existing.get(key, []), normalized.get(key, []))
    existing["tier"] = normalized["tier"]
    existing["library_note"] = normalized["library_note"]
    existing["recommendation_reason"] = normalized["recommendation_reason"]
    return candidate_id, False


def apply_discovery(
    state: dict[str, Any],
    payload: dict[str, Any],
    payload_path: str | Path,
) -> None:
    ensure_exact_keys(
        payload,
        required={"query_attempts", "candidates", "uncovered_gaps", "stop_reason"},
        label="discovery payload",
    )
    attempts = ensure_array(payload.get("query_attempts"), "query_attempts")
    if not attempts:
        raise ContractError(
            "invalid_stage_payload", "Discovery requires actual attempts"
        )
    for attempt in attempts:
        value = ensure_object(attempt, "query attempt")
        ensure_exact_keys(
            value,
            required={"lane", "query", "source", "status", "result_count"},
            optional={"message"},
            label="query attempt",
        )
        if value.get("lane") not in QUERY_LANES:
            raise ContractError(
                "invalid_stage_payload", "query attempt lane is invalid"
            )
        if value.get("status") not in DISCOVERY_ATTEMPT_STATUSES:
            raise ContractError(
                "invalid_stage_payload", "query attempt status is invalid"
            )
        if not isinstance(value.get("result_count"), int) or value["result_count"] < 0:
            raise ContractError(
                "invalid_stage_payload",
                "query attempt result_count must be non-negative",
            )
    candidates = ensure_array(payload.get("candidates"), "candidates")
    ensure_array(payload.get("uncovered_gaps"), "uncovered_gaps")
    ensure_text(payload.get("stop_reason"), "stop_reason")
    added_ids: list[str] = []
    merged_ids: list[str] = []
    for candidate_value in candidates:
        candidate = ensure_object(candidate_value, "candidate")
        candidate_id, added = merge_candidate(state, candidate)
        (added_ids if added else merged_ids).append(candidate_id)
    source_record_count = sum(int(attempt["result_count"]) for attempt in attempts)
    state["discovery_rounds"].append(
        {
            "discovery_round": state["discovery_round"],
            "payload_path": Path(payload_path).resolve().as_posix(),
            "payload_hash": stable_hash(payload),
            "query_attempt_count": len(attempts),
            "source_failure_count": sum(
                attempt["status"] != "completed" for attempt in attempts
            ),
            "source_record_count": source_record_count,
            "unique_candidate_count": len(state["candidates"]),
            "added_candidate_ids": added_ids,
            "merged_candidate_ids": merged_ids,
            "unresolved_conflict_count": 0,
            "uncovered_gaps": deepcopy(payload["uncovered_gaps"]),
            "stop_reason": payload["stop_reason"],
        }
    )


def apply_scope_decision(state: dict[str, Any], payload: dict[str, Any]) -> None:
    decision = ensure_text(payload.get("decision"), "decision")
    if decision == "approve":
        ensure_exact_keys(
            payload,
            required={"decision", "candidate_ids"},
            label="scope approval",
        )
        candidate_ids = ensure_array(payload.get("candidate_ids"), "candidate_ids")
        if not candidate_ids or len(candidate_ids) != len(set(candidate_ids)):
            raise ContractError(
                "invalid_stage_payload",
                "Scope approval requires unique candidate ids",
            )
        for candidate_id in candidate_ids:
            if candidate_id not in state["candidates"]:
                raise ContractError(
                    "invalid_stage_payload",
                    f"Unknown candidate id {candidate_id}",
                )
            if state["candidates"][candidate_id].get("tier") == "lead_only":
                raise ContractError(
                    "invalid_stage_payload",
                    f"lead_only candidate {candidate_id} cannot be approved",
                )
        state["approved_candidate_ids"] = list(candidate_ids)
        state["excluded_candidate_ids"] = [
            candidate_id
            for candidate_id in state["candidates"]
            if candidate_id not in candidate_ids
        ]
        state["scope_approved"] = True
        return
    if decision == "expand":
        ensure_exact_keys(
            payload,
            required={"decision", "gaps"},
            label="scope expansion",
        )
        gaps = ensure_array(payload.get("gaps"), "gaps")
        if not gaps:
            raise ContractError("invalid_stage_payload", "Expansion requires gaps")
        normalized_gaps = []
        for gap in gaps:
            value = ensure_object(gap, "gap")
            ensure_exact_keys(
                value,
                required={"description", "lanes"},
                label="gap",
            )
            ensure_text(value.get("description"), "gap.description")
            lanes = ensure_array(value.get("lanes"), "gap.lanes")
            if not lanes or any(lane not in QUERY_LANES for lane in lanes):
                raise ContractError("invalid_stage_payload", "gap lanes are invalid")
            normalized_gaps.append(
                {"description": value["description"], "lanes": list(lanes)}
            )
        state["discovery_expansions"].append(
            {
                "from_round": state["discovery_round"],
                "gaps": normalized_gaps,
            }
        )
        state["discovery_round"] += 1
        return
    raise ContractError(
        "invalid_stage_payload",
        "Stage 30 decision must be approve, expand, or cancel",
    )


def apply_cancel(state: dict[str, Any], stage: str, payload: dict[str, Any]) -> None:
    ensure_exact_keys(payload, required={"decision"}, label="cancellation")
    if payload.get("decision") != "cancel":
        raise ContractError("invalid_stage_payload", "Cancellation decision is invalid")
    messages = {
        "stage_10_search_plan": "The user canceled search planning.",
        "stage_30_ingest_scope": "The user declined the ingest scope.",
    }
    if stage not in messages:
        raise ContractError(
            "invalid_stage_action",
            "User cancellation is legal only at Stage 10 or Stage 30",
        )
    state["status"] = "canceled"
    state["cancellation"] = {
        "reason": "user_cancelled",
        "message": messages[stage],
        "stage": stage,
    }


def validate_metadata_evidence(
    value: Any, *, allow_empty: bool
) -> list[dict[str, Any]]:
    evidence = ensure_array(value, "evidence")
    if not evidence and not allow_empty:
        raise ContractError("invalid_stage_payload", "Metadata evidence is required")
    result = []
    for entry in evidence:
        item = ensure_object(entry, "metadata evidence")
        ensure_exact_keys(
            item,
            required={"source", "role", "url", "facts"},
            label="metadata evidence",
        )
        if item.get("role") not in {"authoritative", "secondary"}:
            raise ContractError(
                "invalid_stage_payload", "Metadata evidence role is invalid"
            )
        ensure_text(item.get("source"), "metadata evidence source")
        ensure_text(item.get("url"), "metadata evidence url")
        if not ensure_array(item.get("facts"), "metadata evidence facts"):
            raise ContractError(
                "invalid_stage_payload",
                "Metadata evidence facts must not be empty",
            )
        result.append(deepcopy(item))
    return result


def validate_creator(value: Any) -> dict[str, Any]:
    creator = ensure_object(value, "creator")
    ensure_exact_keys(
        creator,
        required={"creatorType"},
        optional={"name", "firstName", "lastName"},
        label="creator",
    )
    ensure_text(creator.get("creatorType"), "creator.creatorType")
    has_name = bool(str(creator.get("name") or "").strip())
    has_last = bool(str(creator.get("lastName") or "").strip())
    if has_name == has_last:
        raise ContractError(
            "invalid_stage_payload",
            "Creator requires either name or lastName",
        )
    return deepcopy(creator)


def apply_metadata(
    state: dict[str, Any],
    payload: dict[str, Any],
    payload_path: str | Path,
) -> None:
    candidate_id = pending_metadata_candidate(state)
    status = ensure_text(payload.get("status"), "status")
    if status == "not_attempted":
        ensure_exact_keys(
            payload,
            required={"status", "reason", "message", "evidence"},
            label="not-attempted metadata",
        )
        if payload.get("reason") not in METADATA_NOT_ATTEMPTED_REASONS:
            raise ContractError(
                "invalid_stage_payload", "not-attempted reason is invalid"
            )
        ensure_text(payload.get("message"), "message")
        evidence = validate_metadata_evidence(payload.get("evidence"), allow_empty=True)
        state["metadata"][candidate_id] = {
            "status": "not_attempted",
            "reason": payload["reason"],
            "message": payload["message"],
            "evidence": evidence,
            "payload_path": Path(payload_path).resolve().as_posix(),
            "payload_hash": stable_hash(payload),
        }
        return
    if status != "qualified":
        raise ContractError(
            "invalid_stage_payload",
            "Metadata status must be qualified or not_attempted",
        )
    ensure_exact_keys(
        payload,
        required={
            "status",
            "metadata",
            "evidence",
            "corroborating_signals",
            "curation_notes",
        },
        label="qualified metadata",
    )
    evidence = validate_metadata_evidence(payload.get("evidence"), allow_empty=False)
    if not any(entry["role"] == "authoritative" for entry in evidence):
        raise ContractError(
            "invalid_stage_payload",
            "Qualified metadata requires authoritative evidence",
        )
    metadata = ensure_object(payload.get("metadata"), "metadata")
    ensure_exact_keys(
        metadata,
        required={
            "itemType",
            "title",
            "language",
            "script",
            "alternateTitles",
            "fields",
            "creatorCompleteness",
            "creators",
            "identifiers",
            "landingUrl",
        },
        label="metadata",
    )
    ensure_text(metadata.get("itemType"), "metadata.itemType")
    ensure_text(metadata.get("title"), "metadata.title")
    ensure_text(metadata.get("landingUrl"), "metadata.landingUrl")
    alternate_titles = ensure_array(metadata.get("alternateTitles"), "alternateTitles")
    for alternate in alternate_titles:
        item = ensure_object(alternate, "alternate title")
        ensure_exact_keys(
            item,
            required={"value", "role", "language", "script"},
            label="alternate title",
        )
        if item.get("role") not in {"translated", "romanized", "alternate"}:
            raise ContractError(
                "invalid_stage_payload", "alternate title role is invalid"
            )
        ensure_text(item.get("value"), "alternate title value")
    fields = ensure_object(metadata.get("fields"), "metadata.fields")
    forbidden_fields = {
        key for key in fields if key.casefold() in {"title", "doi", "extra"}
    }
    if forbidden_fields:
        raise ContractError(
            "invalid_stage_payload",
            "metadata.fields must not repeat title, DOI, or Extra",
        )
    if any(not isinstance(value, str) for value in fields.values()):
        raise ContractError(
            "invalid_stage_payload",
            "metadata.fields values must be strings",
        )
    completeness = metadata.get("creatorCompleteness")
    if completeness not in {"complete", "incomplete"}:
        raise ContractError(
            "invalid_stage_payload",
            "creatorCompleteness must be complete or incomplete",
        )
    creators = [
        validate_creator(value)
        for value in ensure_array(metadata.get("creators"), "metadata.creators")
    ]
    if completeness == "complete" and not creators:
        raise ContractError(
            "invalid_stage_payload",
            "Complete creators must include the complete creator list",
        )
    if completeness == "incomplete" and creators:
        raise ContractError(
            "invalid_stage_payload",
            "Incomplete creators must use an empty replacement list",
        )
    identifiers = normalize_identifiers(metadata.get("identifiers"))
    candidate_identifiers = state["candidates"][candidate_id].get("identifiers", {})
    for kind, value in candidate_identifiers.items():
        if identifiers.get(kind) and identifiers[kind] != value:
            raise ContractError(
                "invalid_stage_payload",
                f"Metadata {kind} conflicts with the approved candidate",
            )
    signals = ensure_array(
        payload.get("corroborating_signals"),
        "corroborating_signals",
    )
    if not identifiers and len(set(map(str, signals))) < 2:
        raise ContractError(
            "invalid_stage_payload",
            "Title-path metadata requires at least two corroborating signals",
        )
    curation_notes = ensure_array(payload.get("curation_notes"), "curation_notes")
    normalized_fields = deepcopy(fields)
    normalized_fields["title"] = metadata["title"]
    normalized_metadata = {
        "itemType": metadata["itemType"],
        "fields": normalized_fields,
        "creators": creators,
        "identifiers": identifiers,
        "landingUrl": metadata["landingUrl"],
        "alternateTitles": deepcopy(alternate_titles),
        "language": metadata["language"],
        "script": metadata["script"],
        "creatorCompleteness": completeness,
        "title": metadata["title"],
    }
    state["metadata"][candidate_id] = {
        "status": "qualified",
        "metadata": normalized_metadata,
        "evidence": evidence,
        "corroborating_signals": deepcopy(signals),
        "curation_notes": deepcopy(curation_notes),
        "needs_curation": completeness == "incomplete" or bool(curation_notes),
        "required_pdf_routes": list(PDF_ROUTE_ORDER),
        "payload_path": Path(payload_path).resolve().as_posix(),
        "payload_hash": stable_hash(payload),
    }


def apply_pdf(
    state: dict[str, Any],
    payload: dict[str, Any],
    payload_path: str | Path,
) -> None:
    candidate_id = pending_pdf_candidate(state)
    ensure_exact_keys(payload, required={"attempts"}, label="PDF payload")
    attempts = ensure_object(payload.get("attempts"), "attempts")
    if set(attempts) != set(PDF_ROUTE_ORDER):
        raise ContractError(
            "invalid_stage_payload",
            "PDF payload must contain exactly the three required routes",
        )
    normalized_attempts: dict[str, Any] = {}
    found_url = ""
    for route in PDF_ROUTE_ORDER:
        attempt = ensure_object(attempts.get(route), f"attempts.{route}")
        status = ensure_text(attempt.get("status"), f"attempts.{route}.status")
        base_required = {"source", "query_or_url", "status", "notes"}
        if status == "found":
            ensure_exact_keys(
                attempt,
                required=base_required
                | {"pdf_url", "content_type", "identity_evidence"},
                label=f"attempts.{route}",
            )
            url = ensure_text(attempt.get("pdf_url"), f"attempts.{route}.pdf_url")
            if not re.match(r"^https?://", url):
                raise ContractError(
                    "invalid_stage_payload",
                    "Found PDF URL must use HTTP(S)",
                )
            content_type = ensure_text(
                attempt.get("content_type"),
                f"attempts.{route}.content_type",
            )
            if not content_type.startswith("application/pdf"):
                raise ContractError(
                    "invalid_stage_payload",
                    "Found PDF content type must be application/pdf",
                )
            if not ensure_array(
                attempt.get("identity_evidence"),
                f"attempts.{route}.identity_evidence",
            ):
                raise ContractError(
                    "invalid_stage_payload",
                    "Found PDF requires identity evidence",
                )
            if not found_url:
                found_url = url
        else:
            ensure_exact_keys(
                attempt,
                required=base_required,
                label=f"attempts.{route}",
            )
            if status not in PDF_TERMINAL_STATUSES - {"found"}:
                raise ContractError(
                    "invalid_stage_payload",
                    f"PDF status {status} is invalid",
                )
        ensure_text(attempt.get("source"), f"attempts.{route}.source")
        ensure_text(attempt.get("query_or_url"), f"attempts.{route}.query_or_url")
        if not isinstance(attempt.get("notes"), str):
            raise ContractError(
                "invalid_stage_payload",
                f"attempts.{route}.notes must be a string",
            )
        normalized_attempts[route] = deepcopy(attempt)
    state["pdf"][candidate_id] = {
        "status": "found" if found_url else "missing",
        "pdf_url": found_url,
        "attempts": normalized_attempts,
        "payload_hash": stable_hash(payload),
        "payload_path": Path(payload_path).resolve().as_posix(),
    }


def apply_stage_payload(
    state_path: str | Path,
    input_path: str | Path,
    payload_path: str | Path,
) -> dict[str, Any]:
    state = load_state(state_path, input_path)
    payload = ensure_object(read_json(payload_path), "stage payload")
    action, action_key = event_key_for_payload(state, payload)
    payload_hash = stable_hash(payload)
    if replay_result(state, action_key=action_key, payload_hash=payload_hash):
        return state
    stage = derive_stage(state)
    if stage == "stage_10_search_plan":
        if payload.get("decision") == "cancel":
            apply_cancel(state, stage, payload)
        else:
            normalize_plan_payload(payload, state)
    elif stage == "stage_20_discovery":
        apply_discovery(state, payload, payload_path)
    elif stage == "stage_30_ingest_scope":
        if payload.get("decision") == "cancel":
            apply_cancel(state, stage, payload)
        else:
            apply_scope_decision(state, payload)
    elif stage == "stage_40_metadata_resolution":
        apply_metadata(state, payload, payload_path)
    elif stage == "stage_50_pdf_probe":
        apply_pdf(state, payload, payload_path)
    else:
        raise ContractError("invalid_stage_action", f"Stage {stage} accepts no payload")
    record_event(
        state,
        action=action,
        action_key=action_key,
        payload=payload,
        payload_path=payload_path,
    )
    state["stage"] = derive_stage(state)
    atomic_write_json(state_path, state)
    return state


def prepare_ingest_payloads(
    state_path: str | Path,
    input_path: str | Path,
) -> dict[str, Any]:
    state = load_state(state_path, input_path)
    if derive_stage(state) != "stage_60_ingest_prepare":
        raise ContractError(
            "invalid_stage_action",
            "Ingest payloads are not ready to prepare",
        )
    run_root = run_root_for_state(state_path)
    target_collection = str(
        state.get("parameter", {}).get("targetCollection") or ""
    ).strip()
    prepared: dict[str, Any] = {}
    for index, candidate_id in enumerate(metadata_qualified_ids(state), start=1):
        metadata_entry = state["metadata"][candidate_id]
        metadata_payload = read_json(metadata_entry["payload_path"])
        if stable_hash(metadata_payload) != metadata_entry["payload_hash"]:
            raise ContractError(
                "payload_hash_mismatch",
                f"Accepted metadata payload changed for {candidate_id}",
            )
        pdf_entry = state["pdf"][candidate_id]
        pdf_payload = read_json(pdf_entry["payload_path"])
        if stable_hash(pdf_payload) != pdf_entry["payload_hash"]:
            raise ContractError(
                "payload_hash_mismatch",
                f"Accepted PDF payload changed for {candidate_id}",
            )
        metadata = metadata_entry["metadata"]
        paper = {
            "itemType": metadata["itemType"],
            "fields": metadata["fields"],
            "creators": metadata["creators"],
            "identifiers": metadata["identifiers"],
            "landingUrl": metadata["landingUrl"],
            "attachLandingUrlOnMissingPdf": True,
        }
        if pdf_entry.get("pdf_url"):
            paper["pdfUrl"] = pdf_entry["pdf_url"]
        ingest_payload: dict[str, Any] = {"paper": paper}
        if target_collection:
            ingest_payload["collection"] = target_collection
        target = run_root / "runtime" / "payloads" / f"ingest-paper-{index:03d}.json"
        atomic_write_json(target, ingest_payload)
        prepared[candidate_id] = {
            "payload_path": target.as_posix(),
            "payload_hash": stable_hash(ingest_payload),
        }
    state["prepared"] = prepared
    state["ingest_prepared"] = True
    state["stage"] = derive_stage(state)
    atomic_write_json(state_path, state)
    return state


def validated_prepared_payload(
    state: dict[str, Any],
    candidate_id: str,
) -> dict[str, Any]:
    prepared = ensure_object(
        state.get("prepared", {}).get(candidate_id),
        f"state.prepared.{candidate_id}",
    )
    payload = ensure_object(
        read_json(ensure_text(prepared.get("payload_path"), "prepared.payload_path")),
        "prepared payload",
    )
    if stable_hash(payload) != prepared.get("payload_hash"):
        raise ContractError(
            "payload_hash_mismatch",
            f"Prepared ingest payload changed for {candidate_id}",
        )
    return payload


def find_ingest(value: Any) -> dict[str, Any] | None:
    if not isinstance(value, dict):
        return None
    ingest = value.get("ingest")
    if isinstance(ingest, dict) and ingest.get("status") in INGEST_STATUSES:
        return ingest
    for key in ("result", "data", "host_response"):
        found = find_ingest(value.get(key))
        if found is not None:
            return found
    return None


def record_ingest_receipt(
    state_path: str | Path,
    input_path: str | Path,
    receipt_path: str | Path,
) -> dict[str, Any]:
    state = load_state(state_path, input_path)
    receipt = ensure_object(read_json(receipt_path), "ingest receipt")
    receipt_digest = stable_hash(receipt)
    resolved_receipt_path = Path(receipt_path).resolve()
    for event in state["events"]:
        if (
            isinstance(event, dict)
            and event.get("action") == "record_ingest_receipt"
            and event.get("payload_path") == resolved_receipt_path.as_posix()
        ):
            if event.get("payload_hash") == receipt_digest:
                return state
            raise ContractError(
                "conflicting_replay",
                "Ingest receipt was already accepted with different content",
            )
    if derive_stage(state) != "stage_70_ingest":
        raise ContractError(
            "invalid_stage_action",
            "No ingest receipt is currently expected",
        )
    candidate_id = pending_ingest_candidate(state)
    expected_receipt_path = (
        run_root_for_state(state_path)
        / "runtime"
        / "host"
        / f"ingest-{len(state.get('receipts', {})) + 1:03d}.json"
    ).resolve()
    if resolved_receipt_path != expected_receipt_path:
        raise ContractError(
            "invalid_ingest_receipt",
            f"Receipt must use the gate-issued path: {expected_receipt_path}",
        )
    validated_prepared_payload(state, candidate_id)
    for accepted_id, accepted in state.get("receipts", {}).items():
        if (
            accepted_id != candidate_id
            and accepted.get("receipt_hash") == receipt_digest
        ):
            raise ContractError(
                "invalid_ingest_receipt",
                "A Host receipt cannot be reused across candidates",
            )
    if "failure" in receipt:
        ensure_exact_keys(
            receipt,
            required={"failure", "message"},
            label="fatal ingest receipt",
        )
        failure = ensure_text(receipt.get("failure"), "failure")
        if failure not in FATAL_INGEST_REASONS:
            raise ContractError("invalid_ingest_receipt", "Fatal failure is invalid")
        message = ensure_text(receipt.get("message"), "message")
        state["receipts"][candidate_id] = {
            "status": "failed",
            "failure": failure,
            "message": message,
            "receipt_path": resolved_receipt_path.as_posix(),
            "receipt_hash": receipt_digest,
            "payload_hash": state["prepared"][candidate_id]["payload_hash"],
        }
        state["status"] = "canceled"
        state["cancellation"] = {
            "reason": failure,
            "message": message,
            "stage": "stage_70_ingest",
            "candidate_id": candidate_id,
        }
    else:
        ingest = find_ingest(receipt)
        if ingest is None:
            raise ContractError(
                "invalid_ingest_receipt",
                "Receipt does not contain a supported ingest status",
            )
        status = str(ingest["status"])
        item_id = 0
        if status in {"created", "existing"}:
            item = ensure_object(ingest.get("item"), "receipt ingest item")
            item_id = int(item.get("id") or 0)
            if item_id <= 0:
                raise ContractError(
                    "invalid_ingest_receipt",
                    "Created or existing receipt requires a positive item id",
                )
            for accepted_id, accepted in state.get("receipts", {}).items():
                if accepted_id != candidate_id and accepted.get("item_id") == item_id:
                    raise ContractError(
                        "invalid_ingest_receipt",
                        "A Zotero item id cannot be bound to different candidates",
                    )
        state["receipts"][candidate_id] = {
            "status": status,
            "item_id": item_id,
            "has_pdf_attachment": ingest.get("hasPdfAttachment") is True,
            "receipt_path": resolved_receipt_path.as_posix(),
            "receipt_hash": receipt_digest,
            "payload_hash": state["prepared"][candidate_id]["payload_hash"],
        }
    state["events"].append(
        {
            "action": "record_ingest_receipt",
            "action_key": f"record_ingest_receipt:{candidate_id}",
            "payload_hash": receipt_digest,
            "payload_path": resolved_receipt_path.as_posix(),
        }
    )
    state["stage"] = derive_stage(state)
    atomic_write_json(state_path, state)
    return state


def build_ledger(state: dict[str, Any]) -> dict[str, Any]:
    candidate_results = []
    for candidate_id in state.get("approved_candidate_ids", []):
        metadata = state.get("metadata", {}).get(candidate_id, {})
        pdf = state.get("pdf", {}).get(candidate_id, {})
        prepared = state.get("prepared", {}).get(candidate_id, {})
        receipt = state.get("receipts", {}).get(candidate_id, {})
        candidate_results.append(
            {
                "candidate_id": candidate_id,
                "title": state.get("candidates", {})
                .get(candidate_id, {})
                .get(
                    "title",
                    "",
                ),
                "metadata_status": metadata.get("status", ""),
                "metadata_reason": metadata.get("reason", ""),
                "metadata_payload_path": metadata.get("payload_path", ""),
                "metadata_payload_hash": metadata.get("payload_hash", ""),
                "pdf_status": pdf.get("status", "skipped"),
                "pdf_payload_path": pdf.get("payload_path", ""),
                "pdf_payload_hash": pdf.get("payload_hash", ""),
                "prepared_payload_path": prepared.get("payload_path", ""),
                "prepared_payload_hash": prepared.get("payload_hash", ""),
                "ingest_status": (
                    "not_attempted"
                    if metadata.get("status") == "not_attempted"
                    else receipt.get("status", "")
                ),
                "receipt_path": receipt.get("receipt_path", ""),
                "receipt_hash": receipt.get("receipt_hash", ""),
                "item_id": receipt.get("item_id", 0),
                "needs_curation": metadata.get("needs_curation", False),
            }
        )
    return {
        "kind": "literature_search_ingest_ledger",
        "status": state.get("status"),
        "input_hash": state.get("input_hash"),
        "search_mode": state.get("plan", {}).get("search_mode", ""),
        "breadth": state.get("plan", {}).get("breadth", ""),
        "discovery_rounds": deepcopy(state.get("discovery_rounds", [])),
        "candidate_ids": list(state.get("candidates", {})),
        "approved_candidate_ids": list(state.get("approved_candidate_ids", [])),
        "excluded_candidate_ids": list(state.get("excluded_candidate_ids", [])),
        "candidate_results": candidate_results,
        "cancellation": deepcopy(state.get("cancellation", {})),
    }


def build_final_output(state: dict[str, Any]) -> dict[str, Any]:
    if state.get("status") == "canceled":
        cancellation = state.get("cancellation", {})
        return {
            "kind": "literature_search_ingest_canceled",
            "status": "canceled",
            "reason": str(cancellation.get("reason") or "execution_blocked"),
            "message": str(cancellation.get("message") or "The workflow was canceled."),
        }
    outcomes = []
    counts = {
        "created": 0,
        "existing": 0,
        "failed": 0,
        "not_attempted": 0,
    }
    for candidate_id in state.get("approved_candidate_ids", []):
        title = str(state["candidates"][candidate_id].get("title") or "")
        metadata = state.get("metadata", {}).get(candidate_id, {})
        if metadata.get("status") == "not_attempted":
            counts["not_attempted"] += 1
            outcomes.append(
                {
                    "title": title,
                    "ingestStatus": "not_attempted",
                }
            )
            continue
        receipt = state.get("receipts", {}).get(candidate_id, {})
        status = str(receipt.get("status") or "failed")
        if status not in INGEST_STATUSES:
            status = "failed"
        counts[status] += 1
        if status == "failed":
            outcomes.append({"title": title, "ingestStatus": "failed"})
            continue
        outcomes.append(
            {
                "title": title,
                "ingestStatus": status,
                "itemRef": {"id": int(receipt["item_id"])},
                "pdfStatus": (
                    "attached"
                    if receipt.get("has_pdf_attachment") is True
                    else "missing"
                ),
                "needsCuration": metadata.get("needs_curation") is True,
            }
        )
    return {
        "kind": "literature_search_ingest",
        "status": "completed",
        "summary": {
            "discovered": len(state.get("candidates", {})),
            "selected": len(state.get("approved_candidate_ids", [])),
            "created": counts["created"],
            "existing": counts["existing"],
            "failed": counts["failed"],
            "notAttempted": counts["not_attempted"],
        },
        "outcomes": outcomes,
        "searchLedgerPath": "result/search-ledger.json",
    }


def terminal_artifacts(
    state_path: str | Path,
    input_path: str | Path,
) -> tuple[dict[str, Any], dict[str, Any]]:
    state = load_state(state_path, input_path)
    if derive_stage(state) != "completed":
        raise ContractError("invalid_stage_action", "Workflow is not terminal")
    ledger = build_ledger(state)
    ledger_path = run_root_for_state(state_path) / "result" / "search-ledger.json"
    atomic_write_json(ledger_path, ledger)
    final_output = build_final_output(state)
    if state.get("stage") != "completed":
        state["stage"] = "completed"
        atomic_write_json(state_path, state)
    return ledger, final_output
