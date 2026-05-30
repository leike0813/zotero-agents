<#
.SYNOPSIS
    Publish builtin skills as isolated git branches (e.g. skill/create-topic-synthesis).
.DESCRIPTION
    For each target skill, creates a temporary worktree, populates it with only that
    skill's files, creates an orphan branch, commits, and optionally pushes to remote.
    The worktree is automatically cleaned up after each skill.
.EXAMPLE
    .\scripts\publish-skills.ps1              # publish all 4 default skills
    .\scripts\publish-skills.ps1 -DryRun      # preview what would happen
    .\scripts\publish-skills.ps1 -Push        # publish and push to remote
    .\scripts\publish-skills.ps1 -Skills create-topic-synthesis  # publish a single skill
#>
[CmdletBinding()]
param(
    [string[]]$Skills = @(
        'create-topic-synthesis',
        'literature-search-ingest',
        'manuscript-literature-framing',
        'update-topic-synthesis'
    ),
    [string]$Prefix = 'skill/',
    [string]$BaseBranch = 'main',
    [switch]$Push,
    [switch]$DryRun
)

$ErrorActionPreference = 'Stop'

function Log-Info  { param($m) Write-Host "==> $m" -ForegroundColor Cyan }
function Log-Warn  { param($m) Write-Host "!! $m" -ForegroundColor Yellow }
function Log-Error { param($m) Write-Host "ERROR: $m" -ForegroundColor Red; exit 1 }
function Need-Command {
    param($name)
    if (-not (Get-Command $name -ErrorAction SilentlyContinue)) {
        Log-Error "Missing required command: $name"
    }
}

# ---------------------------
# Preflight
# ---------------------------
Need-Command 'git'

$DevRoot = git rev-parse --show-toplevel
if (-not $DevRoot) { Log-Error "Run this script from inside the Zotero-Skills git repo." }
$DevRoot = Resolve-Path $DevRoot

Log-Info "DEV_ROOT = $DevRoot"

# Check worktree is clean
$porcelain = git -C $DevRoot status --porcelain
if ($porcelain) {
    Log-Error "Working tree has uncommitted changes. Commit or stash them first."
}

# Validate skill dirs
foreach ($skill in $Skills) {
    $skillDir = Join-Path $DevRoot "skills_builtin\$skill"
    if (-not (Test-Path $skillDir)) {
        Log-Error "Skill directory not found: skills_builtin\$skill"
    }
    if (-not (Test-Path (Join-Path $skillDir "SKILL.md"))) {
        Log-Error "SKILL.md not found in: skills_builtin\$skill"
    }
}

# Fetch and verify base branch
git -C $DevRoot fetch origin --prune 2>&1 | Out-Null
$baseRef = "origin/$BaseBranch"
$hasBase = git -C $DevRoot show-ref --verify --quiet "refs/remotes/$baseRef"
if (-not $hasBase) {
    Log-Error "Remote branch '$baseRef' not found. Run 'git fetch origin' or check -BaseBranch."
}

# ---------------------------
# Temp dir for worktrees
# ---------------------------
$TempDir = Join-Path ([System.IO.Path]::GetTempPath()) "zotero-skills-publish-$([Guid]::NewGuid().ToString('N').Substring(0,8))"
New-Item -ItemType Directory -Path $TempDir -Force | Out-Null

$cleanup = {
    if (Test-Path $TempDir) {
        git -C $DevRoot worktree prune 2>$null
        Remove-Item -Recurse -Force $TempDir -ErrorAction SilentlyContinue
    }
}
Register-ObjectEvent -InputObject $null -EventName 'Disposed' -Action $cleanup 2>$null | Out-Null
# Also register via trap for reliable cleanup
trap { $cleanup.Invoke(); throw }

# ---------------------------
# Dry run
# ---------------------------
if ($DryRun) {
    Log-Info "DRY RUN plan:"
    foreach ($skill in $Skills) {
        $branch = "$Prefix$skill"
        $fileCount = (Get-ChildItem -Recurse -File (Join-Path $DevRoot "skills_builtin\$skill")).Count
        $exists = git -C $DevRoot show-ref --verify --quiet "refs/remotes/origin/$branch"
        $action = if ($exists) { "update" } else { "create" }
        Write-Host "  - $action branch '$branch' with $fileCount files from skills_builtin\$skill" -ForegroundColor Gray
    }
    if ($Push) { Write-Host "  - would push all branches to origin" -ForegroundColor Gray }
    exit 0
}

# ---------------------------
# Publish each skill
# ---------------------------
foreach ($skill in $Skills) {
    $skillDir = Join-Path $DevRoot "skills_builtin\$skill"
    $branch   = "$Prefix$skill"
    $skillWt  = Join-Path $TempDir "wt-$skill"

    Log-Info "Publishing '$skill' -> branch '$branch'"

    # Create temp worktree detached from origin/base
    git -C $DevRoot worktree add --detach "$skillWt" "$baseRef" 2>&1 | Out-Null

    try {
        # Create orphan branch
        git -C $skillWt checkout --orphan "$branch" 2>&1 | Out-Null

        # Clear all contents including hidden files
        Get-ChildItem -Path $skillWt -Force -Recurse | Where-Object {
            $_.FullName -ne $skillWt
        } | Remove-Item -Recurse -Force

        # Copy skill files into worktree
        Copy-Item -Path "$skillDir\*" -Destination "$skillWt" -Recurse -Force

        # Stage and commit
        git -C $skillWt add -A 2>&1 | Out-Null
        $hasChanges = -not (git -C $skillWt diff --cached --quiet 2>$null)

        if ($hasChanges) {
            git -C $skillWt commit -m "publish($skill): sync skill root" 2>&1 | Out-Null
        } else {
            git -C $skillWt commit --allow-empty -m "init($skill): create $branch" 2>&1 | Out-Null
        }

        # Push if requested
        if ($Push) {
            Log-Info "  Pushing '$branch' to origin..."
            git -C $skillWt push -u origin "$branch" 2>&1 | Out-Null
        }

        Log-Info "  Done: $branch"
    }
    finally {
        # Clean up worktree
        if (Test-Path $skillWt) {
            # Remove .git file so worktree remove works cleanly
            git -C $DevRoot worktree remove --force "$skillWt" 2>$null | Out-Null
            if (Test-Path $skillWt) {
                Remove-Item -Recurse -Force $skillWt -ErrorAction SilentlyContinue
            }
        }
    }
}

git -C $DevRoot worktree prune 2>$null | Out-Null
Log-Info "All $($Skills.Count) skill(s) published."
if ($Push) { Log-Info "Branches pushed to origin." }
else       { Log-Info "Add -Push to push branches to remote." }
