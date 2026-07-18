param(
  [string]$RepositoryUrl = "https://github.com/leike0813/zotero-library-agent-bundle.git",
  [string]$Branch = "main",
  [string]$Remote = "origin",
  [string]$WorktreePath = "",
  [switch]$AllowDirty,
  [switch]$DryRun,
  [switch]$Push
)

$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..")).Path
$agentSkillRoot = Join-Path $repoRoot "skills_builtin" "zotero-library-agent"
$wrapperSkillRoot = Join-Path $repoRoot "skills_builtin" "zotero-bridge-cli"
$addonBin = Join-Path $repoRoot "addon" "bin"
$cliReleasePath = Join-Path $repoRoot "cli" "zotero-bridge" "release.json"
$profileTemplate = Join-Path $wrapperSkillRoot "assets" "profile.template.json"
$installPs1 = Join-Path $repoRoot "cli" "zotero-bridge" "scripts" "install.ps1"
$installSh = Join-Path $repoRoot "cli" "zotero-bridge" "scripts" "install.sh"
$mainRepository = "https://github.com/leike0813/zotero-agents"
$releaseRepository = "https://github.com/leike0813/zotero-library-agent-bundle"
$releaseSetPath = Join-Path $repoRoot "host-bridge" "release-set.json"

function Invoke-BundleGit {
  param([string[]]$GitArgs)
  & git -C $WorktreePath @GitArgs
  if ($LASTEXITCODE -ne 0) {
    throw "git $($GitArgs -join ' ') failed"
  }
}

function Assert-File {
  param([string]$Path)
  if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
    throw "Missing required file: $Path"
  }
}

function Get-FileSha256 {
  param([string]$Path)
  return (Get-FileHash -Algorithm SHA256 -LiteralPath $Path).Hash.ToLowerInvariant()
}

function Copy-DirectoryContents {
  param([string]$Source, [string]$Destination)
  New-Item -ItemType Directory -Force -Path $Destination | Out-Null
  Get-ChildItem -LiteralPath $Source -Force | ForEach-Object {
    Copy-Item -LiteralPath $_.FullName -Destination (Join-Path $Destination $_.Name) -Recurse -Force
  }
}

function Clear-DirectoryExceptGit {
  param([string]$Path)
  Get-ChildItem -LiteralPath $Path -Force |
    Where-Object { $_.Name -ne ".git" } |
    ForEach-Object { Remove-Item -LiteralPath $_.FullName -Recurse -Force }
}

Assert-File (Join-Path $agentSkillRoot "SKILL.md")
Assert-File (Join-Path $agentSkillRoot "README.md")
Assert-File (Join-Path $wrapperSkillRoot "SKILL.md")
Assert-File $profileTemplate
Assert-File $installPs1
Assert-File $installSh
Assert-File $cliReleasePath
Assert-File $releaseSetPath
$releaseSet = Get-Content -LiteralPath $releaseSetPath -Raw | ConvertFrom-Json
if ([string]$releaseSet.schema -ne "host-bridge.release-set.v1") {
  throw "Invalid Host Bridge release set"
}
$platforms = @($releaseSet.cli.binaries | ForEach-Object {
  @{ platform = [string]$_.platform; binary = [string]$_.binary }
})

$dirty = (& git -C $repoRoot status --porcelain)
if ($dirty -and -not $AllowDirty) {
  throw "Working tree is dirty. Re-run with -AllowDirty only for a reviewed generated surface."
}

$manifestSourcePath = Join-Path $agentSkillRoot "assets" "bundle-manifest-source.json"
Assert-File $manifestSourcePath
$manifestSource = Get-Content -LiteralPath $manifestSourcePath -Raw | ConvertFrom-Json
$bundleVersion = [string]$manifestSource.generated.bundleVersion
$cliVersion = [string]$manifestSource.generated.cliVersion
if (-not $bundleVersion -or -not $cliVersion) {
  throw "bundle-manifest-source.json must declare bundleVersion and cliVersion"
}

$cliRelease = Get-Content -LiteralPath $cliReleasePath -Raw | ConvertFrom-Json
if ([string]$cliRelease.version -ne $cliVersion) {
  throw "bundle CLI version does not match cli/zotero-bridge/release.json"
}

$binaryManifest = @()
foreach ($entry in $platforms) {
  $binaryPath = Join-Path $addonBin (Join-Path $entry.platform $entry.binary)
  $checksumPath = "$binaryPath.sha256"
  Assert-File $binaryPath
  Assert-File $checksumPath
  $actual = Get-FileSha256 $binaryPath
  $recorded = $cliRelease.binaries | Where-Object { $_.platform -eq $entry.platform } | Select-Object -First 1
  if (-not $recorded -or [string]$recorded.sha256 -ne $actual) {
    throw "CLI release checksum mismatch for $($entry.platform)"
  }
  $binaryManifest += [ordered]@{
    platform = $entry.platform
    binary = "bin/$($entry.platform)/$($entry.binary)"
    checksum = "bin/$($entry.platform)/$($entry.binary).sha256"
    sha256 = $actual
    size = (Get-Item -LiteralPath $binaryPath).Length
  }
}

$sourceCommit = (& git -C $repoRoot rev-parse HEAD).Trim()
if ($DryRun) {
  [ordered]@{
    schema = "zotero-library-agent.bundle.publish-plan.v1"
    repository = $RepositoryUrl
    branch = $Branch
    sourceCommit = $sourceCommit
    bundleVersion = $bundleVersion
    cliVersion = $cliVersion
    binaries = $binaryManifest
  } | ConvertTo-Json -Depth 10
  exit 0
}

if (-not $WorktreePath) {
  $WorktreePath = Join-Path ([System.IO.Path]::GetTempPath()) "zotero-library-agent-bundle-publish"
}
if (Test-Path -LiteralPath $WorktreePath) {
  Remove-Item -LiteralPath $WorktreePath -Recurse -Force
}

if ($Push) {
  & git clone $RepositoryUrl $WorktreePath
  if ($LASTEXITCODE -ne 0) {
    throw "git clone failed for $RepositoryUrl"
  }
  & git -C $WorktreePath config user.name "github-actions[bot]"
  & git -C $WorktreePath config user.email "41898282+github-actions[bot]@users.noreply.github.com"
  Invoke-BundleGit @("checkout", "-B", $Branch)
} else {
  New-Item -ItemType Directory -Force -Path $WorktreePath | Out-Null
  Invoke-BundleGit @("init")
  & git -C $WorktreePath config user.name "github-actions[bot]"
  & git -C $WorktreePath config user.email "41898282+github-actions[bot]@users.noreply.github.com"
  Invoke-BundleGit @("checkout", "-B", $Branch)
  Invoke-BundleGit @("remote", "add", $Remote, $RepositoryUrl)
}

try {
  Clear-DirectoryExceptGit $WorktreePath
  Copy-DirectoryContents $agentSkillRoot (Join-Path $WorktreePath "skills" "zotero-library-agent")
  Copy-Item -LiteralPath (Join-Path $agentSkillRoot "README.md") -Destination (Join-Path $WorktreePath "README.md") -Force
  Copy-DirectoryContents $wrapperSkillRoot (Join-Path $WorktreePath "skills" "zotero-bridge-cli")
  New-Item -ItemType Directory -Force -Path (Join-Path $WorktreePath "assets") | Out-Null
  Copy-Item -LiteralPath $profileTemplate -Destination (Join-Path $WorktreePath "assets" "profile.template.json") -Force
  Copy-Item -LiteralPath $installPs1 -Destination (Join-Path $WorktreePath "install.ps1") -Force
  Copy-Item -LiteralPath $installSh -Destination (Join-Path $WorktreePath "install.sh") -Force
  Copy-Item -LiteralPath $cliReleasePath -Destination (Join-Path $WorktreePath "cli-release.json") -Force
  New-Item -ItemType Directory -Force -Path (Join-Path $WorktreePath "schemas") | Out-Null
  Copy-Item -LiteralPath (Join-Path $agentSkillRoot "assets" "evidence-bundle.schema.json") -Destination (Join-Path $WorktreePath "schemas" "evidence-bundle.schema.json") -Force
  New-Item -ItemType Directory -Force -Path (Join-Path $WorktreePath "scripts") | Out-Null
  Copy-Item -LiteralPath (Join-Path $agentSkillRoot "scripts" "zotero_library_agent.py") -Destination (Join-Path $WorktreePath "scripts" "zotero_library_agent.py") -Force

  foreach ($entry in $platforms) {
    $sourceDir = Join-Path $addonBin $entry.platform
    $targetDir = Join-Path $WorktreePath (Join-Path "bin" $entry.platform)
    New-Item -ItemType Directory -Force -Path $targetDir | Out-Null
    Copy-Item -LiteralPath (Join-Path $sourceDir $entry.binary) -Destination (Join-Path $targetDir $entry.binary) -Force
    Copy-Item -LiteralPath (Join-Path $sourceDir "$($entry.binary).sha256") -Destination (Join-Path $targetDir "$($entry.binary).sha256") -Force
  }

  $manifest = [ordered]@{
    schema = "host-bridge.surface-release.v1"
    releaseSetId = [string]$releaseSet.releaseSetId
    releaseSet = $releaseSet
    bundle = [ordered]@{
      name = "zotero-library-agent-bundle"
      version = $bundleVersion
    }
    sourceRepository = $mainRepository
    releaseRepository = $releaseRepository
    sourceCommit = $sourceCommit
    dirty = [bool]$dirty
    cliIdentity = $releaseSet.cli.identity
    cli = [ordered]@{
      version = $cliVersion
      buildFingerprint = [string]$releaseSet.cli.buildFingerprint
      commandCatalogChecksum = [string]$releaseSet.cli.commandCatalogChecksum
      binaryAggregateSha256 = [string]$releaseSet.cli.binaryAggregateSha256
      releaseManifest = "cli-release.json"
      binaries = $binaryManifest
    }
    skills = @(
      [ordered]@{ id = "zotero-library-agent"; path = "skills/zotero-library-agent"; entrypoint = "skills/zotero-library-agent/SKILL.md" },
      [ordered]@{ id = "zotero-bridge-cli"; path = "skills/zotero-bridge-cli"; entrypoint = "skills/zotero-bridge-cli/SKILL.md" }
    )
    evidenceSchema = "schemas/evidence-bundle.schema.json"
    helper = "scripts/zotero_library_agent.py"
    profileTemplate = "assets/profile.template.json"
  }
  Set-Content -LiteralPath (Join-Path $WorktreePath "manifest.json") -Value (($manifest | ConvertTo-Json -Depth 12) + "`n") -Encoding UTF8

  Invoke-BundleGit @("add", "-A")
  Invoke-BundleGit @("update-index", "--chmod=+x", "install.sh")
  Invoke-BundleGit @("update-index", "--chmod=+x", "scripts/zotero_library_agent.py")
  foreach ($entry in $platforms) {
    if ($entry.platform -notlike "win32-*") {
      Invoke-BundleGit @("update-index", "--chmod=+x", "bin/$($entry.platform)/$($entry.binary)")
    }
  }
  $status = (& git -C $WorktreePath status --porcelain)
  if (-not $status) {
    Write-Host "No changes for $RepositoryUrl $Branch"
  } else {
    Invoke-BundleGit @("commit", "-m", "Publish Zotero Library Agent bundle")
    if ($Push) {
      Invoke-BundleGit @("push", $Remote, "HEAD:$Branch")
    }
  }
} finally {
  if ($Push) {
    Remove-Item -LiteralPath $WorktreePath -Recurse -Force
  } else {
    Write-Host "Prepared bundle repository worktree at $WorktreePath"
  }
}
