-- GRAPEVINE — 초기 스키마
-- 대응: PRD §8(데이터 모델), §7(핵심 규칙), CLAUDE.md 절대규칙 1·3.
--
-- 명명    : DB는 snake_case, TS 모델은 camelCase. 매핑은 repositories/ 소관(STEP 3).
-- 접근    : 모든 DB 접근은 Next 서버가 service_role 로 수행한다.
--          따라서 전 테이블에 RLS를 켜되 정책은 두지 않는다 (anon/authenticated = deny-all).
--          service_role 은 RLS를 우회하므로 서버 경로만 살아 있다.
-- 제약명  : 전부 명시적으로 이름을 붙인다. repositories/ 어댑터가 제약 이름으로
--          도메인 에러(SLOT_TAKEN 등)를 판별하기 때문에, 자동 생성 이름에 의존하면
--          이름이 바뀌는 순간 에러 매핑이 조용히 깨진다.


-- ---------------------------------------------------------------------------
-- users — PRD §8 User
-- ---------------------------------------------------------------------------
create table public.users (
  id           uuid        not null default gen_random_uuid(),
  login_id     text        not null,
  display_name text        not null,
  created_at   timestamptz not null default now(),

  constraint users_pkey          primary key (id),
  constraint users_login_id_key  unique (login_id)
);

comment on table public.users is
  'PRD §8 User. 로그인 식별자는 login_id, Supabase Auth 에는 {login_id}@grapevine.local 로 매핑한다. auth.users(id) FK 는 STEP 4(계정)에서 추가한다.';

alter table public.users enable row level security;


-- ---------------------------------------------------------------------------
-- vines — PRD §8 Vine
-- ---------------------------------------------------------------------------
create table public.vines (
  id         uuid        not null default gen_random_uuid(),
  owner_id   uuid        not null,
  slug       text        not null,
  created_at timestamptz not null default now(),

  constraint vines_pkey          primary key (id),
  constraint vines_owner_id_fkey foreign key (owner_id)
                                 references public.users (id) on delete cascade,
  -- PRD §7-1: 판은 사용자당 1개.
  constraint vines_owner_id_key  unique (owner_id),
  -- 공유 URL 의 유일성. 슬러그 충돌 시 INSERT 가 실패해 재발급하게 한다.
  constraint vines_slug_key      unique (slug)
);

comment on table public.vines is 'PRD §8 Vine. 사용자당 1개(owner_id UNIQUE), slug 는 추측 불가 랜덤.';

alter table public.vines enable row level security;


-- ---------------------------------------------------------------------------
-- vine_pages — PRD §8 VinePage
-- ---------------------------------------------------------------------------
create table public.vine_pages (
  id         uuid not null default gen_random_uuid(),
  vine_id    uuid not null,
  page_index int  not null,
  capacity   int  not null default 15,

  constraint vine_pages_pkey             primary key (id),
  constraint vine_pages_vine_id_fkey     foreign key (vine_id)
                                         references public.vines (id) on delete cascade,
  -- PRD §7-3 페이지 자동 증설의 정확성이 여기 걸려 있다.
  -- 마지막 두 칸이 동시에 채워질 때 "다음 페이지 생성" 판정도 함께 경쟁하므로,
  -- 이 제약이 없으면 같은 page_index 가 두 번 만들어질 수 있다.
  constraint vine_pages_vine_page_key    unique (vine_id, page_index),
  constraint vine_pages_page_index_check check (page_index >= 1),
  constraint vine_pages_capacity_check   check (capacity > 0)
);

comment on table public.vine_pages is
  'PRD §8 VinePage. page_index 는 1부터. capacity 기본 15 — data/slot-layout.ts 의 PAGE_CAPACITY 와 일치해야 한다.';

alter table public.vine_pages enable row level security;


-- ---------------------------------------------------------------------------
-- grapes — PRD §8 Grape
--
-- 이 테이블의 제약이 이 프로덕트 유일한 진짜 동시성 문제(PRD §7-4)를 막는다.
-- 링크 공유형이라 서로 모르는 방문자 여럿이 같은 슬롯을 동시에 노릴 수 있고,
-- 모달 체류 시간 전체가 TOCTOU 창이라 확률이 낮지 않다.
-- 앱 레벨 사전 검사로 대체하지 말 것 (CLAUDE.md 절대규칙 1).
-- ---------------------------------------------------------------------------
create table public.grapes (
  id           uuid        not null default gen_random_uuid(),
  page_id      uuid        not null,
  slot_index   int         not null,
  author_name  text,
  is_anonymous boolean     not null,
  message      text        not null,
  created_at   timestamptz not null default now(),

  constraint grapes_pkey         primary key (id),
  constraint grapes_page_id_fkey foreign key (page_id)
                                 references public.vine_pages (id) on delete cascade,

  -- ★ 절대규칙 1 — 슬롯 점유는 DB가 보장한다.
  constraint grapes_slot_key     unique (page_id, slot_index),

  -- ★ PRD §7-8 — 칭찬 길이. 코드포인트 기준(char_length)이며
  --   클라이언트 카운터도 Array.from(s).length 로 맞춘다.
  constraint grapes_message_length_check check (char_length(message) <= 80),

  -- 절대규칙 3 — is_anonymous 면 author_name 은 반드시 null.
  constraint grapes_anonymous_no_name_check check (not is_anonymous or author_name is null),

  -- PRD §7-6 — 익명이 아니면 이름 필수.
  constraint grapes_named_has_name_check check (is_anonymous or author_name is not null),

  -- 상한(slot_index < vine_pages.capacity)은 테이블 CHECK 로 표현할 수 없다.
  -- STEP 5 의 attach_grape RPC 가 페이지 capacity 와 대조해 강제한다.
  constraint grapes_slot_index_check check (slot_index >= 0)
);

comment on table public.grapes is
  'PRD §8 Grape. UNIQUE(page_id, slot_index) 가 슬롯 동시 점유(PRD §7-4)를 막는 유일한 방어선이다.';

alter table public.grapes enable row level security;
