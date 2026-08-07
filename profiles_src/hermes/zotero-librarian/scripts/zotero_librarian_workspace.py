#!/usr/bin/env python3
"""Resolve the active Zotero connection profile and its resident workspace."""
from __future__ import annotations

import hashlib
import os
import platform
from dataclasses import dataclass
from pathlib import Path


class WorkspaceError(Exception):
    def __init__(self, code: str, message: str, details: dict[str, str] | None = None):
        super().__init__(message)
        self.code = code
        self.details = details or {}


def base_dir() -> Path:
    raw = os.environ.get("ZOTERO_LIBRARIAN_STATE_DIR")
    if raw:
        return Path(raw).expanduser()
    hermes_home = os.environ.get("HERMES_HOME")
    if hermes_home:
        return Path(hermes_home).expanduser() / "zotero-librarian"
    return Path.home() / ".hermes" / "zotero-librarian"


def well_known_profile() -> Path:
    home = Path.home()
    system = platform.system().lower()
    if system == "windows":
        local = os.environ.get("LOCALAPPDATA")
        root = Path(local).expanduser() if local else home / "AppData" / "Local"
    elif system == "darwin":
        return home / "Library" / "Application Support" / "zotero-agents" / "bridge-profile.json"
    else:
        xdg = os.environ.get("XDG_DATA_HOME")
        root = Path(xdg).expanduser() if xdg else home / ".local" / "share"
    return root / "zotero-agents" / "bridge-profile.json"


def canonical_profile(raw: str) -> Path:
    candidate = Path(raw).expanduser()
    try:
        resolved = candidate.resolve(strict=True)
    except (OSError, RuntimeError) as error:
        raise WorkspaceError(
            "profile_path_unavailable",
            "connection profile does not exist or cannot be normalized",
            {"profile": str(candidate)},
        ) from error
    if not resolved.is_file():
        raise WorkspaceError(
            "profile_path_unavailable",
            "connection profile is not a file",
            {"profile": str(resolved)},
        )
    return resolved


def profile_identity(profile: Path) -> str:
    # normcase folds drive/path case on Windows without reading profile contents.
    normalized = os.path.normcase(str(profile))
    return hashlib.sha256(normalized.encode("utf-8")).hexdigest()


@dataclass(frozen=True)
class Workspace:
    base: Path
    profile: Path | None
    workspace: Path
    database: Path
    is_default: bool

    @property
    def bridge_prefix(self) -> list[str]:
        return ["--profile", str(self.profile)] if self.profile else []


def _canonical_path(raw: str) -> Path:
    candidate = Path(raw).expanduser()
    try:
        return candidate.resolve(strict=False)
    except (OSError, RuntimeError) as error:
        raise WorkspaceError(
            "workspace_path_unavailable",
            "workspace path cannot be normalized",
            {"path": str(candidate)},
        ) from error


def _inside(path: Path, root: Path) -> bool:
    try:
        path.relative_to(root)
        return True
    except ValueError:
        return False


def resolve_workspace(profile: str | None = None, db: str | None = None) -> Workspace:
    root = _canonical_path(str(base_dir()))
    if root.exists() and not root.is_dir():
        raise WorkspaceError(
            "workspace_root_unavailable",
            "resident workspace root is not a directory",
            {"root": str(root)},
        )

    selected = profile or os.environ.get("ZOTERO_BRIDGE_PROFILE")
    selected_path: Path | None = None
    is_default = True
    if selected:
        selected_path = canonical_profile(selected)
        known = well_known_profile()
        try:
            is_default = selected_path == known.resolve(strict=True)
        except (OSError, RuntimeError):
            is_default = False

    if is_default:
        workspace_root = root
    else:
        assert selected_path is not None
        workspace_root = root / "workspaces" / profile_identity(selected_path)
    workspace_root = _canonical_path(str(workspace_root))

    if db:
        database = _canonical_path(db)
        if not _inside(database, workspace_root):
            raise WorkspaceError(
                "workspace_path_outside_profile",
                "database path must remain inside the active profile workspace",
                {"database": str(database), "workspace": str(workspace_root)},
            )
    else:
        database = workspace_root / "state.sqlite"
    return Workspace(root, selected_path, workspace_root, database, is_default)


def prepare_workspace(workspace: Workspace) -> None:
    try:
        workspace.workspace.mkdir(parents=True, exist_ok=True)
    except OSError as error:
        raise WorkspaceError(
            "workspace_root_unavailable",
            "resident workspace cannot be created or opened",
            {"workspace": str(workspace.workspace)},
        ) from error
    if not workspace.workspace.is_dir():
        raise WorkspaceError(
            "workspace_root_unavailable",
            "resident workspace is not a directory",
            {"workspace": str(workspace.workspace)},
        )
