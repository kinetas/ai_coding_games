# Hanness Page File Format

각 `.page` 파일은 YAML 프론트매터 + 마크다운 바디로 구성된다.
러너가 이 파일을 읽어 Claude 프롬프트를 조합한다.

```
---
page_id: page_XX
title: 페이지 제목
depends_on: [page_YY, page_ZZ]
output_files: [src/foo.js, src/bar.js]
acceptance_criteria:
  - 조건 1
  - 조건 2
---

# 구현 목표

## 컨텍스트
...

## 요구사항
...

## 주의사항
...
```

## 필드 설명

| 필드 | 필수 | 설명 |
|------|------|------|
| `page_id` | O | 매니페스트의 `id`와 동일해야 함 |
| `title` | O | 페이지 제목 |
| `depends_on` | X | 선행 페이지 목록 (정보용) |
| `output_files` | X | 이 페이지가 생성/수정할 파일 목록 |
| `acceptance_criteria` | X | 구현 완료 판단 기준 |
