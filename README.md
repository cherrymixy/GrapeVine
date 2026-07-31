<div align="center">

# GRAPEVINE

**Grapes are growing on the vine.**

친구가 남긴 칭찬이 내 넝쿨에서 포도알로 자란다.
얼굴 보고 하기 어려웠던 말을, 링크 하나로.

**[→ 열어보기](https://grapevine-kr.vercel.app)** · **[→ 데모 판에 칭찬 남기기](https://grapevine-kr.vercel.app/v/nht8x5qwdj)**

<sub>데모 판은 로그인 없이 바로 한 알 붙일 수 있다.</sub>

<p>
  <img src="https://img.shields.io/badge/Next.js-16.2-000000?logo=nextdotjs&logoColor=white" alt="Next.js 16.2" />
  <img src="https://img.shields.io/badge/React-19.2-61DAFB?logo=react&logoColor=white" alt="React 19.2" />
  <img src="https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white" alt="TypeScript 5.9" />
  <img src="https://img.shields.io/badge/Supabase-Postgres%20%2B%20RLS-3FCF8E?logo=supabase&logoColor=white" alt="Supabase" />
  <img src="https://img.shields.io/badge/Vitest-116%20passed-6E9F18?logo=vitest&logoColor=white" alt="Vitest 116 passed" />
  <img src="https://img.shields.io/badge/version-v1.0-success" alt="version v1.0" />
</p>
<p>
  <img src="https://img.shields.io/badge/CSS%20Modules-tokens%20only-1572B6?logo=css&logoColor=white" alt="CSS Modules" />
  <img src="https://img.shields.io/badge/Lenis-scroll%20scrub-111111" alt="Lenis" />
  <img src="https://img.shields.io/badge/a11y-reduced--motion%20%C2%B7%20no--JS-5E35B1" alt="접근성" />
  <img src="https://img.shields.io/badge/deploy-Vercel-000000?logo=vercel&logoColor=white" alt="Vercel" />
</p>

<img src="docs/images/01-main.png" width="820" alt="GRAPEVINE 메인 화면 — 넝쿨 위에 타이틀과 포도알" />

</div>

---

## 무엇을 만들었나

**클릭 한 번**으로 15알짜리 포도판이 생긴다. 링크를 공유하면 친구는 **로그인 없이** 빈 알에 이름(또는 `Unknown`)과 한 줄 칭찬을 붙인다. 판이 꽉 차면 다음 페이지가 자동으로 생기고, 주인은 알을 눌러 읽는다.

|  |  |
|---|---|
| **방문자 마찰** | 0 — 로그인·가입·앱 설치 없음. 링크만 열면 끝 |
| **판 한 장** | 15알 고정. 좌표는 Figma 시안 그대로 |
| **칭찬** | 80자. 익명 가능 |
| **주인** | 자기 판에는 못 쓴다 |

<table>
<tr>
<td width="33%"><img src="docs/images/06-visitor-board.png" alt="방문자가 보는 판" /><br/><sub><b>① 링크를 연다</b><br/>빈 알은 아웃라인, 채운 알은 솔리드</sub></td>
<td width="33%"><img src="docs/images/07-add-grape.png" alt="Add Grape 모달" /><br/><sub><b>② 칭찬을 붙인다</b><br/>이름 또는 <code>Unknown</code></sub></td>
<td width="33%"><img src="docs/images/10-my-board.png" alt="주인이 보는 판" /><br/><sub><b>③ 주인이 읽는다</b><br/>알을 누르면 열린다</sub></td>
</tr>
</table>

---

## 이 프로젝트에서 어려웠던 것

포트폴리오용으로 기능을 늘리는 대신, **이 서비스에만 있는 문제**를 제대로 푸는 데 시간을 썼다.

### 1. 두 방문자가 같은 알을 동시에 누른다

링크 공유형이라 **동시 접속이 기본값**이다. 슬롯 점유를 앱 레벨에서 확인하면 확인과 삽입 사이에 남이 끼어든다.

```sql
-- 슬롯은 DB가 지킨다. 앱 코드는 이걸 대체하지 않는다.
unique (page_id, slot_index)
```

더 까다로운 건 **페이지 증설**이었다. 13칸이 찬 상태에서 두 요청이 동시에 들어오면, `READ COMMITTED`라 서로의 미커밋 INSERT를 못 본다. **둘 다 "14칸, 아직 안 찼다"고 판정**하고 커밋한다 — 15칸이 다 찼는데 다음 페이지가 영영 안 생긴다.

그래서 RPC 첫 줄이 페이지 행 잠금이다.

```sql
select * from vine_pages where id = p_page_id for update;
```

> **테스트가 통과하는 것만으로는 증명이 안 됐다.** 동시성 테스트는 우연히 직렬화되어도 통과한다. 그래서 한 세션에서 페이지 행을 `FOR UPDATE`로 잡아 두고, 다른 세션의 RPC가 **실제로 그 줄에서 멈추는지**를 확인했다.

### 2. 스크럽 영상이 초당 7프레임이었다

스크롤에 영상을 물렸는데 뚝뚝 끊겼다. 용량(26MB)이 원인인 줄 알았는데 재보니 아니었다.

**전체 121프레임 중 I-frame이 1번 하나**였다. 브라우저는 `currentTime`이 바뀌면 직전 키프레임으로 점프해 거기서부터 디코딩한다 — 어느 지점으로 스크럽하든 **항상 1번 프레임부터** 최대 120장을, 그것도 4060×2040으로 다시 풀고 있었다.

| Chrome에서 60개 지점 seek | 중앙값 | p95 |
|---|---:|---:|
| 원본 4060×2040 | **141.9ms** | 257.2ms |
| `-g 1` + 1440폭 | **2.8ms** | 4.0ms |

60fps 예산은 프레임당 16.7ms다. 원본은 예산의 **8.5배**를 썼다. **50배** 빨라졌고, 결정적인 건 해상도가 아니라 `-g 1`(전 프레임 키프레임)이었다.

### 3. 재보니 "폴백"이 더 싼 본선이었다

PRD는 이미지 시퀀스를 *"iOS 스크러빙이 불안정할 때의 폴백"*으로 뒀다. 실제로 뽑아서 재보니 모바일에서는 시퀀스가 **영상보다 작았다.**

| | 영상 | WebP 시퀀스 |
|---|---:|---:|
| Main 스크럽 | 2.8MB | **1.22MB** (121장) |
| My Vine 리빌 | 7.8MB | **0.84MB** (11장) |

리빌이 극적이다. 이 연출은 **이산 10단계**라 화면에 나오는 그림이 11장뿐인데, 121프레임짜리 영상을 받아 그중 11장만 보여 주고 있었다. 지금은 영상을 지웠다.

"느리면 갈아탄다"(프로브)를 안 쓴 이유도 측정에서 나왔다 — **재려면 영상을 먼저 받아야 하고**, 갈아탄 뒤에도 받은 건 못 돌려준다.

### 4. 규칙을 문서가 아니라 구조로 지키기

`video.currentTime`은 반드시 lerp로 접근해야 한다(직접 대입하면 계단처럼 튄다). 소비자마다 lerp하게 두면 **한 곳만 잊어도 규칙이 깨지고, 깨진 걸 눈으로만 알 수 있다.**

그래서 lerp를 **스크롤 하네스 안에** 넣었다. 하네스가 이미 부드러워진 값만 내보내므로 소비자는 잊을 수가 없다.

### 5. 안 보이게만 해 두고 계속 받고 있었다 — 두 번

`prefers-reduced-motion`에서 CSS로 영상을 가려 두고 다운로드는 그대로 뒀다. 모션을 끈 사람에게 2.8MB를 떠넘기는 일이었다.

원인은 하이드레이션 타이밍이었다. `useSyncExternalStore`는 마크업이 어긋나지 않도록 **일부러 서버 값을 돌려주고**, effect는 그 사이에 이미 한 번 돈다. effect 시점에 `matchMedia`를 직접 읽어 막았다.

그리고 **같은 실수를 이미지 시퀀스에서 반복했다.** 요청 수를 세지 않았으면 "안 보이니 됐다"로 넘어갔을 결함이다. 이후 모든 연출 검증에 **네트워크 요청 수**를 넣었다.

### 6. 폰에서는 판이 판이 아니었다

배경이 2:1인데 세로 화면은 9:19.5다. `object-fit: cover`가 가운데 좁은 띠만 남기고 잘라내서, 넝쿨은 거대한 줄기 텍스처가 되고 슬롯 좌표는 그 위 아무 데나 떠 있었다.

**비율 고정 무대**로 바꿨다 — 배경과 판을 정확히 같은 상자(1536:771)에 묶고, 위아래로 남는 여백에 UI를 넣는다. 15알이 항상 전부 보이고 항상 넝쿨 위에 앉는다.

<table>
<tr>
<td width="50%" align="center"><img src="docs/images/12-mobile-board.png" width="260" alt="모바일 판" /><br/><sub>비율 고정 무대 + 여백에 배치된 UI</sub></td>
<td width="50%" align="center"><img src="docs/images/13-mobile-main.png" width="260" alt="모바일 메인" /><br/><sub>모바일은 이미지 시퀀스로 스크럽</sub></td>
</tr>
</table>

---

## 화면

<table>
<tr>
<td width="50%"><img src="docs/images/02-main-scrub.png" alt="스크롤 스크럽 중" /><br/><sub><b>Main</b> — 스크롤이 영상을 감는다. 후반부에 포도알이 하나씩, 마지막에 타이틀·사이드바</sub></td>
<td width="50%"><img src="docs/images/03-how-it-works.png" alt="How It Works" /><br/><sub><b>How It Works</b></sub></td>
</tr>
<tr>
<td><img src="docs/images/04-about.png" alt="About" /><br/><sub><b>About</b></sub></td>
<td><img src="docs/images/05-my-empty.png" alt="빈 상태" /><br/><sub><b>My Vine (빈 상태)</b> — 누르면 넝쿨이 스톱모션으로 드러난다</sub></td>
</tr>
<tr>
<td><img src="docs/images/11-see-grape.png" alt="See Grape" /><br/><sub><b>See Grape</b> — 알을 누르면 열린다</sub></td>
<td><img src="docs/images/08-share-modal.png" alt="Share" /><br/><sub><b>Share</b> — 이 링크가 전부다</sub></td>
</tr>
</table>

---

## 구조

```
src/
  app/            라우트 · 화면
  models/         도메인 타입
  repositories/   저장소 인터페이스 + Supabase 구현
  services/       유스케이스 (슬롯 선택·재시도, 방문자 흐름)
  lib/            에러 계층 · 스크롤 계산 · Supabase 클라이언트
  components/     공용 컴포넌트 · 연출 레이어
  styles/         CSS 변수 토큰
  data/           슬롯 좌표 · 문구 · 연출 타이밍
supabase/migrations/   스키마 · RPC (7개)
docs/decisions.md      모든 STEP의 결정과 이유
scripts/sweep.sh       실서버 기능 점검 57항목
```

**데이터 계층은 인터페이스 뒤에 있다.** `VineRepository`가 저장소 원시 연산을 정의하고 Supabase 구현이 그걸 채운다. 슬롯 선택·충돌 재시도 같은 **유스케이스는 서비스 층**에 있어서, 백엔드를 갈아끼워도 규칙은 그대로 남는다.

**값은 코드에 없다.** 슬롯 좌표는 `data/slot-layout.ts`, 문구는 `data/copy.ts`, 연출 타이밍은 `data/scroll-cues.ts`에만 있다. 색과 타이포는 전부 `styles/` 토큰의 `var()` 참조다 — 컴포넌트에 하드코딩된 hex는 **0개**다.

---

## 검증

눈으로 보고 "되네"로 넘어가지 않으려고 했다. 특히 **연출은 눈으로 판별이 안 되는 것**들이 많았다.

| | |
|---|---|
| 단위·통합 테스트 | **116개** (11파일) — 도메인 규칙, 동시성, 스크롤 계산 경계 |
| 기능 점검 | **57항목** — 실서버 HTTP로 핵심 루프와 모든 에러 경로 |
| 브라우저 실측 | 하네스 15 · 스크럽 18 · 오버레이 11 · 리빌 12 · 낙하 12 · 모바일 시퀀스 9 · 리빌 모바일 7 |

몇 가지 예:

- **리빌이 정말 "이산"인가** — 400프레임을 샘플링해 `currentTime`의 서로 다른 값이 정확히 10개(`0.5, 1, 1.5 … 5`)임을 확인했다. 연속 재생이면 수십 개가 나온다. 눈으로는 구분이 안 된다.
- **캔버스가 진행률을 따라가는가** — 32×16으로 축소해 픽셀 해시를 찍어 비교했다. "그려졌다"가 아니라 "**진행률을 따라 그림이 바뀐다**"를 봐야 한다.
- **맞는 알이 떨어지는가** — 서버가 배정한 슬롯 번호와 애니메이션이 붙은 슬롯이 같은지 확인했다. 이 서비스는 동시 접속이 전제라 틀리면 남의 알이 떨어진다.
- **RLS가 실제로 막는가** — 빈 테이블이 `[]`를 반환하는 건 아무것도 증명하지 못한다. 진짜 행을 넣고, 공개 키로는 안 보이고 시크릿 키로만 보이는 걸 확인한 뒤 지웠다.

---

## 접근성 · 견고함

- **모든 연출에 `prefers-reduced-motion` 정적 폴백.** 미디어를 **내려받지도 않는다**
- JS가 없어도 동작한다 — 모달은 URL로 열리고(`?modal=share`), 폼은 네이티브 전송이며, 스크롤 연출이 감춘 내용은 `@media (scripting: none)`으로 드러난다
- 키보드 포커스 표시, 화면마다 `<h1>`, 장식 요소는 `aria-hidden`
- 판은 **검색 색인에서 뺐다** — "포도밭 둘러보기"는 의도적으로 만들지 않은 기능이고, 검색으로 남의 칭찬이 나오면 그게 뒷문으로 생긴다

---

## 만들지 않은 것

판 생성 옵션 · QR 공유 · 완성 축하 화면 · 알림 · 익어가는 색 변화 · 랭킹 · 포도밭 둘러보기 · 팔로우 · 댓글 · 이미지 첨부

**의도적으로 뺐다.** 이 서비스는 "링크를 열고, 한 줄 남기고, 닫는다"가 전부여야 한다.

---

## 로컬에서 실행

```bash
npm install
cp .env.example .env.local      # Supabase URL·키를 채운다
npm run dev
```

```bash
npm test              # 단위·통합 116개
npm run typecheck
npm run build
bash scripts/sweep.sh # 실서버 기능 점검 57항목 (dev 서버가 떠 있어야 한다)
```

`scripts/sweep.sh` 는 계정을 만들고 판을 15칸까지 채운 뒤 **스스로 지운다.**

---

<div align="center">
<sub>

Next.js (App Router) · TypeScript · CSS Modules · Lenis · Supabase (Postgres + RLS) · Vitest

모든 STEP의 결정과 이유는 [`docs/decisions.md`](docs/decisions.md)에 있다.

</sub>
</div>
