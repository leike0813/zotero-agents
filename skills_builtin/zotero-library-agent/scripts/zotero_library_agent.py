#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
import zipfile
from datetime import datetime, timezone
from pathlib import Path, PurePosixPath
from typing import Any

EVIDENCE_SCHEMA = "zotero-library-agent.evidence-bundle.v1"
OUTPUT_CONTRACT_SCHEMA = "zotero-bridge.agent-run.output-contract.v1"
SENSITIVE_KEYS = {
    "authorization",
    "cookie",
    "password",
    "private_state",
    "privatestate",
    "secret",
    "token",
    "transcript",
}
SENSITIVE_ARG = re.compile(r"(?:bearer\s+|authorization|password|secret|token)", re.I)


class HelperError(Exception):
    def __init__(self, code: str, message: str, details: dict[str, Any] | None = None):
        super().__init__(message)
        self.code = code
        self.details = details or {}


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def read_json(path: Path) -> Any:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError as error:
        raise HelperError("file_not_found", f"file does not exist: {path}") from error
    except json.JSONDecodeError as error:
        raise HelperError("invalid_json", f"invalid JSON: {path}", {"line": error.lineno}) from error


def write_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    try:
        with path.open("rb") as stream:
            for chunk in iter(lambda: stream.read(1024 * 1024), b""):
                digest.update(chunk)
    except FileNotFoundError as error:
        raise HelperError("artifact_not_found", f"artifact does not exist: {path}") from error
    return digest.hexdigest()


def normalized_key(value: str) -> str:
    return re.sub(r"[^a-z0-9]", "", value.lower())


def reject_sensitive(value: Any, location: str = "$") -> None:
    if isinstance(value, dict):
        for key, child in value.items():
            normalized = normalized_key(str(key))
            if normalized in {normalized_key(entry) for entry in SENSITIVE_KEYS}:
                raise HelperError("sensitive_field", f"sensitive field is not allowed: {location}.{key}")
            reject_sensitive(child, f"{location}.{key}")
    elif isinstance(value, list):
        for index, child in enumerate(value):
            reject_sensitive(child, f"{location}[{index}]")


def require_record(value: Any, name: str) -> dict[str, Any]:
    if not isinstance(value, dict):
        raise HelperError("invalid_evidence", f"{name} must be an object")
    return value


def require_string(value: Any, name: str) -> str:
    if not isinstance(value, str) or not value.strip():
        raise HelperError("invalid_evidence", f"{name} must be a non-empty string")
    return value


def validate_evidence(value: Any, verify_files: bool = True) -> dict[str, Any]:
    evidence = require_record(value, "evidence")
    reject_sensitive(evidence)
    if evidence.get("schema") != EVIDENCE_SCHEMA:
        raise HelperError("invalid_evidence", f"schema must be {EVIDENCE_SCHEMA}")
    require_string(evidence.get("createdAt"), "createdAt")
    producer = require_record(evidence.get("producer"), "producer")
    require_string(producer.get("surfaceVersion"), "producer.surfaceVersion")
    require_string(producer.get("cliVersion"), "producer.cliVersion")
    operation = require_record(evidence.get("operation"), "operation")
    require_string(operation.get("kind"), "operation.kind")
    command = operation.get("command")
    if not isinstance(command, list) or not command or not all(isinstance(arg, str) for arg in command):
        raise HelperError("invalid_evidence", "operation.command must be a non-empty string array")
    if any(SENSITIVE_ARG.search(arg) for arg in command):
        raise HelperError("sensitive_command", "operation.command contains credential-like material")
    if not isinstance(evidence.get("subjects"), list):
        raise HelperError("invalid_evidence", "subjects must be an array")
    artifacts = evidence.get("artifacts")
    if not isinstance(artifacts, list):
        raise HelperError("invalid_evidence", "artifacts must be an array")
    for index, raw in enumerate(artifacts):
        artifact = require_record(raw, f"artifacts[{index}]")
        artifact_path = Path(require_string(artifact.get("path"), f"artifacts[{index}].path")).expanduser()
        require_string(artifact.get("role"), f"artifacts[{index}].role")
        require_string(artifact.get("mediaType"), f"artifacts[{index}].mediaType")
        expected = require_string(artifact.get("sha256"), f"artifacts[{index}].sha256")
        if not re.fullmatch(r"[a-f0-9]{64}", expected):
            raise HelperError("invalid_evidence", f"artifacts[{index}].sha256 must be lowercase SHA-256")
        if verify_files and artifact_path.exists():
            actual = sha256_file(artifact_path)
            if actual != expected:
                raise HelperError(
                    "artifact_digest_mismatch",
                    f"artifact digest mismatch: {artifact_path}",
                    {"expected": expected, "actual": actual},
                )
    require_record(evidence.get("writeback"), "writeback")
    return evidence


def evidence_build(args: argparse.Namespace) -> dict[str, Any]:
    source = require_record(read_json(Path(args.input).expanduser()), "input")
    reject_sensitive(source)
    artifacts: list[dict[str, Any]] = []
    for index, raw in enumerate(source.get("artifacts", [])):
        artifact = require_record(raw, f"artifacts[{index}]")
        path = Path(require_string(artifact.get("path"), f"artifacts[{index}].path")).expanduser()
        artifacts.append({**artifact, "path": str(path), "sha256": sha256_file(path)})
    evidence = {
        "schema": EVIDENCE_SCHEMA,
        "createdAt": source.get("createdAt") or utc_now(),
        "producer": source.get("producer"),
        "operation": source.get("operation"),
        "subjects": source.get("subjects", []),
        "artifacts": artifacts,
        **({"workflow": source["workflow"]} if "workflow" in source else {}),
        "writeback": source.get("writeback"),
    }
    validate_evidence(evidence)
    output = Path(args.output).expanduser()
    write_json(output, evidence)
    return {"ok": True, "schema": EVIDENCE_SCHEMA, "output": str(output), "artifactCount": len(artifacts)}


def evidence_validate(args: argparse.Namespace) -> dict[str, Any]:
    evidence = validate_evidence(read_json(Path(args.input).expanduser()))
    return {"ok": True, "schema": EVIDENCE_SCHEMA, "artifactCount": len(evidence["artifacts"])}


class BundleReader:
    def __init__(self, path: Path):
        self.path = path
        self.archive = zipfile.ZipFile(path) if path.is_file() and path.suffix.lower() == ".zip" else None
        if self.archive is None and not path.is_dir():
            raise HelperError("invalid_bundle", f"bundle must be a directory or zip: {path}")

    def names(self) -> list[str]:
        if self.archive is not None:
            return self.archive.namelist()
        return [str(path.relative_to(self.path)).replace("\\", "/") for path in self.path.rglob("*") if path.is_file()]

    def read_json(self, entry: str) -> Any:
        normalized = str(PurePosixPath(entry))
        try:
            if self.archive is not None:
                return json.loads(self.archive.read(normalized).decode("utf-8"))
            return json.loads((self.path / normalized).read_text(encoding="utf-8"))
        except (FileNotFoundError, KeyError) as error:
            raise HelperError("bundle_entry_missing", f"bundle entry is missing: {normalized}") from error
        except json.JSONDecodeError as error:
            raise HelperError("invalid_bundle_json", f"bundle entry is not valid JSON: {normalized}") from error

    def close(self) -> None:
        if self.archive is not None:
            self.archive.close()


def workflow_inspect(args: argparse.Namespace) -> dict[str, Any]:
    reader = BundleReader(Path(args.bundle).expanduser())
    try:
        context = require_record(reader.read_json("agent-run/context.json"), "agent-run/context.json")
        contracts: list[dict[str, Any]] = []
        for name in sorted(reader.names()):
            if re.fullmatch(r"agent-run/requests/[^/]+/output-contract\.json", name):
                contract = require_record(reader.read_json(name), name)
                if contract.get("schema") != OUTPUT_CONTRACT_SCHEMA:
                    raise HelperError("invalid_output_contract", f"unsupported output contract schema: {name}")
                contracts.append(contract)
        if not contracts:
            raise HelperError("output_contract_missing", "handoff contains no output contracts")
        return {
            "ok": True,
            "agentRunId": require_string(context.get("agentRunId"), "agentRunId"),
            "agentRequestIds": [require_string(item.get("agentRequestId"), "agentRequestId") for item in contracts],
            "contracts": contracts,
        }
    finally:
        reader.close()


def workflow_validate_result(args: argparse.Namespace) -> dict[str, Any]:
    contract = require_record(read_json(Path(args.contract).expanduser()), "contract")
    if contract.get("schema") != OUTPUT_CONTRACT_SCHEMA:
        raise HelperError("invalid_output_contract", f"schema must be {OUTPUT_CONTRACT_SCHEMA}")
    namespace = require_string(contract.get("namespace"), "namespace")
    result_path = require_string(contract.get("resultJsonPath"), "resultJsonPath")
    manifest_path = require_string(
        contract.get("expectedBundleManifestPath") or f"bundle/{namespace}/manifest.json",
        "expectedBundleManifestPath",
    )
    reader = BundleReader(Path(args.result).expanduser())
    try:
        reader.read_json(result_path)
        manifest = require_record(reader.read_json(manifest_path), manifest_path)
        actual_namespace = manifest.get("namespace")
        if actual_namespace is None and isinstance(manifest.get("run"), dict):
            actual_namespace = manifest["run"].get("namespace")
        if actual_namespace is None and isinstance(manifest.get("result"), dict):
            actual_namespace = manifest["result"].get("namespace")
        if actual_namespace and actual_namespace != namespace:
            raise HelperError(
                "bundle_namespace_mismatch",
                "result bundle namespace does not match output contract",
                {"expected": namespace, "actual": actual_namespace},
            )
        return {
            "ok": True,
            "agentRequestId": require_string(contract.get("agentRequestId"), "agentRequestId"),
            "namespace": namespace,
            "resultJsonPath": result_path,
            "manifestPath": manifest_path,
        }
    finally:
        reader.close()


def parser() -> argparse.ArgumentParser:
    root = argparse.ArgumentParser(description="Stateless Zotero Library Agent bundle helpers")
    families = root.add_subparsers(dest="family", required=True)
    evidence = families.add_parser("evidence")
    evidence_commands = evidence.add_subparsers(dest="command", required=True)
    build = evidence_commands.add_parser("build")
    build.add_argument("--input", required=True)
    build.add_argument("--output", required=True)
    build.set_defaults(handler=evidence_build)
    validate = evidence_commands.add_parser("validate")
    validate.add_argument("--input", required=True)
    validate.set_defaults(handler=evidence_validate)
    workflow = families.add_parser("workflow")
    workflow_commands = workflow.add_subparsers(dest="command", required=True)
    inspect = workflow_commands.add_parser("inspect")
    inspect.add_argument("--bundle", required=True)
    inspect.set_defaults(handler=workflow_inspect)
    result = workflow_commands.add_parser("validate-result")
    result.add_argument("--contract", required=True)
    result.add_argument("--result", required=True)
    result.set_defaults(handler=workflow_validate_result)
    return root


def main() -> int:
    try:
        args = parser().parse_args()
        result = args.handler(args)
        sys.stdout.write(json.dumps(result, ensure_ascii=False, sort_keys=True) + "\n")
        return 0
    except HelperError as error:
        sys.stderr.write(
            json.dumps(
                {"ok": False, "code": error.code, "message": str(error), "details": error.details},
                ensure_ascii=False,
                sort_keys=True,
            )
            + "\n"
        )
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
