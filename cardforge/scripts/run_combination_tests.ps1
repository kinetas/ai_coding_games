# combination_engine 단위 테스트 실행 (PATH에 flutter 없을 때도 동작)
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..
. "$PSScriptRoot\flutter_env.ps1"
flutter pub get
flutter test test/combination_engine_test.dart
