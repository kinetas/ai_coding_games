# CardForge: Flutter/Dart를 현재 세션 PATH에 올립니다.
# - 사용자 환경 변수 FLUTTER_ROOT가 있으면 우선 사용
# - 없으면 기본값 C:\src\flutter (git clone stable 설치 경로)
$ErrorActionPreference = "Stop"
$root = $env:FLUTTER_ROOT
if (-not $root) { $root = "C:\src\flutter" }
$bin = Join-Path $root "bin"
if (-not (Test-Path (Join-Path $bin "flutter.bat"))) {
    Write-Error "Flutter SDK를 찾을 수 없습니다. FLUTTER_ROOT를 설정하거나 $root 에 Flutter를 설치하세요."
}
$env:Path = "$bin;$env:Path"
Write-Host "Flutter PATH: $bin" -ForegroundColor Green
