# CLAUDE.md — GRAPEVINE (포도나무열렸네)

## 이 프로젝트
"Create My Vine" 1클릭 → 15알짜리 포도판 생성 → 링크 공유 →
친구가 로그인 없이 빈 알에 이름(또는 Unknown) + 칭찬 붙이기 →
꽉 차면 다음 페이지 자동 생성 → 주인이 알 클릭해 열람.
Next.js(App Router) + TypeScript. 태그라인: Grapes are growing on the vine.

## 스택 (고정)
- Next.js App Router / TypeScript / CSS Modules / Lenis / Vitest
- 백엔드 경로: A Supabase — 데이터는 repositories/ 인터페이스로 추상화
- 비주얼: Figma MCP(get_design_context)를 SSOT로 → CSS 변수 토큰 기반 React로 번역
  (Figma 막히면 Codex HTML/CSS 폴백)

## 폴더
src/ app/  models/  repositories/  services/  lib/  components/  styles/  data/
public/ video/  images/  fonts/

## 비목표 (되살리지 말 것)
판 생성 옵션(크기/테마) · QR 공유 · 완성 축하 화면 · 알림 · 익어가는 색 변화
· 랭킹 · 포도밭 둘러보기 · 팔로우 · 댓글 · 이미지 첨부
→ 의도적으로 제거됨. "있으면 좋을 것 같아서" 추가 금지.

## 절대 규칙 (도메인)
1. grapes 테이블 UNIQUE(page_id, slot_index) — 슬롯 점유는 DB가 보장. 앱 레벨 체크로 대체 금지.
2. 마지막 페이지가 꽉 차면 같은 트랜잭션 안에서 다음 페이지 생성. 2회 호출로 쪼개지 마.
3. isAnonymous=true면 authorName은 서버에서 null로 강제. 클라 값 신뢰 금지.
4. /v/[slug] 는 세션과 무관하게 항상 공개. 방문자 마찰 0.
5. 슬롯 좌표는 data/slot-layout.ts 에서만. 컴포넌트에 px 하드코딩 금지.
6. 문구는 data/copy.ts, 스크롤 구간은 data/scroll-cues.ts. 하드코딩 금지.

## 작업 규칙
1. 요청 범위만. 다른 화면/파일 임의 수정·미리 만들기 금지.
2. [디자인 패스] models/repositories/services/data 수정 금지. styles/components/app 마크업만.
3. [디자인 패스] 애니메이션·영상 금지. 그건 연출 패스.
4. [연출 패스] 로직·레이아웃 수정 금지. 연출 레이어만 추가. STEP 하나 = 연출 하나.
5. [로직 패스] 회색박스로 동작만, 비주얼 신경 X.
6. 무거운 단계(스캐폴드·계정·슬롯점유/페이지증설·Figma 번역·스크럽 영상·모바일 폴백)는
   코드 전 계획부터, 승인 대기.
7. 한 번에 하나. 끝나면 dev 확인/test 후 git commit.
8. 픽셀·색·간격 추측 금지. 정확한 값/피그마 노드대로. 측정 스크립트 금지.
9. 색·타이포는 styles/ 토큰 var(). hex 하드코딩 금지.
10. video.currentTime 은 항상 lerp로 접근. 직접 대입 금지.
11. 모든 연출에 prefers-reduced-motion 폴백 필수.
12. STEP 끝날 때마다 docs/decisions.md 에 결정과 이유 한 줄 추가.

## 빌드 순서
로직:   1 스캐폴드 → 2 모델·스키마·슬롯좌표 → 3 데이터계층 → 4 계정
      → 5 붙이기·슬롯점유·페이지증설 → 6 공유링크·방문자 → 7 회색박스 → 8 통합테스트(v0.1-logic)
디자인: 10 토큰 → 11 폰트·에셋 → 12 Figma 번역 → 13 폴리시 (v0.2-visual)
연출:   14 스크롤하네스 → 15 Main 스크럽 → 16 오버레이 → 17 리빌 → 18 낙하 → 19 모바일폴백 (v0.3-motion)
마감:   20 엣지·배포 (v1.0)