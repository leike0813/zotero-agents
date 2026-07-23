from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Any


SCHEMA_ID = "literature_search_ingest.gate_state"
SCHEMA_VERSION = "1.0.0"
TERMINAL_PDF_STATUSES = {
    "found",
    "not_found",
    "restricted",
    "unavailable",
    "mismatch",
    "error",
}
INGEST_STATUSES = {"created", "existing", "failed", "not_attempted"}
PDF_ROUTE_ORDER = ["authoritative_landing", "open_access", "web_search"]
QUERY_LANES = {"core", "multilingual", "seed", "gap"}
SEED_ARTIFACT_TYPES = {
    "references",
    "citation_analysis",
    "digest",
    "topic_report",
    "metadata",
}
SOURCE_CLASSES = {
    "cross_disciplinary_index",
    "authoritative_publisher",
    "domain_index",
    "regional_index",
    "repository",
    "library_catalog",
    "citation_network",
    "public_web",
}
SOURCE_LANE_ROLES = {"primary", "supplemental", "fallback"}
SOURCE_EVIDENCE_ROLES = {
    "authoritative",
    "index",
    "secondary",
    "repository",
    "library_catalog",
    "public_web",
}
SEARCH_MODES = {
    "guided",
    "topic_expansion",
    "paper_seed_expansion",
    "targeted_ingest",
}
CANDIDATE_TIERS = {"ready", "needs_curation", "lead_only"}
DUPLICATE_STATUSES = {
    "not_in_library",
    "possible_duplicate",
    "existing_exact",
    "version_related",
    "unknown",
}
DISCOVERY_ATTEMPT_STATUSES = {"completed", "unavailable", "error"}
GAP_TYPES = {
    "topic",
    "language",
    "region",
    "period",
    "method",
    "literature_type",
    "source",
    "seed",
    "other",
}
ALTERNATE_TITLE_ROLES = {
    "translated",
    "romanized",
    "abbreviated",
    "alternate_published",
}
CONTAINER_ROLES = {
    "journal",
    "book",
    "proceedings",
    "conference",
    "university",
    "institution",
    "series",
    "repository",
}
METADATA_NOT_ATTEMPTED_REASONS = {
    "identity_changed",
    "material_conflict_unresolved",
    "authoritative_metadata_unavailable",
    "metadata_sources_unavailable",
    "insufficient_same_work_evidence",
    "unsupported_item_type",
}
FATAL_INGEST_REASONS = {
    "host_unavailable",
    "approval_denied",
    "execution_blocked",
}


class ContractError(ValueError):
    def __init__(self, code: str, message: str):
        super().__init__(message)
        self.code = code


def stable_hash(value: Any) -> str:
    encoded = json.dumps(
        value,
        ensure_ascii=False,
        separators=(",", ":"),
        sort_keys=True,
    ).encode("utf-8")
    return "sha256:" + hashlib.sha256(encoded).hexdigest()


def read_json(path: str | Path) -> dict[str, Any]:
    target = Path(path)
    try:
        value = json.loads(target.read_text(encoding="utf-8"))
    except FileNotFoundError as error:
        raise ContractError(
            "missing_file", f"Required file does not exist: {target}"
        ) from error
    except json.JSONDecodeError as error:
        raise ContractError(
            "invalid_json", f"Invalid JSON in {target}: {error}"
        ) from error
    if not isinstance(value, dict):
        raise ContractError("invalid_json", f"JSON root must be an object: {target}")
    return value


def atomic_write_json(path: str | Path, value: dict[str, Any]) -> None:
    target = Path(path)
    target.parent.mkdir(parents=True, exist_ok=True)
    temporary = target.with_suffix(target.suffix + ".tmp")
    temporary.write_text(
        json.dumps(value, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )
    temporary.replace(target)


def ensure_object(
    value: Any, label: str, *, allow_empty: bool = False
) -> dict[str, Any]:
    if not isinstance(value, dict):
        raise ContractError("invalid_stage_payload", f"{label} must be an object")
    if not allow_empty and not value:
        raise ContractError("invalid_stage_payload", f"{label} must not be empty")
    return value


def ensure_list(value: Any, label: str, *, allow_empty: bool = False) -> list[Any]:
    if not isinstance(value, list):
        raise ContractError("invalid_stage_payload", f"{label} must be an array")
    if not allow_empty and not value:
        raise ContractError("invalid_stage_payload", f"{label} must not be empty")
    return value


def ensure_text(value: Any, label: str) -> str:
    if not isinstance(value, str) or not value.strip():
        raise ContractError(
            "invalid_stage_payload", f"{label} must be a non-empty string"
        )
    text = value.strip()
    return text


def ensure_bool(value: Any, label: str) -> bool:
    if not isinstance(value, bool):
        raise ContractError("invalid_stage_payload", f"{label} must be boolean")
    return value


def ensure_integer(value: Any, label: str, *, minimum: int = 0) -> int:
    if isinstance(value, bool) or not isinstance(value, int) or value < minimum:
        raise ContractError(
            "invalid_stage_payload",
            f"{label} must be an integer >= {minimum}",
        )
    return value


def ensure_allowed_keys(
    value: dict[str, Any],
    label: str,
    *,
    required: set[str],
    optional: set[str] | None = None,
) -> None:
    optional_keys = optional or set()
    missing = sorted(required - set(value))
    if missing:
        raise ContractError(
            "invalid_stage_payload",
            f"{label} is missing required fields: {', '.join(missing)}",
        )
    unexpected = sorted(set(value) - required - optional_keys)
    if unexpected:
        raise ContractError(
            "invalid_stage_payload",
            f"{label} has undeclared fields: {', '.join(unexpected)}",
        )


def ensure_string_list(value: Any, label: str, *, minimum: int = 1) -> list[str]:
    entries = [
        ensure_text(entry, label)
        for entry in ensure_list(value, label, allow_empty=minimum == 0)
    ]
    if len(entries) < minimum:
        raise ContractError(
            "invalid_stage_payload",
            f"{label} must contain at least {minimum} entries",
        )
    if len(entries) != len(set(entries)):
        raise ContractError(
            "invalid_stage_payload", f"{label} must not contain duplicates"
        )
    return entries


def normalized_doi(value: Any) -> str:
    text = str(value or "").strip().rstrip(".,;")
    lowered = text.lower()
    for prefix in ("https://doi.org/", "http://doi.org/", "http://dx.doi.org/", "doi:"):
        if lowered.startswith(prefix):
            text = text[len(prefix) :].strip()
            break
    return text.lower()


def run_root_for_state(state_path: str | Path) -> Path:
    state_parent = Path(state_path).resolve().parent
    if state_parent.name == "runtime":
        return state_parent.parent
    return Path.cwd().resolve()


def initial_state(input_path: str | Path) -> dict[str, Any]:
    input_payload = read_json(input_path)
    parameter = ensure_object(
        input_payload.get("parameter", input_payload),
        "input.parameter",
        allow_empty=True,
    )
    return {
        "schema_id": SCHEMA_ID,
        "schema_version": SCHEMA_VERSION,
        "status": "running",
        "stage": "stage_10_search_plan",
        "input_path": Path(input_path).resolve().as_posix(),
        "input_hash": stable_hash(input_payload),
        "parameter": parameter,
        "events": [],
        "discovery_round": 1,
        "discovery_rounds": [],
        "expansion_requests": [],
        "candidates": {},
        "approved_candidate_ids": [],
        "metadata": {},
        "pdf": {},
        "prepared": {},
        "receipts": {},
    }


def load_state(state_path: str | Path, input_path: str | Path) -> dict[str, Any]:
    target = Path(state_path)
    if not target.exists():
        return initial_state(input_path)
    state = read_json(target)
    if state.get("schema_id") != SCHEMA_ID:
        raise ContractError("invalid_state", "Gate state has an unexpected schema_id")
    if state.get("schema_version") != SCHEMA_VERSION:
        raise ContractError(
            "invalid_state", "Gate state has an unsupported schema_version"
        )
    if not isinstance(state.get("events"), list):
        raise ContractError("invalid_state", "Gate state events must be an array")
    discovery_round = state.get("discovery_round")
    if (
        isinstance(discovery_round, bool)
        or not isinstance(discovery_round, int)
        or discovery_round < 1
    ):
        raise ContractError(
            "invalid_state", "Gate state discovery_round must be a positive integer"
        )
    for field, expected_type in (
        ("discovery_rounds", list),
        ("expansion_requests", list),
        ("candidates", dict),
        ("approved_candidate_ids", list),
        ("metadata", dict),
        ("pdf", dict),
        ("prepared", dict),
        ("receipts", dict),
    ):
        if not isinstance(state.get(field), expected_type):
            raise ContractError(
                "invalid_state",
                f"Gate state {field} must be {expected_type.__name__}",
            )
    input_payload = read_json(input_path)
    if state.get("input_hash") != stable_hash(input_payload):
        raise ContractError(
            "invalid_state", "Runner input changed after gate initialization"
        )
    return state


def action_key(payload: dict[str, Any]) -> str:
    action = ensure_text(payload.get("action"), "action")
    candidate_id = str(payload.get("candidate_id") or "").strip()
    discovery_round = payload.get("discovery_round")
    parts = [action]
    if discovery_round is not None:
        parts.append(f"round-{discovery_round}")
    if candidate_id:
        parts.append(candidate_id)
    return ":".join(parts)


def replay_result(state: dict[str, Any], payload: dict[str, Any]) -> bool:
    key = action_key(payload)
    digest = stable_hash(payload)
    for event in ensure_list(state.get("events"), "state.events", allow_empty=True):
        if not isinstance(event, dict) or event.get("action_key") != key:
            continue
        if event.get("payload_hash") == digest:
            return True
        raise ContractError(
            "conflicting_replay",
            f"Action {key} was already accepted with a different payload",
        )
    return False


def record_event(
    state: dict[str, Any],
    payload: dict[str, Any],
    payload_path: str | Path,
) -> None:
    state["events"].append(
        {
            "action": payload["action"],
            "action_key": action_key(payload),
            "payload": payload,
            "payload_hash": stable_hash(payload),
            "payload_path": Path(payload_path).resolve().as_posix(),
        }
    )


def pending_metadata_candidate(state: dict[str, Any]) -> str:
    metadata = ensure_object(state.get("metadata"), "state.metadata", allow_empty=True)
    for candidate_id in state.get("approved_candidate_ids", []):
        if candidate_id not in metadata:
            return candidate_id
    return ""


def metadata_qualified_ids(state: dict[str, Any]) -> list[str]:
    metadata = ensure_object(state.get("metadata"), "state.metadata", allow_empty=True)
    return [
        candidate_id
        for candidate_id in state.get("approved_candidate_ids", [])
        if metadata.get(candidate_id, {}).get("status") == "qualified"
    ]


def pending_pdf_candidate(state: dict[str, Any]) -> str:
    pdf = ensure_object(state.get("pdf"), "state.pdf", allow_empty=True)
    for candidate_id in metadata_qualified_ids(state):
        if candidate_id not in pdf:
            return candidate_id
    return ""


def pending_ingest_candidate(state: dict[str, Any]) -> str:
    receipts = ensure_object(state.get("receipts"), "state.receipts", allow_empty=True)
    for candidate_id in state.get("prepared", {}):
        if candidate_id not in receipts:
            return candidate_id
    return ""


def derive_stage(state: dict[str, Any]) -> str:
    if state.get("status") in {"canceled", "completed"}:
        return "completed"
    if not state.get("search_plan_approved"):
        return "stage_10_search_plan"
    if state.get("last_discovery_round") != state.get("discovery_round"):
        return "stage_20_discovery"
    if not state.get("ingest_scope_approved"):
        return "stage_30_ingest_scope"
    if pending_metadata_candidate(state):
        return "stage_40_metadata_resolution"
    if pending_pdf_candidate(state):
        return "stage_50_pdf_probe"
    if not state.get("ingest_prepared"):
        return "stage_60_ingest_prepare"
    if pending_ingest_candidate(state):
        return "stage_70_ingest"
    state["status"] = "completed"
    return "completed"


def validate_search_plan(payload: dict[str, Any]) -> None:
    ensure_allowed_keys(
        payload,
        "search plan action",
        required={"action", "approved", "plan"},
    )
    if payload.get("approved") is not True:
        raise ContractError(
            "invalid_stage_payload", "Search plan approval requires approved=true"
        )
    plan = ensure_object(payload.get("plan"), "plan")
    ensure_allowed_keys(
        plan,
        "plan",
        required={
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
            "candidate_policy",
            "breadth",
            "stop_conditions",
            "pdf_policy",
        },
    )
    search_mode = ensure_text(plan.get("search_mode"), "plan.search_mode")
    if search_mode not in SEARCH_MODES:
        raise ContractError(
            "invalid_stage_payload", f"Invalid plan.search_mode: {search_mode}"
        )
    ensure_text(plan.get("objective"), "plan.objective")
    ensure_text(plan.get("discipline_or_application"), "plan.discipline_or_application")
    scope = ensure_object(plan.get("scope"), "plan.scope")
    ensure_allowed_keys(
        scope,
        "plan.scope",
        required={
            "date_range",
            "language_hints",
            "literature_types",
            "regions",
        },
    )
    ensure_text(scope.get("date_range"), "plan.scope.date_range")
    for field in ("language_hints", "literature_types", "regions"):
        ensure_string_list(scope.get(field), f"plan.scope.{field}", minimum=0)
    local_coverage = ensure_object(plan.get("local_coverage"), "plan.local_coverage")
    ensure_allowed_keys(
        local_coverage,
        "plan.local_coverage",
        required={
            "summary",
            "existing_identifiers",
            "reusable_seed_refs",
            "gaps",
        },
    )
    ensure_text(local_coverage.get("summary"), "plan.local_coverage.summary")
    for field in ("existing_identifiers", "reusable_seed_refs", "gaps"):
        ensure_string_list(
            local_coverage.get(field),
            f"plan.local_coverage.{field}",
            minimum=0,
        )
    seed_artifacts = ensure_list(
        plan.get("seed_artifacts"), "plan.seed_artifacts", allow_empty=True
    )
    for index, entry in enumerate(seed_artifacts):
        seed = ensure_object(entry, f"plan.seed_artifacts[{index}]")
        ensure_allowed_keys(
            seed,
            f"plan.seed_artifacts[{index}]",
            required={"ref", "type", "used", "reason"},
        )
        ensure_text(seed.get("ref"), f"plan.seed_artifacts[{index}].ref")
        seed_type = ensure_text(seed.get("type"), f"plan.seed_artifacts[{index}].type")
        if seed_type not in SEED_ARTIFACT_TYPES:
            raise ContractError(
                "invalid_stage_payload",
                f"Invalid plan.seed_artifacts[{index}].type: {seed_type}",
            )
        ensure_bool(seed.get("used"), f"plan.seed_artifacts[{index}].used")
        ensure_text(seed.get("reason"), f"plan.seed_artifacts[{index}].reason")
    query_lanes = ensure_list(plan.get("query_lanes"), "plan.query_lanes")
    for index, entry in enumerate(query_lanes):
        lane = ensure_object(entry, f"plan.query_lanes[{index}]")
        ensure_allowed_keys(
            lane,
            f"plan.query_lanes[{index}]",
            required={"lane", "queries", "rationale"},
        )
        lane_name = ensure_text(lane.get("lane"), f"plan.query_lanes[{index}].lane")
        if lane_name not in QUERY_LANES:
            raise ContractError(
                "invalid_stage_payload", f"Invalid query lane: {lane_name}"
            )
        ensure_string_list(lane.get("queries"), f"plan.query_lanes[{index}].queries")
        ensure_text(lane.get("rationale"), f"plan.query_lanes[{index}].rationale")
    source_lanes = ensure_list(plan.get("source_lanes"), "plan.source_lanes")
    for index, entry in enumerate(source_lanes):
        source = ensure_object(entry, f"plan.source_lanes[{index}]")
        ensure_allowed_keys(
            source,
            f"plan.source_lanes[{index}]",
            required={"source", "source_class", "role", "fallback_sources"},
        )
        ensure_text(source.get("source"), f"plan.source_lanes[{index}].source")
        source_class = ensure_text(
            source.get("source_class"),
            f"plan.source_lanes[{index}].source_class",
        )
        if source_class not in SOURCE_CLASSES:
            raise ContractError(
                "invalid_stage_payload",
                f"Invalid plan.source_lanes[{index}].source_class: {source_class}",
            )
        role = ensure_text(source.get("role"), f"plan.source_lanes[{index}].role")
        if role not in SOURCE_LANE_ROLES:
            raise ContractError(
                "invalid_stage_payload",
                f"Invalid plan.source_lanes[{index}].role: {role}",
            )
        ensure_string_list(
            source.get("fallback_sources"),
            f"plan.source_lanes[{index}].fallback_sources",
            minimum=0,
        )
    ensure_string_list(plan.get("inclusion_criteria"), "plan.inclusion_criteria")
    ensure_string_list(
        plan.get("exclusion_criteria"),
        "plan.exclusion_criteria",
        minimum=0,
    )
    candidate_policy = ensure_object(
        plan.get("candidate_policy"), "plan.candidate_policy"
    )
    ensure_allowed_keys(
        candidate_policy,
        "plan.candidate_policy",
        required={"tiers", "material_conflict", "batch_size"},
    )
    tiers = set(
        ensure_string_list(candidate_policy.get("tiers"), "plan.candidate_policy.tiers")
    )
    if tiers != CANDIDATE_TIERS:
        raise ContractError(
            "invalid_stage_payload",
            "plan.candidate_policy.tiers must contain every candidate tier",
        )
    if candidate_policy.get("material_conflict") != "keep_separate":
        raise ContractError(
            "invalid_stage_payload",
            "plan.candidate_policy.material_conflict must be keep_separate",
        )
    ensure_integer(
        candidate_policy.get("batch_size"),
        "plan.candidate_policy.batch_size",
        minimum=1,
    )
    breadth = ensure_text(plan.get("breadth"), "plan.breadth")
    if breadth not in {"broad", "balanced", "quick"}:
        raise ContractError("invalid_stage_payload", f"Invalid plan.breadth: {breadth}")
    ensure_string_list(plan.get("stop_conditions"), "plan.stop_conditions")
    if plan.get("pdf_policy") != "three_route_public_identity_matched":
        raise ContractError(
            "invalid_stage_payload",
            "plan.pdf_policy must be three_route_public_identity_matched",
        )


def apply_search_plan(state: dict[str, Any], payload: dict[str, Any]) -> None:
    validate_search_plan(payload)
    state["search_plan_approved"] = True
    state["search_plan"] = payload["plan"]
    state["search_plan_hash"] = stable_hash(payload["plan"])


def validate_source_evidence(value: Any, label: str) -> dict[str, Any]:
    evidence = ensure_object(value, label)
    ensure_allowed_keys(
        evidence,
        label,
        required={"source", "url", "source_role", "reason", "facts"},
        optional={"query_lane", "raw_title", "identifier"},
    )
    ensure_text(evidence.get("source"), f"{label}.source")
    url = ensure_text(evidence.get("url"), f"{label}.url")
    if not url.startswith(("http://", "https://")):
        raise ContractError(
            "invalid_stage_payload", f"{label}.url must be public HTTP(S)"
        )
    source_role = ensure_text(evidence.get("source_role"), f"{label}.source_role")
    if source_role not in SOURCE_EVIDENCE_ROLES:
        raise ContractError(
            "invalid_stage_payload", f"Invalid {label}.source_role: {source_role}"
        )
    ensure_text(evidence.get("reason"), f"{label}.reason")
    ensure_string_list(evidence.get("facts"), f"{label}.facts")
    if "query_lane" in evidence:
        lane = ensure_text(evidence.get("query_lane"), f"{label}.query_lane")
        if lane not in QUERY_LANES:
            raise ContractError(
                "invalid_stage_payload", f"Invalid {label}.query_lane: {lane}"
            )
    return evidence


def validate_candidate(value: Any, label: str) -> tuple[str, dict[str, Any]]:
    candidate = ensure_object(value, label)
    ensure_allowed_keys(
        candidate,
        label,
        required={
            "candidate_id",
            "tier",
            "title",
            "alternate_titles",
            "creators_display",
            "year",
            "container",
            "original_language",
            "material_version",
            "identifiers",
            "identity",
            "discovery_sources",
            "matching_evidence",
            "duplicate_status",
            "missing_fields",
            "recommendation_reason",
        },
        optional={"landing_url"},
    )
    candidate_id = ensure_text(candidate.get("candidate_id"), f"{label}.candidate_id")
    tier = ensure_text(candidate.get("tier"), f"{label}.tier")
    if tier not in CANDIDATE_TIERS:
        raise ContractError("invalid_stage_payload", f"Invalid candidate tier: {tier}")
    ensure_text(candidate.get("title"), f"{label}.title")
    ensure_string_list(
        candidate.get("alternate_titles"), f"{label}.alternate_titles", minimum=0
    )
    ensure_string_list(
        candidate.get("creators_display"), f"{label}.creators_display", minimum=0
    )
    if not isinstance(candidate.get("year"), str):
        raise ContractError("invalid_stage_payload", f"{label}.year must be a string")
    if not isinstance(candidate.get("container"), str):
        raise ContractError(
            "invalid_stage_payload", f"{label}.container must be a string"
        )
    ensure_text(candidate.get("original_language"), f"{label}.original_language")
    ensure_text(candidate.get("material_version"), f"{label}.material_version")
    identifiers = ensure_object(
        candidate.get("identifiers"), f"{label}.identifiers", allow_empty=True
    )
    if set(identifiers) - {"doi", "isbn", "pmid", "arxiv"}:
        raise ContractError(
            "invalid_stage_payload", f"{label}.identifiers has unsupported keys"
        )
    for key, identifier in identifiers.items():
        ensure_text(identifier, f"{label}.identifiers.{key}")
    identity = ensure_object(candidate.get("identity"), f"{label}.identity")
    ensure_allowed_keys(
        identity,
        f"{label}.identity",
        required={"strong_keys", "weak_key"},
    )
    ensure_string_list(
        identity.get("strong_keys"), f"{label}.identity.strong_keys", minimum=0
    )
    ensure_text(identity.get("weak_key"), f"{label}.identity.weak_key")
    sources = ensure_list(
        candidate.get("discovery_sources"), f"{label}.discovery_sources"
    )
    for index, source in enumerate(sources):
        validate_source_evidence(source, f"{label}.discovery_sources[{index}]")
    matching = ensure_list(
        candidate.get("matching_evidence"), f"{label}.matching_evidence"
    )
    for index, entry in enumerate(matching):
        evidence = ensure_object(entry, f"{label}.matching_evidence[{index}]")
        ensure_allowed_keys(
            evidence,
            f"{label}.matching_evidence[{index}]",
            required={"field", "value", "source"},
        )
        for field in ("field", "value", "source"):
            ensure_text(
                evidence.get(field), f"{label}.matching_evidence[{index}].{field}"
            )
    if tier != "lead_only":
        landing_url = ensure_text(candidate.get("landing_url"), f"{label}.landing_url")
        if not landing_url.startswith(("http://", "https://")):
            raise ContractError(
                "invalid_stage_payload", f"{label}.landing_url must be public HTTP(S)"
            )
    duplicate_status = ensure_text(
        candidate.get("duplicate_status"), f"{label}.duplicate_status"
    )
    if duplicate_status not in DUPLICATE_STATUSES:
        raise ContractError(
            "invalid_stage_payload",
            f"Invalid {label}.duplicate_status: {duplicate_status}",
        )
    ensure_string_list(
        candidate.get("missing_fields"), f"{label}.missing_fields", minimum=0
    )
    ensure_text(
        candidate.get("recommendation_reason"), f"{label}.recommendation_reason"
    )
    return candidate_id, candidate


def apply_discovery(
    state: dict[str, Any],
    payload: dict[str, Any],
    payload_path: str | Path,
) -> None:
    ensure_allowed_keys(
        payload,
        "discovery action",
        required={
            "action",
            "discovery_round",
            "query_attempts",
            "candidates",
            "uncovered_gaps",
            "source_failures",
            "deduplication_summary",
            "stop_reason",
        },
    )
    discovery_round = ensure_integer(
        payload.get("discovery_round"), "discovery_round", minimum=1
    )
    if discovery_round != state.get("discovery_round"):
        raise ContractError(
            "invalid_stage_payload",
            f"Discovery payload round {discovery_round} does not match current round "
            f"{state.get('discovery_round')}",
        )
    attempts = ensure_list(payload.get("query_attempts"), "query_attempts")
    for index, entry in enumerate(attempts):
        attempt = ensure_object(entry, f"query_attempts[{index}]")
        ensure_allowed_keys(
            attempt,
            f"query_attempts[{index}]",
            required={"lane", "query", "source", "status", "result_count"},
            optional={"message"},
        )
        lane = ensure_text(attempt.get("lane"), f"query_attempts[{index}].lane")
        if lane not in QUERY_LANES:
            raise ContractError(
                "invalid_stage_payload", f"Invalid query attempt lane: {lane}"
            )
        ensure_text(attempt.get("query"), f"query_attempts[{index}].query")
        ensure_text(attempt.get("source"), f"query_attempts[{index}].source")
        status = ensure_text(attempt.get("status"), f"query_attempts[{index}].status")
        if status not in DISCOVERY_ATTEMPT_STATUSES:
            raise ContractError(
                "invalid_stage_payload", f"Invalid query attempt status: {status}"
            )
        ensure_integer(
            attempt.get("result_count"),
            f"query_attempts[{index}].result_count",
        )
    candidates = ensure_list(payload.get("candidates"), "candidates", allow_empty=True)
    candidate_map: dict[str, Any] = {}
    for index, candidate in enumerate(candidates):
        candidate_id, value = validate_candidate(candidate, f"candidates[{index}]")
        if candidate_id in candidate_map:
            raise ContractError(
                "invalid_stage_payload", f"Duplicate candidate_id: {candidate_id}"
            )
        candidate_map[candidate_id] = value
    previous_candidates = ensure_object(
        state.get("candidates"), "state.candidates", allow_empty=True
    )
    missing_candidate_ids = sorted(set(previous_candidates) - set(candidate_map))
    if missing_candidate_ids:
        raise ContractError(
            "invalid_stage_payload",
            "Cumulative discovery payload omitted existing candidates: "
            + ", ".join(missing_candidate_ids),
        )
    for candidate_id, previous in previous_candidates.items():
        previous_sources = {
            stable_hash(entry) for entry in previous.get("discovery_sources", [])
        }
        current_sources = {
            stable_hash(entry)
            for entry in candidate_map[candidate_id].get("discovery_sources", [])
        }
        if not previous_sources.issubset(current_sources):
            raise ContractError(
                "invalid_stage_payload",
                f"Cumulative discovery payload removed evidence for {candidate_id}",
            )
    ensure_string_list(payload.get("uncovered_gaps"), "uncovered_gaps", minimum=0)
    source_failures = ensure_list(
        payload.get("source_failures"), "source_failures", allow_empty=True
    )
    for index, entry in enumerate(source_failures):
        failure = ensure_object(entry, f"source_failures[{index}]")
        ensure_allowed_keys(
            failure,
            f"source_failures[{index}]",
            required={"source", "reason"},
            optional={"fallback_used"},
        )
        ensure_text(failure.get("source"), f"source_failures[{index}].source")
        ensure_text(failure.get("reason"), f"source_failures[{index}].reason")
    deduplication = ensure_object(
        payload.get("deduplication_summary"), "deduplication_summary"
    )
    ensure_allowed_keys(
        deduplication,
        "deduplication_summary",
        required={
            "source_record_count",
            "unique_candidate_count",
            "merged_record_count",
            "unresolved_conflict_count",
        },
    )
    for field in (
        "source_record_count",
        "unique_candidate_count",
        "merged_record_count",
        "unresolved_conflict_count",
    ):
        ensure_integer(deduplication.get(field), f"deduplication_summary.{field}")
    if deduplication.get("unique_candidate_count") != len(candidate_map):
        raise ContractError(
            "invalid_stage_payload",
            "deduplication_summary.unique_candidate_count must match candidates",
        )
    ensure_text(payload.get("stop_reason"), "stop_reason")
    state["candidates"] = candidate_map
    state["discovery"] = {
        "payload_hash": stable_hash(payload),
        "payload_path": Path(payload_path).resolve().as_posix(),
        "discovery_round": discovery_round,
        "candidate_ids": list(candidate_map),
        "stop_reason": payload["stop_reason"],
    }
    state["last_discovery_round"] = discovery_round
    state["discovery_rounds"].append(state["discovery"])


def apply_ingest_scope(state: dict[str, Any], payload: dict[str, Any]) -> None:
    ensure_allowed_keys(
        payload,
        "ingest scope action",
        required={
            "action",
            "approved",
            "discovery_round",
            "candidate_ids",
            "excluded_candidate_ids",
            "authorization_notice_acknowledged",
        },
    )
    if payload.get("approved") is not True:
        raise ContractError(
            "invalid_stage_payload", "Ingest scope approval requires approved=true"
        )
    discovery_round = ensure_integer(
        payload.get("discovery_round"), "discovery_round", minimum=1
    )
    if discovery_round != state.get("discovery_round"):
        raise ContractError(
            "invalid_stage_payload",
            "Ingest scope must approve the current discovery round",
        )
    if payload.get("authorization_notice_acknowledged") is not True:
        raise ContractError(
            "invalid_stage_payload",
            "Ingest scope requires authorization_notice_acknowledged=true",
        )
    candidate_ids = ensure_string_list(payload.get("candidate_ids"), "candidate_ids")
    excluded_candidate_ids = ensure_string_list(
        payload.get("excluded_candidate_ids"),
        "excluded_candidate_ids",
        minimum=0,
    )
    overlap = sorted(set(candidate_ids) & set(excluded_candidate_ids))
    if overlap:
        raise ContractError(
            "invalid_stage_payload",
            "Approved and excluded candidate ids overlap: " + ", ".join(overlap),
        )
    candidates = ensure_object(state.get("candidates"), "state.candidates")
    for candidate_id in candidate_ids:
        candidate = candidates.get(candidate_id)
        if not candidate:
            raise ContractError(
                "invalid_stage_payload", f"Unknown candidate_id: {candidate_id}"
            )
        if candidate.get("tier") == "lead_only":
            raise ContractError(
                "invalid_stage_payload",
                f"lead_only candidate cannot be ingested: {candidate_id}",
            )
    state["ingest_scope_approved"] = True
    state["approved_candidate_ids"] = list(dict.fromkeys(candidate_ids))
    state["excluded_candidate_ids"] = excluded_candidate_ids
    state["ingest_scope_hash"] = stable_hash(state["approved_candidate_ids"])


def apply_discovery_expansion(
    state: dict[str, Any],
    payload: dict[str, Any],
) -> None:
    ensure_allowed_keys(
        payload,
        "discovery expansion action",
        required={"action", "discovery_round", "gap_requests"},
    )
    discovery_round = ensure_integer(
        payload.get("discovery_round"), "discovery_round", minimum=1
    )
    if discovery_round != state.get("discovery_round"):
        raise ContractError(
            "invalid_stage_payload",
            "Discovery expansion must target the current discovery round",
        )
    gap_requests = ensure_list(payload.get("gap_requests"), "gap_requests")
    for index, entry in enumerate(gap_requests):
        request = ensure_object(entry, f"gap_requests[{index}]")
        ensure_allowed_keys(
            request,
            f"gap_requests[{index}]",
            required={"gap_type", "description", "requested_lanes"},
        )
        gap_type = ensure_text(
            request.get("gap_type"), f"gap_requests[{index}].gap_type"
        )
        if gap_type not in GAP_TYPES:
            raise ContractError(
                "invalid_stage_payload",
                f"Invalid gap_requests[{index}].gap_type: {gap_type}",
            )
        ensure_text(request.get("description"), f"gap_requests[{index}].description")
        lanes = ensure_string_list(
            request.get("requested_lanes"),
            f"gap_requests[{index}].requested_lanes",
        )
        invalid_lanes = sorted(set(lanes) - QUERY_LANES)
        if invalid_lanes:
            raise ContractError(
                "invalid_stage_payload",
                "Invalid discovery expansion lanes: " + ", ".join(invalid_lanes),
            )
    state["expansion_requests"].append(
        {
            "discovery_round": discovery_round,
            "gap_requests": gap_requests,
            "payload_hash": stable_hash(payload),
        }
    )
    state["discovery_round"] = discovery_round + 1


def apply_cancel(state: dict[str, Any], payload: dict[str, Any]) -> None:
    ensure_allowed_keys(
        payload,
        "cancel action",
        required={"action", "reason", "message"},
    )
    if payload.get("reason") != "user_cancelled":
        raise ContractError(
            "invalid_stage_payload", "cancel_workflow reason must be user_cancelled"
        )
    message = ensure_text(payload.get("message"), "message")
    canceled_stage = derive_stage(state)
    state["status"] = "canceled"
    state["cancellation"] = {
        "reason": "user_cancelled",
        "message": message,
        "stage": canceled_stage,
        "discovery_round": state.get("discovery_round"),
    }


def has_authoritative_evidence(evidence: list[Any]) -> bool:
    for entry in evidence:
        if not isinstance(entry, dict):
            continue
        if entry.get("source_role") != "authoritative":
            continue
        url = str(entry.get("url") or "").strip()
        if url.startswith(("http://", "https://")):
            return True
    return False


def is_chinese_metadata(metadata: dict[str, Any]) -> bool:
    original = metadata.get("originalTitle")
    fields = metadata.get("fields")
    language_values = [
        metadata.get("language"),
        original.get("language") if isinstance(original, dict) else "",
        fields.get("language") if isinstance(fields, dict) else "",
    ]
    script = original.get("script") if isinstance(original, dict) else ""
    title_values = [
        original.get("value") if isinstance(original, dict) else "",
        fields.get("title") if isinstance(fields, dict) else "",
    ]
    return (
        any(str(value or "").lower().startswith("zh") for value in language_values)
        or script in {"Hans", "Hant"}
        or any(contains_han(value) for value in title_values)
    )


def contains_han(value: Any) -> bool:
    return any("\u3400" <= character <= "\u9fff" for character in str(value or ""))


def validate_chinese_metadata(
    metadata: dict[str, Any],
    warnings: list[Any],
    needs_curation: Any,
) -> None:
    original = ensure_object(metadata.get("originalTitle"), "metadata.originalTitle")
    original_value = ensure_text(original.get("value"), "metadata.originalTitle.value")
    if not contains_han(original_value):
        raise ContractError(
            "invalid_stage_payload",
            "Chinese originalTitle must preserve the native-script title",
        )
    fields = ensure_object(metadata.get("fields"), "metadata.fields")
    if ensure_text(fields.get("title"), "metadata.fields.title") != original_value:
        raise ContractError(
            "invalid_stage_payload",
            "Chinese primary title must equal the authoritative originalTitle",
        )
    creators = ensure_list(
        metadata.get("creators"), "metadata.creators", allow_empty=True
    )
    completeness = ensure_text(
        metadata.get("creatorCompleteness"), "metadata.creatorCompleteness"
    )
    if completeness == "complete":
        if not creators:
            raise ContractError(
                "invalid_stage_payload", "Complete creators must not be empty"
            )
        for creator in creators:
            value = ensure_object(creator, "metadata.creators[]")
            name = ensure_text(value.get("name"), "metadata.creators[].name")
            if not contains_han(name):
                raise ContractError(
                    "invalid_stage_payload",
                    "Complete Chinese creators must preserve native-script names",
                )
            if value.get("firstName") or value.get("lastName"):
                raise ContractError(
                    "invalid_stage_payload",
                    "Chinese creators must use the single name field",
                )
    elif completeness in {"incomplete", "unknown"}:
        if creators:
            raise ContractError(
                "invalid_stage_payload",
                "Unverified Chinese creators must use an empty replacement list",
            )
        warning_codes = {
            str(entry.get("code") or "")
            for entry in warnings
            if isinstance(entry, dict)
        }
        if (
            "native_creator_names_unverified" not in warning_codes
            or needs_curation is not True
        ):
            raise ContractError(
                "invalid_stage_payload",
                "Unverified Chinese creators require a warning and needs_curation=true",
            )
    else:
        raise ContractError("invalid_stage_payload", "Invalid creatorCompleteness")


def validate_metadata_payload(state: dict[str, Any], payload: dict[str, Any]) -> None:
    candidate_id = ensure_text(payload.get("candidate_id"), "candidate_id")
    if candidate_id != pending_metadata_candidate(state):
        raise ContractError(
            "invalid_stage_payload",
            f"Metadata payload must target {pending_metadata_candidate(state)}",
        )
    status = ensure_text(payload.get("status"), "status")
    if status == "not_attempted":
        ensure_allowed_keys(
            payload,
            "metadata not_attempted action",
            required={
                "action",
                "candidate_id",
                "status",
                "reason_code",
                "reason",
                "checked_sources",
                "evidence",
                "warnings",
            },
        )
        reason_code = ensure_text(payload.get("reason_code"), "reason_code")
        if reason_code not in METADATA_NOT_ATTEMPTED_REASONS:
            raise ContractError(
                "invalid_stage_payload",
                f"Invalid metadata not_attempted reason_code: {reason_code}",
            )
        ensure_text(payload.get("reason"), "reason")
        ensure_string_list(payload.get("checked_sources"), "checked_sources")
        evidence = ensure_list(payload.get("evidence"), "evidence", allow_empty=True)
        for index, entry in enumerate(evidence):
            validate_source_evidence(entry, f"evidence[{index}]")
        warnings = ensure_list(payload.get("warnings"), "warnings", allow_empty=True)
        for index, entry in enumerate(warnings):
            warning = ensure_object(entry, f"warnings[{index}]")
            ensure_allowed_keys(
                warning,
                f"warnings[{index}]",
                required={"code", "message"},
            )
            ensure_text(warning.get("code"), f"warnings[{index}].code")
            ensure_text(warning.get("message"), f"warnings[{index}].message")
        return
    if status != "qualified":
        raise ContractError(
            "invalid_stage_payload",
            "Metadata status must be qualified or not_attempted",
        )
    ensure_allowed_keys(
        payload,
        "qualified metadata action",
        required={
            "action",
            "candidate_id",
            "status",
            "identifier_status",
            "checked_sources",
            "match",
            "metadata",
            "evidence",
            "warnings",
            "needs_curation",
        },
        optional={"corroborating_signals"},
    )
    identifier_status = ensure_text(
        payload.get("identifier_status"), "identifier_status"
    )
    if identifier_status not in {"resolved", "identifier_not_found"}:
        raise ContractError(
            "invalid_stage_payload",
            f"Invalid identifier_status: {identifier_status}",
        )
    ensure_string_list(payload.get("checked_sources"), "checked_sources")
    match = ensure_object(payload.get("match"), "match")
    ensure_allowed_keys(
        match,
        "match",
        required={"method", "direct_work", "material_conflict"},
        optional={"normalized_identifier"},
    )
    method = ensure_text(match.get("method"), "match.method")
    if method not in {"identifier", "title"}:
        raise ContractError(
            "invalid_stage_payload", "match.method must be identifier or title"
        )
    if match.get("direct_work") is not True:
        raise ContractError(
            "invalid_stage_payload", "Metadata must match the same direct work"
        )
    if match.get("material_conflict") is not False:
        raise ContractError(
            "invalid_stage_payload", "Material conflicts must be resolved before ingest"
        )
    metadata = ensure_object(payload.get("metadata"), "metadata")
    ensure_allowed_keys(
        metadata,
        "metadata",
        required={
            "itemType",
            "originalTitle",
            "alternateTitles",
            "language",
            "script",
            "creatorCompleteness",
            "fields",
            "creators",
            "identifiers",
            "containers",
            "landingUrl",
        },
    )
    ensure_text(metadata.get("itemType"), "metadata.itemType")
    original_title = ensure_object(
        metadata.get("originalTitle"), "metadata.originalTitle"
    )
    ensure_allowed_keys(
        original_title,
        "metadata.originalTitle",
        required={"value", "language", "script"},
    )
    original_title_value = ensure_text(
        original_title.get("value"), "metadata.originalTitle.value"
    )
    ensure_text(original_title.get("language"), "metadata.originalTitle.language")
    ensure_text(original_title.get("script"), "metadata.originalTitle.script")
    alternate_titles = ensure_list(
        metadata.get("alternateTitles"),
        "metadata.alternateTitles",
        allow_empty=True,
    )
    for index, entry in enumerate(alternate_titles):
        alternate = ensure_object(entry, f"metadata.alternateTitles[{index}]")
        ensure_allowed_keys(
            alternate,
            f"metadata.alternateTitles[{index}]",
            required={"value", "role", "language", "script"},
        )
        for field in ("value", "language", "script"):
            ensure_text(
                alternate.get(field), f"metadata.alternateTitles[{index}].{field}"
            )
        role = ensure_text(
            alternate.get("role"), f"metadata.alternateTitles[{index}].role"
        )
        if role not in ALTERNATE_TITLE_ROLES:
            raise ContractError(
                "invalid_stage_payload",
                f"Invalid metadata.alternateTitles[{index}].role: {role}",
            )
    ensure_text(metadata.get("language"), "metadata.language")
    ensure_text(metadata.get("script"), "metadata.script")
    fields = ensure_object(metadata.get("fields"), "metadata.fields")
    if (
        ensure_text(fields.get("title"), "metadata.fields.title")
        != original_title_value
    ):
        raise ContractError(
            "invalid_stage_payload",
            "metadata.fields.title must preserve metadata.originalTitle.value",
        )
    creators = ensure_list(
        metadata.get("creators"), "metadata.creators", allow_empty=True
    )
    creator_completeness = ensure_text(
        metadata.get("creatorCompleteness"), "metadata.creatorCompleteness"
    )
    if creator_completeness == "complete":
        if not creators:
            raise ContractError(
                "invalid_stage_payload", "Complete creators must not be empty"
            )
    elif creator_completeness in {"incomplete", "unknown"}:
        if creators:
            raise ContractError(
                "invalid_stage_payload",
                "Incomplete or unknown creators must use an empty replacement list",
            )
    else:
        raise ContractError(
            "invalid_stage_payload", "Invalid metadata.creatorCompleteness"
        )
    for index, entry in enumerate(creators):
        creator = ensure_object(entry, f"metadata.creators[{index}]")
        ensure_text(
            creator.get("creatorType"), f"metadata.creators[{index}].creatorType"
        )
        has_name = bool(str(creator.get("name") or "").strip())
        has_last_name = bool(str(creator.get("lastName") or "").strip())
        if has_name == has_last_name:
            raise ContractError(
                "invalid_stage_payload",
                "Each creator must use either name or lastName, but not both",
            )
        ensure_allowed_keys(
            creator,
            f"metadata.creators[{index}]",
            required={"creatorType", "name"}
            if has_name
            else {"creatorType", "lastName"},
            optional=set() if has_name else {"firstName"},
        )
    landing_url = ensure_text(metadata.get("landingUrl"), "metadata.landingUrl")
    if not landing_url.startswith(("http://", "https://")):
        raise ContractError(
            "invalid_stage_payload",
            "metadata.landingUrl must be public HTTP(S)",
        )
    identifiers = ensure_object(
        metadata.get("identifiers"), "metadata.identifiers", allow_empty=True
    )
    if set(identifiers) - {"doi", "isbn", "pmid", "arxiv"}:
        raise ContractError(
            "invalid_stage_payload", "metadata.identifiers has unsupported keys"
        )
    for key, identifier in identifiers.items():
        ensure_text(identifier, f"metadata.identifiers.{key}")
    if "DOI" in fields:
        raise ContractError(
            "invalid_stage_payload",
            "DOI must be recorded only in metadata.identifiers.doi",
        )
    extra_lines = str(fields.get("extra") or "").splitlines()
    if any(line.strip().lower().startswith("doi:") for line in extra_lines):
        raise ContractError(
            "invalid_stage_payload",
            "DOI must not be recorded in metadata.fields.extra",
        )
    containers = ensure_list(
        metadata.get("containers"), "metadata.containers", allow_empty=True
    )
    for index, entry in enumerate(containers):
        container = ensure_object(entry, f"metadata.containers[{index}]")
        ensure_allowed_keys(
            container,
            f"metadata.containers[{index}]",
            required={"role", "title"},
        )
        role = ensure_text(container.get("role"), f"metadata.containers[{index}].role")
        if role not in CONTAINER_ROLES:
            raise ContractError(
                "invalid_stage_payload",
                f"Invalid metadata.containers[{index}].role: {role}",
            )
        ensure_text(container.get("title"), f"metadata.containers[{index}].title")
    evidence = ensure_list(payload.get("evidence"), "evidence")
    for index, entry in enumerate(evidence):
        validate_source_evidence(entry, f"evidence[{index}]")
    if not has_authoritative_evidence(evidence):
        raise ContractError(
            "invalid_stage_payload",
            "Metadata requires authoritative public landing evidence",
        )
    if method == "identifier":
        normalized_identifier = ensure_object(
            match.get("normalized_identifier"), "match.normalized_identifier"
        )
        ensure_allowed_keys(
            normalized_identifier,
            "match.normalized_identifier",
            required={"type", "value"},
        )
        identifier_type = ensure_text(
            normalized_identifier.get("type"), "match.normalized_identifier.type"
        )
        identifier_key = {
            "DOI": "doi",
            "ISBN": "isbn",
            "PMID": "pmid",
            "arXiv": "arxiv",
        }.get(identifier_type)
        if not identifier_key:
            raise ContractError(
                "invalid_stage_payload",
                f"Unsupported normalized identifier type: {identifier_type}",
            )
        normalized_identifier_value = ensure_text(
            normalized_identifier.get("value"), "match.normalized_identifier.value"
        )
        if not any(str(value or "").strip() for value in identifiers.values()):
            raise ContractError(
                "invalid_stage_payload",
                "Identifier match requires a normalized identifier",
            )
        actual_identifier = str(identifiers.get(identifier_key) or "").strip()
        if identifier_key == "doi":
            actual_identifier = normalized_doi(actual_identifier)
            normalized_identifier_value = normalized_doi(normalized_identifier_value)
        if actual_identifier != normalized_identifier_value:
            raise ContractError(
                "invalid_stage_payload",
                "match.normalized_identifier must equal metadata.identifiers",
            )
        if candidate_id.startswith("doi:"):
            expected = normalized_doi(candidate_id[4:])
            actual = normalized_doi(identifiers.get("doi"))
            if not actual or actual != expected:
                raise ContractError(
                    "invalid_stage_payload",
                    "Resolved DOI does not match candidate identity",
                )
    else:
        signals = set(
            ensure_string_list(
                payload.get("corroborating_signals"),
                "corroborating_signals",
                minimum=2,
            )
        )
        if len(signals) < 2:
            raise ContractError(
                "invalid_stage_payload",
                "Title match requires at least two independent corroborating signals",
            )
    warnings = ensure_list(payload.get("warnings"), "warnings", allow_empty=True)
    for index, entry in enumerate(warnings):
        warning = ensure_object(entry, f"warnings[{index}]")
        ensure_allowed_keys(
            warning,
            f"warnings[{index}]",
            required={"code", "message"},
        )
        ensure_text(warning.get("code"), f"warnings[{index}].code")
        ensure_text(warning.get("message"), f"warnings[{index}].message")
    needs_curation = ensure_bool(payload.get("needs_curation"), "needs_curation")
    if creator_completeness in {"incomplete", "unknown"}:
        warning_codes = {
            str(entry.get("code") or "")
            for entry in warnings
            if isinstance(entry, dict)
        }
        if (
            "native_creator_names_unverified" not in warning_codes
            or needs_curation is not True
        ):
            raise ContractError(
                "invalid_stage_payload",
                "Unverified creators require native_creator_names_unverified and needs_curation=true",
            )
    if is_chinese_metadata(metadata):
        validate_chinese_metadata(metadata, warnings, payload.get("needs_curation"))


def apply_metadata(
    state: dict[str, Any],
    payload: dict[str, Any],
    payload_path: str | Path,
) -> None:
    validate_metadata_payload(state, payload)
    candidate_id = payload["candidate_id"]
    state["metadata"][candidate_id] = {
        "status": payload["status"],
        "payload_hash": stable_hash(payload),
        "payload_path": Path(payload_path).resolve().as_posix(),
        "required_pdf_routes": PDF_ROUTE_ORDER
        if payload["status"] == "qualified"
        else [],
        "reason_code": payload.get("reason_code", ""),
    }


def validate_pdf_payload(
    state: dict[str, Any], payload: dict[str, Any]
) -> tuple[str, str]:
    ensure_allowed_keys(
        payload,
        "PDF probe action",
        required={"action", "candidate_id", "attempts"},
    )
    candidate_id = ensure_text(payload.get("candidate_id"), "candidate_id")
    if candidate_id != pending_pdf_candidate(state):
        raise ContractError(
            "invalid_stage_payload",
            f"PDF payload must target {pending_pdf_candidate(state)}",
        )
    attempts = ensure_list(payload.get("attempts"), "attempts")
    by_route: dict[str, dict[str, Any]] = {}
    found_url = ""
    for attempt in attempts:
        value = ensure_object(attempt, "attempt")
        route = ensure_text(value.get("route"), "attempt.route")
        if route in by_route:
            raise ContractError(
                "invalid_stage_payload", f"Duplicate PDF route: {route}"
            )
        status = ensure_text(value.get("status"), "attempt.status")
        if status not in TERMINAL_PDF_STATUSES:
            raise ContractError(
                "invalid_stage_payload", f"Invalid PDF attempt status: {status}"
            )
        ensure_text(value.get("source"), "attempt.source")
        ensure_text(value.get("query_or_url"), "attempt.query_or_url")
        if route not in PDF_ROUTE_ORDER:
            raise ContractError("invalid_stage_payload", f"Invalid PDF route: {route}")
        ensure_bool(value.get("identity_match"), "attempt.identity_match")
        ensure_bool(value.get("legal_source"), "attempt.legal_source")
        ensure_bool(value.get("reachable"), "attempt.reachable")
        required_keys = {
            "route",
            "source",
            "query_or_url",
            "status",
            "identity_match",
            "legal_source",
            "reachable",
        }
        optional_keys = {"content_type", "landing_url", "notes"}
        if status == "found":
            required_keys.update({"pdf_url", "content_type"})
            if value.get("identity_match") is not True:
                raise ContractError(
                    "invalid_stage_payload", "Found PDF must have identity_match=true"
                )
            if value.get("legal_source") is not True:
                raise ContractError(
                    "invalid_stage_payload", "Found PDF must use a legal public source"
                )
            if value.get("reachable") is not True:
                raise ContractError(
                    "invalid_stage_payload", "Found PDF must be reachable"
                )
            pdf_url = ensure_text(value.get("pdf_url"), "attempt.pdf_url")
            if not pdf_url.startswith(("http://", "https://")):
                raise ContractError(
                    "invalid_stage_payload", "PDF URL must be public HTTP(S)"
                )
            content_type = ensure_text(
                value.get("content_type"), "attempt.content_type"
            ).lower()
            if not content_type.startswith("application/pdf"):
                raise ContractError(
                    "invalid_stage_payload",
                    "Found PDF must report an application/pdf content type",
                )
            optional_keys.add("pdf_url")
        ensure_allowed_keys(
            value,
            f"attempt[{route}]",
            required=required_keys,
            optional=optional_keys,
        )
        by_route[route] = value
    required = state["metadata"][candidate_id]["required_pdf_routes"]
    missing = [route for route in required if route not in by_route]
    if missing:
        raise ContractError(
            "invalid_stage_payload",
            "Missing applicable PDF route attempts: " + ", ".join(missing),
        )
    if len(by_route) != len(required):
        raise ContractError(
            "invalid_stage_payload",
            "PDF probe must contain exactly one attempt for every required route",
        )
    for route in PDF_ROUTE_ORDER:
        attempt = by_route.get(route, {})
        if attempt.get("status") == "found":
            found_url = str(attempt.get("pdf_url") or "")
            break
    return candidate_id, found_url


def apply_pdf(
    state: dict[str, Any],
    payload: dict[str, Any],
    payload_path: str | Path,
) -> None:
    candidate_id, found_url = validate_pdf_payload(state, payload)
    state["pdf"][candidate_id] = {
        "status": "found" if found_url else "missing",
        "pdf_url": found_url,
        "payload_hash": stable_hash(payload),
        "payload_path": Path(payload_path).resolve().as_posix(),
    }


def apply_stage_payload(
    state_path: str | Path,
    input_path: str | Path,
    payload_path: str | Path,
) -> dict[str, Any]:
    state = load_state(state_path, input_path)
    payload = read_json(payload_path)
    if replay_result(state, payload):
        return state
    action = ensure_text(payload.get("action"), "action")
    stage = derive_stage(state)
    allowed = {
        "stage_10_search_plan": {"approve_search_plan", "cancel_workflow"},
        "stage_20_discovery": {"record_discovery"},
        "stage_30_ingest_scope": {
            "approve_ingest_scope",
            "request_discovery_expansion",
            "cancel_workflow",
        },
        "stage_40_metadata_resolution": {"record_metadata"},
        "stage_50_pdf_probe": {"record_pdf_probe"},
    }.get(stage, set())
    if action not in allowed:
        raise ContractError(
            "invalid_stage_action",
            f"Stage {stage} accepts {', '.join(sorted(allowed)) or 'no payload action'}, not {action}",
        )
    if action == "approve_search_plan":
        apply_search_plan(state, payload)
    elif action == "record_discovery":
        apply_discovery(state, payload, payload_path)
    elif action == "request_discovery_expansion":
        apply_discovery_expansion(state, payload)
    elif action == "approve_ingest_scope":
        apply_ingest_scope(state, payload)
    elif action == "cancel_workflow":
        apply_cancel(state, payload)
    elif action == "record_metadata":
        apply_metadata(state, payload, payload_path)
    elif action == "record_pdf_probe":
        apply_pdf(state, payload, payload_path)
    record_event(state, payload, payload_path)
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
            "invalid_stage_action", "Ingest payloads are not ready to prepare"
        )
    run_root = run_root_for_state(state_path)
    prepared: dict[str, Any] = {}
    target_collection = str(
        state.get("parameter", {}).get("targetCollection") or ""
    ).strip()
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
        metadata = metadata_payload["metadata"]
        paper = {
            "itemType": metadata["itemType"],
            "fields": metadata["fields"],
            "creators": metadata.get("creators", []),
            "identifiers": metadata.get("identifiers", {}),
            "landingUrl": metadata.get("landingUrl", ""),
            "attachLandingUrlOnMissingPdf": True,
        }
        pdf_url = state.get("pdf", {}).get(candidate_id, {}).get("pdf_url")
        if pdf_url:
            paper["pdfUrl"] = pdf_url
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
    payload = read_json(
        ensure_text(prepared.get("payload_path"), "prepared.payload_path")
    )
    if stable_hash(payload) != prepared.get("payload_hash"):
        raise ContractError(
            "payload_hash_mismatch",
            f"Prepared ingest payload changed for {candidate_id}",
        )
    return payload


def receipt_status(receipt: dict[str, Any]) -> str:
    host_response = receipt.get("host_response")
    if isinstance(host_response, dict):
        return receipt_status(host_response)
    direct = receipt.get("ingestStatus") or receipt.get("status")
    if direct in INGEST_STATUSES:
        return str(direct)
    nested = receipt.get("result")
    if isinstance(nested, dict):
        ingest = nested.get("ingest")
        if isinstance(ingest, dict) and ingest.get("status") in INGEST_STATUSES:
            return str(ingest["status"])
        data = nested.get("data")
        if isinstance(data, dict):
            inner_result = data.get("result")
            if isinstance(inner_result, dict):
                ingest = inner_result.get("ingest")
                if isinstance(ingest, dict) and ingest.get("status") in INGEST_STATUSES:
                    return str(ingest["status"])
    raise ContractError(
        "invalid_ingest_receipt", "Receipt does not contain a supported ingest status"
    )


def record_ingest_receipt(
    state_path: str | Path,
    input_path: str | Path,
    receipt_path: str | Path,
) -> dict[str, Any]:
    state = load_state(state_path, input_path)
    receipt = read_json(receipt_path)
    receipt_digest = stable_hash(receipt)
    resolved_receipt_path = Path(receipt_path).resolve().as_posix()
    for event in state["events"]:
        if (
            isinstance(event, dict)
            and event.get("action") == "record_ingest_receipt"
            and event.get("payload_path") == resolved_receipt_path
        ):
            if event.get("payload_hash") == receipt_digest:
                return state
            raise ContractError(
                "conflicting_replay",
                "Ingest receipt was already accepted with different content",
            )
    if derive_stage(state) != "stage_70_ingest":
        raise ContractError(
            "invalid_stage_action", "No ingest receipt is currently expected"
        )
    candidate_id = pending_ingest_candidate(state)
    expected_receipt_path = (
        run_root_for_state(state_path)
        / "runtime"
        / "host"
        / f"ingest-{len(state.get('receipts', {})) + 1:03d}.json"
    ).resolve()
    if Path(receipt_path).resolve() != expected_receipt_path:
        raise ContractError(
            "invalid_ingest_receipt",
            f"Receipt must use the gate-issued path: {expected_receipt_path}",
        )
    receipt_candidate_id = ensure_text(
        receipt.get("candidate_id"), "receipt.candidate_id"
    )
    if receipt_candidate_id != candidate_id:
        raise ContractError(
            "invalid_ingest_receipt",
            f"Receipt candidate_id must be {candidate_id}",
        )
    prepared_entry = state["prepared"][candidate_id]
    receipt_payload_hash = ensure_text(
        receipt.get("ingest_payload_hash"), "receipt.ingest_payload_hash"
    )
    if receipt_payload_hash != prepared_entry.get("payload_hash"):
        raise ContractError(
            "invalid_ingest_receipt",
            "Receipt ingest_payload_hash does not match the gate-issued payload",
        )
    validated_prepared_payload(state, candidate_id)
    status = receipt_status(receipt)
    state["receipts"][candidate_id] = {
        "status": status,
        "receipt_path": resolved_receipt_path,
        "receipt_hash": receipt_digest,
    }
    state["events"].append(
        {
            "action": "record_ingest_receipt",
            "action_key": f"record_ingest_receipt:{candidate_id}",
            "payload_hash": receipt_digest,
            "payload_path": resolved_receipt_path,
        }
    )
    fatal_reason = str(receipt.get("reason") or "").strip()
    if fatal_reason in FATAL_INGEST_REASONS:
        if status != "failed":
            raise ContractError(
                "invalid_ingest_receipt",
                "A fatal ingest reason requires status=failed",
            )
        state["status"] = "canceled"
        state["cancellation"] = {
            "reason": fatal_reason,
            "message": ensure_text(receipt.get("message"), "receipt.message"),
            "stage": "stage_70_ingest",
            "candidate_id": candidate_id,
        }
    state["stage"] = derive_stage(state)
    atomic_write_json(state_path, state)
    return state
