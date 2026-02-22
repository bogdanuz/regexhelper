# Fetch and build regexper-static, then copy bundle to assets/libs/regexper/
# Run from repo root, e.g.: .\tools\visualizer\scripts\fetch-regexper-static.ps1
# Use a path WITHOUT Cyrillic characters to avoid encoding issues (e.g. C:\work\regexhelper).

$ErrorActionPreference = "Stop"
$RepoUrl = "https://gitlab.com/javallone/regexper-static.git"
$CloneDir = Join-Path $env:TEMP "regexper-static-build"
$TargetDir = Join-Path $PSScriptRoot "..\..\..\assets\libs\regexper"

# Resolve target relative to script (script is tools/visualizer/scripts/)
$TargetDir = [System.IO.Path]::GetFullPath($TargetDir)

Write-Host "Clone: $RepoUrl -> $CloneDir"
if (Test-Path $CloneDir) {
    Remove-Item -Recurse -Force $CloneDir
}
git clone --depth 1 $RepoUrl $CloneDir
Set-Location $CloneDir

Write-Host "yarn install..."
yarn install
Write-Host "yarn build..."
yarn build

$BuildDir = Join-Path $CloneDir "build"
if (-not (Test-Path $BuildDir)) {
    Write-Error "Build output not found: $BuildDir"
}

if (-not (Test-Path $TargetDir)) {
    New-Item -ItemType Directory -Path $TargetDir -Force
}

$MainJs = Get-ChildItem -Path $BuildDir -Filter "main-*.js" | Select-Object -First 1
$MainCss = Get-ChildItem -Path $BuildDir -Filter "main-*.css" | Select-Object -First 1
if (-not $MainJs -or -not $MainCss) {
    Write-Error "main-*.js or main-*.css not found in build"
}

Copy-Item $MainJs.FullName (Join-Path $TargetDir "regexper.js")
Copy-Item $MainCss.FullName (Join-Path $TargetDir "regexper.css")

# Copy any chunk files (e.g. 1-xxx.js) so regexper.js can load them
Get-ChildItem -Path $BuildDir -File | Where-Object { $_.Name -match "^\d+-.+\.(js|css)$" } | ForEach-Object {
    Copy-Item $_.FullName (Join-Path $TargetDir $_.Name)
}

Set-Location (Split-Path $PSScriptRoot -Parent)
Write-Host "Done. Bundle copied to $TargetDir"
Remove-Item -Recurse -Force $CloneDir -ErrorAction SilentlyContinue
