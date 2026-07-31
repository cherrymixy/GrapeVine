-- public.users 를 auth.users 에 연결한다.
--
-- STEP 2 에서는 PRD §8 그대로 독립 테이블로 뒀다. 이제 계정이 생기므로
-- 프로필 행의 id 가 반드시 실재하는 auth 사용자를 가리키도록 강제한다.
--
-- on delete cascade: auth 사용자를 지우면 프로필 → vines → vine_pages → grapes
-- 까지 한 줄로 정리된다. 테스트 뒷정리도 이 경로를 쓴다.
--
-- 트리거(auth.users AFTER INSERT → public.users)는 쓰지 않는다. auth.users 는
-- supabase_auth_admin 소유라 우리 역할(postgres)로는 트리거를 달 수 없을 수 있고,
-- 무엇보다 admin.createUser 는 HTTP 호출이라 우리 SQL 과 한 트랜잭션에 묶이지
-- 않는다. 대신 services/auth.ts 의 ensureProfile 이 멱등 upsert 로 처리하고,
-- 가입·로그인 양쪽에서 불려서 누락된 프로필을 스스로 치유한다.

alter table public.users
  add constraint users_auth_fkey
  foreign key (id) references auth.users (id) on delete cascade;

comment on constraint users_auth_fkey on public.users is
  'public.users.id 는 auth.users.id 와 같은 값이다. ensureProfile 이 auth 사용자 id 를 그대로 넣는다.';
