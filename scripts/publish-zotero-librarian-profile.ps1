param(
  [string]$Branch = "host-bridge/zotero-librarian-profile",
  [string]$Remote = "origin",
  [string]$WorktreePath = "",
  [switch]$AllowDirty,
  [switch]$Push
)

$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..")).Path
$profileRoot = Join-Path $repoRoot "profiles" "hermes" "zotero-librarian"
$addonBin = Join-Path $repoRoot "addon" "bin"
$addonBinManifestPath = "addon/bin"
$platforms = @(
  @{ platform = "win32-x64"; binary = "zotero-bridge.exe" },
  @{ platform = "darwin-x64"; binary = "zotero-bridge" },
  @{ platform = "darwin-arm64"; binary = "zotero-bridge" },
  @{ platform = "linux-x86"; binary = "zotero-bridge" },
  @{ platform = "linux-x64"; binary = "zotero-bridge" },
  @{ platform = "linux-arm"; binary = "zotero-bridge" },
  @{ platform = "linux-arm64"; binary = "zotero-bridge" }
)

function Invoke-Git {
  param([string[]]$GitArgs)
  & git -C $repoRoot @GitArgs
  if ($LASTEXITCODE -ne 0) {
    throw "git $($GitArgs -join ' ') failed"
  }
}

function Get-FileSha256 {
  param([string]$Path)
  return (Get-FileHash -Algorithm SHA256 -LiteralPath $Path).Hash.ToLowerInvariant()
}

function Assert-File {
  param([string]$Path)
  if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
    throw "Missing required file: $Path"
  }
}

if (-not (Test-Path -LiteralPath $profileRoot -PathType Container)) {
  throw "Missing profile source directory: $profileRoot"
}

$dirty = (& git -C $repoRoot status --porcelain)
if ($dirty -and -not $AllowDirty) {
  throw "Working tree is dirty. Re-run with -AllowDirty when publishing generated profile output from a prepared tree."
}

foreach ($entry in $platforms) {
  $binaryPath = Join-Path $addonBin (Join-Path $entry.platform $entry.binary)
  $checksumPath = "$binaryPath.sha256"
  Assert-File $binaryPath
  Assert-File $checksumPath
}

$sourceCommit = (& git -C $repoRoot rev-parse HEAD).Trim()
$profileVersion = (Get-Content -LiteralPath (Join-Path $profileRoot "distribution.yaml") -Raw)
if ($profileVersion -notmatch "(?m)^version:\s*(.+)\s*$") {
  throw "distribution.yaml must declare profile version"
}
$profileVersion = $Matches[1].Trim()

if (-not $WorktreePath) {
  $WorktreePath = Join-Path ([System.IO.Path]::GetTempPath()) "zotero-librarian-profile-publish"
}

if (Test-Path -LiteralPath $WorktreePath) {
  Remove-Item -LiteralPath $WorktreePath -Recurse -Force
}

Invoke-Git @("worktree", "add", "-B", $Branch, $WorktreePath)
try {
  Get-ChildItem -LiteralPath $WorktreePath -Force |
    Where-Object { $_.Name -ne ".git" } |
    ForEach-Object { Remove-Item -LiteralPath $_.FullName -Recurse -Force }

  Copy-Item -LiteralPath (Join-Path $profileRoot "*") -Destination $WorktreePath -Recurse -Force

  $targetBinRoot = Join-Path $WorktreePath "assets" "zotero-bridge" "bin"
  New-Item -ItemType Directory -Force -Path $targetBinRoot | Out-Null
  $binaryManifest = @()
  foreach ($entry in $platforms) {
    $sourceDir = Join-Path $addonBin $entry.platform
    $targetDir = Join-Path $targetBinRoot $entry.platform
    New-Item -ItemType Directory -Force -Path $targetDir | Out-Null
    $binaryPath = Join-Path $sourceDir $entry.binary
    $checksumPath = "$binaryPath.sha256"
    Copy-Item -LiteralPath $binaryPath -Destination (Join-Path $targetDir $entry.binary) -Force
    Copy-Item -LiteralPath $checksumPath -Destination (Join-Path $targetDir "$($entry.binary).sha256") -Force
    $binaryManifest += [ordered]@{
      platform = $entry.platform
      binary = "assets/zotero-bridge/bin/$($entry.platform)/$($entry.binary)"
      sha256 = Get-FileSha256 $binaryPath
    }
  }

  $manifest = [ordered]@{
    schema = "zotero-librarian.profile.release-manifest.v1"
    profile = "zotero-librarian"
    profileVersion = $profileVersion
    sourceCommit = $sourceCommit
    dirty = [bool]$dirty
    generatedAt = (Get-Date).ToUniversalTime().ToString("o")
    binaries = $binaryManifest
    generatedCatalogChecksum = Get-FileSha256 (Join-Path $WorktreePath "assets" "profile-manifest-source.json")
  }
  $manifestJson = $manifest | ConvertTo-Json -Depth 10
  Set-Content -LiteralPath (Join-Path $WorktreePath "manifest.json") -Value ($manifestJson + "`n") -Encoding UTF8

  & git -C $WorktreePath add -A
  foreach ($entry in $platforms) {
    if ($entry.platform -notlike "win32-*") {
      & git -C $WorktreePath update-index --chmod=+x "assets/zotero-bridge/bin/$($entry.platform)/$($entry.binary)"
    }
  }
  $status = (& git -C $WorktreePath status --porcelain)
  if (-not $status) {
    Write-Host "No changes for $Branch"
  } else {
    & git -C $WorktreePath commit -m "Publish zotero-librarian Hermes profile"
    if ($LASTEXITCODE -ne 0) {
      throw "git commit failed"
    }
    if ($Push) {
      & git -C $WorktreePath push $Remote $Branch
      if ($LASTEXITCODE -ne 0) {
        throw "git push failed"
      }
    }
  }
} finally {
  & git -C $repoRoot worktree remove $WorktreePath --force | Out-Null
}
