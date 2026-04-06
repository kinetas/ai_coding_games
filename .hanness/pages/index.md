# Hanness Page Index — CardForge MVP

| 순서 | 파일 | 내용 | 의존 | 상태 |
|------|------|------|------|------|
| 01 | page_01_models.page | 데이터 모델 + 프로젝트 세팅 | — | pending |
| 02 | page_02_combinations.page | 조합 엔진 (레시피 테이블) | 01 | pending |
| 03 | page_03_game_loop.page | 게임 루프 + 스폰 매니저 + 승패 감시 | 01, 02 | pending |
| 04 | page_04_card_widget.page | 카드 UI 위젯 + 애니메이션 | 01 | pending |
| 05 | page_05_game_board.page | 드래그&드롭 보드 + 상호작용 | 03, 04 | pending |
| 06 | page_06_ui_panels.page | TopBar + EventLog + HelpPanel | 04, 05 | pending |
| 07 | page_07_win_lose.page | 승리/패배 화면 + 메인 메뉴 | 03, 06 | pending |
| 08 | page_08_save_load.page | 자동 저장/복구 (shared_preferences) | 01, 07 | pending |
| 09 | page_09_ux_polish.page | 반응형 레이아웃 + 햅틱 + 애니메이션 | 05, 06, 08 | pending |

## 실행 순서 (직렬)
01 → 02 → 03 → 04 → 05 → 06 → 07 → 08 → 09

## 병렬 가능 구간
- 02, 04는 01 완료 후 동시 작업 가능
- 06, 07은 각각 04/05, 03/06 완료 후 동시 작업 가능
