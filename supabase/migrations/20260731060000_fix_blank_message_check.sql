-- 빈 메시지 제약을 고친다.
--
-- 문제: 직전 마이그레이션은 `char_length(btrim(message)) > 0` 이었는데,
--       인자가 하나인 `btrim(text)` 은 **공백 문자만** 제거한다. 탭·개행은
--       남으므로 E'\n\t ' 같은 메시지가 통과했다(실측으로 확인).
--       서비스 층의 JS `.trim()` 은 전부 제거하므로 두 층의 규칙이 달랐다.
--       DB 를 최종 방어선이라 부르면서 실제로는 더 헐거운 상태였다.
--
-- 수정: "공백이 아닌 문자가 최소 하나 있어야 한다"로 바꾼다.
--       `[[:space:]]` 는 space·tab·newline·CR·FF·VT 를 포함한다.
--
-- 남는 차이: JS `.trim()` 은 NBSP(U+00A0) 같은 유니코드 공백까지 제거하지만
--            POSIX `[[:space:]]` 는 그렇지 않다. 서비스 층이 항상 먼저 돌고
--            더 엄격하므로 실사용 경로에서는 드러나지 않는다. 이 간극을
--            없애려면 유니코드 공백을 일일이 나열해야 해서 얻는 것보다 비용이 크다.

alter table public.grapes drop constraint grapes_message_not_blank_check;

alter table public.grapes
  add constraint grapes_message_not_blank_check
  check (message ~ '[^[:space:]]');

comment on constraint grapes_message_not_blank_check on public.grapes is
  '공백(탭·개행 포함)만으로 된 칭찬을 막는다. 길이 상한은 grapes_message_length_check 가 따로 본다.';
