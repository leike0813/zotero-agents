<#
.SYNOPSIS
    Publish the Host Bridge CLI binaries and wrapper skill as an isolated branch.
.DESCRIPTION
    Creates a temporary worktree, materializes the current Host Bridge CLI
    bundle files from addon\bin, appends a normal commit to the target branch,
    and optionally pushes it to the configured remote. GitHub Actions builds
    and restores the CLI binaries before invoking this script for release.
    Pass -ReplaceHistory only when intentionally replacing the branch with a
    new orphan snapshot.
.EXAMPLE
    .\scripts\publish-host-bridge-cli-bundle.ps1 -DryRun
.EXAMPLE
    .\scripts\publish-host-bridge-cli-bundle.ps1 -AllowDirty
.EXAMPLE
    .\scripts\publish-host-bridge-cli-bundle.ps1 -Push
#>
[CmdletBinding()]
param(
    [string]$Branch = 'host-bridge/zotero-bridge-cli-bundle',
    [string]$BaseRef = 'HEAD',
    [string]$Remote = 'origin',
    [switch]$Push,
    [switch]$DryRun,
    [switch]$AllowDirty,
    [switch]$ReplaceHistory
)

$ErrorActionPreference = 'Stop'

function Log-Info { param($m) Write-Host "==> $m" -ForegroundColor Cyan }
function Log-Warn { param($m) Write-Host "!! $m" -ForegroundColor Yellow }
function Log-Error { param($m) Write-Host "ERROR: $m" -ForegroundColor Red; exit 1 }
function Need-Command {
    param($name)
    if (-not (Get-Command $name -ErrorAction SilentlyContinue)) {
        Log-Error "Missing required command: $name"
    }
}

function Normalize-PathForManifest {
    param([string]$Path)
    return ($Path -replace '\\', '/')
}

function Copy-DirectoryContents {
    param(
        [string]$Source,
        [string]$Destination
    )
    New-Item -ItemType Directory -Path $Destination -Force | Out-Null
    Copy-Item -Path (Join-Path $Source '*') -Destination $Destination -Recurse -Force
}

function Read-Sha256File {
    param([string]$Path)
    if (-not (Test-Path -LiteralPath $Path)) {
        return ''
    }
    $text = Get-Content -Encoding UTF8 -LiteralPath $Path -Raw
    return (($text -split '\s+')[0]).Trim().ToLowerInvariant()
}

function Get-BinaryNameForPlatform {
    param([string]$Platform)
    if ($Platform -like 'win32-*') {
        return 'zotero-bridge.exe'
    }
    return 'zotero-bridge'
}

function Test-LocalBranch {
    param([string]$Name)
    git -C $DevRoot show-ref --verify --quiet "refs/heads/$Name"
    return $LASTEXITCODE -eq 0
}

function Test-RemoteBranch {
    param(
        [string]$RemoteName,
        [string]$Name
    )
    $output = git -C $DevRoot ls-remote --heads $RemoteName $Name 2>$null
    return ($LASTEXITCODE -eq 0) -and -not [string]::IsNullOrWhiteSpace(($output | Out-String))
}

function Fetch-PublishBranch {
    param(
        [string]$RemoteName,
        [string]$Name
    )
    $remoteTrackingRef = "refs/remotes/$RemoteName/$Name"
    git -C $DevRoot fetch $RemoteName "+${Name}:$remoteTrackingRef" 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Log-Error "Failed to fetch $RemoteName/$Name"
    }
    return $remoteTrackingRef
}

Need-Command 'git'
Need-Command 'node'

$DevRoot = git rev-parse --show-toplevel
if (-not $DevRoot) {
    Log-Error "Run this script from inside the zotero-agents git repo."
}
$DevRoot = (Resolve-Path -LiteralPath $DevRoot).Path

$SkillDir = Join-Path $DevRoot 'skills_builtin\zotero-bridge-cli'
$ProfileTemplatePath = Join-Path $SkillDir 'assets\profile.template.json'
$InstallPs1Path = Join-Path $DevRoot 'cli\zotero-bridge\scripts\install.ps1'
$InstallShPath = Join-Path $DevRoot 'cli\zotero-bridge\scripts\install.sh'
$BinRoot = Join-Path $DevRoot 'addon\bin'
if (-not (Test-Path -LiteralPath (Join-Path $SkillDir 'SKILL.md'))) {
    Log-Error "Wrapper skill not found at skills_builtin\zotero-bridge-cli"
}
if (-not (Test-Path -LiteralPath $ProfileTemplatePath)) {
    Log-Error "Profile template not found at skills_builtin\zotero-bridge-cli\assets\profile.template.json"
}
if (-not (Test-Path -LiteralPath $InstallPs1Path)) {
    Log-Error "install.ps1 not found at repository root"
}
if (-not (Test-Path -LiteralPath $InstallShPath)) {
    Log-Error "install.sh not found at repository root"
}
if (-not (Test-Path -LiteralPath $BinRoot)) {
    Log-Error "Bundled CLI bin root not found at addon\bin"
}

$porcelain = git -C $DevRoot status --porcelain
if ($porcelain -and -not $AllowDirty) {
    Log-Error "Working tree has uncommitted changes. Commit/stash them or pass -AllowDirty to publish current bundle files explicitly."
}
if ($porcelain -and $AllowDirty) {
    Log-Warn "Working tree is dirty; publishing only current Host Bridge bundle files."
}

$platformEntries = @()
$platformDirs = Get-ChildItem -LiteralPath $BinRoot -Directory | Sort-Object Name
foreach ($dir in $platformDirs) {
    $binaryName = Get-BinaryNameForPlatform $dir.Name
    $binaryPath = Join-Path $dir.FullName $binaryName
    if (-not (Test-Path -LiteralPath $binaryPath)) {
        continue
    }
    $shaPath = "$binaryPath.sha256"
    if (-not (Test-Path -LiteralPath $shaPath)) {
        Log-Error "Missing checksum for $($dir.Name): $shaPath"
    }
    $actualHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $binaryPath).Hash.ToLowerInvariant()
    $declaredHash = Read-Sha256File $shaPath
    if ($declaredHash -ne $actualHash) {
        Log-Error "Checksum mismatch for $($dir.Name): declared $declaredHash actual $actualHash"
    }
    $platformEntries += [pscustomobject]@{
        platform     = $dir.Name
        binary       = $binaryName
        sourceDir    = $dir.FullName
        binaryPath   = Normalize-PathForManifest "bin/$($dir.Name)/$binaryName"
        checksumPath = Normalize-PathForManifest "bin/$($dir.Name)/$binaryName.sha256"
        sha256       = $actualHash
        size         = (Get-Item -LiteralPath $binaryPath).Length
    }
}

if (-not $platformEntries) {
    Log-Error "No prebuilt Host Bridge CLI binaries found under addon\bin."
}

$sourceCommit = (git -C $DevRoot rev-parse HEAD).Trim()
$sourceShortCommit = (git -C $DevRoot rev-parse --short HEAD).Trim()
$publishedAt = (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ss.fffZ')
$skillFiles = Get-ChildItem -LiteralPath $SkillDir -Recurse -File | ForEach-Object {
    Normalize-PathForManifest ("skills/zotero-bridge-cli/" + (Resolve-Path -Relative -LiteralPath $_.FullName -RelativeBasePath $SkillDir))
}

$publishBaseRef = $BaseRef
$useOrphanPublish = [bool]$ReplaceHistory
if (-not $ReplaceHistory) {
    if (Test-RemoteBranch -RemoteName $Remote -Name $Branch) {
        Log-Info "Fetching existing publish branch $Remote/$Branch"
        $publishBaseRef = Fetch-PublishBranch -RemoteName $Remote -Name $Branch
    }
    elseif (Test-LocalBranch -Name $Branch) {
        Log-Info "Using existing local publish branch $Branch"
        $publishBaseRef = $Branch
    }
    else {
        Log-Warn "Publish branch does not exist yet; creating initial orphan snapshot."
        $useOrphanPublish = $true
    }
}
if ($ReplaceHistory) {
    Log-Warn "ReplaceHistory requested; publishing a new orphan snapshot and force-with-lease pushing when -Push is set."
}

if ($DryRun) {
    Log-Info "DRY RUN"
    Write-Host "  branch: $Branch" -ForegroundColor Gray
    Write-Host "  mode: $(if ($useOrphanPublish) { 'orphan snapshot' } else { "append commit from $publishBaseRef" })" -ForegroundColor Gray
    Write-Host "  source commit: $sourceShortCommit" -ForegroundColor Gray
    Write-Host "  platforms:" -ForegroundColor Gray
    foreach ($entry in $platformEntries) {
        Write-Host "    - $($entry.platform) $($entry.binary) $($entry.size) bytes $($entry.sha256)" -ForegroundColor Gray
    }
    Write-Host "  wrapper skill files: $($skillFiles.Count)" -ForegroundColor Gray
    if ($Push) {
        Write-Host "  would push to $Remote/$Branch" -ForegroundColor Gray
    }
    exit 0
}

# Create temp dir on the same drive as the repo to avoid cross-drive relative
# path resolution failures in git worktree (Windows). On non-Windows, use the
# system temp directory to avoid permission issues at the filesystem root.
if ($IsWindows) {
    $tempBase = (Get-Item -LiteralPath $DevRoot).PSDrive.Root
} else {
    $tempBase = [System.IO.Path]::GetTempPath()
}
$TempDir = Join-Path $tempBase ".tmp-zotero-bridge-bundle-$([Guid]::NewGuid().ToString('N').Substring(0, 8))"
$Worktree = Join-Path $TempDir 'worktree'
$TempBranch = "publish-host-bridge-cli-bundle-$([Guid]::NewGuid().ToString('N').Substring(0, 8))"

try {
    New-Item -ItemType Directory -Path $TempDir -Force | Out-Null
    Log-Info "Creating temporary worktree"
    git -C $DevRoot worktree add --detach "$Worktree" "$publishBaseRef" 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Log-Error "Failed to create temporary worktree from $publishBaseRef"
    }
    # The main repo may have core.worktree set as a relative path. Worktrees
    # inherit that config and resolve it from their own location, which breaks
    # when the worktree lives outside the main repo directory tree. Override
    # with an explicit GIT_WORK_TREE so git commands in the worktree work
    # regardless of where the temp dir is.
    $prevGitWorkTree = $env:GIT_WORK_TREE
    $env:GIT_WORK_TREE = $Worktree

    if ($useOrphanPublish) {
        git -C $Worktree checkout --orphan "$TempBranch" 2>&1 | Out-Null
        if ($LASTEXITCODE -ne 0) {
            Log-Error "Failed to create orphan branch"
        }
    }
    else {
        git -C $Worktree checkout -b "$TempBranch" 2>&1 | Out-Null
        if ($LASTEXITCODE -ne 0) {
            Log-Error "Failed to create temporary publish branch"
        }
    }

    Get-ChildItem -LiteralPath $Worktree -Force | Where-Object {
        $_.Name -ne '.git'
    } | Remove-Item -Recurse -Force

    New-Item -ItemType Directory -Path (Join-Path $Worktree 'bin') -Force | Out-Null
    foreach ($entry in $platformEntries) {
        $platformOut = Join-Path $Worktree "bin\$($entry.platform)"
        New-Item -ItemType Directory -Path $platformOut -Force | Out-Null
        Copy-Item -LiteralPath (Join-Path $entry.sourceDir $entry.binary) -Destination (Join-Path $platformOut $entry.binary) -Force
        Copy-Item -LiteralPath (Join-Path $entry.sourceDir "$($entry.binary).sha256") -Destination (Join-Path $platformOut "$($entry.binary).sha256") -Force
    }
    Copy-DirectoryContents -Source $SkillDir -Destination (Join-Path $Worktree 'skills\zotero-bridge-cli')
    New-Item -ItemType Directory -Path (Join-Path $Worktree 'assets') -Force | Out-Null
    Copy-Item -LiteralPath $ProfileTemplatePath -Destination (Join-Path $Worktree 'assets\profile.template.json') -Force
    Copy-Item -LiteralPath $InstallPs1Path -Destination (Join-Path $Worktree 'install.ps1') -Force
    Copy-Item -LiteralPath $InstallShPath -Destination (Join-Path $Worktree 'install.sh') -Force

    $manifest = [ordered]@{
        schema          = 'zotero-bridge-cli-bundle.v1'
        source          = [ordered]@{
            repository = 'zotero-agents'
            commit     = $sourceCommit
            dirty      = [bool]$porcelain
        }
        publishedAt     = $publishedAt
        branch          = $Branch
        cli             = [ordered]@{
            name      = 'zotero-bridge'
            platforms = @($platformEntries | ForEach-Object {
                    [ordered]@{
                        platform   = $_.platform
                        binary     = $_.binaryPath
                        sha256     = $_.sha256
                        sha256File = $_.checksumPath
                        size       = $_.size
                    }
                })
        }
        wrapperSkill    = [ordered]@{
            id         = 'zotero-bridge-cli'
            path       = 'skills/zotero-bridge-cli'
            entrypoint = 'skills/zotero-bridge-cli/SKILL.md'
        }
        profileTemplate = [ordered]@{
            path              = 'assets/profile.template.json'
            skillPath         = 'skills/zotero-bridge-cli/assets/profile.template.json'
            endpointEnv       = 'ZOTERO_BRIDGE_ENDPOINT'
            tokenEnv          = 'ZOTERO_BRIDGE_TOKEN'
            scopeEnv          = 'ZOTERO_BRIDGE_SCOPE'
            connectionModeEnv = 'ZOTERO_BRIDGE_CONNECTION_MODE'
        }
        installer       = [ordered]@{
            schema               = 'zotero-bridge-cli-installer.v1'
            windowsEntrypoint    = 'install.ps1'
            posixEntrypoint      = 'install.sh'
            defaultAppDirName    = 'zotero-agents'
            supportsJson         = $true
            supportsUpgrade      = $true
            supportsPlatformFlag = $false
            installDirEnv        = 'ZOTERO_BRIDGE_INSTALL_DIR'
            tokenEnvDefault      = 'ZOTERO_BRIDGE_TOKEN'
        }
    }
    $manifest | ConvertTo-Json -Depth 8 | Set-Content -Encoding UTF8 -LiteralPath (Join-Path $Worktree 'manifest.json')

    @"
# Zotero Host Bridge CLI Bundle

This branch is generated from the zotero-agents repository and contains only:

- prebuilt zotero-bridge CLI binaries under bin/
- the zotero-bridge-cli wrapper skill under skills/zotero-bridge-cli/
- assets/profile.template.json, a well-known profile template for local and remote use
- install.ps1 and install.sh for installing or upgrading the current-platform CLI
- manifest.json with source commit, platform list, sizes, and checksums

Source commit: $sourceCommit
Published at: $publishedAt

Use this branch as a submodule, subtree, or vendored source in projects that
need the Host Bridge CLI and its wrapper skill without embedding the full plugin
repository.

## Install or upgrade

Windows:

```powershell
.\install.ps1 --yes --json --write-profile
```

Linux/macOS:

```sh
./install.sh --yes --json --write-profile
```

The installer auto-detects the current platform. It does not accept a platform
override. Pass `--install-dir` or `ZOTERO_BRIDGE_INSTALL_DIR` only when the
default user-level location is not appropriate. Re-running the installer is an
upgrade: the target binary is replaced only when the bundled checksum differs.

For agents, use `--yes --json` and pass runtime configuration through
environment variables or explicit flags:

```sh
./install.sh --yes --json --write-profile --endpoint http://127.0.0.1:26570/bridge/v1 --token-env ZOTERO_BRIDGE_TOKEN
```

## Profile template and environment overrides

Copy assets/profile.template.json to the Host Bridge well-known profile location, or set
ZOTERO_BRIDGE_PROFILE to its path. The well-known profile paths are:

- Windows: %LOCALAPPDATA%\zotero-agents\bridge-profile.json
- macOS: ~/Library/Application Support/zotero-agents/bridge-profile.json
- Linux: `${XDG_DATA_HOME:-~/.local/share}/zotero-agents/bridge-profile.json

The template defaults to local loopback access and reads the bearer token from
ZOTERO_BRIDGE_TOKEN.

Environment variables override the template at runtime:

- ZOTERO_BRIDGE_ENDPOINT: endpoint URL, for example
  http://127.0.0.1:26570/bridge/v1 for local calls or
  http://<advertisedHost>:<pinnedPort>/bridge/v1 for LAN remote calls.
- ZOTERO_BRIDGE_TOKEN: bearer token supplied by the Zotero plugin or deployment
  environment.
- ZOTERO_BRIDGE_SCOPE: approval routing scope JSON. SkillRunner jobs use
  {"kind":"skillrunner-run","requestId":"...","runId":"..."} so write
  approvals return to the SkillRunner panel.
- ZOTERO_BRIDGE_CONNECTION_MODE: local or remote. Use remote for SkillRunner/LAN
  calls so file-export capabilities return Host Bridge download bundles instead
  of writing caller-local paths.
"@ | Set-Content -Encoding UTF8 -LiteralPath (Join-Path $Worktree 'README.md')

    git -C $Worktree add -A 2>&1 | Out-Null
    git -C $Worktree update-index --chmod=+x install.sh 2>&1 | Out-Null
    foreach ($entry in $platformEntries) {
        if ($entry.platform -notlike 'win32-*') {
            git -C $Worktree update-index --chmod=+x $entry.binaryPath 2>&1 | Out-Null
        }
    }
    $pending = git -C $Worktree status --porcelain
    if ($pending) {
        git -C $Worktree commit -m "publish(host-bridge-cli): sync bundle from $sourceShortCommit" 2>&1 | Out-Null
        if ($LASTEXITCODE -ne 0) {
            Log-Error "Failed to commit bundle branch"
        }
    }
    else {
        Log-Warn "Bundle branch already matches current materialized files; reusing existing commit."
    }
    $commit = (git -C $Worktree rev-parse HEAD).Trim()

    git -C $Worktree checkout --detach HEAD 2>&1 | Out-Null
    git -C $DevRoot branch -f "$Branch" "$commit" 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Log-Error "Failed to update local branch $Branch"
    }

    if ($Push) {
        Log-Info "Pushing $Branch to $Remote"
        if ($ReplaceHistory) {
            git -C $DevRoot push --force-with-lease -u "$Remote" "$Branch" 2>&1 | Out-Null
        }
        else {
            git -C $DevRoot push -u "$Remote" "$Branch" 2>&1 | Out-Null
        }
        if ($LASTEXITCODE -ne 0) {
            Log-Error "Failed to push $Branch"
        }
    }

    Log-Info "Published $Branch at $commit"
}
finally {
    $env:GIT_WORK_TREE = $prevGitWorkTree
    if (Test-Path -LiteralPath $Worktree) {
        git -C $DevRoot worktree remove --force "$Worktree" 2>$null | Out-Null
    }
    git -C $DevRoot branch -D "$TempBranch" 2>$null | Out-Null
    git -C $DevRoot worktree prune 2>$null | Out-Null
    if (Test-Path -LiteralPath $TempDir) {
        Remove-Item -Recurse -Force -LiteralPath $TempDir -ErrorAction SilentlyContinue
    }
}
