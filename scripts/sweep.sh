#!/bin/bash
#
# 전체 기능 점검 (57항목) — 실제 HTTP 로 핵심 루프와 모든 에러 경로를 훑는다.
#
# 단위 테스트(`npm test`)가 규칙을 하나씩 보는 반면 여기서는 **실서버에
# 붙어** 라우팅·세션·리다이렉트·폼까지 통과시킨다. STEP 13 에서 로그아웃이
# 모든 기기의 세션을 끊는 결함을 잡아낸 게 이 스윕이다.
#
#   npm run dev &            # 서버가 떠 있어야 한다
#   bash scripts/sweep.sh
#
# 계정을 만들고 판을 15칸까지 채운 뒤 **스스로 지운다**(맨 아래 뒷정리).
# `.env.local` 이 있어야 뒷정리가 돈다 — 없으면 건너뛰고 경고한다.
B=http://localhost:3000
PASS=0; FAIL=0
ok()   { PASS=$((PASS+1)); printf "  ✅ %s\n" "$1"; }
bad()  { FAIL=$((FAIL+1)); printf "  ❌ %s  — %s\n" "$1" "$2"; }
chk()  { if [ "$2" = "$3" ]; then ok "$1"; else bad "$1" "기대 $3, 실제 $2"; fi; }
has()  { if echo "$2" | grep -q "$3"; then ok "$1"; else bad "$1" "'$3' 없음"; fi; }
hasnt(){ if echo "$2" | grep -q "$3"; then bad "$1" "'$3' 있으면 안 됨"; else ok "$1"; fi; }

code() { curl -s -o /dev/null -w "%{http_code}" "$@"; }
loc()  { curl -s -o /dev/null -w "%{redirect_url}" "$@"; }

echo "── 1. 공개 라우트"
for p in / /about /how-it-works /login /signup; do
  chk "GET $p" "$(code $B$p)" "200"
done
chk "GET /v/nosuchslug → 404" "$(code $B/v/nosuchslug)" "404"

echo "── 2. 가드"
chk "미로그인 /my → 307" "$(code $B/my)" "307"
has "리다이렉트 대상이 /login" "$(loc $B/my)" "/login"

echo "── 3. 가입 검증"
L="s$(date +%s%N | tail -c 7)"
# 어느 칸이 틀렸는지까지 알려야 한다. 하나로 뭉뚱그리면 사용자가 못 고친다.
chk "짧은 아이디 거절" "$(loc -X POST $B/api/auth/signup -d "loginId=ab&password=test-password-123&displayName=B" | grep -o 'error=[A-Z_]*')" "error=SIGNUP_LOGIN_ID"
chk "짧은 비번 거절" "$(loc -X POST $B/api/auth/signup -d "loginId=${L}a&password=12345&displayName=B" | grep -o 'error=[A-Z_]*')" "error=SIGNUP_PASSWORD"
chk "빈 이름 거절" "$(loc -X POST $B/api/auth/signup -d "loginId=${L}b&password=test-password-123&displayName=" | grep -o 'error=[A-Z_]*')" "error=SIGNUP_DISPLAY_NAME"

# 코드만 갈라 놓고 문구가 같으면 아무것도 나아지지 않는다. 셋이 서로 달라야 한다.
MSG_ID=$(curl -s "$B/signup?error=SIGNUP_LOGIN_ID" | grep -oE '<p class="[^"]*error[^"]*"[^>]*>[^<]*' | sed 's/.*>//')
MSG_PW=$(curl -s "$B/signup?error=SIGNUP_PASSWORD" | grep -oE '<p class="[^"]*error[^"]*"[^>]*>[^<]*' | sed 's/.*>//')
MSG_NM=$(curl -s "$B/signup?error=SIGNUP_DISPLAY_NAME" | grep -oE '<p class="[^"]*error[^"]*"[^>]*>[^<]*' | sed 's/.*>//')
if [ -n "$MSG_ID" ] && [ "$MSG_ID" != "$MSG_PW" ] && [ "$MSG_PW" != "$MSG_NM" ] && [ "$MSG_ID" != "$MSG_NM" ]; then
  ok "가입 에러 문구가 칸마다 다름"
else
  bad "가입 에러 문구가 칸마다 다름" "ID='$MSG_ID' PW='$MSG_PW' NAME='$MSG_NM'"
fi

echo "── 4. 가입 → 세션"
COOKIE=$(curl -s -D - -o /dev/null -X POST $B/api/auth/signup \
  -d "loginId=$L&password=test-password-123&displayName=Blair" \
  | grep -i '^set-cookie:' | sed 's/^[Ss]et-[Cc]ookie: //' | cut -d';' -f1 | paste -sd'; ' -)
if [ -n "$COOKIE" ]; then ok "가입 성공, 세션 쿠키 발급"; else bad "가입" "쿠키 없음"; fi
chk "중복 아이디 거절" "$(loc -X POST $B/api/auth/signup -d "loginId=$L&password=test-password-123&displayName=X" | grep -o 'error=[A-Z_]*')" "error=LOGIN_ID_TAKEN"
chk "로그인 상태 /my → 200" "$(code $B/my -H "cookie: $COOKIE")" "200"
MY=$(curl -s $B/my -H "cookie: $COOKIE")
has "빈 상태에 Create 버튼" "$MY" 'data-testid="create-vine"'
hasnt "빈 상태에 사이드바 없음" "$MY" 'data-testid="sidebar"'

echo "── 5. 로그인 / 로그아웃"
chk "틀린 비번 거절" "$(loc -X POST $B/api/auth/login -d "loginId=$L&password=wrongwrong" | grep -o 'error=[A-Z_]*')" "error=INVALID_CREDENTIALS"
chk "없는 아이디 거절" "$(loc -X POST $B/api/auth/login -d "loginId=nosuchuser&password=whatever1" | grep -o 'error=[A-Z_]*')" "error=INVALID_CREDENTIALS"
C2=$(curl -s -D - -o /dev/null -X POST $B/api/auth/login -d "loginId=$L&password=test-password-123" \
  | grep -i '^set-cookie:' | sed 's/^[Ss]et-[Cc]ookie: //' | cut -d';' -f1 | paste -sd'; ' -)
chk "재로그인 후 /my 통과" "$(code $B/my -H "cookie: $C2")" "200"

echo "── 6. 판 생성 / 공유"
chk "POST /api/vine → 303" "$(code -X POST $B/api/vine -H "cookie: $COOKIE")" "303"
chk "판 중복 생성 거절" "$(loc -X POST $B/api/vine -H "cookie: $COOKIE" | grep -o 'error=[A-Z_]*')" "error=OWNER_ALREADY_HAS_VINE"
SHARE=$(curl -s "$B/my?modal=share" -H "cookie: $COOKIE")
SLUG=$(echo "$SHARE" | grep -oE '/v/[a-z0-9]{10}' | head -1 | cut -d/ -f3)
if [ ${#SLUG} -eq 10 ]; then ok "슬러그 발급 ($SLUG)"; else bad "슬러그" "길이 ${#SLUG}"; fi
has "Share 모달 열림" "$SHARE" 'data-testid="share-modal"'
has "모달 열리면 좌상단 뒤로가기" "$SHARE" 'data-testid="back"'
hasnt "모달 열리면 페이지네이션 숨김" "$SHARE" 'data-testid="pagination"'

echo "── 7. Setting / My Account / 로그아웃"
SET=$(curl -s "$B/my?modal=setting" -H "cookie: $COOKIE")
has "Setting 모달" "$SET" 'data-testid="setting-modal"'
# 전에는 `...` 네 줄이 비활성으로 놓여 있었다. 이제 실제 문서가 들어간다.
has "  개인정보 처리방침 줄" "$SET" 'Privacy Policy'
has "  이용약관 줄" "$SET" 'Terms of Service'
has "  오픈소스 줄" "$SET" 'Open Source'
hasnt "  미정 자리표시자 없음" "$SET" 'setting-pending'
# 로그아웃은 My Account 안이 아니라 설정 목록에 있다 (STEP 23).
has "  로그아웃 버튼" "$SET" 'data-testid="logout"'
# 설정 안쪽 문서는 원 안에서 스크롤한다.
TERMS=$(curl -s "$B/my?modal=terms" -H "cookie: $COOKIE")
has "  약관 문서가 열린다" "$TERMS" 'data-testid="document"'
# 설정 안쪽에서 뒤로가기는 판이 아니라 **설정으로** 돌아가야 한다.
has "  문서 뒤로가기 → 설정" "$TERMS" 'modal=setting'
# 주인 화면에는 빈 알을 그리지 않는다 (STEP 23).
hasnt "  주인 판에 빈 알 없음" "$(curl -s "$B/my" -H "cookie: $COOKIE")" 'data-filled="false"'
hasnt "  방문자 판에도 빈 알 없음" "$(curl -s "$B/v/$SLUG")" 'data-filled="false"'
# 방문자 모달에는 좌상단 뒤로가기를 두지 않는다 (딤이 곧 닫기다).
hasnt "  방문자 모달에 뒤로가기 없음" "$(curl -s "$B/v/$SLUG?modal=add")" 'data-testid="back"'
has "  주인 모달에는 뒤로가기 있음" "$(curl -s "$B/my?modal=share" -H "cookie: $COOKIE")" 'data-testid="back"' 
ACC=$(curl -s "$B/my?modal=account" -H "cookie: $COOKIE")
has "My Account 모달 (죽은 링크 아님)" "$ACC" 'data-testid="account-modal"'
has "  아이디 표시" "$ACC" "$L"

echo "── 8. 방문자 (미로그인)"
V=$(curl -s "$B/v/$SLUG")
chk "GET /v/[slug] 200" "$(code $B/v/$SLUG)" "200"
has "  주인 이름 pill" "$V" "Blair"
has "  CTA add" "$V" 'data-kind="inverted"'
# 빈 알은 이제 그리지 않는다 (STEP 25). 새 판이 비어 있다는 건 "채운 알 0" 과
# "붙일 수 있음(CTA add)" 으로 확인한다. 15칸이라는 사실 자체는 도메인
# 테스트(attach-grape.test.ts)가 보증한다.
chk "  새 판은 채운 알 0" "$(echo "$V" | grep -o 'data-filled="true"' | wc -l | tr -d ' ')" "0"

echo "── 9. 칭찬 붙이기"
chk "기명 전송" "$(loc -X POST $B/api/v/$SLUG/grape -d "page=1&authorName=Clara&message=You are kind." | grep -c 'error=')" "0"
chk "익명 전송" "$(loc -X POST $B/api/v/$SLUG/grape -d "page=1&isAnonymous=on&authorName=Leak&message=anon" | grep -c 'error=')" "0"
chk "이름 없이 기명 → 거절" "$(loc -X POST $B/api/v/$SLUG/grape -d "page=1&authorName=&message=x" | grep -o 'error=[A-Z_]*')" "error=INVALID_AUTHOR_NAME"
chk "빈 메시지 → 거절" "$(loc -X POST $B/api/v/$SLUG/grape -d "page=1&authorName=C&message=   " | grep -o 'error=[A-Z_]*')" "error=EMPTY_MESSAGE"
LONG=$(python3 -c "print('a'*81)")
chk "81자 → 거절" "$(loc -X POST $B/api/v/$SLUG/grape --data-urlencode "page=1" --data-urlencode "authorName=C" --data-urlencode "message=$LONG" | grep -o 'error=[A-Z_]*')" "error=MESSAGE_TOO_LONG"
chk "주인 본인 → 거절" "$(loc -X POST $B/api/v/$SLUG/grape -H "cookie: $C2" -d "page=1&authorName=Blair&message=self" | grep -o 'error=[A-Z_]*')" "error=OWNER_CANNOT_ADD_GRAPE"

echo "── 9b. 세션 유지 / 로그아웃"
chk "로그아웃 전 주인 세션 살아 있음" "$(code $B/my -H "cookie: $COOKIE")" "200"
C3=$(curl -s -D - -o /dev/null -X POST $B/api/auth/login -d "loginId=$L&password=test-password-123" | grep -i '^set-cookie:' | sed 's/^[Ss]et-[Cc]ookie: //' | cut -d';' -f1 | paste -sd'; ' -)
chk "로그아웃 → 303" "$(code -X POST $B/api/auth/logout -H "cookie: $COOKIE")" "303"
chk "  로그아웃한 세션은 끊김" "$(code $B/my -H "cookie: $COOKIE")" "307"
chk "  다른 기기 세션은 유지 (scope=local)" "$(code $B/my -H "cookie: $C3")" "200"

echo "── 10. 익명 표시"
V2=$(curl -s "$B/v/$SLUG")
ANON=$(echo "$V2" | grep -oE 'data-slot="[0-9]+" data-filled="true"' | grep -oE '[0-9]+')
FOUND=0
for s in $ANON; do
  if curl -s "$B/v/$SLUG?page=1&grape=$s" | grep -q "Unknown"; then FOUND=1; break; fi
done
if [ $FOUND -eq 1 ]; then ok "익명 알이 Unknown 으로 표시"; else bad "익명 표시" "Unknown 없음"; fi

echo "── 11. 페이지 증설"
for i in $(seq 3 15); do
  curl -s -o /dev/null -X POST $B/api/v/$SLUG/grape -d "page=1&authorName=F$i&message=praise $i"
done
V3=$(curl -s "$B/v/$SLUG?page=1")
chk "  15칸 참" "$(echo "$V3" | grep -o 'data-filled="true"' | wc -l | tr -d ' ')" "15"
has "  CTA full" "$V3" 'data-kind="full"'
has "  Here is Full!" "$V3" "Here is Full"
chk "  totalPages 2" "$(echo "$V3" | grep -oE 'data-total="[0-9]+"' | head -1)" 'data-total="2"'
has "  다음 페이지 링크" "$V3" 'data-testid="next-page"'
chk "  꽉 찬 페이지 전송 거절" "$(loc -X POST $B/api/v/$SLUG/grape -d "page=1&authorName=L&message=late" | grep -o 'error=[A-Z_]*')" "error=PAGE_FULL"
V4=$(curl -s "$B/v/$SLUG?page=2")
chk "  2페이지는 채운 알 0" "$(echo "$V4" | grep -o 'data-filled="true"' | wc -l | tr -d ' ')" "0"
has "  2페이지 CTA add" "$V4" 'data-kind="inverted"'

echo "── 12. 페이지 클램프"
for q in "?page=99" "?page=0" "?page=abc" "?page=-1"; do
  chk "  $q → 1페이지" "$(curl -s "$B/v/$SLUG$q" | grep -oE 'data-page="[0-9]+"' | head -1)" 'data-page="1"'
done

echo
echo "════ 통과 $PASS / 실패 $FAIL ════"
echo "$SLUG" > "${TMPDIR:-/tmp}/sweep-slug"

# ── 뒷정리 ────────────────────────────────────────────────────────────────
# 이 스윕은 계정을 만들고 판을 15칸까지 채운다. 안 지우면 DB 에 쌓이고,
# 나중에 "이게 내 데이터인가 테스트 데이터인가"를 구분할 수 없게 된다.
# (실제로 3개가 쌓여 있었다.) 계정을 지우면 FK cascade 로 판·알까지 따라간다.
PROJECT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
if [ -f "$PROJECT/.env.local" ]; then
  # ⚠️ 프로젝트 안에 써야 한다. /tmp 에 두면 node 가 @supabase/supabase-js 를
  #    못 찾는다 (모듈 해석은 스크립트 위치 기준이다).
  cat > "$PROJECT/.sweep-cleanup.tmp.mjs" <<'CLEAN'
import { createClient } from '@supabase/supabase-js';
const c = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});
// 이 스윕이 만든 계정만. 형식은 25행의 `L="s$(date +%s%N | tail -c 7)"`.
const { data } = await c.from('users').select('id,login_id').like('login_id', 's%');
const mine = (data ?? []).filter((u) => /^s\d{6}$/.test(u.login_id));
for (const u of mine) await c.auth.admin.deleteUser(u.id);
console.log(`  뒷정리: 스윕 계정 ${mine.length}개 삭제`);
CLEAN
  (cd "$PROJECT" && node --env-file=.env.local .sweep-cleanup.tmp.mjs) || echo "  ⚠️ 뒷정리 실패 — 수동 확인 필요"
  rm -f "$PROJECT/.sweep-cleanup.tmp.mjs"
else
  echo "  ⚠️ .env.local 을 못 찾아 뒷정리를 건너뛴다"
fi

[ $FAIL -eq 0 ]
