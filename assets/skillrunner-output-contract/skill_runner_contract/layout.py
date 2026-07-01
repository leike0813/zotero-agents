from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any


_SAFE_SEGMENT_RE = re.compile(r"[^A-Za-z0-9._-]+")


def safe_segment(value: Any, fallback: str = "skill") -> str:
    normalized = str(value or "").strip()
    cleaned = _SAFE_SEGMENT_RE.sub("-", normalized).strip("-")
    return cleaned or fallback


def default_namespace_for_run(skill_id: str, index: int = 1) -> str:
    return f"{safe_segment(skill_id, 'skill')}.{max(1, int(index))}"


@dataclass(frozen=True)
class RunWorkspaceLayout:
    workspace_id: str
    workspace_dir: Path
    namespace: str

    @property
    def result_path(self) -> Path:
        return self.workspace_dir / "result" / self.namespace / "result.json"

    @property
    def input_manifest_path(self) -> Path:
        return self.workspace_dir / ".audit" / self.namespace / "input_manifest.json"

    @property
    def audit_dir(self) -> Path:
        return self.workspace_dir / ".audit" / self.namespace

    @property
    def bundle_dir(self) -> Path:
        return self.workspace_dir / "bundle" / self.namespace

    def bundle_path(self, *, debug: bool = False) -> Path:
        filename = "run_bundle_debug.zip" if debug else "run_bundle.zip"
        return self.bundle_dir / filename

    def bundle_manifest_path(self, *, debug: bool = False) -> Path:
        filename = "manifest_debug.json" if debug else "manifest.json"
        return self.bundle_dir / filename

