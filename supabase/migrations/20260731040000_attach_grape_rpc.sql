-- attach_grape RPC — 슬롯 점유 + 페이지 자동 증설을 한 트랜잭션으로.
--
-- 절대규칙 2: "마지막 페이지가 꽉 차면 같은 트랜잭션 안에서 다음 페이지 생성.
--             2회 호출로 쪼개지 마."
--
-- ★ 왜 FOR UPDATE 가 필요한가 (이 함수에서 가장 놓치기 쉬운 부분)
--
--   잠금이 없으면 이렇게 깨진다. 13칸이 찬 상태에서 T1(슬롯 A)과 T2(슬롯 B)가
--   동시에 들어온다. READ COMMITTED 라 서로의 미커밋 INSERT 를 볼 수 없다.
--   → 둘 다 "14칸, 아직 안 찼다"고 판정하고 커밋한다.
--   → 15칸이 다 찼는데 다음 페이지가 영영 생기지 않는다.
--   → 방문자가 PRD §7-3 이 금지한 "판이 끝났다" 상태를 만난다.
--
--   페이지 행을 잠그면 같은 페이지에 대한 호출들이 직렬화되어 카운트가 정확해진다.
--   이건 grapes 로의 직접 INSERT 를 막지 못하므로, **모든 알 삽입이 이 함수만
--   거친다**는 전제 위에서 성립한다. 어댑터에 다른 경로를 만들지 말 것.
--
--   ⚠️ 잠금이 UNIQUE 제약을 대체하는 게 아니다.
--      잠금 = 카운트의 정확성 / UNIQUE(page_id, slot_index) = 슬롯 점유(절대규칙 1).
--      둘 다 필요하고 서로를 대신하지 않는다.
--
-- 커스텀 SQLSTATE 를 쓰는 이유: 제약이 없는 규칙(주인 차단, 슬롯 범위)은
-- 제약 이름으로 판별할 수 없다. 메시지 문자열 매칭은 취약하므로 코드를 정한다.
--   GV001 = 주인이 자기 판에 작성 시도 (PRD §7-7)
--   GV002 = slot_index 가 capacity 범위 밖

create or replace function public.attach_grape(
  p_page_id      uuid,
  p_slot_index   int,
  p_author_name  text,
  p_is_anonymous boolean,
  p_message      text,
  p_actor_id     uuid default null
)
returns jsonb
language plpgsql
-- security invoker(기본). RLS 는 deny-all 이라 service_role 로 부를 때만 통과한다.
set search_path = public
as $$
declare
  v_page       public.vine_pages;
  v_vine       public.vines;
  v_grape      public.grapes;
  v_next_page  public.vine_pages;
  v_author     text;
  v_filled     int;
  v_max_index  int;
begin
  -- 1. 페이지를 잠근 채로 읽는다. 같은 페이지에 대한 동시 호출을 직렬화한다.
  select * into v_page
  from public.vine_pages
  where id = p_page_id
  for update;

  if not found then
    raise exception 'page not found: %', p_page_id using errcode = 'GV003';
  end if;

  -- 2. 소유자 확인용 vine
  select * into v_vine from public.vines where id = v_page.vine_id;

  -- 3. 주인 본인 차단 (PRD §7-7). p_actor_id 가 null 이면 미로그인 방문자.
  if p_actor_id is not null and p_actor_id = v_vine.owner_id then
    raise exception 'owner cannot add a grape to their own vine' using errcode = 'GV001';
  end if;

  -- 4. 슬롯 범위. 상한이 capacity 라 테이블 CHECK 로는 표현할 수 없어 여기서 막는다.
  if p_slot_index < 0 or p_slot_index >= v_page.capacity then
    raise exception 'slot index % out of range (capacity %)', p_slot_index, v_page.capacity
      using errcode = 'GV002';
  end if;

  -- 5. 절대규칙 3 — 익명이면 이름을 서버에서 버린다. 클라 값을 신뢰하지 않는다.
  v_author := case when p_is_anonymous then null else p_author_name end;

  -- 6. 점유. 슬롯 중복·80자 초과·이름 규칙은 테이블 제약이 거른다.
  insert into public.grapes (page_id, slot_index, author_name, is_anonymous, message)
  values (p_page_id, p_slot_index, v_author, p_is_anonymous, p_message)
  returning * into v_grape;

  -- 7. 이 알로 페이지가 꽉 찼고, 이 페이지가 마지막이면 증설한다.
  select count(*) into v_filled from public.grapes where page_id = p_page_id;
  select max(page_index) into v_max_index from public.vine_pages where vine_id = v_page.vine_id;

  if v_filled >= v_page.capacity and v_page.page_index = v_max_index then
    insert into public.vine_pages (vine_id, page_index, capacity)
    values (v_page.vine_id, v_page.page_index + 1, v_page.capacity)
    on conflict (vine_id, page_index) do nothing
    returning * into v_next_page;
  end if;

  return jsonb_build_object(
    'grape', to_jsonb(v_grape),
    'next_page', case when v_next_page.id is null then null else to_jsonb(v_next_page) end
  );
end;
$$;

comment on function public.attach_grape(uuid, int, text, boolean, text, uuid) is
  'PRD §7-3·§7-4·§7-7. 슬롯 점유와 페이지 증설을 한 트랜잭션에서 처리한다. 페이지 행을 FOR UPDATE 로 잠가 증설 판정 경쟁을 막는다.';

-- STEP 3b 에서 배운 대로 역할을 명시해 회수한다.
-- `revoke ... from public` 만으로는 Supabase 가 default privileges 로 부여한
-- anon / authenticated 의 EXECUTE 가 남는다.
revoke all on function public.attach_grape(uuid, int, text, boolean, text, uuid) from public;
revoke execute on function public.attach_grape(uuid, int, text, boolean, text, uuid)
  from anon, authenticated;
grant execute on function public.attach_grape(uuid, int, text, boolean, text, uuid) to service_role;
