-- create_vine 의 EXECUTE 권한을 service_role 로 좁힌다.
--
-- 앞선 마이그레이션의 `revoke all ... from public` 은 의도대로 동작하지 않았다.
-- Supabase 는 anon / authenticated 에게 default privileges 로 EXECUTE 를 따로
-- 부여하기 때문에, PUBLIC 에서 회수해도 두 역할의 권한은 그대로 남는다.
-- 실측 결과 두 역할 모두 EXECUTE 를 유지하고 있었다.
--
-- 실제로 뚫리지는 않았다 — 함수가 security invoker 라서 anon 이 호출하면
-- 내부 INSERT 가 RLS 에 걸려 42501 로 실패한다(확인함). 그래도 호출 자체가
-- 가능한 상태를 남겨 둘 이유가 없어 명시적으로 회수한다.

revoke execute on function public.create_vine(uuid, text) from anon, authenticated;

comment on function public.create_vine(uuid, text) is
  'PRD §7-1. Vine + Page 1 을 한 트랜잭션에서 생성한다. 슬러그 충돌 시 UNIQUE(vines.slug) 위반을 그대로 올린다. EXECUTE 는 service_role 전용.';
