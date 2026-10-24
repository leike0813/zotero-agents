from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
import tempfile
from pathlib import Path


STATE_RELATIVE = "runtime/literature-search-ingest-gate.json"
LEDGER_RELATIVE = "result/search-ledger.json"
ACQUISITION_STATUSES = {"ready", "failed", "skipped", "canceled", "not_attempted"}
FATAL_REASONS = {"host_unavailable", "approval_denied", "execution_blocked"}
CANCEL_REASONS = FATAL_REASONS | {"user_cancelled"}
FIXED_MESSAGES = {
    "approval_denied": "Zotero Host 未批准入库操作。",
    "execution_blocked": "Zotero Host 执行受阻，无法确认入库结果。",
    "host_unavailable": "Zotero Host 当前不可用。",
    "user_cancelled": "用户取消了文献入库。",
}
CORE_OPERATION = "literature.ingest"
ATTACHMENT_OPERATION = "attachments.create"
REASON_RE = re.compile(r"^[a-z][a-z0-9_]{0,63}$")


class ContractError(RuntimeError):
    def __init__(self, code: str, message: str):
        super().__init__(message)
        self.code = code


def canonical_json(value: object) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def stable_hash(value: object) -> str:
    return "sha256:" + hashlib.sha256(canonical_json(value).encode()).hexdigest()


def read_json(path: Path) -> object:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        raise ContractError("invalid_json", f"Cannot read JSON {path.name}: {error}") from error


def atomic_write_json(path: Path, value: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(
        "w", encoding="utf-8", dir=path.parent, delete=False
    ) as stream:
        stream.write(json.dumps(value, ensure_ascii=False, indent=2, sort_keys=True))
        stream.write("\n")
        temporary = Path(stream.name)
    temporary.replace(path)


def run_relative(run_root: Path, value: object, label: str) -> str:
    if value is None:
        return ""
    if not isinstance(value, str):
        raise ContractError("invalid_path", f"{label} must be a string")
    raw = value.strip()
    if not raw:
        return ""
    target = Path(raw)
    resolved = (target if target.is_absolute() else run_root / target).resolve()
    try:
        return resolved.relative_to(run_root).as_posix()
    except ValueError as error:
        raise ContractError(
            "path_outside_run_root", f"{label} must stay inside the run workspace"
        ) from error


def state_path(run_root: Path) -> Path:
    return run_root / STATE_RELATIVE


def load_state(run_root: Path) -> dict:
    path = state_path(run_root)
    if not path.exists():
        raise ContractError("state_missing", "Run the init action first")
    state = read_json(path)
    if not isinstance(state, dict):
        raise ContractError("invalid_state", "Gate state must be a JSON object")
    return state


def save_state(run_root: Path, state: dict) -> None:
    atomic_write_json(state_path(run_root), state)


def ensure_running(state: dict) -> None:
    if state.get("status") != "running":
        raise ContractError(
            "terminal_state", "The run already reached a terminal state"
        )


def require_candidate(state: dict, candidate_id: str) -> dict:
    candidate = state.get("candidates", {}).get(candidate_id)
    if not isinstance(candidate, dict):
        raise ContractError("unknown_candidate", f"Candidate is not approved: {candidate_id}")
    return candidate


def payload_hash(run_root: Path, payload_path: str) -> str:
    return stable_hash(read_json(run_root / payload_path))


def validate_prepared(
    candidate: dict, kind: str, operation_id: str, run_root: Path
) -> dict:
    prepared = (candidate.get("prepared") or {}).get(kind)
    if not isinstance(prepared, dict):
        raise ContractError(
            "missing_prepare", f"No prepared {kind} binding exists for this candidate"
        )
    if prepared.get("operationId") != operation_id:
        raise ContractError(
            "operation_id_mismatch",
            "Receipt operation id does not match the prepared mutation",
        )
    current = payload_hash(run_root, prepared["payloadPath"])
    if current != prepared.get("payloadHash"):
        raise ContractError(
            "payload_changed", "Prepared payload changed before the receipt was recorded"
        )
    return prepared


def bounded_reason(value: object, fallback: str = "failed") -> str:
    text = str(value or "")
    return text if REASON_RE.match(text) else fallback


def normalize_item_ref(value: object, label: str) -> dict | None:
    if value is None:
        return None
    if not isinstance(value, dict):
        raise ContractError("invalid_item_ref", f"{label} must be an object")
    try:
        library_id = int(value.get("libraryId"))
    except (TypeError, ValueError) as error:
        raise ContractError("invalid_item_ref", f"{label} needs a libraryId") from error
    key = str(value.get("key") or "").strip()
    if library_id <= 0 or not key:
        raise ContractError("invalid_item_ref", f"{label} needs libraryId and key")
    return {"libraryId": library_id, "key": key}


def find_mutation_result(value: object) -> tuple[dict | None, dict | None]:
    stack = [value]
    while stack:
        current = stack.pop()
        if not isinstance(current, dict):
            continue
        result = current.get("result")
        if isinstance(result, dict) and (
            isinstance(current.get("receipt"), dict) or "outcome" in current
        ):
            return current, result
        for key in ("data", "result", "structuredContent"):
            if key in current:
                stack.append(current[key])
    return None, None


def receipt_evidence(receipt: dict, operation: str, error_code: str) -> dict:
    envelope, result = find_mutation_result(receipt)
    if envelope is None or result is None:
        raise ContractError(
            error_code, "Receipt does not contain a canonical mutation result"
        )
    if envelope.get("outcome") not in {"committed", "unchanged"}:
        raise ContractError(error_code, "Receipt is not a successful mutation outcome")
    block = envelope.get("receipt")
    if not isinstance(block, dict):
        raise ContractError(error_code, "Receipt is missing its mutation evidence")
    if str(block.get("operation") or "") != operation:
        raise ContractError(error_code, f"Receipt is not a {operation} mutation")
    operation_id = str(block.get("operationId") or "").strip()
    if not operation_id or len(operation_id) > 128:
        raise ContractError(error_code, "Receipt is missing a valid operation id")
    meta = receipt.get("meta")
    if isinstance(meta, dict) and "operationId" in meta:
        if str(meta.get("operationId") or "").strip() != operation_id:
            raise ContractError(
                "operation_id_mismatch",
                "Client operation id does not match the receipt",
            )
    return {"operationId": operation_id, "result": result}


def reject_receipt_reuse(state: dict, digest: str, candidate_id: str) -> None:
    for other_id, other in state["candidates"].items():
        if other_id == candidate_id:
            continue
        for kind in ("core", "attachment"):
            fact = other.get(kind)
            if isinstance(fact, dict) and fact.get("receiptHash") == digest:
                raise ContractError(
                    "receipt_reused", "A Host receipt cannot be bound to another candidate"
                )


def reject_item_reuse(state: dict, item_ref: dict, candidate_id: str) -> None:
    for other_id, other in state["candidates"].items():
        if other_id == candidate_id:
            continue
        core = other.get("core")
        if isinstance(core, dict) and core.get("itemRef") == item_ref:
            raise ContractError(
                "item_ref_reused", "A Zotero item cannot be bound to another candidate"
            )


def derive_core_fact(receipt: object) -> dict:
    if not isinstance(receipt, dict):
        raise ContractError("invalid_core_receipt", "Receipt must be a JSON object")
    if isinstance(receipt.get("failure"), str):
        failure = receipt["failure"]
        if failure not in FATAL_REASONS:
            raise ContractError("invalid_core_receipt", "Fatal failure reason is invalid")
        return {
            "status": "failed",
            "failure": failure,
            "operationId": "",
            "itemRef": None,
            "hasPdfAttachment": False,
        }
    if receipt.get("ok") is False:
        return core_failure(receipt.get("error") or {})
    evidence = receipt_evidence(receipt, CORE_OPERATION, "invalid_core_receipt")
    result = evidence["result"]
    item_outcome = result.get("itemOutcome")
    if item_outcome not in {"created", "existing"}:
        raise ContractError(
            "invalid_core_receipt", "Receipt does not confirm a created or existing item"
        )
    item = result.get("item")
    try:
        item_ref = normalize_item_ref(
            item.get("ref") if isinstance(item, dict) else None, "ingest.item.ref"
        )
    except ContractError as error:
        raise ContractError("invalid_core_receipt", str(error)) from error
    if item_ref is None:
        raise ContractError("invalid_core_receipt", "Receipt has no portable item ref")
    enrichment = result.get("enrichment")
    has_pdf = any(
        isinstance(entry, dict)
        and entry.get("kind") == "pdf"
        and entry.get("outcome") == "attached"
        for entry in (enrichment if isinstance(enrichment, list) else [])
    )
    return {
        "status": str(item_outcome),
        "operationId": evidence["operationId"],
        "itemRef": item_ref,
        "hasPdfAttachment": has_pdf,
    }


def core_failure(error: object) -> dict:
    details = error.get("details") if isinstance(error, dict) else None
    details = details if isinstance(details, dict) else {}
    code = str(error.get("code") or "") if isinstance(error, dict) else ""
    state_change = str(details.get("stateChange") or "")
    recovery = str(details.get("recovery") or "")
    phase = str(details.get("phase") or "")
    fatal = ""
    if code == "permission_denied":
        fatal = "approval_denied"
    elif code in {"permission_timeout", "permission_ui_unavailable"}:
        fatal = "execution_blocked"
    elif code in {"host_unavailable", "bridge_unavailable"}:
        fatal = "host_unavailable"
    elif phase in {"payload_composition", "payload_contract"}:
        fatal = "execution_blocked"
    elif state_change in {"changed", "unknown"} or recovery in {"reconcile", "manual_repair"}:
        fatal = "execution_blocked"
    elif code == "operation_unknown" or "repair_required" in code:
        fatal = "execution_blocked"
    if fatal:
        return {
            "status": "failed",
            "failure": fatal,
            "operationId": "",
            "itemRef": None,
            "hasPdfAttachment": False,
        }
    return {
        "status": "failed",
        "reason": bounded_reason(code),
        "operationId": "",
        "itemRef": None,
        "hasPdfAttachment": False,
    }


def derive_attachment_fact(receipt: object, core_ref: dict) -> dict:
    if not isinstance(receipt, dict):
        raise ContractError("invalid_attachment_receipt", "Receipt must be a JSON object")
    if receipt.get("ok") is False:
        error = receipt.get("error") if isinstance(receipt.get("error"), dict) else {}
        details = error.get("details") if isinstance(error.get("details"), dict) else {}
        code = str(error.get("code") or "")
        state_change = str(details.get("stateChange") or "")
        recovery = str(details.get("recovery") or "")
        if code == "permission_denied":
            status, reason = "denied", "approval_denied"
        elif (
            state_change in {"changed", "unknown"}
            or recovery in {"reconcile", "manual_repair"}
            or code == "operation_unknown"
            or "repair_required" in code
        ):
            status, reason = "uncertain", bounded_reason(code, "uncertain")
        else:
            status, reason = "failed", bounded_reason(code)
        return {
            "status": status,
            "operationId": "",
            "attachmentRef": None,
            "reason": reason,
        }
    evidence = receipt_evidence(
        receipt, ATTACHMENT_OPERATION, "invalid_attachment_receipt"
    )
    attachment = evidence["result"].get("attachment")
    if not isinstance(attachment, dict):
        raise ContractError(
            "invalid_attachment_receipt", "Receipt does not confirm an attachment"
        )
    try:
        attachment_ref = normalize_item_ref(attachment.get("ref"), "attachment.ref")
        parent_ref = normalize_item_ref(
            attachment.get("parentRef"), "attachment.parentRef"
        )
    except ContractError as error:
        raise ContractError("invalid_attachment_receipt", str(error)) from error
    if attachment_ref is None:
        raise ContractError(
            "invalid_attachment_receipt", "Receipt has no portable attachment ref"
        )
    if parent_ref is None:
        raise ContractError(
            "invalid_attachment_receipt",
            "Attachment receipt requires an explicit parentRef",
        )
    if parent_ref != core_ref:
        raise ContractError(
            "attachment_parent_mismatch",
            "Attachment receipt is bound to a different parent item",
        )
    content_type = str(attachment.get("contentType") or "").strip().lower()
    if content_type != "application/pdf":
        raise ContractError(
            "attachment_not_pdf", "Attachment receipt is not a PDF attachment"
        )
    return {
        "status": "attached",
        "operationId": evidence["operationId"],
        "attachmentRef": attachment_ref,
    }


def attachment_entries(value: object, entries: list[dict] | None = None) -> list[dict]:
    """Accept only a successful CLI envelope, a page, or a list of those."""
    collected = entries if entries is not None else []
    if isinstance(value, list):
        for child in value:
            attachment_entries(child, collected)
        return collected
    if not isinstance(value, dict):
        return collected
    if "ok" in value:
        if value.get("ok") is not True:
            raise ContractError(
                "invalid_pdf_evidence", "Attachment listing is not a successful response"
            )
        return attachment_entries(value.get("data"), collected)
    if "error" in value:
        raise ContractError(
            "invalid_pdf_evidence", "Attachment listing contains an error payload"
        )
    attachments = value.get("attachments")
    if isinstance(attachments, list):
        collected.extend(item for item in attachments if isinstance(item, dict))
        return collected
    return attachment_entries(value.get("data"), collected)


def usable_pdf_ref(entry: dict, core_ref: dict) -> dict | None:
    """Read the production AttachmentDetailDto shape, not a fields wrapper."""
    role = entry.get("role")
    if role and role != "ordinary":
        return None
    parent = entry.get("parentRef")
    if not isinstance(parent, dict):
        return None
    try:
        parent_ref = normalize_item_ref(parent, "attachment.parentRef")
    except ContractError:
        return None
    if parent_ref != core_ref:
        return None
    content_type = str(entry.get("contentType") or "").strip().lower()
    if content_type != "application/pdf":
        return None
    file_block = entry.get("file")
    if not isinstance(file_block, dict) or file_block.get("state") != "available":
        return None
    try:
        return normalize_item_ref(entry.get("ref"), "attachment.ref")
    except ContractError:
        return None


def action_record_existing_pdf(
    run_root: Path, state: dict, candidate_id: str, evidence_arg: str
) -> dict:
    ensure_running(state)
    candidate = require_candidate(state, candidate_id)
    core = candidate.get("core")
    if not isinstance(core, dict) or core.get("status") not in {"created", "existing"}:
        raise ContractError(
            "core_not_confirmed",
            "Existing PDF evidence requires a completed core ingest for this candidate",
        )
    evidence_path = run_relative(run_root, evidence_arg, "evidence")
    if evidence_path != candidate["pdfEvidencePath"]:
        raise ContractError(
            "invalid_receipt_path",
            f"Write the attachment listing to {candidate['pdfEvidencePath']}",
        )
    evidence = read_json(run_root / evidence_path)
    if isinstance(evidence, dict) and evidence.get("ok") is False:
        raise ContractError(
            "invalid_pdf_evidence", "Attachment listing is an error response"
        )
    digest = stable_hash(evidence)
    existing = candidate.get("pdfEvidence")
    if isinstance(existing, dict):
        if existing.get("evidenceHash") == digest:
            return public_state(state)
        raise ContractError(
            "conflicting_evidence", "Different PDF evidence is already recorded"
        )
    attachment_ref = None
    for entry in attachment_entries(evidence):
        attachment_ref = usable_pdf_ref(entry, core["itemRef"])
        if attachment_ref is not None:
            break
    if attachment_ref is None:
        raise ContractError(
            "no_usable_pdf", "Attachment listing contains no usable PDF"
        )
    candidate["pdfEvidence"] = {
        "status": "usable_pdf",
        "attachmentRef": attachment_ref,
        "evidencePath": evidence_path,
        "evidenceHash": digest,
        "source": "attachment_read",
    }
    save_state(run_root, state)
    return public_state(state)


def final_pdf_status(candidate: dict) -> str:
    core = candidate.get("core") or {}
    attachment = candidate.get("attachment") or {}
    pdf_evidence = candidate.get("pdfEvidence") or {}
    if attachment.get("status") == "attached":
        return "attached"
    if pdf_evidence.get("status") == "usable_pdf":
        return "attached"
    if core.get("status") in {"created", "existing"} and core.get("hasPdfAttachment") is True:
        return "attached"
    if attachment.get("status") in {"denied", "failed", "uncertain"}:
        return "failed"
    return "missing"


def build_outcomes(state: dict) -> tuple[list[dict], dict]:
    outcomes: list[dict] = []
    counts = {"created": 0, "existing": 0, "failed": 0, "not_attempted": 0}
    for candidate_id in state["order"]:
        candidate = state["candidates"][candidate_id]
        core = candidate.get("core") or {}
        status = core.get("status")
        if status in {"created", "existing"}:
            item_ref = core.get("itemRef")
            if not isinstance(item_ref, dict):
                raise ContractError(
                    "missing_item_ref", f"Candidate {candidate_id} has no bound Zotero item"
                )
            counts[status] += 1
            outcomes.append(
                {
                    "title": candidate["title"],
                    "ingestStatus": status,
                    "itemRef": item_ref,
                    "pdfStatus": final_pdf_status(candidate),
                    "needsCuration": candidate["needsCuration"] is True,
                }
            )
        elif status == "failed":
            counts["failed"] += 1
            outcomes.append({"title": candidate["title"], "ingestStatus": "failed"})
        else:
            counts["not_attempted"] += 1
            outcomes.append(
                {"title": candidate["title"], "ingestStatus": "not_attempted"}
            )
    return outcomes, counts


def build_summary(state: dict, counts: dict) -> dict:
    return {
        "discovered": int(state.get("discovered", len(state["order"]))),
        "selected": len(state["order"]),
        "created": counts["created"],
        "existing": counts["existing"],
        "failed": counts["failed"],
        "notAttempted": counts["not_attempted"],
    }


def cancellation_payload(state: dict) -> dict:
    reason = str((state.get("cancellation") or {}).get("reason") or "")
    if reason not in CANCEL_REASONS:
        return {}
    return {"reason": reason, "message": FIXED_MESSAGES[reason]}


def build_ledger(state: dict, status: str) -> dict:
    results = []
    for candidate_id in state["order"]:
        candidate = state["candidates"][candidate_id]
        results.append(
            {
                "candidateId": candidate["candidateId"],
                "candidatePath": candidate.get("candidatePath", ""),
                "title": candidate["title"],
                "metadataStatus": candidate.get("metadataStatus", ""),
                "probePdfStatus": candidate.get("probePdfStatus", ""),
                "payloadPath": candidate.get("payloadPath", ""),
                "needsCuration": candidate["needsCuration"] is True,
                "core": candidate.get("core"),
                "acquisition": candidate.get("acquisition"),
                "attachment": candidate.get("attachment"),
                "pdfEvidence": candidate.get("pdfEvidence"),
                "prepared": candidate.get("prepared") or {},
                "finalPdfStatus": final_pdf_status(candidate),
            }
        )
    return {
        "kind": "literature_search_ingest_ledger",
        "status": status,
        "searchMode": state.get("searchMode", ""),
        "breadth": state.get("breadth", ""),
        "discovered": int(state.get("discovered", len(state["order"]))),
        "candidateIds": list(state["order"]),
        "approvedCandidateIds": list(state["order"]),
        "excludedCandidateIds": list(state.get("excludedCandidateIds", [])),
        "candidateResults": results,
        "cancellation": cancellation_payload(state),
    }


def has_progress(state: dict) -> bool:
    return any(
        candidate.get(kind) is not None
        for candidate in state["candidates"].values()
        for kind in ("core", "acquisition", "attachment")
    )


def build_output(state: dict, status: str) -> dict:
    outcomes, counts = build_outcomes(state)
    summary = build_summary(state, counts)
    if status == "canceled":
        cancellation = cancellation_payload(state)
        output = {
            "__SKILL_DONE__": True,
            "kind": "literature_search_ingest_canceled",
            "status": "canceled",
            "reason": cancellation.get("reason") or "execution_blocked",
            "message": cancellation.get("message") or FIXED_MESSAGES["execution_blocked"],
        }
        if has_progress(state):
            output.update(
                {
                    "summary": summary,
                    "outcomes": outcomes,
                    "searchLedgerPath": LEDGER_RELATIVE,
                }
            )
        return output
    return {
        "__SKILL_DONE__": True,
        "kind": "literature_search_ingest",
        "status": "completed",
        "summary": summary,
        "outcomes": outcomes,
        "searchLedgerPath": LEDGER_RELATIVE,
    }


def emit_terminal(run_root: Path, state: dict) -> dict:
    status = "canceled" if state.get("status") == "canceled" else "completed"
    atomic_write_json(run_root / LEDGER_RELATIVE, build_ledger(state, status))
    if state.get("status") == "running":
        state["status"] = status
        save_state(run_root, state)
    return build_output(state, status)


def public_state(state: dict) -> dict:
    return {
        "kind": "literature_search_ingest_gate",
        "status": state.get("status", "running"),
        "searchMode": state.get("searchMode", ""),
        "breadth": state.get("breadth", ""),
        "ledgerPath": LEDGER_RELATIVE,
        "candidates": [
            {
                "candidateId": candidate["candidateId"],
                "title": candidate["title"],
                "coreReceiptPath": candidate["coreReceiptPath"],
                "attachmentReceiptPath": candidate["attachmentReceiptPath"],
                "pdfEvidencePath": candidate["pdfEvidencePath"],
                "payloadPath": candidate.get("payloadPath", ""),
                "core": candidate.get("core"),
                "acquisition": candidate.get("acquisition"),
                "attachment": candidate.get("attachment"),
                "pdfEvidence": candidate.get("pdfEvidence"),
                "prepared": candidate.get("prepared") or {},
                "finalPdfStatus": final_pdf_status(candidate),
            }
            for candidate in (
                state["candidates"][candidate_id] for candidate_id in state["order"]
            )
        ],
    }


def action_init(run_root: Path, payload_path: Path) -> dict:
    if state_path(run_root).exists():
        raise ContractError("state_exists", "Gate state already exists for this run")
    payload = read_json(payload_path)
    if not isinstance(payload, dict):
        raise ContractError("invalid_init_payload", "Init payload must be a JSON object")
    entries = payload.get("candidates")
    if not isinstance(entries, list) or not entries:
        raise ContractError("invalid_init_payload", "At least one candidate is required")
    state = {
        "schemaVersion": 1,
        "status": "running",
        "searchMode": str(payload.get("searchMode") or ""),
        "breadth": str(payload.get("breadth") or ""),
        "discovered": int(payload.get("discovered", len(entries))),
        "excludedCandidateIds": [str(value) for value in payload.get("excludedCandidateIds", [])],
        "order": [],
        "candidates": {},
        "cancellation": {},
    }
    for index, entry in enumerate(entries, 1):
        if not isinstance(entry, dict):
            raise ContractError("invalid_init_payload", "Candidate entries must be objects")
        candidate_id = str(entry.get("candidateId") or "").strip()
        if not candidate_id:
            raise ContractError("invalid_init_payload", "Candidate needs a candidateId")
        if candidate_id in state["candidates"]:
            raise ContractError("duplicate_candidate", f"Candidate is duplicated: {candidate_id}")
        state["order"].append(candidate_id)
        state["candidates"][candidate_id] = {
            "candidateId": candidate_id,
            "title": str(entry.get("title") or ""),
            "candidatePath": run_relative(run_root, entry.get("candidatePath"), "candidatePath"),
            "payloadPath": run_relative(run_root, entry.get("payloadPath"), "payloadPath"),
            "metadataStatus": str(entry.get("metadataStatus") or ""),
            "probePdfStatus": str(entry.get("pdfStatus") or ""),
            "needsCuration": entry.get("needsCuration") is True,
            "coreReceiptPath": f"runtime/host/core-{index:03d}.json",
            "attachmentReceiptPath": f"runtime/host/attachment-{index:03d}.json",
            "pdfEvidencePath": f"runtime/host/pdf-{index:03d}.json",
            "core": None,
            "acquisition": None,
            "attachment": None,
            "pdfEvidence": None,
            "prepared": {},
        }
    save_state(run_root, state)
    return public_state(state)


def action_record_core(
    run_root: Path, state: dict, candidate_id: str, receipt_arg: str
) -> dict:
    ensure_running(state)
    candidate = require_candidate(state, candidate_id)
    receipt_path = run_relative(run_root, receipt_arg, "receipt")
    if receipt_path != candidate["coreReceiptPath"]:
        raise ContractError(
            "invalid_receipt_path",
            f"Write the raw Host response to {candidate['coreReceiptPath']}",
        )
    receipt = read_json(run_root / receipt_path)
    digest = stable_hash(receipt)
    if isinstance(candidate.get("core"), dict):
        if candidate["core"].get("receiptHash") == digest:
            return public_state(state)
        raise ContractError(
            "conflicting_receipt",
            "A different receipt is already bound to this candidate",
        )
    reject_receipt_reuse(state, digest, candidate_id)
    fact = derive_core_fact(receipt)
    if fact["status"] in {"created", "existing"}:
        validate_prepared(candidate, "core", fact["operationId"], run_root)
    if isinstance(fact.get("itemRef"), dict):
        reject_item_reuse(state, fact["itemRef"], candidate_id)
    core_fact = {
        "status": fact["status"],
        "operationId": fact["operationId"],
        "receiptPath": receipt_path,
        "receiptHash": digest,
        "itemRef": fact["itemRef"],
        "hasPdfAttachment": fact["hasPdfAttachment"] is True,
    }
    if fact.get("reason"):
        core_fact["reason"] = bounded_reason(fact["reason"])
    candidate["core"] = core_fact
    if fact.get("failure"):
        candidate["core"]["reason"] = fact["failure"]
        state["status"] = "canceled"
        state["cancellation"] = {"reason": fact["failure"]}
    save_state(run_root, state)
    return public_state(state)


def action_record_acquisition(
    run_root: Path, state: dict, candidate_id: str, payload_path: Path
) -> dict:
    ensure_running(state)
    candidate = require_candidate(state, candidate_id)
    evidence = read_json(payload_path)
    if not isinstance(evidence, dict) or set(evidence) - {"status", "reason"}:
        raise ContractError(
            "invalid_acquisition_evidence",
            "Acquisition evidence may only contain status and reason",
        )
    status = evidence.get("status")
    if status not in ACQUISITION_STATUSES:
        raise ContractError("invalid_acquisition_evidence", "Acquisition status is invalid")
    reason = evidence.get("reason", "")
    if not isinstance(reason, str) or (reason and not REASON_RE.match(reason)):
        raise ContractError("invalid_acquisition_evidence", "Acquisition reason is invalid")
    if status in {"failed", "canceled"} and not reason:
        raise ContractError(
            "invalid_acquisition_evidence", "Failed acquisition requires a reason"
        )
    candidate["acquisition"] = {"status": status, "reason": reason}
    save_state(run_root, state)
    return public_state(state)


def action_record_attachment(
    run_root: Path, state: dict, candidate_id: str, receipt_arg: str
) -> dict:
    ensure_running(state)
    candidate = require_candidate(state, candidate_id)
    core = candidate.get("core")
    if not isinstance(core, dict) or core.get("status") not in {"created", "existing"}:
        raise ContractError(
            "core_not_confirmed",
            "Attachment receipts require a completed core ingest for this candidate",
        )
    receipt_path = run_relative(run_root, receipt_arg, "receipt")
    if receipt_path != candidate["attachmentReceiptPath"]:
        raise ContractError(
            "invalid_receipt_path",
            f"Write the raw Host response to {candidate['attachmentReceiptPath']}",
        )
    receipt = read_json(run_root / receipt_path)
    digest = stable_hash(receipt)
    if isinstance(candidate.get("attachment"), dict):
        if candidate["attachment"].get("receiptHash") == digest:
            return public_state(state)
        raise ContractError(
            "conflicting_receipt",
            "A different receipt is already bound to this candidate",
        )
    reject_receipt_reuse(state, digest, candidate_id)
    fact = derive_attachment_fact(receipt, core["itemRef"])
    if fact["status"] == "attached":
        prepared = validate_prepared(
            candidate, "attachment", fact["operationId"], run_root
        )
        if prepared.get("parentRef") != core["itemRef"]:
            raise ContractError(
                "attachment_parent_mismatch",
                "Prepared attachment is bound to a different parent item",
            )
    if (
        fact["operationId"]
        and core.get("operationId")
        and fact["operationId"] == core["operationId"]
    ):
        raise ContractError(
            "operation_identity_reused",
            "Authorized attachment requires its own operation identity",
        )
    attachment_fact = {
        "status": fact["status"],
        "operationId": fact["operationId"],
        "receiptPath": receipt_path,
        "receiptHash": digest,
        "attachmentRef": fact["attachmentRef"],
    }
    if fact.get("reason"):
        attachment_fact["reason"] = bounded_reason(fact["reason"], "failed")
    candidate["attachment"] = attachment_fact
    save_state(run_root, state)
    return public_state(state)


def action_prepare(
    run_root: Path,
    state: dict,
    kind: str,
    candidate_id: str,
    operation_id: str,
    payload_arg: str,
) -> dict:
    ensure_running(state)
    candidate = require_candidate(state, candidate_id)
    if kind not in {"core", "attachment"}:
        raise ContractError("invalid_prepare", "Prepare kind must be core or attachment")
    operation_id = str(operation_id or "").strip()
    if not operation_id or len(operation_id) > 128:
        raise ContractError("invalid_prepare", "Prepare needs a valid operation id")
    payload_path = run_relative(run_root, payload_arg, "payload")
    if not payload_path:
        raise ContractError("invalid_prepare", "Prepare needs a payload path")
    document = read_json(run_root / payload_path)
    digest = stable_hash(document)
    binding: dict = {
        "operationId": operation_id,
        "payloadPath": payload_path,
        "payloadHash": digest,
    }
    if kind == "attachment":
        core = candidate.get("core")
        if not isinstance(core, dict) or core.get("status") not in {"created", "existing"}:
            raise ContractError(
                "core_not_confirmed",
                "Attachment preparation requires a completed core ingest",
            )
        if not isinstance(document, dict) or set(document) != {"parentRef", "fileId"}:
            raise ContractError(
                "invalid_prepare",
                "Attachment payload must contain only parentRef and fileId",
            )
        try:
            parent_ref = normalize_item_ref(document.get("parentRef"), "parentRef")
        except ContractError as error:
            raise ContractError("invalid_prepare", str(error)) from error
        if parent_ref != core.get("itemRef"):
            raise ContractError(
                "attachment_parent_mismatch",
                "Prepared attachment is bound to a different parent item",
            )
        file_id = document.get("fileId")
        if not isinstance(file_id, str) or not file_id.strip() or len(file_id) > 256:
            raise ContractError("invalid_prepare", "fileId must be a non-empty opaque id")
        binding["parentRef"] = parent_ref
        binding["fileId"] = file_id.strip()
    prepared = candidate.setdefault("prepared", {})
    existing = prepared.get(kind)
    if isinstance(existing, dict):
        if (
            existing.get("operationId") == operation_id
            and existing.get("payloadHash") == digest
        ):
            return public_state(state)
        raise ContractError(
            "conflicting_prepare",
            "A different prepared binding already exists for this candidate",
        )
    prepared[kind] = binding
    save_state(run_root, state)
    return public_state(state)


def action_finalize(run_root: Path, state: dict) -> dict:
    return emit_terminal(run_root, state)


def action_cancel(run_root: Path, state: dict, reason: str) -> dict:
    if reason not in CANCEL_REASONS:
        raise ContractError("invalid_cancellation", "Cancellation reason is invalid")
    if state.get("status") == "completed":
        raise ContractError(
            "terminal_state", "A completed run cannot be canceled"
        )
    if state.get("status") == "canceled":
        if (state.get("cancellation") or {}).get("reason") != reason:
            raise ContractError(
                "terminal_state", "A different cancellation is already recorded"
            )
        return emit_terminal(run_root, state)
    state["status"] = "canceled"
    state["cancellation"] = {"reason": reason}
    save_state(run_root, state)
    return emit_terminal(run_root, state)


def main() -> int:
    for stream_name in ("stdout", "stderr"):
        stream = getattr(sys, stream_name, None)
        if hasattr(stream, "reconfigure"):
            stream.reconfigure(encoding="utf-8")
    parser = argparse.ArgumentParser(description="Literature search ingest gate")
    parser.add_argument("--run-root", default=".")
    parser.add_argument(
        "--action",
        required=True,
        choices=[
            "init",
            "record-core",
            "record-acquisition",
            "record-attachment",
            "prepare",
            "record-existing-pdf",
            "finalize",
            "cancel",
        ],
    )
    parser.add_argument("--candidate")
    parser.add_argument("--payload")
    parser.add_argument("--receipt")
    parser.add_argument("--reason", default="")
    parser.add_argument("--kind", default="")
    parser.add_argument("--operation-id", default="")
    args = parser.parse_args()
    run_root = Path(args.run_root).resolve()
    try:
        if args.action == "init":
            if not args.payload:
                raise ContractError("missing_argument", "--payload is required for init")
            result = action_init(run_root, Path(args.payload))
        else:
            state = load_state(run_root)
            if args.action == "record-core":
                if not args.candidate or not args.receipt:
                    raise ContractError(
                        "missing_argument", "--candidate and --receipt are required"
                    )
                result = action_record_core(
                    run_root, state, args.candidate, args.receipt
                )
            elif args.action == "record-acquisition":
                if not args.candidate or not args.payload:
                    raise ContractError(
                        "missing_argument", "--candidate and --payload are required"
                    )
                result = action_record_acquisition(
                    run_root, state, args.candidate, Path(args.payload)
                )
            elif args.action == "record-attachment":
                if not args.candidate or not args.receipt:
                    raise ContractError(
                        "missing_argument", "--candidate and --receipt are required"
                    )
                result = action_record_attachment(
                    run_root, state, args.candidate, args.receipt
                )
            elif args.action == "prepare":
                if not args.candidate or not args.payload:
                    raise ContractError(
                        "missing_argument", "--candidate and --payload are required"
                    )
                result = action_prepare(
                    run_root,
                    state,
                    args.kind,
                    args.candidate,
                    args.operation_id,
                    args.payload,
                )
            elif args.action == "record-existing-pdf":
                if not args.candidate or not args.payload:
                    raise ContractError(
                        "missing_argument", "--candidate and --payload are required"
                    )
                result = action_record_existing_pdf(
                    run_root, state, args.candidate, args.payload
                )
            elif args.action == "cancel":
                result = action_cancel(run_root, state, args.reason)
            else:
                result = action_finalize(run_root, state)
        print(json.dumps(result, ensure_ascii=False, sort_keys=True))
        return 0
    except ContractError as error:
        print(
            json.dumps(
                {"error": {"code": error.code, "message": str(error)}},
                ensure_ascii=False,
                sort_keys=True,
            )
        )
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
