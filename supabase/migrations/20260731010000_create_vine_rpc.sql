-- create_vine RPC — 판 생성을 원자적으로 만든다.
--
-- 문제: vines 삽입과 vine_pages 삽입을 애플리케이션에서 두 문장으로 나누면,
--       페이지 삽입이 실패했을 때 "페이지 없는 판"이 남는다. 그 상태는
--       UNIQUE(vines.owner_id) 때문에 재생성으로도 복구되지 않는다.
--       보상 삭제로 흉내낼 수는 있지만 그 삭제 자체가 실패할 수 있다.
--
-- 해결: plpgsql 함수 본문은 호출 문장 하나 안에서 실행되므로, 두 번째 삽입이
--       실패하면 첫 번째도 함께 롤백된다. PRD §7-1 "Create My Vine 시
--       Vine + Page 1 생성"이 쪼개지지 않는다.
--
-- 슬러그는 여기서 만들지 않는다. 생성과 충돌 재시도는 services/slug.ts 소관이고,
-- 이 함수는 주어진 슬러그로 점유를 시도할 뿐이다. 충돌하면 UNIQUE(vines.slug)
-- 위반이 그대로 올라가고 호출자가 다른 슬러그로 다시 부른다.

create or replace function public.create_vine(p_owner_id uuid, p_slug text)
returns jsonb
language plpgsql
-- security invoker(기본). RLS 는 deny-all 이므로 service_role 로 부를 때만 통과한다.
-- definer 로 만들면 이 함수가 RLS 를 우회하는 구멍이 되므로 쓰지 않는다.
set search_path = public
as $$
declare
  v_vine public.vines;
  v_page public.vine_pages;
begin
  insert into public.vines (owner_id, slug)
    values (p_owner_id, p_slug)
    returning * into v_vine;

  insert into public.vine_pages (vine_id, page_index)
    values (v_vine.id, 1)
    returning * into v_page;

  return jsonb_build_object('vine', to_jsonb(v_vine), 'page', to_jsonb(v_page));
end;
$$;

comment on function public.create_vine(uuid, text) is
  'PRD §7-1. Vine + Page 1 을 한 트랜잭션에서 생성한다. 슬러그 충돌 시 UNIQUE(vines.slug) 위반을 그대로 올린다.';

-- 기본적으로 PUBLIC 에 EXECUTE 가 부여되므로 명시적으로 회수한다.
-- RLS 가 이미 막지만, 노출 표면을 줄여 두는 편이 낫다.
revoke all on function public.create_vine(uuid, text) from public;
grant execute on function public.create_vine(uuid, text) to service_role;
