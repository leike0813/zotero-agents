from __future__ import annotations

import hashlib
import json
import zipfile
from pathlib import Path, PurePosixPath

from .layout import RunWorkspaceLayout


BUNDLE_ASSEMBLY_ARTIFACT_PATH_INVALID = "BUNDLE_ASSEMBLY_ARTIFACT_PATH_INVALID"
BUNDLE_ASSEMBLY_ARTIFACT_PATH_MISSING = "BUNDLE_ASSEMBLY_ARTIFACT_PATH_MISSING"
SKILL_RUN_FEEDBACK_FILENAME = "_skill_run_feedback.md"


class BundleAssemblyError(RuntimeError):
    def __init__(self, *, code: str, message: str, path: str | None = None):
        super().__init__(message)
        self.code = code
        self.path = path


class RunBundleService:
    def build_run_bundle(
        self,
        run_dir: Path,
        debug: bool = False,
        *,
        layout: RunWorkspaceLayout,
    ) -> str:
        run_dir = layout.workspace_dir
        bundle_path = layout.bundle_path(debug=debug)
        manifest_path = layout.bundle_manifest_path(debug=debug)
        bundle_path.parent.mkdir(parents=True, exist_ok=True)
        candidates = self.bundle_candidates(run_dir=run_dir, debug=debug, layout=layout)
        entries = [
            {
                "path": path.relative_to(run_dir).as_posix(),
                "size": path.stat().st_size,
                "sha256": self.hash_file(path),
            }
            for path in candidates
            if path.is_file()
        ]
        manifest_path.write_text(
            json.dumps(
                {"namespace": layout.namespace, "files": entries},
                ensure_ascii=False,
                indent=2,
            ),
            encoding="utf-8",
        )
        if bundle_path.exists():
            bundle_path.unlink()
        with zipfile.ZipFile(bundle_path, "w", zipfile.ZIP_DEFLATED) as zf:
            for path in candidates:
                if path.is_file():
                    zf.write(path, path.relative_to(run_dir).as_posix())
            zf.write(manifest_path, manifest_path.relative_to(run_dir).as_posix())
        return bundle_path.relative_to(run_dir).as_posix()

    def bundle_candidates(
        self, *, run_dir: Path, debug: bool, layout: RunWorkspaceLayout
    ) -> list[Path]:
        if debug:
            candidates = self._debug_candidates(run_dir, layout)
        else:
            candidates = self._normal_candidates(run_dir, layout.result_path)
        bundle_root = run_dir / "bundle"
        return [
            path
            for path in self._dedupe(run_dir, candidates)
            if not self._is_relative_to(path, bundle_root)
        ]

    def _normal_candidates(self, run_dir: Path, result_path: Path) -> list[Path]:
        candidates: list[Path] = []
        if result_path.exists():
            candidates.append(result_path)
            sidecar = result_path.parent / SKILL_RUN_FEEDBACK_FILENAME
            if sidecar.exists() and sidecar.is_file():
                candidates.append(sidecar)
            candidates.extend(self._artifact_candidates_from_result(run_dir, result_path))
        return candidates

    def _debug_candidates(self, run_dir: Path, layout: RunWorkspaceLayout) -> list[Path]:
        candidates = self._normal_candidates(run_dir, layout.result_path)
        for root in (layout.result_path.parent, layout.audit_dir):
            if not root.exists():
                continue
            for path in root.rglob("*"):
                if path.is_file():
                    candidates.append(path)
        return candidates

    def _artifact_candidates_from_result(
        self, run_dir: Path, result_path: Path
    ) -> list[Path]:
        try:
            payload = json.loads(result_path.read_text(encoding="utf-8"))
        except (OSError, UnicodeDecodeError, json.JSONDecodeError, TypeError, ValueError):
            return []
        artifacts = payload.get("artifacts")
        if not isinstance(artifacts, list):
            return []
        root = run_dir.resolve()
        candidates: list[Path] = []
        for raw in artifacts:
            if not isinstance(raw, str) or not raw.strip():
                raise BundleAssemblyError(
                    code=BUNDLE_ASSEMBLY_ARTIFACT_PATH_INVALID,
                    message="result artifacts must contain non-empty workspace-relative path strings",
                    path=str(raw),
                )
            normalized = PurePosixPath(raw.strip().replace("\\", "/"))
            if normalized.is_absolute() or any(
                part in {"", ".", ".."} for part in normalized.parts
            ):
                raise BundleAssemblyError(
                    code=BUNDLE_ASSEMBLY_ARTIFACT_PATH_INVALID,
                    message="result artifact path must be workspace-relative",
                    path=raw,
                )
            path = (run_dir / normalized.as_posix()).resolve()
            if not self._is_relative_to(path, root):
                raise BundleAssemblyError(
                    code=BUNDLE_ASSEMBLY_ARTIFACT_PATH_INVALID,
                    message="result artifact path escapes the workspace",
                    path=raw,
                )
            if not path.exists() or not path.is_file():
                raise BundleAssemblyError(
                    code=BUNDLE_ASSEMBLY_ARTIFACT_PATH_MISSING,
                    message="result artifact path does not reference an existing file",
                    path=raw,
                )
            candidates.append(path)
        return candidates

    def _dedupe(self, run_dir: Path, candidates: list[Path]) -> list[Path]:
        result: list[Path] = []
        seen: set[str] = set()
        for path in candidates:
            rel = path.relative_to(run_dir).as_posix()
            if rel in seen:
                continue
            seen.add(rel)
            result.append(path)
        return result

    def _is_relative_to(self, path: Path, parent: Path) -> bool:
        try:
            path.relative_to(parent)
        except ValueError:
            return False
        return True

    def hash_file(self, path: Path) -> str:
        hasher = hashlib.sha256()
        with path.open("rb") as handle:
            for chunk in iter(lambda: handle.read(8192), b""):
                hasher.update(chunk)
        return hasher.hexdigest()

