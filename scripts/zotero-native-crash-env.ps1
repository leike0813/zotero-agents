#!/usr/bin/env pwsh
# 查询或切换 Windows 上让桌面图标启动的 Zotero 写 full dump 的三条 Mozilla 变量。
# 仅操作当前用户的用户变量；进程级变量随启动结束消失，机器级变量由安装程序控制。
# 设置或清除后必须注销并重新登录 Windows，下次桌面启动的 Zotero 才会继承新值。
[CmdletBinding(SupportsShouldProcess = $true)]
param(
    [ValidateSet("status", "enable", "disable")]
    [string]$Action = "status"
)

$ErrorActionPreference = "Stop"

$Script:VARS = @(
    "MOZ_CRASHREPORTER",
    "MOZ_CRASHREPORTER_NO_REPORT",
    "MOZ_CRASHREPORTER_FULLDUMP"
)

$Script:DISABLE_KEY = "MOZ_CRASHREPORTER_DISABLE"

function Read-UserEnv([string]$Name) {
    [Environment]::GetEnvironmentVariable($Name, "User")
}

function Write-UserEnv([string]$Name, [string]$Value) {
    if ($PSCmdlet.ShouldProcess("user env $Name", "set to $Value")) {
        [Environment]::SetEnvironmentVariable($Name, $Value, "User")
    }
}

function Remove-UserEnv([string]$Name) {
    if ($PSCmdlet.ShouldProcess("user env $Name", "remove")) {
        [Environment]::SetEnvironmentVariable($Name, $null, "User")
    }
}

function Show-Status() {
    $rows = @()
    foreach ($name in $Script:VARS) {
        $rows += [pscustomobject]@{
            Variable = $name
            User     = Read-UserEnv $name
            Required = "1"
        }
    }
    $rows += [pscustomobject]@{
        Variable = $Script:DISABLE_KEY
        User     = Read-UserEnv $Script:DISABLE_KEY
        Required = "(must be unset)"
    }
    $rows | Format-Table Variable, User, Required -AutoSize
    $missing = @($Script:VARS | Where-Object { -not (Read-UserEnv $_) })
    $disableSet = [bool](Read-UserEnv $Script:DISABLE_KEY)
    $enabled = ($missing.Count -eq 0) -and (-not $disableSet)
    if ($enabled) {
        Write-Host "State: enabled. Sign out and sign back in so desktop launches inherit the values." -ForegroundColor Green
    } elseif ($disableSet) {
        Write-Host "State: blocked. MOZ_CRASHREPORTER_DISABLE is set; remove it before Mozilla will write dumps." -ForegroundColor Yellow
    } else {
        Write-Host ("State: disabled. Missing: " + ($missing -join ", ")) -ForegroundColor Yellow
    }
}

switch ($Action) {
    "status" {
        Show-Status
    }
    "enable" {
        if (Read-UserEnv $Script:DISABLE_KEY) {
            Remove-UserEnv $Script:DISABLE_KEY
        }
        foreach ($name in $Script:VARS) {
            Write-UserEnv $name "1"
        }
        Show-Status
        Write-Host "Remember to sign out and sign back in before double-clicking the Zotero desktop icon." -ForegroundColor Cyan
    }
    "disable" {
        foreach ($name in $Script:VARS) {
            Remove-UserEnv $name
        }
        Show-Status
        Write-Host "Remember to sign out and sign back in so the new shell no longer carries the variables." -ForegroundColor Cyan
    }
}

