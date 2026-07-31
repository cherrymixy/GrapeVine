# 결정 기록

작업규칙 12: STEP 이 끝날 때마다 결정과 이유를 한 줄씩 추가한다.

## STEP 0 — 확정된 열린 결정 (PRD 부록 D)

- **백엔드 = 경로 A (Supabase)** — 슬롯 유일성·익명 강제·80자 제한이 전부 스키마 제약(`UNIQUE`, `CHECK`)으로 박혀서, 코드가 도메인 규칙을 우회할 표면이 사라진다. Firestore는 같은 보장을 코드 규율로 유지해야 한다.
- **스타일 = CSS Modules** — Tailwind의 arbitrary value(`w-[163px]`)가 마크업에 값을 눌러붙게 만들어 작업규칙 8·9(픽셀·hex 하드코딩 금지)를 구조적으로 무너뜨린다. CSS 변수는 값이 반드시 `styles/`를 거치게 강제한다.
- **슬롯 배정 = 서버 배정** (빈 슬롯 중 랜덤) — 피그마가 이미 하단 CTA `Add Grape` 버튼 1개로 그려져 있고, 서버가 재시도하면 충돌이 사용자에게 보이지 않는다. §3 "방문자 마찰 = 0" 원칙에 맞고 재시도 UI가 통째로 불필요해진다. `UNIQUE(page_id, slot_index)` 는 그대로 유지 — 서버 재시도 루프의 정확성을 보장하는 게 그 제약이다.
- **페이지 용량 = 15알** — `data/slot-layout.ts` 길이 == `capacity` 를 STEP 2에서 테스트로 고정한다.
- **로그인 식별자 = 합성 이메일** (`{loginId}@grapevine.local`) — Supabase Auth는 이메일이 필수인데 §5.4 피그마는 `ID / PASSWORD` UI다. 내부만 이메일로 매핑해 UI를 지킨다. 비밀번호 재설정은 MVP 비목표라 부작용 없음.
- **Main 영상 = 5초** — 전 프레임 키프레임(`-g 1`) 인코딩이 용량을 3~5배 부풀려 15MB 예산이 길이를 강하게 제약한다. 길이를 먼저 못박고 촬영·렌더한다.
- **칭찬 80자 = 코드포인트 기준** — 클라 카운터(`Array.from(s).length`)와 PG `char_length` 를 일치시킨다. grapheme 기준으로 세면 이모지에서 클라/서버가 어긋나 Send가 조용히 실패한다.
- **주인의 칭찬 삭제 = MVP 없음, 스키마에 필드도 두지 않음** — `deletedAt` 을 "나중에 쓸까 봐" 넣으면 모든 조회에 필터가 따라붙는다. 필요 시 SQL로 수동 처리.
- **스팸 방지 = MVP 없음, STEP 20에서 IP 해시 레이트리밋만** — 슬러그가 추측 불가 랜덤이라 무차별 유입 표면이 없다. 쿠키 가드는 우회가 쉬운데 마찰만 늘어 §3 원칙에 반한다.
- **모바일 폴백 = Main(`/`) 한정** — `/v/[slug]`·`/my` 는 영상 없이도 완전 동작해야 한다. 링크 공유형이라 모바일 유입이 실제로 도달하는 곳은 Main이 아니라 `/v/[slug]` 이므로, 연출 실패가 제품 실패로 번지지 않게 격리한다.
- **스크럽 폴백 발동 = 3단 게이트** — ① `prefers-reduced-motion` → 정적 ② `saveData`/2g·3g → 정적 ③ 마운트 직후 seek 실측(p95 > 100ms 또는 단일 seek 400ms 타임아웃) → WebP 시퀀스 + canvas. UA 스니핑을 1차 기준으로 쓰지 않는 이유는 iOS가 개선되면 프로브가 자동으로 통과하기 때문이다.

## STEP 1 — 스캐폴드

- **`create-next-app` 대신 수작업 스캐폴드** — `CLAUDE.md` 가 create-next-app 의 허용 파일 목록에 없어 실행이 막힌다. 우회해도 데모 페이지·SVG·README 등 스코프 밖 파일을 생성해 되지워야 한다.
- **환경변수에 `NEXT_PUBLIC_` 접두사를 쓰지 않음** — 접두사가 붙는 순간 Next가 값을 클라 번들에 인라인한다. "모든 DB 접근은 서버 경유" 설계를 변수 이름 수준에서 강제한다.
- **`server-only` 패키지 도입** — service role 키가 클라이언트 번들에 새면 DB 전체가 열린다. 0바이트 빌드타임 가드로 `lib/supabase.ts` 를 서버 전용으로 못박는다.
- **Supabase 클라이언트를 싱글턴 캐싱하지 않음** — 서버리스에서 요청 간 인스턴스를 공유하면 세션이 섞인다.
- **`@supabase/ssr`·`jsdom`·ESLint 는 지금 설치하지 않음** — 각각 STEP 4(계정), 디자인 패스(컴포넌트 테스트) 소관. 스코프 밖.
- **`styles/globals.css` 를 빈 플레이스홀더로 둠** — 리셋·색조차 넣지 않는다. 작업규칙 8·9상 STEP 1은 디자인 값을 정할 자리가 아니다. STEP 10에서 토큰과 함께 채운다.
- **`turbopack.root` 명시** — 홈 디렉터리의 무관한 `package-lock.json` 때문에 Next가 워크스페이스 루트를 잘못 추론한다.
- ⚠️ **한시적 규칙 예외:** 라우트 7개에 `"GRAPEVINE"` 문자열을 직접 박았다. 절대규칙 6(문구는 `data/copy.ts`)의 예외다. 이건 제품 카피가 아니라 "이 라우트가 살아 있다"는 스캐폴드 마커이고, `data/copy.ts` 는 아직 존재하지 않는다. **STEP 7(회색박스)에서 실제 카피로 전량 교체하며 그때 이 마커는 0개가 되어야 한다.**

## STEP 2 — 모델·스키마·슬롯좌표

- **`models/` 는 단일 파일** — "import 금지"를 문자 그대로 지키려면 `PageView` 가 `Grape` 를 참조하는 순간 파일을 나눌 수 없다. 5개 타입을 `models/index.ts` 하나에 둬서 import 문이 0개다.
- **`PageSlot` 타입을 이름 붙여 분리** — PRD §8 은 `slots: Array<{ slotIndex; grape }>` 인라인이지만, repositories/components 양쪽이 이 모양을 참조하므로 이름이 필요하다. 구조는 PRD 그대로.
- **제약에 전부 명시적 이름을 붙임** — `repositories/` 어댑터가 제약 이름으로 도메인 에러를 판별한다. Postgres 자동 생성 이름에 의존하면 이름이 바뀔 때 에러 매핑이 조용히 깨진다. 로컬 PG16 으로 실측한 값: 슬롯 충돌 → **SQLSTATE `23505` / `grapes_slot_key`**, 80자 초과 → **`23514` / `grapes_message_length_check`**.
- **`UNIQUE(vine_id, page_index)` 추가** — 요청 목록에 없었지만 PRD §7-3 페이지 자동 증설의 정확성이 여기 걸린다. 마지막 두 칸이 동시에 채워지면 "다음 페이지 생성" 판정도 함께 경쟁하므로, 이 제약이 없으면 같은 page_index 가 두 번 생길 수 있다.
- **`UNIQUE(vines.owner_id)` 추가** — PRD §7-1 "판은 사용자당 1개"를 스키마로 강제. Create 버튼 더블클릭도 이걸로 막힌다.
- **전 테이블 RLS enable, 정책 0개** — anon/authenticated deny-all. service_role 만 통과하므로 "모든 접근은 서버 경유" 설계가 DB 레벨에서 강제된다.
- **`users` 를 `auth.users` 와 아직 연결하지 않음** — PRD §8 그대로 독립 테이블. FK(`id references auth.users(id)`)는 STEP 4(계정)에서 추가한다.
- **`slot_index` 상한은 스키마로 강제하지 않음** — 상한이 `vine_pages.capacity` 라 테이블 CHECK 로 표현할 수 없다. STEP 5 의 `attach_grape` RPC 가 대조한다. 하한(`>= 0`)만 CHECK.
- **`vine_pages` 에 `created_at` 없음** — PRD §8 `VinePage` 에 없다. 순서는 `page_index` 로 정해지므로 필요도 없다. 모델과 DB를 어긋나게 두지 않는다.
- **`message` 하한 미설정** — 요청 스펙이 `char_length(message) <= 80` 이라 그대로 따랐다. 빈 문자열이 통과하므로 **STEP 5 서비스 검증에서 막아야 한다.**
- **`copy.ts` 는 PRD 에 문자 그대로 있는 문구만 채움** — About 타이틀·에러·빈 상태는 PRD 에 문안이 없어 지어내지 않고 TODO. 작업규칙 8.
- **`slot-layout.ts` 좌표계 규약 확정** — xPct/yPct 는 알의 **중심**, sizePct 는 **지름이며 컨테이너 폭 대비**. 지름을 높이 대비로 잡으면 종횡비가 바뀔 때 알이 타원이 된다. 값 수령 시 이 규약을 함께 확인할 것.
- **좌표 미수령 상태를 `it.todo` 로 표시** — 배열이 비어 구조 검사가 공허하게 통과하므로, 개수 검사만 todo 로 남겨 "아직 안 끝났다"를 테스트 결과에 드러낸다. (좌표 수령 후 해제됨)

## STEP 2b — 슬롯 좌표 수령 (Figma 201:753)

- **15알 확정, PRD 가 맞았다** — 프레임에 ellipse 노드는 **16개**지만 `Ellipse 5009`(201:764)가 `Ellipse 5007`(201:768)과 x/y/size 가 완전히 동일해 정확히 겹쳐 있다. 스크린샷으로도 원은 15개만 보인다. 초기에 지적했던 "5002~5017 = 16개인데 PRD 는 15알" 불일치의 정체가 이것이다. **5009 를 제외**했고, 피그마 쪽 잔여 레이어이므로 정리 권장.
- **slotIndex = Ellipse 번호 오름차순** (5002→0 … 5017→14) — 채워지는 순서와 무관하다(배정은 서버 랜덤). 이 순서를 쓴 이유는 디버깅 시 슬롯 ↔ 피그마 노드를 역추적할 수 있어서다. 각 항목에 원본 노드 ID와 px 를 주석으로 남겼다.
- **환산식** — `xPct = (x + 163/2) / 1536 × 100`, `yPct = (y + 163/2) / 771 × 100`, `sizePct = 163 / 1536 × 100`. 소수 3자리 반올림(오차 < 0.008px).
- **`SOURCE_FRAME` 상수 추가** — 환산 기준(1536×771)을 코드에 남겨야 나중에 역산이 가능하다.
- **골든 역산 테스트 추가** — 피그마 원본 px 를 테스트에 박아 두고 % → px 로 되돌려 대조한다. 누가 % 값을 손으로 "조정"하면 즉시 깨진다. 허용 오차는 0.05px(`toBeCloseTo(_, 1)`) — 3자리 반올림 오차 0.008px 보다 크고 의미 있는 이동보다는 작다.
- ⚠️ **컨테이너 종횡비 1536:771 (≈1.992) 을 유지해야 한다** — x는 폭 대비, y는 높이 대비로 환산했으므로 종횡비가 달라지면 알과 배경 넝쿨이 어긋난다. STEP 7·12 구현 제약.
- **환경변수 이름을 Supabase 대시보드 현재 라벨에 맞춤 (STEP 2b)** — `SUPABASE_ANON_KEY`/`SUPABASE_SERVICE_ROLE_KEY` → `SUPABASE_PUBLISHABLE_KEY`/`SUPABASE_SECRET_KEY`. 대시보드가 주는 이름과 코드가 달라 매번 머릿속에서 번역해야 했다. 함수 이름(`createAnonClient`/`createServiceRoleClient`)은 Postgres **역할** 기준이라 그대로 뒀다 — RLS 를 따질 때 중요한 건 키가 아니라 역할이다.

## STEP 2c — 마이그레이션 원격 적용 (Supabase `ptnnqflkhmjhaciafjmn`)

- **Direct connection 을 쓰지 않는다. Pooler 를 쓴다.** `db.<ref>.supabase.co` 는 **AAAA(IPv6) 레코드만** 있고 A 레코드가 없어서, IPv4 전용 네트워크에서는 이름 해석부터 실패한다. 대신 `aws-1-ap-northeast-2.pooler.supabase.com:5432`(session mode) 로 붙는다. 리전과 프리픽스는 실측으로 확정했다 — `aws-0` 은 `tenant not found`, `aws-1` 은 성공.
- **DB 비밀번호는 영숫자로만 만든다** — `@ / : ? # & %` 가 들어가면 `--db-url` 에 퍼센트 인코딩이 필요해지고, 인코딩 실수와 진짜 비밀번호 오류가 같은 `password authentication failed` 로 보여서 원인 분리가 어려워진다.
- **PAT 없이 `--db-url` 로 적용** — `supabase db push --db-url` 은 PAT 이 필요 없고, 마이그레이션 이력은 원격 DB 의 `supabase_migrations.schema_migrations` 에 기록되므로 이력 관리도 그대로 된다. PAT 은 `link` 편의용일 뿐이다.
- **`db push` 의 Docker 경고는 무시해도 된다** — 로컬 마이그레이션 카탈로그 캐시(`db diff` 용)를 만들지 못한다는 뜻이고 push 자체와 무관하다.
- ⚠️ **RLS deny-all 에서 SELECT 는 403 이 아니라 `[]` + HTTP 200 을 반환한다.** 정책이 없으면 PostgREST 는 "거부"가 아니라 "0행"으로 응답한다. 실제 데이터를 커밋해 두고 확인한 결과 publishable key 로는 4개 테이블 전부 `[]`, secret key 로만 보인다. **데이터는 새지 않지만, `/v/[slug]` 공개 조회를 publishable key 로 처리할 수는 없다** — 모든 읽기도 서버에서 service_role 로 해야 한다. 확정된 설계 그대로다.
- **원격 DB 에서 제약 14종 재검증 완료** — 전부 트랜잭션 안에서 실행하고 롤백해 잔여 행 0. 로컬 PG16 결과와 동일하다.

## STEP 3 — 데이터 계층 (repositories / services)

- **`addGrape(pageId, slotIndex, payload)` 는 "슬롯 선택"을 하지 않는다** — 요청 시그니처대로 slotIndex 를 받는 **원자 연산**이다. 확정된 설계(서버가 빈 슬롯 중 랜덤 배정)의 선택·재시도 루프는 그 위 services/ 소관이고, 이 메서드는 "이 슬롯을 원자적으로 점유하라"만 책임진다. 두 관심사를 한 메서드에 넣으면 재시도 정책을 바꿀 때마다 데이터 계층을 건드리게 된다.
- **인터페이스에 트랜잭션을 노출하지 않음** — `beginTransaction()` 같은 메서드를 두면 Postgres/Firestore 중 한쪽 모델에 종속된다. 원자성 확보 방식은 어댑터 내부 디테일로 둔다.
- **에러는 예외로 던지되 도메인 타입으로 번역** — `lib/errors.ts` 의 `DomainError` 계층. 어댑터가 SQLSTATE + **제약 이름**으로 판별해 번역한다. SQLSTATE 만으로는 부족한 이유는 grapes 의 CHECK 가 4개라 전부 `23514` 로 오기 때문 — 어느 규칙이 깨졌는지는 제약 이름으로만 알 수 있다. STEP 2 에서 모든 제약에 이름을 붙인 이유가 여기서 회수된다.
- **슬러그는 CSPRNG** — `crypto.getRandomValues`. 슬러그가 `/v/[slug]` 의 유일한 접근 통제 수단(절대규칙 4: 세션 무관 공개)이라 `Math.random()` 은 부적격이다. 알파벳은 32자로 고정: `0/O`·`1/l` 을 빼서 눈으로 헷갈리지 않게 하고, 길이가 정확히 32(=256/8)라서 `byte % 32` 에 모듈로 편향이 없다. 32^10 ≈ 2^50.
- **슬러그 충돌은 사전 조회가 아니라 "써 보고 재시도"** — 조회 후 삽입은 그 사이가 그대로 경쟁 구간이라 충돌을 못 막는다. 실제 방어선은 `UNIQUE(vines.slug)` 이고 `withUniqueSlug` 는 그 실패를 흡수할 뿐이다. 슬롯 점유와 정확히 같은 구조다.
- **`slugFactory` 를 생성자 주입** — PRD §7-10(테스트를 위해 주입 가능하게). 기본값은 `generateSlug`.
- ⚠️ **`createVine` 은 아직 원자적이지 않다** — vines 삽입과 vine_pages 삽입이 별도 문장이다. 페이지 삽입이 실패하면 "페이지 없는 판"이 남고 `UNIQUE(owner_id)` 때문에 재생성도 막힌다. 지금은 **보상 삭제**(vine 을 지우고 rethrow)로 막아 뒀지만 진짜 트랜잭션이 아니다. **STEP 5 에서 RPC 하나로 합쳐야 한다** — 페이지 자동 증설(절대규칙 2)도 같은 RPC 에 들어가므로 함께 처리한다.
- **`getPage` 는 DB 의 `capacity` 를 신뢰한다** — `PAGE_CAPACITY` 상수가 아니라 페이지 행의 값으로 슬롯 배열을 만든다. 상수는 레이아웃 쪽 진실이고 DB 가 저장 쪽 진실이다.
- **vitest 에 `server-only` alias 추가** — 이 패키지는 Next 번들러 밖에서 import 되면 throw 한다. no-op 으로 치환해야 서버 전용 모듈을 테스트에서 부를 수 있다.
- **원격 테스트는 자격증명 없으면 스킵** — `describe.skipIf`. 단 **describe 본문은 스킵돼도 실행**되므로 클라이언트 생성을 `beforeAll` 로 늦춰야 한다. 본문에서 만들면 스킵이 아니라 수집 단계 실패가 된다(실제로 한 번 밟았다).
- **테스트 뒷정리는 users 삭제 하나로** — FK cascade 로 vines → vine_pages → grapes 가 함께 지워진다.

## STEP 3b — 지적한 문제 해결

- **`createVine` 원자성 확보 — `create_vine` RPC** (`20260731010000`). plpgsql 함수 본문은 호출 문장 하나 안에서 실행되므로, `vine_pages` 삽입이 실패하면 `vines` 삽입도 함께 롤백된다. 보상 삭제를 걷어냈다 — 보상 삭제는 그 삭제 자체가 실패할 수 있어서 진짜 해결이 아니었다.
  **실증:** `vine_pages` 에 반드시 실패하는 트리거를 주입하고 `create_vine` 을 호출한 뒤 vines 행 수를 셌다 → 0. 전부 트랜잭션 안에서 하고 롤백했다.
- **슬러그는 여전히 TS 쪽에서 만든다** — RPC 는 주어진 슬러그로 점유만 시도하고, 충돌하면 `UNIQUE(vines.slug)` 위반을 그대로 올린다. 생성·재시도를 DB 로 내리면 `services/slug.ts` 가 백엔드에 묶여 경로 B 교체가 막힌다.
- **RPC 는 `security invoker`** — `definer` 로 만들면 이 함수 자체가 RLS 를 우회하는 구멍이 된다. invoker 라서 anon 이 호출하면 내부 INSERT 가 RLS 에 걸린다.
- ⚠️ **`revoke all ... from public` 은 Supabase 에서 듣지 않는다** (`20260731020000` 으로 수정). Supabase 는 `anon`/`authenticated` 에게 default privileges 로 EXECUTE 를 따로 부여하기 때문에 PUBLIC 에서 회수해도 두 역할은 그대로 남는다. **역할을 명시해 `revoke execute ... from anon, authenticated`** 해야 한다. 실측으로 잡았다 — 회수 전 anon 호출은 `42501 row-level security`(RLS 가 막음), 회수 후는 `42501 permission denied for function`(권한이 막음). 실제로 뚫린 적은 없지만 방어가 한 겹뿐이었다.
- **적용된 마이그레이션은 수정하지 않고 새 파일로 고친다** — 파일을 고치면 이 DB(이미 적용됨)와 새로 만든 DB(수정본 적용)의 스키마가 갈라진다.
- **`.rpc().returns<T>()` 는 스칼라 jsonb 반환에 쓸 수 없다** — supabase-js 가 배열 캐스팅으로 간주해 타입 에러를 낸다. 런타임은 정상이라 테스트만 돌리면 못 잡는다. 경계에서 `as` 캐스트 + 형태 확인으로 처리해, 형태가 어긋나면 매핑 중 TypeError 가 아니라 `RepositoryFailureError` 로 드러나게 했다.
- **`withUniqueSlug` 재시도 경로 테스트 6개 추가** — 왕복 테스트에서는 슬러그가 충돌하지 않아 재시도 루프가 한 번도 실행되지 않았다. 순수 함수라 주입만으로 덮인다: 충돌 후 재시도 성공 / 예산 소진 시 `SlugExhaustedError` / 마지막 충돌을 `cause` 로 보존 / **충돌이 아닌 에러는 재시도 없이 즉시 재던짐** / 첫 시도 성공 시 1회만 호출.
