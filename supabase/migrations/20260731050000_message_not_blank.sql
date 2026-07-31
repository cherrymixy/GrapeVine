-- 빈 칭찬을 막는다.
--
-- STEP 2 는 요청 스펙대로 `char_length(message) <= 80` 만 걸었고, 그때
-- decisions.md 에 "빈 문자열이 통과하므로 서비스 검증에서 막아야 한다"고
-- 남겨 뒀다. 서비스에만 두지 않고 스키마로 내리는 이유는 이 프로젝트의
-- 원칙 때문이다 — 슬롯 유일성·익명 강제·80자 제한이 전부 제약으로 박혀 있어서
-- 코드가 도메인 규칙을 우회할 표면이 없다. 빈 메시지만 예외로 둘 이유가 없다.
--
-- btrim 을 쓰는 이유: '   ' 은 char_length 가 3 이라 길이 검사를 통과한다.
-- 공백만 있는 칭찬은 빈 칭찬이다.

alter table public.grapes
  add constraint grapes_message_not_blank_check
  check (char_length(btrim(message)) > 0);

comment on constraint grapes_message_not_blank_check on public.grapes is
  '공백만으로 된 칭찬을 막는다. 길이 상한은 grapes_message_length_check 가 따로 본다.';
